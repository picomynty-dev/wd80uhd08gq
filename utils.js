export const clone = (value) => JSON.parse(JSON.stringify(value));

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function numberValue(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatDate(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  }).format(date);
}

export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours) return `${hours} h ${minutes} min`;
  if (minutes) return `${minutes} min ${rest ? `${rest} s` : ''}`.trim();
  return `${rest} s`;
}

export function formatTimer(totalSeconds = 0) {
  const seconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isoDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const first = new Date(`${isoDay(a)}T00:00:00`);
  const second = new Date(`${isoDay(b)}T00:00:00`);
  return Math.round((second - first) / 86400000);
}

export function debounce(fn, wait = 180) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readJsonFile(file) {
  if (!file) throw new Error('No se ha seleccionado ningún archivo.');
  const text = await file.text();
  return JSON.parse(text);
}
