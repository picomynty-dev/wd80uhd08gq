'use strict';

import { getExercise } from './exercises.js?v=46';
import { clamp, numberValue } from './utils.js?v=46';

const ENERGY_LABELS = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta'
};

const SLEEP_LABELS = {
  poor: 'Malo',
  normal: 'Normal',
  good: 'Bueno'
};

const DISCOMFORT_LABELS = {
  none: 'Ninguna',
  mild: 'Leves',
  important: 'Importantes'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function workSeconds(item) {
  const sets = Math.max(1, numberValue(item.targetSets, 3));
  const isTimed = item.unit === 'sec';
  const work = isTimed
    ? Math.max(20, numberValue(item.repMax, item.repMin || 30))
    : 38;
  const rest = Math.max(15, numberValue(item.restSeconds, 75));
  return sets * work + Math.max(0, sets - 1) * rest + 55;
}

export function estimatePlanMinutes(day) {
  const exercises = day?.exercises || [];
  if (!exercises.length) return 0;
  const seconds = exercises.reduce((sum, item) => sum + workSeconds(item), 0) + 180;
  return Math.max(5, Math.round(seconds / 60));
}

function isCompoundExercise(exercise, index) {
  const movement = `${exercise.movementType || ''} ${exercise.visualType || ''} ${exercise.movement || ''}`.toLowerCase();
  const name = String(exercise.name || '').toLowerCase();
  const muscle = String(exercise.muscle || '').toLowerCase();

  if (index <= 1) return true;
  if (/(press|remo|jalón|dominada|sentadilla|prensa|peso muerto|hip thrust|zancada|fondos)/.test(name)) return true;
  if (/(empuje|tirón|dominante|sentadilla|bisagra|extensión de cadera)/.test(movement)) return true;
  if (/(espalda|pecho|pierna completa|cuádriceps|glúteos)/.test(muscle) && index <= 3) return true;
  return false;
}

function adaptedRest(item, isCompound, timeLimit) {
  const original = Math.max(15, numberValue(item.restSeconds, 75));
  if (!timeLimit) return original;
  if (isCompound) return Math.max(60, Math.min(original, timeLimit <= 25 ? 90 : original));
  return Math.max(40, Math.min(original, timeLimit <= 25 ? 50 : 65));
}

function adaptedSets(item, isCompound, readiness, timeLimit) {
  const original = Math.max(1, numberValue(item.targetSets, 3));
  let target = original;

  if (timeLimit && timeLimit <= 25) target = isCompound ? Math.min(original, 3) : Math.min(original, 2);
  else if (timeLimit && timeLimit <= 40) target = isCompound ? Math.min(original, 3) : Math.min(original, 2);

  if (readiness.energy === 'low') target -= isCompound ? 0 : 1;
  if (readiness.sleep === 'poor') target -= isCompound ? (original >= 4 ? 1 : 0) : 1;

  return clamp(target, 1, original);
}

function adaptationReason(readiness, targetMinutes, originalMinutes) {
  const reasons = [];
  if (targetMinutes && targetMinutes < originalMinutes) reasons.push(`tiempo disponible: ${targetMinutes} min`);
  if (readiness.energy === 'low') reasons.push('energía baja');
  if (readiness.sleep === 'poor') reasons.push('sueño insuficiente');
  if (readiness.discomfort === 'mild') reasons.push('molestias leves');
  return reasons;
}

export function buildAdaptiveSession(day, readiness = {}, customExercises = []) {
  const originalItems = clone(day?.exercises || []);
  const originalMinutes = estimatePlanMinutes(day);
  const requested = readiness.timeMode === 'full'
    ? null
    : Math.max(15, numberValue(readiness.minutes, originalMinutes || 45));
  const targetMinutes = requested ? Math.min(requested, originalMinutes || requested) : originalMinutes;
  const blocked = readiness.discomfort === 'important';

  if (blocked) {
    return {
      blocked: true,
      originalMinutes,
      targetMinutes,
      items: [],
      notes: [
        'La app no adapta automáticamente una sesión cuando se indican molestias importantes.',
        'Pospón el entrenamiento si el dolor es intenso, repentino o altera el movimiento.'
      ]
    };
  }

  const candidates = originalItems.map((item, index) => {
    const exercise = getExercise(item.exerciseId, customExercises);
    const compound = isCompoundExercise(exercise, index);
    const adapted = {
      ...clone(item),
      targetSets: adaptedSets(item, compound, readiness, requested),
      restSeconds: adaptedRest(item, compound, requested)
    };
    return {
      index,
      exercise,
      compound,
      original: item,
      adapted,
      seconds: workSeconds(adapted),
      priority: (compound ? 100 : 50) - index * 3
    };
  });

  // Mantener el orden original y priorizar siempre los dos primeros movimientos.
  let selected = [];
  let runningSeconds = 180;
  const targetSeconds = Math.max(15, targetMinutes || originalMinutes || 45) * 60;

  for (const candidate of candidates) {
    const mandatory = candidate.index <= 1;
    if (mandatory || !requested || runningSeconds + candidate.seconds <= targetSeconds) {
      selected.push(candidate);
      runningSeconds += candidate.seconds;
    }
  }

  // Una sesión reducida conserva al menos dos ejercicios siempre que existan.
  if (selected.length < Math.min(2, candidates.length)) {
    selected = candidates.slice(0, Math.min(2, candidates.length));
  }

  // En sesiones de 60 min o cuando el cálculo está muy cerca, evitar eliminar un único ejercicio pequeño.
  if (requested && requested >= 60 && candidates.length - selected.length === 1) {
    const last = candidates.at(-1);
    const projected = runningSeconds + last.seconds;
    if (projected <= targetSeconds + 8 * 60) selected.push(last);
  }

  const items = selected
    .sort((a, b) => a.index - b.index)
    .map((candidate) => candidate.adapted);

  const adaptedMinutes = Math.max(5, Math.round((
    items.reduce((sum, item) => sum + workSeconds(item), 0) + 180
  ) / 60));

  const removed = candidates
    .filter((candidate) => !selected.some((item) => item.index === candidate.index))
    .map((candidate) => ({
      exerciseId: candidate.original.exerciseId,
      name: candidate.exercise.name
    }));

  const originalSets = originalItems.reduce((sum, item) => sum + numberValue(item.targetSets, 3), 0);
  const adaptedSetsTotal = items.reduce((sum, item) => sum + numberValue(item.targetSets, 3), 0);
  const removedSets = Math.max(0, originalSets - adaptedSetsTotal);

  const guidance = [];
  if (readiness.energy === 'low' || readiness.sleep === 'poor') {
    guidance.push('Trabaja con 2–3 repeticiones posibles en reserva y evita buscar récords hoy.');
  } else if (readiness.energy === 'high' && readiness.sleep === 'good') {
    guidance.push('La preparación es favorable, pero mantén las progresiones propuestas y no fuerces aumentos improvisados.');
  } else {
    guidance.push('Mantén el esfuerzo habitual y prioriza repeticiones técnicamente iguales.');
  }
  if (readiness.discomfort === 'mild') {
    guidance.push('No aumentes la carga en movimientos molestos y detén el ejercicio si la molestia aumenta o modifica la técnica.');
  }
  if (requested && adaptedMinutes > requested + 5) {
    guidance.push('La estimación puede variar según los descansos reales. Usa el temporizador para acercarte al objetivo.');
  }

  return {
    blocked: false,
    mode: requested ? 'adaptive' : 'original',
    originalMinutes,
    targetMinutes: requested || originalMinutes,
    adaptedMinutes,
    items,
    removed,
    removedSets,
    reasons: adaptationReason(readiness, requested, originalMinutes),
    guidance,
    originalExerciseCount: originalItems.length,
    adaptedExerciseCount: items.length,
    originalSetCount: originalSets,
    adaptedSetCount: adaptedSetsTotal
  };
}

export function readinessSummary(readiness = {}) {
  return {
    energy: ENERGY_LABELS[readiness.energy] || ENERGY_LABELS.normal,
    sleep: SLEEP_LABELS[readiness.sleep] || SLEEP_LABELS.normal,
    discomfort: DISCOMFORT_LABELS[readiness.discomfort] || DISCOMFORT_LABELS.none,
    minutes: readiness.timeMode === 'full' ? 'Completa' : `${numberValue(readiness.minutes, 45)} min`
  };
}
