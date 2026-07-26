import { clone, uid } from './utils.js';

export const planTemplates = {
  2: [
    { name: 'Cuerpo completo A', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
    { name: 'Cuerpo completo B', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] }
  ],
  3: [
    { name: 'Cuerpo completo A', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
    { name: 'Cuerpo completo B', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] },
    { name: 'Cuerpo completo C', exercises: ['leg_extension', 'shoulder_press', 'one_arm_row', 'hip_thrust', 'calf_raise', 'dead_bug'] }
  ],
  4: [
    { name: 'Torso A', exercises: ['chest_press', 'lat_pulldown', 'shoulder_press', 'seated_row', 'biceps_curl', 'triceps_pushdown'] },
    { name: 'Piernas A', exercises: ['leg_press', 'leg_curl', 'leg_extension', 'hip_abduction', 'calf_raise', 'plank'] },
    { name: 'Torso B', exercises: ['incline_dumbbell_press', 'one_arm_row', 'lateral_raise', 'straight_arm_pulldown', 'hammer_curl', 'overhead_triceps'] },
    { name: 'Piernas B', exercises: ['goblet_squat', 'romanian_deadlift', 'hip_thrust', 'split_squat', 'seated_calf_raise', 'dead_bug'] }
  ],
  5: [
    { name: 'Torso empuje', exercises: ['barbell_bench_press', 'incline_dumbbell_press', 'shoulder_press', 'lateral_raise', 'triceps_pushdown', 'overhead_triceps'] },
    { name: 'Torso tirón', exercises: ['lat_pulldown', 'seated_row', 'one_arm_row', 'face_pull', 'biceps_curl', 'hammer_curl'] },
    { name: 'Piernas A', exercises: ['leg_press', 'leg_curl', 'leg_extension', 'hip_abduction', 'calf_raise', 'plank'] },
    { name: 'Torso completo', exercises: ['chest_press', 'assisted_pullup', 'dumbbell_shoulder_press', 'chest_supported_row', 'cable_fly', 'cable_curl'] },
    { name: 'Piernas B', exercises: ['goblet_squat', 'romanian_deadlift', 'hip_thrust', 'split_squat', 'seated_calf_raise', 'dead_bug'] }
  ]
};

export function objectiveLabel(value) {
  return ({ muscle: 'Ganar fuerza y músculo', fitness: 'Ponerme en forma', fat: 'Mejorar condición física' })[value] || value || 'Sin definir';
}

export function trainingRules(profile = {}) {
  if (profile.objective === 'muscle') return { targetSets: 3, repMin: 8, repMax: 12, restSeconds: 90 };
  if (profile.objective === 'fat') return { targetSets: 3, repMin: 12, repMax: 15, restSeconds: 60 };
  return { targetSets: 3, repMin: 10, repMax: 12, restSeconds: 75 };
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

export function buildPlan(profile = {}) {
  const rules = trainingRules(profile);
  const minutes = Number(profile.minutes || profile.duration || 45);
  const days = Number(profile.days || 3);
  const maxExercises = minutes <= 30 ? 5 : minutes <= 45 ? 6 : 7;
  const template = planTemplates[days] || planTemplates[3];

  return {
    id: uid('plan'),
    createdAt: new Date().toISOString(),
    days: template.map((day, dayIndex) => ({
      id: uid(`day-${dayIndex + 1}`),
      name: day.name,
      exercises: day.exercises.slice(0, maxExercises).map((exerciseId) => createPlanExercise(exerciseId, rules))
    }))
  };
}

export function normalizePlan(plan, profile = {}) {
  if (!plan) return null;
  const rules = trainingRules(profile);
  const sourceDays = Array.isArray(plan) ? plan : (Array.isArray(plan.days) ? plan.days : []);
  return {
    id: plan.id || uid('plan'),
    createdAt: plan.createdAt || new Date().toISOString(),
    days: sourceDays.map((day, dayIndex) => ({
      id: day.id || uid(`day-${dayIndex + 1}`),
      name: day.name || `Día ${dayIndex + 1}`,
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
        return createPlanExercise(item.exerciseId, rules, {
          ...item,
          repMin,
          repMax,
          unit,
          restSeconds
        });
      })
    }))
  };
}

export function copyPlan(plan) {
  return clone(plan);
}
