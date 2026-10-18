'use strict';

const $ = (selector) => document.querySelector(selector);
const PRIORITY_LABEL = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };
let editingId = null;

$('#today').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function localToday() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
  return data;
}

function showMessage(text) {
  const box = $('#message');
  box.textContent = text || '';
  box.hidden = !text;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}


const ICONS = {
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
};

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name];
  return svg;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 42;

function renderStats(s) {
  $('#stat-total').textContent = s.total;
  $('#stat-todo').textContent = s.todo;
  $('#stat-done').textContent = s.done;
  $('#stat-over').textContent = s.overdue;
  $('#stat-over-box').classList.toggle('over', s.overdue > 0);
  $('#stat-percent').textContent = `${s.percentDone}%`;
  $('#ring-bar').style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - s.percentDone / 100);
}

function renderTask(task) {
  const li = el('li', `item ${task.status}`);

  const check = el('input');
  check.type = 'checkbox';
  check.checked = task.status === 'done';
  check.disabled = task.status === 'done';
  check.title = 'Tandai selesai';
  check.setAttribute('aria-label', `Tandai selesai: ${task.title}`);
  check.addEventListener('change', () => run(() => api(`/tasks/${task.id}/done`, { method: 'POST' })));

  const body = el('div', 'body');
  body.append(el('div', 'title', task.title));
  const meta = el('div', 'meta');
  meta.append(el('span', `badge ${task.priority}`, PRIORITY_LABEL[task.priority]));
  if (task.due) {
    const overdue = task.status === 'todo' && task.due < localToday();
    const due = el('span', overdue ? 'due over' : 'due');
    due.append(icon('calendar'), document.createTextNode(overdue ? `Lewat tenggat ${formatDate(task.due)}` : `Tenggat ${formatDate(task.due)}`));
    meta.append(due);
  } else {
    meta.append(el('span', 'due', 'Tanpa tenggat'));
  }
  body.append(meta);

  const actions = el('div', 'actions');
  const edit = el('button', 'icon-btn');
  edit.type = 'button';
  edit.title = 'Ubah';
  edit.setAttribute('aria-label', `Ubah: ${task.title}`);
  edit.append(icon('edit'));
  edit.addEventListener('click', () => openEdit(task));
  const del = el('button', 'icon-btn del');
  del.type = 'button';
  del.title = 'Hapus';
  del.setAttribute('aria-label', `Hapus: ${task.title}`);
  del.append(icon('trash'));
  del.addEventListener('click', () => {
    if (confirm(`Hapus tugas "${task.title}"?`)) run(() => api(`/tasks/${task.id}`, { method: 'DELETE' }));
  });
  actions.append(edit, del);

  li.append(check, body, actions);
  return li;
}

async function refresh() {
  const params = new URLSearchParams();
  const filters = { q: '#q', status: '#f-status', priority: '#f-priority', sort: '#f-sort' };
  Object.entries(filters).forEach(([key, selector]) => {
    const value = $(selector).value.trim();
    if (value) params.set(key, value);
  });
  const [tasks, stats] = await Promise.all([api(`/tasks?${params}`), api('/stats')]);
  renderStats(stats);
  const list = $('#list');
  list.replaceChildren();
  $('#count').textContent = tasks.length;
  if (tasks.length === 0) {
    const empty = el('li', 'empty');
    empty.append(icon('inbox'), document.createTextNode('Tidak ada tugas.'));
    list.append(empty);
  }
  tasks.forEach((task) => list.append(renderTask(task)));
}

async function run(action) {
  try {
    showMessage('');
    await action();
    await refresh();
  } catch (err) {
    showMessage(err.message);
  }
}

function openEdit(task) {
  editingId = task.id;
  $('#edit-title').value = task.title;
  $('#edit-priority').value = task.priority;
  $('#edit-due').value = task.due || '';
  $('#edit-dialog').showModal();
}

$('#add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: $('#title').value, priority: $('#priority').value, due: $('#due').value }),
    });
    $('#add-form').reset();
  });
});

$('#edit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = editingId;
  $('#edit-dialog').close();
  run(() => api(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: $('#edit-title').value, priority: $('#edit-priority').value, due: $('#edit-due').value }),
  }));
});
$('#edit-cancel').addEventListener('click', () => $('#edit-dialog').close());

['#q', '#f-status', '#f-priority', '#f-sort'].forEach((selector) => {
  $(selector).addEventListener('input', () => run(() => Promise.resolve()));
});

run(() => Promise.resolve());
