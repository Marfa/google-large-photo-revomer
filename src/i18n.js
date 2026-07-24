// src/i18n.js

const ru = {
  intro: 'Этот скрипт предназначен для скачивания или удаления всех фото\nиз раздела «Фото и видео большого размера» в Google One.',
  langPrompt: 'Выберите язык / Choose language:\n1) Русский\n2) English\n> ',
  authPrompt: 'Для начала работы необходимо авторизоваться в браузере. Продолжить?',
  yesNo: 'Напишите Да или Нет: ',
  cancelled: 'Отменено.',
  openingBrowser: 'Открываю браузер…',
  installingBrowser: 'Браузер Playwright не найден. Устанавливаю Chromium (нужен интернет, ~170 МБ)…',
  installBrowserFailed:
    'Не удалось установить Chromium. Выполните вручную: npx playwright install chromium',
  sessionFound: 'Сессия найдена в .auth/',
  enterAfterLogin: 'Нажмите Enter после входа… ',
  loginFailed: 'Вход не выполнен. Попробуйте снова.',
  dontCloseBrowser: 'Не закрывайте окно браузера до окончания работы скрипта.',
  sessionSaved: 'Сессия сохранена в .auth/',
  askAction: 'Вы хотите скачать или удалить все фотографии?\nНапишите Скачать или Удалить: ',
  actionNotRecognized: 'Ответ не распознан. Напишите «Скачать» или «Удалить».',
  loadingList: 'Загрузка списка: прокрутка и «Показать ещё» (может занять несколько минут)…',
  showMore: (n, total) => `  «Показать ещё» #${n}… (собрано ${total})`,
  foundFiles: (n, clicks) =>
    `  Найдено ${n} файл(ов)` + (clicks ? `, нажатий «Показать ещё»: ${clicks}` : ''),
  noPhotos: 'Фотографии не найдены.',
  willDownload: (n) => `\nБудет скачано ${n} фотографий.`,
  pickFolderPrompt: 'Укажите путь для скачивания (откроется выбор папки).\n⚠ Не закрывайте окно браузера, пока выбираете папку.',
  downloadCancelled: 'Скачивание отменено.',
  downloading: (n, dir) => `Скачивание ${n} файл(ов) пакетами по 100 в ${dir} …`,
  downloadBatch: (batch, sel, total, exp) =>
    `Пакет ${batch}: выбрано ${sel}, скачиваю…` + (exp ? ` (всего ${total}/${exp})` : ''),
  waitingArchive: 'Ожидается завершение скачивания архива…',
  archiveAppeared: (name) => `  архив появился: ${name}`,
  archiveProgress: (sec) => `  идёт скачивание архива… ${sec}с`,
  downloadedOf: (done, total) => `  Скачано ${done} из ${total}`,
  deselecting: 'Снимаю выделение с выбранных фото…',
  deselectProgress: (cleared, left) => `  снято ≈${cleared}, ещё видно отмеченных: ${left}`,
  deselectDone: (cleared) => `  выделение снято (кликов: ${cleared})`,
  downloadDone: (batches, obj, files) =>
    `\nГотово. Пакетов: ${batches}, скачано объектов: ${obj}, файлов: ${files}`,
  willDelete: (n) => `\nБудет удалено ${n} фотографий.`,
  deleteConfirm: 'Вы действительно хотите удалить их? Объекты в корзине Google Фото будут удалены навсегда через 60 дней.',
  deleteCancelled: 'Удаление отменено.',
  deleting: (n) => `Удаление ${n} файл(ов) пакетами по 100…`,
  deleteBatch: (batch, sel, total, exp) =>
    `Пакет ${batch}: выбрано ${sel}, удаляю…` + (exp ? ` (всего ${total}/${exp})` : ''),
  deleteDone: (batches, total) => `\nГотово. Пакетов: ${batches}, удалено ≈${total}.`,
  listEmpty: 'Список пуст. Готово.',
  overwritePrompt: (name) => `Файл «${name}» уже существует в папке. Перезаписать?`,
  skippedFile: (name) => `  пропущен: ${name}`,
  savedFile: (name) => `  сохранён файл: ${name}`,
  renamedArchive: (from, to) => `  переименован ${from} → ${to}`,
  selectFailed: 'Не удалось выбрать фото. Не закрывайте браузер до окончания операции.',
  downloadBtnFailed: 'Кнопка «Скачать» не сработала или загрузка не началась.',
  deleteBtnFailed: 'Кнопка удаления или диалог подтверждения не найдены.',
  enterFolderPath: 'Введите полный путь к папке: ',
  expandingList: 'Список на странице сократился — снова нажимаю «Показать ещё»…',
  visibleNow: (n) => `  На странице снова видно ${n} объектов.`,
  summary: (n) => `Найдено ${n} фото и видео большого размера`,
};

const en = {
  intro: 'This script downloads or deletes all photos\nfrom "Large photos and videos" section in Google One.',
  langPrompt: 'Choose language / Выберите язык:\n1) Русский\n2) English\n> ',
  authPrompt: 'You need to sign in to Google in the browser. Continue?',
  yesNo: 'Type Yes or No: ',
  cancelled: 'Cancelled.',
  openingBrowser: 'Opening browser…',
  installingBrowser: 'Playwright browser not found. Installing Chromium (needs network, ~170 MB)…',
  installBrowserFailed:
    'Could not install Chromium. Run manually: npx playwright install chromium',
  sessionFound: 'Session found in .auth/',
  enterAfterLogin: 'Press Enter after signing in… ',
  loginFailed: 'Login not completed. Try again.',
  dontCloseBrowser: 'Do not close the browser window until the script finishes.',
  sessionSaved: 'Session saved to .auth/',
  askAction: 'Do you want to download or delete all photos?\nType Download or Delete: ',
  actionNotRecognized: 'Not recognized. Type "Download" or "Delete".',
  loadingList: 'Loading list: scrolling + "Show more" (may take several minutes)…',
  showMore: (n, total) => `  "Show more" #${n}… (collected ${total})`,
  foundFiles: (n, clicks) =>
    `  Found ${n} file(s)` + (clicks ? `, "Show more" clicks: ${clicks}` : ''),
  noPhotos: 'No photos found.',
  willDownload: (n) => `\n${n} photos will be downloaded.`,
  pickFolderPrompt: 'Choose a download folder (a dialog will open).\n⚠ Do not close the browser while choosing.',
  downloadCancelled: 'Download cancelled.',
  downloading: (n, dir) => `Downloading ${n} file(s) in batches of 100 to ${dir} …`,
  downloadBatch: (batch, sel, total, exp) =>
    `Batch ${batch}: selected ${sel}, downloading…` + (exp ? ` (total ${total}/${exp})` : ''),
  waitingArchive: 'Waiting for the archive download to finish…',
  archiveAppeared: (name) => `  archive started: ${name}`,
  archiveProgress: (sec) => `  downloading archive… ${sec}s`,
  downloadedOf: (done, total) => `  Downloaded ${done} of ${total}`,
  deselecting: 'Clearing selection…',
  deselectProgress: (cleared, left) => `  cleared ≈${cleared}, still checked on screen: ${left}`,
  deselectDone: (cleared) => `  selection cleared (clicks: ${cleared})`,
  downloadDone: (batches, obj, files) =>
    `\nDone. Batches: ${batches}, objects downloaded: ${obj}, files saved: ${files}`,
  willDelete: (n) => `\n${n} photos will be deleted.`,
  deleteConfirm: 'Are you sure? Items in Google Photos trash will be permanently deleted after 60 days.',
  deleteCancelled: 'Deletion cancelled.',
  deleting: (n) => `Deleting ${n} file(s) in batches of 100…`,
  deleteBatch: (batch, sel, total, exp) =>
    `Batch ${batch}: selected ${sel}, deleting…` + (exp ? ` (total ${total}/${exp})` : ''),
  deleteDone: (batches, total) => `\nDone. Batches: ${batches}, deleted ≈${total}.`,
  listEmpty: 'List is empty. Done.',
  overwritePrompt: (name) => `File "${name}" already exists. Overwrite?`,
  skippedFile: (name) => `  skipped: ${name}`,
  savedFile: (name) => `  saved: ${name}`,
  renamedArchive: (from, to) => `  renamed ${from} → ${to}`,
  selectFailed: 'Could not select photos. Do not close the browser.',
  downloadBtnFailed: 'Download button did not work or download did not start.',
  deleteBtnFailed: 'Delete button or confirmation dialog not found.',
  enterFolderPath: 'Enter full folder path: ',
  expandingList: 'List shrunk — pressing "Show more" again…',
  visibleNow: (n) => `  ${n} items visible on page now.`,
  summary: (n) => `Found ${n} large photos/videos`,
};

// EN→RU keyboard mapping for mistyped layout
const EN_TO_RU = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь',
  '[': 'х', ']': 'ъ', ';': 'ж', "'": 'э', ',': 'б', '.': 'ю',
};

const RU_TO_EN = Object.fromEntries(
  Object.entries(EN_TO_RU).map(([k, v]) => [v, k]),
);

/**
 * Convert mistyped layout to the other.
 * "lf" → "да", "yt" → "нет", "crfxfnm" → "скачать"
 */
export function fixLayout(input) {
  const lower = input.toLowerCase();
  const asRu = [...lower].map((c) => EN_TO_RU[c] || c).join('');
  const asEn = [...lower].map((c) => RU_TO_EN[c] || c).join('');
  return { original: lower, asRu, asEn };
}

/**
 * Normalize yes/no/action input across languages and layouts.
 */
export function isYes(input) {
  const { original, asRu, asEn } = fixLayout(input.trim());
  const yesWords = ['да', 'yes', 'y', 'д'];
  return (
    yesWords.includes(original) ||
    yesWords.includes(asRu) ||
    yesWords.includes(asEn)
  );
}

export function isNo(input) {
  const { original, asRu, asEn } = fixLayout(input.trim());
  const noWords = ['нет', 'no', 'n', 'н'];
  return (
    noWords.includes(original) ||
    noWords.includes(asRu) ||
    noWords.includes(asEn)
  );
}

export function parseAction(input) {
  const { original, asRu, asEn } = fixLayout(input.trim());
  const dlWords = ['скачать', 'download', 'с', 'd'];
  const delWords = ['удалить', 'delete', 'у', 'del'];
  for (const w of [original, asRu, asEn]) {
    if (dlWords.includes(w)) return 'download';
    if (delWords.includes(w)) return 'delete';
  }
  return null;
}

let currentLang = 'ru';

export function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'ru';
}

export function getLang() {
  return currentLang;
}

export function t() {
  return currentLang === 'en' ? en : ru;
}

/**
 * Detect system language, default to ru.
 */
export function detectSystemLang() {
  const env =
    process.env.LANG ||
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANGUAGE ||
    '';
  if (/^(en|c$)/i.test(env)) return 'en';
  return 'ru';
}
