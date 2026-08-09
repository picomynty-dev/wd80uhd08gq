'use strict';

import { APP_VERSION } from './storage.js?v=45';
import { cloudAccountSummary, cloudInvokeUserFunction } from './cloud.js?v=45';

function numericVersion(value) {
  const match = String(value || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] || 0)] : [0,0,0];
}

function compareVersion(a, b) {
  const av = numericVersion(a);
  const bv = numericVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (av[i] !== bv[i]) return av[i] > bv[i] ? 1 : -1;
  }
  return 0;
}

export async function fetchLatestVersion({ timeoutMs = 4500 } = {}) {
  if (navigator.onLine === false) return { status: 'offline', current: APP_VERSION };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`./version.json?ts=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const latest = await response.json();
    const current = String(APP_VERSION || '');
    const latestVersion = String(latest?.version || '');
    return {
      status: 'ok',
      current,
      latest: latestVersion,
      updateAvailable: Boolean(latestVersion) && compareVersion(latestVersion, current) > 0,
      info: latest
    };
  } catch (error) {
    return {
      status: 'error',
      current: APP_VERSION,
      error: String(error?.message || error || 'No se pudo comprobar la versión.')
    };
  } finally {
    clearTimeout(timer);
  }
}

export function betaFeedbackSnapshot({ view = '', runtimeIssues = [], layout = null } = {}) {
  const account = cloudAccountSummary();
  return {
    appVersion: APP_VERSION,
    view: String(view || ''),
    online: navigator.onLine !== false,
    plan: account.plan || 'free',
    cloudSync: account.sync || 'guest',
    viewport: layout ? {
      width: Math.round(Number(layout.width || 0)),
      height: Math.round(Number(window.innerHeight || 0)),
      mode: String(layout.mode || '')
    } : null,
    runtimeIssues: (runtimeIssues || []).slice(0, 3).map((item) => ({
      context: String(item?.context || '').slice(0, 100),
      message: String(item?.message || '').slice(0, 500),
      createdAt: item?.createdAt || null
    }))
  };
}

export async function submitBetaFeedback({ kind = 'experience', message = '', diagnostics = null } = {}) {
  const cleanMessage = String(message || '').trim();
  if (cleanMessage.length < 10) throw new Error('Cuéntanos un poco más (mínimo 10 caracteres).');
  if (cleanMessage.length > 2000) throw new Error('El mensaje es demasiado largo (máximo 2000 caracteres).');
  if (!cloudAccountSummary().signedIn) throw new Error('Inicia sesión para enviar feedback de la beta.');
  if (navigator.onLine === false) throw new Error('Necesitas conexión para enviar el feedback.');

  return cloudInvokeUserFunction('beta-feedback', {
    kind: ['bug','idea','experience'].includes(kind) ? kind : 'experience',
    message: cleanMessage,
    diagnostics: diagnostics || null
  });
}
