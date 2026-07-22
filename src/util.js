// src/util.js

/**
 * Split an array into chunks of at most `size`.
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`chunk size must be a positive integer, got ${size}`);
  }
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Parse human size strings like "12.3 MB", "1,2 ГБ", "450 KB" into bytes.
 * Returns null if unparseable.
 * @param {string | null | undefined} text
 * @returns {number | null}
 */
export function parseSizeBytes(text) {
  if (!text || typeof text !== 'string') return null;
  const normalized = text
    .replace(/\u00a0/g, ' ')
    .replace(',', '.')
    .trim();
  const match = normalized.match(
    /([\d.]+)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB|КБ|МБ|ГБ|ТБ|байт)?/i,
  );
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = (match[2] || 'B').toUpperCase();
  const factors = {
    B: 1,
    БАЙТ: 1,
    KB: 1e3,
    КБ: 1e3,
    KIB: 1024,
    MB: 1e6,
    МБ: 1e6,
    MIB: 1024 ** 2,
    GB: 1e9,
    ГБ: 1e9,
    GIB: 1024 ** 3,
    TB: 1e12,
    ТБ: 1e12,
    TIB: 1024 ** 4,
  };
  const factor = factors[unit];
  if (factor == null) return null;
  return Math.round(value * factor);
}

/**
 * Format bytes as a short human string.
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '?';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i += 1;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

/**
 * Safe filename from an id/title.
 * @param {string} name
 */
export function safeFileName(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'file';
}
