'use strict';

import { getAllExercises, getExercise } from './exercises.js?v=41';
import { normalizeText } from './utils.js?v=41';

const MOVEMENT_LABELS = {
  press_horizontal: 'Empuje horizontal',
  'press horizontal': 'Empuje horizontal',
  press_vertical: 'Empuje vertical',
  'press vertical': 'Empuje vertical',
  fly: 'Apertura de pecho',
  row: 'Tirón horizontal',
  pull_vertical: 'Tirón vertical',
  'pull vertical': 'Tirón vertical',
  squat: 'Dominante de rodilla',
  lunge: 'Trabajo unilateral',
  hinge: 'Bisagra de cadera',
  knee_flexion: 'Flexión de rodilla',
  'knee flexion': 'Flexión de rodilla',
  hip_extension: 'Extensión de cadera',
  'hip extension': 'Extensión de cadera',
  abduction: 'Abducción',
  adduction: 'Aducción',
  calf: 'Trabajo de gemelo',
  curl: 'Flexión de codo',
  triceps_extension: 'Extensión de codo',
  'triceps extension': 'Extensión de codo',
  core_anti_extension: 'Estabilidad del core',
  'core anti extension': 'Estabilidad del core',
  core_flexion: 'Flexión del tronco',
  'core flexion': 'Flexión del tronco',
  raise: 'Elevación de hombro',
  cardio: 'Trabajo cardiovascular',
  full_body: 'Movimiento global',
  'full body': 'Movimiento global'
};

const CATEGORY_RULES = [
  [/press|empuje horizontal|flexion|fondo/, 'Empuje horizontal'],
  [/militar|empuje vertical|press vertical|hombro en maquina/, 'Empuje vertical'],
  [/remo|tiron horizontal/, 'Tirón horizontal'],
  [/jalon|dominada|tiron vertical|pullover/, 'Tirón vertical'],
  [/sentadilla|prensa|dominante de rodilla|extension de rodilla/, 'Dominante de rodilla'],
  [/zancada|unilateral|step|subida/, 'Trabajo unilateral'],
  [/peso muerto|bisagra|rumano|buenos dias/, 'Bisagra de cadera'],
  [/hip thrust|puente|extension de cadera|patada de gluteo/, 'Extensión de cadera'],
  [/curl femoral|flexion de rodilla/, 'Flexión de rodilla'],
  [/abduccion/, 'Abducción'],
  [/aduccion/, 'Aducción'],
  [/gemelo|pantorrilla|calf/, 'Trabajo de gemelo'],
  [/curl|flexion de codo/, 'Flexión de codo'],
  [/triceps|extension de codo/, 'Extensión de codo'],
  [/apertura|fly|pajaro|face pull/, 'Apertura y estabilidad del hombro'],
  [/plancha|pallof|bird dog|dead bug|estabilidad/, 'Estabilidad del core'],
  [/crunch|flexion del tronco/, 'Flexión del tronco'],
  [/cardio|cinta|bicicleta|eliptica|ergometro/, 'Cardio'],
];

function broadMuscle(muscle = '') {
  const value = normalizeText(muscle);
  if (/(pecho|triceps|hombro)/.test(value)) return 'empuje';
  if (/(espalda|biceps|antebrazo)/.test(value)) return 'tirón';
  if (/(cuadriceps|isquio|gluteo|gemelo|aductor)/.test(value)) return 'pierna';
  if (/(core|abdominal|lumbar)/.test(value)) return 'core';
  return value;
}

export function movementCategory(exercise = {}) {
  const raw = normalizeText(`${exercise.movementType || ''} ${exercise.movement || ''} ${exercise.name || ''}`);
  const direct = MOVEMENT_LABELS[normalizeText(exercise.movementType || exercise.movement || '')];
  if (direct) return direct;
  return CATEGORY_RULES.find(([pattern]) => pattern.test(raw))?.[1] || 'Otros movimientos';
}

export function movementOptions(exercises = {}) {
  return [...new Set(Object.values(exercises).map(movementCategory))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export function equipmentAvailable(exercise = {}, profile = {}) {
  const selected = new Set((profile.equipment || []).map(normalizeText));
  if (!selected.size) return true;
  const equipment = normalizeText(exercise.equipment || '');
  if (equipment.includes('peso corporal') || equipment.includes('sin especificar')) return true;
  if ([...selected].some((item) => equipment.includes(item) || item.includes(equipment))) return true;
  if (equipment.includes('banco') && ([...selected].some((item) => item.includes('barra') || item.includes('mancuerna')))) return true;
  return false;
}

export function exerciseQuality(exercise = {}) {
  let score = 0;
  if (exercise.summary) score += 15;
  if ((exercise.steps || []).length >= 3) score += 20;
  if ((exercise.mistakes || []).length >= 2) score += 15;
  if ((exercise.primaryMuscles || []).length) score += 10;
  if (exercise.movement || exercise.movementType) score += 10;
  if (exercise.breathing) score += 8;
  if (exercise.tempo) score += 8;
  if ((exercise.tips || []).length) score += 7;
  if (exercise.media?.video) score += 7;
  score = Math.min(100, score);
  return {
    score,
    label: score >= 88 ? 'Ficha completa' : score >= 70 ? 'Ficha revisada' : 'Ficha básica',
    tone: score >= 88 ? 'success' : score >= 70 ? 'neutral' : 'attention'
  };
}

function defaultBreathing(category) {
  if (/Empuje|Extensión|Dominante|Tirón/.test(category)) return 'Toma aire en la fase de preparación y expúlsalo mientras completas la parte más exigente.';
  if (/Core|tronco/.test(category)) return 'Respira de forma corta y controlada sin perder la tensión del abdomen.';
  return 'Mantén una respiración fluida y evita bloquear el aire durante demasiadas repeticiones.';
}

function defaultTempo(category) {
  if (/Cardio/.test(category)) return 'Ritmo estable que permita mantener la postura.';
  if (/Core|estabilidad/.test(category)) return 'Movimiento lento o posición estable, sin rebotes.';
  return 'Bajada controlada de 2–3 segundos y subida firme sin impulso.';
}

function categoryCues(category, exercise) {
  const name = normalizeText(exercise.name || '');
  const cues = [];
  if (/Empuje horizontal/.test(category)) cues.push('Escápulas estables', 'Muñecas alineadas', 'No rebotes la carga');
  else if (/Empuje vertical/.test(category)) cues.push('Costillas controladas', 'Codos bajo la carga', 'No arquees en exceso');
  else if (/Tirón horizontal/.test(category)) cues.push('Pecho estable', 'Lleva los codos atrás', 'No encogas los hombros');
  else if (/Tirón vertical/.test(category)) cues.push('Pecho alto', 'Codos hacia abajo', 'No tires con impulso');
  else if (/Dominante de rodilla/.test(category)) cues.push('Rodillas siguen la punta del pie', 'Apoya todo el pie', 'Controla la profundidad');
  else if (/Bisagra/.test(category)) cues.push('Cadera hacia atrás', 'Espalda neutra', 'Carga cerca del cuerpo');
  else if (/Extensión de cadera/.test(category)) cues.push('Costillas abajo', 'Aprieta glúteos arriba', 'No hiperextiendas la espalda');
  else if (/Flexión de codo/.test(category)) cues.push('Codos quietos', 'Recorrido completo', 'Sin balanceo');
  else if (/Extensión de codo/.test(category)) cues.push('Hombros estables', 'Extiende sin lanzar', 'Controla el regreso');
  else if (/Core|tronco/.test(category)) cues.push('Pelvis controlada', 'Respira sin perder tensión', 'No compenses con la espalda');
  else cues.push('Postura estable', 'Recorrido controlado', 'Detente si pierdes técnica');
  if (name.includes('unilateral') || name.includes('una pierna') || name.includes('un brazo')) cues[2] = 'Iguala ambos lados';
  return cues.slice(0, 3);
}

export function coachingProfile(exercise = {}) {
  const category = movementCategory(exercise);
  const steps = [...(exercise.steps || [])];
  const setup = steps[0] || 'Colócate en una posición estable y ajusta el material antes de empezar.';
  const execution = steps[1] || exercise.summary || 'Realiza el movimiento con control y un recorrido cómodo.';
  const finish = steps[2] || 'Regresa a la posición inicial sin perder la postura.';
  return {
    category,
    setup,
    execution,
    finish,
    breathing: exercise.breathing || defaultBreathing(category),
    tempo: exercise.tempo || defaultTempo(category),
    cues: [...new Set([...(exercise.tips || []), ...categoryCues(category, exercise)])].slice(0, 4),
    mistakes: (exercise.mistakes || []).slice(0, 5)
  };
}

function levelDistance(a = '', b = '') {
  const order = { principiante: 0, intermedio: 1, avanzado: 2 };
  return Math.abs((order[normalizeText(a)] ?? 1) - (order[normalizeText(b)] ?? 1));
}

function overlapCount(a = [], b = []) {
  const second = new Set(b.map(normalizeText));
  return a.map(normalizeText).filter((item) => second.has(item)).length;
}

function substituteReason(source, candidate, sameMovement, sameMuscle, available) {
  if (sameMovement && sameMuscle && candidate.equipment !== source.equipment) {
    return `Mismo patrón y músculo con ${candidate.equipment.toLowerCase()}.`;
  }
  if (sameMovement && sameMuscle) return 'Mantiene el mismo patrón y el objetivo muscular.';
  if (sameMuscle && available) return `Trabaja ${source.muscle.toLowerCase()} con material disponible.`;
  if (sameMovement) return 'Conserva el patrón de movimiento con un énfasis muscular parecido.';
  return 'Alternativa compatible para mantener el objetivo general de la sesión.';
}

export function rankExerciseSubstitutes(sourceId, customExercises = [], profile = {}, options = {}) {
  const all = getAllExercises(customExercises);
  const source = getExercise(sourceId, customExercises);
  const sourceMovement = movementCategory(source);
  const sourceBroad = broadMuscle(source.muscle);
  const staticAlternatives = new Set(source.alternatives || []);
  const excluded = new Set([sourceId, ...(options.excludeIds || [])]);

  return Object.entries(all)
    .filter(([id]) => !excluded.has(id))
    .map(([id, candidate]) => {
      const candidateMovement = movementCategory(candidate);
      const sameMovement = candidateMovement === sourceMovement;
      const sameMuscle = candidate.muscle === source.muscle;
      const sameBroad = broadMuscle(candidate.muscle) === sourceBroad;
      const available = equipmentAvailable(candidate, profile);
      const primaryOverlap = overlapCount(source.primaryMuscles || [], candidate.primaryMuscles || []);
      let score = 0;
      if (sameMovement) score += 38;
      if (sameMuscle) score += 34;
      else if (sameBroad) score += 16;
      score += primaryOverlap * 8;
      if (available) score += 12;
      else score -= 18;
      if (candidate.equipment !== source.equipment) score += 4;
      score -= levelDistance(source.level, candidate.level) * 7;
      if (staticAlternatives.has(id)) score += 20;
      if (candidate.media?.video) score += 2;
      return {
        id,
        exercise: candidate,
        score,
        available,
        sameMovement,
        sameMuscle,
        reason: source.alternativeReasons?.[id] || substituteReason(source, candidate, sameMovement, sameMuscle, available)
      };
    })
    .filter((item) => item.score >= 28)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'es'))
    .slice(0, options.limit || 8);
}

export function deduplicateExerciseEntries(entries = []) {
  const seen = new Set();
  return entries.filter(([id, exercise]) => {
    const key = normalizeText(`${exercise.name}|${exercise.equipment}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function libraryQualitySummary(exercises = {}, profile = {}) {
  const values = Object.values(exercises);
  return {
    total: values.length,
    animated: values.filter((item) => item.media?.video).length,
    available: values.filter((item) => equipmentAvailable(item, profile)).length,
    complete: values.filter((item) => exerciseQuality(item).score >= 88).length
  };
}
