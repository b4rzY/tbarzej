import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/city.js','utf8');
function fixture({reduced=false,available=true}={}){
 const observers=[],frames=new Map();let nextFrame=0,time=100;
 class Element {
  constructor(dataset={}){this.dataset=dataset;this.style={};this.attributes={};this.listeners={};this.children=[];this.textContent='';const classes=new Set();this.classList={contains:key=>classes.has(key),toggle:(key,value)=>{if(value)classes.add(key);else classes.delete(key);for(const o of observers)if(o.kind==='mutation'&&o.target===this&&o.options.attributeFilter?.includes('class'))o.callback([]);},remove:key=>this.classList.toggle(key,false)};}
  addEventListener(type,fn){(this.listeners[type]??=new Set()).add(fn);}removeEventListener(type,fn){this.listeners[type]?.delete(fn);}fire(type,data={}){for(const fn of this.listeners[type]||[])fn({target:this,preventDefault(){this.defaultPrevented=true;},...data});}
  setAttribute(key,value){this.attributes[key]=String(value);}getBoundingClientRect(){return this.rect||{width:900,height:600};}focus(){}setPointerCapture(){}
  contains(element){return element===this||this.children.includes(element)||this.children.some(child=>child.contains(element));}
  matches(selector){return selector==='span'?this.tag==='span':selector==='svg'?this.tag==='svg':selector==='.city-canvas'?this.tag==='canvas':selector==='[data-workflow-city]'?this===root:selector.startsWith('[data-')?Object.hasOwn(this.dataset,selector.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())):false;}
  closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  append(child){this.children.push(child);child.parent=this;return child;}
  set innerHTML(value){this.children=[];if(value.includes('<canvas')){const canvas=this.append(new Element());canvas.tag='canvas';canvas.clientWidth=900;canvas.clientHeight=600;canvas.getContext=()=>available?ctx:null;this.canvas=canvas;}for(const match of value.matchAll(/data-(map-landmark|city-role)="([^"]+)"/g)){const button=this.append(new Element({[match[1]==='map-landmark'?'mapLandmark':'cityRole']:match[2]}));button.append(Object.assign(new Element(),{tag:'span'}));}}
 }
 const ctx=new Proxy({measureText:text=>({width:text.length*5}),createRadialGradient:()=>({addColorStop(){}})}, {get:(object,key)=>object[key]??(()=>{})});
 const root=new Element({workflowCity:'',language:'en'}),viewport=root.append(new Element({cityViewport:''}));
 const status=root.append(new Element({cityStatus:''})),selection=root.append(new Element({citySelection:''}));root.append(new Element({cityRoles:''}));
 const controls=Object.fromEntries(['interact','motion','zoom-in','zoom-out','rotate-left','rotate-right','reset'].map(action=>{const button=root.append(new Element({cityAction:action}));if(action==='zoom-in')button.append(Object.assign(new Element(),{tag:'svg'}));return [action,button];}));
 const media=new Element();media.matches=reduced;const document=new Element();document.hidden=false;
 class Observer{constructor(callback,kind){this.callback=callback;this.kind=kind;observers.push(this);}observe(target,options={}){this.target=target;this.options=options;}disconnect(){this.disconnected=true;}}
 const window={matchMedia:()=>media,devicePixelRatio:3};
 vm.runInNewContext(source,{window,document,ResizeObserver:class extends Observer{constructor(cb){super(cb,'resize');}},IntersectionObserver:class extends Observer{constructor(cb){super(cb,'intersection');}},MutationObserver:class extends Observer{constructor(cb){super(cb,'mutation');}},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)});
 const api=window.initWorkflowCity(root);
 return {api,root,viewport,controls,status,selection,frames,document,media,observers,click:action=>root.fire('click',{target:controls[action]}),frame(){const item=frames.entries().next().value;if(item){frames.delete(item[0]);time+=40;item[1](time);}},visible(value){observers.find(o=>o.kind==='intersection').callback([{isIntersecting:value}]);}};
}
test('public roles replace all original project identities and all external capabilities',()=>{
 assert.doesNotMatch(source,/anticheat|projectId|\bplatform\b|\bgame\b|\bclient\b|data-map-route|fetch\s*\(|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|\/api\/|https?:\/\//i);
 const window={};vm.runInNewContext(source,{window});assert.equal(window.workflowCityGeometry.roles.length,9);
 for(const role of window.workflowCityGeometry.roles){assert.ok(role.en&&role.es&&role.detail&&role.detailEs);assert.equal(role.status,'working');}
});
test('initializes actual canvas with DPR cap, moving traffic, and role buttons',()=>{
 const f=fixture();assert.ok(f.api);assert.equal(f.viewport.canvas.width,1800);assert.equal(f.viewport.canvas.height,1200);assert.equal(f.root.querySelectorAll('[data-city-role]').length,9);assert.equal(f.viewport.querySelectorAll('[data-map-landmark]').length,9);
 f.frame();f.frame();assert.ok(f.api.getState().time>0);assert.ok(f.frames.size);f.api.destroy();assert.equal(f.frames.size,0);assert.ok(f.observers.every(o=>o.disconnected));
});
test('city loops automatically even with reduced-motion preference',()=>{
 const f=fixture({reduced:true});assert.equal(f.api.getState().playing,true);f.frame();f.frame();assert.ok(f.api.getState().time>0);assert.equal(f.frames.size,1);f.api.destroy();
});
test('offscreen and document-hidden animations suspend and resume without time jump',()=>{
 const f=fixture();f.frame();f.frame();const start=f.api.getState().time;f.visible(false);assert.equal(f.frames.size,0);f.visible(true);f.frame();assert.equal(f.api.getState().time,start);
 f.document.hidden=true;f.document.fire('visibilitychange');assert.equal(f.frames.size,0);f.document.hidden=false;f.document.fire('visibilitychange');f.frame();assert.equal(f.api.getState().time,start);f.api.destroy();
});
test('mobile scrolling is preserved until interaction is explicitly enabled',()=>{
 const f=fixture();let prevented=false;const wheel=()=>f.viewport.fire('wheel',{deltaY:-100,preventDefault(){prevented=true;}});
 assert.equal(f.viewport.style.touchAction,'pan-y pinch-zoom');wheel();assert.equal(prevented,false);assert.equal(f.api.getState().camera.scale,1);
 f.click('interact');assert.equal(f.viewport.style.touchAction,'none');wheel();assert.equal(prevented,true);assert.ok(f.api.getState().camera.scale>1);
 f.viewport.fire('keydown',{key:'Escape'});assert.equal(f.viewport.style.touchAction,'pan-y pinch-zoom');f.api.destroy();
});
test('camera controls, keyboard, selection and translated SVG controls work',()=>{
 const f=fixture();f.click('zoom-in');f.click('rotate-right');assert.ok(f.api.getState().camera.scale>1);assert.ok(f.api.getState().camera.yaw>0);f.click('reset');assert.equal(f.api.getState().camera.scale,1);assert.equal(f.api.getState().camera.yaw,0);
 f.viewport.fire('keydown',{key:'ArrowLeft'});assert.ok(f.api.getState().camera.yaw>0);
 const role=f.root.querySelectorAll('[data-city-role]').find(button=>button.dataset.cityRole==='build');f.root.fire('click',{target:role});assert.equal(f.api.getState().selected,'build');assert.match(f.selection.textContent,/Build/);
 f.api.setLanguage('es');assert.match(f.selection.textContent,/Construir/);assert.equal(f.controls['zoom-in'].attributes['aria-label'],'Acercar');assert.ok(f.controls['zoom-in'].querySelector('svg'));f.api.destroy();
});
test('Canvas-unavailable fallback disables controls instead of presenting a broken exhibit',()=>{
 const f=fixture({available:false});assert.equal(f.api,null);assert.equal(f.root.dataset.cityUnavailable,'true');assert.match(f.viewport.textContent,/unavailable/);assert.ok(Object.values(f.controls).every(button=>button.disabled));
});

test('resizing clamps camera pan to the new viewport bounds',()=>{
 const f=fixture();f.click('interact');
 f.viewport.fire('pointerdown',{pointerId:1,button:0,clientX:0,clientY:0});
 f.viewport.fire('pointermove',{pointerId:1,clientX:800,clientY:500,shiftKey:true});
 assert.equal(f.api.getState().camera.x,800);assert.equal(f.api.getState().camera.y,500);
 f.viewport.rect={width:320,height:240};
 const observer=f.observers.find(o=>o.kind==='resize'&&o.target===f.viewport);observer.callback([]);
 assert.equal(f.api.getState().camera.x,320);assert.equal(f.api.getState().camera.y,240);f.api.destroy();
});

test('keyboard instructions and Shift-arrow panning have EN/ES parity',()=>{
 const f=fixture();const initial=f.api.getState().camera;
 f.viewport.fire('keydown',{key:'ArrowRight',shiftKey:true});
 f.viewport.fire('keydown',{key:'ArrowDown',shiftKey:true});
 assert.equal(f.api.getState().camera.x,24);assert.equal(f.api.getState().camera.y,24);assert.equal(f.api.getState().camera.yaw,initial.yaw);
 f.viewport.fire('keydown',{key:'ArrowLeft',shiftKey:true});f.viewport.fire('keydown',{key:'ArrowUp',shiftKey:true});
 assert.equal(f.api.getState().camera.x,0);assert.equal(f.api.getState().camera.y,0);
 assert.match(f.viewport.attributes['aria-label'],/Left and Right arrows: orbit/);assert.match(f.viewport.attributes['aria-label'],/Shift and arrow keys: pan/);assert.match(f.viewport.attributes['aria-label'],/Home: reset view/);assert.match(f.viewport.attributes['aria-label'],/Escape: exit/);
 f.api.setLanguage('es');assert.match(f.viewport.attributes['aria-label'],/Mayús y flechas: desplazar/);assert.match(f.viewport.attributes['aria-label'],/Inicio: restablecer/);assert.match(f.viewport.attributes['aria-label'],/Escape: salir/);f.api.destroy();
});

test('small consecutive pointer moves accumulate and suppress the resulting building click',()=>{
 const f=fixture();f.click('interact');
 const target=f.viewport.querySelectorAll('[data-map-landmark]').find(button=>button.dataset.mapLandmark==='build');
 f.viewport.fire('pointerdown',{target,pointerId:1,button:0,clientX:0,clientY:0});
 for(let x=1;x<=100;x++)f.viewport.fire('pointermove',{target,pointerId:1,clientX:x,clientY:0});
 f.viewport.fire('pointerup',{target,pointerId:1});f.root.fire('click',{target});
 assert.ok(Math.abs(f.api.getState().camera.yaw-.8)<1e-9);assert.equal(f.api.getState().selected,'plan');
 f.viewport.fire('pointerdown',{target,pointerId:2,button:0,clientX:100,clientY:0});
 f.viewport.fire('pointerup',{target,pointerId:2});f.root.fire('click',{target});
 assert.equal(f.api.getState().selected,'build');f.api.destroy();
});
