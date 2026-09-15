// Unit tests of the actual rendering/actions with an in-memory document adapter.
// These check markup and state transitions; they are not real-browser layout tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { normalizeState, createEmptyState } from '../js/storage.js?v=50';
import { buildPlan } from '../js/plans.js?v=50';

class NodeAdapter {
  constructor() {
    this.innerHTML=''; this.textContent=''; this.dataset={}; this.hidden=false; this.children=[];
    this.style={setProperty(){},getPropertyValue(){return '';}};
    const classes=new Set(); this.classList={add:(...names)=>names.forEach((name)=>classes.add(name)),remove:(...names)=>names.forEach((name)=>classes.delete(name)),contains:(name)=>classes.has(name),toggle:(name,on)=>on ? classes.add(name) : classes.delete(name)};
    this.attrs=new Map();
  }
  querySelectorAll(){return [];}
  querySelector(){return null;}
  addEventListener(){}
  removeEventListener(){}
  appendChild(child){this.children.push(child);return child;}
  contains(node){return this.children.includes(node);}
  remove(){}
  focus(){}
  matches(){return false;}
  closest(){return null;}
  setAttribute(name,value){this.attrs.set(name,value);}
  getAttribute(name){return this.attrs.get(name)??null;}
  removeAttribute(name){this.attrs.delete(name);}
  getBoundingClientRect(){return {width:1200,height:800};}
}
async function harness() {
  const nodes=new Map();
  const document={documentElement:new NodeAdapter(),body:new NodeAdapter(),activeElement:new NodeAdapter(),
    querySelector:(selector)=>{if (!nodes.has(selector)) nodes.set(selector,new NodeAdapter());return nodes.get(selector);},
    querySelectorAll:()=>[],createElement:()=>new NodeAdapter(),addEventListener(){},removeEventListener(){}};
  const records=new Map();
  const localStorage={getItem:(key)=>records.get(key)??null,setItem:(key,value)=>records.set(key,String(value)),removeItem:(key)=>records.delete(key)};
  const window={matchMedia:()=>({matches:false,addEventListener(){}}),location:{href:'https://example.invalid/my-fit-plan/',search:'',protocol:'https:'},innerWidth:1280,innerHeight:800,screen:{width:1280,height:800},addEventListener(){},scrollTo(){},cancelAnimationFrame(){},requestAnimationFrame:()=>0};
  Object.assign(globalThis,{document,window,localStorage,HTMLElement:NodeAdapter,requestAnimationFrame:(fn)=>fn()});
  const env={document,window,localStorage,navigator:{onLine:false,maxTouchPoints:0},HTMLElement:NodeAdapter,Element:NodeAdapter,
    console,Date,Intl,URL,URLSearchParams,Set,Map,Math,Number,String,JSON,Boolean,Array,Error,Promise,setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,requestAnimationFrame:()=>0,MutationObserver:class{observe(){}}};
  let source=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
  const imports=[...source.matchAll(/^import\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"];?/gm)];
  for (const match of imports) {
    const module=await import(new URL('../js/'+match[2].replace('./',''),import.meta.url));
    for (const binding of match[1].split(',').map((value)=>value.trim()).filter(Boolean)) {
      const [original,alias]=binding.split(/\s+as\s+/); env[alias||original]=module[original];
    }
  }
  source=source.replace(/^import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?/gm,'').replace(/^init\(\);$/gm,'');
  env.showToast=(message)=>{env.lastToast=message;};
  env.cloudAccountSummary=()=>({signedIn:false,plan:'free',sync:'guest',userId:'',planSource:'system'});
  env.billingManagementCachedSummary=()=>null;
  const context=vm.createContext(env); vm.runInContext(source,context);
  vm.runInContext('updateHud = () => {}; updateBetaPilotUi = () => {};',context);
  const profile={name:'Prueba',age:25,weight:75,height:178,objective:'muscle',experience:'beginner',location:'gym',days:3,minutes:45,setupVersion:'3.1',equipment:['Máquina','Mancuernas','Polea','Banco','Barra','Peso corporal']};
  env.fixture=normalizeState({...createEmptyState(),profile,plan:buildPlan(profile,'ppl_3'),settings:{appearance:'light',accentHex:'#c8ed90',autoStartRest:false}});
  vm.runInContext('state = fixture;',context);
  return {env,nodes,context,run:(code)=>vm.runInContext(code,context),html:()=>nodes.get('#app').innerHTML};
}

test('all main views produce content with no rendering exception', async()=>{
  const h=await harness();
  for (const name of ['renderHome','renderPlan','renderWorkoutSelector','renderLibrary','renderProfile','renderCalendarPlanner']) {
    h.run(name+'()'); assert.ok(h.html().length>200,name); assert.doesNotMatch(h.html(),/undefined|NaN/,name);
    if(process.env.MFP_MARKUP_DIR){await mkdir(process.env.MFP_MARKUP_DIR,{recursive:true});await writeFile(`${process.env.MFP_MARKUP_DIR}/${name}.html`,h.html());}
  }
});
test('welcome, six onboarding steps and all profile sections can render',async()=>{
  const h=await harness(); h.run('renderWelcome()'); assert.match(h.html(),/Un plan/);
  h.run('onboardingDraft = onboardingDraftFromState()');
  for(let step=1;step<=6;step++){h.run(`onboardingStep=${step}; renderOnboarding();`);assert.ok(h.html().length>200);}
  for(const name of ['profileSettingsHtml','profileAccountHtml','profileHistoryHtml','profileBodyHtml','profileDataHtml']) {
    const html=h.run(name+'()');assert.ok(html.length>100,name); assert.doesNotMatch(html,/NaN/);
  }
});
test('progression dialog is assigned before wiring its controls',async()=>{
  const h=await harness(); assert.doesNotThrow(()=>h.run('openProgressionDashboard()'));
});
test('entering two fields then completing a set preserves both values',async()=>{
  const h=await harness(); h.run('startRoutineWorkoutDirect()');
  h.run(`handleAppInput({target:{id:'',dataset:{action:'set-field',exercise:'0',set:'0',field:'weight'},value:'42.5'}});
    handleAppInput({target:{id:'',dataset:{action:'set-field',exercise:'0',set:'0',field:'reps'},value:'12'}});
    toggleSet(0,0);`);
  assert.equal(h.run('state.activeWorkout.exercises[0].sets[0].weight'),'42.5');
  assert.equal(h.run('state.activeWorkout.exercises[0].sets[0].reps'),'12');
  assert.equal(h.run('state.activeWorkout.exercises[0].sets[0].completed'),true);
});
test('empty repetitions do not count as a completed set',async()=>{
  const h=await harness();h.run('startRoutineWorkoutDirect(); toggleSet(0,0)');
  assert.equal(h.run('state.activeWorkout.exercises[0].sets[0].completed'),false);
  assert.match(h.env.lastToast,/repeticiones/);
});
test('finishing a session persists history and advances to the next routine day',async()=>{
  const h=await harness(); h.run(`startRoutineWorkoutDirect(); state.activeWorkout.exercises[0].sets[0].reps='10'; state.activeWorkout.exercises[0].sets[0].weight='40'; toggleSet(0,0); openSessionCompleted=()=>{}; finishWorkout();`);
  assert.equal(h.run('state.activeWorkout'),null); assert.equal(h.run('state.history.length'),1);
  assert.equal(h.run('state.history[0].volume'),400); assert.equal(h.run('state.nextWorkoutIndex'),1);
  h.run('state = loadState()'); assert.equal(h.run('state.history[0].exercises[0].sets[0].reps'),'10');
  assert.doesNotThrow(()=>h.run('finishWorkout()'));
});
test('storage failure keeps the workout and avoids a false completion success',async()=>{
  const h=await harness();h.run(`startRoutineWorkoutDirect(); state.activeWorkout.exercises[0].sets[0].reps='10'; toggleSet(0,0); save=()=>false; finishWorkout();`);
  assert.ok(h.run('state.activeWorkout')); assert.equal(h.run('state.history.length'),0);
  assert.equal(h.run('state.activeWorkout.exercises[0].sets[0].completed'),true);
});
test('navigation flushes an unfinished note to storage',async()=>{
  const h=await harness();h.run(`startRoutineWorkoutDirect(); handleAppInput({target:{id:'',dataset:{action:'exercise-notes',exercise:'0'},value:'Agarre neutro'}}); setView('home'); state=loadState();`);
  assert.equal(h.run('state.activeWorkout.exercises[0].notes'),'Agarre neutro');
});

test('standalone preview can boot its bundled module graph with example data',async()=>{
  const html=await readFile(new URL('../ABRIR_VISTA_PREVIA.html',import.meta.url),'utf8');
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const h=await harness(); const timers=[];
  Object.assign(h.env,{atob, btoa, Blob, Uint8Array, crypto:globalThis.crypto});
  h.env.setInterval=(callback,delay)=>{const timer=setInterval(callback,delay);timers.push(timer);return timer;};
  h.env.window.setInterval=h.env.setInterval; h.env.window.setTimeout=setTimeout;
  h.env.window.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1'});
  h.env.getComputedStyle=h.env.window.getComputedStyle;
  try {
    assert.doesNotThrow(()=>h.run(script));
    assert.match(h.html(),/Tu siguiente paso, Demo/);
    assert.match(h.html(),/v5-volume-chart/);
    assert.equal(h.env.localStorage.getItem('myFitPlanPreview50'),null);
  } finally {timers.forEach(clearInterval);}
});
