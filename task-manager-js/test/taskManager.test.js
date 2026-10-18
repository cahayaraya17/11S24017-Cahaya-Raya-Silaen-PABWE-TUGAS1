'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TaskManager, isValidDate } = require('../src/taskManager');

test('add: membuat tugas dengan nilai bawaan yang benar', () => {
  const tm = new TaskManager();
  const task = tm.add('  Belajar JavaScript  ');
  assert.equal(task.id, 1);
  assert.equal(task.title, 'Belajar JavaScript');
  assert.equal(task.priority, 'medium');
  assert.equal(task.due, null);
  assert.equal(task.status, 'todo');
});

test('add: judul kosong ditolak', () => {
  const tm = new TaskManager();
  assert.throws(() => tm.add('   '), /tidak boleh kosong/);
});

test('add: prioritas tidak valid ditolak', () => {
  const tm = new TaskManager();
  assert.throws(() => tm.add('A', { priority: 'urgent' }), /Prioritas/);
});

test('ID tidak boleh duplikat setelah tugas dihapus', () => {
  const tm = new TaskManager();
  tm.add('A'); // id 1
  tm.add('B'); // id 2
  tm.remove(1);
  const c = tm.add('C');
  const ids = tm.list().map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'ID harus unik');
  assert.equal(c.id, 3);
});

test('isValidDate: menolak tanggal yang tidak ada di kalender', () => {
  assert.equal(isValidDate('2026-02-31'), false);
  assert.equal(isValidDate('2027-02-29'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('25-10-2026'), false);
});

test('isValidDate: menerima tanggal valid termasuk tahun kabisat', () => {
  assert.equal(isValidDate('2026-10-25'), true);
  assert.equal(isValidDate('2028-02-29'), true);
});

test('add: tenggat 31 Februari ditolak', () => {
  const tm = new TaskManager();
  assert.throws(() => tm.add('A', { due: '2026-02-31' }), /Tenggat/);
});

test('list: filter berdasarkan status dan prioritas', () => {
  const tm = new TaskManager();
  tm.add('A', { priority: 'high' });
  tm.add('B', { priority: 'low' });
  tm.complete(1);
  assert.deepEqual(tm.list({ status: 'done' }).map((t) => t.id), [1]);
  assert.deepEqual(tm.list({ priority: 'low' }).map((t) => t.id), [2]);
});

test('list: urut tenggat, tugas tanpa tenggat di akhir (semua urutan input)', () => {
  const items = [
    ['Tanpa tenggat', null],
    ['Lambat', '2026-12-01'],
    ['Cepat', '2026-10-20'],
  ];
  const permutations = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];
  for (const order of permutations) {
    const tm = new TaskManager();
    order.forEach((i) => tm.add(items[i][0], { due: items[i][1] }));
    const titles = tm.list({ sort: 'due' }).map((t) => t.title);
    assert.deepEqual(titles, ['Cepat', 'Lambat', 'Tanpa tenggat'], `urutan input ${order}`);
  }
});

test('list: urut prioritas high -> medium -> low', () => {
  const tm = new TaskManager();
  tm.add('L', { priority: 'low' });
  tm.add('H', { priority: 'high' });
  tm.add('M', { priority: 'medium' });
  assert.deepEqual(tm.list({ sort: 'priority' }).map((t) => t.title), ['H', 'M', 'L']);
});

test('complete: mengubah status dan mencatat waktu selesai', () => {
  const tm = new TaskManager();
  tm.add('A');
  const done = tm.complete(1);
  assert.equal(done.status, 'done');
  assert.ok(done.completedAt);
});

test('complete: ID tidak ditemukan -> error', () => {
  const tm = new TaskManager();
  assert.throws(() => tm.complete(99), /tidak ditemukan/);
});

test('update: mengubah judul, prioritas, dan menghapus tenggat', () => {
  const tm = new TaskManager();
  tm.add('A', { due: '2026-10-20' });
  const t = tm.update(1, { title: 'A2', priority: 'high', due: null });
  assert.equal(t.title, 'A2');
  assert.equal(t.priority, 'high');
  assert.equal(t.due, null);
});

test('remove: menghapus tugas', () => {
  const tm = new TaskManager();
  tm.add('A');
  tm.remove(1);
  assert.equal(tm.list().length, 0);
});

test('search: tidak peka huruf besar/kecil', () => {
  const tm = new TaskManager();
  tm.add('Belajar JavaScript');
  tm.add('Cuci motor');
  assert.deepEqual(tm.search('javascript').map((t) => t.id), [1]);
  assert.throws(() => tm.search(' '), /tidak boleh kosong/);
});

test('stats: menghitung total, selesai, dan lewat tenggat', () => {
  const tm = new TaskManager();
  tm.add('A', { due: '2026-10-01' }); // lewat tenggat
  tm.add('B', { due: '2026-10-30' });
  tm.add('C');
  tm.complete(3);
  assert.deepEqual(tm.stats('2026-10-18'), {
    total: 3,
    done: 1,
    todo: 2,
    overdue: 1,
    percentDone: 33,
  });
});
