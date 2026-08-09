'use strict';

import { getAllExercises, getExercise } from './exercises.js?v=45';
import { createPlanExercise, trainingRules } from './plans.js?v=45';
import { numberValue } from './utils.js?v=45';

const FOCUS_PROFILES = [
  {
    id: 'push',
    name: 'Empuje',
    muscles: ['Pecho', 'Hombros', 'Tríceps'],
    slots: ['Pecho', 'Pecho', 'Hombros', 'Tríceps', 'Hombros', 'Core']
  },
  {
    id: 'pull',
    name: 'Tirón',
    muscles: ['Espalda', 'Hombro posterior', 'Bíceps'],
    slots: ['Espalda', 'Espalda', 'Hombro posterior', 'Bíceps', 'Espalda', 'Core']
  },
  {
    id: 'lower',
    name: 'Pierna completa',
    muscles: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos'],
    slots: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Cuádriceps', 'Gemelos', 'Core']
  },
  {
    id: 'posterior',
    name: 'Cadena posterior',
    muscles: ['Glúteos', 'Isquiotibiales', 'Espalda baja', 'Core'],
    slots: ['Glúteos', 'Isquiotibiales', 'Espalda baja', 'Glúteos', 'Core', 'Gemelos']
  },
  {
    id: 'upper',
    name: 'Torso',
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
    name: 'Brazos y hombros',
    muscles: ['Hombros', 'Bíceps', 'Tríceps', 'Core'],
    slots: ['Hombros', 'Bíceps', 'Tríceps', 'Hombro posterior', 'Bíceps', 'Core']
  },
  {
    id: 'core',
    name: 'Core y estabilidad',
    muscles: ['Core', 'Glúteos', 'Espalda baja'],
    slots: ['Core', 'Core', 'Glúteos', 'Core', 'Espalda baja', 'Core']
  }
];

function sessionDate(session) {
  return new Date(session?.finishedAt || session?.startedAt || 0);
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

function movementFamily(exercise) {
  const text = `${exercise.name || ''} ${exercise.movement || ''} ${exercise.visualType || ''} ${exercise.movementType || ''}`.toLowerCase();
  if (/(press|empuje)/.test(text)) return text.includes('vertical') || /(hombro|militar)/.test(text) ? 'vertical_press' : 'horizontal_press';
  if (/(remo|row)/.test(text)) return 'row';
  if (/(jalón|dominada|pullup|tirón vertical)/.test(text)) return 'vertical_pull';
  if (/(sentadilla|squat|prensa)/.test(text)) return 'squat';
  if (/(peso muerto|rumano|bisagra|good morning)/.test(text)) return 'hinge';
  if (/(zancada|split squat|step up)/.test(text)) return 'lunge';
  if (/(curl.*bíceps|bíceps)/.test(text)) return 'biceps';
  if (/(tríceps|fondos|extensión.*codo)/.test(text)) return 'triceps';
  if (/(elevaciones laterales|deltoide lateral)/.test(text)) return 'lateral_raise';
  if (/(face pull|pájaros|reverse fly|posterior)/.test(text)) return 'rear_delt';
  if (/(abducción|abduction)/.test(text)) return 'abduction';
  if (/(crunch|sit up|flexión.*tronco)/.test(text)) return 'core_flexion';
  if (/(plancha|plank|anti)/.test(text)) return 'core_stability';
  return String(exercise.visualType || exercise.movement || exercise.muscle || '').toLowerCase();
}

function exerciseIds(day) {
  return new Set((day?.exercises || []).map((item) => item.exerciseId).filter(Boolean));
}

function setFromHistory(entries = [], key = 'exerciseIds', limit = 4) {
  const result = new Set();
  (entries || []).slice(0, limit).forEach((entry) => {
    (entry?.[key] || []).forEach((value) => result.add(value));
  });
  return result;
}

function recentExerciseData(history = []) {
  const sorted = [...history].sort((a, b) => sessionDate(b) - sessionDate(a));
  const lastTwo = new Set();
  const lastSix = new Set();
  const completedRecommended = new Set();
  const lastSeen = new Map();

  sorted.slice(0, 2).forEach((session) => {
    (session.exercises || []).forEach((item) => lastTwo.add(item.exerciseId));
  });
  sorted.slice(0, 6).forEach((session) => {
    (session.exercises || []).forEach((item) => lastSix.add(item.exerciseId));
  });
  sorted
    .filter((session) => session.sessionSource === 'recommended')
    .slice(0, 3)
    .forEach((session) => {
      (session.exercises || []).forEach((item) => completedRecommended.add(item.exerciseId));
    });

  for (const session of sorted) {
    const date = sessionDate(session);
    for (const item of session.exercises || []) {
      if (!lastSeen.has(item.exerciseId)) lastSeen.set(item.exerciseId, date);
    }
  }

  return { lastTwo, lastSix, completedRecommended, lastSeen };
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

function daysSince(date) {
  if (!date || Number.isNaN(date.getTime())) return 30;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function normalizedEquipment(value) {
  const equipment = String(value || '').toLowerCase().trim();
  if (equipment === 'banda elástica') return 'bandas';
  if (equipment.includes('barra')) return 'barra';
  if (equipment.includes('mancuerna')) return 'mancuernas';
  if (equipment.includes('máquina')) return 'máquina';
  if (equipment.includes('polea')) return 'polea';
  if (equipment.includes('banco')) return 'banco';
  return equipment;
}

function equipmentAllowed(exercise, profile = {}) {
  const selected = new Set((profile.equipment || []).map(normalizedEquipment));
  if (!selected.size) return true;

  const equipment = normalizedEquipment(exercise.equipment);
  if (selected.has(equipment)) return true;
  if (exercise.equipment === 'Peso corporal') return true;
  if (equipment === 'banco' && (selected.has('barra') || selected.has('mancuernas'))) return true;
  return false;
}

function levelAllowed(exercise, profile = {}) {
  const experience = profile.experience || 'beginner';
  const level = String(exercise.level || '').toLowerCase();
  if (experience === 'beginner') return !level.includes('avanz');
  if (experience === 'intermediate') return !level.includes('avanz');
  return true;
}

function chooseFocus({
  nextDay,
  muscleCounts,
  variant,
  excludedFocusIds,
  recommendationHistory
}) {
  const nextBroad = new Set(
    (nextDay?.exercises || []).map((item) => broadMuscle(item._muscle || ''))
  );
  const persistentFocus = new Set(
    (recommendationHistory || []).slice(0, 4).map((entry) => entry.focusId).filter(Boolean)
  );

  const scored = FOCUS_PROFILES.map((focus) => {
    const underworked = focus.muscles.reduce(
      (sum, muscle) => sum + Math.max(0, 3 - (muscleCounts.get(muscle) || 0)),
      0
    );
    const nextOverlap = focus.muscles.filter((muscle) => nextBroad.has(broadMuscle(muscle))).length;
    const blocked = excludedFocusIds.has(focus.id);
    const recentlyUsed = persistentFocus.has(focus.id);
    const rotation = seededFraction(`${dayStamp()}|${variant}`, focus.id) * 7;

    return {
      focus,
      score: underworked * 3.5 - nextOverlap * 4.8 - (blocked ? 1000 : 0) - (recentlyUsed ? 18 : 0) + rotation
    };
  }).sort((a, b) => b.score - a.score);

  const available = scored.filter((item) => item.score > -900);
  if (available.length) return available[0].focus;

  // Cuando se han recorrido todos los enfoques, reinicia solamente la rotación de enfoque.
  return scored
    .map((item) => ({ ...item, score: item.score + (excludedFocusIds.has(item.focus.id) ? 1000 : 0) }))
    .sort((a, b) => b.score - a.score)[0].focus;
}

function candidateScore({
  id,
  exercise,
  slotMuscle,
  muscleCounts,
  recent,
  selectedFamilies,
  softExcludedIds,
  mainExerciseIds,
  selectedMainCount,
  seed,
  slotIndex
}) {
  let score = 100;
  const exactMuscle = exercise.muscle === slotMuscle;
  const broadMatch = broadMuscle(exercise.muscle) === broadMuscle(slotMuscle);

  if (exactMuscle) score += 42;
  else if (broadMatch) score += 18;
  else score -= 75;

  score += Math.max(0, 4 - (muscleCounts.get(exercise.muscle) || 0)) * 5;
  score += Math.min(16, daysSince(recent.lastSeen.get(id))) * 1.25;

  if (recent.lastTwo.has(id)) score -= 45;
  else if (recent.lastSix.has(id)) score -= 14;
  if (recent.completedRecommended.has(id)) score -= 55;
  if (softExcludedIds.has(id)) score -= 70;
  if (mainExerciseIds.has(id)) {
    score -= 28;
    if (selectedMainCount >= 2) score -= 500;
  }

  const family = movementFamily(exercise);
  if (family && selectedFamilies.has(family)) score -= 34;

  if (exercise.media?.video) score += 2;
  if (exercise.level === 'Principiante') score += 1;

  score += seededFraction(seed, `${id}|${slotMuscle}|${slotIndex}`) * 20;
  return score;
}

function chooseCandidate(ranked, seed, slotIndex) {
  if (!ranked.length) return null;
  const topScore = ranked[0].score;
  const shortlist = ranked
    .filter((item) => item.score >= topScore - 13)
    .slice(0, 9);
  const index = Math.floor(seededFraction(seed, `pick-${slotIndex}`) * shortlist.length);
  return shortlist[index] || shortlist[0] || ranked[0];
}

function buildPool({
  library,
  mandatoryExcludedIds,
  memoryExcludedIds,
  profile,
  desiredCount
}) {
  const base = Object.entries(library).filter(([id, exercise]) =>
    !mandatoryExcludedIds.has(id)
    && levelAllowed(exercise, profile)
    && !['Movilidad', 'Cardio'].includes(exercise.muscle)
  );

  const strict = base.filter(([id, exercise]) =>
    !memoryExcludedIds.has(id)
    && equipmentAllowed(exercise, profile)
  );
  if (strict.length >= desiredCount * 5) return strict;

  const equipmentOnly = base.filter(([id, exercise]) => equipmentAllowed(exercise, profile));
  if (equipmentOnly.length >= desiredCount * 4) return equipmentOnly;

  const withoutMemory = base.filter(([id]) => !memoryExcludedIds.has(id));
  return withoutMemory.length >= desiredCount * 3 ? withoutMemory : base;
}

function selectExercises({
  focus,
  library,
  mandatoryExcludedIds,
  memoryExcludedIds,
  softExcludedIds,
  mainExerciseIds,
  muscleCounts,
  recent,
  profile,
  seed,
  desiredCount
}) {
  const selected = [];
  const selectedIds = new Set();
  const selectedFamilies = new Set();
  let selectedMainCount = 0;
  const rules = trainingRules(profile);
  const pool = buildPool({
    library,
    mandatoryExcludedIds,
    memoryExcludedIds,
    profile,
    desiredCount
  });

  for (let slotIndex = 0; slotIndex < focus.slots.slice(0, desiredCount).length; slotIndex += 1) {
    const slotMuscle = focus.slots[slotIndex];
    const candidates = pool
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
          selectedFamilies,
          softExcludedIds,
          mainExerciseIds,
          selectedMainCount,
          seed,
          slotIndex
        })
      }))
      .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'es'));

    let matching = candidates.filter((item) => item.exercise.muscle === slotMuscle);
    if (!matching.length) {
      matching = candidates.filter((item) => broadMuscle(item.exercise.muscle) === broadMuscle(slotMuscle));
    }
    const choice = chooseCandidate(matching.length ? matching : candidates, seed, slotIndex);
    if (!choice) continue;

    selectedIds.add(choice.id);
    selectedFamilies.add(movementFamily(choice.exercise));
    if (mainExerciseIds.has(choice.id)) selectedMainCount += 1;

    const compound = slotIndex <= 1
      || /(press|remo|jalón|dominada|sentadilla|prensa|peso muerto|zancada|hip thrust)/i.test(choice.exercise.name);
    selected.push(createPlanExercise(choice.id, rules, {
      targetSets: compound ? Math.max(3, rules.targetSets) : Math.min(3, rules.targetSets),
      restSeconds: compound ? Math.max(75, rules.restSeconds) : Math.min(75, rules.restSeconds)
    }));
  }

  return selected;
}

function signatureFromIds(ids = []) {
  return [...ids].sort().join('|');
}

function recommendationName(focus, variant) {
  const suffixes = ['Equilibrada', 'Rotación', 'Alternativa', 'Nueva selección', 'Variante'];
  return `${focus.name} · ${suffixes[variant % suffixes.length]}`;
}


function hoursSince(date) {
  if (!date || Number.isNaN(date.getTime())) return Infinity;
  return Math.max(0, (Date.now() - date.getTime()) / 3600000);
}

function sessionExerciseIds(session) {
  return new Set((session?.exercises || []).map((item) => item.exerciseId).filter(Boolean));
}

function overlapRatio(first = new Set(), second = new Set()) {
  if (!first.size || !second.size) return 0;
  const overlap = [...first].filter((id) => second.has(id)).length;
  return overlap / Math.min(first.size, second.size);
}

function routineMuscles(day, customExercises = []) {
  return new Set(
    (day?.exercises || [])
      .map((item) => broadMuscle(getExercise(item.exerciseId, customExercises).muscle))
      .filter(Boolean)
  );
}

function sessionMuscles(session, customExercises = []) {
  return new Set(
    (session?.exercises || [])
      .map((item) => broadMuscle(getExercise(item.exerciseId, customExercises).muscle))
      .filter(Boolean)
  );
}

export function evaluateTrainingChoice({
  routine,
  alternative,
  history = [],
  customExercises = [],
  weeklyGoal = 3
}) {
  if (!routine?.day?.exercises?.length) {
    return {
      mode: alternative?.day?.exercises?.length ? 'alternative' : 'none',
      confidence: 35,
      title: alternative?.day?.name || 'Sin sesión preparada',
      eyebrow: 'RECOMENDACIÓN DEL ENTRENADOR',
      reason: alternative
        ? 'No hay una rutina activa completa, así que se propone una sesión temporal.'
        : 'Crea una rutina para recibir una recomendación útil.',
      facts: []
    };
  }

  const routineIds = exerciseIds(routine.day);
  const routineMuscleSet = routineMuscles(routine.day, customExercises);
  const sortedHistory = [...history].sort((a, b) => sessionDate(b) - sessionDate(a));
  const lastSession = sortedHistory[0] || null;

  const lastSameRoutine = sortedHistory.find((session) => {
    if (session.planDayId && routine.day.id && session.planDayId === routine.day.id) return true;
    if (String(session.name || '').trim().toLowerCase() === String(routine.day.name || '').trim().toLowerCase()) return true;
    return overlapRatio(routineIds, sessionExerciseIds(session)) >= 0.6;
  }) || null;

  const sameRoutineHours = hoursSince(sessionDate(lastSameRoutine));
  const recentLimit = Date.now() - 40 * 3600000;
  const recentSessions = sortedHistory.filter((session) => sessionDate(session).getTime() >= recentLimit);
  const recentMuscles = new Set();
  recentSessions.forEach((session) => {
    sessionMuscles(session, customExercises).forEach((muscle) => recentMuscles.add(muscle));
  });

  const muscleOverlap = routineMuscleSet.size
    ? [...routineMuscleSet].filter((muscle) => recentMuscles.has(muscle)).length / routineMuscleSet.size
    : 0;

  const startOfCurrentWeek = new Date();
  const currentDay = startOfCurrentWeek.getDay() || 7;
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - currentDay + 1);
  const sessionsThisWeek = sortedHistory.filter((session) => sessionDate(session) >= startOfCurrentWeek).length;
  const adherencePending = Math.max(0, numberValue(weeklyGoal, 3) - sessionsThisWeek);

  const strongRecoveryConflict = sameRoutineHours < 30
    || (recentSessions.length > 0 && muscleOverlap >= 0.75);
  const moderateRecoveryConflict = sameRoutineHours < 42
    || (recentSessions.length > 0 && muscleOverlap >= 0.5);

  if (alternative?.day?.exercises?.length && strongRecoveryConflict) {
    return {
      mode: 'alternative',
      confidence: 88,
      title: alternative.day.name,
      eyebrow: 'ALTERNATIVA RECOMENDADA',
      reason: sameRoutineHours < 30
        ? `La sesión ${routine.day.name} se realizó hace aproximadamente ${Math.max(1, Math.round(sameRoutineHours))} horas. Conviene evitar repetirla tan pronto.`
        : 'La mayor parte de los grupos de la próxima rutina ya se trabajaron durante las últimas 40 horas.',
      facts: [
        { label: 'Recuperación', value: 'Mejor alternativa' },
        { label: 'Rutina', value: 'Se conserva pendiente' },
        { label: 'Coincidencias', value: `${alternative.overlapWithMain || 0} ejercicios` }
      ]
    };
  }

  const confidence = history.length
    ? moderateRecoveryConflict ? 78 : 92
    : 82;

  return {
    mode: 'routine',
    confidence,
    title: `Sigue con ${routine.day.name}`,
    eyebrow: 'MEJOR OPCIÓN HOY',
    reason: !history.length
      ? 'Tu rutina ya contiene una progresión ordenada. Sin historial suficiente, respetar su secuencia es la recomendación más fiable.'
      : moderateRecoveryConflict
        ? 'Existe algo de trabajo reciente parecido, pero no hay una señal suficientemente fuerte para sustituir la sesión programada.'
        : 'No hay un conflicto claro de recuperación. Mantener la secuencia de tu rutina aporta más valor que cambiar ejercicios por cambiar.',
    facts: [
      { label: 'Planificación', value: 'Secuencia correcta' },
      { label: 'Objetivo semanal', value: adherencePending ? `${adherencePending} pendientes` : 'Completado' },
      { label: 'Recuperación', value: moderateRecoveryConflict ? 'Vigilar sensaciones' : 'Sin conflicto claro' }
    ]
  };
}

export function buildRecommendedSession(
  plan,
  history = [],
  nextWorkoutIndex = 0,
  customExercises = [],
  profile = {},
  options = {}
) {
  const days = plan?.days || [];
  if (!days.length) return null;

  const variant = numberValue(options.variant, 0);
  const recommendationHistory = Array.isArray(options.recommendationHistory)
    ? options.recommendationHistory
    : [];
  const excludedExerciseIds = new Set(options.excludeExerciseIds || []);
  const excludedFocusIds = new Set(options.excludeFocusIds || []);

  const safeNext = Math.max(0, Math.min(days.length - 1, numberValue(nextWorkoutIndex)));
  const nextDay = days[safeNext];
  const nextExerciseIds = exerciseIds(nextDay);
  const library = getAllExercises(customExercises);
  const muscleCounts = recentMuscleCounts(history, customExercises);
  const recent = recentExerciseData(history);

  const persistentIds = setFromHistory(recommendationHistory, 'exerciseIds', 5);
  const softPersistentIds = setFromHistory(recommendationHistory, 'exerciseIds', 10);
  const mandatoryExcludedIds = new Set([...excludedExerciseIds]);
  const memoryExcludedIds = new Set([...persistentIds, ...recent.completedRecommended]);
  const softExcludedIds = new Set([...softPersistentIds, ...recent.lastTwo, ...nextExerciseIds]);

  const seed = `${dayStamp()}|${plan.id || plan.name}|${history.length}|${safeNext}|${variant}|${[...excludedExerciseIds].sort().join(',')}`;
  const enrichedNextDay = {
    ...nextDay,
    exercises: (nextDay.exercises || []).map((item) => ({
      ...item,
      _muscle: getExercise(item.exerciseId, customExercises).muscle
    }))
  };

  const focus = chooseFocus({
    nextDay: enrichedNextDay,
    muscleCounts,
    variant,
    excludedFocusIds,
    recommendationHistory
  });

  const minutes = numberValue(profile.minutes || profile.duration, 45);
  const desiredCount = minutes <= 30 ? 4 : minutes <= 45 ? 5 : 6;
  const exercises = selectExercises({
    focus,
    library,
    mandatoryExcludedIds,
    memoryExcludedIds,
    softExcludedIds,
    mainExerciseIds: nextExerciseIds,
    muscleCounts,
    recent,
    profile,
    seed,
    desiredCount
  });

  if (exercises.length < 3) return null;

  const selectedIds = exercises.map((item) => item.exerciseId);
  const selectedSet = new Set(selectedIds);
  const overlapWithMain = selectedIds.filter((id) => nextExerciseIds.has(id)).length;
  const overlapWithPreview = selectedIds.filter((id) => excludedExerciseIds.has(id)).length;
  const overlapWithRecentMemory = selectedIds.filter((id) => persistentIds.has(id)).length;
  const signature = signatureFromIds(selectedIds);
  const confidence = Math.min(
    95,
    56 + Math.min(5, history.length) * 5 + Math.min(12, exercises.length * 2)
  );

  return {
    source: 'recommended',
    sourceLabel: 'Recomendada por MFP',
    planDayIndex: null,
    variant,
    focusId: focus.id,
    exerciseIds: selectedIds,
    signature,
    day: {
      id: `dynamic-recommended-${hashText(`${seed}|${signature}`)}`,
      name: recommendationName(focus, variant),
      focus: focus.name,
      exercises
    },
    originalDayName: recommendationName(focus, variant),
    reason: overlapWithMain
      ? `Creada con ${exercises.length} ejercicios. Conserva ${overlapWithMain} movimiento${overlapWithMain === 1 ? '' : 's'} útil${overlapWithMain === 1 ? '' : 'es'} de tu rutina y cambia el resto.`
      : `Creada con ${exercises.length} ejercicios como alternativa completa a la sesión programada.`,
    muscles: focus.muscles,
    confidence,
    overlapWithMain,
    overlapWithPreview,
    overlapWithRecentMemory,
    tags: [
      overlapWithMain
        ? `${overlapWithMain} coincidencia${overlapWithMain === 1 ? '' : 's'} útil${overlapWithMain === 1 ? '' : 'es'}`
        : 'Alternativa completa',
      `${overlapWithPreview} repetidos con propuestas vistas`,
      focus.name,
      `${confidence}% de confianza`
    ]
  };
}
