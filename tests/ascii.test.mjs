import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/ascii-art.js','utf8');
const module={exports:{}};vm.runInNewContext(source,{module});const {sample,draw}=module.exports;
test('all character fields stay finite and normalized',()=>{for(const mode of ['horizon','bloom','wave'])for(let x=-1.5;x<=1.5;x+=.09)for(let y=-1;y<=1;y+=.09){const n=sample(x,y,22,mode);assert.ok(Number.isFinite(n)&&n>=0&&n<=1);}});
test('event horizon remains dark and each field evolves',()=>{assert.equal(sample(0,0,0),0);for(const mode of ['horizon','bloom','wave']){let changed=false;for(let x=.2;x<1;x+=.1)if(Math.abs(sample(x,.15,0,mode)-sample(x,.15,6,mode))>.01)changed=true;assert.ok(changed,mode);}});
test('ASCII render is bounded at large desktop resolutions',()=>{let count=0;const ctx=new Proxy({globalAlpha:1,createRadialGradient:()=>({addColorStop(){}}),fillText(){count++;}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});draw(ctx,3840,2160,1,{background:true});assert.ok(count>100&&count<6500);});
test('gallery controls preserve lifecycle, bilingual copy, and no external requests',()=>{const s=readFileSync('src/art-gallery.js','utf8');for(const term of ['IntersectionObserver','ResizeObserver','visibilitychange','prefers-reduced-motion','aria-pressed','Pausar arte','cancelAnimationFrame'])assert.ok(s.includes(term));assert.doesNotMatch(source+s,/fetch\(|https:\/\//);});
test('offline export embeds new studies and does not leave asset script links',()=>{const html=readFileSync('Tomas-Portfolio-Review.html','utf8');assert.match(html,/Independently authored mathematical character art/);assert.doesNotMatch(html,/<script src="(?:ascii-art|art-gallery)\.js/);});

function galleryScene({reduced=false}={}){
 const frames=new Map(),observers=[],elements=new Map(),documentEvents={};let next=0,draws=0;
 const context=new Proxy({},{get:()=>()=>{},set:()=>true});
 function element(){return {dataset:{},attributes:{},events:{},textContent:'',children:[],setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.events[k]=f;},append(e){this.children.push(e);},getContext:()=>context,getBoundingClientRect:()=>({width:390,height:250})};}
 const root=element();for(const key of ['canvas','h2','.art-heading p','.art-controls','.art-description','.art-credit','.art-motion','.art-options'])elements.set(key,element());
 root.querySelector=k=>elements.get(k);root.querySelectorAll=()=>elements.get('.art-options').children;
 const hero=element(),document={hidden:false,documentElement:{lang:'en'},querySelector:()=>root,getElementById:()=>hero,createElement:element,addEventListener(k,f){documentEvents[k]=f;}};
 const preference={matches:reduced,addEventListener(k,f){this.change=f;}};
 const globals={window:{portfolioAscii:{draw(){draws++;}}},document,devicePixelRatio:3,matchMedia:()=>preference,requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},IntersectionObserver:class{constructor(f){observers.push(f);}observe(){}},MutationObserver:class{constructor(f){this.f=f;}observe(){}}};
 vm.runInNewContext(readFileSync('src/art-gallery.js','utf8'),globals);
 return {elements,frames,document,documentEvents,observers,preference,draws:()=>draws,tick(t){const item=frames.entries().next().value;if(item){frames.delete(item[0]);item[1](t);}}};
}
test('hero and gallery animate only when visible and pause respects user choice',()=>{
 const s=galleryScene();assert.equal(s.frames.size,0);s.observers[1]([{isIntersecting:true}]);assert.equal(s.frames.size,1);s.tick(1000);const count=s.draws();s.tick(1050);assert.ok(s.draws()>count);
 s.elements.get('.art-motion').events.click();assert.equal(s.frames.size,0);assert.equal(s.elements.get('.art-motion').textContent,'Animate artwork');
 s.preference.matches=true;s.preference.change();assert.equal(s.frames.size,0);
 s.elements.get('.art-motion').events.click();assert.equal(s.frames.size,1);s.document.hidden=true;s.documentEvents.visibilitychange();assert.equal(s.frames.size,0);s.document.hidden=false;s.documentEvents.visibilitychange();assert.equal(s.frames.size,1);
 s.observers[1]([{isIntersecting:false}]);assert.equal(s.frames.size,0);
});
test('reduced motion defaults to still art and gallery selection works without animation',()=>{
 const s=galleryScene({reduced:true});s.observers[0]([{isIntersecting:true}]);assert.equal(s.frames.size,0);const options=s.elements.get('.art-options').children;options[1].events.click();assert.equal(options[1].attributes['aria-pressed'],'true');assert.match(s.elements.get('.art-description').textContent,/flower/);s.document.documentElement.lang='es';options[2].events.click();assert.equal(options[2].textContent,'Ondas de señal');assert.equal(s.frames.size,0);
});
