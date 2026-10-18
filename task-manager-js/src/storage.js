'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Membaca daftar tugas dari file JSON.
 * - File belum ada  -> daftar kosong (aplikasi dipakai pertama kali)
 * - File kosong     -> daftar kosong
 * - File rusak      -> error dengan pesan yang jelas (data tidak ditimpa)
 */
function load(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw new Error(`Gagal membaca ${file}: ${err.message}`);
  }
  if (!raw.trim()) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`File data rusak (${file}): ${err.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`File data rusak (${file}): isi harus berupa array.`);
  }
  return data;
}

/**
 * Menyimpan daftar tugas. Ditulis ke file sementara lalu di-rename
 * agar file asli tidak setengah tertulis jika proses terhenti.
 */
function save(file, tasks) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

module.exports = { load, save };
