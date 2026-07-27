'use strict';

import { getAllExercises, getExercise } from './exercises.js?v=34c2';
import { createPlanExercise, trainingRules } from './plans.js?v=34c2';
import { numberValue } from './utils.js?v=34c2';

const FOCUS_PROFILES = [
  {
    id: 'push',
    name: 'Empuje alternativo',
    muscles: ['Pecho', 'Hombros', 'Tríceps'],
    slots: ['Pecho', 'Hombros', 'Tríceps', 'Pecho', 'Hombros', 'Core']
  },
  {
    id: 'pull',
    name: 'Tirón alternativo',
    muscles: ['Espalda', 'Hombro posterior', 'Bíceps'],
    slots: ['Espalda', 'Espalda', 'Hombro posterior', 'Bíceps', 'Bíceps', 'Core']
  },
  {
    id: 'lower',
    name: 'Pierna equilibrada',
    muscles: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos'],
    slots: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Cuádriceps', 'Gemelos', 'Core']
  },
  {
    id: 'posterior',
    name: 'Cadena posterior y core',
    muscles: ['Glúteos', 'Isquiotibiales', 'Espalda baja', 'Core'],
    slots: ['Glúteos', 'Isquiotibiales', 'Espalda baja', 'Glúteos', 'Core', 'Gemelos']
  },
  {
    id: 'upper',
    name: 'Torso equilibrado',
    muscles: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'],
    slots: ['Pecho', 'Espalda', 'Hombros', 'Espalda', 'Bíceps', 'Tríceps']
  },
  {
    id: 'full',
    name: 'Cuerpo completo',
    muscles: ['Cuádriceps', 'Pecho', 'Espalda', 'Glúteos', 'Hombros', 'Core'],
    slots: ['Cuádriceps', 'Pecho', 'Espalda', 'Glúteos', 'Hombros', 'Core']
  },
  {
    id: 'arms',
    name: 'Brazos, hombros y core',
    muscles: ['Hombros', 'Bíceps', 'Tríceps', 'Core'],
    slots: ['Hombros', 'Bíceps', 'Tríceps', 'Hombro posterior', 'Bíceps', 'Core']
  }
];

function sessionDate(session) {
  return new Date(session.finishedAt || session.startedAt || 0);
}

function dayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(seed, value) {
  let state = hashText(`${seed}|${value}`) || 1;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967295;
}

function broadMuscle(muscle) {
  const value = String(muscle || '').toLowerCase();
  if (/(pecho|tríceps|hombros)/.test(value)) return 'push';
  if (/(espalda|bíceps|hombro posterior|antebrazo)/.test(value)) return 'pull';
  if (/(cuádriceps|isquiotibiales|glúteos|gemelos|aductores)/.test(value)) return 'lower';
  if (/(core|espalda baja)/.test(value)) return 'core';
  return value;
}

function exerciseIds(day) {
  return new Set((day?.exercises || []).map((item) => item.exerciseId).filter(Boolean));
}

function recentMuscleCounts(history = [], customExercises = []) {
  const limit = Date.now() - 7 * 86400000;
  const counts = new Map();

  for (const session of history) {
    if (sessionDate(session).getTime() < limit) continue;
    const seen = new Set();
    for (const item of session.exercises || []) {
      const muscle = getExercise(item.exerciseId, customExercises).muscle;
      if (!muscle || seen.has(muscle)) continue;
      seen.add(muscle);
      counts.set(muscle, (counts.get(muscle) || 0) + 1);
    }
  }
  return counts;
}

function recentExerciseData(history = []) {
  const sorted = [...history].sort((a, b) => sessionDate(b) - sessionDate(a));
  const lastTwo = new Set();
  const lastSix = new Set();
  const lastRecommended = new Set();
  const lastSeen = new Map();

  sorted.slice(0, 2).forEach((session) => {
    (session.exercises || []).forEach((item) => lastTwo.add(item.exerciseId));
  });
  sorted.slice(0, 6).forEach((session) => {
    (session.exercises || []).forEach((item) => lastSix.add(item.exerciseId));
  });
  sorted
    .filter((session) => session.sessionSource === 'recommended')
    .slice(0, 2)
    .forEach((session) => {
      (session.exercises || []).forEach((item) => lastRecommended.add(item.exerciseId));
    });

  for (const session of sorted) {
    const date = sessionDate(session);
    for (const item of session.exercises || []) {
      if (!lastSeen.has(item.exerciseId)) lastSeen.set(item.exerciseId, date);
    }
  }

  return { lastTwo, lastSix, lastRecommended, lastSeen };
}

function daysSince(date) {
  if (!date || Number.isNaN(date.getTime())) return 30;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function normalizedEquipment(value) {
  const equipment = String(value || '').toLowerCase();
  if (equipment === 'banda elástica') return 'bandas';
  if (equipment.startsWith('barra')) return 'barra';
  if (equipment === 'barra y banco') return 'barra';
  return equipment;
}

function equipmentAllowed(exercise, profile = {}) {
  const selected = new Set(
    (profile.equipment || []).map((item) => normalizedEquipment(item))
  );
  if (!selected.size) return true;

  const equipment = normalizedEquipment(exercise.equipment);
  if (selected.has(equipment)) return true;
  if (exercise.equipment === 'Peso corporal') return true;
  if (exercise.equipment === 'Banco' && selected.has('barra')) return true;
  if (exercise.equipment === 'Barra y banco' && selected.has('barra')) return true;
  return false;
}

function levelAllowed(exercise, profile = {}) {
  const experience = profile.experience || 'beginner';
  const level = String(exercise.level || '').toLowerCase();
  if (experience === 'beginner') return !level.includes('avanz');
  if (experience === 'intermediate') return !level.includes('avanz');
  return true;
}

function focusScore(focus, nextDay, muscleCounts, seed) {
  const nextMuscles = new Set(
    (nextDay?.exercises || []).map((item) => broadMuscle(item._muscle || ''))
  );
  const underworked = focus.muscles.reduce(
    (sum, muscle) => sum + Math.max(0, 3 - (muscleCounts.get(muscle) || 0)),
    0
  );
  const overlap = focus.muscles.filter((muscle) => nextMuscles.has(broadMuscle(muscle))).length;
  const variation = seededFraction(seed, focus.id) * 5;

  return underworked * 3.2 - overlap * 4.5 + variation;
}

function movementKey(exercise) {
  return String(exercise.movement || exercise.visualType || exercise.movementType || '').toLowerCase();
}

function candidateScore({
  id,
  exercise,
  slotMuscle,
  muscleCounts,
  recent,
  selectedMovements,
  seed,
  index
}) {
  let score = 100;
  const exactMuscle = exercise.muscle === slotMuscle;
  const broadMatch = broadMuscle(exercise.muscle) === broadMuscle(slotMuscle);

  if (exactMuscle) score += 38;
  else if (broadMatch) score += 16;
  else score -= 60;

  score += Math.max(0, 4 - (muscleCounts.get(exercise.muscle) || 0)) * 5;
  score += Math.min(15, daysSince(recent.lastSeen.get(id))) * 1.2;

  if (recent.lastRecommended.has(id)) score -= 80;
  if (recent.lastTwo.has(id)) score -= 38;
  else if (recent.lastSix.has(id)) score -= 13;

  const movement = movementKey(exercise);
  if (movement && selectedMovements.has(movement)) score -= 18;

  if (exercise.media?.video) score += 3;
  if (exercise.realMotion) score += 1;
  if (exercise.level === 'Principiante') score += 1;

  score += seededFraction(seed, `${id}|${slotMuscle}|${index}`) * 13;
  return score;
}

function selectExercises({
  focus,
  library,
  nextExerciseIds,
  muscleCounts,
  recent,
  profile,
  customExercises,
  seed,
  desiredCount
}) {
  const selected = [];
  const selectedIds = new Set();
  const selectedMovements = new Set();
  const rules = trainingRules(profile);

  const strictPool = Object.entries(library).filter(([id, exercise]) =>
    !nextExerciseIds.has(id)
    && equipmentAllowed(exercise, profile)
    && levelAllowed(exercise, profile)
    && exercise.muscle !== 'Movilidad'
    && exercise.muscle !== 'Cardio'
  );

  const relaxedPool = Object.entries(library).filter(([id, exercise]) =>
    !nextExerciseIds.has(id)
    && levelAllowed(exercise, profile)
    && exercise.muscle !== 'Movilidad'
    && exercise.muscle !== 'Cardio'
  );

  const pool = strictPool.length >= desiredCount * 3 ? strictPool : relaxedPool;
  const slots = focus.slots.slice(0, desiredCount);

  for (let index = 0; index < slots.length; index += 1) {
    const slotMuscle = slots[index];
    const ranked = pool
      .filter(([id]) => !selectedIds.has(id))
      .map(([id, exercise]) => ({
        id,
        exercise,
        score: candidateScore({
          id,
          exercise,
          slotMuscle,
          muscleCounts,
          recent,
          selectedMovements,
          seed,
          index
        })
      }))
      .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'es'));

    let choice = ranked.find((item) => item.exercise.muscle === slotMuscle);
    if (!choice) choice = ranked.find((item) => broadMuscle(item.exercise.muscle) === broadMuscle(slotMuscle));
    if (!choice) choice = ranked[0];
    if (!choice) continue;

    selectedIds.add(choice.id);
    const movement = movementKey(choice.exercise);
    if (movement) selectedMovements.add(movement);

    const compound = index <= 1 || /(press|remo|jalón|dominada|sentadilla|prensa|peso muerto|zancada|hip thrust)/i.test(choice.exercise.name);
    const overrides = {
      targetSets: compound ? Math.max(3, rules.targetSets) : Math.min(3, rules.targetSets),
      restSeconds: compound ? Math.max(75, rules.restSeconds) : Math.min(75, rules.restSeconds)
    };
    selected.push(createPlanExercise(choice.id, rules, overrides));
  }

  return selected;
}

function recommendationName(focus, variant) {
  const suffixes = ['Equilibrada', 'Variante', 'Alternativa', 'Rotación'];
  const suffix = suffixes[variant % suffixes.length];
  return `${focus.name} · ${suffix}`;
}

export function buildRecommendedSession(
  plan,
  history = [],
  nextWorkoutIndex = 0,
  customExercises = [],
  profile = {},
  variant = 0
) {
  const days = plan?.days || [];
  if (!days.length) return null;

  const safeNext = Math.max(0, Math.min(days.length - 1, numberValue(nextWorkoutIndex)));
  const nextDay = days[safeNext];
  const library = getAllExercises(customExercises);
  const nextExerciseIds = exerciseIds(nextDay);
  const muscleCounts = recentMuscleCounts(history, customExercises);
  const recent = recentExerciseData(history);
  const seed = `${dayStamp()}|${plan.id || plan.name}|${history.length}|${safeNext}|${variant}`;

  // Añadir los músculos reales del próximo día para calcular el solapamiento.
  const enrichedNextDay = {
    ...nextDay,
    exercises: (nextDay.exercises || []).map((item) => ({
      ...item,
      _muscle: getExercise(item.exerciseId, customExercises).muscle
    }))
  };

  const rankedFocuses = FOCUS_PROFILES
    .map((focus) => ({
      focus,
      score: focusScore(focus, enrichedNextDay, muscleCounts, seed)
    }))
    .sort((a, b) => b.score - a.score);

  const focusWindow = rankedFocuses.slice(0, Math.min(4, rankedFocuses.length));
  const focus = focusWindow[variant % focusWindow.length]?.focus || rankedFocuses[0].focus;

  const minutes = numberValue(profile.minutes || profile.duration, 45);
  const desiredCount = minutes <= 30 ? 4 : minutes <= 45 ? 5 : 6;
  const exercises = selectExercises({
    focus,
    library,
    nextExerciseIds,
    muscleCounts,
    recent,
    profile,
    customExercises,
    seed,
    desiredCount
  });

  if (exercises.length < 3) return null;

  const generatedName = recommendationName(focus, variant);
  const selectedIds = new Set(exercises.map((item) => item.exerciseId));
  const overlap = [...selectedIds].filter((id) => nextExerciseIds.has(id)).length;
  const previousRecommendedOverlap = [...selectedIds].filter((id) => recent.lastRecommended.has(id)).length;
  const confidence = Math.min(94, 54 + Math.min(5, history.length) * 6 + Math.min(10, exercises.length * 2));

  const noveltyText = previousRecommendedOverlap
    ? `Solo ${previousRecommendedOverlap} ejercicio${previousRecommendedOverlap === 1 ? '' : 's'} coincide${previousRecommendedOverlap === 1 ? '' : 'n'} con tus recomendaciones recientes.`
    : 'Evita los ejercicios usados en tus recomendaciones recientes.';

  return {
    source: 'recommended',
    sourceLabel: 'Recomendada por MFP',
    planDayIndex: null,
    variant,
    day: {
      id: `dynamic-recommended-${hashText(seed)}`,
      name: generatedName,
      focus: focus.name,
      exercises
    },
    originalDayName: generatedName,
    reason: `Sesión creada ahora con ${exercises.length} ejercicios diferentes a tu próxima rutina. ${noveltyText}`,
    muscles: focus.muscles,
    confidence,
    tags: [
      overlap === 0 ? '0 ejercicios repetidos' : `${overlap} repetidos`,
      `Variante ${variant + 1}`,
      focus.name,
      `${confidence}% de confianza`
    ]
  };
}
