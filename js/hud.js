
'use strict';

const ICONS = {
  home: '<path d="M3 10.7 12 3l9 7.7v9.1A1.2 1.2 0 0 1 19.8 21h-5.1v-6.2H9.3V21H4.2A1.2 1.2 0 0 1 3 19.8z"/>',
  plan: '<path d="M7 4h13M7 10h13M7 16h9"/><circle cx="3.5" cy="4" r="1"/><circle cx="3.5" cy="10" r="1"/><circle cx="3.5" cy="16" r="1"/>',
  train: '<path d="M8 7v10M16 7v10M5 9v6M19 9v6M8 12h8"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M7 14h2M12 14h2M17 14h.1M7 18h2M12 18h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  spark: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 4h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  refresh: '<path d="M20 7v5h-5"/><path d="M18.4 16A8 8 0 1 1 19 8l1 4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  updown: '<path d="m8 4-3 3 3 3M5 7h10a4 4 0 0 1 4 4v1M16 20l3-3-3-3M19 17H9a4 4 0 0 1-4-4v-1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5V2M12 9v4l3 2"/>',
  heart: '<path d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.8a5.4 5.4 0 0 0 0-7.6z"/>',
  scale: '<path d="M5 5h14l2 16H3z"/><path d="M8 10a4 4 0 0 1 8 0M12 10l2-2"/>',
  photo: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 3 3 3-3 5 5"/>',
  folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
  warning: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/>',
  wifi: '<path d="M5 10a10 10 0 0 1 14 0M8 13a6 6 0 0 1 8 0M11 16a2 2 0 0 1 2 0"/><circle cx="12" cy="19" r="1"/>',
  offline: '<path d="M5 10a10 10 0 0 1 14 0M8 13a6 6 0 0 1 8 0M11 16a2 2 0 0 1 2 0"/><circle cx="12" cy="19" r="1"/><path d="M3 3l18 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7z"/>',
  save: '<path d="M4 4h14l2 2v14H4z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>'
};

export function hudIcon(name, className = '') {
  const content = ICONS[name] || ICONS.info;
  return `<svg class="hud-svg ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${content}</svg>`;
}

const ACTION_ICONS = {
  'start-questionnaire': 'spark', 'onboarding-start': 'spark', 'onboarding-next': 'arrow',
  'demo-plan': 'play', 'home-workout': 'play', 'training-routine-direct': 'play', 'training-mfp': 'spark', 'training-custom': 'plus',
  'training-refresh-recommended': 'refresh',
  'custom-session-add': 'plus', 'custom-session-cancel': 'close', 'create-folder': 'folder', 'create-routine': 'plus', 'add-day': 'plus',
  'picker-plan-add': 'plus', 'picker-plan-replace': 'refresh', 'picker-workout-add': 'plus', 'picker-workout-replace': 'refresh',
  'start-specific-day': 'play', 'finish-workout': 'check', 'save-exit-workout': 'save', 'cancel-workout': 'close',
  'add-set': 'plus', 'manual-rest': 'timer', 'remove-set': 'trash', 'remove-workout-exercise': 'trash',
  'progression-dashboard': 'chart', 'progression-details': 'chart', 'apply-progression-target': 'check',
  'planner-settings': 'settings', 'planner-smart-replan': 'spark', 'planner-start': 'play', 'planner-move': 'calendar', 'planner-skip': 'close',
  'quick-weight': 'scale', 'body-progress-home': 'photo', 'body-progress-new': 'photo', 'body-progress-compare': 'copy',
  'create-folder': 'folder', 'rename-folder': 'edit', 'delete-folder': 'trash', 'rename-routine': 'edit', 'duplicate-routine': 'copy', 'delete-routine': 'trash',
  'rename-day': 'edit', 'delete-day': 'trash', 'restore-plan': 'refresh',
  'exercise-details': 'info', 'library-more': 'plus', 'toggle-favorite': 'heart', 'library-add-plan': 'plus', 'library-add-workout': 'plus',
  'custom-new': 'plus', 'custom-edit': 'edit', 'history-detail': 'history', 'go-history': 'history',
  'export-backup': 'download', 'reset-data': 'trash', 'apply-deload': 'check', 'deload-details': 'info',
  'hud-control': 'shield', 'hud-run-diagnostics': 'shield', 'hud-export-diagnostics': 'download', 'hud-repair-data': 'refresh', 'hud-force-update': 'refresh', 'hud-open-settings': 'settings'
};

const TEXT_ICONS = [
  [/guardar|aplicar|confirmar|terminar|finalizar/i, 'check'],
  [/entrenar|empezar|iniciar|preparar/i, 'play'],
  [/añadir|crear|nuevo|registrar/i, 'plus'],
  [/configurar|ajustes/i, 'settings'],
  [/historial/i, 'history'],
  [/calendario|semana/i, 'calendar'],
  [/exportar|descargar/i, 'download'],
  [/buscar|biblioteca/i, 'search'],
  [/editar|renombrar/i, 'edit'],
  [/eliminar|borrar|quitar/i, 'trash'],
  [/cerrar|cancelar|omitir/i, 'close'],
  [/restaurar|actualizar|cambiar|reorganizar/i, 'refresh'],
  [/análisis|progresión|tendencia/i, 'chart']
];

function inferIcon(button) {
  const action = button.dataset.action || '';
  if (ACTION_ICONS[action]) return ACTION_ICONS[action];
  const nav = button.dataset.navLocal || button.dataset.nav || '';
  if (nav === 'home') return 'home';
  if (nav === 'plan' || nav === 'calendar') return nav === 'calendar' ? 'calendar' : 'plan';
  if (nav === 'workout') return 'train';
  if (nav === 'library') return 'search';
  if (nav === 'profile') return 'user';
  const text = button.textContent.trim();
  return TEXT_ICONS.find(([pattern]) => pattern.test(text))?.[1] || '';
}

export function decorateInteractiveElements(root = document) {
  const buttons = root.querySelectorAll('button.button, button.command-add-button, button.progression-detail-button, button.accordion-all-button');
  buttons.forEach((button) => {
    if (button.dataset.hudDecorated === 'true') return;
    if (button.classList.contains('modal-close') || button.querySelector(':scope > .hud-button-icon')) return;
    const iconName = inferIcon(button);
    if (!iconName) return;
    const icon = document.createElement('span');
    icon.className = 'hud-button-icon';
    icon.innerHTML = hudIcon(iconName);
    button.prepend(icon);
    button.dataset.hudDecorated = 'true';
  });

  root.querySelectorAll('button').forEach((button) => {
    if (button.disabled) button.setAttribute('aria-disabled', 'true');
    if (!button.getAttribute('aria-label') && !button.textContent.trim()) button.setAttribute('aria-label', 'Acción');
  });
}

export function pageHudMeta(view, state = {}) {
  const active = state.activeWorkout;
  const map = {
    home: ['Panel de control', 'Resumen de entrenamiento y progreso'],
    plan: ['Rutinas', 'Planificación, carpetas y ejercicios'],
    calendar: ['Calendario inteligente', 'Agenda semanal y recuperación de sesiones'],
    workout: active ? ['Entrenamiento en curso', active.name || 'Sesión activa'] : ['Centro de entrenamiento', 'Rutina, My Fit Plan o sesión personalizada'],
    library: ['Biblioteca técnica', 'Ejercicios, técnica y sustituciones'],
    profile: ['Progreso y perfil', 'Historial, cuerpo, privacidad y ajustes']
  };
  const [title, subtitle] = map[view] || map.home;
  return { title, subtitle, eyebrow: active ? 'MY FIT PLAN · LIVE' : 'MY FIT PLAN · CONTROL' };
}


let adaptiveHudBound = false;
let adaptiveHudFrame = 0;

function hudViewportMetrics() {
  const values = [
    window.innerWidth,
    window.visualViewport?.width,
    document.documentElement.clientWidth
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const width = values.length ? Math.min(...values) : 1024;
  const height = Number(window.visualViewport?.height || window.innerHeight || 768);
  const screenWidth = Number(window.screen?.width || width);
  const screenHeight = Number(window.screen?.height || height);
  const shortSide = Math.min(screenWidth, screenHeight);
  const touch = Number(navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  const phone = touch && shortSide <= 600;
  const keyboardOpen = touch
    && document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]')
    && window.visualViewport
    && window.visualViewport.height < window.innerHeight * 0.74;

  return {
    width,
    height,
    shortSide,
    touch,
    phone,
    keyboardOpen,
    orientation: width > height ? 'landscape' : 'portrait'
  };
}

export function getHudLayoutSnapshot() {
  const metrics = hudViewportMetrics();
  const mode = metrics.phone || metrics.width <= 820
    ? 'mobile'
    : metrics.width <= 1180
      ? 'compact'
      : 'desktop';
  const rail = document.querySelector('#desktopRail, .desktop-rail');
  const dock = document.querySelector('#mobileDock, .bottom-nav');
  const stage = document.querySelector('.app-stage');
  const styleVisible = (node) => Boolean(node)
    && getComputedStyle(node).display !== 'none'
    && getComputedStyle(node).visibility !== 'hidden';

  return {
    ...metrics,
    mode,
    railVisible: styleVisible(rail),
    dockVisible: styleVisible(dock),
    documentWidth: document.documentElement.scrollWidth,
    stageWidth: stage?.getBoundingClientRect?.().width || 0
  };
}

export function syncAdaptiveHudMode() {
  window.cancelAnimationFrame(adaptiveHudFrame);
  adaptiveHudFrame = window.requestAnimationFrame(() => {
    const snapshot = getHudLayoutSnapshot();
    const root = document.documentElement;
    root.dataset.hudMode = snapshot.mode;
    root.dataset.hudOrientation = snapshot.orientation;
    root.style.setProperty('--mfp-viewport-width', `${Math.round(snapshot.width)}px`);
    root.style.setProperty('--mfp-viewport-height', `${Math.round(snapshot.height)}px`);
    document.body?.classList.toggle('hud-keyboard-open', snapshot.keyboardOpen);
    document.body?.classList.toggle('hud-touch-device', snapshot.touch);
  });
}

export function initAdaptiveHud() {
  if (adaptiveHudBound) {
    syncAdaptiveHudMode();
    return;
  }
  adaptiveHudBound = true;
  syncAdaptiveHudMode();

  const sync = () => syncAdaptiveHudMode();
  window.addEventListener('resize', sync, { passive: true });
  window.addEventListener('orientationchange', sync, { passive: true });
  window.addEventListener('pageshow', sync, { passive: true });
  window.visualViewport?.addEventListener('resize', sync, { passive: true });
  window.visualViewport?.addEventListener('scroll', sync, { passive: true });
  document.addEventListener('focusin', sync, true);
  document.addEventListener('focusout', () => window.setTimeout(sync, 80), true);

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(sync);
    observer.observe(document.documentElement);
  }
}
