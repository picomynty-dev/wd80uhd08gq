'use strict';

import {
  completedSets,
  exerciseVolume,
  sessionsThisWeek
} from './stats.js?v=47';
import { getExercise } from './exercises.js?v=47';
import {
  numberValue,
  startOfWeek
} from './utils.js?v=47';

const STATUS_PRIORITY = {
  reduce: 100,
  plateau: 90,
  increase: 80,
  progress: 70,
  build: 55,
  baseline: 25
};

const STATUS_META = {
  reduce: { tone: 'warning', icon: '↓', label: 'Revisar carga' },
  plateau: { tone: 'attention', icon: '≈', label: 'Estancamiento' },
  increase: { tone: 'success', icon: '↗', label: 'Subir carga' },
  progress: { tone: 'success', icon: '+', label: 'Progreso' },
  build: { tone: 'neutral', icon: '→', label: 'Consolidar' },
  baseline: { tone: 'neutral', icon: '◎', label: 'Crear referencia' }
};

function performanceSummary(session, exercise) {
  const sets = completedSets(exercise);
  if (!sets.length) return null;

  const weights = sets.map((set) => numberValue(set.weight)).filter((value) => value > 0);
  const reps = sets.map((set) => numberValue(set.reps)).filter((value) => value >= 0);
  const rirs = sets
    .map((set) => set.rir === '' || set.rir === null || set.rir === undefined ? null : numberValue(set.rir))
    .filter((value) => value !== null);

  const topWeight = weights.length ? Math.max(...weights) : 0;
  const bestSet = [...sets].sort((a, b) => {
    const weightDifference = numberValue(b.weight) - numberValue(a.weight);
    if (weightDifference) return weightDifference;
    return numberValue(b.reps) - numberValue(a.reps);
  })[0];

  const bestWeight = numberValue(bestSet?.weight);
  const bestReps = numberValue(bestSet?.reps);
  const performanceIndex = bestWeight > 0
    ? bestWeight * (1 + bestReps / 30)
    : reps.reduce((sum, value) => sum + value, 0);

  return {
    sessionId: session.id,
    sessionName: session.name,
    date: session.finishedAt || session.startedAt,
    exercise,
    completedSets: sets.length,
    targetSets: Math.max(1, numberValue(exercise.targetSets, sets.length)),
    reps,
    totalReps: reps.reduce((sum, value) => sum + value, 0),
    minReps: reps.length ? Math.min(...reps) : 0,
    maxReps: reps.length ? Math.max(...reps) : 0,
    topWeight,
    bestReps,
    averageRir: rirs.length ? rirs.reduce((sum, value) => sum + value, 0) / rirs.length : 2,
    volume: exerciseVolume(exercise),
    performanceIndex,
    completionRatio: sets.length / Math.max(1, numberValue(exercise.targetSets, sets.length))
  };
}

export function exercisePerformances(history = [], exerciseId, limit = 6) {
  return [...history]
    .sort((a, b) => new Date(b.finishedAt || b.startedAt) - new Date(a.finishedAt || a.startedAt))
    .map((session) => {
      const exercise = session.exercises?.find((item) => item.exerciseId === exerciseId);
      return exercise ? performanceSummary(session, exercise) : null;
    })
    .filter(Boolean)
    .slice(0, limit);
}

function loadIncrement(exerciseData, baseWeight) {
  if (!baseWeight) return 0;
  const muscle = String(exerciseData.muscle || '').toLowerCase();
  const equipment = String(exerciseData.equipment || '').toLowerCase();

  if (equipment.includes('peso corporal')) return 0;
  if (equipment.includes('mancuerna')) return 1;
  if (/(bíceps|tríceps|hombro|antebrazo)/.test(muscle)) return 1;
  if (equipment.includes('barra')) return 2.5;
  if (equipment.includes('polea')) return 2.5;
  if (equipment.includes('máquina') && /(pierna|cuádriceps|glúteo|isquio)/.test(muscle)) return 5;
  if (equipment.includes('máquina')) return 2.5;
  return 2.5;
}

function roundToIncrement(value, increment = 0.5) {
  if (!increment) return Math.round(value * 2) / 2;
  return Math.round(value / increment) * increment;
}

function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function performanceEvidence(latest, previous) {
  if (!latest) return [];
  const evidence = [
    `${latest.completedSets} series completadas`,
    latest.topWeight > 0
      ? `${formatNumber(latest.topWeight)} kg como carga más alta`
      : `${latest.totalReps} repeticiones o segundos totales`
  ];
  if (previous) {
    const volumeChange = percentChange(latest.volume, previous.volume);
    if (Number.isFinite(volumeChange)) evidence.push(`${signedPercent(volumeChange)} de volumen frente a la sesión anterior`);
  }
  return evidence;
}

export function analyzeExerciseTrend(history = [], exercise, customExercises = []) {
  const exerciseData = getExercise(exercise.exerciseId, customExercises);
  const performances = exercisePerformances(history, exercise.exerciseId, 6);
  const latest = performances[0] || null;
  const previous = performances[1] || null;
  const recentThree = performances.slice(0, 3);
  const repMin = Math.max(1, numberValue(exercise.repMin, latest?.exercise?.repMin || 8));
  const repMax = Math.max(repMin, numberValue(exercise.repMax, latest?.exercise?.repMax || 12));
  const targetSets = Math.max(1, numberValue(exercise.targetSets, latest?.targetSets || 3));
  const increment = loadIncrement(exerciseData, latest?.topWeight || 0);
  const confidence = Math.min(96, 34 + performances.length * 14);

  if (!latest) {
    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exerciseData.name,
      status: 'baseline',
      ...STATUS_META.baseline,
      priority: STATUS_PRIORITY.baseline,
      title: 'Crea una referencia limpia',
      text: `Elige una carga que te permita completar ${targetSets} series dentro de ${repMin}–${repMax} repeticiones, dejando aproximadamente 2 repeticiones posibles en reserva.`,
      nextGoal: 'Registra todas las series para poder analizar la próxima sesión.',
      suggestedWeight: null,
      confidence: 20,
      sessionsAnalyzed: 0,
      latest: null,
      previous: null,
      evidence: ['Todavía no hay sesiones comparables']
    };
  }

  const latestReachedTop = latest.completedSets >= targetSets
    && latest.reps.length >= targetSets
    && latest.reps.slice(0, targetSets).every((value) => value >= repMax);
  const latestBelowMin = latest.reps.some((value) => value < repMin)
    || latest.completedSets < Math.max(1, targetSets - 1);
  const previousBelowMin = previous
    ? previous.reps.some((value) => value < repMin)
      || previous.completedSets < Math.max(1, targetSets - 1)
    : false;

  const currentIndex = latest.performanceIndex;
  const previousIndex = previous?.performanceIndex || 0;
  const indexChange = previous ? percentChange(currentIndex, previousIndex) : null;
  const volumeChange = previous ? percentChange(latest.volume, previous.volume) : null;

  const plateau = recentThree.length >= 3
    && (() => {
      const values = recentThree.map((item) => item.performanceIndex).filter((value) => value > 0);
      if (values.length < 3) return false;
      const spread = (Math.max(...values) - Math.min(...values)) / Math.max(...values);
      const sameTopWeight = Math.max(...recentThree.map((item) => item.topWeight))
        === Math.min(...recentThree.map((item) => item.topWeight));
      return spread <= 0.025 && sameTopWeight && !latestReachedTop;
    })();

  const regression = Boolean(previous)
    && ((indexChange !== null && indexChange <= -7)
      || (volumeChange !== null && volumeChange <= -12))
    && latestBelowMin;

  const improved = Boolean(previous)
    && ((indexChange !== null && indexChange >= 2)
      || (volumeChange !== null && volumeChange >= 5)
      || (latest.topWeight === previous.topWeight && latest.totalReps > previous.totalReps));

  let result;

  if (latestReachedTop && latest.averageRir >= 1) {
    const suggestedWeight = increment
      ? roundToIncrement(latest.topWeight + increment, increment)
      : null;
    result = {
      status: 'increase',
      title: increment ? 'Preparado para subir carga' : 'Preparado para aumentar dificultad',
      text: increment
        ? `Completaste el máximo del rango con margen técnico. Prueba ${formatNumber(suggestedWeight)} kg y vuelve a construir desde la parte baja del rango.`
        : 'Completaste el máximo del rango. Aumenta ligeramente la dificultad, el tiempo o las repeticiones sin perder la postura.',
      nextGoal: increment
        ? `${targetSets} series de ${repMin}–${Math.min(repMin + 2, repMax)} repeticiones con la nueva carga.`
        : `Mantén el control y empieza de nuevo cerca de ${repMin} repeticiones.`,
      suggestedWeight
    };
  } else if ((latestBelowMin && previousBelowMin) || regression) {
    const suggestedWeight = latest.topWeight > 0
      ? roundToIncrement(latest.topWeight * 0.95, increment || 0.5)
      : null;
    result = {
      status: 'reduce',
      title: 'Conviene recuperar control',
      text: suggestedWeight
        ? `Dos señales recientes indican que la carga puede estar limitando el rango. Prueba aproximadamente ${formatNumber(suggestedWeight)} kg y prioriza series completas.`
        : 'Las últimas series quedaron por debajo del rango. Reduce ligeramente la dificultad y prioriza una ejecución estable.',
      nextGoal: `Completa al menos ${targetSets} series dentro de ${repMin}–${repMax} repeticiones antes de volver a subir.`,
      suggestedWeight
    };
  } else if (plateau) {
    result = {
      status: 'plateau',
      title: 'Estancamiento suave detectado',
      text: 'Las tres últimas referencias son muy parecidas. Mantén la carga y busca una mejora pequeña y medible antes de modificar el ejercicio.',
      nextGoal: `Suma 1–2 repeticiones totales o mejora el control del recorrido durante la próxima sesión.`,
      suggestedWeight: latest.topWeight || null
    };
  } else if (improved) {
    result = {
      status: 'progress',
      title: 'Progreso confirmado',
      text: latest.topWeight > (previous?.topWeight || 0)
        ? `Has aumentado la carga manteniendo una referencia útil. Consolida ${formatNumber(latest.topWeight)} kg antes del siguiente salto.`
        : 'Has mejorado repeticiones o volumen frente a la sesión anterior. Mantén la carga y deja que la progresión continúe.',
      nextGoal: latestReachedTop
        ? 'Repite una sesión sólida antes de aumentar la carga.'
        : `Intenta añadir 1 repetición total sin superar el esfuerzo previsto.`,
      suggestedWeight: latest.topWeight || null
    };
  } else {
    result = {
      status: 'build',
      title: 'Mantén la carga y suma calidad',
      text: latest.topWeight > 0
        ? `Repite ${formatNumber(latest.topWeight)} kg e intenta mejorar una repetición total, el recorrido o la estabilidad.`
        : 'Repite una dificultad similar y busca una mejora pequeña sin sacrificar la técnica.',
      nextGoal: `Acércate gradualmente a ${repMax} repeticiones en todas las series.`,
      suggestedWeight: latest.topWeight || null
    };
  }

  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exerciseData.name,
    ...result,
    ...STATUS_META[result.status],
    priority: STATUS_PRIORITY[result.status],
    confidence,
    sessionsAnalyzed: performances.length,
    latest,
    previous,
    metrics: {
      weight: latest.topWeight,
      totalReps: latest.totalReps,
      completedSets: latest.completedSets,
      targetSets,
      averageRir: latest.averageRir,
      volumeChange,
      indexChange
    },
    evidence: performanceEvidence(latest, previous)
  };
}

export function progressionRecommendation(history = [], exercise, customExercises = []) {
  const insight = analyzeExerciseTrend(history, exercise, customExercises);
  return {
    tone: insight.tone,
    title: insight.title,
    text: insight.text,
    suggestedWeight: insight.suggestedWeight,
    status: insight.status,
    confidence: insight.confidence,
    nextGoal: insight.nextGoal
  };
}

export function buildWeeklyCoachSummary(history = [], plan, profile, customExercises = []) {
  const start = startOfWeek();
  const currentSessions = sessionsThisWeek(history);
  const previousHistory = history.filter((session) => new Date(session.finishedAt || session.startedAt) < start);
  const goal = Math.max(1, numberValue(profile?.days, plan?.days?.length || 3));
  const currentByExercise = new Map();

  for (const session of [...currentSessions].sort((a, b) => new Date(b.finishedAt || b.startedAt) - new Date(a.finishedAt || a.startedAt))) {
    for (const exercise of session.exercises || []) {
      if (!currentByExercise.has(exercise.exerciseId)) currentByExercise.set(exercise.exerciseId, { session, exercise });
    }
  }

  let improvedExercises = 0;
  let strongest = null;
  const muscleCounts = new Map();

  for (const [exerciseId, current] of currentByExercise) {
    const data = getExercise(exerciseId, customExercises);
    muscleCounts.set(data.muscle, (muscleCounts.get(data.muscle) || 0) + 1);

    const currentSummary = performanceSummary(current.session, current.exercise);
    const previousPerformance = exercisePerformances(previousHistory, exerciseId, 1)[0];
    if (!currentSummary || !previousPerformance) continue;

    const change = percentChange(currentSummary.performanceIndex, previousPerformance.performanceIndex);
    const volumeChange = percentChange(currentSummary.volume, previousPerformance.volume);
    const improved = (change !== null && change >= 2)
      || (volumeChange !== null && volumeChange >= 5)
      || (currentSummary.topWeight === previousPerformance.topWeight
        && currentSummary.totalReps > previousPerformance.totalReps);

    if (improved) {
      improvedExercises += 1;
      const effectiveChange = Math.max(change || 0, volumeChange || 0);
      if (!strongest || effectiveChange > strongest.change) {
        strongest = { exerciseId, name: data.name, change: effectiveChange };
      }
    }
  }

  const plannedMuscles = new Set();
  for (const day of plan?.days || []) {
    for (const exercise of day.exercises || []) {
      plannedMuscles.add(getExercise(exercise.exerciseId, customExercises).muscle);
    }
  }

  const leastWorked = [...plannedMuscles]
    .map((muscle) => ({ muscle, count: muscleCounts.get(muscle) || 0 }))
    .sort((a, b) => a.count - b.count || a.muscle.localeCompare(b.muscle, 'es'))[0] || null;

  const records = currentSessions.reduce((sum, session) => sum + (session.prs?.length || 0), 0);
  const adherence = Math.min(100, Math.round((currentSessions.length / goal) * 100));
  const totalMinutes = Math.round(currentSessions.reduce((sum, session) => sum + numberValue(session.durationSeconds), 0) / 60);

  let recommendation;
  if (!currentSessions.length) {
    recommendation = 'Empieza con la próxima sesión del plan y registra todas las series para obtener recomendaciones útiles.';
  } else if (currentSessions.length >= goal && improvedExercises > 0) {
    recommendation = 'La estructura actual está funcionando. Mantén el plan y prioriza la recuperación antes de añadir más volumen.';
  } else if (currentSessions.length >= goal) {
    recommendation = 'Has cumplido la semana. Mantén la estructura y busca mejoras pequeñas antes de cambiar ejercicios.';
  } else {
    const pending = goal - currentSessions.length;
    recommendation = pending === 1
      ? 'Te queda una sesión para completar el objetivo semanal.'
      : `Te quedan ${pending} sesiones para completar el objetivo semanal.`;
  }

  return {
    sessions: currentSessions.length,
    goal,
    adherence,
    improvedExercises,
    records,
    strongest,
    leastWorked,
    totalMinutes,
    recommendation
  };
}

export function buildCoachDashboard(history = [], plan, nextWorkoutIndex = 0, profile = {}, customExercises = []) {
  const days = plan?.days || [];
  const nextDay = days.length ? days[nextWorkoutIndex % days.length] : null;
  const insights = (nextDay?.exercises || [])
    .map((exercise) => analyzeExerciseTrend(history, exercise, customExercises))
    .sort((a, b) => b.priority - a.priority || b.confidence - a.confidence);
  const primary = insights[0] || null;
  const weekly = buildWeeklyCoachSummary(history, plan, profile, customExercises);

  const attentionCount = insights.filter((item) => ['reduce', 'plateau'].includes(item.status)).length;
  const progressCount = insights.filter((item) => ['increase', 'progress'].includes(item.status)).length;
  const analysedCount = insights.filter((item) => item.sessionsAnalyzed > 0).length;
  const averageConfidence = analysedCount
    ? Math.round(insights.filter((item) => item.sessionsAnalyzed > 0).reduce((sum, item) => sum + item.confidence, 0) / analysedCount)
    : 20;

  let tone = 'neutral';
  let headline = 'Construyendo tus referencias';
  let description = nextDay
    ? `La próxima sesión es ${nextDay.name}. Registra todas las series para que el análisis sea cada vez más preciso.`
    : 'Crea una rutina para recibir recomendaciones sobre tu próxima sesión.';

  if (primary?.status === 'reduce' || primary?.status === 'plateau') {
    tone = 'attention';
    headline = 'Hay un punto que merece atención';
    description = `${primary.exerciseName}: ${primary.text}`;
  } else if (primary?.status === 'increase') {
    tone = 'success';
    headline = 'Tienes margen para progresar';
    description = `${primary.exerciseName}: ${primary.text}`;
  } else if (progressCount > 0) {
    tone = 'success';
    headline = 'La tendencia es positiva';
    description = `${progressCount} ejercicio${progressCount === 1 ? '' : 's'} de la próxima sesión muestran señales de progreso.`;
  } else if (analysedCount > 0) {
    headline = 'Próxima sesión bien encaminada';
    description = primary ? `${primary.exerciseName}: ${primary.text}` : description;
  }

  return {
    tone,
    headline,
    description,
    nextDay,
    primary,
    insights,
    weekly,
    attentionCount,
    progressCount,
    analysedCount,
    confidence: averageConfidence,
    confidenceLabel: averageConfidence >= 75 ? 'Alta' : averageConfidence >= 50 ? 'Media' : 'Inicial'
  };
}

export function analyzeCompletedSession(history = [], session, customExercises = []) {
  const insights = (session?.exercises || [])
    .map((exercise) => analyzeExerciseTrend(history, exercise, customExercises))
    .sort((a, b) => b.priority - a.priority);
  const positive = insights.filter((item) => ['increase', 'progress'].includes(item.status));
  const attention = insights.filter((item) => ['reduce', 'plateau'].includes(item.status));
  const primary = attention[0] || positive[0] || insights[0] || null;

  return {
    primary,
    positiveCount: positive.length,
    attentionCount: attention.length,
    headline: attention.length
      ? 'La sesión deja un ajuste importante'
      : positive.length
        ? 'La sesión confirma progreso'
        : 'La sesión ya forma parte de tu tendencia'
  };
}

function signedPercent(value) {
  if (!Number.isFinite(value)) return 'sin comparación';
  const rounded = Math.round(Math.abs(value));
  if (value > 0) return `+${rounded}%`;
  if (value < 0) return `−${rounded}%`;
  return '0%';
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(numberValue(value));
}
