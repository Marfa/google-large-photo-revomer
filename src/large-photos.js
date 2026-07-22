// src/large-photos.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { DOWNLOADS_DIR, LARGE_PHOTOS_URL } from './browser.js';
import {
  debugInPage,
  readShownCountInPage,
  resetScrollInPage,
  scrapeVisibleInPage,
  scrollOnceInPage,
} from './page-collect.js';
import { formatBytes, parseSizeBytes } from './util.js';
import { t } from './i18n.js';

export { chunk, parseSizeBytes, formatBytes } from './util.js';

// ponytail: Google One UI churns; update SELECTORS / ITEM_JS when the page breaks. Upgrade path: capture fresh DOM + network payloads and adjust.
export const SELECTORS = {
  itemCandidate: [
    '[role="listitem"]',
    '[data-item-id]',
    '[data-id]',
    'div[jsname] c-wiz [role="checkbox"]',
  ].join(', '),
  checkbox: '[role="checkbox"], input[type="checkbox"]',
  deleteButton: [
    'button[aria-label*="Delete" i]',
    'button[aria-label*="Удалить" i]',
    'button[aria-label*="Move to bin" i]',
    'button[aria-label*="Move to trash" i]',
    'button[aria-label*="корзин" i]',
    '[data-tooltip*="Delete" i]',
    '[data-tooltip*="Удалить" i]',
  ].join(', '),
  confirmButton: [
    'button:has-text("Move to bin")',
    'button:has-text("Move to trash")',
    'button:has-text("Delete")',
    'button:has-text("Permanently delete")',
    'button:has-text("Удалить")',
    'button:has-text("В корзину")',
    'button:has-text("Переместить в корзину")',
  ].join(', '),
  downloadButton: [
    'button[aria-label*="Download" i]',
    'button[aria-label*="Скачать" i]',
    'a[aria-label*="Download" i]',
    'a[download]',
  ].join(', '),
  selectAll: [
    'button[aria-label*="Select all" i]',
    'button[aria-label*="Выбрать все" i]',
    '[role="checkbox"][aria-label*="Select all" i]',
  ].join(', '),
};

const BATCH_SIZE = 100;
const BATCH_PAUSE_MS = 1500;
const DOWNLOAD_BATCH_TIMEOUT_MS = 300_000;

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @typedef {{ id: string, label: string, sizeText: string, sizeBytes: number | null, imageUrl: string | null }} PhotoItem
 */

const SHOW_MORE_RE = /показать ещё|show more|load more|показать больше/i;
const MAX_LOAD_MORE_CLICKS = 200;

/** @param {import('playwright').Page} page */
async function scrollToBottom(page) {
  for (let i = 0; i < 40; i += 1) {
    const moved = await page.evaluate(scrollOnceInPage);
    if (!moved) break;
    await sleep(150);
  }
}

/** @param {import('playwright').Page} page */
async function clickShowMoreIfPresent(page) {
  let btn = page.getByRole('button', { name: SHOW_MORE_RE });
  if ((await btn.count()) === 0) {
    btn = page.getByText(SHOW_MORE_RE);
  }
  if ((await btn.count()) === 0) return false;
  const target = btn.first();
  await target.scrollIntoViewIfNeeded();
  await target.click({ timeout: 15_000 });
  return true;
}

/** @param {import('playwright').Page} page */
async function hasShowMoreButton(page) {
  const roleBtn = await page.getByRole('button', { name: SHOW_MORE_RE }).count();
  if (roleBtn > 0) return true;
  return (await page.getByText(SHOW_MORE_RE).count()) > 0;
}

/** @param {import('playwright').Page} page */
async function mergeScrape(page, byId, maxRounds) {
  let stable = 0;
  let lastSize = byId.size;

  for (let i = 0; i < maxRounds; i += 1) {
    const batch = await page.evaluate(scrapeVisibleInPage);
    for (const item of batch.items) {
      byId.set(item.id, {
        ...item,
        sizeBytes: parseSizeBytes(item.sizeText),
      });
    }
    if (byId.size === lastSize) {
      stable += 1;
      if (stable >= 6) break;
    } else {
      stable = 0;
      lastSize = byId.size;
    }
    const moved = await page.evaluate(scrollOnceInPage);
    if (!moved && stable >= 3) break;
    await sleep(150);
  }
}

/** @param {import('playwright').Page} page */
async function runCollectAll(page) {
  /** @type {Map<string, PhotoItem>} */
  const byId = new Map();
  let loadMoreClicks = 0;
  let shownCount = null;
  let firstPass = true;

  for (;;) {
    await mergeScrape(page, byId, firstPass ? 80 : 18);
    firstPass = false;

    const shown = await page.evaluate(readShownCountInPage);
    if (shown != null) shownCount = shown;

    await scrollToBottom(page);
    const tailBatch = await page.evaluate(scrapeVisibleInPage);
    for (const item of tailBatch.items) {
      byId.set(item.id, {
        ...item,
        sizeBytes: parseSizeBytes(item.sizeText),
      });
    }

    if (!(await hasShowMoreButton(page))) break;
    if (loadMoreClicks >= MAX_LOAD_MORE_CLICKS) break;

    const sizeBefore = byId.size;
    const clicked = await clickShowMoreIfPresent(page);
    if (!clicked) break;

    loadMoreClicks += 1;
    console.log(`  «Показать ещё» #${loadMoreClicks}… (собрано ${byId.size})`);
    await sleep(1500);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    // ponytail: не сбрасываем scrollTop — после клика кнопка уже внизу, продолжаем оттуда

    if (byId.size === sizeBefore && loadMoreClicks > 2) {
      if (!(await hasShowMoreButton(page))) break;
    }
  }

  return {
    items: [...byId.values()],
    shownCount,
    uniqueCount: byId.size,
    loadMoreClicks,
  };
}

/**
 * Expand the list via «Показать ещё» (no full recount).
 * @param {import('playwright').Page} page
 */
async function expandListOnPage(page) {
  let clicks = 0;
  for (;;) {
    await scrollToBottom(page);
    if (!(await hasShowMoreButton(page))) break;
    if (clicks >= MAX_LOAD_MORE_CLICKS) break;
    const clicked = await clickShowMoreIfPresent(page);
    if (!clicked) break;
    clicks += 1;
    if (clicks % 5 === 0) {
      console.log(`  «Показать ещё» #${clicks}…`);
    }
    await sleep(1500);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  }
  return clicks;
}

/**
 * Ensure the page is ready for batch select + download/delete.
 * @param {import('playwright').Page} page
 * @param {number | null} [expectedTotal]
 */
export async function preparePageForBatchActions(page, expectedTotal = null) {
  if (page.isClosed()) {
    throw new Error(
      'Окно браузера закрыто. Не закрывайте Chromium до окончания скачивания или удаления.',
    );
  }

  await page.bringToFront().catch(() => {});

  if (
    !/one\.google\.com\/storage\/management\/photos\/large/i.test(page.url())
  ) {
    await gotoLargePhotos(page);
  }

  await page.evaluate(resetScrollInPage);
  await deselectAll(page);
  await sleep(800);

  let visible = await page.evaluate(scrapeVisibleInPage);
  const minNeeded = Math.min(expectedTotal ?? BATCH_SIZE, BATCH_SIZE);

  if (expectedTotal != null && visible.items.length < minNeeded) {
    console.log(
      'Список на странице сократился — снова нажимаю «Показать ещё» (не закрывайте браузер)…',
    );
    await expandListOnPage(page);
    await page.evaluate(resetScrollInPage);
    visible = await page.evaluate(scrapeVisibleInPage);
    console.log(`  На странице снова видно ${visible.items.length} объектов.`);
  }

  return visible.items.length;
}

/**
 * Scroll virtualized grid and accumulate unique media tiles.
 * @param {import('playwright').Page} page
 * @returns {Promise<PhotoItem[]>}
 */
export async function collectItemsFromDom(page) {
  const result = await runCollectAll(page);
  return result.items;
}

/**
 * Navigate to large photos page and wait for content.
 * @param {import('playwright').Page} page
 */
export async function gotoLargePhotos(page) {
  await page.goto(LARGE_PHOTOS_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  if (/accounts\.google\.com/i.test(page.url())) {
    throw new Error(
      'Not logged in. Run `npm run login` first and complete Google sign-in in the browser.',
    );
  }
  const review = page.getByRole('button', {
    name: /review|просмотр|осмотр|очист|free up|clear/i,
  });
  if (await review.count()) {
    await review.first().click().catch(() => {});
    await sleep(1500);
  }
  await page
    .locator('img[src*="googleusercontent"], img[src*="ggpht"]')
    .first()
    .waitFor({ timeout: 45_000 })
    .catch(() => {});
  await sleep(1000);
}

/**
 * @param {import('playwright').Page} page
 * @param {{ quiet?: boolean }} [opts]
 */
export async function countLargePhotos(page, opts = {}) {
  const log = opts.quiet ? () => {} : console.log;
  if (!opts.skipGoto) {
    await gotoLargePhotos(page);
  } else if (/accounts\.google\.com/i.test(page.url())) {
    throw new Error(
      'Не выполнен вход. Войдите в Google в открытом браузере.',
    );
  }
  try {
    log('Загрузка списка: прокрутка и «Показать ещё» (может занять несколько минут)…');
    const collected = await runCollectAll(page);
    const items = collected.items.filter((i) => /\.(jpe?g|png|heic|gif|webp|mp4|mov|avi|mkv|3gp)$/i.test(i.label));
    log(
      `  Найдено ${items.length} файл(ов)` +
        (collected.loadMoreClicks
          ? `, нажатий «Показать ещё»: ${collected.loadMoreClicks}`
          : ''),
    );

    const knownSizes = items
      .map((i) => i.sizeBytes)
      .filter((n) => typeof n === 'number' && n > 0);
    const totalBytes = knownSizes.reduce((a, b) => a + b, 0);
    return {
      count: items.length,
      items,
      totalBytes: knownSizes.length ? totalBytes : null,
      sizeKnownFor: knownSizes.length,
      summary: collected.shownCount,
      loadMoreClicks: collected.loadMoreClicks,
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Debug snapshot for troubleshooting selectors.
 * @param {import('playwright').Page} page
 */
export async function debugPageState(page) {
  await gotoLargePhotos(page);
  const stats = await page.evaluate(debugInPage);
  const shot = path.join(process.cwd(), 'debug-screenshot.png');
  await page.screenshot({ path: shot, fullPage: true });
  return { ...stats, screenshot: shot };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ items?: PhotoItem[], destDir?: string, skipGoto?: boolean, expectedTotal?: number }} [opts]
 */
export async function downloadAll(page, opts = {}) {
  const destDir = opts.destDir || DOWNLOADS_DIR;
  await fs.mkdir(destDir, { recursive: true });

  const expected =
    opts.expectedTotal ?? opts.items?.length ?? null;

  if (!opts.skipGoto) await gotoLargePhotos(page);

  await preparePageForBatchActions(page, expected);

  if (expected) {
    console.log(
      `Скачивание ${expected} файл(ов) пакетами по ${BATCH_SIZE} в ${destDir} …`,
    );
  } else {
    console.log(
      `Скачивание пакетами по ${BATCH_SIZE} в ${destDir} …`,
    );
  }

  return downloadAllInBatches(page, destDir, expected);
}

/**
 * Unique archive name: Photos.zip → Photos_001.zip (never collide).
 * @param {string} destDir
 * @param {number} batchIndex
 * @param {number} [fileIndex]
 */
async function uniqueArchiveName(destDir, batchIndex, fileIndex = 0) {
  const batch = String(batchIndex).padStart(3, '0');
  const suffix = fileIndex > 0 ? `_${fileIndex + 1}` : '';
  let name = `Photos_${batch}${suffix}.zip`;
  let n = 0;
  for (;;) {
    try {
      await fs.access(path.join(destDir, name));
      n += 1;
      name = `Photos_${batch}${suffix}_${n}.zip`;
    } catch {
      return name;
    }
  }
}

/**
 * @param {import('playwright').Download} dl
 * @param {string} destPath
 */
async function saveDownloadFile(dl, destPath) {
  await dl.saveAs(destPath);
  return true;
}

/**
 * Select N items, click toolbar Download, save file(s).
 * @param {import('playwright').Page} page
 * @param {string} destDir
 * @param {number} batchIndex
 * @param {{ done: number, total: number | null }} [progress]
 */
async function clickDownloadBatch(page, destDir, batchIndex, progress = null) {
  const l = t();
  console.log(l.waitingArchive);

  /** @type {import('playwright').Download[]} */
  const pending = [];
  const onDownload = (d) => {
    pending.push(d);
    const name = d.suggestedFilename() || 'archive';
    console.log(l.archiveAppeared(name));
  };
  page.on('download', onDownload);

  const btn = page.getByRole('button', { name: /скачать|download/i });
  if ((await btn.count()) === 0) {
    const alt = page.locator(SELECTORS.downloadButton).first();
    if (!(await alt.count())) {
      page.off('download', onDownload);
      return 0;
    }
    await alt.click({ timeout: 15_000 });
  } else {
    await btn.first().click({ timeout: 15_000 });
  }

  const waitStart = Date.now();
  const deadline = waitStart + DOWNLOAD_BATCH_TIMEOUT_MS;
  let lastCount = 0;
  let stable = 0;
  let lastSec = -1;

  while (Date.now() < deadline) {
    await sleep(1000);
    const sec = Math.round((Date.now() - waitStart) / 1000);
    if (sec !== lastSec) {
      lastSec = sec;
      process.stdout.write(`\r${l.archiveProgress(sec)}   `);
    }
    if (pending.length === 0) continue;
    if (pending.length === lastCount) {
      stable += 1;
      if (stable >= 3) break;
    } else {
      stable = 0;
      lastCount = pending.length;
    }
  }
  process.stdout.write('\n');

  page.off('download', onDownload);

  if (pending.length === 0) {
    const single = await page
      .waitForEvent('download', { timeout: 5000 })
      .catch(() => null);
    if (single) pending.push(single);
  }

  let saved = 0;
  for (let i = 0; i < pending.length; i += 1) {
    const dl = pending[i];
    const fromName = dl.suggestedFilename() || 'Photos.zip';
    const name = await uniqueArchiveName(destDir, batchIndex, i);
    const destPath = path.join(destDir, name);

    const start = Date.now();
    const tick = setInterval(() => {
      const sec = Math.round((Date.now() - start) / 1000);
      process.stdout.write(`\r${l.archiveProgress(sec)}   `);
    }, 1000);

    let ok = false;
    try {
      ok = await saveDownloadFile(dl, destPath);
    } finally {
      clearInterval(tick);
      process.stdout.write('\n');
    }

    if (ok) {
      saved += 1;
      console.log(l.renamedArchive(fromName, name));
    }
  }

  if (progress?.total != null) {
    console.log(l.downloadedOf(progress.done, progress.total));
  }

  return saved;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} destDir
 * @param {number | null} expectedTotal
 */
async function downloadAllInBatches(page, destDir, expectedTotal) {
  let batchIndex = 0;
  let totalSelected = 0;
  let filesSaved = 0;
  let emptyRounds = 0;
  const l = t();
  /** @type {Set<string>} already downloaded filenames (stay on page after download) */
  const processedNames = new Set();

  for (;;) {
    if (expectedTotal != null && totalSelected >= expectedTotal) break;

    const remaining = expectedTotal != null
      ? expectedTotal - totalSelected
      : BATCH_SIZE;
    const take = Math.min(BATCH_SIZE, remaining);

    let { count: selected, names: batchNames } = await selectUpToN(
      page,
      take,
      0,
      { advanceSkip: false, excludeNames: processedNames },
    );
    if (selected === 0) {
      const visible = await page.evaluate(scrapeVisibleInPage);
      if (visible.items.length === 0) {
        emptyRounds += 1;
        if (emptyRounds >= 3) break;
        await page.evaluate(scrollOnceInPage);
        await sleep(500);
        continue;
      }
      await page.evaluate(scrollOnceInPage);
      await sleep(400);
      ({ count: selected, names: batchNames } = await selectUpToN(
        page,
        take,
        0,
        { advanceSkip: false, excludeNames: processedNames },
      ));
      if (selected === 0) {
        if (batchIndex === 0 && expectedTotal) {
          throw new Error(l.selectFailed);
        }
        break;
      }
    }
    emptyRounds = 0;

    batchIndex += 1;
    console.log(
      l.downloadBatch(
        batchIndex,
        selected,
        totalSelected + selected,
        expectedTotal,
      ),
    );

    const saved = await clickDownloadBatch(page, destDir, batchIndex, {
      done: totalSelected + selected,
      total: expectedTotal,
    });
    if (saved === 0) {
      throw new Error(l.downloadBtnFailed);
    }

    for (const name of batchNames) processedNames.add(name);
    filesSaved += saved;
    totalSelected += selected;
    await deselectAll(page);
    await sleep(BATCH_PAUSE_MS);
  }

  console.log(
    `Скачивание завершено: пакетов ${batchIndex}, выбрано ${totalSelected}, файлов на диске ${filesSaved}.`,
  );
  return {
    downloaded: totalSelected,
    batches: batchIndex,
    filesSaved,
    skipped: 0,
    failed: 0,
    total: expectedTotal ?? totalSelected,
  };
}

/**
 * Select up to `wanted` items, scrolling if the list is virtualized.
 * @param {import('playwright').Page} page
 * @param {number} wanted
 * @param {number} [skip]
 * @param {{ advanceSkip?: boolean, excludeNames?: Set<string> }} [opts]
 * @returns {Promise<{ count: number, names: string[] }>}
 */
async function selectUpToN(page, wanted, skip = 0, opts = {}) {
  const advanceSkip = opts.advanceSkip !== false;
  const excludeNames = opts.excludeNames ?? null;
  let total = 0;
  /** @type {string[]} */
  const names = [];
  for (let round = 0; round < 120 && total < wanted; round += 1) {
    const positionSkip = advanceSkip ? skip + total : skip;
    const got = await selectFirstN(
      page,
      wanted - total,
      positionSkip,
      excludeNames,
    );
    total += got.count;
    names.push(...got.names);
    if (total >= wanted) break;
    if (got.count === 0) {
      const moved = await page.evaluate(scrollOnceInPage);
      if (!moved) break;
      await sleep(200);
    }
  }
  return { count: total, names };
}

/**
 * Delete items in batches of 100 until the list is empty.
 * @param {import('playwright').Page} page
 * @param {{ skipGoto?: boolean, expectedTotal?: number }} [opts]
 */
export async function deleteAllInBatches(page, opts = {}) {
  if (!opts.skipGoto) await gotoLargePhotos(page);

  const expectedTotal = opts.expectedTotal ?? null;

  await preparePageForBatchActions(page, expectedTotal);

  let batchIndex = 0;
  let totalDeleted = 0;
  let emptyRounds = 0;

  if (expectedTotal) {
    console.log(
      `Удаление ${expectedTotal} файл(ов) пакетами по ${BATCH_SIZE}…`,
    );
  } else {
    console.log(`Удаление пакетами по ${BATCH_SIZE}…`);
  }

  for (;;) {
    if (expectedTotal != null && totalDeleted >= expectedTotal) break;

    const remaining =
      expectedTotal != null ? expectedTotal - totalDeleted : BATCH_SIZE;
    const take = Math.min(BATCH_SIZE, remaining);

    let { count: selected } = await selectUpToN(page, take, 0, {
      advanceSkip: false,
    });
    if (selected === 0) {
      const visible = await page.evaluate(scrapeVisibleInPage);
      if (visible.items.length === 0) {
        emptyRounds += 1;
        if (emptyRounds >= 3) {
          console.log('Список пуст. Готово.');
          break;
        }
        await page.evaluate(scrollOnceInPage);
        await sleep(500);
        continue;
      }
      await page.evaluate(scrollOnceInPage);
      await sleep(400);
      ({ count: selected } = await selectUpToN(page, take, 0, {
        advanceSkip: false,
      }));
      if (selected === 0) {
        if (batchIndex === 0 && expectedTotal) {
          throw new Error(
            'Не удалось выбрать фото для удаления. Не закрывайте браузер до окончания операции.',
          );
        }
        break;
      }
    }
    emptyRounds = 0;

    batchIndex += 1;
    console.log(
      `Пакет ${batchIndex}: выбрано ${selected}, удаляю…` +
        (expectedTotal != null
          ? ` (всего ${totalDeleted + selected}/${expectedTotal})`
          : ''),
    );

    const deleted = await clickDeleteAndConfirm(page);
    if (!deleted) {
      throw new Error(
        'Кнопка удаления или диалог подтверждения не найдены.',
      );
    }

    totalDeleted += selected;
    console.log(
      `Пакет ${batchIndex}: отправлено на удаление ${selected}. Всего ${totalDeleted}.`,
    );

    await sleep(BATCH_PAUSE_MS);
  }

  console.log(
    `Удаление завершено: пакетов ${batchIndex}, удалено ≈${totalDeleted}.`,
  );
  return { totalDeleted, batches: batchIndex };
}

/**
 * @param {import('playwright').Page} page
 * @param {number} n
 * @param {number} [skip]
 * @param {Set<string> | null} [excludeNames]
 * @returns {Promise<{ count: number, names: string[] }>}
 */
async function selectFirstN(page, n, skip = 0, excludeNames = null) {
  // Google jsaction requires trusted pointer events; DOM .click() won't work.
  const FILE_RE =
    /([^\s/\\]+\.(?:jpe?g|png|heic|gif|webp|mp4|mov|avi|mkv|3gp))/i;

  const wrappers = page.locator(
    'div.KGC9Kd-MPu53c, input[type="checkbox"], [role="checkbox"]',
  );
  const total = await wrappers.count();

  let skipped = 0;
  let selected = 0;
  /** @type {string[]} */
  const names = [];

  for (let i = 0; i < total && selected < n; i += 1) {
    const el = wrappers.nth(i);
    const isChecked = await el
      .evaluate((node) => {
        if (node instanceof HTMLInputElement) return node.checked;
        const inner = node.querySelector('input[type="checkbox"]');
        if (inner) return /** @type {HTMLInputElement} */ (inner).checked;
        return node.getAttribute('aria-checked') === 'true';
      })
      .catch(() => false);
    if (isChecked) continue;

    const meta = await el
      .evaluate((node, reSrc) => {
        const aria = (node.getAttribute('aria-label') || '').toLowerCase();
        if (/select all|выбрать все|выберите объекты/.test(aria)) {
          return { skip: true, name: null };
        }
        const tile =
          node.closest('[role="listitem"]') ||
          node.closest('[role="gridcell"]') ||
          node.closest('[role="row"]') ||
          node.closest('[role="option"]') ||
          node.closest('tr') ||
          node.parentElement?.parentElement?.parentElement?.parentElement;
        if (!tile) return { skip: true, name: null };
        const text = tile.innerText || '';
        const m = text.match(new RegExp(reSrc, 'i'));
        if (!m) return { skip: true, name: null };
        return { skip: false, name: m[1] };
      }, FILE_RE.source)
      .catch(() => ({ skip: true, name: null }));

    if (meta.skip || !meta.name) continue;

    const key = meta.name.toLowerCase();
    if (excludeNames?.has(key)) continue;

    if (skipped < skip) {
      skipped += 1;
      continue;
    }

    await el.click({ timeout: 3000, force: true }).catch(() => {});
    selected += 1;
    names.push(key);
    if (selected % 10 === 0) await page.waitForTimeout(100);
  }

  return { count: selected, names };
}

/**
 * Deselect all checked checkboxes using trusted Playwright clicks.
 * Always clicks `.first()` (locator shrinks after each click) and scrolls
 * because the list is virtualized — checked items off-screen stay selected.
 * @param {import('playwright').Page} page
 */
async function deselectAll(page) {
  const l = t();
  console.log(l.deselecting);
  await page.evaluate(resetScrollInPage);
  await sleep(300);

  let cleared = 0;
  let idleScrolls = 0;

  for (let round = 0; round < 400; round += 1) {
    const wrappers = page.locator('div.KGC9Kd-MPu53c:has(input:checked)');
    let left = await wrappers.count();

    if (left > 0) {
      await wrappers.first().click({ timeout: 3000, force: true }).catch(() => {});
      cleared += 1;
      idleScrolls = 0;
      if (cleared % 25 === 0) {
        console.log(l.deselectProgress(cleared, left));
      }
      continue;
    }

    // Fallback: bare checked inputs (no wrapper match)
    const inputs = page.locator('input[type="checkbox"]:checked');
    left = await inputs.count();
    if (left > 0) {
      const input = inputs.first();
      const wrapper = input.locator('xpath=ancestor::div[contains(@class,"KGC9Kd-MPu53c")][1]');
      if ((await wrapper.count()) > 0) {
        await wrapper.click({ timeout: 3000, force: true }).catch(() => {});
      } else {
        await input.click({ timeout: 3000, force: true }).catch(() => {});
      }
      cleared += 1;
      idleScrolls = 0;
      continue;
    }

    // No checked in current viewport — scroll to find more
    const moved = await page.evaluate(scrollOnceInPage);
    if (!moved) {
      idleScrolls += 1;
      if (idleScrolls >= 5) break;
    } else {
      idleScrolls = 0;
    }
    await sleep(120);
  }

  // Final pass from the top in case some were missed while scrolling
  await page.evaluate(resetScrollInPage);
  await sleep(200);
  for (let i = 0; i < 200; i += 1) {
    const left = page.locator('div.KGC9Kd-MPu53c:has(input:checked)');
    if ((await left.count()) === 0) break;
    await left.first().click({ timeout: 3000, force: true }).catch(() => {});
    cleared += 1;
  }

  console.log(l.deselectDone(cleared));
}

/**
 * Click toolbar Delete, then confirm dialog (incl. 60-day agreement checkbox).
 * @param {import('playwright').Page} page
 */
async function clickDeleteAndConfirm(page) {
  let del = page.getByRole('button', { name: /удалить|delete/i });
  if ((await del.count()) === 0) {
    del = page.locator(SELECTORS.deleteButton);
  }
  if ((await del.count()) === 0) {
    return false;
  }
  await del.first().click({ timeout: 15_000 });

  const dialog = page
    .locator('[role="dialog"], [role="alertdialog"]')
    .filter({
      hasText: /корзин|trash|bin|переместить|удалить|delete|60/i,
    })
    .first();

  try {
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    // Some UIs delete without a second dialog
    await sleep(1500);
    return true;
  }

  // Required: «Я соглашаюсь… удалены навсегда через 60 дней»
  const agreeLabel = dialog.getByText(
    /соглашаюсь|agree|60\s*дн|permanently deleted after/i,
  );
  if ((await agreeLabel.count()) > 0) {
    const cb = dialog.locator(
      'div.KGC9Kd-MPu53c, input[type="checkbox"], [role="checkbox"]',
    );
    if ((await cb.count()) > 0) {
      const box = cb.first();
      const checked = await box
        .evaluate((node) => {
          if (node instanceof HTMLInputElement) return node.checked;
          const inner = node.querySelector('input[type="checkbox"]');
          if (inner) return /** @type {HTMLInputElement} */ (inner).checked;
          return node.getAttribute('aria-checked') === 'true';
        })
        .catch(() => false);
      if (!checked) {
        await box.click({ timeout: 5000, force: true });
        await sleep(300);
      }
    } else {
      await agreeLabel.first().click({ timeout: 5000 }).catch(() => {});
      await sleep(300);
    }
  }

  const confirm = dialog.getByRole('button', {
    name: /удалить|delete|move to (bin|trash)|в корзину|переместить в корзину/i,
  });
  let confirmBtn =
    (await confirm.count()) > 0
      ? confirm.last()
      : dialog.locator(SELECTORS.confirmButton).last();

  if ((await confirmBtn.count()) === 0) {
    throw new Error(
      'В диалоге подтверждения не найдена кнопка «Удалить». Отметьте согласие вручную и сообщите об ошибке.',
    );
  }

  await confirmBtn.click({ timeout: 15_000 });
  await dialog.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  await sleep(800);

  // Success modal: «Вы освободили …» → «Готово»
  await page
    .getByRole('button', { name: /готово|done/i })
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .catch(() => {});
  await dismissPostDeleteModals(page);
  await sleep(800);
  return true;
}

/**
 * Close Google One success / promo dialogs after a delete batch.
 * @param {import('playwright').Page} page
 */
async function dismissPostDeleteModals(page) {
  for (let round = 0; round < 5; round += 1) {
    const modal = page
      .locator('[role="dialog"], [role="alertdialog"]')
      .filter({
        hasText: /освободил|freed|congratul|готово|done|google one|больше места/i,
      })
      .first();

    if ((await modal.count()) === 0) {
      // Also try by visible «Готово» button without strict dialog role
      const done = page.getByRole('button', { name: /^(готово|done)$/i });
      if ((await done.count()) === 0) break;
      await done.first().click({ timeout: 5000 }).catch(() => {});
      await sleep(500);
      continue;
    }

    if (!(await modal.isVisible().catch(() => false))) break;

    const doneInModal = modal.getByRole('button', {
      name: /готово|done|ok|закрыть|close/i,
    });
    if ((await doneInModal.count()) > 0) {
      await doneInModal.first().click({ timeout: 5000 });
    } else {
      const close = modal.locator(
        'button[aria-label*="Close" i], button[aria-label*="Закрыть" i], [aria-label="Close"], [aria-label="Закрыть"]',
      );
      if ((await close.count()) > 0) {
        await close.first().click({ timeout: 5000 }).catch(() => {});
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
    await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await sleep(400);
  }
}

/**
 * Human-readable summary line for count results.
 * @param {{ count: number, totalBytes: number | null, sizeKnownFor: number, items: PhotoItem[] }} result
 */
export function formatCountSummary(result) {
  const n = result.count;
  const parts = [`Найдено ${n} фото и видео большого размера`];
  if (result.totalBytes != null && result.sizeKnownFor > 0) {
    parts.push(
      `≈ ${formatBytes(result.totalBytes)} (${result.sizeKnownFor} с размером)`,
    );
  }
  if (result.summary && result.summary !== n) {
    parts.push(`на странице: ${result.summary}`);
  }
  if (result.loadMoreClicks) {
    parts.push(`«Показать ещё»: ${result.loadMoreClicks}`);
  }
  return parts.join(' — ');
}
