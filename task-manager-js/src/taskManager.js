'use strict';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'done'];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/** Tanggal hari ini (zona waktu lokal) dalam format YYYY-MM-DD. */
function todayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Valid jika berformat YYYY-MM-DD dan benar-benar ada di kalender. */
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Pembanding tenggat: tugas tanpa tenggat diletakkan paling akhir. */
function compareDue(a, b) {
  if (a.due === b.due) return 0;
  if (a.due === null) return 1;
  if (b.due === null) return -1;
  return a.due.localeCompare(b.due);
}

function comparePriority(a, b) {
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

function assertPriority(priority) {
  if (!PRIORITIES.includes(priority)) {
    throw new Error(`Prioritas harus salah satu dari: ${PRIORITIES.join(', ')}.`);
  }
}

function assertDue(due) {
  if (due !== null && !isValidDate(due)) {
    throw new Error('Tenggat harus berformat YYYY-MM-DD dan merupakan tanggal yang valid.');
  }
}

class TaskManager {
  constructor(tasks = []) {
    this.tasks = tasks.map((task) => ({ ...task }));
  }

  _nextId() {
    return this.tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
  }

  _find(id) {
    const numeric = Number(id);
    const task = this.tasks.find((item) => item.id === numeric);
    if (!task) throw new Error(`Tugas dengan ID ${id} tidak ditemukan.`);
    return task;
  }

  add(title, { priority = 'medium', due = null } = {}) {
    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) throw new Error('Judul tugas tidak boleh kosong.');
    assertPriority(priority);
    assertDue(due);

    const task = {
      id: this._nextId(),
      title: cleanTitle,
      priority,
      due,
      status: 'todo',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.tasks.push(task);
    return { ...task };
  }

  list({ status, priority, sort } = {}) {
    if (status !== undefined && !STATUSES.includes(status)) {
      throw new Error(`Status harus salah satu dari: ${STATUSES.join(', ')}.`);
    }
    if (priority !== undefined) assertPriority(priority);
    if (sort !== undefined && !['due', 'priority'].includes(sort)) {
      throw new Error('Pengurutan harus "due" atau "priority".');
    }

    let result = this.tasks.filter(
      (task) =>
        (status === undefined || task.status === status) &&
        (priority === undefined || task.priority === priority),
    );
    result = [...result];
    if (sort === 'due') result.sort(compareDue);
    if (sort === 'priority') result.sort(comparePriority);
    return result.map((task) => ({ ...task }));
  }

  complete(id) {
    const task = this._find(id);
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    return { ...task };
  }

  update(id, changes = {}) {
    const task = this._find(id);
    const { title, priority, due } = changes;

    if (title !== undefined) {
      const cleanTitle = String(title).trim();
      if (!cleanTitle) throw new Error('Judul tugas tidak boleh kosong.');
      task.title = cleanTitle;
    }
    if (priority !== undefined) {
      assertPriority(priority);
      task.priority = priority;
    }
    if (due !== undefined) {
      assertDue(due);
      task.due = due;
    }
    return { ...task };
  }

  remove(id) {
    const task = this._find(id);
    this.tasks = this.tasks.filter((item) => item.id !== task.id);
    return { ...task };
  }

  search(keyword) {
    const needle = String(keyword ?? '').trim().toLowerCase();
    if (!needle) throw new Error('Kata kunci pencarian tidak boleh kosong.');
    return this.tasks
      .filter((task) => task.title.toLowerCase().includes(needle))
      .map((task) => ({ ...task }));
  }

  stats(today = todayString()) {
    const total = this.tasks.length;
    const done = this.tasks.filter((task) => task.status === 'done').length;
    const overdue = this.tasks.filter(
      (task) => task.status === 'todo' && task.due !== null && task.due < today,
    ).length;
    return {
      total,
      done,
      todo: total - done,
      overdue,
      percentDone: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }

  toJSON() {
    return this.tasks.map((task) => ({ ...task }));
  }
}

module.exports = { TaskManager, isValidDate, todayString, PRIORITIES, STATUSES };
