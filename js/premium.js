
'use strict';

export const PREMIUM_FEATURES = Object.freeze({
  'mfp-session': {
    title: 'Entrenamiento My Fit Plan',
    eyebrow: 'ADAPTACIÓN DIARIA',
    description: 'Ajusta la sesión según tiempo, energía, sueño y molestias del día.',
    icon: 'MFP'
  },
  'coach-analysis': {
    title: 'Análisis del entrenador',
    eyebrow: 'COACH INTELIGENTE',
    description: 'Interpreta adherencia, evolución y señales que merecen atención.',
    icon: '◎'
  },
  'progression': {
    title: 'Progresión automática',
    eyebrow: 'CARGA INTELIGENTE',
    description: 'Sugiere pesos, repeticiones, series y descargas usando tu historial real.',
    icon: '↗'
  },
  'smart-replan': {
    title: 'Reprogramación inteligente',
    eyebrow: 'CALENDARIO PREMIUM',
    description: 'Recoloca sesiones perdidas respetando descanso y continuidad de rutina.',
    icon: '◷'
  },
  'advanced-body-compare': {
    title: 'Comparación avanzada',
    eyebrow: 'PROGRESO PREMIUM',
    description: 'Compara revisiones físicas guardadas y analiza cambios entre fechas.',
    icon: '◫'
  }
});

export const PREMIUM_ACTION_FEATURE = Object.freeze({
  'training-mfp': 'mfp-session',
  'training-refresh-recommended': 'mfp-session',
  'coach-details': 'coach-analysis',
  'progression-dashboard': 'progression',
  'progression-details': 'progression',
  'apply-progression-target': 'progression',
  'apply-deload': 'progression',
  'deload-details': 'progression',
  'planner-smart-replan': 'smart-replan',
  'body-progress-compare': 'advanced-body-compare'
});

export function normalizePlan(plan) {
  return ['premium','founder'].includes(String(plan || '').toLowerCase())
    ? String(plan).toLowerCase()
    : 'free';
}

export function hasPremiumAccess(plan) {
  return ['premium','founder'].includes(normalizePlan(plan));
}

export function planLabel(plan) {
  const value = normalizePlan(plan);
  return value === 'founder' ? 'Founder' : value === 'premium' ? 'Premium' : 'Free';
}

export function premiumFeatureForAction(action) {
  return PREMIUM_ACTION_FEATURE[action] || '';
}

export function premiumFeature(feature) {
  return PREMIUM_FEATURES[feature] || {
    title: 'My Fit Plan Premium',
    eyebrow: 'PREMIUM',
    description: 'Función avanzada de My Fit Plan.',
    icon: '★'
  };
}

