'use strict';

const path = require('node:path');

/**
 * Konfigurasi aplikasi.
 *
 * TASKS_FILE (opsional) : lokasi file JSON penyimpanan tugas.
 *                         Bawaan: <root-proyek>/data/tasks.json
 */
const dataFile = process.env.TASKS_FILE
  ? path.resolve(process.env.TASKS_FILE)
  : path.join(__dirname, '..', 'data', 'tasks.json');

module.exports = { dataFile };
