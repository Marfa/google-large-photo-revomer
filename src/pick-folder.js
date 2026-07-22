// src/pick-folder.js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ask } from './confirm.js';

const execFileAsync = promisify(execFile);

/**
 * Native folder picker (macOS) or typed path fallback.
 * @param {string} [prompt]
 * @returns {Promise<string | null>}
 */
export async function pickFolder(prompt = 'Выберите папку для скачивания') {
  if (process.platform === 'darwin') {
    try {
      const safe = prompt.replace(/"/g, '\\"');
      const { stdout } = await execFileAsync('osascript', [
        '-e',
        `POSIX path of (choose folder with prompt "${safe}")`,
      ]);
      const dir = stdout.trim();
      return dir || null;
    } catch {
      console.log('Выбор папки отменён. Можно ввести путь вручную.');
    }
  }

  const manual = await ask('Введите полный путь к папке: ');
  return manual || null;
}
