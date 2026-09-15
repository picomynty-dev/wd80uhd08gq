import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createEmptyState, normalizeState, loadState, saveState, STORAGE_KEY } from '../js/storage.js?v=50';
import { buildPlan } from '../js/plans.js?v=50';
import { sessionVolume, buildCalendar } from '../js/stats.js?v=50';
import { buildRecommendedSession } from '../js/session-selector.js?v=50';
import { buildAdaptiveSession } from '../js/adaptive.js?v=50';
import { hasPremiumAccess } from '../js/premium.js?v=50';
import { createPendingInputWriter } from '../js/pending-input.js?v=50';
import { readableAccentColor } from '../js/theme.js?v=50';

const profile = { name: 'Prueba', age: 25, weight: 75, height: 178, objective: 'muscle', experience: 'beginner', location: 'gym', days: 3, minutes: 45, equipment: ['Máquina','Mancuernas','Polea','Banco','Barra','Peso corporal'], setupVersion: '3.1' };
function memoryStorage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: (key) => map.delete(key), clear: () => map.clear() };
}
test('v4.7 state retains IDs, history, photos, account metadata and custom appearance', () => {
  const plan = buildPlan(profile, 'ppl_3');
  const legacy = { ...createEmptyState(), appVersion:'4.7 External Beta Candidate', profile, plan,
    settings: { appearance: 'dark', accentHex: '#f97316', compact: true }, nextWorkoutIndex: 2,
    routineFolders: [{ id:'folder-real',name:'Pecho y espalda',routines:[plan] }], activeFolderId:'folder-real',activeRoutineId:plan.id,
    cloudOwnerId:'original-user', favorites:['barbell_bench_press'],
    history:[{id:'session-real',name:'Día 1',startedAt:'2026-08-09T15:00:00Z',finishedAt:'2026-08-09T15:45:00Z',durationSeconds:2700,exercises:[{exerciseId:'barbell_bench_press',sets:[{weight:'40',reps:'10',rir:'2',completed:true}]}]}],
    bodyProgress:[{id:'body-real',date:'2026-08-09',weight:75,photos:{front:'private-photo-id'}}]
  };
  const copy = normalizeState(legacy);
  assert.equal(copy.plan.id,plan.id); assert.equal(copy.routineFolders[0].id,'folder-real');
  assert.equal(copy.history[0].id,'session-real'); assert.equal(copy.history[0].exercises[0].sets[0].reps,'10');
  assert.equal(copy.bodyProgress[0].photos.front,'private-photo-id'); assert.equal(copy.cloudOwnerId,'original-user');
  assert.equal(copy.settings.accentHex,'#f97316'); assert.equal(copy.settings.appearance,'dark');
  assert.equal(copy.nextWorkoutIndex,2); assert.ok(copy.appVersion.startsWith('5.0'));
});
test('v4.7 storage key still loads after upgrade and saving remains reversible', () => {
  globalThis.localStorage = memoryStorage();
  assert.equal(STORAGE_KEY,'myFitPlanStateV46');
  const fixture = normalizeState({ ...createEmptyState(),profile,plan:buildPlan(profile) });
  localStorage.setItem(STORAGE_KEY,JSON.stringify(fixture));
  const restored = loadState(); assert.equal(restored.profile.name,profile.name);
  restored.profile.name='Actualizado'; saveState(restored); assert.equal(loadState().profile.name,'Actualizado');
});
test('invalid next day index cannot point outside the routine', () => {
  for (const index of [-9,-1,0,1,2,3,4,Infinity,1.5]) {
    const result = normalizeState({profile,plan:buildPlan(profile),nextWorkoutIndex:index});
    assert.ok(Number.isInteger(result.nextWorkoutIndex)); assert.ok(result.nextWorkoutIndex>=0 && result.nextWorkoutIndex<result.plan.days.length);
  }
});
test('pending values from weight, repetitions and notes are all committed', () => {
  const writes=[]; const queue=createPendingInputWriter((field)=>writes.push(field));
  const weight={dataset:{action:'set-field',exercise:'0',set:'0',field:'weight'},value:'40'};
  queue(weight); weight.value='999';
  queue({dataset:{action:'set-field',exercise:'0',set:'0',field:'reps'},value:'10'});
  queue({dataset:{action:'exercise-notes',exercise:'0'},value:'Asiento al 4'});
  queue.flush(); assert.deepEqual(writes.map((field)=>field.value),['40','10','Asiento al 4']);
  queue.flush(); assert.equal(writes.length,3);
});
test('editing the same field repeatedly saves its latest value', () => {
  const writes=[]; const queue=createPendingInputWriter((field)=>writes.push(field));
  for (const value of ['4','40','42.5']) queue({dataset:{action:'set-field',exercise:'1',set:'0',field:'weight'},value});
  queue.flush(); assert.equal(writes.length,1); assert.equal(writes[0].value,'42.5');
});
test('calendar dates do not shift when a user changes time zones', () => {
  const url = new URL('../js/utils.js',import.meta.url).href;
  for (const tz of ['Europe/Madrid','America/Los_Angeles','Pacific/Honolulu','Asia/Tokyo']) {
    const result=execFileSync(process.execPath,['--input-type=module','-e',`import {isoDay,formatDate} from ${JSON.stringify(url)}; console.log(isoDay('2026-09-14')); console.log(formatDate('2026-09-14'));`],{env:{...process.env,TZ:tz},encoding:'utf8'});
    assert.ok(result.startsWith('2026-09-14\n'),tz); assert.match(result,/14 sept/);
  }
});
test('light and dark accents use contrasting foreground text', () => {
  assert.equal(readableAccentColor('#c8ed90'),'#101812');
  assert.equal(readableAccentColor('#f97316'),'#101812');
  assert.equal(readableAccentColor('#111827'),'#ffffff');
  assert.equal(readableAccentColor('#2563eb'),'#ffffff');
});
test('volume only includes completed sets', () => {
  assert.equal(sessionVolume({exercises:[{sets:[{weight:40,reps:10,completed:true},{weight:100,reps:10,completed:false}]}]}),400);
});
test('recommendations contain valid and unique exercises across variants', () => {
  const plan=buildPlan(profile,'ppl_3');
  for (let variant=0;variant<6;variant++) {
    const result=buildRecommendedSession(plan,[],0,[],profile,{variant});
    const items=result.day.exercises;
    assert.ok(items.length>0); assert.equal(new Set(items.map((item)=>item.exerciseId)).size,items.length);
  }
});
test('free, premium and founder permissions remain distinct', () => {
  assert.equal(hasPremiumAccess('free'),false); assert.equal(hasPremiumAccess('premium'),true); assert.equal(hasPremiumAccess('founder'),true); assert.equal(hasPremiumAccess('unknown'),false);
});
test('monthly calendar preserves completed-session dates', () => {
  const calendar=buildCalendar([{finishedAt:'2026-09-14T18:00:00Z',exercises:[]}],new Date(2026,8,14,12));
  assert.ok(calendar.cells.some((cell)=>cell?.iso==='2026-09-14' && cell.trained));
});
