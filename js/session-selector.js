'use strict';

import { getExercise } from './exercises.js?v=34c';
import { clone, numberValue } from './utils.js?v=34c';

function sessionDate(session) {
  return new Date(session.finishedAt || session.startedAt || 0);
}

function daysAgo(date) {
  if (!date || Number.isNaN(date.getTime())) return 30;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
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

function lastMatchingSession(history = [], day) {
  const targetName = String(day?.name || '').trim().toLowerCase();
  const targetIds = new Set((day?.exercises || []).map((item) => item.exerciseId));

  return [...history]
    .sort((a, b) => sessionDate(b) - sessionDate(a))
    .find((session) => {
      if (String(session.name || '').trim().toLowerCase() === targetName) return true;
      const ids = new Set((session.exercises || []).map((item) => item.exerciseId));
      const overlap = [...targetIds].filter((id) => ids.has(id)).length;
      return targetIds.size && overlap / targetIds.size >= 0.6;
    }) || null;
}

function dayMuscles(day, customExercises = []) {
  return [...new Set((day?.exercises || [])
    .map((item) => getExercise(item.exerciseId, customExercises).muscle)
    .filter(Boolean))];
}

function scoreDay(day, index, history, counts, nextWorkoutIndex, customExercises) {
  const muscles = dayMuscles(day, customExercises);
  const last = lastMatchingSession(history, day);
  const absenceDays = last ? Math.min(14, daysAgo(sessionDate(last))) : 14;
  const balanceScore = muscles.reduce((sum, muscle) => sum + Math.max(0, 3 - (counts.get(muscle) || 0)), 0);
  const scheduleBonus = index === nextWorkoutIndex ? 2.5 : 0;
  const exerciseBonus = Math.min(2, (day.exercises?.length || 0) / 4);

  return {
    index,
    day,
    muscles,
    last,
    absenceDays,
    score: absenceDays * 0.8 + balanceScore * 1.6 + scheduleBonus + exerciseBonus
  };
}

export function buildRecommendedSession(plan, history = [], nextWorkoutIndex = 0, customExercises = []) {
  const days = plan?.days || [];
  if (!days.length) return null;

  const safeNext = Math.max(0, Math.min(days.length - 1, numberValue(nextWorkoutIndex)));
  const counts = recentMuscleCounts(history, customExercises);
  const ranked = days
    .map((day, index) => scoreDay(day, index, history, counts, safeNext, customExercises))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  let selected = ranked[0];

  // Cuando dos opciones tienen una puntuación muy parecida, evita duplicar
  // siempre la siguiente sesión programada y ofrece una alternativa real.
  if (days.length > 1 && selected.index === safeNext && ranked[1] && ranked[1].score >= selected.score * 0.88) {
    selected = ranked[1];
  }

  const leastWorked = [...selected.muscles]
    .sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0))[0];

  let reason;
  if (!history.length) {
    reason = 'Seleccionada para ofrecer una alternativa equilibrada mientras construyes tu historial.';
  } else if (!selected.last) {
    reason = `Esta sesión todavía no tiene una referencia reciente y ayuda a equilibrar ${leastWorked || 'tu semana'}.`;
  } else if (selected.absenceDays >= 5) {
    reason = `Es la sesión de tu plan que lleva más tiempo sin una referencia completa: ${selected.absenceDays} días.`;
  } else {
    reason = `${leastWorked || 'Este bloque'} ha tenido menos presencia reciente y encaja mejor como alternativa para hoy.`;
  }

  const confidence = Math.min(92, 42 + Math.min(5, history.length) * 8);

  return {
    source: 'recommended',
    planDayIndex: selected.index,
    day: {
      ...clone(selected.day),
      id: `recommended-${selected.day.id || selected.index}`,
      name: `Recomendada · ${selected.day.name}`
    },
    originalDayName: selected.day.name,
    reason,
    muscles: selected.muscles,
    confidence,
    tags: [
      selected.absenceDays >= 5 ? `${selected.absenceDays} días sin repetir` : 'Equilibrio semanal',
      `${selected.day.exercises?.length || 0} ejercicios`,
      `${confidence}% de confianza`
    ]
  };
}
