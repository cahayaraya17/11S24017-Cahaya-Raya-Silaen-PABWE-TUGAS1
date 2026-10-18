# Task Manager JS

Aplikasi **task manager berbasis web** (Node.js + HTML/JavaScript) yang juga dapat dipakai lewat terminal (CLI), dikembangkan dengan bantuan **AI generatif** sebagai asisten pemrograman.

Repositori ini adalah hasil **Tugas I – 11S3133 Pengembangan Aplikasi Berbasis Web** (Institut Teknologi Del).
Dokumen proposal lengkap (analisis, perancangan, prompt, pengujian, debugging) ada di folder [`docs/`](docs/).

- Nama : Cahaya Raya Silaen
- NIM  : 11S24017

## Fitur

- Tambah tugas (judul, prioritas, tenggat)
- Tampilkan tugas dengan filter status/prioritas, pencarian judul, dan urutan tenggat/prioritas
- Tandai selesai, ubah, dan hapus tugas
- Statistik: total, selesai, belum selesai, lewat tenggat
- Data disimpan ke file JSON

## Prasyarat

- [Node.js](https://nodejs.org/) **versi 18.3 atau lebih baru** (diuji dengan Node 22)
- Git
- Tidak ada dependensi eksternal, jadi **tidak perlu `npm install`**

```bash
node -v
```

## Inisialisasi (pertama kali)

```bash
git clone https://github.com/<username-anda>/task-manager-js.git
cd task-manager-js
npm test        # opsional: memastikan 28 tes lulus
```

Folder `data/` dan file `data/tasks.json` dibuat otomatis saat tugas pertama disimpan.

## Menjalankan versi web

```bash
npm start
```

Lalu buka **http://localhost:3000** di browser. Tekan `Ctrl+C` di terminal untuk menghentikan server.

### REST API

| Metode & path | Fungsi |
|---|---|
| `GET /api/tasks?status=&priority=&sort=&q=` | Daftar tugas (filter, urutan `due`/`priority`, cari judul) |
| `POST /api/tasks` | Tambah tugas, body JSON: `title`, `priority`, `due` |
| `PATCH /api/tasks/:id` | Ubah tugas (`title`, `priority`, `due`) |
| `POST /api/tasks/:id/done` | Tandai selesai |
| `DELETE /api/tasks/:id` | Hapus tugas |
| `GET /api/stats` | Statistik |

Kesalahan dikembalikan sebagai JSON `{ "error": "..." }` dengan kode 400 (input tidak valid), 404 (tidak ditemukan), atau 405.

## Menjalankan versi terminal (CLI)

```bash
node src/cli.js help
node src/cli.js add "Kerjakan Tugas I PABWE" -p high -d 2026-10-25
node src/cli.js list --sort due
node src/cli.js done 1
node src/cli.js edit 2 -t "Judul baru" -p medium
node src/cli.js search vue
node src/cli.js stats
node src/cli.js delete 2
```

| Opsi | Keterangan |
|---|---|
| `-p`, `--priority` | `low`, `medium` (bawaan), atau `high` |
| `-d`, `--due` | Tenggat `YYYY-MM-DD`; pada `edit`, `none` menghapus tenggat |
| `-s`, `--status` | Filter pada `list`: `todo` atau `done` |
| `--sort` | Urutan pada `list`: `due` atau `priority` |
| `-t`, `--title` | Judul baru pada `edit` |

Versi web dan CLI memakai file data yang sama.

## Konfigurasi

Melalui variabel lingkungan (semuanya opsional):

| Variabel | Bawaan | Fungsi |
|---|---|---|
| `TASKS_FILE` | `data/tasks.json` | Lokasi file data |
| `PORT` | `3000` | Port server web |

```bash
# Linux / macOS / Git Bash
PORT=8080 TASKS_FILE=/tmp/tugas-saya.json npm start

# Windows PowerShell
$env:PORT = "8080"; $env:TASKS_FILE = "C:\temp\tugas-saya.json"; npm start
```

## Pengujian

```bash
npm test
```

Menjalankan 28 tes (`node:test` bawaan Node.js): logika inti, penyimpanan JSON, CLI, dan REST API/server.

## Struktur proyek

```
public/             antarmuka web (index.html, app.js, style.css)
src/server.js       server web + REST API
src/cli.js          antarmuka baris perintah
src/config.js       konfigurasi (lokasi data, port)
src/storage.js      baca/tulis file JSON (penulisan atomik)
src/taskManager.js  logika inti dan validasi
test/               unit test dan integration test
docs/               proposal dan gambar
data/               file data tugas (tasks.json tidak di-commit)
```

## Catatan penggunaan AI

Kode awal dihasilkan oleh asisten AI, lalu diuji, dievaluasi, dan diperbaiki secara manual.
Empat tes yang gagal pada versi awal (berasal dari tiga akar masalah: ID duplikat, validasi tanggal, pengurutan tenggat kosong)
dijelaskan lengkap di proposal bagian *Debugging dan Perbaikan*.
