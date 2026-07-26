import { clone, isoDay, numberValue, uid } from './utils.js';
import { buildPlan, normalizePlan, trainingRules } from './plans.js';

export const STORAGE_KEY = 'myFitPlanStateV21';
export const LEGACY_KEYS = ['myFitPlanStateV2', 'myFitPlanStateV1'];
export const APP_VERSION = '2.1.0';

export const defaultSettings = {
  accent: 'orange',
  appearance: 'system',
  compact: false,
  showTips: true,
  reduceMotion: false,
  restSound: true,
  restVibrate: true,
  autoStartRest: true,
  defaultRestSeconds: 75
};

export const defaultState = {
  schemaVersion: 21,
  appVersion: APP_VERSION,
  profile: null,
  settings: clone(defaultSettings),
  plan: null,
  nextWorkoutIndex: 0,
  activeWorkout: null,
  history: [],
  customExercises: [],
  favorites: [],
  weightHistory: [],
  createdAt: null,
  updatedAt: null
};

export function createEmptyState() {
  return clone(defaultState);
}

export function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeState(JSON.parse(current));

    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const migrated = normalizeState(JSON.parse(legacy));
      saveState(migrated);
      return migrated;
    }
  } catch (error) {
    console.warn('No se pudo cargar el progreso:', error);
  }
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
    days: 3,
    minutes: 45,
    equipment: ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio'],
    ...saved.profile
  } : null;

  const normalized = {
    ...createEmptyState(),
    ...saved,
    schemaVersion: 21,
    appVersion: APP_VERSION,
    profile,
    settings: { ...clone(defaultSettings), ...(saved.settings || {}) },
    history: Array.isArray(saved.history) ? saved.history.map(normalizeHistorySession).filter(Boolean) : [],
    customExercises: Array.isArray(saved.customExercises) ? saved.customExercises.map(normalizeCustomExercise) : [],
    favorites: Array.isArray(saved.favorites) ? [...new Set(saved.favorites)] : [],
    weightHistory: normalizeWeightHistory(saved.weightHistory, profile),
    nextWorkoutIndex: Number(saved.nextWorkoutIndex) || 0,
    createdAt: saved.createdAt || (profile ? new Date().toISOString() : null),
    updatedAt: saved.updatedAt || new Date().toISOString()
  };

  normalized.plan = normalizePlan(saved.plan, profile || {});
  if (profile && !normalized.plan) normalized.plan = buildPlan(profile);
  normalized.activeWorkout = normalizeActiveWorkout(saved.activeWorkout, normalized.plan, profile || {});

  if (normalized.plan?.days?.length) {
    normalized.nextWorkoutIndex %= normalized.plan.days.length;
  } else {
    normalized.nextWorkoutIndex = 0;
  }
  return normalized;
}

function normalizeWeightHistory(history, profile) {
  const clean = Array.isArray(history)
    ? history.map((item) => ({
      id: item.id || uid('weight'),
      date: item.date || isoDay(item.createdAt || new Date()),
      weight: numberValue(item.weight)
    })).filter((item) => item.weight > 0)
    : [];

  if (!clean.length && numberValue(profile?.weight) > 0) {
    clean.push({ id: uid('weight'), date: isoDay(new Date()), weight: numberValue(profile.weight) });
  }
  return clean.sort((a, b) => String(a.date).localeCompare(String(b.date)));
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
    planDayIndex,
    planDayId: workout.planDayId || planDay?.id || null,
    name: workout.name || planDay?.name || 'Entrenamiento',
    startedAt: workout.startedAt || new Date().toISOString(),
    notes: workout.notes || '',
    restTimer: workout.restTimer || null,
    exercises: exercises.map((item, exerciseIndex) => normalizeWorkoutExercise(item, rules, exerciseIndex))
  };
}

function normalizeWorkoutExercise(item = {}, rules, exerciseIndex = 0) {
  const targetSets = Number(item.targetSets ?? item.sets ?? 3) || 3;
  const repRange = parseLegacyRepRange(item.reps, rules);
  const restSeconds = parseLegacyRest(item.restSeconds ?? item.rest, rules.restSeconds);
  let sets = Array.isArray(item.setsData) ? item.setsData : (Array.isArray(item.sets) ? item.sets : null);

  if (!sets) {
    sets = Array.from({ length: targetSets }, (_, index) => ({
      id: uid(`set-${exerciseIndex}-${index}`),
      weight: item.weight || '',
      reps: item.actualReps || '',
      rir: '',
      completed: Boolean(item.completed)
    }));
  }

  return {
    instanceId: item.instanceId || item.slotId || uid('instance'),
    slotId: item.slotId || uid('slot'),
    exerciseId: item.exerciseId,
    targetSets,
    repMin: Number(item.repMin ?? repRange.repMin) || rules.repMin,
    repMax: Number(item.repMax ?? repRange.repMax) || rules.repMax,
    unit: item.unit || repRange.unit || 'reps',
    restSeconds,
    notes: item.notes || '',
    sets: sets.map((set, index) => ({
      id: set.id || uid(`set-${exerciseIndex}-${index}`),
      weight: set.weight ?? '',
      reps: set.reps ?? set.actualReps ?? '',
      rir: set.rir ?? '',
      completed: Boolean(set.completed),
      completedAt: set.completedAt || null
    }))
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
    const legacySets = Array.isArray(item.sets) ? item.sets : [{
      id: uid(`history-set-${index}`),
      weight: item.weight ?? '',
      reps: item.actualReps ?? item.reps ?? '',
      rir: item.rir ?? '',
      completed: true
    }];
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
      sets: legacySets.map((set) => ({
        id: set.id || uid('history-set'),
        weight: set.weight ?? '',
        reps: set.reps ?? '',
        rir: set.rir ?? '',
        completed: set.completed !== false
      }))
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
    exercises,
    volume: Number(session.volume || 0),
    prs: Array.isArray(session.prs) ? session.prs : []
  };
}

export function validateImportedState(payload) {
  const candidate = payload?.data || payload?.state || payload;
  if (!candidate || typeof candidate !== 'object') throw new Error('La copia no contiene datos válidos.');
  const normalized = normalizeState(candidate);
  if (!normalized.profile && !normalized.plan && !normalized.history.length) {
    throw new Error('La copia está vacía o no pertenece a My Fit Plan.');
  }
  return normalized;
}
