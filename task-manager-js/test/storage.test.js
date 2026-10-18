'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const storage = require('../src/storage');

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-'));
  return path.join(dir, 'nested', 'tasks.json');
}

test('load: file belum ada -> array kosong', () => {
  assert.deepEqual(storage.load(tempFile()), []);
});

test('save lalu load: data kembali sama (folder dibuat otomatis)', () => {
  const file = tempFile();
  const data = [{ id: 1, title: 'A' }];
  storage.save(file, data);
  assert.deepEqual(storage.load(file), data);
});

test('load: JSON rusak -> error jelas, file tidak ditimpa', () => {
  const file = tempFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{rusak');
  assert.throws(() => storage.load(file), /File data rusak/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{rusak');
});
