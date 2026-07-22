// src/page-collect.js
// Each export is passed to page.evaluate() — must be fully self-contained (no outer refs).

/** Scrape currently visible media tiles. */
export function scrapeVisibleInPage() {
  const SIZE_RE =
    /(\d+[.,]?\d*)\s*(KB|MB|GB|TB|KiB|MiB|GiB|КБ|МБ|ГБ|ТБ|байт|B)\b/i;
  const FILE_RE =
    /([^\s/\\]+\.(?:jpe?g|png|heic|gif|webp|mp4|mov|avi|mkv|3gp))/i;
  const JUNK_LABEL =
    /^(выберите|select|choose|sort|сортир|удалить все|delete all|review|просмотр|фильтр|filter|назад|back|отмен|cancel|закрыть|close|показано|shown|показать)/i;
  const MEDIA_BG =
    /googleusercontent\.com|ggpht\.com|gstatic\.com|googleapis\.com/i;
  const TINY_IMG = /=s(?:16|32|48|64)-/i;

  function isJunkLabel(label) {
    if (!label || label.length > 120) return true;
    if (label.startsWith('http')) return true;
    return JUNK_LABEL.test(label.trim());
  }

  function tileRoot(el) {
    return (
      el.closest('[role="listitem"]') ||
      el.closest('[role="gridcell"]') ||
      el.closest('[role="row"]') ||
      el.closest('[role="option"]') ||
      el.parentElement?.parentElement?.parentElement
    );
  }

  function pushItem(seen, items, id, label, sizeText, imageUrl) {
    if (!id || seen.has(id)) return;
    if (isJunkLabel(label)) return;
    if (imageUrl && TINY_IMG.test(imageUrl) && !FILE_RE.test(label)) return;
    seen.add(id);
    items.push({ id, label, sizeText, imageUrl });
  }

  function readShownCount() {
    const body = document.body?.innerText || '';
    const shown = body.match(/показано\s*\((\d[\d\s\u00a0]*)\)/i);
    if (shown) {
      const n = Number.parseInt(shown[1].replace(/[\s\u00a0]/g, ''), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  const seen = new Set();
  const items = [];

  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) continue;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none' || !MEDIA_BG.test(bg)) continue;
    const urlMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
    const imageUrl = urlMatch ? urlMatch[1] : null;
    if (imageUrl && TINY_IMG.test(imageUrl)) continue;
    const tile = tileRoot(el) || el;
    const text = (tile.innerText || '').trim();
    const fileMatch = text.match(FILE_RE);
    const sizeMatch = text.match(SIZE_RE);
    const label = fileMatch ? fileMatch[1] : text.split('\n')[0] || '';
    if (!label) continue;
    const id =
      tile.getAttribute('data-item-id') ||
      tile.getAttribute('data-id') ||
      label;
    pushItem(seen, items, id, label, sizeMatch ? sizeMatch[0] : '', imageUrl);
  }

  for (const img of document.querySelectorAll('img')) {
    const src = img.currentSrc || img.src || '';
    if (!MEDIA_BG.test(src) || TINY_IMG.test(src)) continue;
    const rect = img.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) continue;
    const tile = tileRoot(img) || img.parentElement;
    if (!(tile instanceof HTMLElement)) continue;
    const text = (tile.innerText || '').trim();
    const fileMatch = text.match(FILE_RE);
    const sizeMatch = text.match(SIZE_RE);
    const label =
      fileMatch?.[1] || img.getAttribute('alt') || text.split('\n')[0] || '';
    if (!label || isJunkLabel(label)) continue;
    const id =
      tile.getAttribute('data-item-id') ||
      tile.getAttribute('data-id') ||
      label;
    pushItem(seen, items, id, label, sizeMatch ? sizeMatch[0] : '', src);
  }

  for (const cb of document.querySelectorAll('[role="checkbox"]')) {
    const aria = (cb.getAttribute('aria-label') || '').toLowerCase();
    if (/select all|выбрать все|выберите объекты|select objects/i.test(aria)) {
      continue;
    }
    const tile = tileRoot(cb);
    if (!(tile instanceof HTMLElement)) continue;
    const text = (tile.innerText || '').trim();
    const fileMatch = text.match(FILE_RE);
    if (!fileMatch) continue;
    const sizeMatch = text.match(SIZE_RE);
    const label = fileMatch[1];
    const id =
      tile.getAttribute('data-item-id') ||
      tile.getAttribute('data-id') ||
      label;
    pushItem(seen, items, id, label, sizeMatch ? sizeMatch[0] : '', null);
  }

  return { items, shownCount: readShownCount() };
}

export function readShownCountInPage() {
  const body = document.body?.innerText || '';
  const shown = body.match(/показано\s*\((\d[\d\s\u00a0]*)\)/i);
  if (shown) {
    const n = Number.parseInt(shown[1].replace(/[\s\u00a0]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function scrollOnceInPage() {
  const scrollables = [];
  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const s = getComputedStyle(el);
    if (
      (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 80
    ) {
      scrollables.push(el);
    }
  }
  scrollables.sort(
    (a, b) =>
      b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
  );
  const target =
    scrollables[0] || document.scrollingElement || document.documentElement;
  const before = target.scrollTop;
  target.scrollBy(0, Math.max(300, target.clientHeight * 0.9));
  return target.scrollTop !== before;
}

export function resetScrollInPage() {
  const scrollables = [];
  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const s = getComputedStyle(el);
    if (
      (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 80
    ) {
      scrollables.push(el);
    }
  }
  scrollables.sort(
    (a, b) =>
      b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
  );
  const target =
    scrollables[0] || document.scrollingElement || document.documentElement;
  target.scrollTop = 0;
}

export function debugInPage() {
  const scrollables = [];
  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const s = getComputedStyle(el);
    if (
      (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 80
    ) {
      scrollables.push({
        tag: el.tagName,
        role: el.getAttribute('role'),
        h: el.scrollHeight,
        ch: el.clientHeight,
      });
    }
  }
  scrollables.sort((a, b) => b.h - b.ch - (a.h - a.ch));

  let bgTiles = 0;
  for (const el of document.querySelectorAll('*')) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && /googleusercontent|ggpht/.test(bg)) bgTiles += 1;
  }

  const body = document.body?.innerText || '';
  const shown = body.match(/показано\s*\((\d+)\)/i);
  const hasShowMore = /показать ещё|show more/i.test(body);

  return {
    url: location.href,
    title: document.title,
    imgCount: document.querySelectorAll('img').length,
    bgTileCount: bgTiles,
    checkboxCount: document.querySelectorAll('[role="checkbox"]').length,
    shownText: shown ? shown[0] : null,
    hasShowMore,
    scrollables: scrollables.slice(0, 3),
    bodySnippet: body.slice(0, 600),
  };
}

export function selectFirstNInPage(opts) {
  const limit = typeof opts === 'number' ? opts : opts.limit;
  const skip = typeof opts === 'number' ? 0 : opts.skip || 0;
  const FILE_RE =
    /([^\s/\\]+\.(?:jpe?g|png|heic|gif|webp|mp4|mov|avi|mkv|3gp))/i;

  const boxes = [];

  // Primary: find all input[type="checkbox"] or their wrapper divs (.KGC9Kd-MPu53c)
  const checkboxes = document.querySelectorAll(
    'input[type="checkbox"], div.KGC9Kd-MPu53c, [role="checkbox"]',
  );

  for (const cb of checkboxes) {
    if (!(cb instanceof HTMLElement)) continue;
    // Skip "select all" style checkboxes
    const aria = (cb.getAttribute('aria-label') || '').toLowerCase();
    if (/select all|выбрать все|выберите объекты|select objects/i.test(aria)) continue;

    // Already checked?
    if (cb instanceof HTMLInputElement && cb.checked) continue;
    if (cb.getAttribute('aria-checked') === 'true') continue;
    // For wrapper div, check inner input
    const inner = cb.querySelector?.('input[type="checkbox"]');
    if (inner instanceof HTMLInputElement && inner.checked) continue;

    // Find parent tile/row containing a filename
    const tile =
      cb.closest('[role="listitem"]') ||
      cb.closest('[role="gridcell"]') ||
      cb.closest('[role="row"]') ||
      cb.closest('[role="option"]') ||
      cb.closest('tr') ||
      cb.parentElement?.parentElement?.parentElement?.parentElement;
    if (!(tile instanceof HTMLElement)) continue;
    const text = (tile.innerText || '').trim();
    if (!FILE_RE.test(text)) continue;

    // Prefer clicking the wrapper div (triggers the jsaction), fallback to input
    const clickTarget = cb.classList?.contains('KGC9Kd-MPu53c')
      ? cb
      : cb.closest('.KGC9Kd-MPu53c') || cb;
    if (boxes.includes(clickTarget)) continue;
    boxes.push(clickTarget);
  }

  let skipped = 0;
  let count = 0;
  for (const box of boxes) {
    if (skipped < skip) {
      skipped += 1;
      continue;
    }
    if (count >= limit) break;
    box.click();
    count += 1;
  }
  return count;
}

export function deselectAllInPage() {
  for (const cb of document.querySelectorAll('[role="checkbox"]')) {
    if (cb.getAttribute('aria-checked') === 'true') {
      cb.click();
    }
  }
}
