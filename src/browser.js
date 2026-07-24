// src/browser.js
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { t } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const AUTH_DIR = path.join(ROOT_DIR, '.auth');
export const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads');

export const LARGE_PHOTOS_URL =
  'https://one.google.com/storage/management/photos/large';

/** @returns {boolean} */
export function isChromiumInstalled() {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

/**
 * Download Playwright Chromium if the local browser binary is missing.
 */
export function ensureChromiumInstalled() {
  if (isChromiumInstalled()) return;
  const l = t();
  console.log(l.installingBrowser);
  const require = createRequire(import.meta.url);
  const cli = require.resolve('playwright/cli.js');
  const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
    stdio: 'inherit',
  });
  if (result.status !== 0 || !isChromiumInstalled()) {
    throw new Error(l.installBrowserFailed);
  }
}

/**
 * Launch Chromium with a persistent profile so Google SSO survives restarts.
 * @param {{ headless?: boolean }} [options]
 */
export async function openBrowser(options = {}) {
  ensureChromiumInstalled();
  const headless = options.headless === true;
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless,
    acceptDownloads: true,
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

export async function withBrowser(fn, options = {}) {
  const { context, page } = await openBrowser(options);
  try {
    return await fn({ context, page });
  } finally {
    await context.close();
  }
}
