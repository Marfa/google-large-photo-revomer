// src/selfcheck.js
import assert from 'node:assert/strict';
import { chunk, parseSizeBytes, formatBytes, safeFileName } from './util.js';

function testChunk() {
  assert.deepEqual(chunk([], 100), []);
  assert.deepEqual(chunk([1, 2, 3], 100), [[1, 2, 3]]);
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  const hundred = Array.from({ length: 250 }, (_, i) => i);
  const batches = chunk(hundred, 100);
  assert.equal(batches.length, 3);
  assert.equal(batches[0].length, 100);
  assert.equal(batches[1].length, 100);
  assert.equal(batches[2].length, 50);
  assert.throws(() => chunk([1], 0));
  assert.throws(() => chunk([1], -1));
}

function testParseSize() {
  assert.equal(parseSizeBytes('12 MB'), 12_000_000);
  assert.equal(parseSizeBytes('1.5 GB'), 1_500_000_000);
  assert.equal(parseSizeBytes('1,2 ГБ'), 1_200_000_000);
  assert.equal(parseSizeBytes('450 KB'), 450_000);
  assert.equal(parseSizeBytes(''), null);
  assert.equal(parseSizeBytes(null), null);
  assert.equal(parseSizeBytes('no size here'), null);
}

function testFormatBytes() {
  assert.equal(formatBytes(500), '500 B');
  assert.match(formatBytes(12_000_000), /MB/);
}

function testSafeFileName() {
  assert.equal(safeFileName('a/b:c*.jpg'), 'a_b_c_.jpg');
  assert.ok(safeFileName('').length > 0);
}

testChunk();
testParseSize();
testFormatBytes();
testSafeFileName();
console.log('selfcheck: ok');
