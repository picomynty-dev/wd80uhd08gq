'use strict';

import { getExercise } from './exercises.js?v=51';
import { clamp, numberValue } from './utils.js?v=51';

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

export function sessionTiming(day) {
  const items = day?.exercises || [];
  if (!items.length) return { warmup: 0, work: 0, rest: 0, transitions: 0, totalSeconds: 0, minutes: 0 };
  let work = 0, rest = 0;
  for (const item of items) {
    const sets = Math.max(1, Math.round(numberValue(item.targetSets, 3)));
    const repetitions = Math.max(1, numberValue(item.repMax, numberValue(item.repMin, 12)));
    work += sets * (item.unit === 'sec' ? repetitions : repetitions * 3);
    rest += Math.max(0, sets - 1) * Math.max(15, numberValue(item.restSeconds, 75));
  }
  const warmup = 300;
  const transitions = items.length * 60;
  const totalSeconds = warmup + work + rest + transitions;
  return { warmup, work, rest, transitions, totalSeconds, minutes: Math.ceil(totalSeconds / 60) };
}

export function estimatePlanMinutes(day) { return sessionTiming(day).minutes; }

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
  const requested = readiness.timeMode === 'full' ? null : clamp(Math.round(numberValue(readiness.minutes, 45)), 15, 120);
  const targetMinutes = requested || originalMinutes;
  if (readiness.discomfort === 'important') return { blocked: true, blockReason: 'discomfort', originalMinutes, targetMinutes, items: [] };
  if (!originalItems.length) return { blocked: true, blockReason: 'empty', originalMinutes, targetMinutes, items: [] };
  const fatigued = readiness.energy === 'low' || readiness.sleep === 'poor';
  let items = originalItems.map((item, index) => ({ ...item,
    targetSets: Math.max(1, Math.round(numberValue(item.targetSets, 3)) - (fatigued && index > 1 ? 1 : 0))
  }));
  const seconds = () => sessionTiming({ exercises: items }).totalSeconds;
  const budget = requested ? requested * 60 : Infinity;
  // Reduce volume before removing movements. Rest periods are never shortened to fit a label.
  while (seconds() > budget) {
    let index = -1;
    for (let i = items.length - 1; i >= 0; i--) if (items[i].targetSets > 2) { index = i; break; }
    if (index >= 0) { items[index].targetSets--; continue; }
    if (items.length > 2) { items.pop(); continue; }
    index = items.findLastIndex(item => item.targetSets > 1);
    if (index >= 0) { items[index].targetSets--; continue; }
    if (items.length > 1) { items.pop(); continue; }
    return { blocked: true, blockReason: 'time', originalMinutes, targetMinutes, items: [] };
  }
  // Modest extra volume only when time and readiness permit; never pad with idle time.
  if (requested && !fatigued && readiness.discomfort !== 'mild' && requested > originalMinutes) {
    for (let i = 0; i < items.length && seconds() < budget * 0.92; i++) {
      if (items[i].targetSets >= 4 || items.reduce((sum,x) => sum + x.targetSets, 0) >= 24) continue;
      items[i].targetSets++;
      if (seconds() > budget) items[i].targetSets--;
    }
  }
  const timing = sessionTiming({ exercises: items });
  const kept = new Set(items.map(item => item.slotId || item.exerciseId));
  const removed = originalItems.filter(item => !kept.has(item.slotId || item.exerciseId))
    .map(item => ({ exerciseId: item.exerciseId, name: getExercise(item.exerciseId, customExercises).name }));
  const originalSets = originalItems.reduce((sum,x) => sum + numberValue(x.targetSets,3),0);
  const adaptedSets = items.reduce((sum,x) => sum + x.targetSets,0);
  const guidance = ['Estimación: 5 min de preparación, 3 s por repetición (o duración de la serie), descansos y 1 min de preparación por ejercicio.'];
  if (fatigued) guidance.push('Volumen reducido por la energía o el sueño indicados.');
  if (requested && timing.minutes < requested - 3) guidance.push(`La sesión ocupa unos ${timing.minutes} de tus ${requested} min disponibles. No añadimos volumen ilimitado para rellenar el tiempo.`);
  if (adaptedSets > originalSets) guidance.push(`Se añaden ${adaptedSets - originalSets} series repartidas entre los ejercicios; no se modifica tu rutina guardada.`);
  if (readiness.discomfort === 'mild') guidance.push('Detén un movimiento si la molestia aumenta o cambia tu técnica.');
  return { blocked: false, mode: requested || fatigued ? 'adaptive' : 'original', originalMinutes, targetMinutes,
    adaptedMinutes: timing.minutes, timing, items, removed, removedSets: Math.max(0,originalSets-adaptedSets),
    addedSets: Math.max(0,adaptedSets-originalSets), reasons: adaptationReason(readiness,requested,originalMinutes), guidance,
    originalExerciseCount: originalItems.length, adaptedExerciseCount: items.length, originalSetCount: originalSets, adaptedSetCount: adaptedSets };
}

export function readinessSummary(readiness = {}) {
  return {
    energy: ENERGY_LABELS[readiness.energy] || ENERGY_LABELS.normal,
    sleep: SLEEP_LABELS[readiness.sleep] || SLEEP_LABELS.normal,
    discomfort: DISCOMFORT_LABELS[readiness.discomfort] || DISCOMFORT_LABELS.none,
    minutes: readiness.timeMode === 'full' ? 'Completa' : `${numberValue(readiness.minutes, 45)} min`
  };
}
