'use strict';

import { esc, normalizeText } from './utils.js?v=40';

const PRIMARY = '#ef4444';
const SECONDARY = '#fb923c';
const NEUTRAL = '#cbd5e1';
const OUTLINE = '#475569';

const regionTerms = {
  chest: ['pecho', 'pectoral'],
  back: ['espalda', 'dorsal', 'trapecio', 'erector', 'columna', 'lumbar'],
  shoulders: ['hombro', 'deltoid', 'manguito'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['antebrazo', 'agarre', 'muneca'],
  core: ['core', 'abdominal', 'oblicuo', 'serrato'],
  glutes: ['gluteo', 'cadera'],
  quads: ['cuadriceps'],
  hamstrings: ['isquiotibial', 'femoral'],
  adductors: ['aductor'],
  calves: ['gemelo', 'soleo', 'tibial', 'pantorrilla'],
  full: ['cuerpo completo', 'cardio']
};

function muscleText(list = []) {
  return normalizeText((Array.isArray(list) ? list : [list]).join(' '));
}

function regionTone(exercise, region) {
  const primary = muscleText(exercise.primaryMuscles || [exercise.muscle]);
  const secondary = muscleText(exercise.secondaryMuscles || []);
  const terms = regionTerms[region] || [];
  if (terms.some((term) => primary.includes(normalizeText(term)))) return PRIMARY;
  if (terms.some((term) => secondary.includes(normalizeText(term)))) return SECONDARY;
  if (primary.includes('cuerpo completo') || primary.includes('cardio')) return SECONDARY;
  return NEUTRAL;
}

function movementPose(type = 'full_body') {
  const stroke = `stroke="${OUTLINE}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const weight = `<circle cx="24" cy="53" r="4" fill="#64748b"/><circle cx="76" cy="53" r="4" fill="#64748b"/>`;
  const poses = {
    press_horizontal: `<line x1="18" y1="72" x2="82" y2="72" ${stroke}/><circle cx="32" cy="56" r="7" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="38" y1="59" x2="62" y2="67" ${stroke}/><line x1="47" y1="62" x2="35" y2="44" ${stroke}/><line x1="47" y1="62" x2="59" y2="44" ${stroke}/><line x1="35" y1="44" x2="25" y2="48" ${stroke}/><line x1="59" y1="44" x2="73" y2="48" ${stroke}/>${weight}`,
    press_vertical: `<circle cx="50" cy="20" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="28" x2="50" y2="58" ${stroke}/><line x1="50" y1="36" x2="33" y2="18" ${stroke}/><line x1="50" y1="36" x2="67" y2="18" ${stroke}/><circle cx="30" cy="15" r="4" fill="#64748b"/><circle cx="70" cy="15" r="4" fill="#64748b"/><line x1="50" y1="58" x2="38" y2="82" ${stroke}/><line x1="50" y1="58" x2="62" y2="82" ${stroke}/>` ,
    row: `<circle cx="34" cy="24" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="39" y1="30" x2="58" y2="48" ${stroke}/><line x1="58" y1="48" x2="72" y2="40" ${stroke}/><line x1="58" y1="48" x2="72" y2="58" ${stroke}/><circle cx="78" cy="39" r="4" fill="#64748b"/><circle cx="78" cy="59" r="4" fill="#64748b"/><line x1="52" y1="45" x2="38" y2="76" ${stroke}/><line x1="58" y1="49" x2="62" y2="79" ${stroke}/>` ,
    pull_vertical: `<circle cx="50" cy="28" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="36" x2="50" y2="65" ${stroke}/><line x1="50" y1="43" x2="30" y2="25" ${stroke}/><line x1="50" y1="43" x2="70" y2="25" ${stroke}/><line x1="22" y1="16" x2="78" y2="16" ${stroke}/><line x1="50" y1="65" x2="40" y2="84" ${stroke}/><line x1="50" y1="65" x2="60" y2="84" ${stroke}/>` ,
    squat: `<circle cx="50" cy="18" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="26" x2="48" y2="53" ${stroke}/><line x1="48" y1="53" x2="32" y2="67" ${stroke}/><line x1="48" y1="53" x2="68" y2="67" ${stroke}/><line x1="32" y1="67" x2="38" y2="84" ${stroke}/><line x1="68" y1="67" x2="62" y2="84" ${stroke}/><line x1="35" y1="36" x2="65" y2="36" ${stroke}/><circle cx="31" cy="36" r="4" fill="#64748b"/><circle cx="69" cy="36" r="4" fill="#64748b"/>` ,
    lunge: `<circle cx="45" cy="17" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="45" y1="25" x2="47" y2="53" ${stroke}/><line x1="47" y1="53" x2="26" y2="68" ${stroke}/><line x1="47" y1="53" x2="68" y2="67" ${stroke}/><line x1="26" y1="68" x2="18" y2="84" ${stroke}/><line x1="68" y1="67" x2="78" y2="82" ${stroke}/><line x1="31" y1="37" x2="61" y2="37" ${stroke}/>` ,
    hinge: `<circle cx="36" cy="25" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="41" y1="31" x2="64" y2="49" ${stroke}/><line x1="64" y1="49" x2="56" y2="78" ${stroke}/><line x1="64" y1="49" x2="76" y2="78" ${stroke}/><line x1="51" y1="40" x2="35" y2="58" ${stroke}/><line x1="56" y1="44" x2="73" y2="59" ${stroke}/><circle cx="31" cy="62" r="4" fill="#64748b"/><circle cx="77" cy="63" r="4" fill="#64748b"/>` ,
    curl: `<circle cx="50" cy="18" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="26" x2="50" y2="59" ${stroke}/><line x1="50" y1="38" x2="34" y2="51" ${stroke}/><line x1="50" y1="38" x2="66" y2="51" ${stroke}/><line x1="34" y1="51" x2="27" y2="38" ${stroke}/><line x1="66" y1="51" x2="73" y2="38" ${stroke}/><circle cx="25" cy="34" r="4" fill="#64748b"/><circle cx="75" cy="34" r="4" fill="#64748b"/><line x1="50" y1="59" x2="39" y2="84" ${stroke}/><line x1="50" y1="59" x2="61" y2="84" ${stroke}/>` ,
    triceps_extension: `<circle cx="50" cy="18" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="26" x2="50" y2="60" ${stroke}/><line x1="50" y1="35" x2="36" y2="25" ${stroke}/><line x1="50" y1="35" x2="64" y2="25" ${stroke}/><line x1="36" y1="25" x2="42" y2="8" ${stroke}/><line x1="64" y1="25" x2="58" y2="8" ${stroke}/><circle cx="42" cy="6" r="4" fill="#64748b"/><circle cx="58" cy="6" r="4" fill="#64748b"/><line x1="50" y1="60" x2="39" y2="84" ${stroke}/><line x1="50" y1="60" x2="61" y2="84" ${stroke}/>` ,
    raise: `<circle cx="50" cy="20" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="28" x2="50" y2="61" ${stroke}/><line x1="50" y1="38" x2="22" y2="38" ${stroke}/><line x1="50" y1="38" x2="78" y2="38" ${stroke}/><circle cx="18" cy="38" r="4" fill="#64748b"/><circle cx="82" cy="38" r="4" fill="#64748b"/><line x1="50" y1="61" x2="39" y2="84" ${stroke}/><line x1="50" y1="61" x2="61" y2="84" ${stroke}/>` ,
    fly: `<circle cx="50" cy="20" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="28" x2="50" y2="61" ${stroke}/><path d="M50 38 Q35 25 20 38" ${stroke}/><path d="M50 38 Q65 25 80 38" ${stroke}/><circle cx="17" cy="39" r="4" fill="#64748b"/><circle cx="83" cy="39" r="4" fill="#64748b"/><line x1="50" y1="61" x2="39" y2="84" ${stroke}/><line x1="50" y1="61" x2="61" y2="84" ${stroke}/>` ,
    core_flexion: `<circle cx="34" cy="55" r="7" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><path d="M40 55 Q54 45 62 60" ${stroke}/><line x1="62" y1="60" x2="77" y2="75" ${stroke}/><line x1="62" y1="60" x2="55" y2="80" ${stroke}/><line x1="16" y1="82" x2="86" y2="82" ${stroke}/>` ,
    core_rotation: `<circle cx="50" cy="18" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="26" x2="50" y2="61" ${stroke}/><line x1="50" y1="38" x2="24" y2="48" ${stroke}/><line x1="50" y1="38" x2="70" y2="25" ${stroke}/><circle cx="20" cy="50" r="4" fill="#64748b"/><line x1="50" y1="61" x2="39" y2="84" ${stroke}/><line x1="50" y1="61" x2="61" y2="84" ${stroke}/>` ,
    core_anti_extension: `<circle cx="28" cy="45" r="7" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="35" y1="48" x2="67" y2="55" ${stroke}/><line x1="67" y1="55" x2="82" y2="72" ${stroke}/><line x1="39" y1="49" x2="26" y2="69" ${stroke}/><line x1="67" y1="55" x2="61" y2="78" ${stroke}/>` ,
    core_anti_rotation: `<circle cx="50" cy="18" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="26" x2="50" y2="61" ${stroke}/><line x1="50" y1="38" x2="78" y2="38" ${stroke}/><circle cx="83" cy="38" r="4" fill="#64748b"/><line x1="50" y1="61" x2="39" y2="84" ${stroke}/><line x1="50" y1="61" x2="61" y2="84" ${stroke}/><line x1="88" y1="18" x2="88" y2="70" stroke="#f97316" stroke-width="2" stroke-dasharray="4 4"/>` ,
    core_lateral: `<circle cx="26" cy="45" r="7" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="33" y1="48" x2="67" y2="58" ${stroke}/><line x1="67" y1="58" x2="84" y2="68" ${stroke}/><line x1="35" y1="49" x2="25" y2="72" ${stroke}/><line x1="67" y1="58" x2="60" y2="78" ${stroke}/>` ,
    core_extension: `<circle cx="30" cy="50" r="7" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><path d="M37 52 Q54 35 69 50" ${stroke}/><line x1="69" y1="50" x2="84" y2="63" ${stroke}/><line x1="45" y1="45" x2="31" y2="29" ${stroke}/>` ,
    carry: `<circle cx="50" cy="18" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="26" x2="50" y2="60" ${stroke}/><line x1="50" y1="37" x2="31" y2="58" ${stroke}/><line x1="50" y1="37" x2="69" y2="58" ${stroke}/><circle cx="27" cy="63" r="6" fill="#64748b"/><circle cx="73" cy="63" r="6" fill="#64748b"/><line x1="50" y1="60" x2="39" y2="84" ${stroke}/><line x1="50" y1="60" x2="61" y2="84" ${stroke}/>` ,
    cardio: `<circle cx="52" cy="16" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="24" x2="43" y2="49" ${stroke}/><line x1="44" y1="34" x2="25" y2="43" ${stroke}/><line x1="45" y1="35" x2="63" y2="45" ${stroke}/><line x1="43" y1="49" x2="24" y2="75" ${stroke}/><line x1="43" y1="49" x2="70" y2="71" ${stroke}/><path d="M12 82 H88" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` ,
    mobility: `<circle cx="50" cy="17" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><path d="M50 25 Q37 42 49 58" ${stroke}/><line x1="44" y1="36" x2="24" y2="25" ${stroke}/><line x1="44" y1="36" x2="69" y2="28" ${stroke}/><line x1="49" y1="58" x2="29" y2="80" ${stroke}/><line x1="49" y1="58" x2="71" y2="80" ${stroke}/>` ,
    full_body: `<circle cx="50" cy="15" r="7" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="23" x2="50" y2="55" ${stroke}/><line x1="50" y1="32" x2="26" y2="16" ${stroke}/><line x1="50" y1="32" x2="74" y2="16" ${stroke}/><line x1="50" y1="55" x2="30" y2="80" ${stroke}/><line x1="50" y1="55" x2="70" y2="80" ${stroke}/><circle cx="23" cy="13" r="4" fill="#64748b"/><circle cx="77" cy="13" r="4" fill="#64748b"/>` ,
    plyometric: `<circle cx="50" cy="17" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="50" y1="25" x2="50" y2="52" ${stroke}/><line x1="50" y1="34" x2="29" y2="20" ${stroke}/><line x1="50" y1="34" x2="71" y2="20" ${stroke}/><line x1="50" y1="52" x2="31" y2="69" ${stroke}/><line x1="50" y1="52" x2="69" y2="69" ${stroke}/><path d="M20 83 H80" stroke="#f97316" stroke-width="3" stroke-dasharray="5 5"/>` ,
    wrist: `<circle cx="47" cy="19" r="8" fill="#f8fafc" stroke="${OUTLINE}" stroke-width="3"/><line x1="47" y1="27" x2="47" y2="58" ${stroke}/><line x1="47" y1="36" x2="70" y2="52" ${stroke}/><line x1="70" y1="52" x2="79" y2="40" ${stroke}/><circle cx="82" cy="37" r="4" fill="#64748b"/><line x1="47" y1="58" x2="37" y2="84" ${stroke}/><line x1="47" y1="58" x2="58" y2="84" ${stroke}/>`
  };
  return poses[type] || poses.full_body;
}

function bodyMap(exercise) {
  const c = (region) => regionTone(exercise, region);
  return `<svg class="body-map-svg" viewBox="0 0 150 100" role="img" aria-label="Mapa de músculos trabajados">
    <g transform="translate(8,2)">
      <circle cx="31" cy="10" r="7" fill="${NEUTRAL}"/>
      <path d="M22 19 Q31 15 40 19 L43 47 Q36 55 31 55 Q26 55 19 47Z" fill="${NEUTRAL}"/>
      <ellipse cx="20" cy="25" rx="6" ry="7" fill="${c('shoulders')}"/><ellipse cx="42" cy="25" rx="6" ry="7" fill="${c('shoulders')}"/>
      <rect x="14" y="29" width="7" height="20" rx="4" fill="${c('biceps')}"/><rect x="41" y="29" width="7" height="20" rx="4" fill="${c('biceps')}"/>
      <rect x="12" y="48" width="7" height="19" rx="4" fill="${c('forearms')}"/><rect x="43" y="48" width="7" height="19" rx="4" fill="${c('forearms')}"/>
      <path d="M23 21 H39 V35 Q31 41 23 35Z" fill="${c('chest')}"/>
      <rect x="25" y="36" width="12" height="18" rx="4" fill="${c('core')}"/>
      <rect x="21" y="54" width="10" height="24" rx="5" fill="${c('quads')}"/><rect x="32" y="54" width="10" height="24" rx="5" fill="${c('quads')}"/>
      <rect x="22" y="77" width="8" height="18" rx="4" fill="${c('calves')}"/><rect x="33" y="77" width="8" height="18" rx="4" fill="${c('calves')}"/>
    </g>
    <g transform="translate(78,2)">
      <circle cx="31" cy="10" r="7" fill="${NEUTRAL}"/>
      <path d="M22 19 Q31 15 40 19 L43 47 Q36 55 31 55 Q26 55 19 47Z" fill="${c('back')}"/>
      <ellipse cx="20" cy="25" rx="6" ry="7" fill="${c('shoulders')}"/><ellipse cx="42" cy="25" rx="6" ry="7" fill="${c('shoulders')}"/>
      <rect x="14" y="29" width="7" height="20" rx="4" fill="${c('triceps')}"/><rect x="41" y="29" width="7" height="20" rx="4" fill="${c('triceps')}"/>
      <rect x="12" y="48" width="7" height="19" rx="4" fill="${c('forearms')}"/><rect x="43" y="48" width="7" height="19" rx="4" fill="${c('forearms')}"/>
      <ellipse cx="31" cy="54" rx="13" ry="8" fill="${c('glutes')}"/>
      <rect x="21" y="59" width="10" height="20" rx="5" fill="${c('hamstrings')}"/><rect x="32" y="59" width="10" height="20" rx="5" fill="${c('hamstrings')}"/>
      <path d="M28 56 Q31 60 34 56" stroke="${c('adductors')}" stroke-width="5" stroke-linecap="round"/>
      <rect x="22" y="78" width="8" height="17" rx="4" fill="${c('calves')}"/><rect x="33" y="78" width="8" height="17" rx="4" fill="${c('calves')}"/>
    </g>
  </svg>`;
}


function cardMonogram(value = '') {
  const words = String(value || 'Ejercicio').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'MF';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function movementLabel(exercise = {}) {
  return exercise.movementType
    || String(exercise.movement || exercise.visualType || 'Movimiento técnico')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function exerciseCardVisual(exercise, exerciseId = '', { compact = false } = {}) {
  const primary = (exercise.primaryMuscles || [exercise.muscle]).join(' · ');
  const hasPoster = Boolean(exercise?.media?.poster);
  const modeLabel = exercise?.realMotion ? 'REAL MOTION' : hasPoster ? 'PREMIUM MOTION' : 'FICHA TÉCNICA';

  if (hasPoster) {
    return `<div class="exercise-card-media exercise-card-media-motion ${compact ? 'is-compact' : ''}" data-card-exercise="${esc(exerciseId)}">
      <div class="exercise-card-media-fallback"><span>${cardMonogram(exercise.muscle)}</span><small>${esc(exercise.muscle)}</small></div>
      <img data-exercise-card-poster src="${esc(exercise.media.poster)}" alt="Demostración de ${esc(exercise.name || 'ejercicio')}" loading="lazy">
      <div class="exercise-card-media-shade"></div>
      <span class="exercise-card-media-badge">${modeLabel}</span>
      <div class="exercise-card-muscle-line"><i></i><span><small>Principal</small><strong>${esc(primary)}</strong></span></div>
    </div>`;
  }

  return `<div class="exercise-card-media exercise-card-media-static ${compact ? 'is-compact' : ''}" data-card-exercise="${esc(exerciseId)}">
    <div class="exercise-card-tech-grid"></div>
    <span class="exercise-card-static-badge">FICHA TÉCNICA</span>
    <div class="exercise-card-monogram">${cardMonogram(exercise.muscle)}</div>
    <div class="exercise-card-static-copy">
      <small>${esc(exercise.muscle || 'Ejercicio')}</small>
      <strong>${esc(movementLabel(exercise))}</strong>
      <span>${esc(exercise.equipment || 'Sin material')}</span>
    </div>
  </div>`;
}

function staticExerciseDetailVisual(exercise, exerciseId = '') {
  const primary = (exercise.primaryMuscles || [exercise.muscle]).join(' · ');
  const secondary = (exercise.secondaryMuscles || []).join(' · ');
  return `<section class="exercise-static-detail" data-premium-visual="${esc(exerciseId)}">
    <div class="exercise-static-detail-hero">
      <div class="exercise-card-tech-grid"></div>
      <span class="exercise-card-static-badge">GUÍA TÉCNICA</span>
      <div class="exercise-static-detail-monogram">${cardMonogram(exercise.muscle)}</div>
      <div class="exercise-static-detail-copy">
        <small>${esc(exercise.muscle)} · ${esc(exercise.equipment)}</small>
        <h3>${esc(exercise.name)}</h3>
        <p>${esc(movementLabel(exercise))}</p>
      </div>
    </div>
    <div class="exercise-static-muscles">
      <span class="primary"><i></i><small>Principal</small><strong>${esc(primary)}</strong></span>
      ${secondary ? `<span class="secondary"><i></i><small>Secundarios</small><strong>${esc(secondary)}</strong></span>` : ''}
    </div>
    <p class="exercise-static-note">Este ejercicio todavía no dispone de una demostración animada. La técnica completa, los errores y las alternativas aparecen debajo.</p>
  </section>`;
}

export function exerciseVisual(exercise, { large = false } = {}) {
  if (exercise?.media?.poster) {
    const primary = (exercise.primaryMuscles || [exercise.muscle]).join(' · ');
    const secondary = (exercise.secondaryMuscles || []).join(' · ');
    const tierLabel = exercise?.realMotion ? 'REAL MOTION' : 'PREMIUM MOTION';
    const tierClass = exercise?.realMotion ? 'real-motion-preview' : 'motion-preview-card';
    return `<div class="exercise-visual motion-preview ${tierClass} ${large ? 'exercise-visual-large' : ''}">
      <img src="${esc(exercise.media.poster)}" alt="Vista anatómica de ${esc(exercise.name || 'ejercicio')}" loading="lazy">
      <div class="real-motion-preview-shade"></div>
      <span class="real-motion-preview-label">${tierLabel}</span>
      <div class="real-motion-preview-muscles">
        <span class="primary"><i></i><small>Principal</small><strong>${esc(primary)}</strong></span>
        ${secondary ? `<span class="secondary"><i></i><small>Secundarios</small><strong>${esc(secondary)}</strong></span>` : ''}
      </div>
    </div>`;
  }
  const type = exercise.visualType || exercise.movement || 'full_body';
  return `<div class="exercise-visual ${large ? 'exercise-visual-large' : ''}">
    <div class="movement-panel"><svg viewBox="0 0 100 100" role="img" aria-label="Ilustración orientativa de ${esc(exercise.name || 'ejercicio')}">${movementPose(type)}</svg><small>Movimiento</small></div>
    <div class="muscle-panel">${bodyMap(exercise)}<small><i class="legend-primary"></i> Principal <i class="legend-secondary"></i> Secundario</small></div>
  </div>`;
}

export function premiumExerciseVisual(exercise, exerciseId = '', options = {}) {
  const media = exercise?.media;
  const reduceMotion = Boolean(options.reduceMotion);

  if (exercise?.realMotion && media?.video) {
    const primary = (exercise.primaryMuscles || [exercise.muscle]).join(' · ');
    const secondary = (exercise.secondaryMuscles || []).join(' · ');
    const stepA = exercise.steps?.[0] || 'Ajusta la posición antes de iniciar.';
    const stepB = exercise.steps?.[1] || 'Mantén una trayectoria estable.';
    const stepC = exercise.steps?.[exercise.steps.length - 1] || 'Completa el recorrido con control.';

    return `<section class="premium-exercise-visual real-motion-unified" data-premium-visual="${esc(exerciseId)}">
      <div class="real-motion-stage">
        <video data-motion-video muted loop playsinline preload="auto"
          poster="${esc(media.poster || '')}" ${reduceMotion ? '' : 'autoplay'}
          aria-label="Demostración anatómica Real Motion de ${esc(exercise.name)}">
          <source src="${esc(media.video)}" type="video/mp4">
        </video>
        <div class="motion-media-error" data-motion-error hidden>
          <strong>No se pudo cargar Real Motion</strong>
          <small>Recarga la ficha y vuelve a intentarlo.</small>
        </div>
        <span class="real-motion-watermark">REAL MOTION · PILOTO</span>
        <button type="button" class="motion-fullscreen" data-motion-fullscreen aria-label="Ver a pantalla completa">⛶</button>
      </div>

      <div class="real-motion-muscle-strip">
        <span class="primary"><i></i><small>Músculo principal</small><strong>${esc(primary)}</strong></span>
        ${secondary ? `<span class="secondary"><i></i><small>Secundarios</small><strong>${esc(secondary)}</strong></span>` : ''}
      </div>

      <div class="motion-controls premium-motion-controls" aria-label="Controles de demostración">
        <button type="button" data-motion-toggle>❚❚ <span>Pausar</span></button>
        <button type="button" data-motion-replay>↺ <span>Repetir</span></button>
        <div class="motion-speed" role="group" aria-label="Velocidad">
          <button type="button" data-motion-speed="0.75">0,75×</button>
          <button type="button" class="active" data-motion-speed="1">1×</button>
          <button type="button" data-motion-speed="1.25">1,25×</button>
        </div>
      </div>

      <div class="real-motion-technique">
        <article><span>01</span><div><strong>Posición</strong><p>${esc(stepA)}</p></div></article>
        <article><span>02</span><div><strong>Recorrido</strong><p>${esc(stepB)}</p></div></article>
        <article><span>03</span><div><strong>Control</strong><p>${esc(stepC)}</p></div></article>
      </div>

      ${(exercise.breathing || exercise.tempo) ? `<div class="movement-cue-strip premium-motion-cues">
        ${exercise.breathing ? `<span><small>Respiración</small><strong>${esc(exercise.breathing)}</strong></span>` : ''}
        ${exercise.tempo ? `<span><small>Ritmo</small><strong>${esc(exercise.tempo)}</strong></span>` : ''}
      </div>` : ''}

      <p class="visual-swipe-hint">
        El modelo anatómico es una demostración orientativa. Rojo: músculo principal. Naranja: musculatura secundaria.
      </p>
    </section>`;
  }

  if (media?.video) {
    const primary = (exercise.primaryMuscles || [exercise.muscle]).join(' · ');
    const secondary = (exercise.secondaryMuscles || []).join(' · ');
    const stepA = exercise.steps?.[0] || 'Ajusta la posición antes de iniciar el movimiento.';
    const stepB = exercise.steps?.[1] || 'Mantén una trayectoria estable y evita usar impulso.';
    const stepC = exercise.steps?.[exercise.steps.length - 1] || 'Completa la repetición conservando el control.';
    return `<section class="premium-exercise-visual premium-motion-unified" data-premium-visual="${esc(exerciseId)}">
      <div class="premium-motion-stage">
        <video data-motion-video muted loop playsinline preload="metadata" poster="${esc(media.poster || '')}" ${reduceMotion ? '' : 'autoplay'} aria-label="Demostración técnica de ${esc(exercise.name)} con activación muscular integrada">
          <source src="${esc(media.video)}" type="video/mp4">
        </video>
        <div class="motion-media-error" data-motion-error hidden><strong>No se pudo cargar la demostración</strong><small>Recarga la ficha o revisa tu conexión.</small></div>
        <div class="premium-motion-badges" aria-label="Músculos trabajados">
          <span class="primary"><i></i><small>Principal</small><strong>${esc(primary)}</strong></span>
          ${secondary ? `<span class="secondary"><i></i><small>Secundarios</small><strong>${esc(secondary)}</strong></span>` : ''}
        </div>
        <button type="button" class="motion-fullscreen" data-motion-fullscreen aria-label="Ver demostración a pantalla completa">⛶</button>
      </div>
      <div class="motion-controls premium-motion-controls" aria-label="Controles de demostración">
        <button type="button" data-motion-toggle>❚❚ <span>Pausar</span></button>
        <button type="button" data-motion-replay>↺ <span>Repetir</span></button>
        <div class="motion-speed" role="group" aria-label="Velocidad"><button type="button" data-motion-speed="0.75">0,75×</button><button type="button" class="active" data-motion-speed="1">1×</button><button type="button" data-motion-speed="1.25">1,25×</button></div>
      </div>
      <div class="premium-motion-keys">
        <article><span>01</span><div><strong>Colócate</strong><p>${esc(stepA)}</p></div></article>
        <article><span>02</span><div><strong>Controla</strong><p>${esc(stepB)}</p></div></article>
        <article><span>03</span><div><strong>Completa</strong><p>${esc(stepC)}</p></div></article>
      </div>
      ${(exercise.breathing || exercise.tempo) ? `<div class="movement-cue-strip premium-motion-cues">${exercise.breathing ? `<span><small>Respiración</small><strong>${esc(exercise.breathing)}</strong></span>` : ''}${exercise.tempo ? `<span><small>Ritmo</small><strong>${esc(exercise.tempo)}</strong></span>` : ''}</div>` : ''}
      <p class="visual-swipe-hint">El color rojo señala el músculo principal y el naranja los músculos secundarios. La demostración es orientativa y no sustituye una corrección presencial.</p>
    </section>`;
  }
  if (!exercise?.movementImages?.start || !exercise?.movementImages?.end || !exercise?.anatomyImages?.front || !exercise?.anatomyImages?.back) {
    return staticExerciseDetailVisual(exercise, exerciseId);
  }
  return `<section class="premium-exercise-visual" data-premium-visual="${esc(exerciseId)}">
    <div class="movement-compare-grid">
      <figure><img src="${esc(exercise.movementImages.start)}" alt="Posición inicial de ${esc(exercise.name)}" loading="eager"><figcaption><span>01</span><strong>Inicio</strong><small>Colocación antes de mover la carga</small></figcaption></figure>
      <figure><img src="${esc(exercise.movementImages.end)}" alt="Posición final de ${esc(exercise.name)}" loading="eager"><figcaption><span>02</span><strong>Final</strong><small>Recorrido controlado y estable</small></figcaption></figure>
    </div>
    <div class="anatomy-legend"><span><i class="primary"></i>Principal</span><span><i class="secondary"></i>Secundario</span></div>
  </section>`;
}
