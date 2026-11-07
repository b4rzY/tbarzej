import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/engine.js', import.meta.url), 'utf8');

// Mock GL verifies lifecycle and public contracts. Browser QA verifies real GPU output.
function fixture({ reducedMotion = false, available = true, width = 600, height = 520, mobile = false, softwareAvailable = false, shaderFails = false } = {}) {
  const events = [], frames = new Map(), listeners = new Map(), classes = new Set();
  let frameId = 0, contextAvailable = available, time = 100;
  const target = () => ({
    addEventListener(type, fn) { const key = `${this.id}:${type}`; if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(fn); },
    removeEventListener(type, fn) { listeners.get(`${this.id}:${type}`)?.delete(fn); }
  });
  const gl = new Proxy({
    COMPILE_STATUS: 1, LINK_STATUS: 2,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => !shaderFails, getShaderInfoLog: () => 'Test shader compilation failure', getProgramParameter: () => true,
    getAttribLocation: (_, name) => name === 'aNormal' ? 1 : 0,
    getUniformLocation: () => ({}), getShaderPrecisionFormat: () => ({ precision: 23 })
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  let softwareFills=0; const softwarePoints=[];
  const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),fill:()=>{softwareFills++;},moveTo:(x,y)=>softwarePoints.push([x,y])},{get:(o,k)=>k in o?o[k]:()=>{}});
  const canvas = { ...target(), id: 'canvas', width: 0, height: 0, style: {}, getContext: type => type==='2d' ? (softwareAvailable&&!shaderFails?context2d:null) : (contextAvailable?gl:null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }), focus() {}, setPointerCapture() {} };
  const extraCanvases=[];
  const stage = { insertBefore: element => extraCanvases.push(element), dataset: {}, classList: { add: c => classes.add(c), remove: c => classes.delete(c) } };
  const document = { ...target(), id: 'document', hidden: false, readyState: 'complete', createElement: () => ({width:0,height:0,style:{},attributes:{},setAttribute(key,value){this.attributes[key]=value;},remove(){this.removed=true;},getContext:()=>softwareAvailable?context2d:null}), getElementById: id => id === 'core-canvas' ? canvas : stage, dispatchEvent: e => events.push(e) };
  const window = { ...target(), id: 'window' };
  const media = { ...target(), id: 'media', matches: reducedMotion };
  class Observer { observe() {} disconnect() {} }
  const context = { console, Float32Array, Uint16Array, Math, Number, Map, Error, document, window,
    matchMedia: query => query.includes('reduced-motion') ? media : { matches: mobile }, devicePixelRatio: 3,
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: id => frames.delete(id),
    CustomEvent: class { constructor(type, { detail }) { this.type = type; this.detail = detail; } },
    IntersectionObserver: Observer, ResizeObserver: Observer, MutationObserver: Observer, performance: { now: () => time } };
  vm.runInNewContext(source, context);
  return { api: window.portfolioEngine, events, canvas, stage, classes, frames, document,
    frame() { const entry = frames.entries().next().value; if (entry) { frames.delete(entry[0]); time += 16; entry[1](time); } },
    fire(type, data = {}, targetId = 'canvas') { for (const fn of listeners.get(`${targetId}:${type}`) || []) fn({ preventDefault() {}, ...data }); },
    softwareFills:()=>softwareFills, softwarePoints, extraCanvases,
    contextAvailable(value) { contextAvailable = value; }
  };
}

test('engine starts only after a first draw and respects desktop/mobile DPR caps', () => {
  const f = fixture(); assert.equal(f.api.getState().ready, false); f.frame();
  assert.equal(f.api.getState().ready, true); assert.equal(f.api.getState().available, true);
  assert.ok(f.classes.has('is-live')); assert.equal(f.canvas.width, 1050);
  const mobile = fixture({ mobile: true, width: 360 }); assert.equal(mobile.canvas.width, 540);
  f.api.dispose(); mobile.api.dispose();
});

test('public state clamps zoom, validates selection, and restores reset defaults', () => {
  const f = fixture(); f.frame(); f.api.zoom(500); assert.equal(f.api.getState().zoom, 1.25);
  f.api.zoom(-500); assert.equal(f.api.getState().zoom, .75);
  f.api.selectLayer(2); assert.equal(f.api.getState().selectedLayer, 2);
  f.api.selectLayer(9); assert.equal(f.api.getState().selectedLayer, -1);
  f.api.setExploded(false); assert.equal(f.api.getState().exploded, false);
  f.api.reset(); assert.equal(f.api.getState().zoom, 1); assert.equal(f.api.getState().exploded, true);
  f.api.dispose();
});

test('unavailable initialization persists its reason for listeners attached later', () => {
  const f = fixture({ available: false });
  assert.equal(f.api.getState().available, false); assert.equal(f.api.getState().ready, false);
  assert.match(f.api.getState().reason, /WebGL is unavailable/);
  f.api.selectLayer(1); assert.match(f.api.getState().reason, /WebGL is unavailable/);
  assert.equal(f.events.at(-1).detail.reason, f.api.getState().reason);
  f.contextAvailable(true); f.fire('webglcontextrestored'); f.frame();
  assert.equal(f.api.getState().ready, true); assert.equal(f.api.getState().reason, undefined);
  assert.equal(f.events.at(-1).detail.reason, undefined); f.api.dispose();
});

test('context loss presents fallback; successful restored draw clears reason', () => {
  const f = fixture(); f.frame(); f.fire('webglcontextlost');
  assert.equal(f.api.getState().available, false); assert.equal(f.api.getState().ready, false);
  assert.ok(!f.classes.has('is-live')); assert.match(f.api.getState().reason, /context paused/);
  assert.equal(f.frames.size, 0); f.fire('webglcontextrestored'); f.frame();
  assert.equal(f.api.getState().ready, true); assert.equal(f.api.getState().reason, undefined);
  assert.ok(f.classes.has('is-live')); f.api.dispose();
});

test('reduced motion starts paused, snaps transitions, permits explicit play, restores paused', () => {
  const f = fixture({ reducedMotion: true }); f.frame();
  assert.equal(f.api.getState().motion, false); assert.equal(f.frames.size, 0);
  f.api.setExploded(false); f.frame(); assert.equal(f.frames.size, 0);
  f.api.setMotion(true); f.frame(); assert.equal(f.api.getState().motion, true); assert.equal(f.frames.size, 1);
  f.fire('webglcontextlost'); f.fire('webglcontextrestored'); f.frame();
  assert.equal(f.api.getState().motion, false); assert.equal(f.frames.size, 0); f.api.dispose();
});

test('paused engine renders on demand without a permanent animation loop', () => {
  const f = fixture(); f.api.setMotion(false); f.frame(); assert.equal(f.frames.size, 0);
  const count = f.events.length; f.api.rotate(.1, .1); assert.equal(f.frames.size, 1);
  f.frame(); assert.equal(f.frames.size, 0); assert.equal(f.events.length, count);
  f.api.selectLayer(1); const changed = f.events.length; f.api.selectLayer(1); assert.equal(f.events.length, changed);
  f.api.dispose();
});

test('hidden document stops rendering and visibility restoration requests a frame', () => {
  const f = fixture(); f.frame(); f.document.hidden = true; f.fire('visibilitychange', {}, 'document');
  assert.equal(f.frames.size, 0); f.document.hidden = false; f.fire('visibilitychange', {}, 'document');
  assert.equal(f.frames.size, 1); f.api.dispose();
});

test('dispose cancels animation and safely ignores later context restoration', () => {
  const f = fixture(); f.frame(); f.api.dispose(); f.api.dispose();
  assert.equal(f.api.getState().available, false); assert.equal(f.frames.size, 0);
  f.fire('webglcontextrestored'); assert.equal(f.api.getState().available, false);
});


test('Canvas2D fallback projects live 3D meshes and responds to orbit, zoom and selection', () => {
  const f=fixture({available:false,softwareAvailable:true,reducedMotion:true});f.frame();
  assert.equal(f.api.getState().renderer,'canvas2d');assert.equal(f.stage.dataset.engine,'canvas2d');
  assert.equal(f.api.getState().available,true);assert.equal(f.api.getState().ready,true);
  assert.equal(f.api.getState().reason,undefined);assert.ok(f.softwareFills()>100);
  const initial=JSON.stringify(f.softwarePoints);f.softwarePoints.length=0;
  f.api.rotate(.5,.1);f.frame();f.frame();assert.notEqual(JSON.stringify(f.softwarePoints),initial);
  f.api.zoom(.15);f.api.selectLayer(2);f.frame();f.frame();assert.equal(f.api.getState().selectedLayer,2);
  assert.equal(f.api.getState().zoom,1.15);assert.equal(f.frames.size,0);f.api.dispose();
});

test('Canvas2D automatic draws are capped at 30 fps and stop when paused', () => {
  const f=fixture({available:false,softwareAvailable:true});f.frame();const first=f.softwareFills();
  f.frame();assert.equal(f.softwareFills(),first);f.frame();assert.ok(f.softwareFills()>first);
  f.api.setMotion(false);f.frame();f.frame();assert.equal(f.frames.size,0);f.api.dispose();
});


test('shader failure uses a separate software canvas without replacing the event surface', () => {
  const f=fixture({available:true,shaderFails:true,softwareAvailable:true,reducedMotion:true});f.frame();
  assert.equal(f.api.getState().renderer,'canvas2d');assert.equal(f.api.getState().ready,true);
  assert.equal(f.extraCanvases.length,1);const surface=f.extraCanvases[0];
  assert.equal(surface.attributes['aria-hidden'],'true');assert.equal(surface.tabIndex,-1);
  assert.match(surface.style.cssText,/pointer-events:none/);assert.equal(surface.width,f.canvas.width);
  assert.ok(f.softwareFills()>100);f.api.zoom(.15);f.frame();f.frame();
  assert.equal(f.api.getState().zoom,1.15);assert.equal(f.canvas.id,'canvas');
  f.api.dispose();assert.equal(surface.removed,true);
});
