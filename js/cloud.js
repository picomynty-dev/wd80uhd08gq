'use strict';

import { CLOUD_CONFIG, cloudRedirectUrl } from './cloud-config.js?v=43';

const SESSION_KEY = 'mfpCloudSessionV40';
const META_KEY = 'mfpCloudMetaV40';
const DEVICE_KEY = 'mfpCloudDeviceV40';
const SYNC_DELAY = 950;
const RECOVERY_KEY = 'mfpCloudRecoveryV401';

let hooks = {
  getState: () => null,
  replaceState: () => {},
  onStatusChange: () => {},
  onConflict: () => {},
  onRecovery: () => {}
};

let session = readJson(SESSION_KEY, null);
let meta = readJson(META_KEY, { users: {} });
let syncTimer = null;
let initialized = false;
let refreshPromise = null;
let conflictSnapshot = null;
let status = {
  enabled: CLOUD_CONFIG.enabled,
  auth: session ? 'loading' : 'guest',
  sync: session ? 'idle' : 'guest',
  user: session?.user || null,
  entitlement: session?.user?.id ? (meta.users?.[session.user.id]?.entitlement || null) : null,
  lastSyncAt: null,
  lastError: '',
  recovery: false,
  pendingEmail: '',
  conflict: false,
  photoSync: session ? 'idle' : 'guest',
  photoPending: 0,
  photoError: ''
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeLocal(key) {
  try { localStorage.removeItem(key); } catch {}
}

function randomId(prefix = 'device') {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function deviceId() {
  try {
    const current = localStorage.getItem(DEVICE_KEY);
    if (current) return current;
    const next = randomId();
    localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    return randomId('ephemeral');
  }
}

function userMeta(userId) {
  meta.users ||= {};
  meta.users[userId] ||= {
    lastRevision: 0,
    lastSyncedHash: '',
    lastSyncAt: null,
    initialized: false,
    preferredSource: 'cloud'
  };
  const record = meta.users[userId];
  if (record.lastSyncedHash || Number(record.lastRevision || 0) > 0) record.initialized = true;
  if (!record.preferredSource) record.preferredSource = 'cloud';
  record.photos ||= { synced: {}, pendingDeletes: [] };
  record.photos.synced ||= {};
  record.photos.pendingDeletes ||= [];
  return record;
}

function recoveryStore() {
  return readJson(RECOVERY_KEY, { users: {} });
}

function saveRecoverySnapshot(localState, reason = 'cloud-download') {
  const userId = session?.user?.id;
  if (!userId || !meaningfulState(localState)) return false;
  const store = recoveryStore();
  store.users ||= {};
  store.users[userId] = {
    payload: cloudPayload(localState),
    reason,
    createdAt: new Date().toISOString()
  };
  return writeJson(RECOVERY_KEY, store);
}

function hasRecoverySnapshot() {
  const userId = session?.user?.id;
  if (!userId) return false;
  return Boolean(recoveryStore()?.users?.[userId]?.payload);
}

function saveMeta() {
  writeJson(META_KEY, meta);
}

function emit(patch = {}) {
  status = { ...status, ...patch };
  try { hooks.onStatusChange({ ...status }); } catch (error) { console.warn('Cloud status hook:', error); }
}

function asErrorMessage(error) {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;
  return error.message || error.msg || error.error_description || error.error || 'Error desconocido';
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return { message: text }; }
}

async function rawRequest(path, { method = 'GET', body = null, token = null, headers = {}, retryAuth = true } = {}) {
  const finalHeaders = {
    apikey: CLOUD_CONFIG.publishableKey,
    ...headers
  };
  if (body !== null && !finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${CLOUD_CONFIG.url}${path}`, {
      method,
      headers: finalHeaders,
      body: body === null ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    const networkError = new Error('No se pudo conectar con My Fit Plan Cloud.');
    networkError.cause = error;
    throw networkError;
  }

  if (response.status === 401 && token && retryAuth && session?.refresh_token) {
    await refreshSession();
    return rawRequest(path, { method, body, token: session?.access_token, headers, retryAuth: false });
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(asErrorMessage(data) || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function storageRequest(path, {
  method = 'GET',
  body = null,
  contentType = '',
  retryAuth = true
} = {}) {
  await ensureSession();
  if (!session?.access_token) throw new Error('Debes iniciar sesión.');

  const headers = {
    apikey: CLOUD_CONFIG.publishableKey,
    Authorization: `Bearer ${session.access_token}`
  };
  if (contentType) headers['Content-Type'] = contentType;

  let response;
  try {
    response = await fetch(`${CLOUD_CONFIG.url}${path}`, { method, headers, body });
  } catch (error) {
    const networkError = new Error('No se pudo conectar con el almacenamiento privado.');
    networkError.cause = error;
    throw networkError;
  }

  if (response.status === 401 && retryAuth && session?.refresh_token) {
    await refreshSession();
    return storageRequest(path, { method, body, contentType, retryAuth: false });
  }
  return response;
}

function photoObjectName(photoId) {
  const userId = session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión.');
  const safeId = String(photoId || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!safeId) throw new Error('Identificador de fotografía no válido.');
  return `${userId}/${safeId}`;
}

function photoObjectUrl(photoId) {
  const path = photoObjectName(photoId).split('/').map(encodeURIComponent).join('/');
  return `/storage/v1/object/${encodeURIComponent(CLOUD_CONFIG.photoBucket)}/${path}`;
}

function referencedPhotoIds(value = hooks.getState()) {
  return [...new Set((value?.bodyProgress || [])
    .flatMap((entry) => Object.values(entry?.photos || {}))
    .filter(Boolean)
    .map(String))];
}

function photoMeta() {
  const userId = session?.user?.id;
  return userId ? userMeta(userId).photos : { synced: {}, pendingDeletes: [] };
}

function markPhotoSynced(photoId, blob = null) {
  const photos = photoMeta();
  photos.synced[photoId] = {
    syncedAt: new Date().toISOString(),
    size: Number(blob?.size || 0),
    type: String(blob?.type || '')
  };
  photos.pendingDeletes = photos.pendingDeletes.filter((id) => id !== photoId);
  saveMeta();
}

function markPhotoUnsynced(photoId) {
  const photos = photoMeta();
  delete photos.synced[photoId];
  saveMeta();
}

function queuePhotoDeletes(ids = []) {
  const photos = photoMeta();
  const next = new Set(photos.pendingDeletes || []);
  ids.filter(Boolean).forEach((id) => {
    const value = String(id);
    next.add(value);
    delete photos.synced[value];
  });
  photos.pendingDeletes = [...next];
  saveMeta();
}

async function flushPhotoDeletes() {
  if (!session?.user?.id || !navigator.onLine) {
    return { deleted: 0, pending: photoMeta().pendingDeletes.length };
  }

  const photos = photoMeta();
  const ids = [...new Set(photos.pendingDeletes || [])];
  if (!ids.length) return { deleted: 0, pending: 0 };

  const prefixes = ids.map(photoObjectName);
  const response = await storageRequest(`/storage/v1/object/${encodeURIComponent(CLOUD_CONFIG.photoBucket)}`, {
    method: 'DELETE',
    body: JSON.stringify({ prefixes }),
    contentType: 'application/json'
  });

  if (!response.ok && response.status !== 404) {
    const data = await parseResponse(response);
    throw new Error(asErrorMessage(data) || `No se pudieron borrar las fotografías (${response.status}).`);
  }

  photos.pendingDeletes = photos.pendingDeletes.filter((id) => !ids.includes(id));
  ids.forEach((id) => delete photos.synced[id]);
  saveMeta();
  return { deleted: ids.length, pending: photos.pendingDeletes.length };
}

function saveSession(data) {
  if (!data?.access_token) return null;
  const expiresIn = Number(data.expires_in || 3600);
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || session?.refresh_token || '',
    token_type: data.token_type || 'bearer',
    expires_at: Date.now() + Math.max(60, expiresIn) * 1000,
    user: data.user || session?.user || null
  };
  writeJson(SESSION_KEY, session);
  return session;
}

function clearSession() {
  session = null;
  removeLocal(SESSION_KEY);
  conflictSnapshot = null;
  clearTimeout(syncTimer);
  syncTimer = null;
  emit({ auth: 'guest', sync: 'guest', user: null, entitlement: null, conflict: false, recovery: false, lastError: '', photoSync: 'guest', photoPending: 0, photoError: '' });
}

function sessionExpiring() {
  return !session?.access_token || Number(session.expires_at || 0) < Date.now() + 90_000;
}

async function refreshSession() {
  if (!session?.refresh_token) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const data = await rawRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: session.refresh_token },
        retryAuth: false
      });
      saveSession(data);
      emit({ auth: 'authenticated', user: session.user, lastError: '' });
      return session;
    } catch (error) {
      clearSession();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function ensureSession() {
  if (!session) return null;
  if (sessionExpiring()) await refreshSession();
  return session;
}

function stripAuthParams() {
  try {
    const url = new URL(window.location.href);
    url.hash = '';
    ['code', 'error', 'error_code', 'error_description', 'type'].forEach((key) => url.searchParams.delete(key));
    history.replaceState(history.state, '', `${url.pathname}${url.search}`);
  } catch {}
}

function authCallbackParams() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const get = (key) => hash.get(key) || query.get(key);
  return {
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    expiresIn: get('expires_in'),
    tokenType: get('token_type'),
    type: get('type'),
    error: get('error_description') || get('error')
  };
}

async function consumeAuthCallback() {
  const params = authCallbackParams();
  if (params.error) {
    stripAuthParams();
    emit({ lastError: params.error });
    return false;
  }
  if (!params.accessToken) return false;

  saveSession({
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
    expires_in: Number(params.expiresIn || 3600),
    token_type: params.tokenType || 'bearer'
  });
  stripAuthParams();
  const user = await fetchCurrentUser();
  if (params.type === 'recovery') {
    emit({ recovery: true });
    try { hooks.onRecovery(); } catch {}
  }
  return Boolean(user);
}

async function fetchCurrentUser() {
  await ensureSession();
  if (!session?.access_token) return null;
  const user = await rawRequest('/auth/v1/user', { token: session.access_token });
  session.user = user;
  writeJson(SESSION_KEY, session);
  emit({ auth: 'authenticated', user, lastError: '' });
  return user;
}

function stateHash(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function meaningfulState(value) {
  if (!value || typeof value !== 'object') return false;
  return Boolean(
    value.profile
    || value.onboardingCompleted
    || value.plan
    || value.history?.length
    || value.routineFolders?.length
    || value.customExercises?.length
    || value.weightHistory?.length
    || value.bodyProgress?.length
  );
}

function stateSummary(value) {
  return {
    profile: value?.profile?.name || '',
    sessions: Array.isArray(value?.history) ? value.history.length : 0,
    routines: Array.isArray(value?.routineFolders)
      ? value.routineFolders.reduce((sum, folder) => sum + (folder.routines?.length || 0), 0)
      : (value?.plan ? 1 : 0),
    bodyEntries: Array.isArray(value?.bodyProgress) ? value.bodyProgress.length : 0,
    updatedAt: value?.updatedAt || null
  };
}

function cloudPayload(localState) {
  const copy = JSON.parse(JSON.stringify(localState || {}));
  copy.schemaVersion = CLOUD_CONFIG.schemaVersion;
  copy.appVersion = CLOUD_CONFIG.appVersion;
  return copy;
}

async function fetchRemoteState() {
  await ensureSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const query = new URLSearchParams({
    select: 'payload,schema_version,app_version,revision,device_id,client_updated_at,created_at,updated_at',
    user_id: `eq.${userId}`,
    limit: '1'
  });
  const rows = await rawRequest(`/rest/v1/${CLOUD_CONFIG.stateTable}?${query.toString()}`, {
    token: session.access_token,
    headers: { Accept: 'application/json' }
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function createRemoteState(localState) {
  const userId = session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión.');
  const payload = cloudPayload(localState);
  const rows = await rawRequest(`/rest/v1/${CLOUD_CONFIG.stateTable}`, {
    method: 'POST',
    token: session.access_token,
    headers: { Prefer: 'return=representation' },
    body: {
      user_id: userId,
      payload,
      schema_version: CLOUD_CONFIG.schemaVersion,
      app_version: CLOUD_CONFIG.appVersion,
      revision: 1,
      device_id: deviceId(),
      client_updated_at: payload.updatedAt || new Date().toISOString()
    }
  });
  const remote = Array.isArray(rows) ? rows[0] : rows;
  markSynced(payload, Number(remote?.revision || 1));
  return remote;
}

async function updateRemoteState(localState, expectedRevision, { force = false } = {}) {
  const userId = session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión.');
  const payload = cloudPayload(localState);
  const currentRevision = Math.max(0, Number(expectedRevision || 0));
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: 'payload,revision,updated_at'
  });
  if (!force) params.set('revision', `eq.${currentRevision}`);

  const nextRevision = currentRevision + 1;
  const rows = await rawRequest(`/rest/v1/${CLOUD_CONFIG.stateTable}?${params.toString()}`, {
    method: 'PATCH',
    token: session.access_token,
    headers: { Prefer: 'return=representation' },
    body: {
      payload,
      schema_version: CLOUD_CONFIG.schemaVersion,
      app_version: CLOUD_CONFIG.appVersion,
      revision: nextRevision,
      device_id: deviceId(),
      client_updated_at: payload.updatedAt || new Date().toISOString()
    }
  });
  if (!force && Array.isArray(rows) && rows.length === 0) return null;
  const remote = Array.isArray(rows) ? rows[0] : rows;
  markSynced(payload, Number(remote?.revision || nextRevision));
  return remote;
}

function markSynced(payload, revision) {
  const userId = session?.user?.id;
  if (!userId) return;
  const record = userMeta(userId);
  record.lastRevision = Math.max(0, Number(revision || 0));
  record.lastSyncedHash = stateHash(payload);
  record.lastSyncAt = new Date().toISOString();
  record.initialized = true;
  record.preferredSource = record.preferredSource || 'cloud';
  saveMeta();
  conflictSnapshot = null;
  emit({ sync: 'synced', lastSyncAt: record.lastSyncAt, conflict: false, lastError: '' });
}

async function pullRemote(remote) {
  if (!remote?.payload) return null;
  hooks.replaceState(remote.payload, { source: 'cloud', revision: remote.revision });
  const normalizedLocal = cloudPayload(hooks.getState());
  if (stateHash(normalizedLocal) !== stateHash(remote.payload)) {
    const updated = await updateRemoteState(normalizedLocal, Number(remote.revision || 0));
    if (updated) return hooks.getState();
  }
  markSynced(normalizedLocal, Number(remote.revision || 0));
  return hooks.getState();
}

function normalizeEntitlement(row = null) {
  const source = row && typeof row === 'object' ? row : { plan: 'free', source: 'system' };
  const rawCandidate = source.raw_plan || source.plan;
  const rawPlan = ['free', 'premium', 'founder'].includes(String(rawCandidate || '').toLowerCase())
    ? String(rawCandidate).toLowerCase()
    : 'free';
  const expiresAt = source.premium_expires_at || null;
  const expired = rawPlan === 'premium'
    && Boolean(expiresAt)
    && Number.isFinite(Date.parse(expiresAt))
    && Date.parse(expiresAt) <= Date.now();
  return {
    ...source,
    raw_plan: rawPlan,
    plan: expired ? 'free' : rawPlan,
    expired,
    premium_expires_at: expiresAt
  };
}

function cachedEntitlement() {
  const userId = session?.user?.id;
  if (!userId) return normalizeEntitlement();
  return normalizeEntitlement(meta.users?.[userId]?.entitlement || null);
}

function cacheEntitlement(value) {
  const userId = session?.user?.id;
  if (!userId) return;
  const record = userMeta(userId);
  record.entitlement = normalizeEntitlement(value);
  record.entitlementFetchedAt = new Date().toISOString();
  saveMeta();
}

async function fetchEntitlement() {
  await ensureSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const query = new URLSearchParams({
    select: 'plan,source,premium_expires_at,updated_at',
    user_id: `eq.${userId}`,
    limit: '1'
  });
  const rows = await rawRequest(`/rest/v1/${CLOUD_CONFIG.entitlementTable}?${query.toString()}`, {
    token: session.access_token
  });
  const entitlement = normalizeEntitlement(Array.isArray(rows) ? rows[0] : null);
  cacheEntitlement(entitlement);
  emit({ entitlement });
  return entitlement;
}

async function fetchProfile() {
  await ensureSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const query = new URLSearchParams({
    select: 'display_name,created_at,updated_at',
    user_id: `eq.${userId}`,
    limit: '1'
  });
  const rows = await rawRequest(`/rest/v1/${CLOUD_CONFIG.profileTable}?${query.toString()}`, {
    token: session.access_token
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function reconcile({ reason = 'manual', silent = false } = {}) {
  if (!CLOUD_CONFIG.enabled) return { status: 'disabled' };
  if (!navigator.onLine) {
    emit({ sync: session ? 'offline' : 'guest' });
    return { status: 'offline' };
  }
  await ensureSession();
  if (!session?.user?.id) return { status: 'guest' };

  if (!silent) emit({ sync: 'syncing', lastError: '' });

  try {
    const local = hooks.getState();
    const localPayload = cloudPayload(local);
    const localHash = stateHash(localPayload);
    const localHasData = meaningfulState(localPayload);
    let remote = await fetchRemoteState();
    const record = userMeta(session.user.id);

    if (!remote) {
      await createRemoteState(localPayload);
      return { status: 'uploaded', reason };
    }

    let remotePayload = remote.payload || {};
    let remoteHash = stateHash(remotePayload);
    let remoteHasData = meaningfulState(remotePayload);
    let remoteRevision = Math.max(0, Number(remote.revision || 0));
    let knownRevision = Math.max(0, Number(record.lastRevision || 0));

    // Primer enlace de este dispositivo: la nube es la referencia principal.
    // Antes de sustituir datos locales distintos guardamos una copia de recuperación.
    if (!record.initialized && !record.lastSyncedHash) {
      if (remoteHasData) {
        if (localHasData && localHash !== remoteHash) {
          saveRecoverySnapshot(localPayload, 'first-device-link');
        }
        await pullRemote(remote);
        return { status: 'downloaded', reason, autoResolved: 'cloud' };
      }

      if (localHasData) {
        const updated = await updateRemoteState(localPayload, remoteRevision);
        if (updated) return { status: 'uploaded', reason };
      }

      markSynced(localPayload, remoteRevision);
      return { status: 'synced', reason };
    }

    if (localHash === remoteHash) {
      markSynced(localPayload, remoteRevision);
      return { status: 'synced', reason };
    }

    const localChanged = localHash !== record.lastSyncedHash;
    const remoteAdvanced = remoteRevision > knownRevision;

    // Nadie ha cambiado la nube desde nuestra última revisión:
    // cualquier modificación local se puede subir sin preguntar.
    if (localChanged && !remoteAdvanced && remoteRevision === knownRevision) {
      const updated = await updateRemoteState(localPayload, knownRevision);
      if (updated) return { status: 'uploaded', reason };

      // Hubo una carrera entre el GET y el PATCH: releer antes de declarar conflicto.
      remote = await fetchRemoteState();
      if (!remote) {
        await createRemoteState(localPayload);
        return { status: 'uploaded', reason };
      }
      remotePayload = remote.payload || {};
      remoteHash = stateHash(remotePayload);
      remoteRevision = Math.max(0, Number(remote.revision || 0));
      if (localHash === remoteHash) {
        markSynced(localPayload, remoteRevision);
        return { status: 'synced', reason };
      }
    }

    // Solo cambió la nube: descargar automáticamente.
    if (!localChanged && remoteAdvanced) {
      await pullRemote(remote);
      return { status: 'downloaded', reason };
    }

    // Mismo número de revisión pero payload distinto y sin cambios locales:
    // se considera la nube autoritativa y se normaliza silenciosamente.
    if (!localChanged && !remoteAdvanced) {
      await pullRemote(remote);
      return { status: 'downloaded', reason };
    }

    // Ambos lados cambiaron desde el último punto común: conflicto REAL.
    if (localChanged && remoteAdvanced) {
      conflictSnapshot = {
        local: localPayload,
        remote,
        localSummary: stateSummary(localPayload),
        remoteSummary: stateSummary(remotePayload)
      };
      emit({ sync: 'conflict', conflict: true, lastError: '' });
      hooks.onConflict({ ...conflictSnapshot });
      return { status: 'conflict', reason, ...conflictSnapshot };
    }

    // Fallback seguro: la nube es principal, conservando una copia local.
    if (localHasData && localHash !== remoteHash) saveRecoverySnapshot(localPayload, 'fallback-cloud');
    await pullRemote(remote);
    return { status: 'downloaded', reason, autoResolved: 'cloud' };
  } catch (error) {
    emit({ sync: 'error', lastError: asErrorMessage(error) });
    if (!silent) throw error;
    return { status: 'error', error };
  }
}

export function getCloudStatus() {
  return { ...status };
}

export async function initCloud(nextHooks = {}) {
  hooks = { ...hooks, ...nextHooks };
  if (initialized) return getCloudStatus();
  initialized = true;

  if (!CLOUD_CONFIG.enabled) {
    emit({ auth: 'guest', sync: 'disabled' });
    return getCloudStatus();
  }

  try {
    await consumeAuthCallback();
    if (!session) {
      emit({ auth: 'guest', sync: 'guest' });
      return getCloudStatus();
    }
    if (!navigator.onLine) {
      emit({
        auth: 'authenticated',
        sync: 'offline',
        user: session.user || status.user,
        entitlement: cachedEntitlement(),
        lastError: ''
      });
      return getCloudStatus();
    }
    const user = await fetchCurrentUser();
    if (!user) return getCloudStatus();
    await Promise.allSettled([fetchEntitlement(), fetchProfile()]);
    await reconcile({ reason: 'startup', silent: true });
    return getCloudStatus();
  } catch (error) {
    emit({ auth: session ? 'error' : 'guest', sync: session ? 'error' : 'guest', lastError: asErrorMessage(error) });
    return getCloudStatus();
  }
}

export async function cloudSignUp({ displayName = '', email = '', password = '' }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Escribe tu correo electrónico.');
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');

  emit({ auth: 'loading', lastError: '', pendingEmail: cleanEmail });
  try {
    const redirect = encodeURIComponent(cloudRedirectUrl());
    const data = await rawRequest(`/auth/v1/signup?redirect_to=${redirect}`, {
      method: 'POST',
      body: {
        email: cleanEmail,
        password,
        data: { display_name: String(displayName || '').trim() }
      }
    });
    if (data?.access_token) {
      saveSession(data);
      await fetchCurrentUser();
      await Promise.allSettled([fetchEntitlement(), fetchProfile()]);
      await reconcile({ reason: 'signup' });
      return { signedIn: true, needsConfirmation: false, user: session.user };
    }
    emit({ auth: 'guest', sync: 'guest', pendingEmail: cleanEmail });
    return { signedIn: false, needsConfirmation: true, user: data?.user || null };
  } catch (error) {
    emit({ auth: session ? 'authenticated' : 'guest', lastError: asErrorMessage(error) });
    throw error;
  }
}

export async function cloudSignIn({ email = '', password = '' }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error('Escribe correo y contraseña.');
  emit({ auth: 'loading', sync: 'idle', lastError: '' });
  try {
    const data = await rawRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: cleanEmail, password }
    });
    saveSession(data);
    await fetchCurrentUser();
    await Promise.allSettled([fetchEntitlement(), fetchProfile()]);
    await reconcile({ reason: 'signin' });
    return session.user;
  } catch (error) {
    clearSession();
    emit({ lastError: asErrorMessage(error) });
    throw error;
  }
}

export async function cloudSignOut() {
  if (session?.access_token) {
    try {
      await rawRequest('/auth/v1/logout?scope=local', {
        method: 'POST',
        token: session.access_token
      });
    } catch {}
  }
  clearSession();
  return true;
}

export async function cloudSendPasswordReset(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Escribe tu correo electrónico.');
  const redirect = encodeURIComponent(cloudRedirectUrl());
  await rawRequest(`/auth/v1/recover?redirect_to=${redirect}`, {
    method: 'POST',
    body: { email: cleanEmail }
  });
  return true;
}

export async function cloudUpdatePassword(password) {
  if (String(password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  await ensureSession();
  if (!session?.access_token) throw new Error('El enlace de recuperación ya no es válido.');
  await rawRequest('/auth/v1/user', {
    method: 'PUT',
    token: session.access_token,
    body: { password }
  });
  emit({ recovery: false, lastError: '' });
  return true;
}


export async function cloudUploadProgressPhoto(photoId, blob) {
  if (!photoId || !(blob instanceof Blob)) throw new Error('Fotografía no válida.');
  if (!session?.user?.id) return { status: 'guest' };
  if (!navigator.onLine) {
    markPhotoUnsynced(String(photoId));
    return { status: 'offline' };
  }
  if (blob.size > 5 * 1024 * 1024) {
    markPhotoUnsynced(String(photoId));
    throw new Error('La fotografía supera el límite cloud de 5 MB.');
  }

  let response = await storageRequest(photoObjectUrl(photoId), {
    method: 'POST',
    body: blob,
    contentType: blob.type || 'image/jpeg'
  });

  if (response.status === 409) {
    response = await storageRequest(photoObjectUrl(photoId), {
      method: 'PUT',
      body: blob,
      contentType: blob.type || 'image/jpeg'
    });
  }

  if (!response.ok) {
    const data = await parseResponse(response);
    throw new Error(asErrorMessage(data) || `No se pudo subir la fotografía (${response.status}).`);
  }

  markPhotoSynced(String(photoId), blob);
  return { status: 'uploaded', photoId: String(photoId) };
}

export async function cloudDownloadProgressPhoto(photoId) {
  if (!photoId || !session?.user?.id || !navigator.onLine) return null;
  const response = await storageRequest(photoObjectUrl(photoId), { method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok) {
    const data = await parseResponse(response);
    throw new Error(asErrorMessage(data) || `No se pudo descargar la fotografía (${response.status}).`);
  }
  const blob = await response.blob();
  markPhotoSynced(String(photoId), blob);
  return blob;
}

export async function cloudDeleteProgressPhotos(ids = []) {
  const clean = [...new Set(ids.filter(Boolean).map(String))];
  if (!clean.length || !session?.user?.id) return { status: 'nothing', deleted: 0 };

  queuePhotoDeletes(clean);
  if (!navigator.onLine) {
    emit({ photoSync: 'offline', photoPending: photoMeta().pendingDeletes.length });
    return { status: 'queued', deleted: 0 };
  }

  try {
    const result = await flushPhotoDeletes();
    emit({ photoSync: 'synced', photoPending: result.pending, photoError: '' });
    return { status: 'deleted', ...result };
  } catch (error) {
    emit({ photoSync: 'error', photoPending: photoMeta().pendingDeletes.length, photoError: asErrorMessage(error) });
    throw error;
  }
}

export async function cloudSyncProgressPhotos(photoIds = [], {
  getLocalBlob = async () => null,
  saveLocalBlob = async () => {}
} = {}) {
  const ids = [...new Set((photoIds || []).filter(Boolean).map(String))];
  if (!session?.user?.id) return { status: 'guest', total: ids.length, uploaded: 0, downloaded: 0, failed: 0 };
  if (!navigator.onLine) {
    emit({
      photoSync: 'offline',
      photoPending: ids.filter((id) => !photoMeta().synced[id]).length + photoMeta().pendingDeletes.length
    });
    return { status: 'offline', total: ids.length, uploaded: 0, downloaded: 0, failed: 0 };
  }

  emit({ photoSync: 'syncing', photoError: '' });
  let uploaded = 0;
  let downloaded = 0;
  let failed = 0;
  const failures = [];

  try {
    await flushPhotoDeletes();
  } catch (error) {
    failed += 1;
    failures.push({ type: 'delete', error: asErrorMessage(error) });
  }

  for (const photoId of ids) {
    try {
      let localBlob = null;
      try { localBlob = await getLocalBlob(photoId); } catch {}

      if (localBlob) {
        if (!photoMeta().synced[photoId]) {
          await cloudUploadProgressPhoto(photoId, localBlob);
          uploaded += 1;
        }
        continue;
      }

      const remoteBlob = await cloudDownloadProgressPhoto(photoId);
      if (remoteBlob) {
        await saveLocalBlob(photoId, remoteBlob);
        downloaded += 1;
      } else {
        failed += 1;
        failures.push({ photoId, type: 'missing-cloud' });
      }
    } catch (error) {
      failed += 1;
      failures.push({ photoId, type: 'sync', error: asErrorMessage(error) });
      markPhotoUnsynced(photoId);
    }
  }

  const pending = ids.filter((id) => !photoMeta().synced[id]).length + photoMeta().pendingDeletes.length;
  emit({
    photoSync: failed ? 'warning' : 'synced',
    photoPending: pending,
    photoError: failures[0]?.error || (failures.length ? 'Hay fotografías pendientes de sincronizar.' : '')
  });

  return {
    status: failed ? 'partial' : 'synced',
    total: ids.length,
    uploaded,
    downloaded,
    failed,
    pending,
    failures
  };
}

export function cloudProgressPhotoSummary(photoIds = referencedPhotoIds()) {
  const ids = [...new Set((photoIds || []).filter(Boolean).map(String))];
  const photos = session?.user?.id ? photoMeta() : { synced: {}, pendingDeletes: [] };
  const synced = ids.filter((id) => photos.synced[id]).length;
  return {
    signedIn: Boolean(session?.user?.id),
    total: ids.length,
    synced,
    pending: Math.max(0, ids.length - synced) + (photos.pendingDeletes?.length || 0),
    pendingDeletes: photos.pendingDeletes?.length || 0,
    status: status.photoSync || (session ? 'idle' : 'guest'),
    lastError: status.photoError || ''
  };
}

export async function cloudDeleteAccount() {
  await ensureSession();
  if (!session?.access_token) throw new Error('Debes iniciar sesión.');

  const photoIds = referencedPhotoIds();
  if (photoIds.length) {
    queuePhotoDeletes(photoIds);
    await flushPhotoDeletes();
  }

  await rawRequest('/rest/v1/rpc/delete_my_account', {
    method: 'POST',
    token: session.access_token,
    body: {}
  });
  const userId = session?.user?.id;
  if (userId && meta.users) delete meta.users[userId];
  saveMeta();
  clearSession();
  return true;
}

export function notifyCloudStateChanged(localState) {
  if (!session?.user?.id) return;
  const payload = cloudPayload(localState);
  const record = userMeta(session.user.id);
  if (stateHash(payload) === record.lastSyncedHash) return;
  emit({ sync: navigator.onLine ? 'dirty' : 'offline' });
  clearTimeout(syncTimer);
  if (!navigator.onLine) return;
  syncTimer = setTimeout(() => {
    reconcile({ reason: 'local-change', silent: true }).catch(() => {});
  }, SYNC_DELAY);
}

export async function cloudSyncNow(options = {}) {
  clearTimeout(syncTimer);
  syncTimer = null;
  if (session?.user?.id && navigator.onLine) await Promise.allSettled([fetchEntitlement()]);
  return reconcile({ reason: 'manual', ...options });
}

export async function cloudDownloadNow() {
  clearTimeout(syncTimer);
  syncTimer = null;
  if (!navigator.onLine) return { status: 'offline' };
  await ensureSession();
  if (!session?.user?.id) throw new Error('Debes iniciar sesión.');

  emit({ sync: 'syncing', lastError: '' });
  const remote = await fetchRemoteState();
  if (!remote?.payload) throw new Error('No hay una copia disponible en My Fit Plan Cloud.');

  const localPayload = cloudPayload(hooks.getState());
  if (stateHash(localPayload) !== stateHash(remote.payload)) {
    saveRecoverySnapshot(localPayload, 'manual-cloud-download');
  }

  await pullRemote(remote);
  return { status: 'downloaded' };
}

export async function cloudUploadNow() {
  clearTimeout(syncTimer);
  syncTimer = null;
  if (!navigator.onLine) return { status: 'offline' };
  await ensureSession();
  if (!session?.user?.id) throw new Error('Debes iniciar sesión.');

  emit({ sync: 'syncing', lastError: '' });
  const localPayload = cloudPayload(hooks.getState());
  const remote = await fetchRemoteState();

  if (!remote) {
    await createRemoteState(localPayload);
    return { status: 'uploaded' };
  }

  await updateRemoteState(localPayload, Number(remote.revision || 0), { force: true });
  return { status: 'uploaded' };
}

export async function cloudResolveConflict(strategy) {
  if (!conflictSnapshot) {
    const result = await reconcile({ reason: 'resolve' });
    if (result.status !== 'conflict') return result;
  }
  const snapshot = conflictSnapshot;
  if (!snapshot) return { status: 'synced' };

  if (strategy === 'cloud') {
    await pullRemote(snapshot.remote);
    return { status: 'downloaded' };
  }

  if (strategy === 'local') {
    const latest = await fetchRemoteState();
    if (!latest) {
      await createRemoteState(snapshot.local);
      return { status: 'uploaded' };
    }
    await updateRemoteState(snapshot.local, latest.revision, { force: true });
    return { status: 'uploaded' };
  }

  throw new Error('Estrategia de conflicto no reconocida.');
}

export async function cloudInvokeUserFunction(functionName, body = {}, { retryAuth = true } = {}) {
  await ensureSession();
  if (!session?.access_token) throw new Error('Debes iniciar sesión.');

  const safeName = String(functionName || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeName) throw new Error('Función cloud no válida.');

  let response;
  try {
    response = await fetch(`${CLOUD_CONFIG.url}/functions/v1/${safeName}`, {
      method: 'POST',
      headers: {
        apikey: CLOUD_CONFIG.publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body || {})
    });
  } catch (error) {
    const networkError = new Error('No se pudo conectar con My Fit Plan Cloud.');
    networkError.cause = error;
    throw networkError;
  }

  if (response.status === 401 && retryAuth && session?.refresh_token) {
    await refreshSession();
    return cloudInvokeUserFunction(functionName, body, { retryAuth: false });
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(asErrorMessage(data) || `La función cloud devolvió ${response.status}.`);
  }
  return data;
}

export async function cloudRefreshAccount() {
  if (!session) return getCloudStatus();
  await fetchCurrentUser();
  await Promise.allSettled([fetchEntitlement(), fetchProfile()]);
  return getCloudStatus();
}

export function cloudAccountSummary() {
  const user = status.user;
  return {
    signedIn: status.auth === 'authenticated',
    email: user?.email || '',
    userId: user?.id || '',
    plan: normalizeEntitlement(status.entitlement || cachedEntitlement()).plan,
    rawPlan: normalizeEntitlement(status.entitlement || cachedEntitlement()).raw_plan,
    planExpired: Boolean(normalizeEntitlement(status.entitlement || cachedEntitlement()).expired),
    premiumExpiresAt: normalizeEntitlement(status.entitlement || cachedEntitlement()).premium_expires_at || null,
    planSource: normalizeEntitlement(status.entitlement || cachedEntitlement()).source || 'system',
    sync: status.sync,
    lastSyncAt: status.lastSyncAt,
    lastError: status.lastError,
    recovery: status.recovery,
    pendingEmail: status.pendingEmail,
    conflict: status.conflict,
    syncMode: 'automatic-cloud',
    lastRevision: user?.id ? Number(userMeta(user.id).lastRevision || 0) : 0,
    initialized: user?.id ? Boolean(userMeta(user.id).initialized) : false,
    recoveryAvailable: hasRecoverySnapshot(),
    photos: cloudProgressPhotoSummary()
  };
}
