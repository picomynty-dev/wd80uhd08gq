'use strict';

const STORAGE_KEY = 'myFitPlanStateV1';
const app = document.querySelector('#app');
const installButton = document.querySelector('#installButton');
let deferredInstallPrompt = null;
let currentView = 'home';

const exerciseLibrary = {
  leg_press: {
    name: 'Prensa de piernas', muscle: 'Piernas', note: 'Apoya toda la espalda y no bloquees las rodillas.',
    alternatives: ['goblet_squat', 'leg_extension']
  },
  goblet_squat: {
    name: 'Sentadilla goblet', muscle: 'Piernas', note: 'Sujeta una mancuerna delante del pecho y baja con control.',
    alternatives: ['leg_press', 'leg_extension']
  },
  leg_extension: {
    name: 'Extensión de cuádriceps', muscle: 'Cuádriceps', note: 'Evita dar impulso y controla la bajada.',
    alternatives: ['leg_press', 'goblet_squat']
  },
  leg_curl: {
    name: 'Curl femoral', muscle: 'Isquiotibiales', note: 'Mantén la cadera apoyada durante todo el movimiento.',
    alternatives: ['romanian_deadlift']
  },
  romanian_deadlift: {
    name: 'Peso muerto rumano con mancuernas', muscle: 'Isquiotibiales', note: 'Lleva la cadera atrás y mantén la espalda neutra.',
    alternatives: ['leg_curl']
  },
  chest_press: {
    name: 'Press de pecho en máquina', muscle: 'Pecho', note: 'Mantén los hombros abajo y empuja sin despegar la espalda.',
    alternatives: ['dumbbell_press', 'push_up']
  },
  dumbbell_press: {
    name: 'Press con mancuernas', muscle: 'Pecho', note: 'Baja las mancuernas con control y no choques arriba.',
    alternatives: ['chest_press', 'push_up']
  },
  push_up: {
    name: 'Flexiones', muscle: 'Pecho', note: 'Mantén el cuerpo alineado; apoya rodillas si lo necesitas.',
    alternatives: ['chest_press', 'dumbbell_press']
  },
  lat_pulldown: {
    name: 'Jalón al pecho', muscle: 'Espalda', note: 'Lleva la barra hacia la parte alta del pecho sin balancearte.',
    alternatives: ['seated_row', 'one_arm_row']
  },
  seated_row: {
    name: 'Remo sentado', muscle: 'Espalda', note: 'Tira con los codos y evita encoger los hombros.',
    alternatives: ['lat_pulldown', 'one_arm_row']
  },
  one_arm_row: {
    name: 'Remo con mancuerna', muscle: 'Espalda', note: 'Apoya bien el cuerpo y lleva el codo hacia atrás.',
    alternatives: ['seated_row', 'lat_pulldown']
  },
  shoulder_press: {
    name: 'Press de hombro en máquina', muscle: 'Hombros', note: 'No arquees la zona lumbar y controla la bajada.',
    alternatives: ['lateral_raise']
  },
  lateral_raise: {
    name: 'Elevaciones laterales', muscle: 'Hombros', note: 'Usa poco peso y sube sin impulso.',
    alternatives: ['shoulder_press']
  },
  biceps_curl: {
    name: 'Curl de bíceps con mancuernas', muscle: 'Bíceps', note: 'Mantén los codos pegados al cuerpo.',
    alternatives: ['cable_curl']
  },
  cable_curl: {
    name: 'Curl de bíceps en polea', muscle: 'Bíceps', note: 'Evita mover los hombros durante la repetición.',
    alternatives: ['biceps_curl']
  },
  triceps_pushdown: {
    name: 'Extensión de tríceps en polea', muscle: 'Tríceps', note: 'Fija los codos y extiende completamente sin impulso.',
    alternatives: ['bench_dip']
  },
  bench_dip: {
    name: 'Fondos asistidos en banco', muscle: 'Tríceps', note: 'Baja solo hasta una posición cómoda para los hombros.',
    alternatives: ['triceps_pushdown']
  },
  calf_raise: {
    name: 'Elevación de gemelos', muscle: 'Gemelos', note: 'Haz una pausa arriba y baja lentamente.',
    alternatives: []
  },
  plank: {
    name: 'Plancha', muscle: 'Core', note: 'Aprieta abdomen y glúteos sin hundir la espalda.',
    alternatives: ['dead_bug']
  },
  dead_bug: {
    name: 'Dead bug', muscle: 'Core', note: 'Mantén la zona lumbar pegada al suelo.',
    alternatives: ['plank']
  }
};

const planTemplates = {
  2: [
    { name: 'Cuerpo completo A', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
    { name: 'Cuerpo completo B', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] }
  ],
  3: [
    { name: 'Cuerpo completo A', exercises: ['leg_press', 'chest_press', 'lat_pulldown', 'leg_curl', 'lateral_raise', 'plank'] },
    { name: 'Cuerpo completo B', exercises: ['goblet_squat', 'seated_row', 'dumbbell_press', 'romanian_deadlift', 'biceps_curl', 'triceps_pushdown'] },
    { name: 'Cuerpo completo C', exercises: ['leg_extension', 'shoulder_press', 'one_arm_row', 'leg_curl', 'calf_raise', 'dead_bug'] }
  ],
  4: [
    { name: 'Torso A', exercises: ['chest_press', 'lat_pulldown', 'shoulder_press', 'seated_row', 'biceps_curl', 'triceps_pushdown'] },
    { name: 'Piernas A', exercises: ['leg_press', 'leg_curl', 'leg_extension', 'calf_raise', 'plank'] },
    { name: 'Torso B', exercises: ['dumbbell_press', 'one_arm_row', 'lateral_raise', 'lat_pulldown', 'cable_curl', 'bench_dip'] },
    { name: 'Piernas B', exercises: ['goblet_squat', 'romanian_deadlift', 'leg_extension', 'calf_raise', 'dead_bug'] }
  ]
};

const defaultState = {
  profile: null,
  plan: null,
  nextWorkoutIndex: 0,
  activeWorkout: null,
  history: [],
  createdAt: null
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : structuredClone(defaultState);
  } catch (error) {
    console.warn('No se pudo cargar el progreso:', error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  const toast = document.querySelector('#toastTemplate').content.firstElementChild.cloneNode(true);
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('[data-nav]').forEach((button) => {
    if (button.classList.contains('nav-item')) button.classList.toggle('active', button.dataset.nav === view);
  });

  const views = { home: renderHome, plan: renderPlan, workout: renderWorkout, progress: renderProgress };
  (views[view] || renderHome)();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  app.focus({ preventScroll: true });
}

function objectiveLabel(value) {
  return ({ muscle: 'Ganar fuerza y músculo', fitness: 'Ponerse en forma', fat: 'Mejorar condición física' })[value] || value;
}

function trainingRules(profile) {
  if (profile.objective === 'muscle') return { sets: 3, reps: '8–12', rest: '75–90 s' };
  if (profile.objective === 'fat') return { sets: 3, reps: '12–15', rest: '45–60 s' };
  return { sets: 3, reps: '10–12', rest: '60–75 s' };
}

function buildPlan(profile) {
  const rules = trainingRules(profile);
  const maxExercises = profile.minutes === 30 ? 5 : profile.minutes === 45 ? 6 : 7;
  const template = planTemplates[profile.days];

  return template.map((day, dayIndex) => ({
    id: `day-${dayIndex + 1}`,
    name: day.name,
    exercises: day.exercises.slice(0, maxExercises).map((exerciseId, index) => ({
      slotId: `${dayIndex}-${index}`,
      exerciseId,
      sets: exerciseId === 'plank' ? 3 : rules.sets,
      reps: exerciseId === 'plank' ? '20–35 s' : rules.reps,
      rest: rules.rest
    }))
  }));
}

function renderHome() {
  if (!state.profile) {
    app.innerHTML = `
      <section class="page">
        <div class="hero">
          <p class="eyebrow">Empieza con un plan sencillo</p>
          <h1>Tu primera rutina, paso a paso.</h1>
          <p>Responde tres preguntas y obtén una planificación inicial para el gimnasio. Sin cuenta, sin dietas y sin guardar datos en servidores.</p>
          <div class="hero-actions">
            <button class="button button-primary" type="button" id="startButton">Crear mi plan</button>
            <button class="button button-secondary" type="button" id="demoButton">Ver una demo</button>
          </div>
        </div>

        <section class="section">
          <div class="grid grid-3">
            <article class="card"><span class="pill">1</span><h3>Elige tu objetivo</h3><p class="muted small">Fuerza, forma física o mejorar tu condición.</p></article>
            <article class="card"><span class="pill">2</span><h3>Recibe tu rutina</h3><p class="muted small">Adaptada a tus días y tiempo disponibles.</p></article>
            <article class="card"><span class="pill">3</span><h3>Registra avances</h3><p class="muted small">Guarda pesos, repeticiones y sesiones.</p></article>
          </div>
        </section>

        <section class="section notice">
          My Fit Plan ofrece orientación general para adultos sanos y no sustituye a un médico, fisioterapeuta o entrenador cualificado. Si tienes dolor, una lesión o una enfermedad, consulta a un profesional antes de entrenar.
        </section>
      </section>`;

    document.querySelector('#startButton').addEventListener('click', renderQuestionnaire);
    document.querySelector('#demoButton').addEventListener('click', createDemoPlan);
    return;
  }

  const weeklyCompleted = sessionsThisWeek().length;
  const weeklyGoal = state.profile.days;
  const percentage = Math.min(100, Math.round((weeklyCompleted / weeklyGoal) * 100));
  const nextDay = state.plan[state.nextWorkoutIndex % state.plan.length];

  app.innerHTML = `
    <section class="page">
      <div class="hero">
        <p class="eyebrow">Tu siguiente paso</p>
        <h1>${esc(nextDay.name)}</h1>
        <p>${state.activeWorkout ? 'Tienes una sesión empezada. Continúa donde la dejaste.' : `Sesión de unos ${state.profile.minutes} minutos preparada para ti.`}</p>
        <div class="hero-actions">
          <button class="button button-primary" type="button" id="homeWorkoutButton">${state.activeWorkout ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}</button>
          <button class="button button-secondary" type="button" data-nav="plan">Ver plan</button>
        </div>
      </div>

      <section class="section">
        <div class="section-heading"><div><p class="eyebrow">Esta semana</p><h2>${weeklyCompleted} de ${weeklyGoal} sesiones</h2></div><strong>${percentage}%</strong></div>
        <div class="progress-track" aria-label="Progreso semanal"><div class="progress-bar" style="width:${percentage}%"></div></div>
      </section>

      <section class="section grid grid-3">
        <article class="card"><div class="metric">${state.history.length}</div><div class="metric-label">Entrenamientos</div></article>
        <article class="card"><div class="metric">${calculateStreak()}</div><div class="metric-label">Días de racha</div></article>
        <article class="card"><div class="metric">${state.profile.minutes}</div><div class="metric-label">Minutos por sesión</div></article>
      </section>

      <section class="section">
        <article class="card card-accent">
          <p class="eyebrow">Regla de progresión</p>
          <h2>Empieza con margen</h2>
          <p class="muted">Selecciona un peso que te permita completar las repeticiones con buena técnica y sentir que todavía podrías hacer 2 o 3 repeticiones más.</p>
        </article>
      </section>
    </section>`;

  document.querySelector('#homeWorkoutButton').addEventListener('click', () => setView('workout'));
  bindNavButtons();
}

function renderQuestionnaire() {
  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Configuración inicial</p>
      <h1>Crea tu plan</h1>
      <p class="muted">Esta primera versión está pensada para adultos principiantes que entrenan en un gimnasio.</p>

      <form id="planForm" class="card form-card form-grid">
        <fieldset class="fieldset">
          <legend>1. ¿Cuál es tu objetivo principal?</legend>
          <div class="option-grid">
            ${radioOption('objective', 'muscle', 'Fuerza y músculo', true)}
            ${radioOption('objective', 'fitness', 'Ponerme en forma')}
            ${radioOption('objective', 'fat', 'Mejorar condición')}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>2. ¿Cuántos días entrenarás?</legend>
          <div class="option-grid">
            ${radioOption('days', '2', '2 días')}
            ${radioOption('days', '3', '3 días', true)}
            ${radioOption('days', '4', '4 días')}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>3. ¿Cuánto tiempo tienes por sesión?</legend>
          <div class="option-grid">
            ${radioOption('minutes', '30', '30 minutos')}
            ${radioOption('minutes', '45', '45 minutos', true)}
            ${radioOption('minutes', '60', '60 minutos')}
          </div>
        </fieldset>

        <label class="option"><input id="safetyCheck" type="checkbox" required><span></span></label>
        <label for="safetyCheck" class="notice">Confirmo que soy mayor de 18 años y que consultaré con un profesional si tengo una lesión, dolor o problema de salud.</label>

        <button class="button button-primary button-block" type="submit">Generar mi rutina</button>
      </form>
    </section>`;

  document.querySelector('#planForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const profile = {
      objective: formData.get('objective'),
      days: Number(formData.get('days')),
      minutes: Number(formData.get('minutes')),
      level: 'beginner',
      location: 'gym'
    };
    state = {
      ...structuredClone(defaultState),
      profile,
      plan: buildPlan(profile),
      createdAt: new Date().toISOString()
    };
    saveState();
    showToast('Tu plan ya está preparado.');
    setView('plan');
  });
}

function radioOption(name, value, label, checked = false) {
  return `<div class="option"><input id="${name}-${value}" type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} required><label for="${name}-${value}">${label}</label></div>`;
}

function createDemoPlan() {
  const profile = { objective: 'fitness', days: 3, minutes: 45, level: 'beginner', location: 'gym' };
  state = { ...structuredClone(defaultState), profile, plan: buildPlan(profile), createdAt: new Date().toISOString() };
  saveState();
  setView('plan');
  showToast('Demo creada. Puedes modificarla reiniciando tus datos.');
}

function renderPlan() {
  if (!state.plan) return renderLockedView('Aún no tienes un plan.', 'Crea tu primera rutina para ver esta sección.');

  const daysHtml = state.plan.map((day, index) => `
    <article class="card plan-day">
      <div class="card-header">
        <div><span class="pill">Día ${index + 1}</span><h2>${esc(day.name)}</h2></div>
        ${index === state.nextWorkoutIndex % state.plan.length ? '<span class="pill pill-success">Siguiente</span>' : ''}
      </div>
      <div>
        ${day.exercises.map((item) => {
          const exercise = exerciseLibrary[item.exerciseId];
          return `<div class="plan-exercise"><div><strong>${esc(exercise.name)}</strong><br><small>${esc(exercise.muscle)}</small></div><small>${item.sets} × ${esc(item.reps)}</small></div>`;
        }).join('')}
      </div>
    </article>`).join('');

  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Plan de iniciación</p>
      <h1>${state.profile.days} días · ${state.profile.minutes} minutos</h1>
      <p class="muted">Objetivo: ${esc(objectiveLabel(state.profile.objective))}. Alterna los días en orden y deja descanso cuando lo necesites.</p>
      <div class="grid section">${daysHtml}</div>
      <section class="section notice">Las series y repeticiones son una guía inicial. Prioriza siempre una técnica cómoda y detén el ejercicio si aparece dolor.</section>
      <section class="section"><button class="button button-primary button-block" type="button" id="planWorkoutButton">Ir al entrenamiento</button></section>
    </section>`;

  document.querySelector('#planWorkoutButton').addEventListener('click', () => setView('workout'));
}

function createActiveWorkout() {
  const dayIndex = state.nextWorkoutIndex % state.plan.length;
  const planDay = state.plan[dayIndex];
  state.activeWorkout = {
    id: `session-${Date.now()}`,
    planDayIndex: dayIndex,
    name: planDay.name,
    startedAt: new Date().toISOString(),
    exercises: planDay.exercises.map((item) => ({ ...item, completed: false, weight: '', actualReps: '' }))
  };
  saveState();
}

function renderWorkout() {
  if (!state.plan) return renderLockedView('Primero necesitas una rutina.', 'Crea tu plan antes de iniciar un entrenamiento.');
  if (!state.activeWorkout) createActiveWorkout();

  const workout = state.activeWorkout;
  const completed = workout.exercises.filter((item) => item.completed).length;
  const percentage = Math.round((completed / workout.exercises.length) * 100);

  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Entrenamiento en curso</p>
      <h1>${esc(workout.name)}</h1>
      <div class="section-heading"><p class="muted">${completed} de ${workout.exercises.length} ejercicios</p><strong>${percentage}%</strong></div>
      <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>

      <div class="workout-list section">
        ${workout.exercises.map((item, index) => exerciseCard(item, index)).join('')}
      </div>

      <section class="section grid grid-2">
        <button class="button button-secondary" type="button" id="pauseWorkoutButton">Guardar y salir</button>
        <button class="button button-primary" type="button" id="finishWorkoutButton" ${completed === 0 ? 'disabled' : ''}>Finalizar sesión</button>
      </section>
    </section>`;

  document.querySelectorAll('[data-complete]').forEach((button) => button.addEventListener('click', toggleExercise));
  document.querySelectorAll('[data-swap]').forEach((button) => button.addEventListener('click', swapExercise));
  document.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('change', updateExerciseField));
  document.querySelector('#pauseWorkoutButton').addEventListener('click', () => { saveState(); setView('home'); showToast('Entrenamiento guardado.'); });
  document.querySelector('#finishWorkoutButton').addEventListener('click', finishWorkout);
}

function exerciseCard(item, index) {
  const exercise = exerciseLibrary[item.exerciseId];
  return `
    <article class="card exercise-card ${item.completed ? 'completed' : ''}">
      <div class="exercise-title">
        <div><span class="pill">${index + 1}</span><h3>${esc(exercise.name)}</h3></div>
        ${item.completed ? '<span class="pill pill-success">Hecho</span>' : ''}
      </div>
      <div class="exercise-meta"><span class="pill">${item.sets} series</span><span class="pill">${esc(item.reps)} reps</span><span class="pill">${esc(item.rest)}</span></div>
      <p class="exercise-note">${esc(exercise.note)}</p>
      <div class="exercise-controls">
        <label>Peso usado (kg)<input inputmode="decimal" type="number" min="0" step="0.5" value="${esc(item.weight)}" data-field="weight" data-index="${index}" placeholder="Ej. 20"></label>
        <label>Reps logradas<input inputmode="numeric" type="number" min="0" step="1" value="${esc(item.actualReps)}" data-field="actualReps" data-index="${index}" placeholder="Ej. 10"></label>
      </div>
      <div class="exercise-actions">
        <button class="button button-primary check-button ${item.completed ? 'completed' : ''}" type="button" data-complete="${index}">${item.completed ? 'Desmarcar' : 'Marcar completado'}</button>
        <button class="button button-secondary" type="button" data-swap="${index}" ${exercise.alternatives.length ? '' : 'disabled'}>Máquina ocupada</button>
      </div>
    </article>`;
}

function updateExerciseField(event) {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  state.activeWorkout.exercises[index][field] = event.target.value;
  saveState();
}

function toggleExercise(event) {
  const index = Number(event.currentTarget.dataset.complete);
  state.activeWorkout.exercises[index].completed = !state.activeWorkout.exercises[index].completed;
  saveState();
  renderWorkout();
}

function swapExercise(event) {
  const index = Number(event.currentTarget.dataset.swap);
  const current = state.activeWorkout.exercises[index];
  const alternatives = exerciseLibrary[current.exerciseId].alternatives;
  if (!alternatives.length) return;
  const nextId = alternatives.find((id) => id !== current.exerciseId) || alternatives[0];
  current.exerciseId = nextId;
  current.completed = false;
  current.weight = '';
  current.actualReps = '';
  saveState();
  renderWorkout();
  showToast(`Ejercicio cambiado por ${exerciseLibrary[nextId].name}.`);
}

function finishWorkout() {
  const workout = state.activeWorkout;
  const completedExercises = workout.exercises.filter((item) => item.completed);
  const session = {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    finishedAt: new Date().toISOString(),
    completedCount: completedExercises.length,
    totalCount: workout.exercises.length,
    exercises: completedExercises.map((item) => ({
      exerciseId: item.exerciseId,
      weight: item.weight,
      actualReps: item.actualReps
    }))
  };

  state.history.unshift(session);
  state.nextWorkoutIndex = (state.nextWorkoutIndex + 1) % state.plan.length;
  state.activeWorkout = null;
  saveState();
  showToast('Entrenamiento registrado. Buen trabajo.');
  setView('progress');
}

function sessionsThisWeek() {
  const now = new Date();
  const start = new Date(now);
  const day = (now.getDay() + 6) % 7;
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return state.history.filter((session) => new Date(session.finishedAt) >= start);
}

function calculateStreak() {
  if (!state.history.length) return 0;
  const dates = [...new Set(state.history.map((session) => new Date(session.finishedAt).toISOString().slice(0, 10)))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const latest = new Date(`${dates[0]}T00:00:00`);
  const differenceDays = Math.round((cursor - latest) / 86400000);
  if (differenceDays > 1) return 0;
  if (differenceDays === 1) cursor = latest;

  for (const dateString of dates) {
    const date = new Date(`${dateString}T00:00:00`);
    if (date.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (date < cursor) break;
  }
  return streak;
}

function renderProgress() {
  if (!state.profile) return renderLockedView('Todavía no hay progreso.', 'Crea un plan y completa tu primera sesión.');

  const totalExercises = state.history.reduce((sum, session) => sum + session.completedCount, 0);
  const weeklyCompleted = sessionsThisWeek().length;
  const percentage = Math.min(100, Math.round((weeklyCompleted / state.profile.days) * 100));
  const historyHtml = state.history.length ? state.history.slice(0, 10).map((session) => `
    <div class="history-item">
      <div><strong>${esc(session.name)}</strong><br><small class="muted">${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(session.finishedAt))}</small></div>
      <span class="pill pill-success">${session.completedCount}/${session.totalCount}</span>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">↗</div><h3>Aún no hay sesiones</h3><p class="muted">Tu historial aparecerá cuando finalices el primer entrenamiento.</p></div>';

  app.innerHTML = `
    <section class="page">
      <p class="eyebrow">Tus avances</p>
      <h1>Progreso</h1>
      <div class="grid grid-3 section">
        <article class="card"><div class="metric">${state.history.length}</div><div class="metric-label">Sesiones</div></article>
        <article class="card"><div class="metric">${totalExercises}</div><div class="metric-label">Ejercicios</div></article>
        <article class="card"><div class="metric">${calculateStreak()}</div><div class="metric-label">Días de racha</div></article>
      </div>

      <section class="section card card-accent">
        <div class="section-heading"><div><p class="eyebrow">Objetivo semanal</p><h2>${weeklyCompleted} de ${state.profile.days}</h2></div><strong>${percentage}%</strong></div>
        <div class="progress-track"><div class="progress-bar" style="width:${percentage}%"></div></div>
      </section>

      <section class="section card">
        <div class="card-header"><div><p class="eyebrow">Últimas sesiones</p><h2>Historial</h2></div></div>
        ${historyHtml}
      </section>

      <section class="section">
        <button class="button button-danger button-block" type="button" id="resetButton">Borrar todos mis datos</button>
      </section>
    </section>`;

  document.querySelector('#resetButton').addEventListener('click', resetData);
}

function resetData() {
  const confirmed = window.confirm('Se borrarán tu plan, registros y progreso de este dispositivo. ¿Continuar?');
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  showToast('Datos borrados.');
  setView('home');
}

function renderLockedView(title, description) {
  app.innerHTML = `
    <section class="page empty-state card">
      <div class="empty-icon">+</div>
      <h1>${esc(title)}</h1>
      <p class="muted">${esc(description)}</p>
      <button class="button button-primary" type="button" id="lockedStartButton">Crear mi plan</button>
    </section>`;
  document.querySelector('#lockedStartButton').addEventListener('click', renderQuestionnaire);
}

function bindNavButtons() {
  document.querySelectorAll('#app [data-nav]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.nav)));
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('.bottom-nav [data-nav], .topbar [data-nav]');
  if (button) setView(button.dataset.nav);
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  showToast('My Fit Plan se ha instalado.');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => console.warn('Service worker no registrado:', error));
  });
}

setView('home');
