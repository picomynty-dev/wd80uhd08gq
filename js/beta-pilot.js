'use strict';

import { APP_VERSION } from './storage.js?v=47';
import { cloudAccountSummary } from './cloud.js?v=47';

const PILOT_STORAGE_KEY = 'mfpBetaPilotV46';

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function store() {
  return safeParse(localStorage.getItem(PILOT_STORAGE_KEY), { users: {} });
}

function saveStore(value) {
  localStorage.setItem(PILOT_STORAGE_KEY, JSON.stringify(value));
}

function userId() {
  return String(cloudAccountSummary().userId || '');
}

function userRecord(create = true) {
  const id = userId();
  if (!id) return null;
  const data = store();
  if (!data.users[id] && create) {
    data.users[id] = {
      startedAt: new Date().toISOString(),
      welcomeSeen: false,
      feedbackCount: 0,
      guideOpened: 0,
      lastFeedbackAt: null
    };
    saveStore(data);
  }
  return data.users[id] || null;
}

function mutateUser(mutator) {
  const id = userId();
  if (!id) return null;
  const data = store();
  const current = data.users[id] || {
    startedAt: new Date().toISOString(),
    welcomeSeen: false,
    feedbackCount: 0,
    guideOpened: 0,
    lastFeedbackAt: null
  };
  const next = mutator({ ...current }) || current;
  data.users[id] = next;
  saveStore(data);
  return next;
}

function numericVersion(value) {
  const match = String(value || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] || 0)] : [0, 0, 0];
}

export function comparePilotVersion(a, b) {
  const av = numericVersion(a);
  const bv = numericVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (av[i] !== bv[i]) return av[i] > bv[i] ? 1 : -1;
  }
  return 0;
}

export async function fetchBetaPilotConfig({ timeoutMs = 4500 } = {}) {
  if (navigator.onLine === false) {
    return {
      status: 'offline',
      config: null
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`./beta-config.json?ts=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    return {
      status: 'ok',
      config: {
        pilotOpen: Boolean(config?.pilotOpen),
        cohort: String(config?.cohort || 'Beta Pilot'),
        title: String(config?.title || 'Beta Pilot'),
        message: String(config?.message || ''),
        feedbackEnabled: config?.feedbackEnabled !== false,
        maintenance: Boolean(config?.maintenance),
        maintenanceMessage: String(config?.maintenanceMessage || ''),
        minimumVersion: String(config?.minimumVersion || ''),
        externalDistributionAllowed: Boolean(config?.externalDistributionAllowed),
        updatedAt: config?.updatedAt || null
      }
    };
  } catch (error) {
    return {
      status: 'error',
      config: null,
      error: String(error?.message || error || 'No se pudo consultar Beta Pilot.')
    };
  } finally {
    clearTimeout(timer);
  }
}

export function betaPilotUserState() {
  return userRecord(false);
}

export function ensureBetaPilotUser() {
  return userRecord(true);
}

export function markBetaPilotWelcomeSeen() {
  return mutateUser((record) => ({
    ...record,
    welcomeSeen: true
  }));
}

export function markBetaPilotGuideOpened() {
  return mutateUser((record) => ({
    ...record,
    guideOpened: Number(record.guideOpened || 0) + 1
  }));
}

export function markBetaPilotFeedbackSent() {
  return mutateUser((record) => ({
    ...record,
    feedbackCount: Number(record.feedbackCount || 0) + 1,
    lastFeedbackAt: new Date().toISOString()
  }));
}

export function betaPilotChecklist(appState) {
  const account = cloudAccountSummary();
  const record = userRecord(false);
  const startedAt = record?.startedAt ? Date.parse(record.startedAt) : 0;

  const pilotSessions = (appState?.history || []).filter((session) => {
    const finished = Date.parse(session?.finishedAt || session?.startedAt || 0);
    return startedAt ? finished >= startedAt : false;
  }).length;

  const steps = [
    {
      id: 'account',
      label: 'Cuenta conectada',
      detail: 'Tu prueba está vinculada a My Fit Plan Cloud.',
      done: Boolean(account.signedIn)
    },
    {
      id: 'profile',
      label: 'Perfil preparado',
      detail: 'Objetivo, disponibilidad y datos básicos configurados.',
      done: Boolean(appState?.profile && appState?.onboardingCompleted)
    },
    {
      id: 'workout',
      label: 'Completa un entrenamiento',
      detail: 'Haz al menos una sesión desde que empezaste el piloto.',
      done: pilotSessions > 0
    },
    {
      id: 'feedback',
      label: 'Cuéntanos tu experiencia',
      detail: 'Envía al menos un feedback desde la propia aplicación.',
      done: Number(record?.feedbackCount || 0) > 0
    }
  ];

  const completed = steps.filter((step) => step.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    percentage: Math.round((completed / steps.length) * 100),
    pilotSessions,
    feedbackCount: Number(record?.feedbackCount || 0),
    startedAt: record?.startedAt || null
  };
}

export function betaPilotNeedsWelcome(config) {
  if (!config?.pilotOpen) return false;
  const account = cloudAccountSummary();
  if (!account.signedIn) return false;
  const record = ensureBetaPilotUser();
  return !record?.welcomeSeen;
}

export function betaPilotNeedsUpdate(config) {
  const minimum = String(config?.minimumVersion || '');
  if (!minimum) return false;
  return comparePilotVersion(minimum, APP_VERSION) > 0;
}
