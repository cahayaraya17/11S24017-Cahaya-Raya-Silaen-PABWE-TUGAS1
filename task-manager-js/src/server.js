'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { dataFile } = require('./config');
const storage = require('./storage');
const { TaskManager, todayString } = require('./taskManager');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const MAX_BODY = 100 * 1024;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Data terlalu besar.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Body harus berupa JSON yang valid.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/** Ubah string kosong menjadi undefined agar parameter opsional diabaikan. */
const opt = (value) => (value === '' || value === null ? undefined : value);

async function handleApi(req, res, url, file) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'tasks', ':id', 'done']
  const manager = new TaskManager(storage.load(file));
  const persist = () => storage.save(file, manager.toJSON());
  const [, resource, id, action] = parts;

  if (resource === 'stats' && !id && req.method === 'GET') {
    return sendJson(res, 200, manager.stats(todayString()));
  }
  if (resource !== 'tasks') {
    return sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
  }

  if (!id) {
    if (req.method === 'GET') {
      const q = url.searchParams;
      let tasks = manager.list({
        status: opt(q.get('status')),
        priority: opt(q.get('priority')),
        sort: opt(q.get('sort')),
      });
      const keyword = (q.get('q') || '').trim().toLowerCase();
      if (keyword) tasks = tasks.filter((t) => t.title.toLowerCase().includes(keyword));
      return sendJson(res, 200, tasks);
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      const task = manager.add(body.title, {
        priority: opt(body.priority),
        due: opt(body.due) ?? null,
      });
      persist();
      return sendJson(res, 201, task);
    }
    return sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
  }

  if (action === 'done' && req.method === 'POST') {
    const task = manager.complete(id);
    persist();
    return sendJson(res, 200, task);
  }
  if (!action && req.method === 'PATCH') {
    const body = await readJson(req);
    const changes = { title: body.title, priority: body.priority };
    if ('due' in body) changes.due = opt(body.due) ?? null;
    const task = manager.update(id, changes);
    persist();
    return sendJson(res, 200, task);
  }
  if (!action && req.method === 'DELETE') {
    const task = manager.remove(id);
    persist();
    return sendJson(res, 200, task);
  }
  return sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const full = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!full.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Halaman tidak ditemukan.');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  return fs.createReadStream(full).pipe(res);
}

function createServer(file = dataFile) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url, file);
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Metode tidak diizinkan.' });
      return serveStatic(req, res, url);
    } catch (err) {
      const status = err.status || (/tidak ditemukan/.test(err.message) ? 404 : 400);
      return sendJson(res, status, { error: err.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Task Manager berjalan di http://localhost:${port}`);
    console.log(`Data disimpan di: ${dataFile}`);
    console.log('Tekan Ctrl+C untuk berhenti.');
  });
}

module.exports = { createServer };
