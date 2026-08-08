import { isoDay, numberValue, startOfWeek } from './utils.js?v=44';
import { getExercise } from './exercises.js?v=44';

export function completedSets(exercise) {
  return (exercise?.sets || []).filter((set) => set.completed);
}

export function exerciseVolume(exercise) {
  return completedSets(exercise).reduce((total, set) => {
    return total + numberValue(set.weight) * numberValue(set.reps);
  }, 0);
}

export function sessionVolume(session) {
  return (session?.exercises || []).reduce((total, exercise) => total + exerciseVolume(exercise), 0);
}

export function sessionsThisWeek(history = []) {
  const start = startOfWeek();
  return history.filter((session) => new Date(session.finishedAt || session.startedAt) >= start);
}

export function sessionsThisMonth(history = []) {
  const now = new Date();
  return history.filter((session) => {
    const date = new Date(session.finishedAt || session.startedAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

export function calculateStreak(history = []) {
  if (!history.length) return 0;
  const dates = [...new Set(history.map((session) => isoDay(session.finishedAt || session.startedAt)))].sort().reverse();
  if (!dates.length) return 0;

  const today = isoDay(new Date());
  const yesterday = isoDay(new Date(Date.now() - 86400000));
  let cursor = dates[0] === today ? new Date() : (dates[0] === yesterday ? new Date(Date.now() - 86400000) : null);
  if (!cursor) return 0;

  let streak = 0;
  for (const day of dates) {
    if (day === isoDay(cursor)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (day < isoDay(cursor)) {
      break;
    }
  }
  return streak;
}

export function recentExerciseIds(state, limit = 12) {
  const ids = [];
  for (const session of state.history || []) {
    for (const item of session.exercises || []) {
      if (item.exerciseId && !ids.includes(item.exerciseId)) ids.push(item.exerciseId);
      if (ids.length >= limit) return ids;
    }
  }
  for (const item of state.activeWorkout?.exercises || []) {
    if (item.exerciseId && !ids.includes(item.exerciseId)) ids.push(item.exerciseId);
  }
  return ids.slice(0, limit);
}

export function lastExercisePerformance(history = [], exerciseId) {
  for (const session of history) {
    const found = session.exercises?.find((item) => item.exerciseId === exerciseId && completedSets(item).length);
    if (found) return { session, exercise: found };
  }
  return null;
}

export function bestSetForExercise(history = [], exerciseId) {
  let best = null;
  for (const session of history) {
    for (const exercise of session.exercises || []) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of completedSets(exercise)) {
        const candidate = {
          weight: numberValue(set.weight),
          reps: numberValue(set.reps),
          rir: set.rir,
          date: session.finishedAt || session.startedAt,
          volume: numberValue(set.weight) * numberValue(set.reps)
        };
        if (!best || candidate.weight > best.weight || (candidate.weight === best.weight && candidate.reps > best.reps)) {
          best = candidate;
        }
      }
    }
  }
  return best;
}

export function personalRecords(history = [], customExercises = []) {
  const map = new Map();
  for (const session of history) {
    for (const exercise of session.exercises || []) {
      const sets = completedSets(exercise);
      if (!sets.length) continue;
      const maxWeightSet = [...sets].sort((a, b) => numberValue(b.weight) - numberValue(a.weight) || numberValue(b.reps) - numberValue(a.reps))[0];
      const totalVolume = exerciseVolume(exercise);
      const previous = map.get(exercise.exerciseId) || {};
      const exerciseData = getExercise(exercise.exerciseId, customExercises);
      map.set(exercise.exerciseId, {
        exerciseId: exercise.exerciseId,
        name: exercise.exerciseName || exerciseData.name,
        bestWeight: Math.max(numberValue(previous.bestWeight), numberValue(maxWeightSet.weight)),
        bestRepsAtWeight: numberValue(maxWeightSet.weight) >= numberValue(previous.bestWeight)
          ? Math.max(numberValue(previous.bestRepsAtWeight), numberValue(maxWeightSet.reps))
          : numberValue(previous.bestRepsAtWeight),
        bestVolume: Math.max(numberValue(previous.bestVolume), totalVolume),
        lastDate: session.finishedAt || session.startedAt
      });
    }
  }
  return [...map.values()].sort((a, b) => b.bestWeight - a.bestWeight || b.bestVolume - a.bestVolume);
}

export function detectNewPrs(historyBefore = [], completedSession, customExercises = []) {
  const prs = [];
  for (const exercise of completedSession.exercises || []) {
    const before = bestSetForExercise(historyBefore, exercise.exerciseId);
    const sets = completedSets(exercise);
    if (!sets.length) continue;
    const currentBest = [...sets].sort((a, b) => numberValue(b.weight) - numberValue(a.weight) || numberValue(b.reps) - numberValue(a.reps))[0];
    const currentWeight = numberValue(currentBest.weight);
    const currentReps = numberValue(currentBest.reps);
    const name = exercise.exerciseName || getExercise(exercise.exerciseId, customExercises).name;

    if (currentWeight > 0 && (!before || currentWeight > before.weight)) {
      prs.push({ type: 'weight', exerciseId: exercise.exerciseId, name, value: currentWeight, unit: 'kg' });
    } else if (currentWeight > 0 && before && currentWeight === before.weight && currentReps > before.reps) {
      prs.push({ type: 'reps', exerciseId: exercise.exerciseId, name, value: currentReps, unit: 'reps', weight: currentWeight });
    }
  }
  return prs;
}

export function progressionRecommendation(history = [], exercise, customExercises = []) {
  const last = lastExercisePerformance(history, exercise.exerciseId);
  if (!last) {
    return {
      tone: 'neutral',
      title: 'Primera referencia',
      text: 'Elige un peso cómodo que te permita terminar todas las series con buena técnica y 2 o 3 repeticiones posibles en reserva.',
      suggestedWeight: null
    };
  }

  const lastSets = completedSets(last.exercise);
  if (!lastSets.length) return null;
  const weights = lastSets.map((set) => numberValue(set.weight)).filter((value) => value > 0);
  const reps = lastSets.map((set) => numberValue(set.reps));
  const rirs = lastSets.map((set) => numberValue(set.rir, 2));
  const baseWeight = weights.length ? Math.max(...weights) : 0;
  const minReps = Math.min(...reps);
  const allAtTop = reps.every((value) => value >= Number(exercise.repMax || 12));
  const anyBelowMin = reps.some((value) => value < Number(exercise.repMin || 8));
  const avgRir = rirs.reduce((a, b) => a + b, 0) / Math.max(1, rirs.length);
  const data = getExercise(exercise.exerciseId, customExercises);
  const smallIncrement = ['Bíceps', 'Tríceps', 'Hombros', 'Hombro posterior'].includes(data.muscle) || data.equipment === 'Mancuernas';
  const increment = smallIncrement ? 1 : 2.5;

  if (allAtTop && avgRir >= 1 && baseWeight > 0) {
    return {
      tone: 'success',
      title: 'Puedes subir un poco',
      text: `La última vez completaste el máximo del rango. Prueba ${formatWeight(baseWeight + increment)} kg y vuelve a trabajar desde la parte baja del rango.`,
      suggestedWeight: roundWeight(baseWeight + increment)
    };
  }

  if (anyBelowMin && baseWeight > 0) {
    return {
      tone: 'warning',
      title: 'Mantén o reduce ligeramente',
      text: `No alcanzaste el mínimo en todas las series. Mantén ${formatWeight(baseWeight)} kg o baja un poco si la técnica se deterioró.`,
      suggestedWeight: roundWeight(baseWeight)
    };
  }

  return {
    tone: 'neutral',
    title: 'Mantén el peso y suma repeticiones',
    text: baseWeight > 0
      ? `Repite ${formatWeight(baseWeight)} kg e intenta añadir alguna repetición sin superar el esfuerzo previsto.`
      : 'Repite una carga parecida e intenta mejorar una repetición con buena técnica.',
    suggestedWeight: baseWeight > 0 ? roundWeight(baseWeight) : null
  };
}

export function weightSummary(weightHistory = []) {
  const ordered = [...weightHistory].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!ordered.length) return null;
  const first = ordered[0];
  const latest = ordered.at(-1);
  const last30Start = new Date();
  last30Start.setDate(last30Start.getDate() - 30);
  const within30 = ordered.filter((item) => new Date(`${item.date}T00:00:00`) >= last30Start);
  const base30 = within30[0] || first;
  return {
    first,
    latest,
    changeTotal: latest.weight - first.weight,
    change30: latest.weight - base30.weight,
    count: ordered.length
  };
}

export function buildCalendar(history = [], date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const trained = new Set(history.map((session) => isoDay(session.finishedAt || session.startedAt)));
  const cells = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    cells.push({ day, iso: isoDay(current), trained: trained.has(isoDay(current)), today: isoDay(current) === isoDay(new Date()) });
  }
  return { year, month, cells };
}

export function formatWeight(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(numberValue(value));
}

function roundWeight(value) {
  return Math.round(value * 2) / 2;
}
