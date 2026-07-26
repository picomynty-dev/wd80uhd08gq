'use strict';

import { getAllExercises, getExercise, searchableExerciseText } from './exercises.js';
import { buildPlan, createPlanExercise, objectiveLabel, trainingRules, isTimedExercise } from './plans.js';
import { APP_VERSION, createEmptyState, loadState, saveState as persistState, validateImportedState } from './storage.js';
import {
  buildCalendar,
  calculateStreak,
  completedSets,
  detectNewPrs,
  exerciseVolume,
  formatWeight,
  lastExercisePerformance,
  personalRecords,
  progressionRecommendation,
  recentExerciseIds,
  sessionVolume,
  sessionsThisMonth,
  sessionsThisWeek,
  weightSummary
} from './stats.js';
import {
  clamp,
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
} from './utils.js';
import { closeModal, confirmAction, emptyState, openModal, showToast } from './ui.js';
import { searchExerciseEntries, suggestedSearches } from './search.js';
import { exerciseVisual } from './visuals.js';

const app = document.querySelector('#app');
const installButton = document.querySelector('#installButton');
const profileShortcut = document.querySelector('#profileShortcut');
const restTimerDock = document.querySelector('#restTimerDock');
const updateBanner = document.querySelector('#updateBanner');
const root = document.documentElement;

let state = loadState();
let currentView = 'home';
let deferredInstallPrompt = null;
let libraryFilters = { query: '', muscle: 'Todos', equipment: 'Todos', level: 'Todos', mode: 'all' };
let libraryPageSize = 36;
let restInterval = null;
let waitingServiceWorker = null;

init();

function init() {
  applySettings();
  updateProfileShortcut();
  bindGlobalEvents();
  registerServiceWorker();
  restoreRestTimer();
  setView('home');
}

function bindGlobalEvents() {
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.nav));
  });
  app.addEventListener('click', handleAppClick);
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
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.nav === view));
  const renderers = {
    home: renderHome,
    plan: renderPlan,
    workout: renderWorkout,
    library: renderLibrary,
    profile: renderProfile
  };
  (renderers[view] || renderHome)();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? 'auto' : 'smooth' });
}

function save() {
  state = persistState(state);
  applySettings();
  updateProfileShortcut();
}

function applySettings() {
  root.dataset.accent = state.settings.accent || 'orange';
  root.dataset.theme = state.settings.appearance || 'system';
  root.classList.toggle('compact', Boolean(state.settings.compact));
  root.classList.toggle('reduce-motion', Boolean(state.settings.reduceMotion));
  const themeColors = { orange: '#f97316', blue: '#2563eb', green: '#16a34a', violet: '#7c3aed' };
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[state.settings.accent] || themeColors.orange);
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
        <button class="quick-launch-card" type="button" data-nav-local="library"><span class="quick-launch-icon">⌕</span><span><strong>Buscar ejercicio</strong><small>Más de 280 opciones</small></span><b>→</b></button>
        <button class="quick-launch-card" type="button" data-nav-local="plan"><span class="quick-launch-icon">▤</span><span><strong>Editar mi plan</strong><small>Series, reps y orden</small></span><b>→</b></button>
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
  app.innerHTML = `
    <section class="page">
      <div class="hero">
        <p class="eyebrow">My Fit Plan 3.0A</p>
        <h1>Tu entrenamiento, serie a serie.</h1>
        <p>Crea una rutina, registra cada serie, controla los descansos y recibe una orientación sencilla para progresar.</p>
        <div class="hero-actions">
          <button class="button button-primary" type="button" data-action="start-questionnaire">Crear mi plan</button>
          <button class="button button-secondary" type="button" data-action="demo-plan">Ver una demo</button>
        </div>
      </div>
      <section class="section grid grid-3">
        <article class="card"><span class="pill">1</span><h3>Registra cada serie</h3><p class="muted small">Peso, repeticiones y esfuerzo percibido.</p></article>
        <article class="card"><span class="pill">2</span><h3>Controla descansos</h3><p class="muted small">Temporizador integrado después de cada serie.</p></article>
        <article class="card"><span class="pill">3</span><h3>Observa tu progreso</h3><p class="muted small">Historial, récords, calendario y peso corporal.</p></article>
      </section>
      <section class="section notice">Orientación general para adultos. No sustituye una valoración médica, fisioterapéutica, nutricional o de entrenamiento presencial.</section>
    </section>`;
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

function renderQuestionnaire() {
  const p = state.profile || {};
  const selectedEquipment = new Set(p.equipment || ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio']);
  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Configuración inicial</p>
      <h1>${state.profile ? 'Actualizar mi plan' : 'Crear mi plan'}</h1>
      <p class="muted">Podrás editar cada día y ejercicio después. Los datos se guardan solo en este dispositivo.</p>
      <form id="planForm" class="card form-card form-grid">
        <div class="form-fields">
          <label class="field field-full"><span>Nombre o apodo</span><input name="name" maxlength="30" value="${esc(p.name || '')}" placeholder="Ej. Raúl"></label>
          <label class="field"><span>Edad</span><input name="age" type="number" min="18" max="100" value="${esc(p.age || '')}" placeholder="Ej. 20"></label>
          <label class="field"><span>Peso actual (kg)</span><input name="weight" inputmode="decimal" type="number" min="30" max="350" step="0.1" value="${esc(p.weight || '')}" placeholder="Ej. 75"></label>
          <label class="field"><span>Estatura (cm)</span><input name="height" inputmode="numeric" type="number" min="120" max="230" value="${esc(p.height || '')}" placeholder="Ej. 178"></label>
        </div>

        ${radioGroup('objective', '1. Objetivo principal', [
          ['muscle', 'Fuerza y músculo'], ['fitness', 'Ponerme en forma'], ['fat', 'Mejorar condición']
        ], p.objective || 'muscle')}
        ${radioGroup('days', '2. Días disponibles', [['2', '2 días'], ['3', '3 días'], ['4', '4 días'], ['5', '5 días']], String(p.days || 3))}
        ${radioGroup('minutes', '3. Tiempo por sesión', [['30', '30 minutos'], ['45', '45 minutos'], ['60', '60 minutos']], String(p.minutes || 45))}

        <fieldset class="fieldset">
          <legend>4. Material disponible</legend>
          <div class="check-grid">
            ${['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio'].map((equipment) => checkboxOption('equipment', equipment, equipment, selectedEquipment.has(equipment))).join('')}
          </div>
        </fieldset>

        <label class="consent-row">
          <input id="adultConsent" name="adultConsent" type="checkbox" ${state.profile ? 'checked' : ''}>
          <span class="visible-check" aria-hidden="true">✓</span>
          <span><strong>Confirmo que soy mayor de 18 años.</strong><small>My Fit Plan está planteada inicialmente para usuarios adultos.</small></span>
        </label>

        <button class="button button-primary button-block" type="submit">${state.profile ? 'Guardar y regenerar plan' : 'Generar mi rutina'}</button>
      </form>
    </section>`;
}

function radioGroup(name, legend, options, selected) {
  return `<fieldset class="fieldset"><legend>${esc(legend)}</legend><div class="option-grid">${options.map(([value, label]) => `<label class="option"><input type="radio" name="${esc(name)}" value="${esc(value)}" ${String(value) === String(selected) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}</div></fieldset>`;
}

function checkboxOption(name, value, label, checked) {
  return `<label class="check-option"><input type="checkbox" name="${esc(name)}" value="${esc(value)}" ${checked ? 'checked' : ''}><span class="check-box">✓</span><span>${esc(label)}</span></label>`;
}

function createDemoPlan() {
  state.profile = {
    name: 'Demo', age: 25, weight: 75, height: 178, objective: 'muscle', days: 3, minutes: 45,
    equipment: ['Máquina', 'Mancuernas', 'Polea', 'Banco', 'Barra', 'Peso corporal', 'Cardio']
  };
  state.plan = buildPlan(state.profile);
  state.createdAt = new Date().toISOString();
  state.weightHistory = [{ id: uid('weight'), date: isoDay(), weight: 75 }];
  save();
  showToast('Plan de demostración creado.', 'success');
  setView('home');
}

function renderPlan() {
  if (!state.profile || !state.plan) return renderLocked('Primero crea tu plan.', 'Completa el cuestionario inicial para obtener una rutina editable.');
  const days = state.plan.days || [];
  app.innerHTML = `
    <section class="page">
      <div class="section-title-row">
        <div><p class="eyebrow">Rutina editable</p><h1>Mi plan</h1></div>
        <button class="button button-primary button-small" type="button" data-action="add-day">＋ Día</button>
      </div>
      <p class="muted">Modifica nombres, orden, ejercicios, series, repeticiones y descansos. Los cambios se aplicarán a las próximas sesiones.</p>

      <div class="plan-toolbar card">
        <span><strong>${days.length}</strong> días · <strong>${days.reduce((sum, day) => sum + day.exercises.length, 0)}</strong> ejercicios</span>
        <div class="inline-actions">
          <button class="button button-secondary button-small" type="button" data-action="open-questionnaire">Ajustar objetivo</button>
          <button class="button button-danger button-small" type="button" data-action="restore-plan">Restaurar recomendada</button>
        </div>
      </div>

      <div class="plan-days section">
        ${days.map((day, dayIndex) => renderPlanDay(day, dayIndex)).join('')}
      </div>
      <section class="section notice">Los cambios del plan no alteran una sesión que ya esté empezada. Para aplicar el nuevo plan a una sesión activa, cancela esa sesión y vuelve a iniciarla.</section>
    </section>`;
}

function renderPlanDay(day, dayIndex) {
  return `<article class="card plan-day ${dayIndex === state.nextWorkoutIndex ? 'next-day' : ''}">
    <div class="plan-day-header">
      <div><span class="pill">Día ${dayIndex + 1}</span><h2>${esc(day.name)}</h2>${dayIndex === state.nextWorkoutIndex ? '<span class="pill pill-success">Siguiente</span>' : ''}</div>
      <div class="inline-actions">
        <button class="icon-button" type="button" data-action="rename-day" data-day="${dayIndex}" aria-label="Cambiar nombre">✎</button>
        <button class="icon-button danger-icon" type="button" data-action="delete-day" data-day="${dayIndex}" aria-label="Eliminar día">×</button>
      </div>
    </div>
    <div class="plan-exercise-list">
      ${day.exercises.length ? day.exercises.map((item, exerciseIndex) => renderPlanExercise(item, dayIndex, exerciseIndex, day.exercises.length)).join('') : emptyState('Día vacío', 'Añade al menos un ejercicio para poder entrenarlo.')}
    </div>
    <div class="plan-day-actions">
      <button class="button button-secondary" type="button" data-action="picker-plan-add" data-day="${dayIndex}">＋ Añadir ejercicio</button>
      <button class="button button-primary" type="button" data-action="start-specific-day" data-day="${dayIndex}" ${day.exercises.length ? '' : 'disabled'}>Entrenar este día</button>
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

function createActiveWorkout(dayIndex = state.nextWorkoutIndex) {
  const days = state.plan?.days || [];
  if (!days.length) return null;
  const safeIndex = clamp(Number(dayIndex) || 0, 0, days.length - 1);
  const day = days[safeIndex];
  state.activeWorkout = {
    id: uid('session'),
    planDayIndex: safeIndex,
    planDayId: day.id,
    name: day.name,
    startedAt: new Date().toISOString(),
    notes: '',
    restTimer: null,
    exercises: day.exercises.map((planItem) => workoutExerciseFromPlan(planItem))
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

function renderWorkout() {
  if (!state.plan?.days?.length) return renderLocked('No tienes días de entrenamiento.', 'Añade al menos un día con ejercicios desde el plan.');
  if (!state.activeWorkout) createActiveWorkout();
  const workout = state.activeWorkout;
  const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
  const doneSets = allSets.filter((set) => set.completed).length;
  const percentage = allSets.length ? Math.round((doneSets / allSets.length) * 100) : 0;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000));
  const finishedExercises = workout.exercises.filter((exercise) => exercise.sets.length && completedSets(exercise).length === exercise.sets.length).length;

  app.innerHTML = `
    <section class="page workout-page premium-workout-page">
      <header class="workout-command-header">
        <div>
          <p class="eyebrow"><span class="live-dot"></span> Entrenamiento en curso</p>
          <h1>${esc(workout.name)}</h1>
          <p>${finishedExercises} de ${workout.exercises.length} ejercicios completados</p>
        </div>
        <button class="command-add-button" type="button" data-action="picker-workout-add"><span>＋</span> Ejercicio</button>
      </header>

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

function renderWorkoutExercise(item, index) {
  const exercise = getExercise(item.exerciseId, state.customExercises);
  const recommendation = progressionRecommendation(state.history, item, state.customExercises);
  const last = lastExercisePerformance(state.history, item.exerciseId);
  const completed = completedSets(item).length;
  const isDone = item.sets.length > 0 && completed === item.sets.length;

  return `<article class="workout-exercise-card premium-exercise-card ${isDone ? 'exercise-complete' : ''}">
    <div class="premium-exercise-head">
      <button class="exercise-name-button" type="button" data-action="exercise-details" data-id="${esc(item.exerciseId)}">
        <span class="exercise-sequence">${String(index + 1).padStart(2, '0')}</span>
        <span class="exercise-head-copy"><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small><strong>${esc(exercise.name)}</strong><em>${item.targetSets} × ${item.repMin}–${item.repMax} ${item.unit === 'sec' ? 'seg' : 'reps'} · ${item.restSeconds}s</em></span>
      </button>
      <div class="exercise-status-stack"><span class="exercise-progress-pill ${isDone ? 'done' : ''}">${completed}/${item.sets.length}</span>${isDone ? '<small>Completado</small>' : '<small>Series</small>'}</div>
    </div>

    ${state.settings.showTips ? `<div class="exercise-coach-line"><span>TIP</span><p>${esc(exercise.summary)}</p></div>` : ''}
    ${last ? `<div class="last-session-premium-box"><div><span>ÚLTIMA VEZ</span>${renderLastSets(last.exercise)}</div></div>` : ''}
    ${recommendation ? `<div class="recommendation premium-recommendation recommendation-${recommendation.tone}"><div><span class="coach-badge">COACH</span><strong>${esc(recommendation.title)}</strong><p>${esc(recommendation.text)}</p></div>${recommendation.suggestedWeight ? `<button class="button button-secondary button-small" type="button" data-action="apply-suggested-weight" data-exercise="${index}" data-weight="${recommendation.suggestedWeight}">Aplicar ${formatWeight(recommendation.suggestedWeight)} kg</button>` : ''}</div>` : ''}

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
  const muscles = ['Todos', ...new Set(Object.values(all).map((exercise) => exercise.muscle).sort((a,b) => a.localeCompare(b,'es')))];
  const equipment = ['Todos', ...new Set(Object.values(all).map((exercise) => exercise.equipment).sort((a,b) => a.localeCompare(b,'es')))];
  const levels = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];
  const suggestions = [...new Set([...(state.searchHistory || []).slice(0, 4), ...suggestedSearches(libraryFilters.query)])].slice(0, 6);
  app.innerHTML = `
    <section class="page library-page">
      <div class="section-title-row"><div><p class="eyebrow">${Object.keys(all).length} ejercicios</p><h1>Biblioteca</h1></div><button class="button button-primary button-small" type="button" data-action="custom-new">＋ Crear</button></div>
      <section class="card library-controls">
        <div class="search-shell"><span>⌕</span><input class="search-input" id="librarySearch" type="search" placeholder="Ej. espalda con polea, sentadiya…" value="${esc(libraryFilters.query)}"></div>
        ${suggestions.length ? `<div class="search-suggestions">${suggestions.map((value) => `<button type="button" data-action="library-query" data-query="${esc(value)}">${esc(value)}</button>`).join('')}</div>` : ''}
        <div class="filter-row filter-row-3">
          <select id="libraryMuscle" class="filter-select" aria-label="Músculo">${muscles.map((value) => `<option ${value === libraryFilters.muscle ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>
          <select id="libraryEquipment" class="filter-select" aria-label="Material">${equipment.map((value) => `<option ${value === libraryFilters.equipment ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>
          <select id="libraryLevel" class="filter-select" aria-label="Nivel">${levels.map((value) => `<option ${value === libraryFilters.level ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>
        </div>
        <div class="segmented-control">
          ${[['all','Todos'],['favorites','Favoritos'],['recent','Recientes'],['custom','Creados']].map(([value,label]) => `<button type="button" data-action="library-mode" data-mode="${value}" class="${libraryFilters.mode === value ? 'active' : ''}">${label}</button>`).join('')}
        </div>
      </section>
      <div id="libraryResults" class="library-results section">${libraryResultsHtml()}</div>
    </section>`;
}

function libraryResultsHtml() {
  const all = getAllExercises(state.customExercises);
  const query = libraryFilters.query.trim();
  const recent = new Set(recentExerciseIds(state));
  const profileEquipment = new Set(state.profile?.equipment || []);
  let entries = Object.entries(all).filter(([id, exercise]) => {
    if (libraryFilters.muscle !== 'Todos' && exercise.muscle !== libraryFilters.muscle) return false;
    if (libraryFilters.equipment !== 'Todos' && exercise.equipment !== libraryFilters.equipment) return false;
    if (libraryFilters.level !== 'Todos' && exercise.level !== libraryFilters.level) return false;
    if (libraryFilters.mode === 'favorites' && !state.favorites.includes(id)) return false;
    if (libraryFilters.mode === 'recent' && !recent.has(id)) return false;
    if (libraryFilters.mode === 'custom' && !exercise.custom) return false;
    return true;
  });
  entries = query
    ? searchExerciseEntries(entries, query, searchableExerciseText)
    : entries.sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'));
  if (!entries.length) return emptyState('No hay coincidencias', 'La búsqueda admite errores de escritura. Prueba por músculo, material o movimiento.', '<button class="button button-primary" type="button" data-action="custom-new">Crear ejercicio</button>');

  const visible = entries.slice(0, libraryPageSize);
  return `<div class="results-header"><p class="results-count"><strong>${entries.length}</strong> resultados${entries.length > visible.length ? ` · mostrando ${visible.length}` : ''}</p>${query ? `<button class="button button-ghost button-small" type="button" data-action="remember-search" data-query="${esc(query)}">Guardar búsqueda</button>` : ''}</div><div class="exercise-grid">${visible.map(([id, exercise]) => {
    const favorite = state.favorites.includes(id);
    const unavailable = profileEquipment.size && !profileEquipment.has(exercise.equipment) && !['Peso corporal', 'Sin especificar'].includes(exercise.equipment);
    return `<article class="card library-card">
      ${exerciseVisual(exercise)}
      <div class="library-card-body">
        <div class="card-header"><div><div class="exercise-meta"><span>${esc(exercise.muscle)}</span><span>${esc(exercise.level)}</span></div><h3>${esc(exercise.name)}</h3></div><button class="favorite-button ${favorite ? 'active' : ''}" type="button" data-action="toggle-favorite" data-id="${esc(id)}" aria-label="Favorito">★</button></div>
        <p class="muted small clamp-2">${esc(exercise.summary)}</p>
        <div class="exercise-meta"><span>${esc(exercise.equipment)}</span>${exercise.custom ? '<span>Personalizado</span>' : ''}${unavailable ? '<span class="warning-text">Material no marcado</span>' : ''}</div>
        <div class="library-card-actions">
          <button class="button button-secondary button-small" type="button" data-action="exercise-details" data-id="${esc(id)}">Técnica</button>
          <button class="button button-primary button-small" type="button" data-action="library-add-workout" data-id="${esc(id)}" ${state.activeWorkout ? '' : 'disabled'}>＋ Entreno</button>
          <button class="button button-secondary button-small" type="button" data-action="library-add-plan" data-id="${esc(id)}" ${state.plan?.days?.length ? '' : 'disabled'}>＋ Plan</button>
          ${exercise.custom ? `<button class="button button-ghost button-small" type="button" data-action="custom-edit" data-id="${esc(id)}">Editar</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('')}</div>${entries.length > visible.length ? `<button class="button button-secondary button-block load-more" type="button" data-action="library-more">Mostrar ${Math.min(36, entries.length - visible.length)} más</button>` : ''}`;
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
    <section class="section card"><div class="section-title-row"><div><p class="eyebrow">Plan actual</p><h2>${state.profile.days} días · ${state.profile.minutes} min</h2></div><button class="button button-secondary button-small" type="button" data-action="open-questionnaire">Cambiar plan base</button></div><p class="muted">${esc(objectiveLabel(state.profile.objective))}</p></section>
  </section>`;
}

function profileSettingsHtml() {
  return `<section class="profile-tab-panel">
    <form id="settingsForm" class="card form-card form-grid">
      <div class="section-title-row"><div><p class="eyebrow">Personalización</p><h2>Ajustes</h2></div><button class="button button-primary button-small" type="submit">Guardar</button></div>
      <fieldset class="fieldset"><legend>Color principal</legend><div class="color-options">${[['orange','Naranja'],['blue','Azul'],['green','Verde'],['violet','Violeta']].map(([value,label]) => `<label class="color-option color-${value}"><input type="radio" name="accent" value="${value}" ${state.settings.accent === value ? 'checked' : ''}><span></span><small>${label}</small></label>`).join('')}</div></fieldset>
      <label class="field"><span>Apariencia</span><select name="appearance"><option value="system" ${state.settings.appearance === 'system' ? 'selected' : ''}>Según el iPhone</option><option value="light" ${state.settings.appearance === 'light' ? 'selected' : ''}>Clara</option><option value="dark" ${state.settings.appearance === 'dark' ? 'selected' : ''}>Oscura</option></select></label>
      ${settingSwitch('compact','Vista compacta','Reduce espacios en las listas.',state.settings.compact)}
      ${settingSwitch('showTips','Mostrar explicaciones','Enseña consejos breves durante el entrenamiento.',state.settings.showTips)}
      ${settingSwitch('reduceMotion','Reducir animaciones','Minimiza movimientos y transiciones.',state.settings.reduceMotion)}
      ${settingSwitch('autoStartRest','Iniciar descanso automáticamente','Activa el temporizador al completar cada serie.',state.settings.autoStartRest)}
      ${settingSwitch('restSound','Sonido al terminar','Emite un aviso cuando finaliza el descanso.',state.settings.restSound)}
      ${settingSwitch('restVibrate','Vibración si está disponible','No todos los iPhone o navegadores la permiten.',state.settings.restVibrate)}
    </form>

    <section class="section card">
      <p class="eyebrow">Copia de seguridad</p><h2>Exportar o importar datos</h2>
      <p class="muted small">Crea un archivo con tu plan, entrenamientos, ejercicios personalizados, ajustes y medidas.</p>
      <div class="grid grid-2"><button class="button button-secondary" type="button" data-action="export-backup">Exportar copia</button><label class="button button-secondary file-button">Importar copia<input id="backupFile" type="file" accept="application/json,.json" hidden></label></div>
    </section>
    <section class="section card danger-zone"><p class="eyebrow">Zona de seguridad</p><h2>Borrar todos los datos</h2><p class="muted small">Esta acción elimina el perfil y el progreso guardado en este dispositivo.</p><button class="button button-danger" type="button" data-action="reset-data">Borrar datos</button></section>
  </section>`;
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
  const nav = event.target.closest('[data-nav-local]');
  if (nav) return setView(nav.dataset.navLocal);
  const profileTab = event.target.closest('[data-profile-tab]');
  if (profileTab) return showProfileTab(profileTab.dataset.profileTab);
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  const actions = {
    'start-questionnaire': renderQuestionnaire,
    'open-questionnaire': renderQuestionnaire,
    'demo-plan': createDemoPlan,
    'home-workout': () => setView('workout'),
    'quick-weight': openWeightModal,
    'add-day': addPlanDay,
    'rename-day': () => renamePlanDay(Number(target.dataset.day)),
    'delete-day': () => deletePlanDay(Number(target.dataset.day)),
    'move-plan-exercise': () => movePlanExercise(Number(target.dataset.day), Number(target.dataset.exercise), target.dataset.direction),
    'remove-plan-exercise': () => removePlanExercise(Number(target.dataset.day), Number(target.dataset.exercise)),
    'picker-plan-add': () => openExercisePicker({ mode: 'plan-add', dayIndex: Number(target.dataset.day) }),
    'picker-plan-replace': () => openExercisePicker({ mode: 'plan-replace', dayIndex: Number(target.dataset.day), exerciseIndex: Number(target.dataset.exercise) }),
    'restore-plan': restoreRecommendedPlan,
    'start-specific-day': () => startSpecificDay(Number(target.dataset.day)),
    'exercise-details': () => openExerciseDetails(target.dataset.id),
    'toggle-set': () => toggleSet(Number(target.dataset.exercise), Number(target.dataset.set)),
    'add-set': () => addSet(Number(target.dataset.exercise)),
    'manual-rest': () => manualRest(Number(target.dataset.exercise)),
    'remove-set': () => removeSet(Number(target.dataset.exercise), Number(target.dataset.set)),
    'apply-suggested-weight': () => applySuggestedWeight(Number(target.dataset.exercise), numberValue(target.dataset.weight)),
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
    'reset-data': resetAllData
  };
  actions[action]?.();
}

function handleAppChange(event) {
  const target = event.target;
  if (target.matches('[data-action="plan-target"]')) updatePlanTarget(target);
  if (target.matches('[data-action="set-field"]')) updateSetField(target);
  if (target.id === 'libraryMuscle') { libraryFilters.muscle = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'libraryEquipment') { libraryFilters.equipment = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'libraryLevel') { libraryFilters.level = target.value; libraryPageSize = 36; refreshLibraryResults(); }
  if (target.id === 'backupFile') importBackup(target.files?.[0]);
  if (target.matches('[data-profile-tab]')) showProfileTab(target.dataset.profileTab);
}

const delayedSaveField = debounce((target) => {
  if (target.dataset.action === 'set-field') updateSetField(target, false);
  if (target.dataset.action === 'workout-notes') { state.activeWorkout.notes = target.value; save(); }
  if (target.dataset.action === 'exercise-notes') { state.activeWorkout.exercises[Number(target.dataset.exercise)].notes = target.value; save(); }
}, 220);

function handleAppInput(event) {
  const target = event.target;
  if (target.id === 'librarySearch') {
    libraryFilters.query = target.value;
    libraryPageSize = 36;
    debounceRefreshLibrary();
  }
  if (['set-field','workout-notes','exercise-notes'].includes(target.dataset.action)) delayedSaveField(target);
}

const debounceRefreshLibrary = debounce(refreshLibraryResults, 160);
function refreshLibraryResults() {
  const results = document.querySelector('#libraryResults');
  if (results) results.innerHTML = libraryResultsHtml();
  document.querySelectorAll('[data-action="library-mode"]').forEach((button) => button.classList.toggle('active', button.dataset.mode === libraryFilters.mode));
}

function handleAppSubmit(event) {
  event.preventDefault();
  if (event.target.id === 'planForm') submitPlanForm(event.target);
  if (event.target.id === 'profileForm') submitProfileForm(event.target);
  if (event.target.id === 'settingsForm') submitSettingsForm(event.target);
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

function addPlanDay() {
  state.plan.days.push({ id: uid('day'), name: `Día ${state.plan.days.length + 1}`, exercises: [] });
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
  const item = state.plan.days[Number(target.dataset.day)].exercises[Number(target.dataset.exercise)];
  const field = target.dataset.field;
  item[field] = numberValue(target.value);
  if (field === 'repMin' && item.repMax < item.repMin) item.repMax = item.repMin;
  if (field === 'repMax' && item.repMin > item.repMax) item.repMin = item.repMax;
  save();
}

function restoreRecommendedPlan() {
  confirmAction({ title: 'Restaurar rutina recomendada', message: 'Se perderán los cambios hechos en tu plan. El historial se conservará.', confirmLabel: 'Restaurar', danger: true, onConfirm: () => {
    state.plan = buildPlan(state.profile); state.nextWorkoutIndex = 0; save(); renderPlan(); showToast('Rutina recomendada restaurada.');
  }});
}

function startSpecificDay(dayIndex) {
  if (state.activeWorkout) {
    return confirmAction({ title: 'Cambiar de entrenamiento', message: 'Ya existe una sesión en curso. Al continuar se descartará esa sesión.', confirmLabel: 'Empezar nuevo', danger: true, onConfirm: () => { clearRestTimer(); state.activeWorkout = null; createActiveWorkout(dayIndex); setView('workout'); }});
  }
  state.nextWorkoutIndex = dayIndex;
  createActiveWorkout(dayIndex);
  setView('workout');
}

function openExercisePicker({ mode, dayIndex = null, exerciseIndex = null }) {
  let query = '';
  let muscle = 'Todos';
  let equipment = 'Todos';
  const all = getAllExercises(state.customExercises);
  const muscles = ['Todos', ...new Set(Object.values(all).map((item) => item.muscle).sort())];
  const equipments = ['Todos', ...new Set(Object.values(all).map((item) => item.equipment).sort())];
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">Seleccionar ejercicio</p><h2>${pickerTitle(mode)}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div><div class="picker-controls"><input id="pickerSearch" class="search-input" type="search" placeholder="Buscar…"><div class="filter-row"><select id="pickerMuscle" class="filter-select">${muscles.map((value) => `<option>${esc(value)}</option>`).join('')}</select><select id="pickerEquipment" class="filter-select">${equipments.map((value) => `<option>${esc(value)}</option>`).join('')}</select></div></div><div id="pickerResults" class="picker-results"></div>`, { wide: true });
  const results = wrapper.querySelector('#pickerResults');
  const redraw = () => {
    const normalized = normalizeText(query);
    const entries = Object.entries(all).filter(([id, exercise]) => (!normalized || normalizeText(searchableExerciseText(id, exercise)).includes(normalized)) && (muscle === 'Todos' || exercise.muscle === muscle) && (equipment === 'Todos' || exercise.equipment === equipment)).sort((a,b) => a[1].name.localeCompare(b[1].name,'es'));
    results.innerHTML = entries.length ? entries.map(([id, exercise]) => `<button class="picker-item" type="button" data-picker-id="${esc(id)}"><span><strong>${esc(exercise.name)}</strong><small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small></span><span>＋</span></button>`).join('') : emptyState('Sin resultados','Prueba otra búsqueda.');
  };
  redraw();
  wrapper.querySelector('#pickerSearch').addEventListener('input', (event) => { query = event.target.value; redraw(); });
  wrapper.querySelector('#pickerMuscle').addEventListener('change', (event) => { muscle = event.target.value; redraw(); });
  wrapper.querySelector('#pickerEquipment').addEventListener('change', (event) => { equipment = event.target.value; redraw(); });
  results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-picker-id]');
    if (!button) return;
    applyPickedExercise(button.dataset.pickerId, { mode, dayIndex, exerciseIndex });
    wrapper._closeModal();
  });
}

function pickerTitle(mode) {
  return ({ 'plan-add':'Añadir al plan','plan-replace':'Cambiar ejercicio','workout-add':'Añadir a la sesión','workout-replace':'Cambiar ejercicio' })[mode] || 'Elegir ejercicio';
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
    save(); renderWorkout(); showToast('Ejercicio añadido a la sesión.', 'success');
  } else if (context.mode === 'workout-replace') {
    const current = state.activeWorkout.exercises[context.exerciseIndex];
    const replacement = workoutExerciseFromPlan(createPlanExercise(id, rules, { targetSets: current.targetSets, restSeconds: current.restSeconds }));
    replacement.instanceId = current.instanceId;
    state.activeWorkout.exercises[context.exerciseIndex] = replacement;
    save(); renderWorkout(); showToast('Ejercicio cambiado.');
  }
}

function openExerciseDetails(id) {
  const exercise = getExercise(id, state.customExercises);
  const alternatives = (exercise.alternatives || []).map((altId) => ({ id: altId, ...getExercise(altId, state.customExercises) }));
  const wrapper = openModal(`<div class="modal-header"><div><p class="eyebrow">${esc(exercise.muscle)} · ${esc(exercise.equipment)}</p><h2>${esc(exercise.name)}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></div>${exerciseVisual(exercise, { large: true })}<div class="exercise-detail-tags"><span class="pill">${esc(exercise.level)}</span><span class="pill">Principal: ${esc((exercise.primaryMuscles || []).join(', '))}</span>${exercise.secondaryMuscles?.length ? `<span class="pill">Secundario: ${esc(exercise.secondaryMuscles.join(', '))}</span>` : ''}</div><p>${esc(exercise.summary)}</p><h3>Cómo hacerlo</h3><ol class="detail-list">${(exercise.steps || []).map((step) => `<li>${esc(step)}</li>`).join('')}</ol><h3>Errores frecuentes</h3><ul class="detail-list warning-list">${(exercise.mistakes || []).map((mistake) => `<li>${esc(mistake)}</li>`).join('')}</ul>${alternatives.length ? `<h3>Alternativas</h3><div class="alternative-list">${alternatives.map((item) => `<button type="button" class="alternative-button" data-alt-details="${esc(item.id)}"><span><strong>${esc(item.name)}</strong><small>${esc(item.muscle)} · ${esc(item.equipment)}</small></span><span>›</span></button>`).join('')}</div>` : ''}<section class="notice">Las ilustraciones son orientativas. Detén el ejercicio si aparece dolor agudo, mareo o una sensación anormal. La explicación no sustituye una corrección presencial.</section>`, { wide: true });
  wrapper.querySelectorAll('[data-alt-details]').forEach((button) => button.addEventListener('click', () => { wrapper._closeModal(); openExerciseDetails(button.dataset.altDetails); }));
}

function updateSetField(target, rerender = false) {
  const exercise = state.activeWorkout?.exercises?.[Number(target.dataset.exercise)];
  const set = exercise?.sets?.[Number(target.dataset.set)];
  if (!set) return;
  set[target.dataset.field] = target.value;
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

function applySuggestedWeight(exerciseIndex, weight) {
  state.activeWorkout.exercises[exerciseIndex].sets.forEach((set) => { if (!set.completed) set.weight = weight; });
  save(); renderWorkout(); showToast('Peso sugerido aplicado.');
}

function removeWorkoutExercise(exerciseIndex) {
  const item = state.activeWorkout.exercises[exerciseIndex];
  const name = getExercise(item.exerciseId, state.customExercises).name;
  confirmAction({ title: `Quitar ${name}`, message: 'Se eliminará solo de esta sesión. Tu plan permanente no cambiará.', confirmLabel: 'Quitar', danger: true, onConfirm: () => {
    state.activeWorkout.exercises.splice(exerciseIndex, 1); save(); renderWorkout();
  }});
}

function cancelWorkout() {
  confirmAction({ title: 'Cancelar entrenamiento', message: 'Se perderán las series registradas en esta sesión.', confirmLabel: 'Cancelar sesión', danger: true, onConfirm: () => {
    clearRestTimer(); state.activeWorkout = null; save(); setView('home'); showToast('Sesión cancelada.');
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
    exercises,
    volume: 0,
    prs: []
  };
  session.volume = sessionVolume(session);
  session.prs = detectNewPrs(state.history, session, state.customExercises);
  state.history.unshift(session);
  state.nextWorkoutIndex = state.plan.days.length ? (workout.planDayIndex + 1) % state.plan.days.length : 0;
  state.activeWorkout = null;
  clearRestTimer();
  save();
  const message = session.prs.length ? `Sesión guardada con ${session.prs.length} nuevo récord.` : 'Entrenamiento registrado. Buen trabajo.';
  showToast(message, 'success');
  openSessionCompleted(session);
}

function openSessionCompleted(session) {
  let destination = 'home';
  const wrapper = openModal(`<div class="completion-hero"><div class="completion-icon">✓</div><p class="eyebrow">Sesión completada</p><h2>${esc(session.name)}</h2><p>${formatDuration(session.durationSeconds)} · ${session.exercises.length} ejercicios · ${formatWeight(session.volume)} kg de volumen</p></div>${session.prs.length ? `<div class="pr-celebration"><h3>Nuevos récords</h3>${session.prs.map((pr) => `<div class="record-row"><span>${esc(pr.name)}</span><strong>${pr.type === 'weight' ? `${formatWeight(pr.value)} kg` : `${pr.value} reps`}</strong></div>`).join('')}</div>` : '<p class="muted">La constancia también es progreso. Tu historial se ha actualizado.</p>'}<button class="button button-primary button-block" type="button" id="completedContinue">Ver mi progreso</button>`, {
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
  else if (tab === 'data') content.innerHTML = profileDataHtml();
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
  state.settings = {
    ...state.settings,
    accent: data.get('accent') || 'orange',
    appearance: data.get('appearance') || 'system',
    compact: data.has('compact'),
    showTips: data.has('showTips'),
    reduceMotion: data.has('reduceMotion'),
    autoStartRest: data.has('autoStartRest'),
    restSound: data.has('restSound'),
    restVibrate: data.has('restVibrate')
  };
  save(); showToast('Ajustes guardados.', 'success'); renderProfile(); showProfileTab('settings');
}

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
  showToast('Copia de seguridad preparada.', 'success');
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
  confirmAction({ title: 'Borrar todos los datos', message: 'Se eliminarán perfil, plan, historial, medidas, favoritos y ejercicios personalizados de este dispositivo.', confirmLabel: 'Borrar definitivamente', danger: true, onConfirm: () => {
    clearRestTimer(); state = createEmptyState(); save(); applySettings(); updateProfileShortcut(); setView('home'); showToast('Datos eliminados.');
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

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js');
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
