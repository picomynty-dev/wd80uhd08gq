'use strict';

import { getExercise } from './exercises.js?v=36';
import { numberValue } from './utils.js?v=36';

const STATUS_META = {
  baseline: { tone: 'neutral', icon: '◎', label: 'Primera referencia', priority: 10 },
  increase: { tone: 'success', icon: '↑', label: 'Subir carga', priority: 80 },
  reps: { tone: 'progress', icon: '+', label: 'Sumar repeticiones', priority: 45 },
  progress: { tone: 'success', icon: '✓', label: 'Progreso confirmado', priority: 55 },
  hold: { tone: 'neutral', icon: '＝', label: 'Mantener', priority: 35 },
  reduce: { tone: 'warning', icon: '↓', label: 'Reducir carga', priority: 75 },
  plateau: { tone: 'warning', icon: '≈', label: 'Estancamiento', priority: 70 },
  timed: { tone: 'progress', icon: '◷', label: 'Aumentar tiempo', priority: 40 },
  bodyweight: { tone: 'progress', icon: '＋', label: 'Aumentar dificultad', priority: 40 }
};

function completedSets(exercise) {
  return (exercise?.sets || []).filter((set) => set.completed !== false);
}

function sessionDate(session) {
  return new Date(session?.finishedAt || session?.startedAt || 0);
}

function roundTo(value, step = 0.5) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value / step) * step;
}

function average(values, fallback = 0) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : fallback;
}

function percentageChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function estimatedOneRepMax(weight, reps) {
  const safeWeight = numberValue(weight);
  const safeReps = Math.max(1, Math.min(15, numberValue(reps, 1)));
  if (safeWeight <= 0) return 0;
  return safeWeight * (1 + safeReps / 30);
}

function exerciseIncrement(exercise, weight = 0) {
  const equipment = String(exercise?.equipment || '').toLowerCase();
  const muscle = String(exercise?.muscle || '').toLowerCase();
  const smallMuscle = /(bíceps|tríceps|hombro|antebrazo|gemelo)/.test(muscle);

  if (equipment.includes('peso corporal') && weight <= 0) return null;
  if (equipment.includes('mancuerna')) return smallMuscle ? 0.5 : 1;
  if (equipment.includes('barra')) return smallMuscle ? 1.25 : 2.5;
  if (equipment.includes('polea')) return smallMuscle ? 1 : 2.5;
  if (equipment.includes('máquina')) return smallMuscle ? 1 : 2.5;
  if (equipment.includes('kettlebell')) return 2;
  if (weight > 0) return smallMuscle ? 0.5 : 1;
  return null;
}

function performanceFromSession(session, exercise) {
  const sets = completedSets(exercise);
  if (!sets.length) return null;

  const weights = sets.map((set) => numberValue(set.weight)).filter((value) => value > 0);
  const reps = sets.map((set) => numberValue(set.reps)).filter((value) => value >= 0);
  const rirValues = sets
    .map((set) => String(set.rir ?? '').trim() === '' ? null : numberValue(set.rir))
    .filter(Number.isFinite);

  const weighted = weights.length > 0;
  const topWeight = weighted ? Math.max(...weights) : 0;
  const topWeightSets = weighted
    ? sets.filter((set) => numberValue(set.weight) === topWeight)
    : sets;
  const bestReps = topWeightSets.length
    ? Math.max(...topWeightSets.map((set) => numberValue(set.reps)))
    : Math.max(0, ...reps);
  const totalReps = reps.reduce((sum, value) => sum + value, 0);
  const volume = sets.reduce(
    (sum, set) => sum + numberValue(set.weight) * numberValue(set.reps),
    0
  );
  const e1rm = weighted
    ? Math.max(...sets.map((set) => estimatedOneRepMax(set.weight, set.reps)))
    : 0;
  const score = weighted ? e1rm : totalReps;

  return {
    sessionId: session.id,
    date: session.finishedAt || session.startedAt,
    exercise,
    sets,
    completedSets: sets.length,
    weights,
    reps,
    topWeight,
    bestReps,
    totalReps,
    volume,
    e1rm,
    averageRir: average(rirValues, 2),
    score,
    unit: exercise.unit || 'reps'
  };
}

export function exercisePerformances(history = [], exerciseId, limit = 12) {
  return [...history]
    .sort((a, b) => sessionDate(b) - sessionDate(a))
    .flatMap((session) => {
      const exercise = (session.exercises || []).find(
        (item) => item.exerciseId === exerciseId
      );
      const performance = exercise ? performanceFromSession(session, exercise) : null;
      return performance ? [performance] : [];
    })
    .slice(0, limit);
}

function readinessBlocksIncrease(readiness = {}) {
  return readiness.energy === 'low'
    || readiness.sleep === 'poor'
    || readiness.discomfort === 'mild';
}

function targetRangeText(target) {
  if (target.unit === 'sec') {
    return `${target.repMin}–${target.repMax} segundos`;
  }
  return `${target.repMin}–${target.repMax} repeticiones`;
}

function latestSetSummary(performance) {
  if (!performance) return 'Sin referencia anterior';
  return performance.sets
    .map((set) => {
      const weight = numberValue(set.weight);
      const reps = numberValue(set.reps);
      return weight > 0 ? `${weight} kg × ${reps}` : `${reps} ${performance.unit === 'sec' ? 's' : 'reps'}`;
    })
    .join(' · ');
}

export function buildExerciseProgression(
  history = [],
  target = {},
  customExercises = [],
  options = {}
) {
  const exercise = getExercise(target.exerciseId, customExercises);
  const performances = exercisePerformances(history, target.exerciseId, 8);
  const latest = performances[0] || null;
  const previous = performances[1] || null;
  const recentThree = performances.slice(0, 3);

  const repMin = Math.max(1, numberValue(target.repMin, latest?.exercise?.repMin || 8));
  const repMax = Math.max(repMin, numberValue(target.repMax, latest?.exercise?.repMax || 12));
  const targetSets = Math.max(1, numberValue(target.targetSets, latest?.exercise?.targetSets || 3));
  const unit = target.unit || latest?.unit || 'reps';
  const timed = unit === 'sec';
  const increment = exerciseIncrement(exercise, latest?.topWeight || 0);
  const confidence = Math.min(96, latest ? 44 + performances.length * 9 : 20);

  const base = {
    exerciseId: target.exerciseId,
    exerciseName: exercise.name,
    repMin,
    repMax,
    targetSets,
    unit,
    sessionsAnalyzed: performances.length,
    latest,
    previous,
    confidence,
    suggestedWeight: null,
    suggestedRepMin: repMin,
    suggestedRepMax: repMax,
    suggestedSets: targetSets,
    latestSummary: latestSetSummary(latest),
    rangeText: targetRangeText({ repMin, repMax, unit })
  };

  if (!latest) {
    return {
      ...base,
      status: 'baseline',
      ...STATUS_META.baseline,
      title: 'Crea una referencia limpia',
      text: `Elige una carga que permita completar ${targetSets} series de ${targetRangeText({ repMin, repMax, unit })} con 2–3 repeticiones posibles en reserva.`,
      nextGoal: 'Registra peso, repeticiones y reserva en todas las series.',
      evidence: ['Todavía no hay sesiones comparables'],
      progressPercent: 0
    };
  }

  const latestReps = latest.reps.slice(0, targetSets);
  const allAtTop = latest.completedSets >= targetSets
    && latestReps.length >= targetSets
    && latestReps.every((value) => value >= repMax);
  const allAtLeastMin = latest.completedSets >= targetSets
    && latestReps.length >= targetSets
    && latestReps.every((value) => value >= repMin);
  const belowMin = latest.completedSets < Math.max(1, targetSets - 1)
    || latest.reps.some((value) => value < repMin);
  const previousBelowMin = previous
    ? previous.completedSets < Math.max(1, targetSets - 1)
      || previous.reps.some((value) => value < repMin)
    : false;

  const scoreChange = previous
    ? percentageChange(latest.score, previous.score)
    : null;
  const volumeChange = previous
    ? percentageChange(latest.volume, previous.volume)
    : null;

  const plateau = recentThree.length >= 3 && (() => {
    const scores = recentThree.map((item) => item.score).filter((value) => value > 0);
    if (scores.length < 3) return false;
    const spread = (Math.max(...scores) - Math.min(...scores)) / Math.max(...scores);
    const sameLoad = recentThree.every((item) => item.topWeight === recentThree[0].topWeight);
    return spread <= 0.025 && (sameLoad || latest.topWeight === 0) && !allAtTop;
  })();

  const regression = Boolean(previous)
    && belowMin
    && ((scoreChange !== null && scoreChange <= -7)
      || (volumeChange !== null && volumeChange <= -12));

  const improved = Boolean(previous)
    && ((scoreChange !== null && scoreChange >= 2)
      || (volumeChange !== null && volumeChange >= 5)
      || (latest.topWeight === previous.topWeight && latest.totalReps > previous.totalReps));

  const blockedIncrease = readinessBlocksIncrease(options.readiness || {});

  let result;

  if (timed && allAtTop && !blockedIncrease) {
    const increase = repMax >= 60 ? 10 : 5;
    result = {
      status: 'timed',
      ...STATUS_META.timed,
      title: 'Aumenta el tiempo de trabajo',
      text: `Completaste todas las series en el máximo. Sube el objetivo a ${repMax + increase} segundos manteniendo la misma técnica.`,
      nextGoal: `${targetSets} series de ${repMin + increase}–${repMax + increase} segundos.`,
      suggestedRepMin: repMin + increase,
      suggestedRepMax: repMax + increase,
      progressPercent: 100
    };
  } else if (allAtTop && latest.averageRir >= 1 && latest.topWeight > 0 && increment && !blockedIncrease) {
    const suggestedWeight = roundTo(latest.topWeight + increment, increment);
    result = {
      status: 'increase',
      ...STATUS_META.increase,
      title: 'Sube la carga y reinicia el rango',
      text: `Completaste el máximo con margen. Prueba ${suggestedWeight} kg y vuelve a la parte baja del rango.`,
      nextGoal: `${targetSets} series de ${repMin}–${Math.min(repMax, repMin + 2)} repeticiones.`,
      suggestedWeight,
      suggestedRepMin: repMin,
      suggestedRepMax: Math.min(repMax, repMin + 2),
      progressPercent: 100
    };
  } else if (allAtTop && latest.topWeight <= 0 && !blockedIncrease) {
    result = {
      status: 'bodyweight',
      ...STATUS_META.bodyweight,
      title: 'Aumenta la dificultad',
      text: 'Has completado el máximo del rango. Añade una pausa, un recorrido mayor o una variante ligeramente más exigente.',
      nextGoal: `${targetSets} series cerca de ${repMin} repeticiones con la nueva dificultad.`,
      progressPercent: 100
    };
  } else if ((belowMin && previousBelowMin) || regression) {
    const suggestedWeight = latest.topWeight > 0
      ? roundTo(latest.topWeight * 0.95, increment || 0.5)
      : null;
    result = {
      status: 'reduce',
      ...STATUS_META.reduce,
      title: 'Recupera el rango antes de progresar',
      text: suggestedWeight
        ? `Dos señales recientes indican que la carga está limitando las series. Prueba ${suggestedWeight} kg.`
        : 'Las últimas series quedaron por debajo del rango. Reduce ligeramente la dificultad.',
      nextGoal: `Completa ${targetSets} series dentro de ${repMin}–${repMax} antes de volver a subir.`,
      suggestedWeight,
      progressPercent: 15
    };
  } else if (plateau) {
    result = {
      status: 'plateau',
      ...STATUS_META.plateau,
      title: 'Estancamiento suave detectado',
      text: 'Las tres últimas referencias son casi iguales. No cambies por cambiar: busca una mejora pequeña y medible.',
      nextGoal: `Suma 1–2 repeticiones totales, mejora el recorrido o usa una pausa controlada.`,
      suggestedWeight: latest.topWeight > 0 ? latest.topWeight : null,
      progressPercent: Math.min(85, Math.round((average(latestReps, repMin) - repMin) / Math.max(1, repMax - repMin) * 100))
    };
  } else if (blockedIncrease && allAtTop) {
    result = {
      status: 'hold',
      ...STATUS_META.hold,
      title: 'Consolida en lugar de subir hoy',
      text: 'El rendimiento permite progresar, pero el check-in aconseja mantener la carga y dejar margen técnico.',
      nextGoal: `Repite el rango con 2–3 repeticiones en reserva.`,
      suggestedWeight: latest.topWeight > 0 ? latest.topWeight : null,
      progressPercent: 90
    };
  } else if (allAtLeastMin) {
    const averageReps = average(latestReps, repMin);
    const nextFloor = Math.min(repMax, Math.max(repMin, Math.floor(averageReps)));
    const nextCeiling = Math.min(repMax, Math.max(nextFloor, Math.ceil(averageReps + 1)));
    result = {
      status: improved ? 'progress' : 'reps',
      ...(improved ? STATUS_META.progress : STATUS_META.reps),
      title: improved ? 'Progreso confirmado' : 'Mantén la carga y suma repeticiones',
      text: latest.topWeight > 0
        ? `Repite ${latest.topWeight} kg e intenta añadir una repetición total sin superar el esfuerzo previsto.`
        : 'Mantén la misma dificultad e intenta añadir una repetición total.',
      nextGoal: `${targetSets} series de ${nextFloor}–${nextCeiling} repeticiones.`,
      suggestedWeight: latest.topWeight > 0 ? latest.topWeight : null,
      suggestedRepMin: nextFloor,
      suggestedRepMax: nextCeiling,
      progressPercent: Math.min(95, Math.round((averageReps - repMin) / Math.max(1, repMax - repMin) * 100))
    };
  } else {
    result = {
      status: 'hold',
      ...STATUS_META.hold,
      title: 'Mantén la carga y completa el rango',
      text: latest.topWeight > 0
        ? `Repite ${latest.topWeight} kg y prioriza que todas las series alcancen el mínimo.`
        : 'Repite una dificultad similar y completa el mínimo de todas las series.',
      nextGoal: `${targetSets} series de al menos ${repMin} repeticiones.`,
      suggestedWeight: latest.topWeight > 0 ? latest.topWeight : null,
      progressPercent: 35
    };
  }

  return {
    ...base,
    ...result,
    scoreChange,
    volumeChange,
    evidence: [
      latestSummaryEvidence(latest, targetSets),
      previous
        ? `Cambio de rendimiento: ${formatSignedPercent(scoreChange)}`
        : 'Primera comparación disponible'
    ]
  };
}

function latestSummaryEvidence(latest, targetSets) {
  return `${latest.completedSets}/${targetSets} series · ${latest.totalReps} repeticiones totales · RIR medio ${Math.round(latest.averageRir * 10) / 10}`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return 'sin referencia';
  const rounded = Math.round(Math.abs(value));
  if (value > 0) return `+${rounded}%`;
  if (value < 0) return `−${rounded}%`;
  return '0%';
}

export function buildExerciseProgressionHistory(history = [], exerciseId, customExercises = []) {
  const exercise = getExercise(exerciseId, customExercises);
  const newestFirst = exercisePerformances(history, exerciseId, 12);
  const chronological = [...newestFirst].reverse();
  const weighted = newestFirst.some((item) => item.topWeight > 0);
  const values = chronological.map((item) => weighted ? item.e1rm : item.totalReps);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const spread = Math.max(1, max - min);
  const points = chronological.map((item, index) => ({
    x: chronological.length <= 1 ? 50 : 7 + (index / (chronological.length - 1)) * 86,
    y: 86 - ((weighted ? item.e1rm : item.totalReps) - min) / spread * 68,
    date: item.date,
    value: weighted ? item.e1rm : item.totalReps
  }));

  const bestWeight = newestFirst.length ? Math.max(...newestFirst.map((item) => item.topWeight)) : 0;
  const bestE1rm = newestFirst.length ? Math.max(...newestFirst.map((item) => item.e1rm)) : 0;
  const bestVolume = newestFirst.length ? Math.max(...newestFirst.map((item) => item.volume)) : 0;
  const latest = newestFirst[0] || null;
  const oldest = chronological[0] || null;
  const trendPercent = latest && oldest
    ? percentageChange(weighted ? latest.e1rm : latest.totalReps, weighted ? oldest.e1rm : oldest.totalReps)
    : null;

  let trend = 'Sin tendencia';
  let tone = 'neutral';
  if (Number.isFinite(trendPercent) && trendPercent >= 3) {
    trend = 'Mejorando';
    tone = 'success';
  } else if (Number.isFinite(trendPercent) && trendPercent <= -5) {
    trend = 'Bajando';
    tone = 'warning';
  } else if (newestFirst.length >= 2) {
    trend = 'Estable';
    tone = 'neutral';
  }

  return {
    exercise,
    performances: newestFirst,
    chronological,
    points,
    weighted,
    bestWeight,
    bestE1rm,
    bestVolume,
    trend,
    tone,
    trendPercent,
    lastDate: latest?.date || null
  };
}

export function buildProgressionDashboard(history = [], plan, customExercises = []) {
  const unique = new Map();
  for (const day of plan?.days || []) {
    for (const item of day.exercises || []) {
      if (!unique.has(item.exerciseId)) unique.set(item.exerciseId, item);
    }
  }

  const insights = [...unique.values()]
    .map((item) => buildExerciseProgression(history, item, customExercises))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return {
    total: insights.length,
    ready: insights.filter((item) => item.status === 'increase').length,
    improving: insights.filter((item) => ['progress', 'reps', 'timed', 'bodyweight'].includes(item.status)).length,
    attention: insights.filter((item) => ['plateau', 'reduce'].includes(item.status)).length,
    baseline: insights.filter((item) => item.status === 'baseline').length,
    top: insights.slice(0, 8)
  };
}

function recentSessionExerciseScores(history = [], limit = 8) {
  const map = new Map();
  for (const session of [...history].sort((a, b) => sessionDate(b) - sessionDate(a)).slice(0, limit)) {
    for (const exercise of session.exercises || []) {
      const performance = performanceFromSession(session, exercise);
      if (!performance) continue;
      if (!map.has(exercise.exerciseId)) map.set(exercise.exerciseId, []);
      map.get(exercise.exerciseId).push(performance);
    }
  }
  return map;
}

export function buildDeloadRecommendation(
  history = [],
  plan,
  profile = {},
  customExercises = []
) {
  const now = Date.now();
  const recent = [...history]
    .sort((a, b) => sessionDate(b) - sessionDate(a))
    .filter((session) => now - sessionDate(session).getTime() <= 21 * 86400000)
    .slice(0, 10);

  const lowReadiness = recent.filter((session) =>
    session.readiness?.energy === 'low'
    || session.readiness?.sleep === 'poor'
    || session.readiness?.discomfort === 'mild'
  ).length;

  const scores = recentSessionExerciseScores(recent);
  let regressions = 0;
  let repeatedPlateaus = 0;
  for (const performances of scores.values()) {
    if (performances.length < 2) continue;
    const change = percentageChange(performances[0].score, performances[1].score);
    if (Number.isFinite(change) && change <= -7) regressions += 1;
    if (performances.length >= 3) {
      const values = performances.slice(0, 3).map((item) => item.score).filter((value) => value > 0);
      if (values.length === 3) {
        const spread = (Math.max(...values) - Math.min(...values)) / Math.max(...values);
        if (spread <= 0.02) repeatedPlateaus += 1;
      }
    }
  }

  const weeklyGoal = Math.max(1, numberValue(profile?.days, plan?.days?.length || 3));
  const lastTenDays = recent.filter(
    (session) => now - sessionDate(session).getTime() <= 10 * 86400000
  ).length;
  const highDensity = lastTenDays >= Math.max(5, weeklyGoal * 2 - 1);

  let score = lowReadiness * 2 + regressions * 2 + repeatedPlateaus;
  if (highDensity) score += 2;

  const recommended = recent.length >= 4
    && (score >= 7
      || lowReadiness >= 3
      || regressions >= 3
      || (lowReadiness >= 2 && regressions >= 1));

  const reasons = [];
  if (lowReadiness) reasons.push(`${lowReadiness} sesiones recientes con energía, sueño o molestias desfavorables`);
  if (regressions) reasons.push(`${regressions} ejercicios con caída reciente de rendimiento`);
  if (repeatedPlateaus) reasons.push(`${repeatedPlateaus} tendencias estancadas`);
  if (highDensity) reasons.push(`${lastTenDays} sesiones durante los últimos 10 días`);

  return {
    recommended,
    score,
    severity: score >= 10 ? 'high' : score >= 7 ? 'medium' : 'low',
    recentSessions: recent.length,
    lowReadiness,
    regressions,
    repeatedPlateaus,
    highDensity,
    weightFactor: 0.9,
    setReduction: 1,
    reasons,
    title: recommended ? 'Descarga inteligente recomendada' : 'No hace falta una descarga',
    text: recommended
      ? 'Reduce aproximadamente un 10 % la carga y una serie por ejercicio durante esta sesión. La decisión es reversible.'
      : 'Las señales actuales no justifican reducir la sesión de forma general.'
  };
}

export function applyDeloadToWorkout(workout, recommendation) {
  const result = JSON.parse(JSON.stringify(workout));
  if (!result?.exercises?.length || !recommendation?.recommended) return result;

  result.exercises = result.exercises.map((exercise) => {
    const sets = [...exercise.sets];
    const hasCompleted = sets.some((set) => set.completed);
    let adjustedSets = sets;

    if (!hasCompleted && sets.length > 2 && recommendation.setReduction > 0) {
      adjustedSets = sets.slice(0, Math.max(2, sets.length - recommendation.setReduction));
    }

    adjustedSets = adjustedSets.map((set) => {
      if (set.completed) return set;
      const weight = numberValue(set.weight);
      return {
        ...set,
        weight: weight > 0
          ? roundTo(weight * recommendation.weightFactor, 0.5)
          : set.weight
      };
    });

    return {
      ...exercise,
      targetSets: adjustedSets.length,
      sets: adjustedSets
    };
  });

  result.deload = {
    applied: true,
    appliedAt: new Date().toISOString(),
    weightFactor: recommendation.weightFactor,
    setReduction: recommendation.setReduction,
    reasons: recommendation.reasons
  };
  return result;
}
