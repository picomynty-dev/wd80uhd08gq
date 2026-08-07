'use strict';

const DB_NAME = 'myFitPlanPrivateMediaV33';
const DB_VERSION = 1;
const STORE_NAME = 'progressPhotos';
const objectUrls = new Map();

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no permite guardar fotografías privadas.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento privado.'));
  });
}

async function withStore(mode, callback) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try {
      result = callback(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('No se pudo completar la operación.'));
    };
    transaction.onabort = transaction.onerror;
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo leer la fotografía.'));
  });
}

export async function saveProgressPhoto(id, blob) {
  if (!id || !(blob instanceof Blob)) throw new Error('Fotografía no válida.');
  await withStore('readwrite', (store) => store.put({ id, blob, updatedAt: new Date().toISOString() }));
  if (objectUrls.has(id)) {
    URL.revokeObjectURL(objectUrls.get(id));
    objectUrls.delete(id);
  }
  return id;
}

export async function getProgressPhotoBlob(id) {
  if (!id) return null;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(id));
    return record?.blob || null;
  } finally {
    database.close();
  }
}

export async function listProgressPhotoIds() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const keys = await requestResult(transaction.objectStore(STORE_NAME).getAllKeys());
    return Array.isArray(keys) ? keys.map(String) : [];
  } finally {
    database.close();
  }
}

export async function getProgressPhotoUrl(id) {
  if (!id) return '';
  if (objectUrls.has(id)) return objectUrls.get(id);
  const blob = await getProgressPhotoBlob(id);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, url);
  return url;
}

export async function deleteProgressPhoto(id) {
  if (!id) return;
  await withStore('readwrite', (store) => store.delete(id));
  if (objectUrls.has(id)) {
    URL.revokeObjectURL(objectUrls.get(id));
    objectUrls.delete(id);
  }
}

export async function deleteProgressPhotos(ids = []) {
  await Promise.all([...new Set(ids.filter(Boolean))].map(deleteProgressPhoto));
}

export async function clearProgressPhotoStore() {
  await withStore('readwrite', (store) => store.clear());
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}

export async function hydrateProgressImages(root = document) {
  const images = [...root.querySelectorAll('img[data-photo-id]')];
  await Promise.all(images.map(async (image) => {
    const id = image.dataset.photoId;
    if (!id || image.dataset.hydrated === 'true') return;
    const url = await getProgressPhotoUrl(id);
    image.dataset.hydrated = 'true';
    if (url) {
      image.src = url;
      image.closest('[data-photo-frame]')?.classList.add('has-photo');
    } else {
      image.removeAttribute('src');
      image.closest('[data-photo-frame]')?.classList.add('missing-photo');
    }
  }));
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo procesar la imagen seleccionada.'));
    };
    image.src = url;
  });
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function drawCompressedImage(image, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#0b0f17';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function compressProgressImage(file, {
  maxDimension = 1440,
  quality = 0.80,
  targetBytes = 1800 * 1024
} = {}) {
  if (!(file instanceof Blob)) throw new Error('Selecciona una imagen válida.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');

  try {
    const image = await loadImage(file);
    let canvas = drawCompressedImage(image, maxDimension);
    let blob = await canvasBlob(canvas, quality);
    if (!blob) throw new Error('No se pudo comprimir la fotografía.');

    if (blob.size > targetBytes) {
      canvas = drawCompressedImage(image, Math.min(1200, maxDimension));
      blob = await canvasBlob(canvas, 0.72);
      if (!blob) throw new Error('No se pudo optimizar la fotografía.');
    }

    if (blob.size > targetBytes) {
      canvas = drawCompressedImage(image, Math.min(1000, maxDimension));
      blob = await canvasBlob(canvas, 0.64);
      if (!blob) throw new Error('No se pudo optimizar la fotografía.');
    }
    return blob;
  } catch (error) {
    if (file.size <= 5 * 1024 * 1024) return file;
    throw error;
  }
}

export async function downloadProgressPhoto(id, filename = 'my-fit-plan-progreso.jpg') {
  const blob = await getProgressPhotoBlob(id);
  if (!blob) throw new Error('No se encontró la fotografía.');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function hashPrivatePin(pin) {
  const normalized = String(pin || '').trim();
  if (!/^\d{4,8}$/.test(normalized)) throw new Error('El PIN debe tener entre 4 y 8 números.');
  if (!crypto?.subtle) return btoa(normalized);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
