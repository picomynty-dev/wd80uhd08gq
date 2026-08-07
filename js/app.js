'use strict';

import { getAllExercises, getExercise, searchableExerciseText } from './exercises.js?v=39';
import { buildPlan, buildPlanFromTemplate, createBlankPlan, createPlanExercise, experienceLabel, objectiveLabel, programTemplates, templatesForProfile, trainingRules, isTimedExercise } from './plans.js?v=39';
import { APP_VERSION, createEmptyState, loadState, saveState as persistState, validateImportedState } from './storage.js?v=39';
import {
  buildCalendar,
  calculateStreak,
  completedSets,
  detectNewPrs,
  exerciseVolume,
  formatWeight,
  lastExercisePerformance,
  personalRecords,
  recentExerciseIds,
  sessionVolume,
  sessionsThisMonth,
  sessionsThisWeek,
  weightSummary
} from './stats.js?v=39';
import {
  analyzeCompletedSession,
  analyzeExerciseTrend,
  buildCoachDashboard
} from './coach.js?v=39';
import {
  buildAdaptiveSession,
  estimatePlanMinutes,
  readinessSummary
} from './adaptive.js?v=39';
import { buildRecommendedSession, evaluateTrainingChoice } from './session-selector.js?v=39';
import {
  WEEKDAY_LABELS,
  buildPlannerSummary,
  createDefaultPlanner,
  buildPlannerWeek,
  findNextOccurrence,
  formatPlannerDate,
  getMissedOccurrences,
  movePlannerOccurrence,
  occurrencesForDate,
  plannerWeekOffsetDate,
  skipPlannerOccurrence,
  smartReplanMissed,
  updatePlannerSchedule
} from './calendar-planner.js?v=39';
import { coachingProfile, deduplicateExerciseEntries, equipmentAvailable, exerciseQuality, libraryQualitySummary, movementCategory, movementOptions, rankExerciseSubstitutes } from './exercise-intelligence.js?v=39';
import {
  applyDeloadToWorkout,
  buildDeloadRecommendation,
  buildExerciseProgression,
  buildExerciseProgressionHistory,
  buildProgressionDashboard
} from './progression-engine.js?v=39';
import {
  clamp,
  clone,
  debounce,
  downloadJson,
  esc,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTimer,
  isoDay,
  normalizeText,
  numberValue,
  readJsonFile,
  uid
} from './utils.js?v=39';
import { closeModal, confirmAction, emptyState, openModal, showToast } from './ui.js?v=39';
import { searchExerciseEntries, suggestedSearches } from './search.js?v=39';
import { exerciseCardVisual, exerciseVisual, premiumExerciseVisual } from './visuals.js?v=39';
import { decorateInteractiveElements, getHudLayoutSnapshot, hudIcon, initAdaptiveHud, pageHudMeta, syncAdaptiveHudMode } from './hud.js?v=39';
import {
  clearProgressPhotoStore,
  compressProgressImage,
  deleteProgressPhotos,
  downloadProgressPhoto,
  getProgressPhotoUrl,
  hashPrivatePin,
  hydrateProgressImages,
  saveProgressPhoto
} from './photo-progress.js?v=39';

const app = document.querySelector('#app');
const installButton = document.querySelector('#installButton');
const profileShortcut = document.querySelector('#profileShortcut');
const restTimerDock = document.querySelector('#restTimerDock');
const updateBanner = document.querySelector('#updateBanner');
const activeSessionBar = document.querySelector('#activeSessionBar');
const hudErrorBanner = document.querySelector('#hudErrorBanner');
const networkStatus = document.querySelector('#networkStatus');
const root = document.documentElement;
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

let state = loadState();
let currentView = 'home';
let deferredInstallPrompt = null;
let libraryFilters = { query: '', muscle: 'Todos', equipment: 'Todos', level: 'Todos', movement: 'Todos', availability: 'Todos', mode: 'all' };
let libraryPageSize = 36;
let restInterval = null;
let waitingServiceWorker = null;
let onboardingStep = 1;
let onboardingDraft = null;
let collapsedPlanDays = new Set();
let collapsedWorkoutExercises = new Set();
let planAccordionPlanId = null;
let workoutAccordionSessionId = null;
let photoVaultUnlocked = false;
let bodyMetric = 'waist';
let pendingWorkoutSelection = null;
let customWorkoutDraft = null;
let recommendationVariant = 0;
let currentRecommendation = null;
let recommendationCacheKey = '';
let recommendationPreviewHistory = [];
let showOptionalAlternative = false;
let plannerWeekOffset = 0;
let systemThemeListenerBound = false;
let uiObserver = null;
let cachedHudHealth = null;
let cachedHudHealthAt = 0;
const runtimeIssues = [];

init();

function init() {
  window.__mfpBooted = true;
  initAdaptiveHud();
  applySettings();
  bindSystemThemeListener();
  updateProfileShortcut();
  bindGlobalEvents();
  bindRuntimeGuards();
  initUiObserver();
  registerServiceWorker();
  restoreRestTimer();
  updateHud();
  if (!state.profile) renderWelcome();
  else if (!state.onboardingCompleted) renderOnboardingUpgrade();
  else setView(requestedInitialView());
}

function requestedInitialView() {
  const requested = new URLSearchParams(window.location.search).get('view');
  return ['home', 'plan', 'calendar', 'workout', 'library', 'profile'].includes(requested) ? requested : 'home';
}

function bindGlobalEvents() {
  document.addEventListener('click', handleAppClick);
  app.addEventListener('change', handleAppChange);
  app.addEventListener('input', handleAppInput);
  app.addEventListener('submit', handleAppSubmit);
  restTimerDock.addEventListener('click', handleTimerClick);
  updateBanner.addEventListener('click', handleUpdateClick);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showToast('En iPhone: Safari → Compartir → Añadir a pantalla de inicio.');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener('online', updateHud);
  window.addEventListener('offline', updateHud);
  window.addEventListener('pagehide', persistPendingInputs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistPendingInputs();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openHudControlCenter();
    }
  });
}

function bindRuntimeGuards() {
  window.addEventListener('error', (event) => reportRuntimeIssue(event.error || new Error(event.message), 'Error global'));
  window.addEventListener('unhandledrejection', (event) => reportRuntimeIssue(event.reason || new Error('Promesa rechazada'), 'Promesa no controlada'));
}

function initUiObserver() {
  if (uiObserver) return;
  uiObserver = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      decorateInteractiveElements(node);
      if (node.matches('.modal-backdrop')) decorateInteractiveElements(node);
    }));
  });
  uiObserver.observe(document.body, { childList: true, subtree: true });
  decorateInteractiveElements(document);
}

function reportRuntimeIssue(error, context = 'Aplicación') {
  const issue = {
    id: uid('runtime-error'),
    context,
    message: String(error?.message || error || 'Error desconocido'),
    stack: String(error?.stack || ''),
    createdAt: new Date().toISOString()
  };
  runtimeIssues.unshift(issue);
  runtimeIssues.splice(8);
  console.error(`[My Fit Plan] ${context}:`, error);
  if (hudErrorBanner) {
    hudErrorBanner.hidden = false;
    hudErrorBanner.innerHTML = `${hudIcon('warning')}<span><strong>Se ha detectado una incidencia</strong><small>${esc(issue.message)}</small></span><b>Revisar</b>`;
  }
  updateHud();
}

function setOnboardingMode(enabled) {
  document.body.classList.toggle('onboarding-mode', Boolean(enabled));
}

function setView(view) {
  setOnboardingMode(false);
  if (view !== 'workout' && !state.activeWorkout) {
    pendingWorkoutSelection = null;
    customWorkoutDraft = null;
    showOptionalAlternative = false;
  }
  currentView = view;
  const activeNav = view === 'calendar' ? 'plan' : view;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.nav === activeNav));
  const renderers = {
    home: renderHome,
    plan: renderPlan,
    calendar: renderCalendarPlanner,
    workout: renderWorkout,
    library: renderLibrary,
    profile: renderProfile
  };
  try {
    (renderers[view] || renderHome)();
    decorateInteractiveElements(app);
  } catch (error) {
    reportRuntimeIssue(error, `Renderizado: ${view}`);
    renderRecoveryScreen(view, error);
  }
  updateHud();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? 'auto' : 'smooth' });
}

function ensurePlanner() {
  if (!state.plan?.days?.length) return null;
  if (!state.planner || state.planner.planId !== state.plan.id) {
    state.planner = createDefaultPlanner(
      state.profile || {},
      state.nextWorkoutIndex,
      state.plan.id
    );
  }
  return state.planner;
}

function save() {
  try {
    syncActiveRoutineFromPlan();
    state = persistState(state);
    cachedHudHealthAt = 0;
    applySettings();
    updateProfileShortcut();
    updateHud();
    return true;
  } catch (error) {
    reportRuntimeIssue(error, 'Guardado local');
    showToast('No se pudo guardar. Exporta una copia desde el centro de control.', 'danger');
    return false;
  }
}

function bindSystemThemeListener() {
  if (systemThemeListenerBound) return;
  systemThemeListenerBound = true;
  const refresh = () => {
    if ((state.settings.appearance || 'system') === 'system') applySettings();
  };
  if (typeof systemThemeQuery.addEventListener === 'function') systemThemeQuery.addEventListener('change', refresh);
  else if (typeof systemThemeQuery.addListener === 'function') systemThemeQuery.addListener(refresh);
}

function normalizeHexColor(value, fallback = '#f97316') {
  const raw = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return fallback;
}

function hexToRgb(hex) {
  const clean = normalizeHexColor(hex).slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function mixHex(hex, targetHex, amount) {
  const source = hexToRgb(hex);
  const target = hexToRgb(targetHex);
  const ratio = clamp(Number(amount) || 0, 0, 1);
  const channel = (key) => Math.round(source[key] + (target[key] - source[key]) * ratio).toString(16).padStart(2, '0');
  return `#${channel('r')}${channel('g')}${channel('b')}`;
}

function accentContrast(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? '#08111f' : '#ffffff';
}

function legacyAccentHex() {
  const legacy = { orange: '#f97316', blue: '#2563eb', green: '#16a34a', violet: '#7c3aed' };
  return legacy[state.settings.accent] || '#f97316';
}

function currentAccentHex() {
  return normalizeHexColor(state.settings.accentHex || legacyAccentHex());
}

function resolvedAppearance(appearance = state.settings.appearance || 'system') {
  if (appearance === 'system') return systemThemeQuery.matches ? 'dark' : 'light';
  return appearance;
}

function applySettings(preview = {}) {
  const appearance = preview.appearance || state.settings.appearance || 'system';
  const resolved = resolvedAppearance(appearance);
  const accent = normalizeHexColor(preview.accentHex || currentAccentHex());
  const { r, g, b } = hexToRgb(accent);
  const accentDark = mixHex(accent, '#000000', resolved === 'dark' ? 0.18 : 0.23);
  const accentSoft = resolved === 'dark' ? mixHex(accent, '#111724', 0.79) : mixHex(accent, '#ffffff', 0.89);
  root.dataset.accent = 'custom';
  root.dataset.theme = appearance;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-dark', accentDark);
  root.style.setProperty('--accent-soft', accentSoft);
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--accent-contrast', accentContrast(accent));
  root.style.colorScheme = appearance === 'system' ? 'light dark' : appearance;
  root.classList.toggle('compact', Boolean(state.settings.compact));
  root.classList.toggle('reduce-motion', Boolean(state.settings.reduceMotion));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? mixHex(accent, '#070b14', 0.72) : accent);
}

function updateProfileShortcut() {
  profileShortcut.textContent = initials(state.profile?.name || 'My Fit');
}

function initials(name) {
  const parts = String(name || 'MF').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MF';
  return (parts[0][0] + (parts[1]?.[0] || parts[0][1] || '')).toUpperCase();
}

function calculateBMI(profile = state.profile) {
  const weight = numberValue(profile?.weight);
  const heightCm = numberValue(profile?.height);
  if (!weight || !heightCm || weight < 30 || weight > 350 || heightCm < 120 || heightCm > 230) return null;
  return weight / ((heightCm / 100) ** 2);
}

function bmiInfo(value) {
  if (value < 18.5) return { label: 'Por debajo del rango orientativo', tone: 'warning', text: 'Es solo una referencia. El IMC no distingue músculo, grasa ni constitución corporal.' };
  if (value < 25) return { label: 'Dentro del rango orientativo', tone: 'success', text: 'Este valor está en el rango habitual para adultos, pero no resume por sí solo tu salud.' };
  if (value < 30) return { label: 'Por encima del rango orientativo', tone: 'warning', text: 'Interprétalo junto con tu composición corporal, cintura, hábitos y objetivo.' };
  return { label: 'Rango elevado según el IMC', tone: 'danger', text: 'Es una medida orientativa. Un profesional puede valorar el conjunto de datos si te preocupa.' };
}

function renderHome() {
  if (!state.profile) return renderWelcome();
  const days = state.plan?.days || [];
  const nextDay = days.length ? days[state.nextWorkoutIndex % days.length] : null;
  const weekly = sessionsThisWeek(state.history);
  const goal = Number(state.profile.days || days.length || 3);
  const percentage = clamp(Math.round((weekly.length / Math.max(1, goal)) * 100), 0, 100);
  const lastSession = state.history[0];
  const calendar = buildCalendar(state.history);
  const recentRecords = recentPersonalRecords(3);
  const firstName = state.profile.name?.trim().split(/\s+/)[0] || 'deportista';
  const streak = calculateStreak(state.history);
  const todayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const nextExerciseCount = state.activeWorkout?.exercises?.length || nextDay?.exercises?.length || 0;
  const estimatedMinutes = Number(state.profile.minutes || 45);
  const coach = buildCoachDashboard(state.history, state.plan, state.nextWorkoutIndex, state.profile, state.customExercises);
  const progressionDashboard = buildProgressionDashboard(state.history, state.plan, state.customExercises);
  ensurePlanner();
  const plannerSummary = buildPlannerSummary(state.planner, state.plan, state.history);

  app.innerHTML = `
    <section class="page home-page premium-home">
      <header class="dashboard-greeting">
        <div>
          <p class="eyebrow">${esc(todayLabel)}</p>
          <h1>Vamos a por ello, ${esc(firstName)}.</h1>
          <p class="muted">Semana activa · ${weekly.length} de ${goal} sesiones completadas</p>
        </div>
        <div class="streak-orb" aria-label="Racha de ${streak} días"><span>⚡</span><strong>${streak}</strong><small>racha</small></div>
      </header>

      <section class="today-command-card">
        <div class="today-card-glow" aria-hidden="true"></div>
        <div class="today-command-copy">
          <div class="today-command-topline"><span class="live-dot"></span><span>${state.activeWorkout ? 'SESIÓN EN CURSO' : 'ENTRENAMIENTO DE HOY'}</span></div>
          <h2>${esc(state.activeWorkout?.name || nextDay?.name || 'Crea tu siguiente rutina')}</h2>
          <div class="today-metadata">
            <span><b>${nextExerciseCount}</b> ejercicios</span>
            <span><b>${estimatedMinutes}</b> min</span>
            <span><b>${percentage}%</b> semana</span>
          </div>
          <p>${state.activeWorkout ? 'Tu progreso está guardado. Continúa exactamente donde lo dejaste.' : nextDay ? 'Sesión preparada según tu plan. Registra cada serie y deja que My Fit Plan controle el progreso.' : 'Añade un día y tus ejercicios para empezar.'}</p>
          <div class="today-command-actions">
            <button class="button button-primary command-primary" type="button" data-action="home-workout"><span>${state.activeWorkout ? 'Continuar sesión' : 'Empezar entrenamiento'}</span><b>→</b></button>
            <button class="command-icon-button" type="button" data-nav-local="plan" aria-label="Editar plan">✎</button>
          </div>
        </div>
        <div class="progress-orbit" style="--progress:${percentage * 3.6}deg" aria-label="${percentage}% del objetivo semanal">
          <div><strong>${percentage}%</strong><small>semana</small></div>
        </div>
      </section>

      <section class="coach-command-card coach-tone-${coach.tone}">
        <div class="coach-command-header">
          <div class="coach-identity"><span class="coach-mark">MFP</span><span><small>ENTRENADOR</small><strong>Análisis local</strong></span></div>
          <span class="coach-confidence"><i></i> Confianza ${coach.confidenceLabel.toLowerCase()}</span>
        </div>
        <div class="coach-command-main">
          <div>
            <p class="eyebrow">${coach.nextDay ? `Próxima sesión · ${esc(coach.nextDay.name)}` : 'Análisis de entrenamiento'}</p>
            <h2>${esc(coach.headline)}</h2>
            <p>${esc(coach.description)}</p>
          </div>
          <div class="coach-score-ring" style="--coach-score:${coach.confidence * 3.6}deg"><strong>${coach.confidence}%</strong><small>datos</small></div>
        </div>
        ${coach.primary ? `<div class="coach-primary-focus">
          <span class="coach-status-icon coach-status-${coach.primary.tone}">${coach.primary.icon}</span>
          <div><small>${esc(coach.primary.label)} · ${esc(coach.primary.exerciseName)}</small><strong>${esc(coach.primary.nextGoal)}</strong></div>
        </div>` : ''}
        <div class="coach-command-metrics">
          <span><strong>${coach.progressCount}</strong><small>señales positivas</small></span>
          <span><strong>${coach.attentionCount}</strong><small>puntos a revisar</small></span>
          <span><strong>${coach.weekly.adherence}%</strong><small>objetivo semanal</small></span>
        </div>
        <button class="coach-open-button" type="button" data-action="coach-details"><span>Ver análisis completo</span><b>→</b></button>
      </section>

      <section class="progression-home-card">
        <div class="progression-home-header">
          <div class="progression-home-brand"><span class="progression-home-icon">↗</span><div><p class="eyebrow">Progresión automática</p><h2>${progressionDashboard.ready ? `${progressionDashboard.ready} ejercicio${progressionDashboard.ready === 1 ? '' : 's'} listo${progressionDashboard.ready === 1 ? '' : 's'} para subir` : 'Objetivos de carga actualizados'}</h2></div></div>
          <button class="button button-secondary button-small" type="button" data-action="progression-dashboard">Ver análisis</button>
        </div>
        <div class="progression-home-stats">
          <span class="is-ready"><strong>${progressionDashboard.ready}</strong><small>subir carga</small></span>
          <span><strong>${progressionDashboard.improving}</strong><small>mejorando</small></span>
          <span class="${progressionDashboard.attention ? 'has-alert' : ''}"><strong>${progressionDashboard.attention}</strong><small>a revisar</small></span>
          <span><strong>${progressionDashboard.baseline}</strong><small>sin referencia</small></span>
        </div>
        ${progressionDashboard.top[0] ? `<div class="progression-home-focus"><span class="coach-status-icon coach-status-${progressionDashboard.top[0].tone}">${progressionDashboard.top[0].icon}</span><div><small>PRÓXIMA ACCIÓN</small><strong>${esc(progressionDashboard.top[0].exerciseName)} · ${esc(progressionDashboard.top[0].title)}</strong><p>${esc(progressionDashboard.top[0].nextGoal)}</p></div></div>` : ''}
      </section>

      <section class="planner-home-card">
        <div class="planner-home-header">
          <div class="planner-home-brand"><span class="planner-home-icon">◷</span><div><p class="eyebrow">Planificación inteligente</p><h2>${plannerSummary.next ? esc(plannerSummary.next.name) : 'Organiza tu semana'}</h2></div></div>
          <button class="button button-secondary button-small" type="button" data-nav-local="calendar">Abrir calendario</button>
        </div>
        <div class="planner-home-main">
          <div>
            <strong>${plannerSummary.next ? `${formatPlannerDate(plannerSummary.next.date)} · ${esc(plannerSummary.next.preferredTime)}` : 'Sin próxima sesión'}</strong>
            <p>${esc(plannerSummary.message)}</p>
          </div>
          <div class="planner-home-stats">
            <span><strong>${plannerSummary.week.completed}</strong><small>completadas</small></span>
            <span class="${plannerSummary.missed.length ? 'has-alert' : ''}"><strong>${plannerSummary.missed.length}</strong><small>pendientes</small></span>
            <span><strong>${plannerSummary.adherence}%</strong><small>cumplimiento</small></span>
          </div>
        </div>
        ${plannerMiniWeekHtml(plannerSummary.week)}
      </section>

      <section class="weekly-performance-card">
        <div class="section-title-row">
          <div><p class="eyebrow">Ritmo semanal</p><h2>Constancia</h2></div>
          <span class="performance-goal">Objetivo ${goal}</span>
        </div>
        ${weekStripHtml()}
        <div class="weekly-caption"><span>${weeklyMessage(weekly.length, goal)}</span><strong>${weekly.length}/${goal}</strong></div>
      </section>

      <section class="section premium-dashboard-grid">
        <article class="premium-panel calendar-panel">
          <div class="panel-header"><div><p class="eyebrow">Actividad</p><h2>${new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(calendar.year, calendar.month, 1))}</h2></div><span class="panel-count">${sessionsThisMonth(state.history).length}</span></div>
          ${homeCalendarHtml(calendar)}
        </article>
        <article class="premium-panel records-panel">
          <div class="panel-header"><div><p class="eyebrow">Progreso real</p><h2>Marcas recientes</h2></div><button class="text-link" type="button" data-nav-local="profile">Ver todas</button></div>
          ${recentRecords.length ? `<div class="premium-records-list">${recentRecords.map((record, idx) => `<div class="premium-record"><span class="record-rank">${String(idx + 1).padStart(2, '0')}</span><span class="record-copy"><strong>${esc(record.name)}</strong><small>${formatDate(record.date)}</small></span><b>${record.type === 'weight' ? `${formatWeight(record.value)} kg` : `${record.value} reps`}</b></div>`).join('')}</div>` : '<div class="empty-premium-state"><span>↗</span><p>Tus mejores marcas aparecerán aquí al repetir ejercicios.</p></div>'}
        </article>
      </section>

      ${lastSession ? `<section class="section last-session-premium"><div class="last-session-icon">✓</div><div class="last-session-main"><p class="eyebrow">Última sesión</p><h2>${esc(lastSession.name)}</h2><div class="last-session-meta"><span>${formatDateTime(lastSession.finishedAt)}</span><span>${formatDuration(lastSession.durationSeconds)}</span><span>${lastSession.exercises.length} ejercicios</span></div></div><div class="last-session-volume"><strong>${formatWeight(lastSession.volume || sessionVolume(lastSession))}</strong><small>kg volumen</small></div><button class="round-arrow-button" type="button" data-action="history-detail" data-id="${esc(lastSession.id)}" aria-label="Abrir entrenamiento">›</button></section>` : ''}

      <section class="section quick-launch-grid">
        <button class="quick-launch-card" type="button" data-action="quick-weight"><span class="quick-launch-icon">⚖</span><span><strong>Registrar peso</strong><small>Actualiza tu evolución</small></span><b>＋</b></button>
        <button class="quick-launch-card" type="button" data-action="body-progress-home"><span class="quick-launch-icon">◫</span><span><strong>Progreso físico</strong><small>Fotos, medidas y comparación</small></span><b>→</b></button>
        <button class="quick-launch-card" type="button" data-nav-local="library"><span class="quick-launch-icon">⌕</span><span><strong>Buscar ejercicio</strong><small>Más de 280 opciones</small></span><b>→</b></button>
        <button class="quick-launch-card" type="button" data-nav-local="plan"><span class="quick-launch-icon">▤</span><span><strong>Editar mi plan</strong><small>Series, reps y orden</small></span><b>→</b></button>
        <button class="quick-launch-card" type="button" data-nav-local="calendar"><span class="quick-launch-icon">▦</span><span><strong>Planificar semana</strong><small>Calendario y sesiones pendientes</small></span><b>→</b></button>
        <button class="quick-launch-card" type="button" data-action="go-history"><span class="quick-launch-icon">◷</span><span><strong>Ver historial</strong><small>Sesiones y récords</small></span><b>→</b></button>
      </section>
    </section>`;
}

function weekStripHtml() {
  const trained = new Set(state.history.map((session) => isoDay(session.finishedAt || session.startedAt)));
  const now = new Date();
  const monday = new Date(now);
  const day = (monday.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - day);
  return `<div class="week-strip">${['L','M','X','J','V','S','D'].map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const iso = isoDay(date);
    const done = trained.has(iso);
    const today = iso === isoDay(now);
    return `<div class="week-day ${done ? 'trained' : ''} ${today ? 'today' : ''}"><small>${label}</small><strong>${date.getDate()}</strong><i>${done ? '✓' : ''}</i></div>`;
  }).join('')}</div>`;
}

function homeCalendarHtml(calendar) {
  return `<div class="calendar home-calendar"><div class="calendar-weekdays">${['L','M','X','J','V','S','D'].map((day) => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${calendar.cells.map((cell) => cell ? (cell.trained ? `<button type="button" class="trained ${cell.today ? 'today' : ''}" data-action="calendar-day" data-date="${cell.iso}">${cell.day}<i>✓</i></button>` : `<span class="${cell.today ? 'today' : ''}">${cell.day}</span>`) : '<span></span>').join('')}</div></div>`;
}

function recentPersonalRecords(limit = 3) {
  const records = [];
  const seen = new Set();
  for (const session of state.history) {
    for (const record of session.prs || []) {
      if (seen.has(record.exerciseId)) continue;
      seen.add(record.exerciseId);
      records.push({ ...record, date: session.finishedAt || session.startedAt });
      if (records.length >= limit) return records;
    }
  }
  return records;
}

function renderWelcome() {
  setOnboardingMode(true);
  onboardingStep = 1;
  onboardingDraft = onboardingDraftFromState();
  app.innerHTML = `
    <section class="onboarding-shell onboarding-intro">
      <div class="onboarding-brand-lockup">
        <span class="onboarding-logo" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><strong>MY FIT PLAN</strong><small>BUILD · TRAIN · PROGRESS</small></span>
      </div>
      <div class="onboarding-hero-panel">
        <span class="onboarding-kicker">Una experiencia creada para ti</span>
        <h1>Entrena con un sistema que se adapta a tu forma de hacerlo.</h1>
        <p>Recibe una recomendación profesional, parte de una plantilla o crea tus propias carpetas y rutinas desde cero.</p>
        <div class="onboarding-proof-grid">
          <article><b>01</b><span>Rutinas recomendadas con divisiones claras</span></article>
          <article><b>02</b><span>Constructor libre para organizar tu entrenamiento</span></article>
          <article><b>03</b><span>Progreso, técnica y registro serie a serie</span></article>
        </div>
        <button class="button button-primary onboarding-main-button" type="button" data-action="onboarding-start">Configurar My Fit Plan <b>→</b></button>
        <button class="button button-ghost" type="button" data-action="demo-plan">Explorar una demo</button>
      </div>
      <p class="onboarding-legal">Para mayores de 18 años. La aplicación ofrece orientación general y no sustituye a profesionales sanitarios o del entrenamiento.</p>
    </section>`;
}

function renderOnboardingUpgrade() {
  setOnboardingMode(true);
  app.innerHTML = `
    <section class="onboarding-shell onboarding-intro">
      <div class="onboarding-brand-lockup">
        <span class="onboarding-logo" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><strong>MY FIT PLAN 3.1</strong><small>NUEVA CONFIGURACIÓN</small></span>
      </div>
      <div class="onboarding-hero-panel upgrade-panel">
        <span class="onboarding-kicker">Tu progreso está a salvo</span>
        <h1>Personaliza la nueva experiencia sin perder tu historial.</h1>
        <p>Conservaremos entrenamientos, marcas y datos. Solo te haremos unas preguntas para organizar mejor tus planes y activar el nuevo sistema de carpetas.</p>
        <div class="upgrade-summary">
          <span><b>${state.history.length}</b> sesiones guardadas</span>
          <span><b>${state.plan?.days?.length || 0}</b> entrenamientos en tu plan</span>
        </div>
        <button class="button button-primary onboarding-main-button" type="button" data-action="onboarding-start">Configurar versión 3.1 <b>→</b></button>
        <button class="button button-secondary" type="button" data-action="onboarding-keep-current">Mantener mi configuración actual</button>
      </div>
    </section>`;
}

function onboardingDraftFromState() {
  const p = state.profile || {};
  return {
    name: p.name || '',
    age: p.age || '',
    weight: p.weight || '',
    height: p.height || '',
    objective: p.objective || 'muscle',
    experience: p.experience || 'beginner',
    location: p.location || 'gym',
    days: Number(p.days || 3),
    minutes: Number(p.minutes || 45),
    priorities: Array.isArray(p.priorities) ? [...p.priorities] : [],
    avoidedExercises: p.avoidedExercises || '',
    equipment: Array.isArray(p.equipment) && p.equipment.length ? [...p.equipment] : ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal'],
    path: p.trainingPath || 'recommended',
    templateId: state.plan?.templateId && state.plan.templateId !== 'legacy' ? state.plan.templateId : null,
    adultConsent: Boolean(state.profile)
  };
}

function startOnboarding() {
  onboardingDraft = onboardingDraftFromState();
  onboardingStep = 1;
  renderOnboarding();
}

function renderQuestionnaire() {
  startOnboarding();
}

function renderOnboarding() {
  setOnboardingMode(true);
  onboardingDraft ||= onboardingDraftFromState();
  const totalSteps = 6;
  const progress = Math.round((onboardingStep / totalSteps) * 100);
  const stepContent = {
    1: onboardingIdentityStep,
    2: onboardingGoalStep,
    3: onboardingAvailabilityStep,
    4: onboardingPreferencesStep,
    5: onboardingPathStep,
    6: onboardingFinishStep
  }[onboardingStep]();

  app.innerHTML = `
    <section class="onboarding-shell onboarding-wizard">
      <header class="onboarding-progress-header">
        <button class="onboarding-back ${onboardingStep === 1 ? 'is-hidden' : ''}" type="button" data-action="onboarding-back" aria-label="Volver">←</button>
        <div class="onboarding-progress-copy"><small>PASO ${onboardingStep} DE ${totalSteps}</small><strong>${onboardingStepTitle(onboardingStep)}</strong></div>
        <span class="onboarding-progress-number">${progress}%</span>
      </header>
      <div class="onboarding-progress-track"><span style="width:${progress}%"></span></div>
      <div class="onboarding-step-card">${stepContent}</div>
      <footer class="onboarding-footer">
        ${onboardingStep < totalSteps
          ? '<button class="button button-primary button-block" type="button" data-action="onboarding-next">Continuar <b>→</b></button>'
          : '<button class="button button-primary button-block" type="button" data-action="onboarding-finish">Crear mi espacio de entrenamiento <b>→</b></button>'}
        <small>Tus datos permanecen en este dispositivo.</small>
      </footer>
    </section>`;
}

function onboardingStepTitle(step) {
  return ({ 1: 'Tu perfil', 2: 'Tu experiencia', 3: 'Tu semana', 4: 'Tus preferencias', 5: 'Cómo quieres entrenar', 6: 'Tu punto de partida' })[step] || '';
}

function onboardingIdentityStep() {
  const d = onboardingDraft;
  return `
    <div class="onboarding-step-heading"><span class="step-symbol">01</span><div><p class="eyebrow">Empecemos por ti</p><h1>Construiremos una experiencia personal, no un plan genérico.</h1><p>Estos datos ayudan a ajustar tiempos, volumen y seguimiento.</p></div></div>
    <div class="onboarding-form-grid">
      <label class="premium-field field-wide"><span>¿Cómo quieres que te llamemos?</span><input id="obName" maxlength="30" value="${esc(d.name)}" placeholder="Tu nombre o apodo" autocomplete="nickname"></label>
      <label class="premium-field"><span>Edad</span><input id="obAge" type="number" min="18" max="100" value="${esc(d.age)}" placeholder="20"></label>
      <label class="premium-field"><span>Peso actual <small>kg</small></span><input id="obWeight" type="number" inputmode="decimal" min="30" max="350" step="0.1" value="${esc(d.weight)}" placeholder="75"></label>
      <label class="premium-field"><span>Estatura <small>cm</small></span><input id="obHeight" type="number" inputmode="numeric" min="120" max="230" value="${esc(d.height)}" placeholder="178"></label>
    </div>
    <label class="consent-row onboarding-consent">
      <input id="obAdult" type="checkbox" ${d.adultConsent ? 'checked' : ''}>
      <span class="visible-check" aria-hidden="true">✓</span>
      <span><strong>Confirmo que soy mayor de 18 años.</strong><small>Esta primera versión está diseñada únicamente para adultos.</small></span>
    </label>`;
}

function onboardingGoalStep() {
  const d = onboardingDraft;
  return `
    <div class="onboarding-step-heading"><span class="step-symbol">02</span><div><p class="eyebrow">Objetivo y experiencia</p><h1>¿Qué quieres conseguir y desde dónde empiezas?</h1><p>No buscamos etiquetarte: solo adaptar mejor el punto de partida.</p></div></div>
    <h3 class="onboarding-question">Objetivo principal</h3>
    <div class="choice-card-grid three">
      ${choiceCard('objective', 'muscle', 'Ganar músculo', 'Fuerza, hipertrofia y progresión de cargas.', '↗', d.objective)}
      ${choiceCard('objective', 'fitness', 'Mejorar mi forma', 'Más fuerza, energía y capacidad general.', '◎', d.objective)}
      ${choiceCard('objective', 'fat', 'Reducir grasa', 'Entrenamiento de fuerza y constancia.', '◇', d.objective)}
    </div>
    <h3 class="onboarding-question">Experiencia entrenando</h3>
    <div class="choice-card-grid three compact-choices">
      ${choiceCard('experience', 'beginner', 'Principiante', 'Menos de 6 meses o vuelvo después de un tiempo.', '01', d.experience)}
      ${choiceCard('experience', 'intermediate', 'Intermedio', 'Entreno con regularidad y conozco lo básico.', '02', d.experience)}
      ${choiceCard('experience', 'advanced', 'Avanzado', 'Planifico volumen, intensidad y progresión.', '03', d.experience)}
    </div>
    <h3 class="onboarding-question">Lugar habitual</h3>
    <div class="choice-card-grid two compact-choices">
      ${choiceCard('location', 'gym', 'Gimnasio', 'Máquinas, poleas, barras y mancuernas.', '▦', d.location)}
      ${choiceCard('location', 'home', 'Casa', 'Material limitado o peso corporal.', '⌂', d.location)}
    </div>`;
}

function onboardingAvailabilityStep() {
  const d = onboardingDraft;
  return `
    <div class="onboarding-step-heading"><span class="step-symbol">03</span><div><p class="eyebrow">Tu semana real</p><h1>Un buen plan debe caber en tu vida.</h1><p>Es mejor cumplir tres días de verdad que prometer cinco y abandonar.</p></div></div>
    <h3 class="onboarding-question">¿Cuántos días puedes entrenar?</h3>
    <div class="number-choice-row">
      ${[2,3,4,5].map((value) => `<label class="number-choice"><input type="radio" name="obDays" value="${value}" ${Number(d.days) === value ? 'checked' : ''}><span><b>${value}</b><small>días</small></span></label>`).join('')}
    </div>
    <h3 class="onboarding-question">Tiempo habitual por sesión</h3>
    <div class="duration-choice-row">
      ${[[30,'Directo al grano'],[45,'Equilibrado'],[60,'Sesión completa'],[75,'Más volumen']].map(([value,label]) => `<label class="duration-choice"><input type="radio" name="obMinutes" value="${value}" ${Number(d.minutes) === value ? 'checked' : ''}><span><b>${value} min</b><small>${label}</small></span></label>`).join('')}
    </div>
    <div class="onboarding-insight"><span>⌁</span><p><strong>Recomendación provisional</strong> Con ${d.days} días y ${d.minutes} minutos podemos construir una división clara sin sesiones interminables.</p></div>`;
}

function onboardingPreferencesStep() {
  const d = onboardingDraft;
  const equipment = ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio', 'Bandas'];
  const priorities = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Pierna', 'Glúteos', 'Core'];
  return `
    <div class="onboarding-step-heading"><span class="step-symbol">04</span><div><p class="eyebrow">Material y preferencias</p><h1>Haz que el plan encaje con tu gimnasio y tus prioridades.</h1><p>Podrás cambiar todo más adelante desde tu perfil.</p></div></div>
    <h3 class="onboarding-question">Material disponible</h3>
    <div class="chip-choice-grid">
      ${equipment.map((item) => `<label class="select-chip"><input type="checkbox" name="obEquipment" value="${esc(item)}" ${d.equipment.includes(item) ? 'checked' : ''}><span>${esc(item)}</span></label>`).join('')}
    </div>
    <h3 class="onboarding-question">Zonas que quieres priorizar <small>elige hasta 3</small></h3>
    <div class="chip-choice-grid priorities-grid">
      ${priorities.map((item) => `<label class="select-chip priority-chip"><input type="checkbox" name="obPriority" value="${esc(item)}" ${d.priorities.includes(item) ? 'checked' : ''}><span>${esc(item)}</span></label>`).join('')}
    </div>
    <label class="premium-field field-wide onboarding-textarea"><span>Ejercicios o movimientos que prefieres evitar <small>opcional</small></span><textarea id="obAvoid" rows="3" placeholder="Ej. sentadilla con barra, fondos…">${esc(d.avoidedExercises)}</textarea></label>`;
}

function onboardingPathStep() {
  const d = onboardingDraft;
  return `
    <div class="onboarding-step-heading"><span class="step-symbol">05</span><div><p class="eyebrow">Elige cómo empezar</p><h1>My Fit Plan se adapta a ti, no al revés.</h1><p>Podrás combinar las tres opciones después.</p></div></div>
    <div class="path-choice-list">
      ${pathCard('recommended', 'Recomiéndame un plan', 'Analizamos tus respuestas y elegimos una división coherente que podrás editar.', 'RECOMENDADO', 'spark', d.path)}
      ${pathCard('template', 'Quiero partir de una plantilla', 'Explora divisiones profesionales como Push/Pull/Legs o Upper/Lower.', 'MÁS CONTROL', 'layers', d.path)}
      ${pathCard('custom', 'Quiero crear mis propias rutinas', 'Empieza con carpetas y un constructor vacío. Tú decides cada entrenamiento.', 'LIBERTAD TOTAL', 'edit', d.path)}
    </div>`;
}

function onboardingFinishStep() {
  const d = onboardingDraft;
  const templates = templatesForProfile(d);
  if (d.path === 'template') {
    if (!d.templateId || !templates.some((item) => item.id === d.templateId)) d.templateId = templates[0]?.id || 'ppl_3';
    return `
      <div class="onboarding-step-heading"><span class="step-symbol">06</span><div><p class="eyebrow">Elige tu plantilla</p><h1>Una estructura profesional que podrás modificar por completo.</h1><p>Las plantillas se filtran según tus días, objetivo y experiencia.</p></div></div>
      <div class="template-choice-list">${templates.map((template) => onboardingTemplateCard(template, d.templateId)).join('')}</div>`;
  }
  if (d.path === 'custom') {
    return `
      <div class="onboarding-step-heading"><span class="step-symbol">06</span><div><p class="eyebrow">Tu espacio personal</p><h1>Empezarás con una carpeta y una rutina vacía.</h1><p>Podrás crear tantas carpetas como quieras: Brazo, Pierna, Viajes, Rutinas rápidas…</p></div></div>
      <div class="custom-path-preview">
        <div class="fake-folder"><span>▰</span><div><strong>Mis rutinas</strong><small>1 rutina</small></div></div>
        <div class="fake-routine"><span>01</span><div><strong>Mi primera rutina</strong><small>Añade días, ejercicios, series y descansos</small></div><b>→</b></div>
      </div>
      <div class="onboarding-insight"><span>✦</span><p><strong>No estarás bloqueado.</strong> Desde el constructor podrás importar una plantilla en cualquier momento.</p></div>`;
  }
  const recommendedId = d.templateId || programTemplates.find((item) => item.id === (Number(d.days) === 4 ? 'classic_4' : Number(d.days) >= 5 ? 'aesthetic_5' : Number(d.days) <= 2 ? 'starter_2' : 'ppl_3'))?.id || 'ppl_3';
  d.templateId = recommendedId;
  const template = programTemplates.find((item) => item.id === recommendedId) || programTemplates[1];
  return `
    <div class="onboarding-step-heading"><span class="step-symbol">06</span><div><p class="eyebrow">Plan recomendado</p><h1>Esta es la estructura que mejor encaja con tus respuestas.</h1><p>Nada queda cerrado: cada día, nombre y ejercicio será editable.</p></div></div>
    ${onboardingTemplateCard(template, template.id, true)}
    <div class="recommendation-reasons">
      <article><span>✓</span><p><strong>${template.days} días reales</strong><small>Ajustado a tu disponibilidad semanal.</small></p></article>
      <article><span>✓</span><p><strong>${experienceLabel(d.experience)}</strong><small>Volumen inicial adaptado a tu experiencia.</small></p></article>
      <article><span>✓</span><p><strong>${d.minutes} minutos</strong><small>Número de ejercicios limitado para que puedas cumplirlo.</small></p></article>
    </div>`;
}

function choiceCard(name, value, title, subtitle, icon, selected) {
  return `<label class="choice-card"><input type="radio" name="ob-${name}" value="${esc(value)}" ${selected === value ? 'checked' : ''}><span class="choice-card-inner"><i>${esc(icon)}</i><strong>${esc(title)}</strong><small>${esc(subtitle)}</small><b>✓</b></span></label>`;
}

function pathCard(value, title, subtitle, badge, icon, selected) {
  const icons = { spark: '✦', layers: '▱', edit: '✎' };
  return `<label class="path-choice"><input type="radio" name="obPath" value="${value}" ${selected === value ? 'checked' : ''}><span class="path-choice-inner"><i>${icons[icon]}</i><span><em>${badge}</em><strong>${title}</strong><small>${subtitle}</small></span><b>→</b></span></label>`;
}

function onboardingTemplateCard(template, selectedId, staticCard = false) {
  const dayNames = template.dayKeys.map((key) => {
    const map = {
      fullBodyBase: 'Fuerza total · Base', fullBodyProgress: 'Fuerza total · Progresión', push: 'Pecho, hombros y tríceps', pull: 'Espalda y bíceps', legs: 'Pierna completa',
      chestTriceps: 'Pecho y tríceps', backBiceps: 'Espalda y bíceps', legsGlutes: 'Pierna y glúteos', shouldersArms: 'Hombros y brazos', chest: 'Pecho', back: 'Espalda', legStrength: 'Pierna', gluteHam: 'Glúteos e isquios',
      upperStrength: 'Tren superior · Fuerza', lowerStrength: 'Tren inferior · Fuerza', upperVolume: 'Tren superior · Volumen', lowerVolume: 'Tren inferior · Volumen'
    };
    return map[key] || key;
  });
  const inner = `<span class="template-card-top"><em>${esc(template.badge)}</em><b>${template.days} días</b></span><h3>${esc(template.name)}</h3><p>${esc(template.subtitle)}</p><div class="template-day-list">${dayNames.map((name, index) => `<span><b>${String(index + 1).padStart(2, '0')}</b>${esc(name)}</span>`).join('')}</div><small>${esc(template.description)}</small>`;
  if (staticCard) return `<article class="onboarding-template-card selected static">${inner}</article>`;
  return `<label class="onboarding-template-card ${selectedId === template.id ? 'selected' : ''}"><input type="radio" name="obTemplate" value="${esc(template.id)}" ${selectedId === template.id ? 'checked' : ''}>${inner}<i>✓</i></label>`;
}

function captureOnboardingStep() {
  onboardingDraft ||= onboardingDraftFromState();
  if (onboardingStep === 1) {
    onboardingDraft.name = document.querySelector('#obName')?.value.trim() || '';
    onboardingDraft.age = numberValue(document.querySelector('#obAge')?.value) || '';
    onboardingDraft.weight = numberValue(document.querySelector('#obWeight')?.value) || '';
    onboardingDraft.height = numberValue(document.querySelector('#obHeight')?.value) || '';
    onboardingDraft.adultConsent = Boolean(document.querySelector('#obAdult')?.checked);
  } else if (onboardingStep === 2) {
    onboardingDraft.objective = document.querySelector('input[name="ob-objective"]:checked')?.value || onboardingDraft.objective;
    onboardingDraft.experience = document.querySelector('input[name="ob-experience"]:checked')?.value || onboardingDraft.experience;
    onboardingDraft.location = document.querySelector('input[name="ob-location"]:checked')?.value || onboardingDraft.location;
  } else if (onboardingStep === 3) {
    onboardingDraft.days = numberValue(document.querySelector('input[name="obDays"]:checked')?.value, onboardingDraft.days);
    onboardingDraft.minutes = numberValue(document.querySelector('input[name="obMinutes"]:checked')?.value, onboardingDraft.minutes);
  } else if (onboardingStep === 4) {
    onboardingDraft.equipment = [...document.querySelectorAll('input[name="obEquipment"]:checked')].map((input) => input.value);
    onboardingDraft.priorities = [...document.querySelectorAll('input[name="obPriority"]:checked')].slice(0, 3).map((input) => input.value);
    onboardingDraft.avoidedExercises = document.querySelector('#obAvoid')?.value.trim() || '';
  } else if (onboardingStep === 5) {
    onboardingDraft.path = document.querySelector('input[name="obPath"]:checked')?.value || onboardingDraft.path;
    if (onboardingDraft.path !== 'template') onboardingDraft.templateId = null;
  } else if (onboardingStep === 6 && onboardingDraft.path === 'template') {
    onboardingDraft.templateId = document.querySelector('input[name="obTemplate"]:checked')?.value || onboardingDraft.templateId;
  }
}

function validateOnboardingStep() {
  if (onboardingStep === 1) {
    if (!onboardingDraft.name) { showToast('Escribe un nombre o apodo.', 'danger'); return false; }
    if (!onboardingDraft.adultConsent || (onboardingDraft.age && onboardingDraft.age < 18)) { showToast('Debes confirmar que eres mayor de 18 años.', 'danger'); return false; }
  }
  if (onboardingStep === 4 && !onboardingDraft.equipment.length) { showToast('Selecciona al menos un tipo de material.', 'danger'); return false; }
  return true;
}

function finishOnboarding() {
  captureOnboardingStep();
  if (!validateOnboardingStep()) return;
  const d = onboardingDraft;
  const profile = {
    ...(state.profile || {}),
    name: d.name,
    age: d.age,
    weight: d.weight,
    height: d.height,
    objective: d.objective,
    experience: d.experience,
    location: d.location,
    days: d.days,
    minutes: d.minutes,
    priorities: d.priorities,
    avoidedExercises: d.avoidedExercises,
    trainingPath: d.path,
    equipment: d.equipment,
    setupVersion: '3.1'
  };
  let plan;
  let folderName;
  if (d.path === 'custom') {
    plan = createBlankPlan('Mi primera rutina');
    folderName = 'Mis rutinas';
  } else {
    plan = buildPlanFromTemplate(d.templateId || null, profile);
    folderName = d.path === 'template' ? 'Plantillas elegidas' : 'Plan recomendado';
  }
  const folder = { id: uid('folder'), name: folderName, icon: 'folder', createdAt: new Date().toISOString(), routines: [clone(plan)] };
  state.profile = profile;
  state.plan = plan;
  state.routineFolders = [folder, ...(state.routineFolders || []).filter((item) => item.routines?.some((routine) => routine.id !== state.plan?.id))];
  state.activeFolderId = folder.id;
  state.activeRoutineId = plan.id;
  state.nextWorkoutIndex = 0;
  state.activeWorkout = null;
  state.onboardingCompleted = true;
  state.onboardingChoice = d.path;
  state.createdAt ||= new Date().toISOString();
  recordProfileWeight(profile.weight);
  save();
  showToast(d.path === 'custom' ? 'Tu espacio de rutinas está listo.' : 'Tu nuevo plan está listo para personalizar.', 'success');
  setView('plan');
}

function keepCurrentConfiguration() {
  state.profile = { ...state.profile, setupVersion: '3.1', trainingPath: state.profile?.trainingPath || 'recommended' };
  state.onboardingCompleted = true;
  ensureRoutineLibrary();
  save();
  setView('home');
  showToast('Configuración actual conservada.', 'success');
}


function openCoachDetails() {
  const coach = buildCoachDashboard(state.history, state.plan, state.nextWorkoutIndex, state.profile, state.customExercises);
  const weekly = coach.weekly;
  const wrapper = openModal(`<div class="modal-header coach-modal-header">
      <div>
        <div class="coach-modal-brand"><span>MFP</span><small>ENTRENADOR · ANÁLISIS LOCAL</small></div>
        <h2>${esc(coach.headline)}</h2>
        <p class="muted">${esc(coach.description)}</p>
      </div>
      <button class="modal-close" type="button" data-close-modal>×</button>
    </div>

    <section class="coach-overview-grid">
      <article><small>Confianza del análisis</small><strong>${coach.confidence}%</strong><span>${esc(coach.confidenceLabel)}</span></article>
      <article><small>Ejercicios analizados</small><strong>${coach.analysedCount}</strong><span>de ${coach.insights.length || 0}</span></article>
      <article><small>Adherencia semanal</small><strong>${weekly.adherence}%</strong><span>${weekly.sessions}/${weekly.goal} sesiones</span></article>
      <article><small>Mejoras esta semana</small><strong>${weekly.improvedExercises}</strong><span>${weekly.records} récord${weekly.records === 1 ? '' : 's'}</span></article>
    </section>

    <section class="coach-weekly-panel">
      <div><p class="eyebrow">Lectura semanal</p><h3>${weekly.sessions >= weekly.goal ? 'Objetivo completado' : 'Semana en curso'}</h3><p>${esc(weekly.recommendation)}</p></div>
      <div class="coach-weekly-facts">
        <span><small>Tiempo entrenado</small><strong>${weekly.totalMinutes} min</strong></span>
        <span><small>Mayor progreso</small><strong>${weekly.strongest ? esc(weekly.strongest.name) : 'Aún sin comparación'}</strong></span>
        <span><small>Menor presencia</small><strong>${weekly.leastWorked ? esc(weekly.leastWorked.muscle) : '—'}</strong></span>
      </div>
    </section>

    <section class="coach-next-session">
      <div class="section-title-row">
        <div><p class="eyebrow">Próxima sesión</p><h3>${esc(coach.nextDay?.name || 'Sin sesión preparada')}</h3></div>
        <span class="pill">${coach.insights.length} ejercicios</span>
      </div>
      ${coach.insights.length ? `<div class="coach-insight-list">${coach.insights.map(coachInsightHtml).join('')}</div>` : '<div class="coach-empty-analysis"><p>Crea una rutina o registra una sesión para obtener recomendaciones.</p></div>'}
    </section>

    <section class="coach-method-note">
      <strong>Cómo se calcula</strong>
      <p>My Fit Plan compara carga, repeticiones, series completadas, volumen y esfuerzo percibido. Utiliza reglas de doble progresión y tendencias de las últimas sesiones. No diagnostica lesiones ni sustituye a un entrenador presencial.</p>
    </section>

    <div class="modal-actions">
      <button class="button button-secondary" type="button" data-close-modal>Cerrar</button>
      <button class="button button-primary" type="button" id="coachStartSession" ${coach.nextDay ? '' : 'disabled'}>Empezar próxima sesión</button>
    </div>`, { wide: true });

  wrapper.querySelector('#coachStartSession')?.addEventListener('click', () => {
    wrapper._closeModal();
    setView('workout');
  });
}

function coachInsightHtml(insight) {
  const metrics = insight.metrics || {};
  const latestLabel = insight.latest
    ? `${metrics.weight ? `${formatWeight(metrics.weight)} kg · ` : ''}${metrics.totalReps || 0} reps totales`
    : 'Sin datos anteriores';
  return `<article class="coach-insight coach-insight-${insight.tone}">
    <span class="coach-insight-icon">${insight.icon}</span>
    <div class="coach-insight-copy">
      <div class="coach-insight-top"><span>${esc(insight.label)}</span><small>${insight.confidence}% confianza</small></div>
      <h4>${esc(insight.exerciseName)}</h4>
      <strong>${esc(insight.title)}</strong>
      <p>${esc(insight.text)}</p>
      <div class="coach-insight-bottom"><span>${esc(latestLabel)}</span><b>${esc(insight.nextGoal)}</b></div>
    </div>
  </article>`;
}

function weeklyMessage(completed, goal) {
  if (completed >= goal) return 'Objetivo semanal completado. Mantén la recuperación y la constancia.';
  const pending = goal - completed;
  return pending === 1 ? 'Te queda una sesión para completar la semana.' : `Te quedan ${pending} sesiones para completar la semana.`;
}

function averageDuration() {
  if (!state.history.length) return 0;
  return state.history.reduce((sum, session) => sum + numberValue(session.durationSeconds), 0) / state.history.length;
}

function findLatestProgress() {
  const latest = state.history[0];
  if (!latest) return null;
  for (const exercise of latest.exercises || []) {
    const previous = lastExercisePerformance(state.history.slice(1), exercise.exerciseId);
    if (!previous) continue;
    const currentVolume = exerciseVolume(exercise);
    const previousVolume = exerciseVolume(previous.exercise);
    if (currentVolume > previousVolume && previousVolume > 0) {
      const data = getExercise(exercise.exerciseId, state.customExercises);
      const percentage = Math.round(((currentVolume - previousVolume) / previousVolume) * 100);
      return { name: data.name, text: `+${percentage}% de volumen frente a la sesión anterior` };
    }
  }
  return null;
}

function radioGroup(name, legend, options, selected) {
  return `<fieldset class="fieldset"><legend>${esc(legend)}</legend><div class="option-grid">${options.map(([value, label]) => `<label class="option"><input type="radio" name="${esc(name)}" value="${esc(value)}" ${String(value) === String(selected) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}</div></fieldset>`;
}

function checkboxOption(name, value, label, checked) {
  return `<label class="check-option"><input type="checkbox" name="${esc(name)}" value="${esc(value)}" ${checked ? 'checked' : ''}><span class="check-box">✓</span><span>${esc(label)}</span></label>`;
}

function createDemoPlan() {
  state.profile = {
    name: 'Demo', age: 25, weight: 75, height: 178, objective: 'muscle', experience: 'beginner', location: 'gym', days: 3, minutes: 45,
    priorities: ['Pecho', 'Espalda'], avoidedExercises: '', trainingPath: 'recommended', setupVersion: '3.1',
    equipment: ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio']
  };
  state.plan = buildPlan(state.profile, 'ppl_3');
  const folder = { id: uid('folder'), name: 'Plan recomendado', icon: 'folder', createdAt: new Date().toISOString(), routines: [clone(state.plan)] };
  state.routineFolders = [folder];
  state.activeFolderId = folder.id;
  state.activeRoutineId = state.plan.id;
  state.onboardingCompleted = true;
  state.onboardingChoice = 'recommended';
  state.createdAt = new Date().toISOString();
  state.weightHistory = [{ id: uid('weight'), date: isoDay(), weight: 75 }];
  save();
  showToast('Espacio de demostración creado.', 'success');
  setView('home');
}

function ensureRoutineLibrary() {
  state.routineFolders ||= [];
  if (!state.routineFolders.length && state.plan) {
    const folder = { id: uid('folder'), name: 'Mis rutinas', icon: 'folder', createdAt: new Date().toISOString(), routines: [clone(state.plan)] };
    state.routineFolders = [folder];
    state.activeFolderId = folder.id;
    state.activeRoutineId = state.plan.id;
  }
  let activeFolder = state.routineFolders.find((folder) => folder.id === state.activeFolderId);
  let activeRoutine = activeFolder?.routines?.find((routine) => routine.id === state.activeRoutineId);
  if (!activeRoutine) {
    for (const folder of state.routineFolders) {
      const routine = folder.routines?.find((item) => item.id === state.activeRoutineId);
      if (routine) { activeFolder = folder; activeRoutine = routine; break; }
    }
  }
  if (!activeRoutine) {
    activeFolder = state.routineFolders.find((folder) => folder.routines?.length) || state.routineFolders[0];
    activeRoutine = activeFolder?.routines?.[0] || null;
  }
  if (activeRoutine) {
    state.activeFolderId = activeFolder.id;
    state.activeRoutineId = activeRoutine.id;
    if (!state.plan || state.plan.id !== activeRoutine.id) state.plan = clone(activeRoutine);
  }
}

function syncActiveRoutineFromPlan() {
  if (!state.plan || !state.activeRoutineId || !Array.isArray(state.routineFolders)) return;
  for (const folder of state.routineFolders) {
    const index = folder.routines?.findIndex((routine) => routine.id === state.activeRoutineId) ?? -1;
    if (index >= 0) {
      state.plan.updatedAt = new Date().toISOString();
      folder.routines[index] = clone(state.plan);
      return;
    }
  }
}

function activeFolder() {
  return state.routineFolders?.find((folder) => folder.id === state.activeFolderId) || state.routineFolders?.[0] || null;
}

function ensurePlanAccordionState(days = []) {
  const planId = state.plan?.id || 'no-plan';
  if (planAccordionPlanId === planId) return;
  collapsedPlanDays = new Set(days.map((_, index) => index).filter((index) => index !== clamp(Number(state.nextWorkoutIndex) || 0, 0, Math.max(0, days.length - 1))));
  planAccordionPlanId = planId;
}

function ensureWorkoutAccordionState(workout) {
  if (!workout || workoutAccordionSessionId === workout.id) return;
  const firstIncomplete = workout.exercises.findIndex((exercise) => completedSets(exercise).length < exercise.sets.length);
  const openIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
  collapsedWorkoutExercises = new Set(workout.exercises.map((_, index) => index).filter((index) => index !== openIndex));
  workoutAccordionSessionId = workout.id;
}

function planDayDuration(day) {
  const exerciseSeconds = (day.exercises || []).reduce((sum, item) => {
    const sets = Math.max(1, Number(item.targetSets) || 1);
    const work = sets * 45;
    const rest = Math.max(0, sets - 1) * (Number(item.restSeconds) || 75);
    return sum + work + rest;
  }, 0);
  return Math.max(10, Math.round(exerciseSeconds / 60));
}


function plannerMiniWeekHtml(week) {
  return `<div class="planner-mini-week">${week.days.map((day) => {
    const occurrence = day.occurrences.find((item) => !['moved', 'skipped'].includes(item.status)) || day.occurrences[0];
    const status = occurrence?.status || 'rest';
    return `<button type="button" class="planner-mini-day status-${status} ${day.today ? 'is-today' : ''}" data-nav-local="calendar">
      <small>${day.short}</small>
      <strong>${day.dayNumber}</strong>
      <i>${status === 'completed' ? '✓' : status === 'missed' ? '!' : occurrence ? '•' : ''}</i>
    </button>`;
  }).join('')}</div>`;
}

function renderCalendarPlanner() {
  if (!state.plan?.days?.length) {
    app.innerHTML = `<section class="page"><div class="card locked-card"><h1>Primero crea una rutina</h1><p class="muted">El calendario necesita una rutina activa para distribuir sus sesiones.</p><button class="button button-primary" type="button" data-nav-local="plan">Ir a mis rutinas</button></div></section>`;
    return;
  }

  ensurePlanner();
  const weekDate = plannerWeekOffsetDate(plannerWeekOffset);
  const week = buildPlannerWeek(state.planner, state.plan, state.history, weekDate);
  const summary = buildPlannerSummary(state.planner, state.plan, state.history);
  const missed = summary.missed;
  const next = summary.next;

  app.innerHTML = `<section class="page planner-page">
    <header class="planner-hero">
      <div class="planner-hero-top">
        <button class="planner-back-button" type="button" data-nav-local="plan">←</button>
        <div class="planner-hero-brand"><span class="coach-mark">MFP</span><span><small>PLANIFICACIÓN INTELIGENTE</small><strong>${esc(state.plan.name || 'Rutina activa')}</strong></span></div>
        <button class="button button-secondary button-small" type="button" data-action="planner-settings">Configurar semana</button>
      </div>
      <div class="planner-hero-copy">
        <div>
          <p class="eyebrow">Tu semana real</p>
          <h1>Entrena con orden, incluso cuando cambian tus planes.</h1>
          <p>${esc(summary.message)} Las sesiones movidas conservan el orden de la rutina y las omitidas no bloquean el calendario.</p>
        </div>
        <div class="planner-hero-score">
          <strong>${summary.adherence}%</strong>
          <small>cumplimiento semanal</small>
        </div>
      </div>
      <div class="planner-hero-metrics">
        <span><strong>${week.completed}</strong><small>completadas esta semana</small></span>
        <span class="${missed.length ? 'alert' : ''}"><strong>${missed.length}</strong><small>sesiones pendientes</small></span>
        <span><strong>${next ? formatPlannerDate(next.date, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</strong><small>próxima sesión</small></span>
      </div>
    </header>

    <section class="planner-toolbar">
      <button class="planner-week-arrow" type="button" data-action="planner-prev-week" aria-label="Semana anterior">←</button>
      <div><p class="eyebrow">Semana</p><h2>${esc(week.label)}</h2></div>
      <button class="planner-week-arrow" type="button" data-action="planner-next-week" aria-label="Semana siguiente">→</button>
      <button class="button button-ghost button-small" type="button" data-action="planner-today">Hoy</button>
    </section>

    <section class="planner-week-grid">
      ${week.days.map(plannerDayHtml).join('')}
    </section>

    ${missed.length ? `<section class="planner-recovery-panel">
      <div class="planner-recovery-heading">
        <div><p class="eyebrow">Sesiones pendientes</p><h2>Recupera la semana sin desordenar tu rutina</h2><p>My Fit Plan puede buscar huecos libres con descanso suficiente.</p></div>
        <button class="button button-primary" type="button" data-action="planner-smart-replan">Reorganizar automáticamente</button>
      </div>
      <div class="planner-missed-list">${missed.slice(0, 6).map(plannerMissedHtml).join('')}</div>
    </section>` : `<section class="planner-clear-panel"><span>✓</span><div><strong>Calendario al día</strong><p>No hay sesiones perdidas pendientes de recolocar.</p></div></section>`}

    <section class="planner-next-panel">
      <div class="section-title-row"><div><p class="eyebrow">Próximos pasos</p><h2>Agenda de entrenamiento</h2></div><span class="pill">${esc(state.planner.preferredTime)}</span></div>
      ${plannerUpcomingHtml()}
    </section>
  </section>`;
}

function plannerDayHtml(day) {
  return `<article class="planner-day-card ${day.today ? 'is-today' : ''}">
    <header><span><small>${day.short}</small><strong>${day.dayNumber}</strong></span><em>${esc(day.monthLabel)}</em></header>
    <div class="planner-day-events">
      ${day.occurrences.length ? day.occurrences.map(plannerOccurrenceHtml).join('') : '<div class="planner-rest-day"><span>Descanso</span><small>Sin sesión programada</small></div>'}
    </div>
  </article>`;
}

function plannerOccurrenceHtml(item) {
  const labels = {
    completed: 'Completada',
    missed: 'Pendiente',
    today: 'Hoy',
    planned: 'Programada',
    moved: 'Reprogramada',
    skipped: 'Omitida'
  };
  return `<div class="planner-event status-${item.status}">
    <div class="planner-event-top"><span>${labels[item.status] || 'Sesión'}</span><small>${esc(item.preferredTime)}</small></div>
    <strong>${esc(item.name)}</strong>
    <small>${item.status === 'moved' ? `Movida al ${formatPlannerDate(item.movedTo, { weekday: 'short', day: 'numeric', month: 'short' })}` : esc(item.focus || 'Rutina')}</small>
    ${['today', 'planned', 'missed'].includes(item.status) ? `<div class="planner-event-actions">
      <button type="button" data-action="planner-start" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Entrenar</button>
      <button type="button" data-action="planner-move" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Mover</button>
      <button type="button" data-action="planner-skip" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Omitir</button>
    </div>` : ''}
  </div>`;
}

function plannerMissedHtml(item) {
  return `<article>
    <span class="planner-missed-date"><strong>${new Date(`${item.date}T12:00:00`).getDate()}</strong><small>${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(`${item.date}T12:00:00`))}</small></span>
    <div><strong>${esc(item.name)}</strong><small>${formatPlannerDate(item.date)}</small></div>
    <div class="planner-missed-actions">
      <button type="button" data-action="planner-start" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Hacer ahora</button>
      <button type="button" data-action="planner-move" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Mover</button>
      <button type="button" data-action="planner-skip" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Omitir</button>
    </div>
  </article>`;
}

function plannerUpcomingHtml() {
  const items = [];
  for (let offset = 0; offset < 35 && items.length < 4; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    for (const occurrence of occurrencesForDate(state.planner, state.plan, state.history, date)) {
      if (['today', 'planned', 'missed'].includes(occurrence.status)) items.push(occurrence);
      if (items.length >= 4) break;
    }
  }
  return items.length ? `<div class="planner-upcoming-list">${items.map((item, index) => `<article>
    <span>${String(index + 1).padStart(2, '0')}</span>
    <div><strong>${esc(item.name)}</strong><small>${formatPlannerDate(item.date)} · ${esc(item.preferredTime)}</small></div>
    <button type="button" data-action="planner-start" data-date="${item.date}" data-original-date="${item.originalDate}" data-day="${item.planDayIndex}" data-id="${esc(item.id)}">Preparar</button>
  </article>`).join('')}</div>` : emptyState('Sin próximas sesiones', 'Configura tus días de entrenamiento para crear la agenda.');
}

function openPlannerSettings() {
  const planner = ensurePlanner();
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Planificación semanal</p><h2>Elige tus días habituales</h2><p class="muted small">Al guardar, el calendario empezará desde la próxima fecha disponible y conservará tu historial.</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <form id="plannerSettingsForm" class="planner-settings-form">
      <fieldset><legend>Días de entrenamiento</legend><div class="planner-weekday-picker">
        ${WEEKDAY_LABELS.map((day) => `<label><input type="checkbox" name="weekday" value="${day.value}" ${planner.weekdays.includes(day.value) ? 'checked' : ''}><span><strong>${day.short}</strong><small>${day.label}</small></span></label>`).join('')}
      </div></fieldset>
      <label class="field"><span>Hora habitual</span><input type="time" name="preferredTime" value="${esc(planner.preferredTime)}"></label>
      <div class="planner-settings-note"><span>i</span><p>La rutina rota de forma continua: si tienes cuatro entrenamientos y entrenas tres días por semana, el cuarto continúa la semana siguiente.</p></div>
      <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Guardar planificación</button></div>
    </form>`, { wide: true });

  wrapper.querySelector('#plannerSettingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const weekdays = data.getAll('weekday').map(Number);
    if (!weekdays.length) return showToast('Selecciona al menos un día.', 'danger');
    state.planner = updatePlannerSchedule(state.planner, {
      weekdays,
      preferredTime: data.get('preferredTime'),
      nextWorkoutIndex: state.nextWorkoutIndex,
      planId: state.plan?.id || ''
    });
    plannerWeekOffset = 0;
    save();
    wrapper._closeModal();
    renderCalendarPlanner();
    showToast('Calendario actualizado.', 'success');
  });
}

function plannerOccurrenceFromTarget(target) {
  return {
    id: target.dataset.id,
    date: target.dataset.date,
    originalDate: target.dataset.originalDate || target.dataset.date,
    planDayIndex: Number(target.dataset.day)
  };
}

function startPlannerOccurrence(target) {
  const occurrence = plannerOccurrenceFromTarget(target);
  const day = state.plan?.days?.[occurrence.planDayIndex];
  if (!day?.exercises?.length) return showToast('Esta sesión no tiene ejercicios.', 'danger');

  const start = () => {
    const workout = createActiveWorkout(occurrence.planDayIndex, {
      dayOverride: day,
      sessionSource: 'routine',
      sourceLabel: 'Calendario',
      sourceReason: `Sesión programada para ${formatPlannerDate(occurrence.date)}.`,
      sourcePlanDayIndex: occurrence.planDayIndex,
      scheduledDate: occurrence.date,
      plannerOccurrenceId: occurrence.id
    });
    if (!workout) return showToast('No se pudo preparar la sesión.', 'danger');
    save();
    setView('workout');
    showToast('Sesión del calendario preparada.', 'success');
  };

  if (state.activeWorkout) {
    confirmAction({
      title: 'Cambiar de sesión',
      message: 'Ya existe un entrenamiento en curso. Para abrir esta sesión habrá que descartarlo.',
      confirmLabel: 'Cambiar sesión',
      danger: true,
      onConfirm: () => {
        clearRestTimer();
        state.activeWorkout = null;
        start();
      }
    });
  } else start();
}

function openPlannerMove(target) {
  const occurrence = plannerOccurrenceFromTarget(target);
  const defaultDate = isoDay(new Date());
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Reprogramar sesión</p><h2>Mover ${esc(state.plan.days[occurrence.planDayIndex]?.name || 'entrenamiento')}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <form id="plannerMoveForm" class="form-grid">
      <label class="field"><span>Nueva fecha</span><input type="date" name="targetDate" min="${defaultDate}" value="${defaultDate}" required></label>
      <p class="privacy-note">La sesión conserva su posición en la rutina. El calendario mostrará el cambio en la fecha original.</p>
      <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Mover sesión</button></div>
    </form>`);

  wrapper.querySelector('#plannerMoveForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const targetDate = new FormData(event.currentTarget).get('targetDate');
    state.planner = movePlannerOccurrence(state.planner, occurrence, targetDate);
    save();
    wrapper._closeModal();
    renderCalendarPlanner();
    showToast('Sesión reprogramada.', 'success');
  });
}

function skipPlannerTarget(target) {
  const occurrence = plannerOccurrenceFromTarget(target);
  const name = state.plan?.days?.[occurrence.planDayIndex]?.name || 'esta sesión';
  confirmAction({
    title: 'Omitir sesión',
    message: `Se marcará ${name} como omitida. La siguiente fecha continuará con el día siguiente de la rotación.`,
    confirmLabel: 'Omitir',
    danger: true,
    onConfirm: () => {
      state.planner = skipPlannerOccurrence(state.planner, occurrence);
      save();
      renderCalendarPlanner();
      showToast('Sesión omitida.');
    }
  });
}

function replanMissedSessions() {
  const result = smartReplanMissed(state.planner, state.plan, state.history);
  if (!result.moved.length) return showToast('No hay sesiones pendientes que recolocar.');
  state.planner = result.planner;
  plannerWeekOffset = 0;
  save();
  renderCalendarPlanner();
  showToast(`${result.moved.length} sesión${result.moved.length === 1 ? '' : 'es'} reprogramada${result.moved.length === 1 ? '' : 's'}.`, 'success');
}

function renderPlan() {
  if (!state.profile) return renderLocked('Primero configura My Fit Plan.', 'Completa el onboarding para crear o importar tus primeras rutinas.');
  ensureRoutineLibrary();
  const folders = state.routineFolders || [];
  const folder = activeFolder();
  const routines = folder?.routines || [];
  const days = state.plan?.days || [];
  ensurePlanAccordionState(days);
  app.innerHTML = `
    <section class="page routines-page">
      <header class="routines-header">
        <div><p class="eyebrow">Tu espacio de entrenamiento</p><h1>Planes y rutinas</h1><p class="muted">Organiza carpetas, combina plantillas y construye entrenamientos completamente tuyos.</p></div>
        <button class="button button-secondary" type="button" data-nav-local="calendar">▦ Ver calendario</button>
        <button class="button button-primary" type="button" data-action="create-folder">＋ Carpeta</button>
      </header>

      <section class="routine-folder-rail" aria-label="Carpetas de rutinas">
        ${folders.map((item) => `<button type="button" class="routine-folder-tab ${item.id === folder?.id ? 'active' : ''}" data-action="select-folder" data-id="${esc(item.id)}"><span>▰</span><strong>${esc(item.name)}</strong><small>${item.routines?.length || 0}</small></button>`).join('')}
      </section>

      ${folder ? `<section class="folder-workspace">
        <div class="folder-title-row">
          <div><span class="folder-label">CARPETA ACTIVA</span><h2>${esc(folder.name)}</h2></div>
          <div class="inline-actions">
            <button class="icon-button" type="button" data-action="rename-folder" data-id="${esc(folder.id)}" aria-label="Renombrar carpeta">✎</button>
            <button class="icon-button danger-icon" type="button" data-action="delete-folder" data-id="${esc(folder.id)}" aria-label="Eliminar carpeta">×</button>
            <button class="button button-primary button-small" type="button" data-action="create-routine" data-folder="${esc(folder.id)}">＋ Rutina</button>
          </div>
        </div>
        <div class="routine-card-grid">
          ${routines.length ? routines.map((routine) => routineLibraryCard(routine)).join('') : emptyState('Carpeta vacía', 'Crea una rutina desde cero o parte de una plantilla profesional.', `<button class="button button-primary" type="button" data-action="create-routine" data-folder="${esc(folder.id)}">Crear rutina</button>`)}
        </div>
      </section>` : emptyState('No hay carpetas', 'Crea una carpeta para organizar tus primeras rutinas.', '<button class="button button-primary" type="button" data-action="create-folder">Crear carpeta</button>')}

      ${state.plan ? `<section class="active-routine-editor">
        <div class="active-routine-heading">
          <div><span class="active-indicator"><i></i> RUTINA ACTIVA</span><h2>${esc(state.plan.name || 'Mi rutina')}</h2><p>${esc(state.plan.description || 'Rutina personalizada.')}</p></div>
          <div class="routine-heading-actions">
            <button class="button button-secondary button-small" type="button" data-action="rename-routine" data-id="${esc(state.activeRoutineId)}">Renombrar</button>
            <button class="button button-secondary button-small" type="button" data-action="duplicate-routine" data-id="${esc(state.activeRoutineId)}">Duplicar</button>
            <button class="button button-primary button-small" type="button" data-action="add-day">＋ Entrenamiento</button>
          </div>
        </div>
        <div class="plan-toolbar card premium-plan-toolbar">
          <span><strong>${days.length}</strong> entrenamientos · <strong>${days.reduce((sum, day) => sum + day.exercises.length, 0)}</strong> ejercicios</span>
          <div class="inline-actions">
            <button class="button button-secondary button-small accordion-all-button" type="button" data-action="toggle-all-plan-days">${collapsedPlanDays.size ? 'Abrir todos' : 'Recoger todos'}</button>
            <button class="button button-secondary button-small" type="button" data-action="onboarding-start">Reconfigurar</button>
            ${state.plan.templateId !== 'custom' ? '<button class="button button-danger button-small" type="button" data-action="restore-plan">Restaurar plantilla</button>' : ''}
          </div>
        </div>
        <div class="plan-days section">${days.map((day, dayIndex) => renderPlanDay(day, dayIndex)).join('')}</div>
        <section class="section notice">Los cambios se guardan dentro de esta rutina. Puedes cambiar de rutina sin perder el resto de tu biblioteca.</section>
      </section>` : ''}
    </section>`;
}

function routineLibraryCard(routine) {
  const active = routine.id === state.activeRoutineId;
  const exerciseCount = routine.days?.reduce((sum, day) => sum + (day.exercises?.length || 0), 0) || 0;
  return `<article class="routine-library-card ${active ? 'active' : ''}">
    <button class="routine-card-main" type="button" data-action="select-routine" data-id="${esc(routine.id)}">
      <span class="routine-card-badge">${active ? 'ACTIVA' : (routine.templateId === 'custom' ? 'PERSONAL' : 'PLANTILLA')}</span>
      <h3>${esc(routine.name || 'Mi rutina')}</h3>
      <p>${esc(routine.description || 'Rutina personalizada.')}</p>
      <div class="routine-card-stats"><span><b>${routine.days?.length || 0}</b> días</span><span><b>${exerciseCount}</b> ejercicios</span></div>
    </button>
    <div class="routine-card-actions">
      <button type="button" data-action="rename-routine" data-id="${esc(routine.id)}">✎</button>
      <button type="button" data-action="duplicate-routine" data-id="${esc(routine.id)}">⧉</button>
      <button class="danger" type="button" data-action="delete-routine" data-id="${esc(routine.id)}">×</button>
    </div>
  </article>`;
}

function renderPlanDay(day, dayIndex) {
  const collapsed = collapsedPlanDays.has(dayIndex);
  const duration = planDayDuration(day);
  return `<article class="card plan-day ${dayIndex === state.nextWorkoutIndex ? 'next-day' : ''} ${collapsed ? 'is-collapsed' : ''}">
    <div class="plan-day-header">
      <button class="plan-day-summary-button" type="button" data-action="toggle-plan-day" data-day="${dayIndex}" aria-expanded="${!collapsed}">
        <span class="plan-day-heading-copy"><span class="pill">Día ${dayIndex + 1}</span><strong>${esc(day.name)}</strong><small>${day.exercises.length} ejercicios · ${duration} min aprox.</small></span>
        ${dayIndex === state.nextWorkoutIndex ? '<span class="pill pill-success">Siguiente</span>' : ''}
        <span class="accordion-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="inline-actions plan-day-header-actions">
        <button class="icon-button" type="button" data-action="rename-day" data-day="${dayIndex}" aria-label="Cambiar nombre">✎</button>
        <button class="icon-button danger-icon" type="button" data-action="delete-day" data-day="${dayIndex}" aria-label="Eliminar día">×</button>
      </div>
    </div>
    <div class="plan-day-body" ${collapsed ? 'hidden' : ''}>
      <div class="plan-exercise-list">
        ${day.exercises.length ? day.exercises.map((item, exerciseIndex) => renderPlanExercise(item, dayIndex, exerciseIndex, day.exercises.length)).join('') : emptyState('Día vacío', 'Añade al menos un ejercicio para poder entrenarlo.')}
      </div>
      <div class="plan-day-actions">
        <button class="button button-secondary" type="button" data-action="picker-plan-add" data-day="${dayIndex}">＋ Añadir ejercicio</button>
        <button class="button button-primary" type="button" data-action="start-specific-day" data-day="${dayIndex}" ${day.exercises.length ? '' : 'disabled'}>Entrenar este día</button>
      </div>
    </div>
  </article>`;
}

function renderPlanExercise(item, dayIndex, exerciseIndex, total) {
  const exercise = getExercise(item.exerciseId, state.customExercises);
  return `<div class="plan-exercise-row">
    <button class="exercise-name-button" type="button" data-action="exercise-details" data-id="${esc(item.exerciseId)}">
      <span class="exercise-index">${exerciseIndex + 1}</span>
      <span><strong>${esc(exercise.name)}</strong><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small></span>
    </button>
    <div class="plan-targets">
      <label><small>Series</small><input type="number" min="1" max="10" value="${item.targetSets}" data-action="plan-target" data-field="targetSets" data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label>
      <label><small>Mín.</small><input type="number" min="1" max="1000" value="${item.repMin}" data-action="plan-target" data-field="repMin" data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label>
      <label><small>Máx.</small><input type="number" min="1" max="1000" value="${item.repMax}" data-action="plan-target" data-field="repMax" data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label>
      <label><small>Descanso s</small><input type="number" min="15" max="600" step="5" value="${item.restSeconds}" data-action="plan-target" data-field="restSeconds" data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label>
    </div>
    <div class="row-actions">
      <button class="icon-button" type="button" data-action="move-plan-exercise" data-direction="up" data-day="${dayIndex}" data-exercise="${exerciseIndex}" ${exerciseIndex === 0 ? 'disabled' : ''}>↑</button>
      <button class="icon-button" type="button" data-action="move-plan-exercise" data-direction="down" data-day="${dayIndex}" data-exercise="${exerciseIndex}" ${exerciseIndex === total - 1 ? 'disabled' : ''}>↓</button>
      <button class="icon-button" type="button" data-action="picker-plan-replace" data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Cambiar">⇄</button>
      <button class="icon-button danger-icon" type="button" data-action="remove-plan-exercise" data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Quitar">×</button>
    </div>
  </div>`;
}


function routineSelection(dayIndex = state.nextWorkoutIndex) {
  const days = state.plan?.days || [];
  if (!days.length) return null;
  const safeIndex = clamp(Number(dayIndex) || 0, 0, days.length - 1);
  const day = clone(days[safeIndex]);
  return {
    source: 'routine',
    sourceLabel: 'Tu rutina',
    planDayIndex: safeIndex,
    day,
    reason: `Siguiente entrenamiento de ${state.plan?.name || 'tu rutina activa'}.`,
    confidence: 100
  };
}

function recommendedSelection({ force = false } = {}) {
  const cacheKey = [
    state.plan?.id || state.plan?.name || 'plan',
    state.nextWorkoutIndex,
    state.history.length,
    recommendationVariant,
    recommendationPreviewHistory.map((item) => item.signature).join(',')
  ].join('|');

  if (!force && currentRecommendation && recommendationCacheKey === cacheKey) {
    return currentRecommendation;
  }

  const excludeExerciseIds = recommendationPreviewHistory.flatMap((item) => item.exerciseIds || []);
  const excludeFocusIds = recommendationPreviewHistory.map((item) => item.focusId).filter(Boolean);

  currentRecommendation = buildRecommendedSession(
    state.plan,
    state.history,
    state.nextWorkoutIndex,
    state.customExercises,
    state.profile,
    {
      variant: recommendationVariant,
      excludeExerciseIds,
      excludeFocusIds,
      recommendationHistory: state.recommendationHistory || []
    }
  );
  recommendationCacheKey = cacheKey;
  return currentRecommendation;
}

function rotateRecommendedSession() {
  const current = recommendedSelection();
  if (current) {
    recommendationPreviewHistory.push({
      focusId: current.focusId,
      signature: current.signature,
      exerciseIds: [...(current.exerciseIds || [])]
    });
    recommendationPreviewHistory = recommendationPreviewHistory.slice(-10);
  }
  recommendationVariant += 1;
  currentRecommendation = null;
  recommendationCacheKey = '';
  showOptionalAlternative = true;
  renderWorkoutSelector();
  showToast('Nueva alternativa preparada.', 'success');
}

function showAlternativeOption() {
  showOptionalAlternative = true;
  currentRecommendation = null;
  recommendationCacheKey = '';
  renderWorkoutSelector();
}

function restoreCoachRecommendation() {
  showOptionalAlternative = false;
  renderWorkoutSelector();
}

function rememberRecommendedSession(selection) {
  if (!selection?.exerciseIds?.length) return;
  const entry = {
    id: uid('recommendation'),
    createdAt: new Date().toISOString(),
    focusId: selection.focusId || '',
    signature: selection.signature || [...selection.exerciseIds].sort().join('|'),
    exerciseIds: [...selection.exerciseIds]
  };
  state.recommendationHistory = [
    entry,
    ...(state.recommendationHistory || []).filter((item) => item.signature !== entry.signature)
  ].slice(0, 16);
  save();
}

function renderWorkoutSelector() {
  const routine = routineSelection();
  const alternative = recommendedSelection();
  const coachChoice = evaluateTrainingChoice({
    routine,
    alternative,
    history: state.history,
    customExercises: state.customExercises,
    weeklyGoal: state.profile?.days || state.plan?.days?.length || 3
  });
  const routineDay = routine?.day;
  const mfpBase = coachChoice.mode === 'alternative' && alternative?.day?.exercises?.length
    ? alternative
    : routine;
  const mfpDay = mfpBase?.day;

  app.innerHTML = `<section class="page workout-selector-page">
    <header class="workout-selector-hero">
      <div class="workout-selector-brand"><span class="coach-mark">MFP</span><span><small>ENTRENAR</small><strong>Elige cómo quieres entrenar hoy</strong></span></div>
      <h1>Tres formas, tres funciones distintas.</h1>
      <p>Tu rutina empieza directamente. My Fit Plan prepara una sesión según cómo llegas hoy. El personalizado lo construyes tú y también empieza directamente.</p>
    </header>

    <section class="workout-selector-grid workout-selector-grid-v347">
      ${routineDay ? `<article class="training-option-card training-option-primary">
        <div class="training-option-top">
          <span class="training-option-badge"><i></i> TU PRÓXIMA SESIÓN</span>
          <span class="training-option-number">${String((routine.planDayIndex || 0) + 1).padStart(2,'0')}</span>
        </div>
        <div class="training-option-copy">
          <p class="eyebrow">${esc(state.plan?.name || 'Rutina activa')}</p>
          <h2>${esc(routineDay.name)}</h2>
          <p>Sigue la planificación que ya tienes creada. Esta opción avanza normalmente al siguiente día cuando terminas.</p>
        </div>
        ${workoutOptionPreview(routineDay)}
        <div class="training-option-footer">
          <div class="training-option-stats">
            <span><strong>${routineDay.exercises.length}</strong><small>ejercicios</small></span>
            <span><strong>${estimatePlanMinutes(routineDay)}</strong><small>min aprox.</small></span>
            <span><strong>${routineDay.exercises.reduce((sum,item) => sum + numberValue(item.targetSets,3),0)}</strong><small>series</small></span>
          </div>
          <button class="button button-primary training-primary-button" type="button" data-action="training-routine-direct">Empezar mi rutina <span>→</span></button>
        </div>
      </article>` : `<article class="training-option-card training-option-primary training-option-disabled">
        <div class="training-option-copy"><p class="eyebrow">Tu rutina</p><h2>No hay una sesión preparada</h2><p>Crea o activa una rutina para entrenarla directamente.</p></div>
        <button class="button button-primary" type="button" data-nav="plan">Ir a mis rutinas</button>
      </article>`}

      <article class="training-option-card training-option-mfp">
        <div class="training-option-mfp-header">
          <div class="training-option-mfp-brand">
            <span class="coach-mark">MFP</span>
            <div><small>CREADO POR MY FIT PLAN</small><strong>Entrenamiento inteligente para hoy</strong></div>
          </div>
          <span class="training-confidence">${coachChoice.confidence || 70}% datos</span>
        </div>

        <div class="training-option-copy">
          <span class="coach-choice-state alternative">MY FIT PLAN</span>
          <h2>${mfpDay ? esc(mfpDay.name) : 'Prepara una sesión para hoy'}</h2>
          <p>${esc(coachChoice.reason || 'Responde unas preguntas y My Fit Plan ajustará la sesión al tiempo, energía, sueño y molestias de hoy.')}</p>
        </div>

        <div class="mfp-checkin-features">
          <span><i>01</i><strong>Tiempo disponible</strong></span>
          <span><i>02</i><strong>Energía y sueño</strong></span>
          <span><i>03</i><strong>Molestias</strong></span>
        </div>

        ${mfpDay ? `<div class="mfp-base-session">
          <small>Base que utilizará My Fit Plan</small>
          <strong>${esc(mfpDay.name)}</strong>
          <span>${mfpDay.exercises.length} ejercicios · ${estimatePlanMinutes(mfpDay)} min aprox.</span>
        </div>` : ''}

        <div class="coach-choice-actions">
          <button class="button button-primary button-block" type="button" data-action="training-mfp" ${mfpDay ? '' : 'disabled'}>Crear entrenamiento My Fit Plan</button>
          <button class="button button-ghost button-block" type="button" data-action="training-refresh-recommended" ${alternative?.day ? '' : 'disabled'}>↻ Cambiar propuesta base</button>
        </div>
      </article>

      <article class="training-option-card training-option-custom training-option-custom-v347">
        <div class="custom-option-icon">＋</div>
        <div class="training-option-copy">
          <p class="eyebrow">CREADO POR TI</p>
          <h2>Entrenamiento personalizado</h2>
          <p>Elige los ejercicios, ordénalos y configura sus series. Al terminar el constructor, el entrenamiento empieza directamente.</p>
        </div>
        <ul class="custom-option-list">
          <li>Ejercicios elegidos manualmente</li>
          <li>Series, repeticiones y descansos propios</li>
          <li>Sin check-in ni adaptación automática</li>
        </ul>
        <button class="button button-secondary button-block" type="button" data-action="training-custom">Crear mi personalizado</button>
      </article>
    </section>

    <section class="training-selector-note">
      <span>i</span>
      <p><strong>Separación clara:</strong> rutina y personalizado empiezan directamente; el cuestionario de tiempo, energía, sueño y molestias pertenece exclusivamente al entrenamiento creado por My Fit Plan.</p>
    </section>
  </section>`;
}

function workoutOptionPreview(day, compact = false) {
  const entries = (day?.exercises || []).slice(0, compact ? 4 : 5);
  return `<div class="training-exercise-preview">
    ${entries.map((item,index) => {
      const exercise = getExercise(item.exerciseId, state.customExercises);
      return `<span><i>${String(index + 1).padStart(2,'0')}</i><b>${esc(exercise.name)}</b><small>${esc(exercise.muscle)}</small></span>`;
    }).join('')}
    ${(day?.exercises?.length || 0) > entries.length ? `<em>＋${day.exercises.length - entries.length} más</em>` : ''}
  </div>`;
}

function startRoutineWorkoutDirect() {
  const selection = routineSelection();
  if (!selection?.day?.exercises?.length) {
    showToast('No hay una sesión de rutina disponible.', 'danger');
    return;
  }

  const workout = createActiveWorkout(selection.planDayIndex, {
    dayOverride: selection.day,
    sessionSource: 'routine',
    sourceLabel: 'Tu rutina',
    sourceReason: selection.reason,
    sourcePlanDayIndex: selection.planDayIndex
  });

  if (!workout) {
    showToast('No se pudo preparar la sesión de rutina.', 'danger');
    return;
  }

  pendingWorkoutSelection = null;
  customWorkoutDraft = null;
  renderWorkout();
  showToast('Rutina preparada.', 'success');
}

function startMfpWorkoutCheckin() {
  const routine = routineSelection();
  const alternative = recommendedSelection();
  const coachChoice = evaluateTrainingChoice({
    routine,
    alternative,
    history: state.history,
    customExercises: state.customExercises,
    weeklyGoal: state.profile?.days || state.plan?.days?.length || 3
  });

  const base = coachChoice.mode === 'alternative' && alternative?.day?.exercises?.length
    ? alternative
    : routine;

  if (!base?.day?.exercises?.length) {
    showToast('No hay una sesión base para My Fit Plan.', 'danger');
    return;
  }

  if (base === alternative) rememberRecommendedSession(alternative);

  pendingWorkoutSelection = {
    source: 'mfp',
    sourceLabel: 'My Fit Plan',
    planDayIndex: null,
    sourcePlanDayIndex: routine?.planDayIndex ?? null,
    day: clone(base.day),
    reason: coachChoice.reason || 'My Fit Plan ajustará esta sesión según tu check-in.',
    confidence: coachChoice.confidence || base.confidence || 70
  };
  customWorkoutDraft = null;
  renderPreWorkoutCheckin(pendingWorkoutSelection);
}

function startCustomWorkoutBuilder() {
  customWorkoutDraft = {
    id: uid('custom-session'),
    name: 'Entrenamiento personalizado',
    exercises: []
  };
  pendingWorkoutSelection = null;
  renderWorkout();
}

function renderCustomWorkoutBuilder() {
  const draft = customWorkoutDraft;
  if (!draft) return renderWorkoutSelector();

  const duration = estimatePlanMinutes(draft);
  const totalSets = draft.exercises.reduce((sum,item) => sum + numberValue(item.targetSets,3),0);

  app.innerHTML = `<section class="page custom-session-page">
    <header class="custom-session-header">
      <button class="custom-session-back" type="button" data-action="custom-session-cancel">←</button>
      <div><p class="eyebrow">Sesión libre</p><h1>Crear entrenamiento personalizado</h1><p>No se guardará dentro de tu rutina activa.</p></div>
      <span class="custom-session-duration">${draft.exercises.length ? duration : 0}<small>min aprox.</small></span>
    </header>

    <section class="custom-session-name-card">
      <label><span>Nombre de la sesión</span><input id="customSessionName" maxlength="60" value="${esc(draft.name)}" placeholder="Ej. Torso rápido"></label>
      <div class="custom-session-summary"><span><strong>${draft.exercises.length}</strong><small>ejercicios</small></span><span><strong>${totalSets}</strong><small>series</small></span></div>
    </section>

    <section class="custom-session-workspace">
      <div class="section-title-row">
        <div><p class="eyebrow">Constructor</p><h2>Ejercicios</h2></div>
        <button class="button button-primary button-small" type="button" data-action="custom-session-add">＋ Añadir ejercicio</button>
      </div>

      ${draft.exercises.length ? `<div class="custom-session-list">
        ${draft.exercises.map((item,index) => customSessionExerciseHtml(item,index,draft.exercises.length)).join('')}
      </div>` : `<div class="custom-session-empty">
        <span>＋</span>
        <h3>Empieza eligiendo tus ejercicios</h3>
        <p>Puedes añadirlos, ordenarlos y ajustar sus objetivos antes de empezar el entrenamiento.</p>
        <button class="button button-primary" type="button" data-action="custom-session-add">Abrir biblioteca</button>
      </div>`}
    </section>

    <section class="custom-session-info">
      <span>◎</span><p>Esta sesión es temporal. Al terminar, quedará registrada en tu historial, pero tu próxima sesión de rutina seguirá siendo la misma.</p>
    </section>

    <div class="custom-session-actions">
      <button class="button button-secondary" type="button" data-action="custom-session-cancel">Cancelar</button>
      <button id="customSessionContinue" class="button button-primary custom-session-continue" type="button" ${draft.exercises.length ? '' : 'disabled'}>Empezar entrenamiento <span>→</span></button>
    </div>
  </section>`;

  document.querySelector('#customSessionContinue')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    continueCustomSession();
  });
}

function customSessionExerciseHtml(item, index, total) {
  const exercise = getExercise(item.exerciseId, state.customExercises);
  return `<article class="custom-session-exercise">
    <div class="custom-session-exercise-main">
      <span class="custom-session-index">${String(index + 1).padStart(2,'0')}</span>
      <button type="button" data-action="exercise-details" data-id="${esc(item.exerciseId)}"><strong>${esc(exercise.name)}</strong><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small></button>
      <div class="custom-session-order">
        <button type="button" data-action="custom-session-move" data-index="${index}" data-direction="up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-action="custom-session-move" data-index="${index}" data-direction="down" ${index === total - 1 ? 'disabled' : ''}>↓</button>
        <button class="danger" type="button" data-action="custom-session-remove" data-index="${index}">×</button>
      </div>
    </div>
    <div class="custom-session-targets">
      <label><span>Series</span><input type="number" min="1" max="10" value="${item.targetSets}" data-action="custom-session-target" data-index="${index}" data-field="targetSets"></label>
      <label><span>Mín.</span><input type="number" min="1" max="1000" value="${item.repMin}" data-action="custom-session-target" data-index="${index}" data-field="repMin"></label>
      <label><span>Máx.</span><input type="number" min="1" max="1000" value="${item.repMax}" data-action="custom-session-target" data-index="${index}" data-field="repMax"></label>
      <label><span>Descanso</span><input type="number" min="15" max="600" step="5" value="${item.restSeconds}" data-action="custom-session-target" data-index="${index}" data-field="restSeconds"></label>
    </div>
  </article>`;
}

function cancelCustomSessionBuilder() {
  customWorkoutDraft = null;
  pendingWorkoutSelection = null;
  renderWorkout();
}

function continueCustomSession() {
  if (!customWorkoutDraft?.exercises?.length) {
    showToast('Añade al menos un ejercicio.', 'danger');
    return;
  }

  const completedDraft = clone(customWorkoutDraft);
  const day = {
    id: completedDraft.id || uid('custom-session'),
    name: String(completedDraft.name || '').trim() || 'Entrenamiento personalizado',
    exercises: clone(completedDraft.exercises)
  };

  const workout = createActiveWorkout(state.nextWorkoutIndex, {
    dayOverride: day,
    sessionSource: 'custom',
    sourceLabel: 'Personalizado',
    sourceReason: 'Sesión creada manualmente por el usuario.',
    sourcePlanDayIndex: null
  });

  if (!workout) {
    showToast('No se pudo preparar el entrenamiento personalizado.', 'danger');
    return;
  }

  pendingWorkoutSelection = null;
  customWorkoutDraft = null;
  renderWorkout();
  showToast('Entrenamiento personalizado preparado.', 'success');
}

function removeCustomSessionExercise(index) {
  if (!customWorkoutDraft?.exercises?.[index]) return;
  customWorkoutDraft.exercises.splice(index,1);
  renderCustomWorkoutBuilder();
}

function moveCustomSessionExercise(index, direction) {
  if (!customWorkoutDraft) return;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= customWorkoutDraft.exercises.length) return;
  [customWorkoutDraft.exercises[index],customWorkoutDraft.exercises[target]] =
    [customWorkoutDraft.exercises[target],customWorkoutDraft.exercises[index]];
  renderCustomWorkoutBuilder();
}

function targetNumber(target, fallback = 1) {
  const min = Number.isFinite(Number(target.min)) ? Number(target.min) : -Infinity;
  const max = Number.isFinite(Number(target.max)) ? Number(target.max) : Infinity;
  const value = numberValue(target.value, fallback);
  return clamp(value, min, max);
}

function updateCustomSessionTarget(target) {
  const item = customWorkoutDraft?.exercises?.[Number(target.dataset.index)];
  if (!item) return;
  const field = target.dataset.field;
  const fallback = numberValue(item[field], field === 'restSeconds' ? 75 : 1);
  item[field] = targetNumber(target, fallback);
  if (field === 'repMin' && item.repMax < item.repMin) item.repMax = item.repMin;
  if (field === 'repMax' && item.repMin > item.repMax) item.repMin = item.repMax;
  renderCustomWorkoutBuilder();
}

function backToWorkoutSelector() {
  pendingWorkoutSelection = null;
  customWorkoutDraft = null;
  renderWorkout();
}

function createActiveWorkout(dayIndex = state.nextWorkoutIndex, options = {}) {
  const days = state.plan?.days || [];
  const hasOverride = Boolean(options.dayOverride);
  if (!days.length && !hasOverride) return null;

  const safeIndex = days.length
    ? clamp(Number(dayIndex) || 0, 0, days.length - 1)
    : null;
  const day = clone(options.dayOverride || days[safeIndex]);
  const sessionSource = options.sessionSource || 'routine';
  const readiness = options.readiness || null;
  const adaptation = readiness
    ? buildAdaptiveSession(day, readiness, state.customExercises)
    : {
        blocked: false,
        mode: 'original',
        originalMinutes: estimatePlanMinutes(day),
        targetMinutes: estimatePlanMinutes(day),
        adaptedMinutes: estimatePlanMinutes(day),
        items: clone(day.exercises),
        removed: [],
        removedSets: 0,
        reasons: [],
        guidance: [],
        originalExerciseCount: day.exercises.length,
        adaptedExerciseCount: day.exercises.length,
        originalSetCount: day.exercises.reduce((sum, item) => sum + numberValue(item.targetSets, 3), 0),
        adaptedSetCount: day.exercises.reduce((sum, item) => sum + numberValue(item.targetSets, 3), 0)
      };

  if (adaptation.blocked) return null;

  state.activeWorkout = {
    id: uid('session'),
    planDayIndex: sessionSource === 'routine' ? safeIndex : null,
    sourcePlanDayIndex: Number.isInteger(options.sourcePlanDayIndex)
      ? options.sourcePlanDayIndex
      : sessionSource === 'routine'
        ? safeIndex
        : null,
    planDayId: day.id,
    sessionSource,
    sourceLabel: options.sourceLabel || (
      sessionSource === 'routine'
        ? 'Tu rutina'
        : sessionSource === 'mfp'
          ? 'My Fit Plan'
          : sessionSource === 'recommended'
            ? 'Recomendada por MFP'
            : 'Personalizado'
    ),
    sourceReason: options.sourceReason || '',
    scheduledDate: options.scheduledDate || '',
    plannerOccurrenceId: options.plannerOccurrenceId || '',
    name: day.name,
    startedAt: new Date().toISOString(),
    notes: '',
    restTimer: null,
    readiness,
    adaptation: {
      ...adaptation,
      originalItems: clone(day.exercises)
    },
    exercises: adaptation.items.map((planItem) => workoutExerciseFromPlan(planItem))
  };
  save();
  return state.activeWorkout;
}

function workoutExerciseFromPlan(planItem) {
  const previous = lastExercisePerformance(state.history, planItem.exerciseId)?.exercise;
  const lastSets = previous ? completedSets(previous) : [];
  const defaultWeight = lastSets.length ? lastSets[0].weight : '';
  return {
    instanceId: uid('instance'),
    slotId: planItem.slotId || uid('slot'),
    exerciseId: planItem.exerciseId,
    targetSets: Number(planItem.targetSets) || 3,
    repMin: Number(planItem.repMin) || 8,
    repMax: Number(planItem.repMax) || 12,
    unit: planItem.unit || (isTimedExercise(planItem.exerciseId) ? 'sec' : 'reps'),
    restSeconds: Number(planItem.restSeconds) || 75,
    notes: '',
    sets: Array.from({ length: Number(planItem.targetSets) || 3 }, (_, index) => ({
      id: uid(`set-${index + 1}`), weight: defaultWeight, reps: '', rir: '', completed: false, completedAt: null
    }))
  };
}


function renderPreWorkoutCheckin(selection = pendingWorkoutSelection) {
  const resolved = selection?.day ? selection : routineSelection(
    Number.isInteger(selection) ? selection : state.nextWorkoutIndex
  );
  const day = resolved?.day;
  if (!day?.exercises?.length) return renderWorkoutSelector();

  const estimated = estimatePlanMinutes(day);
  const muscleNames = [...new Set(day.exercises.map((item) => getExercise(item.exerciseId, state.customExercises).muscle))].slice(0, 4);
  const sourceEyebrow = resolved.source === 'mfp'
    ? 'ENTRENAMIENTO MY FIT PLAN'
    : resolved.source === 'routine'
      ? 'TU PRÓXIMA SESIÓN'
      : resolved.source === 'recommended'
        ? 'SESIÓN RECOMENDADA'
        : 'PREPARACIÓN DE SESIÓN';

  app.innerHTML = `<section class="page readiness-page">
    <header class="readiness-hero">
      <div class="readiness-hero-top">
        <button class="readiness-back-button" type="button" data-action="workout-selector-back">←</button>
        <div class="readiness-brand"><span class="coach-mark">MFP</span><span><small>${sourceEyebrow}</small><strong>${esc(resolved.sourceLabel || 'Entrenador adaptativo')}</strong></span></div>
        <span class="readiness-source-pill source-${esc(resolved.source || 'routine')}">${resolved.source === 'mfp' ? 'My Fit Plan' : resolved.source === 'routine' ? 'Rutina' : resolved.source === 'recommended' ? 'Recomendada' : 'Sesión'}</span>
      </div>
      <p class="eyebrow">${sourceEyebrow}</p>
      <h1>${esc(day.name)}</h1>
      <p>${day.exercises.length} ejercicios · ${estimated} min estimados · ${muscleNames.map(esc).join(' · ')}</p>
      ${resolved.reason ? `<div class="readiness-selection-reason"><span>◎</span><p>${esc(resolved.reason)}</p></div>` : ''}
    </header>

    <form id="readinessForm" class="readiness-form">
      <section class="readiness-section">
        <div class="readiness-section-heading"><span>01</span><div><h2>¿Cuánto tiempo tienes hoy?</h2><p>La adaptación se aplica solo a esta sesión.</p></div></div>
        <div class="readiness-choice-grid readiness-time-grid">
          ${[
            ['25','25 min','Esencial'],
            ['40','40 min','Equilibrada'],
            ['60','60 min','Amplia'],
            ['full','Completa',`${estimated} min aprox.`]
          ].map(([value,label,description]) => `<label class="readiness-choice">
            <input type="radio" name="timeMode" value="${value}" ${value === (estimated <= 45 ? 'full' : '40') ? 'checked' : ''}>
            <span><strong>${label}</strong><small>${description}</small></span>
          </label>`).join('')}
        </div>
      </section>

      <section class="readiness-section">
        <div class="readiness-section-heading"><span>02</span><div><h2>Energía y sueño</h2><p>Ayudan a ajustar volumen y objetivo de esfuerzo.</p></div></div>
        <div class="readiness-double-grid">
          <fieldset class="readiness-fieldset"><legend>Energía</legend>
            <div class="readiness-segmented">
              ${[['low','Baja'],['normal','Normal'],['high','Alta']].map(([value,label]) => `<label><input type="radio" name="energy" value="${value}" ${value === 'normal' ? 'checked' : ''}><span>${label}</span></label>`).join('')}
            </div>
          </fieldset>
          <fieldset class="readiness-fieldset"><legend>Sueño</legend>
            <div class="readiness-segmented">
              ${[['poor','Malo'],['normal','Normal'],['good','Bueno']].map(([value,label]) => `<label><input type="radio" name="sleep" value="${value}" ${value === 'normal' ? 'checked' : ''}><span>${label}</span></label>`).join('')}
            </div>
          </fieldset>
        </div>
      </section>

      <section class="readiness-section">
        <div class="readiness-section-heading"><span>03</span><div><h2>¿Tienes molestias?</h2><p>La app no diagnostica ni sustituye una valoración profesional.</p></div></div>
        <div class="readiness-segmented discomfort-segmented">
          ${[
            ['none','Ninguna','Entrenamiento habitual'],
            ['mild','Leves','Sin aumentos improvisados'],
            ['important','Importantes','No adaptar automáticamente']
          ].map(([value,label,description]) => `<label><input type="radio" name="discomfort" value="${value}" ${value === 'none' ? 'checked' : ''}><span><strong>${label}</strong><small>${description}</small></span></label>`).join('')}
        </div>
        <div id="readinessSafetyNotice" class="readiness-safety-notice" hidden></div>
      </section>

      <section id="readinessPreview" class="readiness-preview"></section>

      <div class="readiness-actions">
        <button class="button button-secondary" type="button" data-action="workout-selector-back">Cambiar sesión</button>
        <button class="button button-secondary" type="button" id="startOriginalWorkout">Usar propuesta completa</button>
        <button class="button button-primary readiness-start-button" type="submit">${resolved.source === 'mfp' ? 'Crear entrenamiento My Fit Plan' : 'Crear sesión adaptada'} <span>→</span></button>
      </div>
    </form>
  </section>`;

  const form = document.querySelector('#readinessForm');
  const safety = document.querySelector('#readinessSafetyNotice');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButton = document.querySelector('#startOriginalWorkout');

  const readValues = () => {
    const data = new FormData(form);
    const timeMode = String(data.get('timeMode') || 'full');
    return {
      timeMode: timeMode === 'full' ? 'full' : 'limited',
      minutes: timeMode === 'full' ? estimated : numberValue(timeMode, estimated),
      energy: String(data.get('energy') || 'normal'),
      sleep: String(data.get('sleep') || 'normal'),
      discomfort: String(data.get('discomfort') || 'none'),
      checkedAt: new Date().toISOString()
    };
  };

  const updatePreview = () => {
    const readiness = readValues();
    const adaptation = buildAdaptiveSession(day, readiness, state.customExercises);
    const preview = document.querySelector('#readinessPreview');

    if (adaptation.blocked) {
      safety.hidden = false;
      safety.className = 'readiness-safety-notice important';
      safety.innerHTML = `<strong>No se generará una sesión adaptada</strong><p>Si el dolor es intenso, repentino o cambia tu forma de moverte, pospón el entrenamiento y valora consultar con un profesional sanitario.</p>`;
      submitButton.disabled = true;
      originalButton.disabled = true;
      preview.innerHTML = `<div class="readiness-blocked-preview"><span>!</span><div><strong>Prioriza la seguridad</strong><p>Puedes volver al selector y retomar el entrenamiento cuando las molestias importantes hayan desaparecido o hayan sido valoradas.</p></div></div>`;
      return;
    }

    submitButton.disabled = false;
    originalButton.disabled = false;

    if (readiness.discomfort === 'mild') {
      safety.hidden = false;
      safety.className = 'readiness-safety-notice mild';
      safety.innerHTML = `<strong>Molestias leves</strong><p>No aumentes la carga en un movimiento molesto y detente si la molestia empeora o modifica la técnica.</p>`;
    } else {
      safety.hidden = true;
      safety.innerHTML = '';
    }

    preview.innerHTML = readinessPreviewHtml(day, readiness, adaptation);
  };

  const createSelectedWorkout = (readiness) => createActiveWorkout(
    resolved.planDayIndex ?? state.nextWorkoutIndex,
    {
      readiness,
      dayOverride: day,
      sessionSource: resolved.source || 'routine',
      sourceLabel: resolved.sourceLabel,
      sourceReason: resolved.reason,
      sourcePlanDayIndex: resolved.sourcePlanDayIndex ?? resolved.planDayIndex
    }
  );

  form.addEventListener('change', updatePreview);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const readiness = readValues();
    const workout = createSelectedWorkout(readiness);
    if (!workout) return updatePreview();
    pendingWorkoutSelection = null;
    customWorkoutDraft = null;
    renderWorkout();
    showToast(resolved.source === 'mfp' ? 'Entrenamiento My Fit Plan preparado.' : 'Sesión adaptada preparada.', 'success');
  });

  originalButton.addEventListener('click', () => {
    const readiness = { ...readValues(), timeMode: 'full', minutes: estimated, originalRequested: true };
    if (readiness.discomfort === 'important') return updatePreview();
    const workout = createSelectedWorkout(readiness);
    if (!workout) return;
    pendingWorkoutSelection = null;
    customWorkoutDraft = null;
    renderWorkout();
    showToast('Sesión completa preparada.');
  });

  updatePreview();
}

function readinessPreviewHtml(day, readiness, adaptation) {
  const summary = readinessSummary(readiness);
  const removedNames = adaptation.removed.map((item) => item.name);
  const changed = adaptation.mode === 'adaptive'
    && (adaptation.removed.length || adaptation.removedSets || adaptation.adaptedMinutes !== adaptation.originalMinutes);

  return `<div class="readiness-preview-header">
      <div><p class="eyebrow">Vista previa</p><h2>${changed ? 'Sesión adaptada' : 'Sesión completa'}</h2></div>
      <span class="readiness-duration">${adaptation.adaptedMinutes}<small>min aprox.</small></span>
    </div>
    <div class="readiness-preview-metrics">
      <span><strong>${adaptation.adaptedExerciseCount}</strong><small>de ${adaptation.originalExerciseCount} ejercicios</small></span>
      <span><strong>${adaptation.adaptedSetCount}</strong><small>de ${adaptation.originalSetCount} series</small></span>
      <span><strong>${summary.energy}</strong><small>energía</small></span>
      <span><strong>${summary.sleep}</strong><small>sueño</small></span>
    </div>
    ${removedNames.length ? `<div class="readiness-removed"><small>Se omiten solo hoy</small><strong>${removedNames.map(esc).join(' · ')}</strong></div>` : ''}
    <div class="readiness-guidance-list">
      ${adaptation.guidance.map((note) => `<p><span>✓</span>${esc(note)}</p>`).join('')}
    </div>
    <p class="readiness-original-note">La rutina permanente “${esc(day.name)}” no se modifica.</p>`;
}

function renderWorkout() {
  if (!state.activeWorkout) {
    if (customWorkoutDraft) return renderCustomWorkoutBuilder();
    if (pendingWorkoutSelection) return renderPreWorkoutCheckin(pendingWorkoutSelection);
    return renderWorkoutSelector();
  }
  const workout = state.activeWorkout;
  ensureWorkoutAccordionState(workout);
  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const doneSets = allSets.filter((set) => set.completed).length;
  const percentage = allSets.length ? Math.round((doneSets / allSets.length) * 100) : 0;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000));
  const finishedExercises = workout.exercises.filter((exercise) => exercise.sets.length && completedSets(exercise).length === exercise.sets.length).length;
  const deload = buildDeloadRecommendation(state.history, state.plan, state.profile, state.customExercises);

  app.innerHTML = `
    <section class="page workout-page premium-workout-page">
      <header class="workout-command-header">
        <div>
          <p class="eyebrow"><span class="live-dot"></span> Entrenamiento en curso · ${esc(workout.sourceLabel || 'Tu rutina')}</p>
          <h1>${esc(workout.name)}</h1>
          <p>${finishedExercises} de ${workout.exercises.length} ejercicios completados</p>
        </div>
        <div class="workout-header-actions">
          <button class="accordion-all-button workout-accordion-all" type="button" data-action="toggle-all-workout-exercises">${collapsedWorkoutExercises.size ? 'Abrir todos' : 'Recoger todos'}</button>
          <button class="command-add-button" type="button" data-action="picker-workout-add"><span>＋</span> Ejercicio</button>
        </div>
      </header>

      ${workout.adaptation ? `<section class="active-adaptation-banner ${workout.adaptation.mode === 'adaptive' ? 'is-adapted' : ''}">
        <div class="active-adaptation-copy">
          <span class="active-adaptation-icon">${workout.adaptation.mode === 'adaptive' ? '≈' : '◎'}</span>
          <div>
            <small>${workout.adaptation.mode === 'adaptive' ? `SESIÓN ADAPTADA · ${workout.adaptation.adaptedMinutes} MIN` : 'SESIÓN COMPLETA'}</small>
            <strong>${workout.adaptation.mode === 'adaptive' ? `${workout.adaptation.adaptedExerciseCount} ejercicios y ${workout.adaptation.adaptedSetCount} series` : 'Rutina original sin recortes'}</strong>
          </div>
        </div>
        <div class="active-adaptation-actions">
          <button type="button" class="button button-ghost button-small" data-action="workout-adaptation-details">Ver ajustes</button>
          ${workout.adaptation.mode === 'adaptive' && !doneSets ? '<button type="button" class="button button-secondary button-small" data-action="restore-full-workout">Restaurar completa</button>' : ''}
        </div>
      </section>` : ''}

      ${deload.recommended ? `<section class="deload-workout-banner ${workout.deload?.applied ? 'is-applied' : ''}">
        <div class="deload-workout-copy">
          <span class="deload-workout-icon">${workout.deload?.applied ? '✓' : '↘'}</span>
          <div><small>${workout.deload?.applied ? 'DESCARGA APLICADA' : 'SEÑAL DE RECUPERACIÓN'}</small><strong>${workout.deload?.applied ? 'Carga y volumen reducidos para esta sesión' : esc(deload.title)}</strong><p>${workout.deload?.applied ? 'Puedes continuar con los objetivos ajustados.' : esc(deload.text)}</p></div>
        </div>
        <div class="deload-workout-actions">
          <button class="button button-ghost button-small" type="button" data-action="deload-details">Ver motivos</button>
          ${!workout.deload?.applied && !doneSets ? '<button class="button button-secondary button-small" type="button" data-action="apply-deload">Aplicar descarga</button>' : ''}
        </div>
      </section>` : ''}

      <section class="workout-control-deck">
        <div class="workout-progress-ring" style="--progress:${percentage * 3.6}deg"><div><strong>${percentage}%</strong><small>completado</small></div></div>
        <div class="workout-live-metrics">
          <div><span>Series</span><strong>${doneSets}<small>/${allSets.length}</small></strong></div>
          <div><span>Tiempo</span><strong data-live-duration>${formatDuration(elapsed)}</strong></div>
          <div><span>Volumen</span><strong>${formatWeight(sessionVolume(workout))}<small> kg</small></strong></div>
        </div>
      </section>

      <div class="workout-progress-track"><i style="width:${percentage}%"></i></div>

      <div class="workout-list premium-workout-list section">
        ${workout.exercises.map((exercise, index) => renderWorkoutExercise(exercise, index)).join('')}
      </div>

      <section class="section premium-notes-card">
        <div><p class="eyebrow">Diario de sesión</p><h2>Notas generales</h2></div>
        <textarea data-action="workout-notes" placeholder="Cómo te has sentido, molestias, cambios realizados…">${esc(workout.notes || '')}</textarea>
      </section>

      <section class="section premium-workout-actions">
        <button class="button button-secondary" type="button" data-action="save-exit-workout">Guardar y salir</button>
        <button class="button button-danger" type="button" data-action="cancel-workout">Cancelar</button>
        <button class="button button-primary finish-command" type="button" data-action="finish-workout" ${doneSets ? '' : 'disabled'}>Finalizar sesión <span>→</span></button>
      </section>
    </section>`;
  updateLiveDuration();
}


function progressionWorkoutCardHtml(recommendation, exerciseIndex) {
  if (!recommendation) return '';
  const canApply = recommendation.suggestedWeight !== null
    || recommendation.suggestedRepMin !== recommendation.repMin
    || recommendation.suggestedRepMax !== recommendation.repMax
    || recommendation.suggestedSets !== recommendation.targetSets;
  const targetWeight = recommendation.suggestedWeight !== null
    ? `${formatWeight(recommendation.suggestedWeight)} kg`
    : recommendation.latest?.topWeight > 0
      ? `${formatWeight(recommendation.latest.topWeight)} kg`
      : 'Carga técnica';
  const targetRange = recommendation.unit === 'sec'
    ? `${recommendation.suggestedRepMin}–${recommendation.suggestedRepMax} s`
    : `${recommendation.suggestedRepMin}–${recommendation.suggestedRepMax} reps`;

  return `<section class="progression-target-card progression-${recommendation.tone}">
    <div class="progression-target-heading">
      <div class="progression-target-status"><span>${recommendation.icon}</span><div><small>OBJETIVO DE HOY · ${recommendation.confidence}% confianza</small><strong>${esc(recommendation.title)}</strong></div></div>
      <button class="progression-detail-button" type="button" data-action="progression-details" data-exercise="${exerciseIndex}">Tendencia →</button>
    </div>
    <div class="progression-target-metrics">
      <span><small>Carga</small><strong>${esc(targetWeight)}</strong></span>
      <span><small>Objetivo</small><strong>${esc(targetRange)}</strong></span>
      <span><small>Series</small><strong>${recommendation.suggestedSets}</strong></span>
    </div>
    <p>${esc(recommendation.text)}</p>
    <div class="progression-target-footer">
      <span><small>Última sesión</small><strong>${esc(recommendation.latestSummary)}</strong></span>
      ${canApply ? `<button class="button button-secondary button-small" type="button" data-action="apply-progression-target" data-exercise="${exerciseIndex}">Aplicar objetivo</button>` : ''}
    </div>
  </section>`;
}

function progressionChartSvg(historyData) {
  const points = historyData.points || [];
  if (points.length < 2) {
    return `<div class="progression-chart-empty"><span>◎</span><p>Completa al menos dos sesiones para mostrar una curva.</p></div>`;
  }
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return `<svg class="progression-chart" viewBox="0 0 100 100" role="img" aria-label="Evolución del ejercicio">
    <line x1="7" y1="86" x2="93" y2="86"></line>
    <line x1="7" y1="18" x2="7" y2="86"></line>
    <path d="${path}"></path>
    ${points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.6"></circle>`).join('')}
  </svg>`;
}

function exerciseProgressionHistoryHtml(id, target) {
  const progression = buildExerciseProgression(state.history, target, state.customExercises);
  const historyData = buildExerciseProgressionHistory(state.history, id, state.customExercises);
  const performances = historyData.performances;

  return `<section class="exercise-progression-panel">
    <div class="exercise-progression-heading">
      <div><p class="eyebrow">PROGRESIÓN INTELIGENTE</p><h3>${esc(progression.title)}</h3><p>${esc(progression.nextGoal)}</p></div>
      <span class="progression-trend-badge trend-${historyData.tone}">${esc(historyData.trend)}</span>
    </div>
    <div class="exercise-progression-metrics">
      <span><small>Mejor carga</small><strong>${historyData.bestWeight ? `${formatWeight(historyData.bestWeight)} kg` : '—'}</strong></span>
      <span><small>1RM estimado</small><strong>${historyData.bestE1rm ? `${formatWeight(historyData.bestE1rm)} kg` : '—'}</strong></span>
      <span><small>Mejor volumen</small><strong>${historyData.bestVolume ? `${formatWeight(historyData.bestVolume)} kg` : '—'}</strong></span>
      <span><small>Referencias</small><strong>${performances.length}</strong></span>
    </div>
    <div class="exercise-progression-chart-shell">
      <div><small>${historyData.weighted ? 'Índice de fuerza estimada' : 'Repeticiones totales'}</small>${progressionChartSvg(historyData)}</div>
      <div class="exercise-progression-recommendation progression-${progression.tone}"><span>${progression.icon}</span><div><small>Siguiente objetivo</small><strong>${esc(progression.title)}</strong><p>${esc(progression.text)}</p></div></div>
    </div>
    ${performances.length ? `<div class="exercise-progression-sessions">${performances.slice(0, 5).map((performance) => `<article><span><strong>${formatDate(performance.date)}</strong><small>${performance.completedSets} series</small></span><b>${performance.topWeight ? `${formatWeight(performance.topWeight)} kg` : `${performance.totalReps} ${performance.unit === 'sec' ? 's' : 'reps'}`}</b><em>${performance.volume ? `${formatWeight(performance.volume)} kg vol.` : `${performance.totalReps} total`}</em></article>`).join('')}</div>` : '<p class="muted">Todavía no hay sesiones registradas para este ejercicio.</p>'}
  </section>`;
}

function renderWorkoutExercise(item, index) {
  const exercise = getExercise(item.exerciseId, state.customExercises);
  const recommendation = buildExerciseProgression(
    state.history,
    item,
    state.customExercises,
    { readiness: state.activeWorkout?.readiness || {} }
  );
  const last = lastExercisePerformance(state.history, item.exerciseId);
  const completed = completedSets(item).length;
  const isDone = item.sets.length > 0 && completed === item.sets.length;
  const collapsed = collapsedWorkoutExercises.has(index);

  return `<article class="workout-exercise-card premium-exercise-card ${isDone ? 'exercise-complete' : ''} ${collapsed ? 'is-collapsed' : ''}">
    <div class="premium-exercise-head">
      <button class="exercise-name-button" type="button" data-action="exercise-details" data-id="${esc(item.exerciseId)}">
        <span class="exercise-sequence">${String(index + 1).padStart(2, '0')}</span>
        <span class="exercise-head-copy"><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small><strong>${esc(exercise.name)}</strong><em>${item.targetSets} × ${item.repMin}–${item.repMax} ${item.unit === 'sec' ? 'seg' : 'reps'} · ${item.restSeconds}s</em></span>
      </button>
      <button class="exercise-accordion-toggle" type="button" data-action="toggle-workout-exercise" data-exercise="${index}" aria-expanded="${!collapsed}" aria-label="${collapsed ? 'Desplegar' : 'Recoger'} ${esc(exercise.name)}">
        <span class="exercise-status-stack"><span class="exercise-progress-pill ${isDone ? 'done' : ''}">${completed}/${item.sets.length}</span>${isDone ? '<small>Completado</small>' : '<small>Series</small>'}</span>
        <span class="accordion-chevron" aria-hidden="true">⌄</span>
      </button>
    </div>

    <div class="exercise-accordion-body" ${collapsed ? 'hidden' : ''}>
      ${state.settings.showTips ? `<div class="exercise-coach-line"><span>TIP</span><p>${esc(exercise.summary)}</p></div>` : ''}
      ${last ? `<div class="last-session-premium-box"><div><span>ÚLTIMA VEZ</span>${renderLastSets(last.exercise)}</div></div>` : ''}
      ${progressionWorkoutCardHtml(recommendation, index)}

      <div class="sets-table premium-sets" role="table" aria-label="Series de ${esc(exercise.name)}">
        <div class="set-row set-header" role="row"><span>Serie</span><span>Peso kg</span><span>${item.unit === 'sec' ? 'Seg.' : 'Reps'}</span><span>Reserva</span><span>Hecha</span><span></span></div>
        ${item.sets.map((set, setIndex) => renderSetRow(set, index, setIndex, item)).join('')}
      </div>

      <div class="premium-exercise-actions">
        <div>
          <button class="mini-action" type="button" data-action="add-set" data-exercise="${index}">＋ Serie</button>
          <button class="mini-action" type="button" data-action="manual-rest" data-exercise="${index}">◷ Descanso</button>
          <button class="mini-action" type="button" data-action="exercise-details" data-id="${esc(item.exerciseId)}">Técnica</button>
        </div>
        <div>
          <button class="mini-action" type="button" data-action="picker-workout-replace" data-exercise="${index}">⇄ Cambiar</button>
          <button class="mini-action danger-mini" type="button" data-action="remove-workout-exercise" data-exercise="${index}">Quitar</button>
        </div>
      </div>
      <label class="premium-exercise-note"><span>Nota rápida</span><input data-action="exercise-notes" data-exercise="${index}" value="${esc(item.notes || '')}" placeholder="Ej. asiento al 4, agarre neutro…"></label>
    </div>
  </article>`;
}

function renderLastSets(exercise) {
  const sets = completedSets(exercise).slice(0, 4);
  return `<div class="last-set-chips">${sets.map((set, index) => `<span>${index + 1}: ${set.weight ? `${esc(set.weight)} kg · ` : ''}${esc(set.reps || '—')} ${exercise.unit === 'sec' ? 's' : 'reps'}</span>`).join('')}</div>`;
}

function renderSetRow(set, exerciseIndex, setIndex, item) {
  return `<div class="set-row ${set.completed ? 'set-completed' : ''}" role="row">
    <strong class="set-number" aria-label="Serie ${setIndex + 1}">${setIndex + 1}</strong>
    <label class="set-field"><small>Peso</small><input aria-label="Peso de la serie ${setIndex + 1}" inputmode="decimal" type="number" min="0" step="0.5" value="${esc(set.weight)}" data-action="set-field" data-field="weight" data-exercise="${exerciseIndex}" data-set="${setIndex}" placeholder="0"></label>
    <label class="set-field"><small>${item.unit === 'sec' ? 'Seg.' : 'Reps'}</small><input aria-label="${item.unit === 'sec' ? 'Segundos' : 'Repeticiones'} de la serie ${setIndex + 1}" inputmode="numeric" type="number" min="0" step="1" value="${esc(set.reps)}" data-action="set-field" data-field="reps" data-exercise="${exerciseIndex}" data-set="${setIndex}" placeholder="${item.repMin}"></label>
    <label class="set-field"><small>Reserva</small><select aria-label="Repeticiones en reserva" data-action="set-field" data-field="rir" data-exercise="${exerciseIndex}" data-set="${setIndex}">
      <option value="" ${set.rir === '' ? 'selected' : ''}>—</option>
      <option value="0" ${String(set.rir) === '0' ? 'selected' : ''}>0</option>
      <option value="1" ${String(set.rir) === '1' ? 'selected' : ''}>1</option>
      <option value="2" ${String(set.rir) === '2' ? 'selected' : ''}>2</option>
      <option value="3" ${String(set.rir) === '3' ? 'selected' : ''}>3+</option>
    </select></label>
    <button class="set-check ${set.completed ? 'checked' : ''}" type="button" data-action="toggle-set" data-exercise="${exerciseIndex}" data-set="${setIndex}" aria-label="${set.completed ? 'Desmarcar' : 'Completar'} serie">✓</button>
    <button class="set-delete" type="button" data-action="remove-set" data-exercise="${exerciseIndex}" data-set="${setIndex}" ${item.sets.length <= 1 ? 'disabled' : ''} aria-label="Eliminar serie">×</button>
  </div>`;
}

function renderLibrary() {
  const all = getAllExercises(state.customExercises);
  const quality = libraryQualitySummary(all, state.profile);
  const muscles = ['Todos', ...new Set(Object.values(all).map((exercise) => exercise.muscle).sort((a,b) => a.localeCompare(b,'es')))];
  const equipment = ['Todos', ...new Set(Object.values(all).map((exercise) => exercise.equipment).sort((a,b) => a.localeCompare(b,'es')))];
  const levels = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];
  const movements = ['Todos', ...movementOptions(all)];
  const availability = ['Todos', 'Mi material', 'Peso corporal', 'Con animación'];
  const suggestions = [...new Set([...(state.searchHistory || []).slice(0, 4), ...suggestedSearches(libraryFilters.query)])].slice(0, 6);
  app.innerHTML = `
    <section class="page library-page library-pro-page">
      <div class="section-title-row"><div><p class="eyebrow">BIBLIOTECA PRO · ${quality.total} EJERCICIOS</p><h1>Técnica y sustituciones</h1></div><button class="button button-primary button-small" type="button" data-action="custom-new">＋ Crear</button></div>

      <section class="library-quality-strip">
        <span><strong>${quality.complete}</strong><small>fichas completas</small></span>
        <span><strong>${quality.animated}</strong><small>con animación</small></span>
        <span><strong>${quality.available}</strong><small>con tu material</small></span>
        <span><strong>Smart</strong><small>sustituciones</small></span>
      </section>

      <button class="premium-pilot-banner media-banner library-pro-banner" type="button" data-action="library-mode" data-mode="media">
        <span class="pilot-banner-badge">TÉCNICA VISUAL</span>
        <span><strong>Aprende el movimiento y encuentra sustitutos útiles</strong><small>Fichas unificadas, errores comunes, puntos clave y alternativas clasificadas por patrón.</small></span>
        <b>→</b>
      </button>

      <section class="card library-controls library-controls-pro">
        <div class="search-shell"><span>⌕</span><input class="search-input" id="librarySearch" type="search" placeholder="Ej. tirón vertical con polea, glúteos sin máquina…" value="${esc(libraryFilters.query)}"></div>
        ${suggestions.length ? `<div class="search-suggestions">${suggestions.map((value) => `<button type="button" data-action="library-query" data-query="${esc(value)}">${esc(value)}</button>`).join('')}</div>` : ''}
        <div class="filter-row library-filter-grid">
          <label><span>Músculo</span><select id="libraryMuscle" class="filter-select">${muscles.map((value) => `<option ${value === libraryFilters.muscle ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
          <label><span>Material</span><select id="libraryEquipment" class="filter-select">${equipment.map((value) => `<option ${value === libraryFilters.equipment ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
          <label><span>Nivel</span><select id="libraryLevel" class="filter-select">${levels.map((value) => `<option ${value === libraryFilters.level ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
          <label><span>Patrón</span><select id="libraryMovement" class="filter-select">${movements.map((value) => `<option ${value === libraryFilters.movement ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
          <label><span>Disponibilidad</span><select id="libraryAvailability" class="filter-select">${availability.map((value) => `<option ${value === libraryFilters.availability ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label>
        </div>
        <div class="segmented-control library-mode-control">
          ${[['all','Todos'],['media','Animados'],['favorites','Favoritos'],['recent','Recientes'],['custom','Creados']].map(([value,label]) => `<button type="button" data-action="library-mode" data-mode="${value}" class="${libraryFilters.mode === value ? 'active' : ''}">${label}</button>`).join('')}
        </div>
      </section>
      <div id="libraryResults" class="library-results section">${libraryResultsHtml()}</div>
    </section>`;
  hydrateExerciseCardPosters(app);
}

function libraryResultsHtml() {
  const all = getAllExercises(state.customExercises);
  const query = libraryFilters.query.trim();
  const recent = new Set(recentExerciseIds(state));
  let entries = Object.entries(all).filter(([id, exercise]) => {
    if (libraryFilters.muscle !== 'Todos' && exercise.muscle !== libraryFilters.muscle) return false;
    if (libraryFilters.equipment !== 'Todos' && exercise.equipment !== libraryFilters.equipment) return false;
    if (libraryFilters.level !== 'Todos' && exercise.level !== libraryFilters.level) return false;
    if (libraryFilters.movement !== 'Todos' && movementCategory(exercise) !== libraryFilters.movement) return false;
    if (libraryFilters.availability === 'Mi material' && !equipmentAvailable(exercise, state.profile)) return false;
    if (libraryFilters.availability === 'Peso corporal' && exercise.equipment !== 'Peso corporal') return false;
    if (libraryFilters.availability === 'Con animación' && !exercise.media?.video) return false;
    if (libraryFilters.mode === 'media' && !exercise.media?.video) return false;
    if (libraryFilters.mode === 'favorites' && !state.favorites.includes(id)) return false;
    if (libraryFilters.mode === 'recent' && !recent.has(id)) return false;
    if (libraryFilters.mode === 'custom' && !exercise.custom) return false;
    return true;
  });
  entries = deduplicateExerciseEntries(entries);
  entries = query
    ? searchExerciseEntries(entries, query, searchableExerciseText)
    : entries.sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'));
  if (!entries.length) return emptyState('No hay coincidencias', 'Prueba otro músculo, material o patrón de movimiento.', '<button class="button button-primary" type="button" data-action="custom-new">Crear ejercicio</button>');

  const visible = entries.slice(0, libraryPageSize);
  return `<div class="results-header"><p class="results-count"><strong>${entries.length}</strong> resultados${entries.length > visible.length ? ` · mostrando ${visible.length}` : ''}</p>${query ? `<button class="button button-ghost button-small" type="button" data-action="remember-search" data-query="${esc(query)}">Guardar búsqueda</button>` : ''}</div><div class="exercise-grid exercise-grid-pro">${visible.map(([id, exercise]) => {
    const favorite = state.favorites.includes(id);
    const available = equipmentAvailable(exercise, state.profile);
    const quality = exerciseQuality(exercise);
    return `<article class="card library-card library-card-pro">
      <button class="library-card-visual-button" type="button" data-action="exercise-details" data-id="${esc(id)}" aria-label="Abrir ficha de ${esc(exercise.name)}">
        ${exerciseCardVisual(exercise, id)}
      </button>
      <div class="library-card-body">
        <div class="library-card-heading">
          <button class="library-card-title-button" type="button" data-action="exercise-details" data-id="${esc(id)}">
            <div class="exercise-meta"><span>${esc(exercise.muscle)}</span><span>${esc(exercise.level)}</span></div>
            <h3>${esc(exercise.name)}</h3>
          </button>
          <button class="favorite-button ${favorite ? 'active' : ''}" type="button" data-action="toggle-favorite" data-id="${esc(id)}" aria-label="Favorito">★</button>
        </div>
        <p class="muted small clamp-2 library-card-summary">${esc(exercise.summary)}</p>
        <div class="library-professional-tags">
          <span>${esc(movementCategory(exercise))}</span>
          <span class="quality-${quality.tone}">${esc(quality.label)}</span>
          <span class="${available ? 'available' : 'unavailable'}">${available ? 'Material disponible' : 'Material no marcado'}</span>
        </div>
        <div class="library-card-actions">
          <button class="button button-secondary button-small" type="button" data-action="exercise-details" data-id="${esc(id)}">Ver ficha</button>
          <button class="button button-primary button-small" type="button" data-action="library-add-workout" data-id="${esc(id)}" ${state.activeWorkout ? '' : 'disabled'}>＋ Entreno</button>
          <button class="button button-secondary button-small" type="button" data-action="library-add-plan" data-id="${esc(id)}" ${state.plan?.days?.length ? '' : 'disabled'}>＋ Plan</button>
          ${exercise.custom ? `<button class="button button-ghost button-small library-card-edit" type="button" data-action="custom-edit" data-id="${esc(id)}">Editar</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('')}</div>${entries.length > visible.length ? `<button class="button button-secondary button-block library-load-more" type="button" data-action="library-more">Mostrar 36 más</button>` : ''}`;
}

function renderProfile() {
  if (!state.profile) return renderLocked('Aún no tienes perfil.', 'Crea un plan para guardar tus medidas, ajustes y progreso.');
  const bmi = calculateBMI();
  const bmiData = bmi ? bmiInfo(bmi) : null;
  const summary = weightSummary(state.weightHistory);
  const records = personalRecords(state.history, state.customExercises);
  const calendar = buildCalendar(state.history);
  const completedExercises = state.history.reduce((sum, session) => sum + session.exercises.length, 0);

  app.innerHTML = `
    <section class="page">
      <div class="profile-hero card card-accent">
        <div class="profile-avatar">${initials(state.profile.name || 'MF')}</div>
        <div><p class="eyebrow">Mi perfil</p><h1>${esc(state.profile.name || 'Deportista')}</h1><p class="muted">${esc(objectiveLabel(state.profile.objective))} · ${state.profile.days} días/semana</p></div>
      </div>

      <section class="section grid grid-4">
        <article class="card metric-card"><div class="metric">${state.history.length}</div><div class="metric-label">Sesiones</div></article>
        <article class="card metric-card"><div class="metric">${completedExercises}</div><div class="metric-label">Ejercicios</div></article>
        <article class="card metric-card"><div class="metric">${records.length}</div><div class="metric-label">Récords</div></article>
        <article class="card metric-card"><div class="metric">${calculateStreak(state.history)}</div><div class="metric-label">Racha</div></article>
      </section>

      <section class="section profile-tabs segmented-control profile-sections">
        <button type="button" class="active" data-profile-tab="progress">Progreso</button>
        <button type="button" data-profile-tab="body">Cuerpo</button>
        <button type="button" data-profile-tab="history">Historial</button>
        <button type="button" data-profile-tab="data">Datos</button>
        <button type="button" data-profile-tab="settings">Ajustes</button>
      </section>

      <div id="profileTabContent">${profileProgressHtml(summary, bmi, bmiData, records, calendar)}</div>
    </section>`;
}

function profileProgressHtml(summary, bmi, bmiData, records, calendar) {
  const monthSessions = sessionsThisMonth(state.history);
  const mostUsed = mostFrequentExercise();
  const totalVolume = state.history.reduce((sum, session) => sum + numberValue(session.volume || sessionVolume(session)), 0);
  return `<section class="profile-tab-panel">
    <section class="grid grid-4">
      <article class="card metric-card"><div class="metric">${monthSessions.length}</div><div class="metric-label">Sesiones este mes</div></article>
      <article class="card metric-card"><div class="metric">${formatDuration(averageDuration())}</div><div class="metric-label">Duración media</div></article>
      <article class="card metric-card"><div class="metric">${formatWeight(totalVolume)}</div><div class="metric-label">Volumen total kg</div></article>
      <article class="card metric-card"><div class="metric metric-name">${mostUsed ? esc(mostUsed.name) : '—'}</div><div class="metric-label">Más realizado</div></article>
    </section>
    <div class="grid grid-2">
      <article class="card">
        <div class="section-title-row"><div><p class="eyebrow">Peso corporal</p><h2>${summary ? `${formatWeight(summary.latest.weight)} kg` : 'Sin registros'}</h2></div><button class="button button-primary button-small" type="button" data-action="quick-weight">＋ Registrar</button></div>
        ${summary ? `<p class="muted small">Cambio total: ${signedNumber(summary.changeTotal)} kg · Últimos 30 días: ${signedNumber(summary.change30)} kg</p>${weightChartHtml(state.weightHistory)}` : '<p class="muted">Añade tu primera medición para ver la evolución.</p>'}
      </article>
      <article class="card">
        <p class="eyebrow">IMC orientativo</p><h2>${bmi ? bmi.toFixed(1) : 'Sin calcular'}</h2>
        ${bmiData ? `<span class="pill pill-${bmiData.tone}">${esc(bmiData.label)}</span><p class="muted small">${esc(bmiData.text)}</p>` : '<p class="muted">Añade peso y estatura en la pestaña Datos.</p>'}
      </article>
    </div>
    <section class="section card"><div class="section-title-row"><div><p class="eyebrow">Récords personales</p><h2>Tus mejores marcas</h2></div><span class="pill">${records.length}</span></div>${records.length ? `<div class="records-list">${records.slice(0, 12).map((record) => `<button type="button" class="record-row" data-action="filter-history-exercise" data-id="${esc(record.exerciseId)}"><span><strong>${esc(record.name)}</strong><small>Mejor volumen: ${formatWeight(record.bestVolume)} kg</small></span><strong>${record.bestWeight ? `${formatWeight(record.bestWeight)} kg` : '—'}</strong></button>`).join('')}</div>` : emptyState('Todavía no hay récords', 'Completa series con peso y repeticiones para crear tus primeras marcas.')}</section>
  </section>`;
}


function profileBodyHtml() {
  if (state.photoPrivacy?.lockEnabled && !photoVaultUnlocked) {
    return `<section class="profile-tab-panel body-progress-panel">
      <article class="body-vault-lock card">
        <div class="vault-lock-icon">⌾</div>
        <p class="eyebrow">Álbum privado</p>
        <h2>Progreso físico bloqueado</h2>
        <p class="muted">Introduce tu PIN para abrir las fotografías y medidas guardadas en este dispositivo.</p>
        <form id="photoUnlockForm" class="vault-pin-form">
          <input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" autocomplete="off" placeholder="PIN de 4–8 números" required>
          <button class="button button-primary" type="submit">Desbloquear</button>
        </form>
        <p class="privacy-note">Este bloqueo protege la vista dentro de My Fit Plan. No sustituye el código de seguridad del dispositivo.</p>
      </article>
    </section>`;
  }

  const entries = [...(state.bodyProgress || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = entries[0];
  const first = entries[entries.length - 1];
  const measurementLabels = {
    chest: 'Pecho',
    waist: 'Cintura',
    hips: 'Cadera',
    arm: 'Brazo',
    thigh: 'Muslo',
    calf: 'Gemelo'
  };

  return `<section class="profile-tab-panel body-progress-panel">
    <section class="body-progress-hero">
      <div>
        <p class="eyebrow">Progreso físico privado</p>
        <h2>Compara cambios más allá de la báscula</h2>
        <p>Guarda fotografías con una postura similar, registra medidas y compara dos fechas sin subir las imágenes a un servidor.</p>
      </div>
      <div class="body-progress-actions">
        <button class="button button-primary" type="button" data-action="body-progress-new">＋ Nueva revisión</button>
        <button class="button button-secondary" type="button" data-action="body-progress-compare" ${entries.length >= 2 ? '' : 'disabled'}>Comparar revisiones</button>
        <button class="button button-secondary body-free-compare-button" type="button" data-action="body-progress-free-compare">Comparación libre</button>
      </div>
    </section>

    ${latest ? `<section class="body-latest-grid section">
      ${['front','side','back'].map((view) => bodyPhotoFrame(latest.photos?.[view], view, latest.date, true)).join('')}
    </section>` : `<section class="card body-empty-state">
      <div class="body-empty-figure">◫</div>
      <h3>Aún no tienes revisiones físicas</h3>
      <p>Haz fotografías frontal, lateral y posterior con luz y distancia parecidas. Puedes guardar solo una vista si lo prefieres.</p>
      <button class="button button-primary" type="button" data-action="body-progress-new">Crear primera revisión</button>
    </section>`}

    ${latest ? `<section class="section body-summary-grid">
      <article class="card body-summary-card"><small>Última revisión</small><strong>${formatDate(latest.date)}</strong><span>${latest.weight ? `${formatWeight(latest.weight)} kg` : 'Sin peso'}</span></article>
      <article class="card body-summary-card"><small>Revisiones</small><strong>${entries.length}</strong><span>guardadas localmente</span></article>
      <article class="card body-summary-card"><small>Cambio de peso</small><strong>${first?.weight && latest.weight ? `${signedNumber(numberValue(latest.weight) - numberValue(first.weight))} kg` : '—'}</strong><span>entre primera y última</span></article>
    </section>` : ''}

    ${entries.length ? `<section class="section card body-measurement-card">
      <div class="section-title-row">
        <div><p class="eyebrow">Medidas corporales</p><h2>Evolución</h2></div>
        <select id="bodyMetricSelect" aria-label="Medida a representar">
          ${Object.entries(measurementLabels).map(([key,label]) => `<option value="${key}" ${bodyMetric === key ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div id="bodyMetricChart">${bodyMeasurementChartHtml(entries, bodyMetric, measurementLabels[bodyMetric])}</div>
    </section>` : ''}

    ${entries.length ? `<section class="section">
      <div class="section-title-row"><div><p class="eyebrow">Historial visual</p><h2>Tus revisiones</h2></div><span class="pill">${entries.length}</span></div>
      <div class="body-entry-list">
        ${entries.map((entry) => `<button class="body-entry-card" type="button" data-action="body-progress-open" data-id="${esc(entry.id)}">
          ${bodyPhotoFrame(entry.photos?.front || entry.photos?.side || entry.photos?.back, entry.photos?.front ? 'front' : entry.photos?.side ? 'side' : 'back', entry.date, false)}
          <span class="body-entry-copy"><strong>${formatDate(entry.date)}</strong><small>${entry.weight ? `${formatWeight(entry.weight)} kg` : 'Sin peso'} · ${bodyMeasurementCount(entry)} medidas</small></span>
          <b>›</b>
        </button>`).join('')}
      </div>
    </section>` : ''}

    <section class="section card body-privacy-card">
      <div><p class="eyebrow">Privacidad</p><h2>${state.photoPrivacy?.lockEnabled ? 'Bloqueo activado' : 'Sin bloqueo adicional'}</h2><p class="muted small">Las fotografías se guardan en el almacenamiento privado del navegador de este dispositivo. No se incluyen automáticamente en la copia JSON.</p></div>
      <div class="body-privacy-actions">
        <button class="button button-secondary" type="button" data-action="body-progress-lock">${state.photoPrivacy?.lockEnabled ? 'Cambiar o quitar PIN' : 'Crear PIN'}</button>
        ${state.photoPrivacy?.lockEnabled ? '<button class="button button-ghost" type="button" data-action="body-progress-lock-now">Bloquear ahora</button>' : ''}
      </div>
    </section>
  </section>`;
}

function bodyPhotoFrame(photoId, view, date, large = false) {
  const labels = { front: 'Frontal', side: 'Lateral', back: 'Posterior' };
  return `<figure class="body-photo-frame ${large ? 'body-photo-large' : 'body-photo-thumb'}" data-photo-frame>
    ${photoId ? `<img data-photo-id="${esc(photoId)}" alt="Fotografía ${labels[view].toLowerCase()} del ${esc(formatDate(date))}">` : ''}
    <span class="body-photo-placeholder">${photoId ? 'Cargando…' : 'Sin foto'}</span>
    <figcaption>${labels[view]}</figcaption>
  </figure>`;
}

function bodyMeasurementCount(entry) {
  return Object.values(entry.measurements || {}).filter((value) => numberValue(value) > 0).length;
}

function bodyMeasurementChartHtml(entries, key, label) {
  const values = [...entries]
    .filter((entry) => numberValue(entry.measurements?.[key]) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (values.length < 2) return `<div class="body-chart-empty"><p>Registra ${esc(label.toLowerCase())} en al menos dos fechas para ver la evolución.</p></div>`;
  const numbers = values.map((entry) => numberValue(entry.measurements[key]));
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = Math.max(1, max - min);
  const points = values.map((entry, index) => {
    const x = 18 + (index / (values.length - 1)) * 364;
    const y = 120 - ((numberValue(entry.measurements[key]) - min) / range) * 86;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const latest = numbers[numbers.length - 1];
  const first = numbers[0];
  return `<div class="body-chart-summary"><span><small>${esc(label)} actual</small><strong>${formatWeight(latest)} cm</strong></span><span><small>Cambio</small><strong>${signedNumber(latest - first)} cm</strong></span></div>
    <svg class="body-measurement-chart" viewBox="0 0 400 145" role="img" aria-label="Evolución de ${esc(label.toLowerCase())}">
      <line x1="18" y1="120" x2="382" y2="120"></line>
      <polyline points="${points}"></polyline>
      ${points.split(' ').map((point) => { const [x,y] = point.split(','); return `<circle cx="${x}" cy="${y}" r="4"></circle>`; }).join('')}
    </svg>
    <div class="body-chart-dates"><span>${formatDate(values[0].date)}</span><span>${formatDate(values[values.length - 1].date)}</span></div>`;
}

async function refreshBodyProgressImages(rootNode = document.querySelector('#profileTabContent')) {
  if (!rootNode) return;
  try {
    await hydrateProgressImages(rootNode);
  } catch (error) {
    rootNode.querySelectorAll('[data-photo-frame]').forEach((frame) => frame.classList.add('missing-photo'));
    reportRuntimeIssue(error, 'Lectura de fotografías privadas');
  }
}

function openBodyProgressForm() {
  const today = isoDay();
  const wrapper = openModal(`<div class="modal-header">
      <div><p class="eyebrow">Nueva revisión corporal</p><h2>Fotografías y medidas</h2></div>
      <button class="modal-close" type="button" data-close-modal>×</button>
    </div>
    <form id="bodyProgressForm" class="body-progress-form">
      <div class="body-form-guidance"><strong>Para comparar mejor:</strong><span>misma luz, distancia, postura y hora aproximada. No es necesario subir las tres vistas.</span></div>
      <div class="body-photo-input-grid">
        ${bodyPhotoInput('front','Frontal')}
        ${bodyPhotoInput('side','Lateral')}
        ${bodyPhotoInput('back','Posterior')}
      </div>
      <div class="form-fields">
        <label class="field"><span>Fecha</span><input name="date" type="date" max="${today}" value="${today}" required></label>
        <label class="field"><span>Peso (kg)</span><input name="weight" type="number" inputmode="decimal" min="30" max="350" step="0.1" value="${esc(state.profile?.weight || '')}"></label>
      </div>
      <fieldset class="fieldset"><legend>Medidas opcionales (cm)</legend>
        <div class="body-measure-grid">
          ${[['chest','Pecho'],['waist','Cintura'],['hips','Cadera'],['arm','Brazo'],['thigh','Muslo'],['calf','Gemelo']].map(([name,label]) => `<label class="field"><span>${label}</span><input name="${name}" type="number" inputmode="decimal" min="10" max="250" step="0.1"></label>`).join('')}
        </div>
      </fieldset>
      <label class="field"><span>Notas</span><textarea name="notes" maxlength="500" placeholder="Sensaciones, fase del plan, condiciones de las fotografías…"></textarea></label>
      <p class="privacy-note">Las imágenes se comprimen y se guardan únicamente en este navegador. Si borras los datos de Safari o cambias de dispositivo sin exportarlas, podrías perderlas.</p>
      <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Guardar revisión</button></div>
    </form>`, { wide: true });

  const form = wrapper.querySelector('#bodyProgressForm');
  const previewUrls = [];
  wrapper.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const preview = wrapper.querySelector(`[data-photo-preview="${input.dataset.view}"]`);
      if (!file || !preview) return;
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      preview.src = url;
      preview.hidden = false;
      preview.closest('.body-photo-upload')?.classList.add('has-preview');
    });
  });

  wrapper.addEventListener('modal-close-internal', () => previewUrls.forEach((url) => URL.revokeObjectURL(url)));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Guardando…';
    const savedPhotoIds = [];
    try {
      const data = new FormData(form);
      const photoIds = { front: '', side: '', back: '' };
      for (const view of ['front','side','back']) {
        const file = form.querySelector(`input[data-view="${view}"]`)?.files?.[0];
        if (!file) continue;
        const compressed = await compressProgressImage(file);
        const photoId = uid(`body-${view}`);
        await saveProgressPhoto(photoId, compressed);
        savedPhotoIds.push(photoId);
        photoIds[view] = photoId;
      }
      if (!Object.values(photoIds).some(Boolean) && !['chest','waist','hips','arm','thigh','calf'].some((key) => numberValue(data.get(key)) > 0)) {
        throw new Error('Añade al menos una fotografía o una medida.');
      }
      const entry = {
        id: uid('body'),
        date: String(data.get('date') || isoDay()),
        weight: numberValue(data.get('weight')) || '',
        measurements: Object.fromEntries(['chest','waist','hips','arm','thigh','calf'].map((key) => [key, numberValue(data.get(key)) || ''])),
        photos: photoIds,
        notes: String(data.get('notes') || '').trim(),
        createdAt: new Date().toISOString()
      };
      state.bodyProgress = [entry, ...(state.bodyProgress || [])].sort((a,b) => String(b.date).localeCompare(String(a.date)));
      if (entry.weight) {
        const existing = state.weightHistory.find((item) => item.date === entry.date);
        if (existing) existing.weight = entry.weight;
        else state.weightHistory.push({ id: uid('weight'), date: entry.date, weight: entry.weight });
        state.weightHistory.sort((a,b) => String(a.date).localeCompare(String(b.date)));
        if (entry.date === isoDay()) state.profile.weight = entry.weight;
      }
      save();
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      wrapper._closeModal();
      renderProfile();
      showProfileTab('body');
      showToast('Revisión corporal guardada.', 'success');
    } catch (error) {
      if (savedPhotoIds.length) {
        try { await deleteProgressPhotos(savedPhotoIds); }
        catch (cleanupError) { reportRuntimeIssue(cleanupError, 'Limpieza de fotografías incompletas'); }
      }
      const storageBlocked = /indexed database|idbfactory|denied|quota|almacenamiento/i.test(String(error?.message || ''));
      if (storageBlocked) reportRuntimeIssue(error, 'Almacenamiento privado de fotografías');
      showToast(storageBlocked
        ? 'El navegador no permite guardar fotografías ahora. Sal del modo privado o quita la foto para guardar solo las medidas.'
        : (error.message || 'No se pudo guardar la revisión.'), 'danger');
      submit.disabled = false;
      submit.textContent = 'Guardar revisión';
    }
  });
}

function bodyPhotoInput(view, label) {
  return `<label class="body-photo-upload">
    <input type="file" accept="image/*" data-view="${view}">
    <img data-photo-preview="${view}" alt="Previsualización ${label.toLowerCase()}" hidden>
    <span class="body-upload-icon">＋</span>
    <strong>${label}</strong>
    <small>Elegir o hacer foto</small>
  </label>`;
}

async function openBodyProgressEntry(id) {
  const entry = state.bodyProgress?.find((item) => item.id === id);
  if (!entry) return;
  const views = [['front','Frontal'],['side','Lateral'],['back','Posterior']];
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">${formatDate(entry.date)}</p><h2>Revisión corporal</h2><p class="muted small">${entry.weight ? `${formatWeight(entry.weight)} kg · ` : ''}${bodyMeasurementCount(entry)} medidas registradas</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <div class="body-detail-photos">${views.map(([view,label]) => bodyPhotoFrame(entry.photos?.[view], view, entry.date, true)).join('')}</div>
    ${bodyMeasurementsTable(entry)}
    ${entry.notes ? `<section class="notice"><strong>Notas</strong><p>${esc(entry.notes)}</p></section>` : ''}
    <div class="modal-actions body-detail-actions">
      <button class="button button-secondary" type="button" id="exportBodyEntry">Exportar fotos</button>
      <button class="button button-danger" type="button" id="deleteBodyEntry">Eliminar revisión</button>
    </div>`, { wide: true });
  try { await hydrateProgressImages(wrapper); }
  catch (error) {
    wrapper.querySelectorAll('[data-photo-frame]').forEach((frame) => frame.classList.add('missing-photo'));
    reportRuntimeIssue(error, 'Lectura de revisión corporal');
  }
  wrapper.querySelector('#exportBodyEntry').addEventListener('click', async () => {
    const labels = { front: 'frontal', side: 'lateral', back: 'posterior' };
    let exported = 0;
    let failed = 0;
    for (const [view, photoId] of Object.entries(entry.photos || {})) {
      if (!photoId) continue;
      try {
        await downloadProgressPhoto(photoId, `my-fit-plan-${entry.date}-${labels[view]}.jpg`);
        exported += 1;
      } catch (error) {
        failed += 1;
        reportRuntimeIssue(error, 'Exportación de fotografía');
      }
    }
    if (failed) showToast(`${exported} exportadas · ${failed} no disponibles.`, failed && !exported ? 'danger' : 'success');
    else showToast(exported ? `${exported} fotografía${exported === 1 ? '' : 's'} preparada${exported === 1 ? '' : 's'}.` : 'Esta revisión no contiene fotografías.');
  });
  wrapper.querySelector('#deleteBodyEntry').addEventListener('click', () => {
    wrapper._closeModal();
    confirmAction({
      title: 'Eliminar revisión corporal',
      message: 'Se eliminarán definitivamente sus fotografías y medidas de este dispositivo.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        try { await deleteProgressPhotos(Object.values(entry.photos || {})); }
        catch (error) { reportRuntimeIssue(error, 'Borrado de fotografías de revisión'); }
        state.bodyProgress = state.bodyProgress.filter((item) => item.id !== entry.id);
        save();
        renderProfile();
        showProfileTab('body');
        showToast('Revisión eliminada.');
      }
    });
  });
}

function bodyMeasurementsTable(entry) {
  const labels = { chest:'Pecho', waist:'Cintura', hips:'Cadera', arm:'Brazo', thigh:'Muslo', calf:'Gemelo' };
  const values = Object.entries(entry.measurements || {}).filter(([,value]) => numberValue(value) > 0);
  if (!values.length) return '<p class="muted body-no-measures">No se registraron medidas en esta revisión.</p>';
  return `<div class="body-measure-table">${values.map(([key,value]) => `<span><small>${labels[key]}</small><strong>${formatWeight(value)} cm</strong></span>`).join('')}</div>`;
}


function openFreePhotoCompare() {
  let photoAUrl = '';
  let photoBUrl = '';
  let fitMode = 'contain';

  const wrapper = openModal(`<div class="modal-header">
      <div>
        <p class="eyebrow">Comparación libre</p>
        <h2>Compara dos fotografías cualesquiera</h2>
        <p class="muted small">No tienen que pertenecer a una revisión ni estar clasificadas como frontal, lateral o posterior.</p>
      </div>
      <button class="modal-close" type="button" data-close-modal>×</button>
    </div>

    <section class="free-compare-upload-grid">
      ${freeCompareUpload('A', 'Primera fotografía')}
      ${freeCompareUpload('B', 'Segunda fotografía')}
    </section>

    <section class="free-compare-toolbar">
      <label>
        <span>Ajuste de imagen</span>
        <select id="freeCompareFit">
          <option value="contain">Ver completa</option>
          <option value="cover">Rellenar y recortar</option>
        </select>
      </label>
      <button class="button button-secondary" type="button" id="swapFreeCompare" disabled>⇄ Intercambiar</button>
    </section>

    <div id="freeCompareCanvas">
      <div class="free-compare-empty">
        <div>◫</div>
        <h3>Selecciona dos fotografías</h3>
        <p>Pueden ser imágenes nuevas, antiguas, de otra postura o de cualquier ángulo.</p>
      </div>
    </div>

    <p class="privacy-note free-compare-note">Las fotografías se usan solamente durante esta comparación. No se guardan en My Fit Plan ni se suben a ningún servidor.</p>`,
    {
      wide: true,
      onClose: () => {
        if (photoAUrl) URL.revokeObjectURL(photoAUrl);
        if (photoBUrl) URL.revokeObjectURL(photoBUrl);
      }
    }
  );

  const canvas = wrapper.querySelector('#freeCompareCanvas');
  const swapButton = wrapper.querySelector('#swapFreeCompare');
  const fitSelect = wrapper.querySelector('#freeCompareFit');

  const updateUploadPreview = (slot, url) => {
    const upload = wrapper.querySelector(`[data-free-upload="${slot}"]`);
    const image = upload?.querySelector('img');
    if (!upload || !image) return;
    image.src = url;
    image.hidden = false;
    upload.classList.add('has-preview');
  };

  const render = () => {
    swapButton.disabled = !(photoAUrl && photoBUrl);
    if (!(photoAUrl && photoBUrl)) return;

    canvas.innerHTML = `<section class="free-compare-results">
      <div class="free-compare-side">
        <figure>
          <img src="${photoAUrl}" alt="Primera fotografía" style="object-fit:${fitMode}">
          <figcaption><strong>Foto A</strong><small>Primera imagen</small></figcaption>
        </figure>
        <figure>
          <img src="${photoBUrl}" alt="Segunda fotografía" style="object-fit:${fitMode}">
          <figcaption><strong>Foto B</strong><small>Segunda imagen</small></figcaption>
        </figure>
      </div>

      <div class="free-compare-slider-wrap">
        <div class="free-before-after-slider" data-free-slider>
          <img class="free-after-image" src="${photoBUrl}" alt="Segunda fotografía" style="object-fit:${fitMode}">
          <div class="free-before-layer" style="width:50%">
            <img src="${photoAUrl}" alt="Primera fotografía" style="object-fit:${fitMode}">
          </div>
          <span class="free-slider-line" style="left:50%"><i>↔</i></span>
        </div>
        <label class="body-slider-control">
          <span>Desliza para comparar</span>
          <input type="range" min="0" max="100" value="50" id="freeCompareRange">
        </label>
      </div>
    </section>`;

    const range = canvas.querySelector('#freeCompareRange');
    range.addEventListener('input', () => {
      const value = range.value;
      canvas.querySelector('.free-before-layer').style.width = `${value}%`;
      canvas.querySelector('.free-slider-line').style.left = `${value}%`;
    });
  };

  wrapper.querySelectorAll('input[data-free-photo]').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file || !String(file.type || '').startsWith('image/')) {
        showToast('Selecciona una imagen válida.', 'danger');
        return;
      }

      const slot = input.dataset.freePhoto;
      const nextUrl = URL.createObjectURL(file);

      if (slot === 'A') {
        if (photoAUrl) URL.revokeObjectURL(photoAUrl);
        photoAUrl = nextUrl;
      } else {
        if (photoBUrl) URL.revokeObjectURL(photoBUrl);
        photoBUrl = nextUrl;
      }

      updateUploadPreview(slot, nextUrl);
      render();
    });
  });

  fitSelect.addEventListener('change', () => {
    fitMode = fitSelect.value === 'cover' ? 'cover' : 'contain';
    render();
  });

  swapButton.addEventListener('click', () => {
    [photoAUrl, photoBUrl] = [photoBUrl, photoAUrl];
    updateUploadPreview('A', photoAUrl);
    updateUploadPreview('B', photoBUrl);
    render();
  });
}

function freeCompareUpload(slot, label) {
  return `<label class="free-compare-upload" data-free-upload="${slot}">
    <input type="file" accept="image/*" data-free-photo="${slot}">
    <img alt="Previsualización ${esc(label.toLowerCase())}" hidden>
    <span class="free-compare-upload-icon">＋</span>
    <strong>${esc(label)}</strong>
    <small>Elegir desde el dispositivo</small>
    <b>Foto ${slot}</b>
  </label>`;
}

function openBodyProgressCompare() {
  const entries = [...(state.bodyProgress || [])].sort((a,b) => String(a.date).localeCompare(String(b.date)));
  if (entries.length < 2) {
    showToast('Necesitas al menos dos revisiones para comparar.', 'danger');
    return;
  }
  const before = entries[0];
  const after = entries[entries.length - 1];
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Antes y después</p><h2>Comparar progreso físico</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <div class="body-compare-controls">
      <label><span>Primera fecha</span><select id="compareBefore">${entries.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === before.id ? 'selected' : ''}>${formatDate(entry.date)}</option>`).join('')}</select></label>
      <label><span>Segunda fecha</span><select id="compareAfter">${entries.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === after.id ? 'selected' : ''}>${formatDate(entry.date)}</option>`).join('')}</select></label>
      <label><span>Vista</span><select id="compareView"><option value="front">Frontal</option><option value="side">Lateral</option><option value="back">Posterior</option></select></label>
    </div>
    <div id="bodyCompareCanvas"></div>`, { wide: true });

  const renderCompare = async () => {
    const a = state.bodyProgress.find((entry) => entry.id === wrapper.querySelector('#compareBefore').value);
    const b = state.bodyProgress.find((entry) => entry.id === wrapper.querySelector('#compareAfter').value);
    const view = wrapper.querySelector('#compareView').value;
    const canvas = wrapper.querySelector('#bodyCompareCanvas');
    const photoA = a?.photos?.[view];
    const photoB = b?.photos?.[view];
    if (!photoA || !photoB) {
      canvas.innerHTML = `<div class="body-compare-missing"><h3>Falta la vista seleccionada</h3><p>Las dos revisiones necesitan una fotografía ${view === 'front' ? 'frontal' : view === 'side' ? 'lateral' : 'posterior'}.</p></div>`;
      return;
    }
    let urlA = '';
    let urlB = '';
    try {
      [urlA, urlB] = await Promise.all([getProgressPhotoUrl(photoA), getProgressPhotoUrl(photoB)]);
    } catch (error) {
      reportRuntimeIssue(error, 'Comparación de fotografías');
    }
    if (!urlA || !urlB) {
      canvas.innerHTML = '<div class="body-compare-missing"><h3>No se pudieron recuperar las fotografías</h3><p>Comprueba que no se hayan borrado los datos del navegador.</p></div>';
      return;
    }
    canvas.innerHTML = `<div class="body-compare-side">
        <figure><img src="${urlA}" alt="Antes"><figcaption><strong>Antes</strong><small>${formatDate(a.date)}${a.weight ? ` · ${formatWeight(a.weight)} kg` : ''}</small></figcaption></figure>
        <figure><img src="${urlB}" alt="Después"><figcaption><strong>Después</strong><small>${formatDate(b.date)}${b.weight ? ` · ${formatWeight(b.weight)} kg` : ''}</small></figcaption></figure>
      </div>
      <div class="body-compare-slider-wrap">
        <div class="body-before-after-slider">
          <img src="${urlB}" alt="Fotografía posterior">
          <div class="body-before-layer" style="width:50%"><img src="${urlA}" alt="Fotografía anterior"></div>
          <span class="body-slider-line" style="left:50%"><i>↔</i></span>
        </div>
        <label class="body-slider-control"><span>Desliza para comparar</span><input type="range" min="0" max="100" value="50" id="bodyCompareRange"></label>
      </div>
      <div class="body-compare-measures">${bodyComparisonMeasurements(a,b)}</div>`;
    canvas.querySelector('#bodyCompareRange').addEventListener('input', (event) => {
      const value = event.target.value;
      canvas.querySelector('.body-before-layer').style.width = `${value}%`;
      canvas.querySelector('.body-slider-line').style.left = `${value}%`;
    });
  };

  wrapper.querySelectorAll('select').forEach((select) => select.addEventListener('change', renderCompare));
  renderCompare();
}

function bodyComparisonMeasurements(a, b) {
  const labels = { chest:'Pecho', waist:'Cintura', hips:'Cadera', arm:'Brazo', thigh:'Muslo', calf:'Gemelo' };
  const rows = Object.keys(labels).map((key) => {
    const first = numberValue(a.measurements?.[key]);
    const second = numberValue(b.measurements?.[key]);
    if (!first || !second) return '';
    return `<span><small>${labels[key]}</small><strong>${signedNumber(second - first)} cm</strong><em>${formatWeight(first)} → ${formatWeight(second)}</em></span>`;
  }).filter(Boolean);
  return rows.length ? rows.join('') : '<p class="muted">No hay medidas coincidentes entre ambas fechas.</p>';
}

function openPhotoPrivacySettings() {
  const enabled = Boolean(state.photoPrivacy?.lockEnabled);
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Privacidad</p><h2>${enabled ? 'Gestionar PIN' : 'Crear bloqueo'}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <form id="photoPrivacyForm" class="form-grid">
      ${enabled ? '<label class="field"><span>PIN actual</span><input name="currentPin" type="password" inputmode="numeric" minlength="4" maxlength="8" required></label>' : ''}
      <label class="field"><span>${enabled ? 'Nuevo PIN (vacío para quitarlo)' : 'PIN de 4–8 números'}</span><input name="newPin" type="password" inputmode="numeric" minlength="${enabled ? '0' : '4'}" maxlength="8" ${enabled ? '' : 'required'}></label>
      <label class="field"><span>Repetir nuevo PIN</span><input name="confirmPin" type="password" inputmode="numeric" maxlength="8"></label>
      <p class="privacy-note">El PIN se guarda transformado en este dispositivo. No podemos recuperarlo si lo olvidas.</p>
      <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">${enabled ? 'Guardar cambios' : 'Activar bloqueo'}</button></div>
    </form>`);
  wrapper.querySelector('#photoPrivacyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      if (enabled) {
        const currentHash = await hashPrivatePin(data.get('currentPin'));
        if (currentHash !== state.photoPrivacy.pinHash) throw new Error('El PIN actual no es correcto.');
      }
      const newPin = String(data.get('newPin') || '').trim();
      const confirmPin = String(data.get('confirmPin') || '').trim();
      if (!newPin && enabled) {
        state.photoPrivacy = { lockEnabled: false, pinHash: '' };
        photoVaultUnlocked = true;
      } else {
        if (newPin !== confirmPin) throw new Error('Los nuevos PIN no coinciden.');
        state.photoPrivacy = { lockEnabled: true, pinHash: await hashPrivatePin(newPin) };
        photoVaultUnlocked = true;
      }
      save();
      wrapper._closeModal();
      renderProfile();
      showProfileTab('body');
      showToast(state.photoPrivacy.lockEnabled ? 'Bloqueo activado.' : 'Bloqueo eliminado.', 'success');
    } catch (error) {
      showToast(error.message || 'No se pudo cambiar el PIN.', 'danger');
    }
  });
}

async function unlockPhotoVault(form) {
  const pin = new FormData(form).get('pin');
  try {
    const hash = await hashPrivatePin(pin);
    if (hash !== state.photoPrivacy.pinHash) throw new Error('PIN incorrecto.');
    photoVaultUnlocked = true;
    showProfileTab('body');
    showToast('Álbum desbloqueado.', 'success');
  } catch (error) {
    showToast(error.message || 'No se pudo desbloquear.', 'danger');
  }
}

function profileHistoryHtml(filterExerciseId = null) {
  const history = filterExerciseId
    ? state.history.filter((session) => session.exercises.some((exercise) => exercise.exerciseId === filterExerciseId))
    : state.history;
  const exercise = filterExerciseId ? getExercise(filterExerciseId, state.customExercises) : null;
  return `<section class="profile-tab-panel">
    <div class="section-title-row"><div><p class="eyebrow">Historial detallado</p><h2>${exercise ? esc(exercise.name) : 'Todas las sesiones'}</h2></div>${filterExerciseId ? '<button class="button button-secondary button-small" type="button" data-action="clear-history-filter">Ver todas</button>' : ''}</div>
    <div class="history-list">${history.length ? history.map((session) => historyCard(session)).join('') : emptyState('No hay sesiones', 'Finaliza un entrenamiento para verlo aquí.')}</div>
  </section>`;
}

function historyCard(session) {
  return `<button class="card history-card" type="button" data-action="history-detail" data-id="${esc(session.id)}">
    <div><strong>${esc(session.name)}</strong><small>${formatDateTime(session.finishedAt)} · ${formatDuration(session.durationSeconds)}</small></div>
    <div class="history-summary"><span>${session.exercises.length} ejercicios</span><span>${formatWeight(session.volume || sessionVolume(session))} kg</span>${session.prs?.length ? `<span class="pill pill-success">${session.prs.length} récord</span>` : ''}</div>
  </button>`;
}

function profileDataHtml() {
  const selectedEquipment = new Set(state.profile.equipment || []);
  return `<section class="profile-tab-panel">
    <form id="profileForm" class="card form-card form-grid">
      <div class="section-title-row"><div><p class="eyebrow">Datos personales</p><h2>Perfil y medidas</h2></div><button class="button button-primary button-small" type="submit">Guardar</button></div>
      <div class="form-fields">
        <label class="field field-full"><span>Nombre o apodo</span><input name="name" maxlength="30" value="${esc(state.profile.name || '')}"></label>
        <label class="field"><span>Edad</span><input name="age" type="number" min="18" max="100" value="${esc(state.profile.age || '')}"></label>
        <label class="field"><span>Peso actual (kg)</span><input name="weight" type="number" min="30" max="350" step="0.1" value="${esc(state.profile.weight || '')}"></label>
        <label class="field"><span>Estatura (cm)</span><input name="height" type="number" min="120" max="230" value="${esc(state.profile.height || '')}"></label>
      </div>
      <fieldset class="fieldset"><legend>Material disponible</legend><div class="check-grid">${['Máquina','Mancuernas','Polea','Banco','Barra','Peso corporal','Cardio'].map((equipment) => checkboxOption('equipment', equipment, equipment, selectedEquipment.has(equipment))).join('')}</div></fieldset>
      <p class="muted small">Cambiar el material no elimina ejercicios del plan. La biblioteca te avisará cuando un ejercicio use material no marcado.</p>
    </form>
    <section class="section card"><div class="section-title-row"><div><p class="eyebrow">Configuración de entrenamiento</p><h2>${state.profile.days} días · ${state.profile.minutes} min</h2></div><button class="button button-secondary button-small" type="button" data-action="onboarding-start">Rehacer configuración</button></div><p class="muted">${esc(objectiveLabel(state.profile.objective))} · ${esc(experienceLabel(state.profile.experience))} · ${state.profile.trainingPath === 'custom' ? 'Rutinas propias' : state.profile.trainingPath === 'template' ? 'Plantillas' : 'Plan recomendado'}</p></section>
  </section>`;
}

function profileSettingsHtml() {
  const accentHex = currentAccentHex();
  const presets = ['#f97316','#ef4444','#ec4899','#8b5cf6','#3b82f6','#06b6d4','#10b981','#84cc16','#eab308','#f8fafc'];
  const appearance = state.settings.appearance || 'system';
  return `<section class="profile-tab-panel">
    <form id="settingsForm" class="card form-card form-grid">
      <div class="section-title-row"><div><p class="eyebrow">Personalización</p><h2>Tu estilo</h2></div><button class="button button-primary button-small" type="submit">Guardar</button></div>
      <fieldset class="fieldset theme-fieldset"><legend>Color principal</legend>
        <div class="custom-palette-card">
          <label class="native-color-picker" for="accentColorPicker" style="--preview-color:${esc(accentHex)}">
            <span class="palette-preview-ring"><i></i></span>
            <span class="palette-copy"><strong>Elige cualquier color</strong><small>Se aplicará a botones, progreso, menús y detalles.</small></span>
            <input id="accentColorPicker" name="accentHex" type="color" value="${esc(accentHex)}" aria-label="Elegir color principal">
          </label>
          <label class="hex-color-field"><span>Código</span><input id="accentHexText" type="text" inputmode="text" maxlength="7" value="${esc(accentHex)}" aria-label="Código hexadecimal del color"></label>
        </div>
        <div class="palette-presets" aria-label="Colores sugeridos">${presets.map((color) => `<button type="button" class="palette-preset ${color.toLowerCase() === accentHex ? 'active' : ''}" style="--preset:${color}" data-action="accent-preset" data-color="${color}" aria-label="Usar color ${color}"><span></span></button>`).join('')}</div>
      </fieldset>
      <fieldset class="fieldset theme-fieldset"><legend>Apariencia</legend>
        <div class="appearance-options">
          ${appearanceOption('system','Según tu móvil','Cambia automáticamente','◐',appearance)}
          ${appearanceOption('light','Claro','Fondo luminoso','☀',appearance)}
          ${appearanceOption('dark','Oscuro','Dark Energy','☾',appearance)}
        </div>
      </fieldset>
      ${settingSwitch('compact','Vista compacta','Reduce espacios en las listas.',state.settings.compact)}
      ${settingSwitch('showTips','Mostrar explicaciones','Enseña consejos breves durante el entrenamiento.',state.settings.showTips)}
      ${settingSwitch('reduceMotion','Reducir animaciones','Minimiza movimientos y transiciones.',state.settings.reduceMotion)}
      ${settingSwitch('autoStartRest','Iniciar descanso automáticamente','Activa el temporizador al completar cada serie.',state.settings.autoStartRest)}
      ${settingSwitch('restSound','Sonido al terminar','Emite un aviso cuando finaliza el descanso.',state.settings.restSound)}
      ${settingSwitch('restVibrate','Vibración si está disponible','No todos los iPhone o navegadores la permiten.',state.settings.restVibrate)}
    </form>
    <section class="section card"><p class="eyebrow">Copia de seguridad</p><h2>Exportar o importar datos</h2><p class="muted small">Crea un archivo con tu plan, entrenamientos, ejercicios personalizados, ajustes y medidas.</p><div class="grid grid-2"><button class="button button-secondary" type="button" data-action="export-backup">Exportar copia</button><label class="button button-secondary file-button">Importar copia<input id="backupFile" type="file" accept="application/json,.json" hidden></label></div></section>
    <section class="section card danger-zone"><p class="eyebrow">Zona de seguridad</p><h2>Borrar todos los datos</h2><p class="muted small">Esta acción elimina el perfil y el progreso guardado en este dispositivo.</p><button class="button button-danger" type="button" data-action="reset-data">Borrar datos</button></section>
  </section>`;
}

function appearanceOption(value, title, subtitle, icon, selected) {
  return `<label class="appearance-option"><input type="radio" name="appearance" value="${value}" ${selected === value ? 'checked' : ''}><span><b>${icon}</b><strong>${title}</strong><small>${subtitle}</small></span></label>`;
}

function settingSwitch(name, title, subtitle, checked) {
  return `<label class="setting-switch"><span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span><input type="checkbox" name="${esc(name)}" ${checked ? 'checked' : ''}><i></i></label>`;
}

function weightChartHtml(history) {
  const values = [...history].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-20);
  if (values.length < 2) return '<p class="muted small">Añade otra medición para dibujar la evolución.</p>';
  const weights = values.map((item) => numberValue(item.weight));
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(1, max - min);
  const points = values.map((item, index) => {
    const x = 8 + (index / (values.length - 1)) * 284;
    const y = 92 - ((item.weight - min) / range) * 72;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="weight-chart" viewBox="0 0 300 105" role="img" aria-label="Evolución del peso"><line x1="8" y1="92" x2="292" y2="92"></line><polyline points="${points}"></polyline>${points.split(' ').map((point) => { const [x,y]=point.split(','); return `<circle cx="${x}" cy="${y}" r="3"></circle>`; }).join('')}</svg>`;
}

function calendarHtml(calendar) {
  return `<div class="calendar"><div class="calendar-weekdays">${['L','M','X','J','V','S','D'].map((day) => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${calendar.cells.map((cell) => cell ? `<span class="${cell.trained ? 'trained' : ''} ${cell.today ? 'today' : ''}">${cell.day}${cell.trained ? '<i>✓</i>' : ''}</span>` : '<span></span>').join('')}</div></div>`;
}

function signedNumber(value) {
  const formatted = formatWeight(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return '0';
}

function mostFrequentExercise() {
  const counts = new Map();
  for (const session of state.history) {
    for (const exercise of session.exercises || []) {
      counts.set(exercise.exerciseId, (counts.get(exercise.exerciseId) || 0) + 1);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;
  return { id: best[0], count: best[1], name: getExercise(best[0], state.customExercises).name };
}

function renderLocked(title, description) {
  app.innerHTML = `<section class="page"><div class="card locked-card"><h1>${esc(title)}</h1><p class="muted">${esc(description)}</p><button class="button button-primary" type="button" data-action="start-questionnaire">Crear plan</button></div></section>`;
}

async function handleAppClick(event) {
  const globalNav = event.target.closest('[data-nav]');
  if (globalNav) return setView(globalNav.dataset.nav);
  const nav = event.target.closest('[data-nav-local]');
  if (nav) return setView(nav.dataset.navLocal);
  const profileTab = event.target.closest('[data-profile-tab]');
  if (profileTab) return showProfileTab(profileTab.dataset.profileTab);
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
  const action = target.dataset.action;

  const actions = {
    'start-questionnaire': startOnboarding,
    'onboarding-start': startOnboarding,
    'onboarding-keep-current': keepCurrentConfiguration,
    'onboarding-next': () => { captureOnboardingStep(); if (!validateOnboardingStep()) return; onboardingStep = Math.min(6, onboardingStep + 1); renderOnboarding(); },
    'onboarding-back': () => { captureOnboardingStep(); onboardingStep = Math.max(1, onboardingStep - 1); renderOnboarding(); },
    'onboarding-finish': finishOnboarding,
    'demo-plan': createDemoPlan,
    'home-workout': () => setView('workout'),
    'training-routine-direct': startRoutineWorkoutDirect,
    'training-mfp': startMfpWorkoutCheckin,
    'training-refresh-recommended': rotateRecommendedSession,
    'training-custom': startCustomWorkoutBuilder,
    'workout-selector-back': backToWorkoutSelector,
    'custom-session-add': () => openExercisePicker({ mode: 'custom-session-add' }),
    'custom-session-remove': () => removeCustomSessionExercise(Number(target.dataset.index)),
    'custom-session-move': () => moveCustomSessionExercise(Number(target.dataset.index), target.dataset.direction),
    'custom-session-cancel': cancelCustomSessionBuilder,
    'coach-details': openCoachDetails,
    'planner-settings': openPlannerSettings,
    'planner-prev-week': () => { plannerWeekOffset -= 1; renderCalendarPlanner(); },
    'planner-next-week': () => { plannerWeekOffset += 1; renderCalendarPlanner(); },
    'planner-today': () => { plannerWeekOffset = 0; renderCalendarPlanner(); },
    'planner-start': () => startPlannerOccurrence(target),
    'planner-move': () => openPlannerMove(target),
    'planner-skip': () => skipPlannerTarget(target),
    'planner-smart-replan': replanMissedSessions,
    'workout-adaptation-details': openWorkoutAdaptationDetails,
    'restore-full-workout': restoreFullWorkout,
    'quick-weight': openWeightModal,
    'body-progress-home': () => { setView('profile'); showProfileTab('body'); },
    'body-progress-new': openBodyProgressForm,
    'body-progress-compare': openBodyProgressCompare,
    'body-progress-free-compare': openFreePhotoCompare,
    'body-progress-open': () => openBodyProgressEntry(target.dataset.id),
    'body-progress-lock': openPhotoPrivacySettings,
    'body-progress-lock-now': () => { photoVaultUnlocked = false; showProfileTab('body'); },
    'create-folder': createRoutineFolder,
    'select-folder': () => selectRoutineFolder(target.dataset.id),
    'rename-folder': () => renameRoutineFolder(target.dataset.id),
    'delete-folder': () => deleteRoutineFolder(target.dataset.id),
    'create-routine': () => openCreateRoutineModal(target.dataset.folder),
    'select-routine': () => activateRoutine(target.dataset.id),
    'rename-routine': () => renameRoutine(target.dataset.id),
    'duplicate-routine': () => duplicateRoutine(target.dataset.id),
    'delete-routine': () => deleteRoutine(target.dataset.id),
    'add-day': addPlanDay,
    'toggle-plan-day': () => togglePlanDay(Number(target.dataset.day)),
    'toggle-all-plan-days': toggleAllPlanDays,
    'rename-day': () => renamePlanDay(Number(target.dataset.day)),
    'delete-day': () => deletePlanDay(Number(target.dataset.day)),
    'move-plan-exercise': () => movePlanExercise(Number(target.dataset.day), Number(target.dataset.exercise), target.dataset.direction),
    'remove-plan-exercise': () => removePlanExercise(Number(target.dataset.day), Number(target.dataset.exercise)),
    'picker-plan-add': () => openExercisePicker({ mode: 'plan-add', dayIndex: Number(target.dataset.day) }),
    'picker-plan-replace': () => openExercisePicker({ mode: 'plan-replace', dayIndex: Number(target.dataset.day), exerciseIndex: Number(target.dataset.exercise) }),
    'restore-plan': restoreRecommendedPlan,
    'start-specific-day': () => startSpecificDay(Number(target.dataset.day)),
    'exercise-details': () => openExerciseDetails(target.dataset.id),
    'toggle-workout-exercise': () => toggleWorkoutExercise(Number(target.dataset.exercise)),
    'toggle-all-workout-exercises': toggleAllWorkoutExercises,
    'toggle-set': () => toggleSet(Number(target.dataset.exercise), Number(target.dataset.set)),
    'add-set': () => addSet(Number(target.dataset.exercise)),
    'manual-rest': () => manualRest(Number(target.dataset.exercise)),
    'remove-set': () => removeSet(Number(target.dataset.exercise), Number(target.dataset.set)),
    'apply-progression-target': () => applyProgressionTarget(Number(target.dataset.exercise)),
    'progression-details': () => openWorkoutProgressionDetails(Number(target.dataset.exercise)),
    'progression-dashboard': openProgressionDashboard,
    'apply-deload': applyWorkoutDeload,
    'deload-details': openDeloadDetails,
    'picker-workout-add': () => openExercisePicker({ mode: 'workout-add' }),
    'picker-workout-replace': () => openExercisePicker({ mode: 'workout-replace', exerciseIndex: Number(target.dataset.exercise) }),
    'remove-workout-exercise': () => removeWorkoutExercise(Number(target.dataset.exercise)),
    'save-exit-workout': () => { save(); showToast('Entrenamiento guardado.'); setView('home'); },
    'cancel-workout': cancelWorkout,
    'finish-workout': finishWorkout,
    'library-mode': () => { libraryFilters.mode = target.dataset.mode; libraryPageSize = 36; renderLibrary(); },
    'library-query': () => applyLibraryQuery(target.dataset.query),
    'remember-search': () => rememberSearch(target.dataset.query),
    'library-more': () => { libraryPageSize += 36; refreshLibraryResults(); },
    'calendar-day': () => openCalendarDay(target.dataset.date),
    'go-history': () => { setView('profile'); showProfileTab('history'); },
    'toggle-favorite': () => toggleFavorite(target.dataset.id),
    'library-add-workout': () => addLibraryExerciseToWorkout(target.dataset.id),
    'library-add-plan': () => choosePlanDayForExercise(target.dataset.id),
    'custom-new': () => openCustomExerciseForm(),
    'custom-edit': () => openCustomExerciseForm(target.dataset.id),
    'history-detail': () => openHistoryDetail(target.dataset.id),
    'filter-history-exercise': () => showProfileTab('history', target.dataset.id),
    'clear-history-filter': () => showProfileTab('history'),
    'export-backup': exportBackup,
    'accent-preset': () => applyAccentPreset(target.dataset.color),
    'reset-data': resetAllData,
    'hud-control': openHudControlCenter,
    'hud-run-diagnostics': openHudDiagnostics,
    'hud-export-diagnostics': exportHudDiagnostics,
    'hud-repair-data': repairApplicationState,
    'hud-force-update': forceApplicationUpdate,
    'hud-open-settings': () => { closeModal(); setView('profile'); showProfileTab('settings'); }
  };
  try {
    const result = actions[action]?.();
    if (result && typeof result.catch === 'function') result.catch((error) => reportRuntimeIssue(error, `Acción: ${action}`));
  } catch (error) {
    reportRuntimeIssue(error, `Acción: ${action}`);
    showToast('La acción no pudo completarse. Revisa el centro de control.', 'danger');
  }
}

function handleAppChange(event) {
  const target = event.target;
  if (target.name === 'obPriority' && target.checked) {
    const checked = [...document.querySelectorAll('input[name="obPriority"]:checked')];
    if (checked.length > 3) { target.checked = false; showToast('Puedes priorizar hasta 3 zonas.', 'danger'); return; }
  }
  if (target.matches('[data-action="plan-target"]')) updatePlanTarget(target);
  if (target.matches('[data-action="custom-session-target"]')) updateCustomSessionTarget(target);
  if (target.matches('[data-action="set-field"]')) updateSetField(target);
  if (target.id === 'libraryMuscle') { libraryFilters.muscle = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'libraryEquipment') { libraryFilters.equipment = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'libraryLevel') { libraryFilters.level = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'libraryMovement') { libraryFilters.movement = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'libraryAvailability') { libraryFilters.availability = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'backupFile') importBackup(target.files?.[0]);
  if (target.id === 'bodyMetricSelect') {
    bodyMetric = target.value;
    const chart = document.querySelector('#bodyMetricChart');
    const labels = { chest:'Pecho', waist:'Cintura', hips:'Cadera', arm:'Brazo', thigh:'Muslo', calf:'Gemelo' };
    if (chart) chart.innerHTML = bodyMeasurementChartHtml(state.bodyProgress || [], bodyMetric, labels[bodyMetric]);
  }
  if (target.name === 'appearance') previewThemeFromSettingsForm();
  if (target.matches('[data-profile-tab]')) showProfileTab(target.dataset.profileTab);
}

const delayedSaveField = debounce((target) => {
  if (target.dataset.action === 'set-field') updateSetField(target, false);
  if (target.dataset.action === 'workout-notes' && state.activeWorkout) {
    state.activeWorkout.notes = target.value;
    save();
  }
  if (target.dataset.action === 'exercise-notes') {
    const exercise = state.activeWorkout?.exercises?.[Number(target.dataset.exercise)];
    if (exercise) {
      exercise.notes = target.value;
      save();
    }
  }
}, 220);

function persistPendingInputs() {
  try {
    delayedSaveField.flush?.();
    if (state.activeWorkout) {
      syncActiveRoutineFromPlan();
      state = persistState(state);
    }
  } catch (error) {
    console.warn('No se pudo completar el guardado de cierre:', error);
  }
}

function handleAppInput(event) {
  const target = event.target;
  if (target.id === 'librarySearch') {
    libraryFilters.query = target.value;
    libraryPageSize = 36;
    debounceRefreshLibrary();
  }
  if (target.id === 'customSessionName' && customWorkoutDraft) customWorkoutDraft.name = target.value;
  if (target.id === 'accentColorPicker') syncAccentControls(target.value);
  if (target.id === 'accentHexText') { const normalized = normalizeHexColor(target.value, ''); if (normalized) syncAccentControls(normalized, false); }
  if (['set-field','workout-notes','exercise-notes'].includes(target.dataset.action)) delayedSaveField(target);
}

const debounceRefreshLibrary = debounce(refreshLibraryResults, 160);

function hydrateExerciseCardPosters(rootNode = document) {
  rootNode.querySelectorAll('img[data-exercise-card-poster]').forEach((image) => {
    if (image.dataset.errorBound === 'true') return;
    image.dataset.errorBound = 'true';
    image.addEventListener('error', () => {
      image.closest('.exercise-card-media')?.classList.add('poster-failed');
      image.remove();
    });
  });
}

function refreshLibraryResults() {
  const results = document.querySelector('#libraryResults');
  if (results) {
    results.innerHTML = libraryResultsHtml();
    hydrateExerciseCardPosters(results);
  }
  document.querySelectorAll('[data-action="library-mode"]').forEach((button) => button.classList.toggle('active', button.dataset.mode === libraryFilters.mode));
}

function handleAppSubmit(event) {
  event.preventDefault();
  if (event.target.id === 'planForm') submitPlanForm(event.target);
  if (event.target.id === 'profileForm') submitProfileForm(event.target);
  if (event.target.id === 'settingsForm') submitSettingsForm(event.target);
  if (event.target.id === 'photoUnlockForm') unlockPhotoVault(event.target);
}

function submitPlanForm(form) {
  const data = new FormData(form);
  const age = numberValue(data.get('age'));
  if (!data.get('adultConsent') || (age && age < 18)) {
    showToast('Debes confirmar que eres mayor de 18 años.', 'danger');
    document.querySelector('#adultConsent')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const equipment = data.getAll('equipment');
  const profile = {
    name: String(data.get('name') || '').trim(),
    age: age || '',
    weight: numberValue(data.get('weight')) || '',
    height: numberValue(data.get('height')) || '',
    objective: data.get('objective'),
    days: numberValue(data.get('days'), 3),
    minutes: numberValue(data.get('minutes'), 45),
    equipment: equipment.length ? equipment : ['Peso corporal']
  };
  const replacePlan = () => {
    state.profile = profile;
    state.plan = buildPlan(profile);
    state.nextWorkoutIndex = 0;
    state.activeWorkout = null;
    state.createdAt ||= new Date().toISOString();
    recordProfileWeight(profile.weight);
    save();
    showToast('Plan creado y listo para editar.', 'success');
    setView('plan');
  };
  if (state.plan) {
    confirmAction({ title: 'Regenerar el plan', message: 'Se sustituirá tu rutina actual. El historial se conservará, pero una sesión activa se cancelará.', confirmLabel: 'Regenerar', danger: true, onConfirm: replacePlan });
  } else replacePlan();
}

function findRoutineById(routineId) {
  for (const folder of state.routineFolders || []) {
    const routine = folder.routines?.find((item) => item.id === routineId);
    if (routine) return { folder, routine };
  }
  return null;
}

function selectRoutineFolder(folderId) {
  syncActiveRoutineFromPlan();
  const folder = state.routineFolders?.find((item) => item.id === folderId);
  if (!folder) return;
  state.activeFolderId = folder.id;
  if (folder.routines?.length) {
    const currentInFolder = folder.routines.find((routine) => routine.id === state.activeRoutineId);
    if (!currentInFolder) {
      state.activeRoutineId = folder.routines[0].id;
      state.plan = clone(folder.routines[0]);
      state.nextWorkoutIndex = 0;
    }
  }
  save();
  renderPlan();
}

function activateRoutine(routineId) {
  const match = findRoutineById(routineId);
  if (!match) return;
  const switchNow = () => {
    syncActiveRoutineFromPlan();
    state.activeFolderId = match.folder.id;
    state.activeRoutineId = match.routine.id;
    state.plan = clone(match.routine);
    state.nextWorkoutIndex = 0;
    state.activeWorkout = null;
    save();
    renderPlan();
    showToast(`Rutina activa: ${match.routine.name}`, 'success');
  };
  if (state.activeWorkout) {
    return confirmAction({ title: 'Cambiar de rutina', message: 'Hay una sesión en curso. Al cambiar de rutina se descartará esa sesión.', confirmLabel: 'Cambiar rutina', danger: true, onConfirm: switchNow });
  }
  switchNow();
}

function createRoutineFolder() {
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Organización</p><h2>Nueva carpeta</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><form id="folderForm" class="form-grid"><label class="field"><span>Nombre de la carpeta</span><input name="name" maxlength="35" placeholder="Ej. Brazo, Viajes, Mis planes…" required></label><div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Crear carpeta</button></div></form>`);
  wrapper.querySelector('#folderForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = String(new FormData(event.target).get('name') || '').trim();
    if (!name) return;
    const folder = { id: uid('folder'), name, icon: 'folder', createdAt: new Date().toISOString(), routines: [] };
    state.routineFolders.push(folder);
    state.activeFolderId = folder.id;
    save();
    wrapper._closeModal();
    renderPlan();
    showToast('Carpeta creada.', 'success');
  });
}

function renameRoutineFolder(folderId) {
  const folder = state.routineFolders?.find((item) => item.id === folderId);
  if (!folder) return;
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Carpeta</p><h2>Cambiar nombre</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><form id="renameFolderForm" class="form-grid"><label class="field"><span>Nombre</span><input name="name" maxlength="35" value="${esc(folder.name)}" required></label><div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Guardar</button></div></form>`);
  wrapper.querySelector('#renameFolderForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = String(new FormData(event.target).get('name') || '').trim();
    if (!name) return;
    folder.name = name;
    save();
    wrapper._closeModal();
    renderPlan();
  });
}

function deleteRoutineFolder(folderId) {
  const folder = state.routineFolders?.find((item) => item.id === folderId);
  if (!folder) return;
  if (state.routineFolders.length <= 1) return showToast('Debes conservar al menos una carpeta.', 'danger');
  confirmAction({
    title: `Eliminar ${folder.name}`,
    message: `Se eliminarán ${folder.routines?.length || 0} rutinas de esta carpeta. El historial de entrenamientos se conservará.`,
    confirmLabel: 'Eliminar carpeta',
    danger: true,
    onConfirm: () => {
      state.routineFolders = state.routineFolders.filter((item) => item.id !== folderId);
      const nextFolder = state.routineFolders.find((item) => item.routines?.length) || state.routineFolders[0];
      state.activeFolderId = nextFolder.id;
      if (!findRoutineById(state.activeRoutineId)) {
        const nextRoutine = nextFolder.routines?.[0] || null;
        state.activeRoutineId = nextRoutine?.id || null;
        state.plan = nextRoutine ? clone(nextRoutine) : null;
        state.nextWorkoutIndex = 0;
      }
      save();
      renderPlan();
    }
  });
}

function openCreateRoutineModal(folderId = state.activeFolderId) {
  const folder = state.routineFolders?.find((item) => item.id === folderId) || activeFolder();
  if (!folder) return createRoutineFolder();
  const templates = templatesForProfile(state.profile).slice(0, 6);
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Nueva rutina</p><h2>¿Cómo quieres empezar?</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <div class="create-routine-options">
      <button type="button" class="create-routine-option" data-create-type="blank"><span>✎</span><div><strong>Desde cero</strong><small>Crea una rutina vacía y añade tus propios entrenamientos.</small></div><b>→</b></button>
      <button type="button" class="create-routine-option" data-create-type="recommended"><span>✦</span><div><strong>Recomendación automática</strong><small>Usa tus datos actuales para elegir una estructura equilibrada.</small></div><b>→</b></button>
    </div>
    <p class="eyebrow modal-section-label">O ELIGE UNA PLANTILLA</p>
    <div class="modal-template-grid">${templates.map((template) => `<button type="button" class="modal-template-card" data-create-template="${esc(template.id)}"><span>${template.days} DÍAS</span><strong>${esc(template.name)}</strong><small>${esc(template.subtitle)}</small></button>`).join('')}</div>`, { wide: true });
  wrapper.addEventListener('click', (event) => {
    const typeButton = event.target.closest('[data-create-type]');
    const templateButton = event.target.closest('[data-create-template]');
    if (!typeButton && !templateButton) return;
    let routine;
    if (typeButton?.dataset.createType === 'blank') routine = createBlankPlan(`Rutina ${folder.routines.length + 1}`);
    else if (typeButton?.dataset.createType === 'recommended') routine = buildPlan(state.profile);
    else routine = buildPlanFromTemplate(templateButton.dataset.createTemplate, state.profile);
    folder.routines.push(clone(routine));
    state.activeFolderId = folder.id;
    state.activeRoutineId = routine.id;
    state.plan = routine;
    state.nextWorkoutIndex = 0;
    save();
    wrapper._closeModal();
    renderPlan();
    showToast('Rutina creada.', 'success');
  });
}

function renameRoutine(routineId) {
  const match = findRoutineById(routineId);
  if (!match) return;
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Rutina</p><h2>Nombre y descripción</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><form id="renameRoutineForm" class="form-grid"><label class="field"><span>Nombre</span><input name="name" maxlength="50" value="${esc(match.routine.name || '')}" required></label><label class="field"><span>Descripción</span><textarea name="description" rows="3" maxlength="180">${esc(match.routine.description || '')}</textarea></label><div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Guardar</button></div></form>`);
  wrapper.querySelector('#renameRoutineForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    match.routine.name = String(data.get('name') || '').trim();
    match.routine.description = String(data.get('description') || '').trim();
    match.routine.updatedAt = new Date().toISOString();
    if (state.activeRoutineId === routineId) state.plan = clone(match.routine);
    save();
    wrapper._closeModal();
    renderPlan();
  });
}

function duplicateRoutine(routineId) {
  const match = findRoutineById(routineId);
  if (!match) return;
  syncActiveRoutineFromPlan();
  const duplicate = clone(match.routine);
  duplicate.id = uid('routine');
  duplicate.name = `${match.routine.name} · Copia`;
  duplicate.createdAt = new Date().toISOString();
  duplicate.updatedAt = duplicate.createdAt;
  duplicate.days = (duplicate.days || []).map((day) => ({ ...day, id: uid('day'), exercises: (day.exercises || []).map((item) => ({ ...item, slotId: uid('slot') })) }));
  match.folder.routines.push(duplicate);
  save();
  renderPlan();
  showToast('Rutina duplicada.', 'success');
}

function deleteRoutine(routineId) {
  const match = findRoutineById(routineId);
  if (!match) return;
  const totalRoutines = state.routineFolders.reduce((sum, folder) => sum + (folder.routines?.length || 0), 0);
  if (totalRoutines <= 1) return showToast('Debes conservar al menos una rutina.', 'danger');
  confirmAction({ title: `Eliminar ${match.routine.name}`, message: 'La rutina se eliminará, pero los entrenamientos ya registrados seguirán en tu historial.', confirmLabel: 'Eliminar rutina', danger: true, onConfirm: () => {
    match.folder.routines = match.folder.routines.filter((routine) => routine.id !== routineId);
    if (state.activeRoutineId === routineId) {
      const nextMatch = match.folder.routines[0] ? { folder: match.folder, routine: match.folder.routines[0] } : (() => {
        for (const folder of state.routineFolders) if (folder.routines?.[0]) return { folder, routine: folder.routines[0] };
        return null;
      })();
      state.activeFolderId = nextMatch?.folder.id || state.activeFolderId;
      state.activeRoutineId = nextMatch?.routine.id || null;
      state.plan = nextMatch?.routine ? clone(nextMatch.routine) : null;
      state.nextWorkoutIndex = 0;
    }
    save();
    renderPlan();
  }});
}

function togglePlanDay(dayIndex) {
  if (collapsedPlanDays.has(dayIndex)) collapsedPlanDays.delete(dayIndex);
  else collapsedPlanDays.add(dayIndex);
  renderPlan();
}

function toggleAllPlanDays() {
  const days = state.plan?.days || [];
  if (collapsedPlanDays.size) collapsedPlanDays.clear();
  else collapsedPlanDays = new Set(days.map((_, index) => index));
  renderPlan();
}

function toggleWorkoutExercise(exerciseIndex) {
  if (collapsedWorkoutExercises.has(exerciseIndex)) collapsedWorkoutExercises.delete(exerciseIndex);
  else collapsedWorkoutExercises.add(exerciseIndex);
  renderWorkout();
}

function toggleAllWorkoutExercises() {
  const exercises = state.activeWorkout?.exercises || [];
  if (collapsedWorkoutExercises.size) collapsedWorkoutExercises.clear();
  else collapsedWorkoutExercises = new Set(exercises.map((_, index) => index));
  renderWorkout();
}

function addPlanDay() {
  state.plan.days.push({ id: uid('day'), name: `Nuevo entrenamiento ${state.plan.days.length + 1}`, focus: 'Personalizado', exercises: [] });
  state.profile.days = state.plan.days.length;
  save();
  renderPlan();
  renamePlanDay(state.plan.days.length - 1);
}

function renamePlanDay(dayIndex) {
  const day = state.plan.days[dayIndex];
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Editar día</p><h2>Cambiar nombre</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><form id="renameDayForm" class="form-grid"><label class="field"><span>Nombre</span><input name="name" maxlength="40" value="${esc(day.name)}" required></label><div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Guardar</button></div></form>`);
  wrapper.querySelector('#renameDayForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = new FormData(event.target).get('name').trim();
    if (!name) return;
    day.name = name;
    save();
    wrapper._closeModal();
    renderPlan();
  });
}

function deletePlanDay(dayIndex) {
  if (state.plan.days.length <= 1) return showToast('El plan debe conservar al menos un día.', 'danger');
  const day = state.plan.days[dayIndex];
  confirmAction({ title: `Eliminar ${day.name}`, message: 'Se eliminarán los ejercicios de este día. El historial ya registrado no cambiará.', confirmLabel: 'Eliminar día', danger: true, onConfirm: () => {
    state.plan.days.splice(dayIndex, 1);
    state.profile.days = state.plan.days.length;
    state.nextWorkoutIndex = clamp(state.nextWorkoutIndex, 0, state.plan.days.length - 1);
    planAccordionPlanId = null;
    save(); renderPlan();
  }});
}

function movePlanExercise(dayIndex, exerciseIndex, direction) {
  const list = state.plan.days[dayIndex].exercises;
  const nextIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
  if (!list[nextIndex]) return;
  [list[exerciseIndex], list[nextIndex]] = [list[nextIndex], list[exerciseIndex]];
  save(); renderPlan();
}

function removePlanExercise(dayIndex, exerciseIndex) {
  const item = state.plan.days[dayIndex].exercises[exerciseIndex];
  const name = getExercise(item.exerciseId, state.customExercises).name;
  confirmAction({ title: `Quitar ${name}`, message: 'Solo se eliminará del plan. La biblioteca y el historial se conservarán.', confirmLabel: 'Quitar', danger: true, onConfirm: () => {
    state.plan.days[dayIndex].exercises.splice(exerciseIndex, 1); save(); renderPlan();
  }});
}

function updatePlanTarget(target) {
  const day = state.plan?.days?.[Number(target.dataset.day)];
  const item = day?.exercises?.[Number(target.dataset.exercise)];
  if (!item) return;
  const field = target.dataset.field;
  const fallback = numberValue(item[field], field === 'restSeconds' ? 75 : 1);
  item[field] = targetNumber(target, fallback);
  if (field === 'repMin' && item.repMax < item.repMin) item.repMax = item.repMin;
  if (field === 'repMax' && item.repMin > item.repMax) item.repMin = item.repMax;
  target.value = item[field];
  save();
}

function restoreRecommendedPlan() {
  confirmAction({ title: 'Restaurar plantilla', message: 'Se perderán los cambios hechos en esta rutina. El historial y las demás rutinas se conservarán.', confirmLabel: 'Restaurar', danger: true, onConfirm: () => {
    const currentId = state.activeRoutineId || state.plan?.id;
    const currentName = state.plan?.name;
    const templateId = state.plan?.templateId && state.plan.templateId !== 'legacy' ? state.plan.templateId : null;
    const restored = buildPlan(state.profile, templateId);
    restored.id = currentId || restored.id;
    if (currentName) restored.name = currentName;
    state.plan = restored;
    state.activeRoutineId = restored.id;
    state.nextWorkoutIndex = 0;
    save(); renderPlan(); showToast('Plantilla restaurada.');
  }});
}

function startSpecificDay(dayIndex) {
  const prepare = () => {
    const day = state.plan?.days?.[dayIndex];
    if (!day?.exercises?.length) return showToast('Este día no tiene ejercicios.', 'danger');
    pendingWorkoutSelection = null;
    customWorkoutDraft = null;
    const workout = createActiveWorkout(dayIndex, {
      dayOverride: day,
      sessionSource: 'routine',
      sourceLabel: 'Tu rutina',
      sourceReason: 'Día elegido manualmente desde el plan.',
      sourcePlanDayIndex: dayIndex
    });
    if (!workout) return showToast('No se pudo preparar este entrenamiento.', 'danger');
    save();
    setView('workout');
    showToast('Día de rutina preparado.', 'success');
  };

  if (state.activeWorkout) {
    return confirmAction({
      title: 'Cambiar de entrenamiento',
      message: 'Ya existe una sesión en curso. Al continuar se descartará esa sesión.',
      confirmLabel: 'Preparar nueva',
      danger: true,
      onConfirm: () => {
        clearRestTimer();
        state.activeWorkout = null;
        prepare();
      }
    });
  }
  prepare();
}

function openExercisePicker({ mode, dayIndex = null, exerciseIndex = null }) {
  let query = '';
  let muscle = 'Todos';
  let equipment = 'Todos';
  let movement = 'Todos';
  const all = getAllExercises(state.customExercises);
  const muscles = ['Todos', ...new Set(Object.values(all).map((item) => item.muscle).sort((a,b) => a.localeCompare(b,'es')))];
  const equipments = ['Todos', ...new Set(Object.values(all).map((item) => item.equipment).sort((a,b) => a.localeCompare(b,'es')))];
  const movements = ['Todos', ...movementOptions(all)];
  const sourceId = mode === 'plan-replace'
    ? state.plan?.days?.[dayIndex]?.exercises?.[exerciseIndex]?.exerciseId
    : mode === 'workout-replace'
      ? state.activeWorkout?.exercises?.[exerciseIndex]?.exerciseId
      : null;
  const source = sourceId ? getExercise(sourceId, state.customExercises) : null;
  const recommended = sourceId
    ? rankExerciseSubstitutes(sourceId, state.customExercises, state.profile, { limit: 8 })
    : [];

  const wrapper = openModal(`<div class="modal-header substitution-modal-header"><div><p class="eyebrow">${source ? 'SUSTITUCIÓN INTELIGENTE' : 'SELECCIONAR EJERCICIO'}</p><h2>${source ? `Cambiar ${esc(source.name)}` : pickerTitle(mode)}</h2>${source ? `<p class="muted small">Prioriza el mismo patrón, músculo y material disponible.</p>` : ''}</div><button class="modal-close" type="button" data-close-modal>×</button></div>
    ${recommended.length ? `<section class="smart-substitution-section"><div class="section-title-row"><div><p class="eyebrow">Recomendados</p><h3>Mejores sustitutos</h3></div><span class="pill">${recommended.length} opciones</span></div><div class="smart-substitution-grid">${recommended.map((item, index) => `<button class="smart-substitution-card" type="button" data-picker-id="${esc(item.id)}"><span class="substitution-rank">${String(index + 1).padStart(2,'0')}</span><span><strong>${esc(item.exercise.name)}</strong><small>${esc(item.reason)}</small><em>${esc(item.exercise.muscle)} · ${esc(item.exercise.equipment)}</em></span><b>${item.available ? '✓' : '!'}</b></button>`).join('')}</div></section>` : ''}
    <section class="picker-all-section"><div class="section-title-row"><div><p class="eyebrow">Biblioteca</p><h3>${source ? 'Todas las opciones' : 'Elige un ejercicio'}</h3></div></div><div class="picker-controls"><input id="pickerSearch" class="search-input" type="search" placeholder="Buscar…"><div class="filter-row picker-filter-grid"><select id="pickerMuscle" class="filter-select">${muscles.map((value) => `<option>${esc(value)}</option>`).join('')}</select><select id="pickerEquipment" class="filter-select">${equipments.map((value) => `<option>${esc(value)}</option>`).join('')}</select><select id="pickerMovement" class="filter-select">${movements.map((value) => `<option>${esc(value)}</option>`).join('')}</select></div></div><div id="pickerResults" class="picker-results"></div></section>`, { wide: true });
  const results = wrapper.querySelector('#pickerResults');
  const redraw = () => {
    const normalized = normalizeText(query);
    let entries = Object.entries(all).filter(([id, exercise]) => id !== sourceId && (!normalized || normalizeText(searchableExerciseText(id, exercise)).includes(normalized)) && (muscle === 'Todos' || exercise.muscle === muscle) && (equipment === 'Todos' || exercise.equipment === equipment) && (movement === 'Todos' || movementCategory(exercise) === movement));
    entries = deduplicateExerciseEntries(entries).sort((a,b) => a[1].name.localeCompare(b[1].name,'es'));
    results.innerHTML = entries.length ? entries.map(([id, exercise]) => `<button class="picker-item picker-item-pro" type="button" data-picker-id="${esc(id)}"><span><strong>${esc(exercise.name)}</strong><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)} · ${esc(movementCategory(exercise))}</small></span><span>＋</span></button>`).join('') : emptyState('Sin resultados','Prueba otra búsqueda.');
  };
  redraw();
  wrapper.querySelector('#pickerSearch').addEventListener('input', (event) => { query = event.target.value; redraw(); });
  wrapper.querySelector('#pickerMuscle').addEventListener('change', (event) => { muscle = event.target.value; redraw(); });
  wrapper.querySelector('#pickerEquipment').addEventListener('change', (event) => { equipment = event.target.value; redraw(); });
  wrapper.querySelector('#pickerMovement').addEventListener('change', (event) => { movement = event.target.value; redraw(); });
  wrapper.addEventListener('click', (event) => {
    const button = event.target.closest('[data-picker-id]');
    if (!button) return;
    applyPickedExercise(button.dataset.pickerId, { mode, dayIndex, exerciseIndex });
    wrapper._closeModal();
  });
}

function pickerTitle(mode) {
  return ({ 'plan-add':'Añadir al plan','plan-replace':'Cambiar ejercicio','workout-add':'Añadir a la sesión','workout-replace':'Cambiar ejercicio','custom-session-add':'Añadir al personalizado' })[mode] || 'Elegir ejercicio';
}

function applyPickedExercise(id, context) {
  const rules = trainingRules(state.profile);
  if (context.mode === 'plan-add') {
    state.plan.days[context.dayIndex].exercises.push(createPlanExercise(id, rules));
    save(); renderPlan(); showToast('Ejercicio añadido al plan.', 'success');
  } else if (context.mode === 'plan-replace') {
    const old = state.plan.days[context.dayIndex].exercises[context.exerciseIndex];
    state.plan.days[context.dayIndex].exercises[context.exerciseIndex] = createPlanExercise(id, rules, { targetSets: old.targetSets, restSeconds: old.restSeconds });
    save(); renderPlan(); showToast('Ejercicio cambiado.');
  } else if (context.mode === 'workout-add') {
    state.activeWorkout.exercises.push(workoutExerciseFromPlan(createPlanExercise(id, rules)));
    workoutAccordionSessionId = null;
    save(); renderWorkout(); showToast('Ejercicio añadido a la sesión.', 'success');
  } else if (context.mode === 'workout-replace') {
    const current = state.activeWorkout.exercises[context.exerciseIndex];
    const replacement = workoutExerciseFromPlan(createPlanExercise(id, rules, { targetSets: current.targetSets, restSeconds: current.restSeconds }));
    replacement.instanceId = current.instanceId;
    state.activeWorkout.exercises[context.exerciseIndex] = replacement;
    save(); renderWorkout(); showToast('Ejercicio cambiado.');
  } else if (context.mode === 'custom-session-add') {
    if (!customWorkoutDraft) startCustomWorkoutBuilder();
    customWorkoutDraft.exercises.push(createPlanExercise(id, rules));
    renderCustomWorkoutBuilder();
    showToast('Ejercicio añadido al personalizado.', 'success');
  }
}

function openExerciseDetails(id) {
  const exercise = getExercise(id, state.customExercises);
  const coaching = coachingProfile(exercise);
  const quality = exerciseQuality(exercise);
  const alternatives = rankExerciseSubstitutes(id, state.customExercises, state.profile, { limit: 6 });
  const favorite = state.favorites.includes(id);
  const last = lastExercisePerformance(state.history, id);
  const record = personalRecords(state.history, state.customExercises).find((item) => item.exerciseId === id);
  const primary = (exercise.primaryMuscles || [exercise.muscle]).join(', ');
  const secondary = (exercise.secondaryMuscles || []).join(', ');
  const hasMotion = Boolean(exercise.media?.video);
  const available = equipmentAvailable(exercise, state.profile);

  const wrapper = openModal(`
    <article class="premium-exercise-detail technique-pro-detail">
      <header class="premium-detail-header technique-pro-header">
        <button class="premium-detail-back" type="button" data-close-modal aria-label="Volver">←</button>
        <div class="premium-detail-title">
          <p class="eyebrow">${hasMotion ? 'TÉCNICA VISUAL' : 'GUÍA TÉCNICA'} · ${esc(coaching.category)}</p>
          <h2>${esc(exercise.name)}</h2>
          ${exercise.englishName ? `<p>${esc(exercise.englishName)}</p>` : ''}
        </div>
        <button class="premium-favorite ${favorite ? 'active' : ''}" type="button" data-premium-favorite="${esc(id)}">★</button>
      </header>

      ${premiumExerciseVisual(exercise, id, { reduceMotion: state.settings.reduceMotion })}

      <section class="technique-pro-overview">
        <div class="technique-quality-card quality-${quality.tone}"><small>Calidad de ficha</small><strong>${esc(quality.label)}</strong><span>${quality.score}/100</span></div>
        <div class="technique-availability-card ${available ? 'available' : 'unavailable'}"><small>Material</small><strong>${available ? 'Disponible en tu perfil' : 'No marcado en tu perfil'}</strong><span>${esc(exercise.equipment)}</span></div>
        <div class="technique-pattern-card"><small>Patrón</small><strong>${esc(coaching.category)}</strong><span>${esc(exercise.level)}</span></div>
      </section>

      <section class="premium-detail-summary technique-pro-summary">
        <div class="premium-muscle-copy">
          <p><span class="muscle-dot primary"></span><strong>Principal:</strong> ${esc(primary)}</p>
          ${secondary ? `<p><span class="muscle-dot secondary"></span><strong>Secundarios:</strong> ${esc(secondary)}</p>` : ''}
        </div>
        <p class="premium-exercise-intro">${esc(exercise.summary)}</p>
      </section>

      <section class="premium-detail-actions technique-pro-actions">
        <button class="button button-primary" type="button" data-premium-add-plan="${esc(id)}" ${state.plan?.days?.length ? '' : 'disabled'}>＋ Añadir al plan</button>
        <button class="button button-secondary" type="button" data-premium-add-workout="${esc(id)}" ${state.activeWorkout ? '' : 'disabled'}>＋ Añadir al entreno</button>
      </section>

      ${exerciseProgressionHistoryHtml(id, {
        exerciseId: id,
        targetSets: last?.exercise?.targetSets || 3,
        repMin: last?.exercise?.repMin || 8,
        repMax: last?.exercise?.repMax || 12,
        unit: last?.exercise?.unit || 'reps'
      })}

      <section class="premium-content-section technique-pro-section">
        <div class="premium-section-heading"><span>01</span><div><p class="eyebrow">Ejecución</p><h3>Tres fases claras</h3></div></div>
        <div class="technique-phase-grid">
          <article><span>Preparación</span><strong>${esc(coaching.setup)}</strong></article>
          <article><span>Movimiento</span><strong>${esc(coaching.execution)}</strong></article>
          <article><span>Regreso</span><strong>${esc(coaching.finish)}</strong></article>
        </div>
      </section>

      <section class="technique-cue-grid technique-pro-cue-grid">
        <article><span class="cue-icon">◌</span><div><p class="eyebrow">Respiración</p><strong>${esc(coaching.breathing)}</strong></div></article>
        <article><span class="cue-icon">◷</span><div><p class="eyebrow">Ritmo recomendado</p><strong>${esc(coaching.tempo)}</strong></div></article>
      </section>

      <section class="premium-content-section technique-pro-section">
        <div class="premium-section-heading tips"><span>02</span><div><p class="eyebrow">Durante la serie</p><h3>Puntos clave</h3></div></div>
        <div class="quick-cue-grid">${coaching.cues.map((cue) => `<span><i>✓</i><strong>${esc(cue)}</strong></span>`).join('')}</div>
      </section>

      <section class="premium-content-section technique-pro-section">
        <div class="premium-section-heading warning"><span>03</span><div><p class="eyebrow">Evita esto</p><h3>Errores frecuentes</h3></div></div>
        <ul class="premium-warning-list">${coaching.mistakes.map((mistake) => `<li><span>!</span><p>${esc(mistake)}</p></li>`).join('')}</ul>
      </section>

      ${alternatives.length ? `<section class="premium-content-section alternatives-section technique-pro-section">
        <div class="premium-section-heading"><span>04</span><div><p class="eyebrow">Sustituciones inteligentes</p><h3>Mismo objetivo, otra opción</h3></div></div>
        <div class="smart-detail-alternatives">${alternatives.map((item, index) => `<button type="button" class="smart-detail-alternative" data-alt-details="${esc(item.id)}"><span class="substitution-rank">${String(index + 1).padStart(2,'0')}</span><span><strong>${esc(item.exercise.name)}</strong><small>${esc(item.reason)}</small><em>${esc(item.exercise.equipment)} · ${item.available ? 'Disponible' : 'Material no marcado'}</em></span><b>›</b></button>`).join('')}</div>
      </section>` : ''}
    </article>`, { wide: true });

  const motionVideo = wrapper.querySelector('[data-motion-video]');
  const motionToggle = wrapper.querySelector('[data-motion-toggle]');
  const motionError = wrapper.querySelector('[data-motion-error]');
  if (motionVideo) {
    const showMotionError = () => { if (motionError) motionError.hidden = false; motionVideo.style.opacity = '.18'; };
    motionVideo.addEventListener('error', showMotionError);
    motionVideo.querySelector('source')?.addEventListener('error', showMotionError);
    motionVideo.addEventListener('loadeddata', () => { if (motionError) motionError.hidden = true; motionVideo.style.opacity = '1'; });
  }
  if (motionVideo && motionToggle) {
    const updateMotionToggle = () => { motionToggle.innerHTML = motionVideo.paused ? '▶ <span>Reproducir</span>' : '❚❚ <span>Pausar</span>'; };
    motionToggle.addEventListener('click', async () => {
      if (motionVideo.paused) { try { await motionVideo.play(); } catch (error) { showToast('Pulsa de nuevo para iniciar la demostración.'); } }
      else motionVideo.pause();
      updateMotionToggle();
    });
    motionVideo.addEventListener('play', updateMotionToggle);
    motionVideo.addEventListener('pause', updateMotionToggle);
    wrapper.querySelector('[data-motion-replay]')?.addEventListener('click', async () => { motionVideo.currentTime = 0; try { await motionVideo.play(); } catch (error) {} updateMotionToggle(); });
    wrapper.querySelectorAll('[data-motion-speed]').forEach((button) => button.addEventListener('click', () => {
      motionVideo.playbackRate = Number(button.dataset.motionSpeed) || 1;
      wrapper.querySelectorAll('[data-motion-speed]').forEach((item) => item.classList.toggle('active', item === button));
    }));
    updateMotionToggle();
  }
  wrapper.querySelector('[data-motion-fullscreen]')?.addEventListener('click', async () => {
    if (!motionVideo) return;
    try {
      if (typeof motionVideo.webkitEnterFullscreen === 'function') motionVideo.webkitEnterFullscreen();
      else if (motionVideo.requestFullscreen) await motionVideo.requestFullscreen();
      else await motionVideo.closest('.premium-motion-stage')?.requestFullscreen?.();
    } catch (error) { showToast('La pantalla completa no está disponible en este navegador.'); }
  });
  wrapper.querySelector('[data-premium-favorite]')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [...state.favorites, id];
    save();
    button.classList.toggle('active', state.favorites.includes(id));
    refreshLibraryResults();
  });
  wrapper.querySelector('[data-premium-add-plan]')?.addEventListener('click', () => { wrapper._closeModal(); choosePlanDayForExercise(id); });
  wrapper.querySelector('[data-premium-add-workout]')?.addEventListener('click', () => { wrapper._closeModal(); addLibraryExerciseToWorkout(id); });
  wrapper.querySelectorAll('[data-alt-details]').forEach((button) => button.addEventListener('click', () => { wrapper._closeModal(); openExerciseDetails(button.dataset.altDetails); }));
}

function exerciseHistoryHtml(last, record, exercise) {
  if (!last && !record) return `<section class="premium-history-card empty"><div><p class="eyebrow">Tu progreso</p><h3>Primera referencia</h3></div><p>Cuando completes este ejercicio, aquí aparecerán tu último resultado, tu récord de peso y tu mejor volumen.</p></section>`;
  const sets = last ? completedSets(last.exercise) : [];
  return `<section class="premium-history-card">
    <div class="premium-history-title"><div><p class="eyebrow">Tu progreso</p><h3>Último resultado</h3></div>${last ? `<small>${formatDate(last.session.finishedAt || last.session.startedAt)}</small>` : ''}</div>
    ${sets.length ? `<div class="premium-history-sets">${sets.map((set, index) => `<span><small>S${index + 1}</small><strong>${set.weight ? `${formatWeight(set.weight)} kg` : '—'}</strong><em>${set.reps || '—'} ${last.exercise.unit === 'sec' ? 's' : 'reps'}</em></span>`).join('')}</div>` : ''}
    ${record ? `<div class="premium-record-strip"><span><small>Récord de peso</small><strong>${formatWeight(record.bestWeight)} kg</strong></span><span><small>Mejor volumen</small><strong>${formatWeight(record.bestVolume)} kg</strong></span></div>` : ''}
  </section>`;
}

function alternativeReason(source, alternative) {
  if (alternative.equipment === 'Peso corporal') return 'Alternativa sin material para casa o calentamiento.';
  if (alternative.equipment === 'Máquina') return 'Más estabilidad y una progresión de carga sencilla.';
  if (alternative.equipment === 'Mancuernas') return 'Permite mover cada brazo de forma independiente.';
  if (alternative.muscle === source.muscle) return `Trabaja ${source.muscle.toLowerCase()} con otro material.`;
  return 'Alternativa similar para mantener el objetivo de la sesión.';
}

function updateSetField(target, rerender = false) {
  const exercise = state.activeWorkout?.exercises?.[Number(target.dataset.exercise)];
  const set = exercise?.sets?.[Number(target.dataset.set)];
  if (!set) return;
  const field = target.dataset.field;
  if (field === 'weight' || field === 'reps') {
    if (String(target.value).trim() === '') set[field] = '';
    else set[field] = String(Math.max(0, numberValue(target.value)));
  } else if (field === 'rir') {
    set.rir = target.value === '' ? '' : String(clamp(numberValue(target.value), 0, 3));
  } else {
    set[field] = target.value;
  }
  save();
  if (rerender) renderWorkout();
}

function toggleSet(exerciseIndex, setIndex) {
  const exercise = state.activeWorkout.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  set.completed = !set.completed;
  set.completedAt = set.completed ? new Date().toISOString() : null;
  save();
  if (set.completed && state.settings.autoStartRest) startRestTimer(exercise.restSeconds, getExercise(exercise.exerciseId, state.customExercises).name);

  const exerciseFinished = exercise.sets.length > 0 && completedSets(exercise).length === exercise.sets.length;
  if (exerciseFinished) {
    collapsedWorkoutExercises.add(exerciseIndex);
    const nextIndex = state.activeWorkout.exercises.findIndex((candidate, index) => index > exerciseIndex && completedSets(candidate).length < candidate.sets.length);
    if (nextIndex >= 0) collapsedWorkoutExercises.delete(nextIndex);
  } else if (!set.completed) {
    collapsedWorkoutExercises.delete(exerciseIndex);
  }
  renderWorkout();
}

function addSet(exerciseIndex) {
  const exercise = state.activeWorkout.exercises[exerciseIndex];
  const previous = exercise.sets.at(-1) || {};
  exercise.sets.push({ id: uid('set'), weight: previous.weight || '', reps: '', rir: '', completed: false, completedAt: null });
  exercise.targetSets = exercise.sets.length;
  save(); renderWorkout();
}

function manualRest(exerciseIndex) {
  const exercise = state.activeWorkout.exercises[exerciseIndex];
  startRestTimer(exercise.restSeconds, getExercise(exercise.exerciseId, state.customExercises).name);
}

function removeSet(exerciseIndex, setIndex) {
  const exercise = state.activeWorkout.exercises[exerciseIndex];
  if (exercise.sets.length <= 1) return;
  exercise.sets.splice(setIndex, 1);
  exercise.targetSets = exercise.sets.length;
  save(); renderWorkout();
}


function applyProgressionTarget(exerciseIndex) {
  const item = state.activeWorkout?.exercises?.[exerciseIndex];
  if (!item) return;

  const progression = buildExerciseProgression(
    state.history,
    item,
    state.customExercises,
    { readiness: state.activeWorkout?.readiness || {} }
  );
  const hasCompleted = completedSets(item).length > 0;

  if (progression.suggestedWeight !== null) {
    item.sets.forEach((set) => {
      if (!set.completed) set.weight = progression.suggestedWeight;
    });
  }

  if (!hasCompleted) {
    item.repMin = progression.suggestedRepMin;
    item.repMax = progression.suggestedRepMax;

    while (item.sets.length < progression.suggestedSets) {
      item.sets.push({
        id: uid('set'),
        weight: progression.suggestedWeight ?? item.sets.at(-1)?.weight ?? '',
        reps: '',
        rir: '',
        completed: false,
        completedAt: null
      });
    }
    while (item.sets.length > progression.suggestedSets && item.sets.length > 1) {
      item.sets.pop();
    }
    item.targetSets = item.sets.length;
  }

  save();
  renderWorkout();
  showToast('Objetivo de progresión aplicado.', 'success');
}

function openWorkoutProgressionDetails(exerciseIndex) {
  const item = state.activeWorkout?.exercises?.[exerciseIndex];
  if (!item) return;
  const exercise = getExercise(item.exerciseId, state.customExercises);
  const progression = buildExerciseProgression(
    state.history,
    item,
    state.customExercises,
    { readiness: state.activeWorkout?.readiness || {} }
  );
  const historyData = buildExerciseProgressionHistory(
    state.history,
    item.exerciseId,
    state.customExercises
  );

  openModal(`<div class="modal-header"><div><p class="eyebrow">PROGRESIÓN AUTOMÁTICA</p><h2>${esc(exercise.name)}</h2><p class="muted">${progression.sessionsAnalyzed} referencias analizadas · ${progression.confidence}% de confianza</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <section class="progression-modal-verdict progression-${progression.tone}"><span>${progression.icon}</span><div><small>${esc(progression.label)}</small><strong>${esc(progression.title)}</strong><p>${esc(progression.text)}</p></div></section>
    <section class="progression-modal-target"><span><small>Carga sugerida</small><strong>${progression.suggestedWeight !== null ? `${formatWeight(progression.suggestedWeight)} kg` : 'Según técnica'}</strong></span><span><small>Rango</small><strong>${progression.suggestedRepMin}–${progression.suggestedRepMax} ${progression.unit === 'sec' ? 's' : 'reps'}</strong></span><span><small>Series</small><strong>${progression.suggestedSets}</strong></span></section>
    <section class="progression-modal-chart"><div><p class="eyebrow">TENDENCIA</p><h3>${esc(historyData.trend)}</h3></div>${progressionChartSvg(historyData)}</section>
    <section class="progression-evidence-list">${progression.evidence.map((item) => `<p><span>✓</span>${esc(item)}</p>`).join('')}</section>
    <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cerrar</button><button class="button button-primary" type="button" data-action="apply-progression-target" data-exercise="${exerciseIndex}" data-close-modal>Aplicar objetivo</button></div>`, { wide: true });
}

function openProgressionDashboard() {
  const dashboard = buildProgressionDashboard(
    state.history,
    state.plan,
    state.customExercises
  );

  openModal(`<div class="modal-header"><div><p class="eyebrow">PROGRESIÓN AUTOMÁTICA</p><h2>Estado de tu rutina</h2><p class="muted">Cada recomendación utiliza las últimas sesiones comparables del ejercicio.</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <section class="progression-dashboard-summary"><span class="ready"><strong>${dashboard.ready}</strong><small>listos para subir</small></span><span><strong>${dashboard.improving}</strong><small>mejorando</small></span><span class="${dashboard.attention ? 'attention' : ''}"><strong>${dashboard.attention}</strong><small>a revisar</small></span><span><strong>${dashboard.baseline}</strong><small>sin referencia</small></span></section>
    <div class="progression-dashboard-list">${dashboard.top.length ? dashboard.top.map((item) => `<article class="progression-dashboard-item progression-${item.tone}"><span>${item.icon}</span><div><small>${esc(item.exerciseName)} · ${item.confidence}% confianza</small><strong>${esc(item.title)}</strong><p>${esc(item.nextGoal)}</p></div><button type="button" data-open-exercise="${esc(item.exerciseId)}">Ficha</button></article>`).join('') : '<p class="muted">Añade ejercicios a una rutina para empezar el análisis.</p>'}</div>`, { wide: true });
  wrapper.querySelectorAll('[data-open-exercise]').forEach((button) => button.addEventListener('click', () => {
    wrapper._closeModal();
    openExerciseDetails(button.dataset.openExercise);
  }));
}

function applyWorkoutDeload() {
  const workout = state.activeWorkout;
  if (!workout) return;
  const recommendation = buildDeloadRecommendation(
    state.history,
    state.plan,
    state.profile,
    state.customExercises
  );
  if (!recommendation.recommended) return showToast('No hay una descarga recomendada ahora.');

  state.activeWorkout = applyDeloadToWorkout(workout, recommendation);
  save();
  renderWorkout();
  showToast('Descarga aplicada solo a esta sesión.', 'success');
}

function openDeloadDetails() {
  const recommendation = buildDeloadRecommendation(
    state.history,
    state.plan,
    state.profile,
    state.customExercises
  );
  openModal(`<div class="modal-header"><div><p class="eyebrow">RECUPERACIÓN</p><h2>${esc(recommendation.title)}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>
    <section class="deload-detail-score severity-${recommendation.severity}"><span>${recommendation.score}</span><div><small>ÍNDICE DE FATIGA</small><strong>${recommendation.recommended ? 'Conviene reducir temporalmente' : 'Sin señal suficiente'}</strong><p>${esc(recommendation.text)}</p></div></section>
    <section class="deload-detail-metrics"><span><strong>${recommendation.recentSessions}</strong><small>sesiones recientes</small></span><span><strong>${recommendation.lowReadiness}</strong><small>check-ins bajos</small></span><span><strong>${recommendation.regressions}</strong><small>caídas de rendimiento</small></span><span><strong>${recommendation.repeatedPlateaus}</strong><small>estancamientos</small></span></section>
    <div class="deload-reasons">${recommendation.reasons.length ? recommendation.reasons.map((reason) => `<p><span>•</span>${esc(reason)}</p>`).join('') : '<p>No hay señales negativas suficientes.</p>'}</div>
    <p class="privacy-note">La descarga nunca se aplica sola. Si la aceptas, reduce aproximadamente un 10 % la carga y una serie por ejercicio únicamente en la sesión actual.</p>
    <div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cerrar</button>${recommendation.recommended && !state.activeWorkout?.deload?.applied ? '<button class="button button-primary" type="button" data-action="apply-deload" data-close-modal>Aplicar descarga</button>' : ''}</div>`);
}

function applySuggestedWeight(exerciseIndex, weight) {
  state.activeWorkout.exercises[exerciseIndex].sets.forEach((set) => { if (!set.completed) set.weight = weight; });
  save(); renderWorkout(); showToast('Peso sugerido aplicado.');
}

function removeWorkoutExercise(exerciseIndex) {
  const item = state.activeWorkout.exercises[exerciseIndex];
  const name = getExercise(item.exerciseId, state.customExercises).name;
  confirmAction({ title: `Quitar ${name}`, message: 'Se eliminará solo de esta sesión. Tu plan permanente no cambiará.', confirmLabel: 'Quitar', danger: true, onConfirm: () => {
    state.activeWorkout.exercises.splice(exerciseIndex, 1);
    workoutAccordionSessionId = null;
    save(); renderWorkout();
  }});
}


function openWorkoutAdaptationDetails() {
  const workout = state.activeWorkout;
  if (!workout?.adaptation) return;
  const adaptation = workout.adaptation;
  const readiness = readinessSummary(workout.readiness || {});
  const removed = adaptation.removed || [];

  openModal(`<div class="modal-header">
      <div><p class="eyebrow">Adaptación temporal</p><h2>${adaptation.mode === 'adaptive' ? 'Sesión ajustada para hoy' : 'Sesión original'}</h2></div>
      <button class="modal-close" type="button" data-close-modal>×</button>
    </div>
    <section class="adaptation-detail-grid">
      <article><small>Tiempo elegido</small><strong>${esc(readiness.minutes)}</strong></article>
      <article><small>Estimación final</small><strong>${adaptation.adaptedMinutes} min</strong></article>
      <article><small>Energía</small><strong>${esc(readiness.energy)}</strong></article>
      <article><small>Sueño</small><strong>${esc(readiness.sleep)}</strong></article>
      <article><small>Molestias</small><strong>${esc(readiness.discomfort)}</strong></article>
      <article><small>Series</small><strong>${adaptation.adaptedSetCount}/${adaptation.originalSetCount}</strong></article>
    </section>
    ${removed.length ? `<section class="adaptation-removed-list"><p class="eyebrow">Omitidos solo hoy</p>${removed.map((item) => `<span>${esc(item.name)}</span>`).join('')}</section>` : ''}
    <section class="adaptation-guidance-modal">
      ${(adaptation.guidance || []).map((note) => `<p><span>✓</span>${esc(note)}</p>`).join('')}
    </section>
    <p class="privacy-note">Esta adaptación no modifica la rutina permanente. Los datos del check-in se guardan junto a esta sesión para entender el contexto del entrenamiento.</p>
    <div class="modal-actions"><button class="button button-primary" type="button" data-close-modal>Entendido</button></div>`);
}

function restoreFullWorkout() {
  const workout = state.activeWorkout;
  if (!workout?.adaptation?.originalItems?.length) return;
  const hasCompleted = workout.exercises.some((exercise) => completedSets(exercise).length);
  if (hasCompleted) return showToast('No puedes restaurar la sesión completa después de registrar series.', 'danger');

  confirmAction({
    title: 'Restaurar sesión completa',
    message: 'Se recuperarán todos los ejercicios y series de la rutina original. El check-in se conservará.',
    confirmLabel: 'Restaurar',
    onConfirm: () => {
      workout.exercises = workout.adaptation.originalItems.map((item) => workoutExerciseFromPlan(item));
      workout.adaptation = {
        ...workout.adaptation,
        mode: 'original',
        items: clone(workout.adaptation.originalItems),
        adaptedMinutes: workout.adaptation.originalMinutes,
        targetMinutes: workout.adaptation.originalMinutes,
        adaptedExerciseCount: workout.adaptation.originalExerciseCount,
        adaptedSetCount: workout.adaptation.originalSetCount,
        removed: [],
        removedSets: 0,
        reasons: [],
        guidance: ['Sesión original restaurada manualmente.']
      };
      workoutAccordionSessionId = null;
      save();
      renderWorkout();
      showToast('Sesión completa restaurada.', 'success');
    }
  });
}

function cancelWorkout() {
  confirmAction({ title: 'Cancelar entrenamiento', message: 'Se perderán las series registradas en esta sesión.', confirmLabel: 'Cancelar sesión', danger: true, onConfirm: () => {
    clearRestTimer(); state.activeWorkout = null; pendingWorkoutSelection = null; customWorkoutDraft = null; save(); setView('home'); showToast('Sesión cancelada.');
  }});
}

function finishWorkout() {
  const workout = state.activeWorkout;
  const exercises = workout.exercises.map((exercise) => ({
    ...exercise,
    exerciseName: getExercise(exercise.exerciseId, state.customExercises).name,
    sets: exercise.sets.filter((set) => set.completed)
  })).filter((exercise) => exercise.sets.length);
  if (!exercises.length) return showToast('Completa al menos una serie.', 'danger');
  const finishedAt = new Date().toISOString();
  const session = {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    finishedAt,
    durationSeconds: Math.max(0, Math.round((new Date(finishedAt) - new Date(workout.startedAt)) / 1000)),
    completedCount: exercises.length,
    totalCount: workout.exercises.length,
    notes: workout.notes || '',
    sessionSource: workout.sessionSource || 'routine',
    sourceLabel: workout.sourceLabel || 'Tu rutina',
    sourceReason: workout.sourceReason || '',
    scheduledDate: workout.scheduledDate || '',
    plannerOccurrenceId: workout.plannerOccurrenceId || '',
    planDayId: workout.planDayId || '',
    planDayIndex: Number.isInteger(workout.planDayIndex) ? workout.planDayIndex : null,
    sourcePlanDayIndex: Number.isInteger(workout.sourcePlanDayIndex) ? workout.sourcePlanDayIndex : null,
    readiness: workout.readiness || null,
    deload: workout.deload || null,
    adaptation: workout.adaptation ? {
      mode: workout.adaptation.mode,
      originalMinutes: workout.adaptation.originalMinutes,
      adaptedMinutes: workout.adaptation.adaptedMinutes,
      originalExerciseCount: workout.adaptation.originalExerciseCount,
      adaptedExerciseCount: workout.adaptation.adaptedExerciseCount,
      originalSetCount: workout.adaptation.originalSetCount,
      adaptedSetCount: workout.adaptation.adaptedSetCount,
      reasons: workout.adaptation.reasons || [],
      guidance: workout.adaptation.guidance || []
    } : null,
    exercises,
    volume: 0,
    prs: []
  };
  session.volume = sessionVolume(session);
  session.prs = detectNewPrs(state.history, session, state.customExercises);
  state.history.unshift(session);
  if (workout.sessionSource === 'routine' && Number.isInteger(workout.planDayIndex) && state.plan?.days?.length) {
    state.nextWorkoutIndex = (workout.planDayIndex + 1) % state.plan.days.length;
  }
  state.activeWorkout = null;
  pendingWorkoutSelection = null;
  customWorkoutDraft = null;
  clearRestTimer();
  save();
  const message = session.prs.length ? `Sesión guardada con ${session.prs.length} nuevo récord.` : 'Entrenamiento registrado. Buen trabajo.';
  showToast(message, 'success');
  openSessionCompleted(session);
}

function openSessionCompleted(session) {
  let destination = 'home';
  const coachUpdate = analyzeCompletedSession(state.history, session, state.customExercises);
  const coachBlock = coachUpdate.primary ? `<section class="completion-coach-block">
    <div class="coach-identity"><span class="coach-mark">MFP</span><span><small>LECTURA DEL ENTRENADOR</small><strong>${esc(coachUpdate.headline)}</strong></span></div>
    <div class="completion-coach-insight"><span class="coach-status-icon coach-status-${coachUpdate.primary.tone}">${coachUpdate.primary.icon}</span><div><strong>${esc(coachUpdate.primary.exerciseName)} · ${esc(coachUpdate.primary.title)}</strong><p>${esc(coachUpdate.primary.nextGoal)}</p></div></div>
    <div class="completion-coach-counts"><span>${coachUpdate.positiveCount} señales positivas</span><span>${coachUpdate.attentionCount} puntos a revisar</span></div>
  </section>` : '';
  const adaptationTag = session.adaptation?.mode === 'adaptive'
    ? `<span class="completion-adaptation-tag">Sesión adaptada · ${session.adaptation.adaptedMinutes} min estimados</span>`
    : '';
  const deloadTag = session.deload?.applied
    ? '<span class="completion-deload-tag">Descarga aplicada</span>'
    : '';
  const completionSourceLabel = session.sourceLabel || ({
    mfp: 'My Fit Plan',
    recommended: 'Recomendada por MFP',
    custom: 'Entrenamiento personalizado'
  }[session.sessionSource] || '');
  const sourceTag = completionSourceLabel && completionSourceLabel !== 'Tu rutina'
    ? `<span class="completion-source-tag">${esc(completionSourceLabel)}</span>`
    : '';
  const wrapper = openModal(`<div class="completion-hero"><div class="completion-icon">✓</div><p class="eyebrow">Sesión completada</p><h2>${esc(session.name)}</h2><p>${formatDuration(session.durationSeconds)} · ${session.exercises.length} ejercicios · ${formatWeight(session.volume)} kg de volumen</p>${adaptationTag}${deloadTag}${sourceTag}</div>${session.prs.length ? `<div class="pr-celebration"><h3>Nuevos récords</h3>${session.prs.map((pr) => `<div class="record-row"><span>${esc(pr.name)}</span><strong>${pr.type === 'weight' ? `${formatWeight(pr.value)} kg` : `${pr.value} reps`}</strong></div>`).join('')}</div>` : '<p class="muted">La constancia también es progreso. Tu historial se ha actualizado.</p>'}${coachBlock}<button class="button button-primary button-block" type="button" id="completedContinue">Ver mi progreso</button>`, {
    onClose: () => setView(destination)
  });
  wrapper.querySelector('#completedContinue').addEventListener('click', () => {
    destination = 'profile';
    wrapper._closeModal();
  });
}

function addLibraryExerciseToWorkout(id) {
  if (!state.activeWorkout) return showToast('Primero inicia un entrenamiento.', 'danger');
  state.activeWorkout.exercises.push(workoutExerciseFromPlan(createPlanExercise(id, trainingRules(state.profile))));
  workoutAccordionSessionId = null;
  save(); showToast('Añadido al entrenamiento.', 'success');
  setView('workout');
}

function choosePlanDayForExercise(id) {
  if (!state.plan?.days?.length) return;
  const exercise = getExercise(id, state.customExercises);
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Añadir al plan</p><h2>${esc(exercise.name)}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><div class="alternative-list">${state.plan.days.map((day, index) => `<button type="button" class="alternative-button" data-day-choice="${index}"><span><strong>${esc(day.name)}</strong><small>${day.exercises.length} ejercicios</small></span><span>＋</span></button>`).join('')}</div>`);
  wrapper.querySelectorAll('[data-day-choice]').forEach((button) => button.addEventListener('click', () => {
    state.plan.days[Number(button.dataset.dayChoice)].exercises.push(createPlanExercise(id, trainingRules(state.profile)));
    save(); wrapper._closeModal(); showToast('Ejercicio añadido al plan.', 'success');
  }));
}

function applyLibraryQuery(query) {
  libraryFilters.query = String(query || '');
  libraryPageSize = 36;
  rememberSearch(query, false);
  renderLibrary();
}

function rememberSearch(query, notify = true) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return;
  state.searchHistory = [clean, ...(state.searchHistory || []).filter((item) => normalizeText(item) !== normalizeText(clean))].slice(0, 8);
  save();
  if (notify) showToast('Búsqueda guardada.');
}

function openCalendarDay(date) {
  const sessions = state.history.filter((session) => isoDay(session.finishedAt || session.startedAt) === date);
  if (!sessions.length) return;
  openModal(`<div class="modal-header"><div><p class="eyebrow">Entrenamientos</p><h2>${formatDate(date)}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><div class="history-detail-list">${sessions.map((session) => `<article class="history-exercise"><strong>${esc(session.name)}</strong><p class="muted small">${formatDuration(session.durationSeconds)} · ${session.exercises.length} ejercicios · ${formatWeight(session.volume || sessionVolume(session))} kg</p>${session.prs?.length ? `<span class="pill pill-success">${session.prs.length} récord</span>` : ''}</article>`).join('')}</div>`);
}

function toggleFavorite(id) {
  state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [...state.favorites, id];
  save(); refreshLibraryResults();
}

function openCustomExerciseForm(id = null) {
  const current = id ? state.customExercises.find((item) => item.id === id) : null;
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Ejercicio personalizado</p><h2>${current ? 'Editar ejercicio' : 'Crear ejercicio'}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><form id="customExerciseForm" class="form-grid"><div class="form-fields"><label class="field field-full"><span>Nombre</span><input name="name" required maxlength="60" value="${esc(current?.name || '')}"></label><label class="field"><span>Grupo muscular</span><input name="muscle" required value="${esc(current?.muscle || '')}" placeholder="Ej. Pecho"></label><label class="field"><span>Material</span><input name="equipment" required value="${esc(current?.equipment || '')}" placeholder="Ej. Mancuernas"></label></div><label class="field"><span>Explicación breve</span><textarea name="summary" required>${esc(current?.summary || '')}</textarea></label><label class="field"><span>Pasos, uno por línea</span><textarea name="steps">${esc((current?.steps || []).join('\n'))}</textarea></label><label class="field"><span>Errores frecuentes, uno por línea</span><textarea name="mistakes">${esc((current?.mistakes || []).join('\n'))}</textarea></label><label class="field"><span>Palabras alternativas separadas por comas</span><input name="synonyms" value="${esc((current?.synonyms || []).join(', '))}" placeholder="Ej. banca, press plano"></label><div class="modal-actions">${current ? '<button class="button button-danger" type="button" id="deleteCustomExercise">Eliminar</button>' : '<span></span>'}<button class="button button-primary" type="submit">Guardar</button></div></form>`, { wide: true });
  wrapper.querySelector('#customExerciseForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const exercise = {
      id: current?.id || uid('custom'),
      name: String(data.get('name')).trim(),
      muscle: String(data.get('muscle')).trim(),
      equipment: String(data.get('equipment')).trim(),
      summary: String(data.get('summary')).trim(),
      steps: String(data.get('steps') || '').split(/\n+/).map((part) => part.trim()).filter(Boolean),
      mistakes: String(data.get('mistakes') || '').split(/\n+/).map((part) => part.trim()).filter(Boolean),
      alternatives: current?.alternatives || [],
      synonyms: String(data.get('synonyms') || '').split(',').map((part) => part.trim()).filter(Boolean),
      custom: true
    };
    if (current) state.customExercises[state.customExercises.findIndex((item) => item.id === current.id)] = exercise;
    else state.customExercises.push(exercise);
    save(); wrapper._closeModal(); renderLibrary(); showToast('Ejercicio guardado.', 'success');
  });
  wrapper.querySelector('#deleteCustomExercise')?.addEventListener('click', () => {
    wrapper._closeModal();
    confirmAction({ title: `Eliminar ${current.name}`, message: 'Se eliminará de la biblioteca. Los registros históricos conservarán sus datos, pero el ejercicio ya no tendrá explicación.', confirmLabel: 'Eliminar', danger: true, onConfirm: () => {
      state.customExercises = state.customExercises.filter((item) => item.id !== current.id);
      state.favorites = state.favorites.filter((item) => item !== current.id);
      state.plan?.days?.forEach((day) => { day.exercises = day.exercises.filter((item) => item.exerciseId !== current.id); });
      if (state.activeWorkout) state.activeWorkout.exercises = state.activeWorkout.exercises.filter((item) => item.exerciseId !== current.id);
      save(); renderLibrary(); showToast('Ejercicio eliminado.');
    }});
  });
}

function showProfileTab(tab, filterExerciseId = null) {
  document.querySelectorAll('[data-profile-tab]').forEach((button) => button.classList.toggle('active', button.dataset.profileTab === tab));
  const content = document.querySelector('#profileTabContent');
  if (!content) return;
  if (tab === 'history') content.innerHTML = profileHistoryHtml(filterExerciseId);
  else if (tab === 'body') {
    content.innerHTML = profileBodyHtml();
    refreshBodyProgressImages(content);
  } else if (tab === 'data') content.innerHTML = profileDataHtml();
  else if (tab === 'settings') content.innerHTML = profileSettingsHtml();
  else {
    const bmi = calculateBMI();
    content.innerHTML = profileProgressHtml(weightSummary(state.weightHistory), bmi, bmi ? bmiInfo(bmi) : null, personalRecords(state.history, state.customExercises), buildCalendar(state.history));
  }
}

function openHistoryDetail(id) {
  const session = state.history.find((item) => item.id === id);
  if (!session) return;
  openModal(`<div class="modal-header"><div><p class="eyebrow">${formatDateTime(session.finishedAt)}</p><h2>${esc(session.name)}</h2><p class="muted small">${formatDuration(session.durationSeconds)} · ${formatWeight(session.volume || sessionVolume(session))} kg de volumen</p></div><button class="modal-close" type="button" data-close-modal>×</button></div>${session.prs?.length ? `<div class="pr-strip">${session.prs.map((pr) => `<span>★ ${esc(pr.name)}: ${pr.type === 'weight' ? `${formatWeight(pr.value)} kg` : `${pr.value} reps`}</span>`).join('')}</div>` : ''}<div class="history-detail-list">${session.exercises.map((exercise) => { const data = getExercise(exercise.exerciseId, state.customExercises); const displayName = exercise.exerciseName || data.name; return `<article class="history-exercise"><h3>${esc(displayName)}</h3><div class="history-sets">${completedSets(exercise).map((set, index) => `<span><strong>${index + 1}</strong>${set.weight ? `${esc(set.weight)} kg · ` : ''}${esc(set.reps)} ${exercise.unit === 'sec' ? 's' : 'reps'}${set.rir !== '' ? ` · reserva ${esc(set.rir)}` : ''}</span>`).join('')}</div>${exercise.notes ? `<p class="muted small">${esc(exercise.notes)}</p>` : ''}</article>`; }).join('')}</div>${session.notes ? `<section class="notice"><strong>Notas:</strong> ${esc(session.notes)}</section>` : ''}`, { wide: true });
}

function submitProfileForm(form) {
  const data = new FormData(form);
  const newWeight = numberValue(data.get('weight')) || '';
  state.profile = {
    ...state.profile,
    name: String(data.get('name') || '').trim(),
    age: numberValue(data.get('age')) || '',
    weight: newWeight,
    height: numberValue(data.get('height')) || '',
    equipment: data.getAll('equipment')
  };
  recordProfileWeight(newWeight);
  save(); showToast('Perfil actualizado.', 'success'); renderProfile(); showProfileTab('data');
}

function submitSettingsForm(form) {
  const data = new FormData(form);
  const accentHex = normalizeHexColor(data.get('accentHex') || document.querySelector('#accentHexText')?.value || currentAccentHex());
  state.settings = {
    ...state.settings,
    accent: 'custom', accentHex,
    appearance: ['system','light','dark'].includes(data.get('appearance')) ? data.get('appearance') : 'system',
    compact: data.has('compact'), showTips: data.has('showTips'), reduceMotion: data.has('reduceMotion'),
    autoStartRest: data.has('autoStartRest'), restSound: data.has('restSound'), restVibrate: data.has('restVibrate')
  };
  save(); showToast('Apariencia guardada.', 'success'); renderProfile(); showProfileTab('settings');
}

function settingsFormValues() {
  const form = document.querySelector('#settingsForm');
  if (!form) return null;
  const appearance = form.querySelector('input[name="appearance"]:checked')?.value || state.settings.appearance || 'system';
  const accentHex = normalizeHexColor(form.querySelector('#accentColorPicker')?.value || currentAccentHex());
  return { appearance, accentHex };
}
function previewThemeFromSettingsForm() { const values = settingsFormValues(); if (values) applySettings(values); }
function syncAccentControls(value, updateText = true) {
  const color = normalizeHexColor(value);
  const picker = document.querySelector('#accentColorPicker'); const text = document.querySelector('#accentHexText'); const card = document.querySelector('.native-color-picker');
  if (picker) picker.value = color; if (text && updateText) text.value = color; if (card) card.style.setProperty('--preview-color', color);
  document.querySelectorAll('.palette-preset').forEach((button) => button.classList.toggle('active', button.dataset.color?.toLowerCase() === color));
  previewThemeFromSettingsForm();
}
function applyAccentPreset(color) { syncAccentControls(color); }

function openWeightModal() {
  if (!state.profile) return renderQuestionnaire();
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Medición corporal</p><h2>Registrar peso</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><form id="weightForm" class="form-grid"><label class="field"><span>Peso en kg</span><input name="weight" inputmode="decimal" type="number" min="30" max="350" step="0.1" required value="${esc(state.profile.weight || '')}"></label><label class="field"><span>Fecha</span><input name="date" type="date" max="${isoDay()}" value="${isoDay()}"></label><div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancelar</button><button class="button button-primary" type="submit">Guardar medición</button></div></form>`);
  wrapper.querySelector('#weightForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const weight = numberValue(data.get('weight'));
    const date = String(data.get('date') || isoDay());
    const existing = state.weightHistory.find((item) => item.date === date);
    if (existing) existing.weight = weight;
    else state.weightHistory.push({ id: uid('weight'), date, weight });
    state.weightHistory.sort((a,b) => String(a.date).localeCompare(String(b.date)));
    if (date === isoDay()) state.profile.weight = weight;
    save(); wrapper._closeModal(); showToast('Peso registrado.', 'success'); if (currentView === 'profile') renderProfile(); else renderHome();
  });
}

function recordProfileWeight(weight) {
  const value = numberValue(weight);
  if (!value) return;
  const today = isoDay();
  const existing = state.weightHistory.find((item) => item.date === today);
  if (existing) existing.weight = value;
  else state.weightHistory.push({ id: uid('weight'), date: today, weight: value });
  state.weightHistory.sort((a,b) => String(a.date).localeCompare(String(b.date)));
}

function exportBackup() {
  const filename = `my-fit-plan-copia-${isoDay()}.json`;
  downloadJson(filename, { app: 'My Fit Plan', version: APP_VERSION, exportedAt: new Date().toISOString(), data: state });
  showToast('Copia preparada. Las fotografías se exportan por separado desde cada revisión.', 'success');
}

async function importBackup(file) {
  try {
    const payload = await readJsonFile(file);
    const imported = validateImportedState(payload);
    confirmAction({ title: 'Importar copia de seguridad', message: 'Los datos actuales se sustituirán por los de la copia seleccionada.', confirmLabel: 'Importar', danger: true, onConfirm: () => {
      clearRestTimer(); state = imported; save(); applySettings(); updateProfileShortcut(); setView('home'); showToast('Copia importada correctamente.', 'success');
    }});
  } catch (error) {
    showToast(error.message || 'No se pudo importar la copia.', 'danger');
  }
}

function resetAllData() {
  confirmAction({ title: 'Borrar todos los datos', message: 'Se eliminarán perfil, plan, historial, medidas, favoritos, fotografías y ejercicios personalizados de este dispositivo.', confirmLabel: 'Borrar definitivamente', danger: true, onConfirm: async () => {
    clearRestTimer();
    try { await clearProgressPhotoStore(); } catch (error) { reportRuntimeIssue(error, 'Borrado de fotografías'); }
    state = createEmptyState();
    save();
    applySettings();
    updateProfileShortcut();
    setView('home');
    showToast('Datos eliminados.', 'success');
  }});
}

function startRestTimer(seconds, exerciseName = '') {
  const duration = Math.max(5, Number(seconds) || state.settings.defaultRestSeconds || 75);
  state.activeWorkout.restTimer = { duration, endAt: Date.now() + duration * 1000, remaining: duration, paused: false, exerciseName };
  save();
  runRestInterval();
  updateRestTimerDock();
}

function restoreRestTimer() {
  if (!state.activeWorkout?.restTimer) return;
  const timer = state.activeWorkout.restTimer;
  if (!timer.paused && timer.endAt <= Date.now()) {
    state.activeWorkout.restTimer = null;
    save();
    return;
  }
  runRestInterval();
  updateRestTimerDock();
}

function runRestInterval() {
  clearInterval(restInterval);
  restInterval = setInterval(() => {
    const timer = state.activeWorkout?.restTimer;
    if (!timer) return clearRestTimer(false);
    if (!timer.paused) timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    if (timer.remaining <= 0) finishRestTimer();
    else updateRestTimerDock();
  }, 250);
}

function updateRestTimerDock() {
  const timer = state.activeWorkout?.restTimer;
  if (!timer) {
    restTimerDock.hidden = true;
    return;
  }
  const remaining = timer.paused ? timer.remaining : Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
  restTimerDock.hidden = false;
  restTimerDock.innerHTML = `<div><small>Descanso${timer.exerciseName ? ` · ${esc(timer.exerciseName)}` : ''}</small><strong>${formatTimer(remaining)}</strong></div><div class="timer-actions"><button type="button" data-timer="add">+15</button><button type="button" data-timer="pause">${timer.paused ? '▶' : 'Ⅱ'}</button><button type="button" data-timer="skip">Saltar</button></div>`;
}

function handleTimerClick(event) {
  const button = event.target.closest('[data-timer]');
  if (!button || !state.activeWorkout?.restTimer) return;
  const timer = state.activeWorkout.restTimer;
  if (button.dataset.timer === 'add') {
    timer.remaining = Math.max(0, timer.remaining || Math.ceil((timer.endAt - Date.now()) / 1000)) + 15;
    timer.endAt = Date.now() + timer.remaining * 1000;
  } else if (button.dataset.timer === 'pause') {
    if (timer.paused) {
      timer.paused = false; timer.endAt = Date.now() + timer.remaining * 1000;
    } else {
      timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000)); timer.paused = true;
    }
  } else if (button.dataset.timer === 'skip') {
    return clearRestTimer();
  }
  save(); updateRestTimerDock();
}

function finishRestTimer() {
  const exerciseName = state.activeWorkout?.restTimer?.exerciseName;
  clearRestTimer();
  if (state.settings.restSound) beep();
  if (state.settings.restVibrate && navigator.vibrate) navigator.vibrate([180, 80, 180]);
  showToast(exerciseName ? `Descanso terminado: ${exerciseName}` : 'Descanso terminado.', 'success');
}

function clearRestTimer(saveAfter = true) {
  clearInterval(restInterval);
  restInterval = null;
  if (state.activeWorkout) state.activeWorkout.restTimer = null;
  restTimerDock.hidden = true;
  restTimerDock.innerHTML = '';
  if (saveAfter) save();
}

function beep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.34);
  } catch (error) {
    console.warn('No se pudo reproducir el aviso:', error);
  }
}

function updateLiveDuration() {
  const node = document.querySelector('[data-live-duration]');
  if (!node || !state.activeWorkout) return;
  const tick = () => {
    if (!document.body.contains(node) || !state.activeWorkout) return;
    node.textContent = formatDuration((Date.now() - new Date(state.activeWorkout.startedAt).getTime()) / 1000);
    setTimeout(tick, 30000);
  };
  tick();
}


function updateHud() {
  syncAdaptiveHudMode();
  document.body.dataset.currentView = currentView;
  const meta = pageHudMeta(currentView, state);
  const title = document.querySelector('#hudTitle');
  const subtitle = document.querySelector('#hudSubtitle');
  const eyebrow = document.querySelector('#hudEyebrow');
  if (title) title.textContent = meta.title;
  if (subtitle) subtitle.textContent = meta.subtitle;
  if (eyebrow) eyebrow.textContent = meta.eyebrow;

  if (networkStatus) {
    const online = navigator.onLine !== false;
    networkStatus.classList.toggle('is-online', online);
    networkStatus.classList.toggle('is-offline', !online);
    networkStatus.innerHTML = `<span class="network-dot"></span><span class="network-label">${online ? 'Online' : 'Sin conexión'}</span>`;
  }

  document.querySelectorAll('.nav-item').forEach((item) => {
    const activeNav = currentView === 'calendar' ? 'plan' : currentView;
    const active = item.dataset.nav === activeNav;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  const health = getHudHealth();
  const railHealth = document.querySelector('#railHealthText');
  if (railHealth) railHealth.textContent = health.errors ? `${health.errors} incidencia${health.errors === 1 ? '' : 's'}` : health.warnings ? `${health.warnings} aviso${health.warnings === 1 ? '' : 's'}` : 'Sistema operativo';
  document.body.classList.toggle('has-runtime-issue', Boolean(runtimeIssues.length));

  if (activeSessionBar) {
    const workout = state.activeWorkout;
    const visible = Boolean(workout && currentView !== 'workout');
    activeSessionBar.hidden = !visible;
    if (visible) {
      const sets = workout.exercises.flatMap((exercise) => exercise.sets || []);
      const done = sets.filter((set) => set.completed).length;
      const percentage = sets.length ? Math.round(done / sets.length * 100) : 0;
      activeSessionBar.innerHTML = `${hudIcon('train')}<span><small>SESIÓN EN CURSO</small><strong>${esc(workout.name)}</strong></span><span class="active-session-progress"><i style="--progress:${percentage}%"></i><b>${percentage}%</b></span>${hudIcon('arrow')}`;
    }
  }
}

function renderRecoveryScreen(view, error) {
  app.innerHTML = `<section class="page recovery-page"><div class="recovery-card">${hudIcon('shield')}<p class="eyebrow">Modo seguro</p><h1>Esta pantalla no pudo cargarse</h1><p>Los datos siguen guardados. Puedes volver al inicio, exportar una copia o revisar el diagnóstico.</p><code>${esc(String(error?.message || 'Error desconocido'))}</code><div class="recovery-actions"><button class="button button-primary" type="button" data-nav-local="home">Volver al inicio</button><button class="button button-secondary" type="button" data-action="export-backup">Exportar copia</button><button class="button button-secondary" type="button" data-action="hud-control">Centro de control</button></div></div></section>`;
  decorateInteractiveElements(app);
}

function getHudHealth(force = false) {
  const now = Date.now();
  if (force || !cachedHudHealth || now - cachedHudHealthAt > 5000) {
    cachedHudHealth = runHudHealthCheck();
    cachedHudHealthAt = now;
  }
  return cachedHudHealth;
}

function runHudHealthCheck() {
  const checks = [];
  const add = (id, ok, label, detail = '', severity = 'error') => checks.push({ id, ok: Boolean(ok), label, detail, severity });
  const allExercises = getAllExercises(state.customExercises);
  const planIds = (state.plan?.days || []).flatMap((day) => day.exercises || []).map((item) => item.exerciseId);
  const activeIds = (state.activeWorkout?.exercises || []).map((item) => item.exerciseId);
  const historyIds = (state.history || []).flatMap((session) => session.exercises || []).map((item) => item.exerciseId);
  const missingCriticalIds = [...new Set([...planIds, ...activeIds].filter((id) => id && !allExercises[id]))];
  const missingHistoryIds = [...new Set(historyIds.filter((id) => id && !allExercises[id] && !missingCriticalIds.includes(id)))];
  const activeRoutineExists = !state.activeRoutineId || (state.routineFolders || []).some((folder) => (folder.routines || []).some((routine) => routine.id === state.activeRoutineId));
  const planValid = !state.profile || Boolean(state.plan?.days?.length);
  const nextIndexValid = !state.plan?.days?.length || (state.nextWorkoutIndex >= 0 && state.nextWorkoutIndex < state.plan.days.length);
  const plannerValid = !state.plan || !state.planner || state.planner.planId === state.plan.id;
  const workoutValid = !state.activeWorkout || Boolean(state.activeWorkout.exercises?.length);
  const workoutSetMismatch = state.activeWorkout?.exercises?.filter((exercise) => exercise.targetSets !== exercise.sets?.length).length || 0;
  const invalidPlanTargets = (state.plan?.days || []).flatMap((day) => day.exercises || []).filter((exercise) =>
    numberValue(exercise.targetSets) < 1
    || numberValue(exercise.repMin) < 1
    || numberValue(exercise.repMax) < numberValue(exercise.repMin)
    || numberValue(exercise.restSeconds) < 15
  ).length;
  const invalidHistorySessions = (state.history || []).filter((session) =>
    !session.id || !Array.isArray(session.exercises) || !session.finishedAt
  ).length;
  const layout = getHudLayoutSnapshot();
  const responsiveValid = layout.mode === 'mobile'
    ? !layout.railVisible && layout.dockVisible
    : layout.railVisible && !layout.dockVisible;
  const horizontalOverflow = layout.documentWidth > Math.ceil(layout.width) + 2;

  add('responsive', responsiveValid, 'Navegación adaptativa', `${layout.mode} · rail ${layout.railVisible ? 'visible' : 'oculto'} · dock ${layout.dockVisible ? 'visible' : 'oculto'}`);
  add('viewport', !horizontalOverflow, 'Anchura de interfaz', horizontalOverflow ? `El documento mide ${layout.documentWidth}px para un viewport de ${Math.round(layout.width)}px.` : 'Sin desplazamiento horizontal.');
  add('storage', (() => { try { const key='__mfp_health__'; localStorage.setItem(key,'1'); localStorage.removeItem(key); return true; } catch { return false; } })(), 'Guardado local', 'El navegador permite escribir datos.');
  add('profile', !state.onboardingCompleted || Boolean(state.profile), 'Perfil', state.profile ? 'Perfil disponible.' : 'Falta el perfil.');
  add('plan', planValid, 'Rutina activa', state.plan?.days?.length ? `${state.plan.days.length} días configurados.` : 'No hay una rutina válida.');
  add('routine', activeRoutineExists, 'Biblioteca de rutinas', activeRoutineExists ? 'La rutina activa está vinculada.' : 'La rutina activa no existe en su carpeta.');
  add('index', nextIndexValid, 'Orden de rutina', nextIndexValid ? 'Índice dentro de rango.' : 'El siguiente día está fuera de rango.');
  add('planner', plannerValid, 'Calendario', plannerValid ? 'Calendario vinculado al plan.' : 'El calendario pertenece a otra rutina.', 'warning');
  add('workout', workoutValid, 'Sesión activa', workoutValid ? 'Estructura de sesión correcta.' : 'La sesión activa no contiene ejercicios.');
  add('workout-sets', workoutSetMismatch === 0, 'Series de sesión', workoutSetMismatch ? `${workoutSetMismatch} ejercicio${workoutSetMismatch === 1 ? '' : 's'} tiene${workoutSetMismatch === 1 ? '' : 'n'} un contador de series incoherente.` : 'Contadores de series coherentes.');
  add('plan-targets', invalidPlanTargets === 0, 'Objetivos de rutina', invalidPlanTargets ? `${invalidPlanTargets} objetivo${invalidPlanTargets === 1 ? '' : 's'} necesita${invalidPlanTargets === 1 ? '' : 'n'} normalización.` : 'Series, rangos y descansos válidos.');
  add('history-structure', invalidHistorySessions === 0, 'Estructura del historial', invalidHistorySessions ? `${invalidHistorySessions} sesión${invalidHistorySessions === 1 ? '' : 'es'} presenta${invalidHistorySessions === 1 ? '' : 'n'} datos incompletos.` : 'Historial estructuralmente correcto.', 'warning');
  add('exercises', missingCriticalIds.length === 0, 'Referencias activas de ejercicios', missingCriticalIds.length ? `Faltan ${missingCriticalIds.length}: ${missingCriticalIds.slice(0,3).join(', ')}` : `${Object.keys(allExercises).length} ejercicios disponibles.`);
  add('history-exercises', missingHistoryIds.length === 0, 'Referencias históricas', missingHistoryIds.length ? `${missingHistoryIds.length} ejercicio${missingHistoryIds.length === 1 ? '' : 's'} eliminado${missingHistoryIds.length === 1 ? '' : 's'} conserva${missingHistoryIds.length === 1 ? '' : 'n'} registros sin ficha técnica.` : 'Todo el historial mantiene una ficha disponible.', 'warning');
  add('runtime', runtimeIssues.length === 0, 'Errores de ejecución', runtimeIssues.length ? `${runtimeIssues.length} incidencia${runtimeIssues.length === 1 ? '' : 's'} detectada${runtimeIssues.length === 1 ? '' : 's'}.` : 'Sin errores detectados durante esta apertura.', 'warning');

  const errors = checks.filter((item) => !item.ok && item.severity === 'error').length;
  const warnings = checks.filter((item) => !item.ok && item.severity === 'warning').length;
  return { checks, errors, warnings, missingIds: missingCriticalIds, missingHistoryIds, status: errors ? 'error' : warnings ? 'warning' : 'ok' };
}

function openHudControlCenter() {
  const health = getHudHealth(true);
  const statusText = health.errors ? 'Necesita revisión' : health.warnings ? 'Funciona con avisos' : 'Sistema operativo';
  const wrapper = openModal(`<div class="modal-header hud-control-modal-header"><div><p class="eyebrow">CENTRO DE CONTROL</p><h2>${esc(statusText)}</h2><p class="muted">Estado local de datos, almacenamiento, PWA y ejecución.</p></div><button class="modal-close" type="button" data-close-modal aria-label="Cerrar">×</button></div>
    <section class="hud-health-hero status-${health.status}"><span>${health.status === 'ok' ? hudIcon('shield') : hudIcon('warning')}</span><div><small>DIAGNÓSTICO RÁPIDO</small><strong>${health.errors ? `${health.errors} errores` : health.warnings ? `${health.warnings} avisos` : 'Todo correcto'}</strong><p>${runtimeIssues[0] ? esc(runtimeIssues[0].message) : 'La estructura principal de la aplicación es válida.'}</p></div></section>
    <div class="hud-control-grid">
      <button type="button" data-action="hud-run-diagnostics">${hudIcon('shield')}<span><strong>Diagnóstico completo</strong><small>Revisar datos y funciones críticas</small></span>${hudIcon('arrow')}</button>
      <button type="button" data-action="export-backup">${hudIcon('download')}<span><strong>Exportar copia</strong><small>Guardar perfil, planes e historial</small></span>${hudIcon('arrow')}</button>
      <button type="button" data-action="hud-open-settings">${hudIcon('settings')}<span><strong>Ajustes de interfaz</strong><small>Tema, color y accesibilidad</small></span>${hudIcon('arrow')}</button>
      <button type="button" data-action="hud-force-update">${hudIcon('refresh')}<span><strong>Buscar actualización</strong><small>Comprobar la PWA y la caché</small></span>${hudIcon('arrow')}</button>
    </div>
    <div class="hud-control-footer"><span>${navigator.onLine === false ? 'Modo sin conexión' : 'Conexión disponible'}</span><span>My Fit Plan v${APP_VERSION}</span><span>${state.history.length} sesiones guardadas</span></div>`, { wide: true });
  decorateInteractiveElements(wrapper);
}

function openHudDiagnostics() {
  const health = getHudHealth(true);
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">SUPERVISIÓN DE FALLOS</p><h2>Diagnóstico de My Fit Plan</h2><p class="muted">Comprobación local sin enviar información fuera del dispositivo.</p></div><button class="modal-close" type="button" data-close-modal aria-label="Cerrar">×</button></div>
    <div class="hud-diagnostic-list">${health.checks.map((item) => `<article class="${item.ok ? 'is-ok' : `is-${item.severity}`} "><span>${item.ok ? hudIcon('check') : hudIcon(item.severity === 'warning' ? 'warning' : 'close')}</span><div><strong>${esc(item.label)}</strong><p>${esc(item.detail)}</p></div><b>${item.ok ? 'Correcto' : item.severity === 'warning' ? 'Aviso' : 'Error'}</b></article>`).join('')}</div>
    ${runtimeIssues.length ? `<section class="hud-runtime-log"><p class="eyebrow">INCIDENCIAS DE ESTA APERTURA</p>${runtimeIssues.map((issue) => `<article><strong>${esc(issue.context)}</strong><p>${esc(issue.message)}</p><small>${formatDateTime(issue.createdAt)}</small></article>`).join('')}</section>` : ''}
    <div class="modal-actions"><button class="button button-secondary" type="button" data-action="hud-export-diagnostics">Exportar informe</button><button class="button button-secondary" type="button" data-action="hud-repair-data">Normalizar datos</button><button class="button button-primary" type="button" data-close-modal>Cerrar</button></div>`, { wide: true });
  decorateInteractiveElements(wrapper);
}

function exportHudDiagnostics() {
  const health = getHudHealth(true);
  downloadJson(`my-fit-plan-diagnostico-${isoDay()}.json`, {
    app: 'My Fit Plan', version: APP_VERSION, generatedAt: new Date().toISOString(),
    environment: {
      online: navigator.onLine !== false,
      userAgent: navigator.userAgent,
      standalone: window.matchMedia?.('(display-mode: standalone)').matches || false,
      layout: getHudLayoutSnapshot()
    },
    counts: { sessions: state.history.length, folders: state.routineFolders.length, customExercises: state.customExercises.length, bodyEntries: state.bodyProgress.length },
    health, runtimeIssues
  });
  showToast('Informe de diagnóstico preparado.', 'success');
}

function repairApplicationState() {
  try {
    state = persistState(state);
    ensurePlanner();
    save();
    runtimeIssues.splice(0);
    cachedHudHealthAt = 0;
    if (hudErrorBanner) hudErrorBanner.hidden = true;
    closeModal();
    setView(currentView || 'home');
    showToast('Estructura de datos normalizada.', 'success');
  } catch (error) {
    reportRuntimeIssue(error, 'Normalización de datos');
    showToast('No se pudo normalizar. Exporta una copia antes de continuar.', 'danger');
  }
}

async function forceApplicationUpdate() {
  closeModal();
  showToast('Comprobando actualización…');
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    await registration?.update?.();
    if (registration?.waiting) showUpdateBanner(registration.waiting);
    else showToast('My Fit Plan está actualizado.', 'success');
  } catch (error) {
    reportRuntimeIssue(error, 'Actualización PWA');
    showToast('No se pudo comprobar la actualización.', 'danger');
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js?v=39', { updateViaCache: 'none' });
    if (registration.waiting && navigator.serviceWorker.controller) showUpdateBanner(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(worker);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    setInterval(() => registration.update(), 60 * 60 * 1000);
  } catch (error) {
    console.warn('No se pudo registrar la aplicación sin conexión:', error);
  }
}

function showUpdateBanner(worker) {
  waitingServiceWorker = worker;
  updateBanner.hidden = false;
  updateBanner.innerHTML = '<span><strong>Nueva versión disponible</strong><small>Pulsa para actualizar My Fit Plan.</small></span><b>Actualizar</b>';
}

function handleUpdateClick() {
  if (waitingServiceWorker) waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
  else window.location.reload();
}
