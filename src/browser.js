// src/browser.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const AUTH_DIR = path.join(ROOT_DIR, '.auth');
export const DOWNLOADS_DIR = path.join(ROOT_DIR, 'downloads');

export const LARGE_PHOTOS_URL =
  'https://one.google.com/storage/management/photos/large';

/**
 * Launch Chromium with a persistent profile so Google SSO survives restarts.
 * @param {{ headless?: boolean }} [options]
 */
export async function openBrowser(options = {}) {
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
