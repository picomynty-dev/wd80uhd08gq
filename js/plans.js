import { clone, uid } from './utils.js?v=43';

const DAY_LIBRARY = {
  fullBodyBase: { name: 'Fuerza total · Base', focus: 'Cuerpo completo', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
  fullBodyProgress: { name: 'Fuerza total · Progresión', focus: 'Cuerpo completo', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] },
  push: { name: 'Pecho, hombros y tríceps', focus: 'Empuje', exercises: ['barbell_bench_press', 'incline_dumbbell_press', 'shoulder_press', 'lateral_raise', 'triceps_pushdown', 'overhead_triceps'] },
  pull: { name: 'Espalda y bíceps', focus: 'Tirón', exercises: ['lat_pulldown', 'seated_row', 'one_arm_row', 'face_pull', 'biceps_curl', 'hammer_curl'] },
  legs: { name: 'Pierna completa', focus: 'Pierna', exercises: ['leg_press', 'romanian_deadlift', 'leg_extension', 'leg_curl', 'calf_raise', 'plank'] },
  chestTriceps: { name: 'Pecho y tríceps', focus: 'Pecho', exercises: ['barbell_bench_press', 'incline_dumbbell_press', 'chest_press', 'cable_fly', 'triceps_pushdown', 'overhead_triceps'] },
  backBiceps: { name: 'Espalda y bíceps', focus: 'Espalda', exercises: ['lat_pulldown', 'seated_row', 'one_arm_row', 'straight_arm_pulldown', 'biceps_curl', 'hammer_curl'] },
  legsGlutes: { name: 'Pierna y glúteos', focus: 'Pierna', exercises: ['leg_press', 'romanian_deadlift', 'hip_thrust', 'leg_extension', 'leg_curl', 'calf_raise'] },
  shouldersArms: { name: 'Hombros y brazos', focus: 'Brazos', exercises: ['shoulder_press', 'lateral_raise', 'face_pull', 'biceps_curl', 'triceps_pushdown', 'hammer_curl'] },
  chest: { name: 'Pecho · Fuerza e hipertrofia', focus: 'Pecho', exercises: ['barbell_bench_press', 'incline_dumbbell_press', 'chest_press', 'cable_fly', 'push_up', 'triceps_pushdown'] },
  back: { name: 'Espalda · Amplitud y densidad', focus: 'Espalda', exercises: ['lat_pulldown', 'seated_row', 'one_arm_row', 'chest_supported_row', 'straight_arm_pulldown', 'face_pull'] },
  legStrength: { name: 'Pierna · Fuerza completa', focus: 'Pierna', exercises: ['leg_press', 'goblet_squat', 'romanian_deadlift', 'leg_extension', 'leg_curl', 'calf_raise'] },
  arms: { name: 'Brazos · Bíceps y tríceps', focus: 'Brazos', exercises: ['biceps_curl', 'hammer_curl', 'cable_curl', 'triceps_pushdown', 'overhead_triceps', 'bench_dip'] },
  gluteHam: { name: 'Glúteos e isquios', focus: 'Glúteos', exercises: ['hip_thrust', 'romanian_deadlift', 'leg_curl', 'split_squat', 'hip_abduction', 'dead_bug'] },
  upperStrength: { name: 'Tren superior · Fuerza', focus: 'Torso', exercises: ['barbell_bench_press', 'lat_pulldown', 'shoulder_press', 'seated_row', 'biceps_curl', 'triceps_pushdown'] },
  upperVolume: { name: 'Tren superior · Volumen', focus: 'Torso', exercises: ['incline_dumbbell_press', 'one_arm_row', 'lateral_raise', 'straight_arm_pulldown', 'hammer_curl', 'overhead_triceps'] },
  lowerStrength: { name: 'Tren inferior · Fuerza', focus: 'Pierna', exercises: ['leg_press', 'romanian_deadlift', 'leg_extension', 'leg_curl', 'calf_raise', 'plank'] },
  lowerVolume: { name: 'Tren inferior · Volumen', focus: 'Pierna', exercises: ['goblet_squat', 'hip_thrust', 'split_squat', 'hip_abduction', 'seated_calf_raise', 'dead_bug'] }
};

export const programTemplates = [
  {
    id: 'starter_2',
    name: 'Base completa · 2 días',
    subtitle: 'Dos sesiones equilibradas para empezar con seguridad',
    level: 'Principiante',
    objective: ['muscle', 'fitness', 'fat'],
    days: 2,
    badge: 'Inicio sólido',
    description: 'Trabaja todo el cuerpo dos veces por semana con una progresión fácil de seguir.',
    dayKeys: ['fullBodyBase', 'fullBodyProgress']
  },
  {
    id: 'ppl_3',
    name: 'Push · Pull · Legs',
    subtitle: 'Empuje, tirón y pierna en tres sesiones claras',
    level: 'Principiante–Intermedio',
    objective: ['muscle', 'fitness'],
    days: 3,
    badge: 'Más popular',
    description: 'Una división clásica y fácil de entender que reparte bien los grupos musculares.',
    dayKeys: ['push', 'pull', 'legs']
  },
  {
    id: 'classic_4',
    name: 'Hipertrofia clásica · 4 días',
    subtitle: 'Pecho, espalda, pierna y brazos bien repartidos',
    level: 'Intermedio',
    objective: ['muscle', 'fitness'],
    days: 4,
    badge: 'Equilibrado',
    description: 'Cuatro sesiones con nombres y objetivos claros, pensadas para progresar sin juntar todo el torso.',
    dayKeys: ['chestTriceps', 'backBiceps', 'legsGlutes', 'shouldersArms']
  },
  {
    id: 'upper_lower_4',
    name: 'Upper / Lower · 4 días',
    subtitle: 'Dos sesiones de tren superior y dos de tren inferior',
    level: 'Intermedio',
    objective: ['muscle', 'fitness'],
    days: 4,
    badge: 'Frecuencia 2',
    description: 'Repite cada gran zona dos veces por semana y facilita una progresión constante.',
    dayKeys: ['upperStrength', 'lowerStrength', 'upperVolume', 'lowerVolume']
  },
  {
    id: 'aesthetic_5',
    name: 'Estética completa · 5 días',
    subtitle: 'Especialización por grupos musculares',
    level: 'Intermedio',
    objective: ['muscle'],
    days: 5,
    badge: 'Especialización',
    description: 'Cinco sesiones específicas para quien disfruta entrenando más días y quiere personalizar el volumen.',
    dayKeys: ['chest', 'back', 'legStrength', 'shouldersArms', 'gluteHam']
  },
  {
    id: 'strength_3',
    name: 'Fuerza esencial · 3 días',
    subtitle: 'Movimientos principales y accesorios básicos',
    level: 'Intermedio',
    objective: ['muscle', 'fitness'],
    days: 3,
    badge: 'Fuerza',
    description: 'Prioriza ejercicios grandes, descansos algo más largos y una progresión fácil de medir.',
    dayKeys: ['upperStrength', 'lowerStrength', 'upperVolume']
  }
];

export const planTemplates = {
  2: programTemplates.find((item) => item.id === 'starter_2').dayKeys.map((key) => DAY_LIBRARY[key]),
  3: programTemplates.find((item) => item.id === 'ppl_3').dayKeys.map((key) => DAY_LIBRARY[key]),
  4: programTemplates.find((item) => item.id === 'classic_4').dayKeys.map((key) => DAY_LIBRARY[key]),
  5: programTemplates.find((item) => item.id === 'aesthetic_5').dayKeys.map((key) => DAY_LIBRARY[key])
};

export function objectiveLabel(value) {
  return ({ muscle: 'Ganar fuerza y músculo', fitness: 'Mejorar forma física', fat: 'Reducir grasa y mejorar condición' })[value] || value || 'Sin definir';
}

export function experienceLabel(value) {
  return ({ beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' })[value] || 'Principiante';
}

export function trainingRules(profile = {}) {
  const experience = profile.experience || 'beginner';
  if (profile.objective === 'muscle') {
    if (experience === 'advanced') return { targetSets: 4, repMin: 6, repMax: 10, restSeconds: 120 };
    return { targetSets: 3, repMin: 8, repMax: 12, restSeconds: 90 };
  }
  if (profile.objective === 'fat') return { targetSets: 3, repMin: 10, repMax: 15, restSeconds: 60 };
  return { targetSets: 3, repMin: 8, repMax: 12, restSeconds: 75 };
}

export function isTimedExercise(exerciseId) {
  return ['plank', 'side_plank', 'treadmill_walk', 'stationary_bike', 'elliptical', 'rowing_machine'].includes(exerciseId);
}

export function createPlanExercise(exerciseId, rules, overrides = {}) {
  const timed = isTimedExercise(exerciseId);
  return {
    slotId: overrides.slotId || uid('slot'),
    exerciseId,
    targetSets: Number(overrides.targetSets ?? overrides.sets ?? rules.targetSets) || 3,
    repMin: Number(overrides.repMin ?? (timed ? 20 : rules.repMin)) || 8,
    repMax: Number(overrides.repMax ?? (timed ? 35 : rules.repMax)) || 12,
    unit: overrides.unit || (timed ? 'sec' : 'reps'),
    restSeconds: Number(overrides.restSeconds ?? rules.restSeconds) || 75,
    notes: overrides.notes || ''
  };
}

export function recommendedTemplateId(profile = {}) {
  const days = Number(profile.days || 3);
  if (days <= 2) return 'starter_2';
  if (days === 3) return profile.experience === 'intermediate' || profile.experience === 'advanced' ? 'strength_3' : 'ppl_3';
  if (days === 4) return profile.experience === 'beginner' ? 'classic_4' : 'upper_lower_4';
  return 'aesthetic_5';
}

export function templatesForProfile(profile = {}) {
  const days = Number(profile.days || 3);
  const objective = profile.objective || 'muscle';
  const exact = programTemplates.filter((item) => item.days === days && item.objective.includes(objective));
  const nearby = programTemplates.filter((item) => Math.abs(item.days - days) <= 1 && item.objective.includes(objective));
  return [...exact, ...nearby.filter((item) => !exact.some((exactItem) => exactItem.id === item.id))];
}

export function buildPlan(profile = {}, templateId = null) {
  const selectedId = templateId || recommendedTemplateId(profile);
  return buildPlanFromTemplate(selectedId, profile);
}

export function buildPlanFromTemplate(templateId, profile = {}) {
  const rules = trainingRules(profile);
  const minutes = Number(profile.minutes || profile.duration || 45);
  const maxExercises = minutes <= 30 ? 5 : minutes <= 45 ? 6 : 7;
  const template = programTemplates.find((item) => item.id === templateId) || programTemplates.find((item) => item.id === recommendedTemplateId(profile)) || programTemplates[1];
  return {
    id: uid('routine'),
    name: template.name,
    description: template.description,
    templateId: template.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: template.dayKeys.map((key, dayIndex) => {
      const day = DAY_LIBRARY[key];
      return {
        id: uid(`day-${dayIndex + 1}`),
        name: day.name,
        focus: day.focus,
        exercises: day.exercises.slice(0, maxExercises).map((exerciseId) => createPlanExercise(exerciseId, rules))
      };
    })
  };
}

export function createBlankPlan(name = 'Nueva rutina') {
  return {
    id: uid('routine'),
    name,
    description: 'Rutina creada por ti desde cero.',
    templateId: 'custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [{ id: uid('day-1'), name: 'Primer entrenamiento', focus: 'Personalizado', exercises: [] }]
  };
}

export function normalizePlan(plan, profile = {}) {
  if (!plan) return null;
  const rules = trainingRules(profile);
  const sourceDays = Array.isArray(plan) ? plan : (Array.isArray(plan.days) ? plan.days : []);
  return {
    id: plan.id || uid('routine'),
    name: plan.name || 'Mi rutina',
    description: plan.description || '',
    templateId: plan.templateId || 'legacy',
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: plan.updatedAt || new Date().toISOString(),
    days: sourceDays.map((day, dayIndex) => ({
      id: day.id || uid(`day-${dayIndex + 1}`),
      name: day.name || `Entrenamiento ${dayIndex + 1}`,
      focus: day.focus || '',
      exercises: (day.exercises || []).map((item) => {
        if (typeof item === 'string') return createPlanExercise(item, rules);
        let repMin = item.repMin;
        let repMax = item.repMax;
        let unit = item.unit;
        if ((!repMin || !repMax) && item.reps) {
          const match = String(item.reps).match(/(\d+)\D+(\d+)/);
          repMin = match ? Number(match[1]) : Number.parseInt(item.reps, 10) || rules.repMin;
          repMax = match ? Number(match[2]) : repMin;
          if (/s|seg/i.test(String(item.reps))) unit = 'sec';
        }
        let restSeconds = item.restSeconds;
        if (!restSeconds && item.rest) {
          const numbers = String(item.rest).match(/\d+/g)?.map(Number) || [];
          restSeconds = numbers.length ? Math.max(...numbers) : rules.restSeconds;
        }
        return createPlanExercise(item.exerciseId, rules, { ...item, repMin, repMax, unit, restSeconds });
      })
    }))
  };
}

export function copyPlan(plan) {
  return clone(plan);
}
