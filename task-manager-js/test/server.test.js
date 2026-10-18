'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../src/server');

async function withServer(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-web-'));
  const server = createServer(path.join(dir, 'tasks.json'));
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, type, data: type.includes('json') ? await res.json() : await res.text() };
  };
  try {
    await fn(call);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET / menyajikan halaman HTML', async () => {
  await withServer(async (call) => {
    const res = await call('GET', '/');
    assert.equal(res.status, 200);
    assert.match(res.type, /text\/html/);
    assert.match(res.data, /Task Manager/);
  });
});

test('API: alur tambah, ubah, selesai, hapus', async () => {
  await withServer(async (call) => {
    const created = await call('POST', '/api/tasks', { title: 'Belajar Vue', priority: 'high', due: '2099-01-01' });
    assert.equal(created.status, 201);
    assert.equal(created.data.id, 1);

    const patched = await call('PATCH', '/api/tasks/1', { title: 'Belajar Vue 3', due: '' });
    assert.equal(patched.data.title, 'Belajar Vue 3');
    assert.equal(patched.data.due, null);

    const done = await call('POST', '/api/tasks/1/done');
    assert.equal(done.data.status, 'done');

    const stats = await call('GET', '/api/stats');
    assert.equal(stats.data.done, 1);

    const del = await call('DELETE', '/api/tasks/1');
    assert.equal(del.status, 200);
    assert.deepEqual((await call('GET', '/api/tasks')).data, []);
  });
});

test('API: filter, cari, dan urut tenggat (tenggat kosong di akhir)', async () => {
  await withServer(async (call) => {
    await call('POST', '/api/tasks', { title: 'Tanpa tenggat' });
    await call('POST', '/api/tasks', { title: 'Lambat', due: '2026-12-01' });
    await call('POST', '/api/tasks', { title: 'Cepat', due: '2026-10-20', priority: 'low' });
    const sorted = await call('GET', '/api/tasks?sort=due');
    assert.deepEqual(sorted.data.map((t) => t.title), ['Cepat', 'Lambat', 'Tanpa tenggat']);
    const low = await call('GET', '/api/tasks?priority=low&status=');
    assert.deepEqual(low.data.map((t) => t.title), ['Cepat']);
    const found = await call('GET', '/api/tasks?q=LAMB');
    assert.deepEqual(found.data.map((t) => t.title), ['Lambat']);
  });
});

test('API: input tidak valid -> 400, ID tidak ada -> 404', async () => {
  await withServer(async (call) => {
    const bad = await call('POST', '/api/tasks', { title: 'A', due: '2026-02-31' });
    assert.equal(bad.status, 400);
    assert.match(bad.data.error, /Tenggat/);
    const empty = await call('POST', '/api/tasks', { title: '  ' });
    assert.equal(empty.status, 400);
    const missing = await call('POST', '/api/tasks/99/done');
    assert.equal(missing.status, 404);
  });
});

test('Static: path traversal ditolak', async () => {
  await withServer(async (call) => {
    const res = await call('GET', '/..%2Fpackage.json');
    assert.equal(res.status, 404);
  });
});
