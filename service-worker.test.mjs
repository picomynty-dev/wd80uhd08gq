import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
const scope='https://example.invalid/my-fit-plan/';
async function harness() {
  const handlers={}; const databases=new Map(); const requests=[];
  class RequestAdapter {
    constructor(input,options={}) {
      this.url=new URL(typeof input==='string'||input instanceof URL?input:input.url,scope).href;
      this.method=input.method||'GET';this.destination=input.destination||'';this.mode=input.mode||'cors';this.headers={has:()=>false};Object.assign(this,options);
    }
  }
  const cacheFor=(name)=>{
    if(!databases.has(name))databases.set(name,new Map());const data=databases.get(name);
    return {match:async(request)=>data.get(new URL(request.url||request,scope).pathname)?.clone(),put:async(request,response)=>data.set(new URL(request.url||request,scope).pathname,response),
      addAll:async(urls)=>{for(const url of urls)await cacheFor(name).put(url,await env.fetch(url));},add:async(url)=>cacheFor(name).put(url,await env.fetch(new RequestAdapter(url)))};
  };
  const env={URL,Request:RequestAdapter,Response,Promise,encodeURIComponent,
    self:{registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(name,handler)=>handlers[name]=handler,clients:{claim:async()=>{}},skipWaiting:()=>{}},
    caches:{open:async(name)=>cacheFor(name),keys:async()=>[...databases.keys()],delete:async(name)=>databases.delete(name)},
    fetch:async(request)=>{requests.push(request.url||request);return new Response('network-current');}};
  const context=vm.createContext(env);vm.runInContext(source,context);
  return {env,context,handlers,requests,databases,RequestAdapter,run:(code)=>vm.runInContext(code,context),event:(name,arg)=>handlers[name](arg)};
}
test('installation requires every local module, including the new input and theme helpers',async()=>{
  const h=await harness();let task;h.event('install',{waitUntil:(promise)=>task=promise});await task;
  assert.ok(h.requests.some((url)=>url.endsWith('/js/pending-input.js')));assert.ok(h.requests.some((url)=>url.endsWith('/design-v5.css')));
  const moduleNames=[...source.matchAll(/'\.\/js\/([^']+)'/g)].map((match)=>match[1]);
  for(const name of moduleNames)assert.ok((await readFile(new URL('../js/'+name,import.meta.url))).length>0);
});
test('offline reads do not mix caches belonging to another installation',async()=>{
  const h=await harness();h.databases.set('my-fit-plan-other-site',new Map([['/my-fit-plan/js/app.js',new Response('wrong-other-site')]]));
  h.env.fetch=async()=>{throw new Error('offline');};
  const response=await h.run("networkFirst(new Request('./js/app.js'))");assert.equal(response.status,504);
});
test('offline navigation falls back to this installation index',async()=>{
  const h=await harness();let task;h.event('install',{waitUntil:(promise)=>task=promise});await task;
  h.env.fetch=async()=>{throw new Error('offline');};
  const response=await h.run("networkFirst(new Request('./other-page', {mode:'navigate'}))");assert.equal(response.status,200);assert.equal(await response.text(),'network-current');
});
test('a new version request is never served an older cached module',async()=>{
  const h=await harness();let response;h.event('fetch',{request:new h.RequestAdapter('./js/app.js?v=51',{destination:'script'}),respondWith:(promise)=>response=promise});
  assert.equal(await (await response).text(),'network-current');assert.equal(h.requests.length,1);
});
