'use strict';

import { esc, normalizeText } from './utils.js';

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

export function exerciseVisual(exercise, { large = false } = {}) {
  const type = exercise.visualType || exercise.movement || 'full_body';
  return `<div class="exercise-visual ${large ? 'exercise-visual-large' : ''}">
    <div class="movement-panel"><svg viewBox="0 0 100 100" role="img" aria-label="Ilustración orientativa de ${esc(exercise.name || 'ejercicio')}">${movementPose(type)}</svg><small>Movimiento</small></div>
    <div class="muscle-panel">${bodyMap(exercise)}<small><i class="legend-primary"></i> Principal <i class="legend-secondary"></i> Secundario</small></div>
  </div>`;
}
