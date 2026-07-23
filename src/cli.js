#!/usr/bin/env node
// src/cli.js
import { LARGE_PHOTOS_URL, openBrowser, withBrowser } from './browser.js';
import { ask, askDaNet, askDownloadOrDelete } from './confirm.js';
import { pickFolder } from './pick-folder.js';
import { detectSystemLang, setLang, t } from './i18n.js';
import {
  countLargePhotos,
  debugPageState,
  deleteAllInBatches,
  downloadAll,
  formatCountSummary,
  gotoLargePhotos,
} from './large-photos.js';

const HELP = `
Google Large Photos Remover

  npm start              Interactive mode (recommended)
  npm run login          Sign in to Google
  npm run count          Count large photos
  npm run download       Download to ./downloads/
  npm run delete         Delete (batches of 100)
  npm run debug          Debug page state
  npm run selfcheck      Local self-check
`.trim();

async function chooseLang() {
  const sysLang = detectSystemLang();
  setLang(sysLang);
  const answer = (await ask(t().langPrompt)).trim();
  if (answer === '1' || /^р/i.test(answer) || /^ru/i.test(answer)) {
    setLang('ru');
  } else if (answer === '2' || /^e/i.test(answer) || /^en/i.test(answer)) {
    setLang('en');
  }
  // else keep system default
}

async function loginInBrowser(page) {
  const l = t();
  console.log(l.openingBrowser);
  await page.goto(LARGE_PHOTOS_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  if (/accounts\.google\.com/i.test(page.url())) {
    console.log(l.loginFailed.replace('Попробуйте снова.', '').trim() || 'Sign in to Google in the opened browser.');
    await ask(l.enterAfterLogin);
    if (/accounts\.google\.com/i.test(page.url())) {
      throw new Error(l.loginFailed);
    }
  } else {
    console.log(l.sessionFound);
    await ask(l.enterAfterLogin);
  }
  console.log(l.dontCloseBrowser);
}

async function cmdLogin() {
  await withBrowser(
    async ({ page }) => {
      await loginInBrowser(page);
      console.log(t().sessionSaved);
      await runActionFlow(page);
    },
    { headless: false },
  );
}

async function runActionFlow(page) {
  const l = t();
  const action = await askDownloadOrDelete();

  const result = await countLargePhotos(page, { skipGoto: true });
  console.log(formatCountSummary(result));

  if (result.count === 0) {
    console.log(l.noPhotos);
    return;
  }

  if (action === 'download') {
    console.log(l.willDownload(result.count));
    console.log(l.pickFolderPrompt);
    const destDir = await pickFolder('');
    if (!destDir) {
      console.log(l.downloadCancelled);
      return;
    }
    await page.bringToFront().catch(() => {});
    const stats = await downloadAll(page, {
      destDir,
      skipGoto: true,
      expectedTotal: result.count,
    });
    console.log(l.downloadDone(stats.batches, stats.downloaded, stats.filesSaved));
    return;
  }

  console.log(l.willDelete(result.count));
  const sure = await askDaNet(l.deleteConfirm);
  if (!sure) {
    console.log(l.deleteCancelled);
    return;
  }

  const stats = await deleteAllInBatches(page, {
    skipGoto: true,
    expectedTotal: result.count,
  });
  console.log(l.deleteDone(stats.batches, stats.totalDeleted));
}

async function runWizard() {
  await chooseLang();
  const l = t();
  console.log(l.intro);
  const proceed = await askDaNet(l.authPrompt);
  if (!proceed) {
    console.log(l.cancelled);
    return;
  }

  await withBrowser(
    async ({ page }) => {
      await loginInBrowser(page);
      await runActionFlow(page);
    },
    { headless: false },
  );
}

async function cmdCount() {
  await withBrowser(
    async ({ page }) => {
      await gotoLargePhotos(page);
      const result = await countLargePhotos(page, { skipGoto: true });
      console.log(formatCountSummary(result));
    },
    { headless: false },
  );
}

async function cmdDownload() {
  await withBrowser(
    async ({ page }) => {
      await gotoLargePhotos(page);
      const result = await countLargePhotos(page, { skipGoto: true });
      console.log(formatCountSummary(result));
      if (result.count === 0) return;
      const stats = await downloadAll(page, {
        skipGoto: true,
        expectedTotal: result.count,
      });
      const l = t();
      console.log(l.downloadDone(stats.batches, stats.downloaded, stats.filesSaved));
    },
    { headless: false },
  );
}

async function cmdDelete(argv) {
  const yes = argv.includes('--yes') || argv.includes('-y');
  await withBrowser(
    async ({ page }) => {
      await gotoLargePhotos(page);
      const result = await countLargePhotos(page, { skipGoto: true });
      console.log(formatCountSummary(result));
      if (result.count === 0) return;
      if (!yes) {
        const l = t();
        const ok = await askDaNet(l.deleteConfirm);
        if (!ok) {
          console.log(l.cancelled);
          return;
        }
      }
      const stats = await deleteAllInBatches(page, {
        skipGoto: true,
        expectedTotal: result.count,
      });
      console.log(t().deleteDone(stats.batches, stats.totalDeleted));
    },
    { headless: false },
  );
}

async function cmdDebug() {
  await withBrowser(
    async ({ page }) => {
      const stats = await debugPageState(page);
      console.log(JSON.stringify(stats, null, 2));
    },
    { headless: false },
  );
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === 'menu' || cmd === 'start') {
    await runWizard();
    return;
  }
  // For direct commands, use system language
  setLang(detectSystemLang());
  switch (cmd) {
    case 'login':
      await cmdLogin();
      break;
    case 'count':
      await cmdCount();
      break;
    case 'download':
      await cmdDownload();
      break;
    case 'delete':
      await cmdDelete(rest);
      break;
    case 'debug':
      await cmdDebug();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
