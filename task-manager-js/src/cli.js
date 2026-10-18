#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const { dataFile } = require('./config');
const storage = require('./storage');
const { TaskManager, todayString } = require('./taskManager');

const HELP = `Task Manager CLI

Penggunaan:
  node src/cli.js <perintah> [argumen] [opsi]

Perintah:
  add "<judul>" [-p low|medium|high] [-d YYYY-MM-DD]   Tambah tugas
  list [-s todo|done] [-p prioritas] [--sort due|priority]   Tampilkan tugas
  done <id>                                            Tandai tugas selesai
  edit <id> [-t "<judul>"] [-p prioritas] [-d YYYY-MM-DD|none]   Ubah tugas
  delete <id>                                          Hapus tugas
  search "<kata kunci>"                                Cari tugas berdasarkan judul
  stats                                                Ringkasan statistik
  help                                                 Tampilkan bantuan

Lokasi data: ${dataFile}
(ubah dengan variabel lingkungan TASKS_FILE)`;

const OPTIONS = {
  priority: { type: 'string', short: 'p' },
  due: { type: 'string', short: 'd' },
  status: { type: 'string', short: 's' },
  sort: { type: 'string' },
  title: { type: 'string', short: 't' },
  help: { type: 'boolean', short: 'h' },
};

function formatTask(task) {
  const mark = task.status === 'done' ? '[x]' : '[ ]';
  const due = task.due ? `tenggat ${task.due}` : 'tanpa tenggat';
  return `${mark} #${task.id}  (${task.priority})  ${task.title}  - ${due}`;
}

function printTasks(tasks) {
  if (tasks.length === 0) {
    console.log('Tidak ada tugas.');
    return;
  }
  tasks.forEach((task) => console.log(formatTask(task)));
}

function run(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: OPTIONS,
    allowPositionals: true,
  });
  const [command = 'help', ...rest] = positionals;

  if (values.help || command === 'help') {
    console.log(HELP);
    return;
  }

  const manager = new TaskManager(storage.load(dataFile));
  const persist = () => storage.save(dataFile, manager.toJSON());

  switch (command) {
    case 'add': {
      const task = manager.add(rest.join(' '), {
        priority: values.priority,
        due: values.due,
      });
      persist();
      console.log(`Tugas ditambahkan: ${formatTask(task)}`);
      break;
    }
    case 'list':
      printTasks(
        manager.list({
          status: values.status,
          priority: values.priority,
          sort: values.sort,
        }),
      );
      break;
    case 'done': {
      const task = manager.complete(rest[0]);
      persist();
      console.log(`Selesai: ${formatTask(task)}`);
      break;
    }
    case 'edit': {
      const due = values.due === 'none' ? null : values.due;
      const task = manager.update(rest[0], {
        title: values.title,
        priority: values.priority,
        due,
      });
      persist();
      console.log(`Diperbarui: ${formatTask(task)}`);
      break;
    }
    case 'delete': {
      const task = manager.remove(rest[0]);
      persist();
      console.log(`Dihapus: ${formatTask(task)}`);
      break;
    }
    case 'search':
      printTasks(manager.search(rest.join(' ')));
      break;
    case 'stats': {
      const s = manager.stats(todayString());
      console.log(`Total: ${s.total} | Belum selesai: ${s.todo} | Selesai: ${s.done} (${s.percentDone}%) | Lewat tenggat: ${s.overdue}`);
      break;
    }
    default:
      throw new Error(`Perintah tidak dikenal: "${command}". Jalankan "help" untuk bantuan.`);
  }
}

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { run, formatTask };
