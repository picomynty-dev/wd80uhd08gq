import { clone, isoDay, numberValue, uid } from './utils.js?v=42';
import { buildPlan, normalizePlan, trainingRules } from './plans.js?v=42';
import { normalizePlanner } from './calendar-planner.js?v=42';

export const STORAGE_KEY = 'myFitPlanStateV42';
export const LEGACY_KEYS = ['myFitPlanStateV42', 'myFitPlanStateV41', 'myFitPlanStateV402', 'myFitPlanStateV401', 'myFitPlanStateV40', 'myFitPlanStateV39', 'myFitPlanStateV381', 'myFitPlanStateV38', 'myFitPlanStateV37', 'myFitPlanStateV36', 'myFitPlanStateV35', 'myFitPlanStateV34D', 'myFitPlanStateV34C7', 'myFitPlanStateV34C6', 'myFitPlanStateV34C5', 'myFitPlanStateV34C4', 'myFitPlanStateV34C3', 'myFitPlanStateV34C2', 'myFitPlanStateV34C', 'myFitPlanStateV34B', 'myFitPlanStateV34', 'myFitPlanStateV33', 'myFitPlanStateV322', 'myFitPlanStateV32', 'myFitPlanStateV312', 'myFitPlanStateV311', 'myFitPlanStateV31', 'myFitPlanStateV30B1', 'myFitPlanStateV30A2', 'myFitPlanStateV30A1', 'myFitPlanStateV30A', 'myFitPlanStateV22', 'myFitPlanStateV21', 'myFitPlanStateV2', 'myFitPlanStateV1'];
export const APP_VERSION = '4.2 Monetization Sandbox';

export const defaultSettings = {
  accent: 'custom',
  accentHex: '#f97316',
  appearance: 'dark',
  compact: true,
  showTips: true,
  reduceMotion: false,
  restSound: true,
  restVibrate: true,
  autoStartRest: true,
  defaultRestSeconds: 75
};

export const defaultState = {
  schemaVersion: 410,
  appVersion: APP_VERSION,
  profile: null,
  onboardingCompleted: false,
  onboardingChoice: null,
  settings: clone(defaultSettings),
  plan: null,
  routineFolders: [],
  activeFolderId: null,
  activeRoutineId: null,
  nextWorkoutIndex: 0,
  planner: null,
  activeWorkout: null,
  history: [],
  customExercises: [],
  favorites: [],
  searchHistory: [],
  recommendationHistory: [],
  weightHistory: [],
  bodyProgress: [],
  photoPrivacy: {
    lockEnabled: false,
    pinHash: ''
  },
  createdAt: null,
  updatedAt: null
};

export function createEmptyState() {
  return clone(defaultState);
}

export function loadState() {
  const keys = [...new Set([STORAGE_KEY, ...LEGACY_KEYS])];
  let lastError = null;

  for (const key of keys) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      lastError = error;
      break;
    }
    if (!raw) continue;

    try {
      const migrated = normalizeState(JSON.parse(raw));
      if (key !== STORAGE_KEY) saveState(migrated);
      return migrated;
    } catch (error) {
      lastError = error;
      console.warn(`No se pudo leer ${key}; se probará una copia anterior.`, error);
    }
  }

  if (lastError) console.warn('No se pudo recuperar el progreso guardado:', lastError);
  return createEmptyState();
}

export function saveState(state) {
  const ready = normalizeState({ ...state, updatedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ready));
  return ready;
}

export function normalizeState(saved = {}) {
  const profile = saved.profile ? {
    name: '',
    age: '',
    weight: '',
    height: '',
    objective: 'muscle',
    experience: 'beginner',
    location: 'gym',
    days: 3,
    minutes: 45,
    priorities: [],
    avoidedExercises: '',
    trainingPath: 'recommended',
    setupVersion: saved.profile?.setupVersion || null,
    equipment: ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio'],
    ...saved.profile
  } : null;

  const basePlan = normalizePlan(saved.plan, profile || {});
  const normalizedFolders = normalizeRoutineFolders(saved.routineFolders, basePlan, profile || {});
  let activeRoutineId = saved.activeRoutineId || basePlan?.id || normalizedFolders[0]?.routines?.[0]?.id || null;
  let activeFolderId = normalizedFolders.some((folder) => folder.id === saved.activeFolderId) ? saved.activeFolderId : (findFolderForRoutine(normalizedFolders, activeRoutineId)?.id || normalizedFolders[0]?.id || null);
  let activeRoutine = findRoutine(normalizedFolders, activeRoutineId);

  if (basePlan) {
    const baseFolder = findFolderForRoutine(normalizedFolders, basePlan.id);
    if (baseFolder) {
      const index = baseFolder.routines.findIndex((routine) => routine.id === basePlan.id);
      baseFolder.routines[index] = clone(basePlan);
      activeRoutine = basePlan;
      activeRoutineId = basePlan.id;
      if (!activeFolderId) activeFolderId = baseFolder.id;
    } else if (normalizedFolders.length) {
      normalizedFolders[0].routines.unshift(clone(basePlan));
      activeRoutine = basePlan;
      activeRoutineId = basePlan.id;
      if (!activeFolderId) activeFolderId = normalizedFolders[0].id;
    }
  }

  if (!activeRoutine && normalizedFolders[0]?.routines?.[0]) {
    activeRoutine = normalizedFolders[0].routines[0];
    activeRoutineId = activeRoutine.id;
    activeFolderId = normalizedFolders[0].id;
  }

  const normalized = {
    ...createEmptyState(),
    ...saved,
    schemaVersion: 410,
    appVersion: APP_VERSION,
    profile,
    onboardingCompleted: Boolean(saved.onboardingCompleted || profile?.setupVersion === '3.1'),
    onboardingChoice: saved.onboardingChoice || profile?.trainingPath || null,
    settings: normalizeSettings(saved.settings || {}),
    plan: activeRoutine ? normalizePlan(activeRoutine, profile || {}) : basePlan,
    routineFolders: normalizedFolders,
    activeFolderId,
    activeRoutineId,
    history: Array.isArray(saved.history) ? saved.history.map(normalizeHistorySession).filter(Boolean) : [],
    customExercises: Array.isArray(saved.customExercises) ? saved.customExercises.map(normalizeCustomExercise) : [],
    favorites: Array.isArray(saved.favorites) ? [...new Set(saved.favorites)] : [],
    searchHistory: Array.isArray(saved.searchHistory) ? [...new Set(saved.searchHistory.map((item) => String(item).trim()).filter(Boolean))].slice(0, 8) : [],
    recommendationHistory: normalizeRecommendationHistory(saved.recommendationHistory),
    weightHistory: normalizeWeightHistory(saved.weightHistory, profile),
    bodyProgress: normalizeBodyProgress(saved.bodyProgress),
    photoPrivacy: normalizePhotoPrivacy(saved.photoPrivacy),
    nextWorkoutIndex: Number(saved.nextWorkoutIndex) || 0,
    planner: null,
    createdAt: saved.createdAt || (profile ? new Date().toISOString() : null),
    updatedAt: saved.updatedAt || new Date().toISOString()
  };

  if (profile && !normalized.plan && normalized.onboardingCompleted) normalized.plan = buildPlan(profile);
  normalized.planner = normalizePlanner(
    saved.planner,
    profile || {},
    normalized.nextWorkoutIndex,
    normalized.plan?.id || ''
  );
  normalized.activeWorkout = normalizeActiveWorkout(saved.activeWorkout, normalized.plan, profile || {});

  if (normalized.plan?.days?.length) normalized.nextWorkoutIndex %= normalized.plan.days.length;
  else normalized.nextWorkoutIndex = 0;
  return normalized;
}

function normalizeSettings(savedSettings = {}) {
  const legacyColors = {
    orange: '#f97316',
    blue: '#2563eb',
    green: '#16a34a',
    violet: '#7c3aed'
  };
  const merged = { ...clone(defaultSettings), ...savedSettings };
  const candidate = String(savedSettings.accentHex || legacyColors[savedSettings.accent] || merged.accentHex || '#f97316').trim();
  merged.accent = 'custom';
  merged.accentHex = /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : '#f97316';
  merged.appearance = ['system', 'light', 'dark'].includes(merged.appearance) ? merged.appearance : 'system';
  return merged;
}

function normalizeRoutineFolders(folders, fallbackPlan, profile) {
  if (Array.isArray(folders) && folders.length) {
    return folders.map((folder, folderIndex) => ({
      id: folder.id || uid(`folder-${folderIndex + 1}`),
      name: folder.name || `Carpeta ${folderIndex + 1}`,
      icon: folder.icon || 'folder',
      createdAt: folder.createdAt || new Date().toISOString(),
      routines: Array.isArray(folder.routines)
        ? folder.routines.map((routine) => normalizePlan(routine, profile)).filter(Boolean)
        : []
    }));
  }
  if (fallbackPlan) {
    return [{ id: uid('folder'), name: 'Mis rutinas', icon: 'folder', createdAt: new Date().toISOString(), routines: [clone(fallbackPlan)] }];
  }
  return [];
}

function findRoutine(folders, routineId) {
  for (const folder of folders || []) {
    const routine = folder.routines?.find((item) => item.id === routineId);
    if (routine) return routine;
  }
  return null;
}

function findFolderForRoutine(folders, routineId) {
  return (folders || []).find((folder) => folder.routines?.some((routine) => routine.id === routineId)) || null;
}


function normalizeRecommendationHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    id: entry.id || uid('recommendation'),
    createdAt: entry.createdAt || new Date().toISOString(),
    focusId: String(entry.focusId || ''),
    signature: String(entry.signature || ''),
    exerciseIds: Array.isArray(entry.exerciseIds)
      ? [...new Set(entry.exerciseIds.filter(Boolean))]
      : []
  })).filter((entry) => entry.exerciseIds.length).slice(0, 16);
}

function normalizeWeightHistory(history, profile) {
  const clean = Array.isArray(history)
    ? history.map((item) => ({
      id: item.id || uid('weight'),
      date: item.date || isoDay(item.createdAt || new Date()),
      weight: numberValue(item.weight)
    })).filter((item) => item.weight > 0)
    : [];
  if (!clean.length && numberValue(profile?.weight) > 0) clean.push({ id: uid('weight'), date: isoDay(new Date()), weight: numberValue(profile.weight) });
  return clean.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}


function normalizeBodyProgress(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    id: entry.id || uid('body'),
    date: entry.date || isoDay(entry.createdAt || new Date()),
    weight: numberValue(entry.weight) || '',
    measurements: {
      chest: numberValue(entry.measurements?.chest) || '',
      waist: numberValue(entry.measurements?.waist) || '',
      hips: numberValue(entry.measurements?.hips) || '',
      arm: numberValue(entry.measurements?.arm) || '',
      thigh: numberValue(entry.measurements?.thigh) || '',
      calf: numberValue(entry.measurements?.calf) || ''
    },
    photos: {
      front: entry.photos?.front || '',
      side: entry.photos?.side || '',
      back: entry.photos?.back || ''
    },
    notes: String(entry.notes || ''),
    createdAt: entry.createdAt || new Date().toISOString()
  })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function normalizePhotoPrivacy(privacy = {}) {
  return {
    lockEnabled: Boolean(privacy.lockEnabled && privacy.pinHash),
    pinHash: String(privacy.pinHash || '')
  };
}

function normalizeCustomExercise(item = {}) {
  return {
    id: item.id || uid('custom'),
    name: item.name || 'Ejercicio personalizado',
    muscle: item.muscle || 'Otros',
    equipment: item.equipment || 'Sin especificar',
    summary: item.summary || item.description || '',
    steps: Array.isArray(item.steps) ? item.steps : splitLines(item.steps),
    mistakes: Array.isArray(item.mistakes) ? item.mistakes : splitLines(item.mistakes),
    alternatives: Array.isArray(item.alternatives) ? item.alternatives : [],
    synonyms: Array.isArray(item.synonyms) ? item.synonyms : splitCsv(item.synonyms),
    level: item.level || 'Intermedio',
    movement: item.movement || 'full_body',
    visualType: item.visualType || item.movement || 'full_body',
    primaryMuscles: Array.isArray(item.primaryMuscles) && item.primaryMuscles.length ? item.primaryMuscles : [item.muscle || 'Otros'],
    secondaryMuscles: Array.isArray(item.secondaryMuscles) ? item.secondaryMuscles : [],
    custom: true
  };
}

function splitLines(value) {
  return String(value || '').split(/\n+/).map((part) => part.trim()).filter(Boolean);
}

function splitCsv(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function normalizeActiveWorkout(workout, plan, profile) {
  if (!workout) return null;
  const rules = trainingRules(profile);
  const planDayIndex = Number(workout.planDayIndex ?? 0);
  const planDay = plan?.days?.[planDayIndex];
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
  return {
    id: workout.id || uid('session'),
    planDayIndex: Number.isInteger(workout.planDayIndex) ? workout.planDayIndex : null,
    sourcePlanDayIndex: Number.isInteger(workout.sourcePlanDayIndex) ? workout.sourcePlanDayIndex : null,
    planDayId: workout.planDayId || planDay?.id || null,
    sessionSource: workout.sessionSource || 'routine',
    sourceLabel: workout.sourceLabel || 'Tu rutina',
    sourceReason: workout.sourceReason || '',
    scheduledDate: workout.scheduledDate || '',
    plannerOccurrenceId: workout.plannerOccurrenceId || '',
    name: workout.name || planDay?.name || 'Entrenamiento',
    startedAt: workout.startedAt || new Date().toISOString(),
    notes: workout.notes || '',
    restTimer: workout.restTimer || null,
    readiness: workout.readiness || null,
    deload: workout.deload || null,
    adaptation: workout.adaptation || null,
    exercises: exercises.map((item, exerciseIndex) => normalizeWorkoutExercise(item, rules, exerciseIndex))
  };
}

function normalizeWorkoutExercise(item = {}, rules, exerciseIndex = 0) {
  const legacySetCount = Array.isArray(item.sets)
    ? item.sets.length
    : Array.isArray(item.setsData)
      ? item.setsData.length
      : item.sets;
  const targetSets = Math.max(1, Number(item.targetSets ?? legacySetCount ?? 3) || 3);
  const repRange = parseLegacyRepRange(item.reps, rules);
  const restSeconds = parseLegacyRest(item.restSeconds ?? item.rest, rules.restSeconds);
  let sets = Array.isArray(item.setsData) ? item.setsData : (Array.isArray(item.sets) ? item.sets : null);
  if (!sets) {
    sets = Array.from({ length: targetSets }, (_, index) => ({ id: uid(`set-${exerciseIndex}-${index}`), weight: item.weight || '', reps: item.actualReps || '', rir: '', completed: Boolean(item.completed) }));
  }
  const normalizedSets = sets.map((set, index) => ({
    id: set.id || uid(`set-${exerciseIndex}-${index}`),
    weight: set.weight ?? '',
    reps: set.reps ?? set.actualReps ?? '',
    rir: set.rir ?? '',
    completed: Boolean(set.completed),
    completedAt: set.completedAt || null
  }));
  const repMin = Math.max(1, Number(item.repMin ?? repRange.repMin) || rules.repMin);
  const repMax = Math.max(repMin, Number(item.repMax ?? repRange.repMax) || rules.repMax);
  return {
    instanceId: item.instanceId || item.slotId || uid('instance'),
    slotId: item.slotId || uid('slot'),
    exerciseId: item.exerciseId,
    targetSets: normalizedSets.length || targetSets,
    repMin,
    repMax,
    unit: item.unit || repRange.unit || 'reps',
    restSeconds: Math.max(15, restSeconds),
    notes: item.notes || '',
    sets: normalizedSets
  };
}

function parseLegacyRepRange(value, rules) {
  const text = String(value || '');
  const numbers = text.match(/\d+/g)?.map(Number) || [];
  const timed = /s|seg/i.test(text);
  if (!numbers.length) return { repMin: rules.repMin, repMax: rules.repMax, unit: 'reps' };
  return { repMin: numbers[0], repMax: numbers[1] || numbers[0], unit: timed ? 'sec' : 'reps' };
}

function parseLegacyRest(value, fallback) {
  if (typeof value === 'number') return value;
  const numbers = String(value || '').match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : fallback;
}

function normalizeHistorySession(session) {
  if (!session) return null;
  const startedAt = session.startedAt || session.finishedAt || session.date || new Date().toISOString();
  const finishedAt = session.finishedAt || session.endedAt || startedAt;
  const exercises = Array.isArray(session.exercises) ? session.exercises.map((item, index) => {
    const legacySets = Array.isArray(item.sets) ? item.sets : [{ id: uid(`history-set-${index}`), weight: item.weight ?? '', reps: item.actualReps ?? item.reps ?? '', rir: item.rir ?? '', completed: true }];
    return {
      instanceId: item.instanceId || uid('history-exercise'),
      exerciseId: item.exerciseId,
      exerciseName: item.exerciseName || '',
      targetSets: Number(item.targetSets || legacySets.length || 1),
      repMin: Number(item.repMin || 0),
      repMax: Number(item.repMax || 0),
      unit: item.unit || 'reps',
      restSeconds: Number(item.restSeconds || 0),
      notes: item.notes || '',
      sets: legacySets.map((set) => ({ id: set.id || uid('history-set'), weight: set.weight ?? '', reps: set.reps ?? '', rir: set.rir ?? '', completed: set.completed !== false }))
    };
  }) : [];
  return {
    id: session.id || uid('session'),
    name: session.name || 'Entrenamiento',
    startedAt,
    finishedAt,
    durationSeconds: Number(session.durationSeconds || Math.max(0, (new Date(finishedAt) - new Date(startedAt)) / 1000)) || 0,
    completedCount: Number(session.completedCount || exercises.length),
    totalCount: Number(session.totalCount || exercises.length),
    notes: session.notes || '',
    sessionSource: session.sessionSource || 'routine',
    sourceLabel: session.sourceLabel || 'Tu rutina',
    sourceReason: session.sourceReason || '',
    scheduledDate: session.scheduledDate || '',
    plannerOccurrenceId: session.plannerOccurrenceId || '',
    planDayId: session.planDayId || '',
    planDayIndex: Number.isInteger(session.planDayIndex) ? session.planDayIndex : null,
    sourcePlanDayIndex: Number.isInteger(session.sourcePlanDayIndex) ? session.sourcePlanDayIndex : null,
    readiness: session.readiness || null,
    deload: session.deload || null,
    adaptation: session.adaptation || null,
    exercises,
    volume: Number(session.volume || 0),
    prs: Array.isArray(session.prs) ? session.prs : []
  };
}

export function validateImportedState(payload) {
  const candidate = payload?.data || payload?.state || payload;
  if (!candidate || typeof candidate !== 'object') throw new Error('La copia no contiene datos válidos.');
  const normalized = normalizeState(candidate);
  if (!normalized.profile && !normalized.plan && !normalized.history.length) throw new Error('La copia está vacía o no pertenece a My Fit Plan.');
  return normalized;
}
