'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'src', 'cli.js');

function makeRunner() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-cli-'));
  const env = { ...process.env, TASKS_FILE: path.join(dir, 'tasks.json') };
  return (...args) => spawnSync(process.execPath, [CLI, ...args], { env, encoding: 'utf8' });
}

test('CLI: alur tambah -> list -> selesai -> statistik', () => {
  const run = makeRunner();
  assert.match(run('add', 'Kerjakan', 'tugas', '-p', 'high', '-d', '2099-01-01').stdout, /Tugas ditambahkan/);
  assert.match(run('list').stdout, /#1 .*Kerjakan tugas/);
  assert.match(run('done', '1').stdout, /\[x\]/);
  assert.match(run('stats').stdout, /Selesai: 1 \(100%\)/);
});

test('CLI: tanggal tidak valid -> exit code 1 dan pesan error', () => {
  const run = makeRunner();
  const res = run('add', 'A', '-d', '2026-02-31');
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Tenggat/);
});

test('CLI: perintah tidak dikenal -> exit code 1', () => {
  const run = makeRunner();
  const res = run('terbang');
  assert.equal(res.status, 1);
  assert.match(res.stderr, /tidak dikenal/);
});

test('CLI: opsi tidak dikenal -> exit code 1 (bukan crash tak tertangani)', () => {
  const run = makeRunner();
  const res = run('list', '--warna', 'merah');
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Error:/);
});
