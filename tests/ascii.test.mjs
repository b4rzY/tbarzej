import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/ascii-art.js','utf8');
const module={exports:{}};vm.runInNewContext(source,{module});const {sample,draw}=module.exports;
test('all character fields stay finite and normalized',()=>{for(const mode of ['horizon','bloom','wave','rose','dollar'])for(let x=-1.5;x<=1.5;x+=.09)for(let y=-1;y<=1;y+=.09){const n=sample(x,y,22,mode);assert.ok(Number.isFinite(n)&&n>=0&&n<=1);}});
test('event horizon remains dark and each field evolves',()=>{assert.equal(sample(0,0,0),0);for(const mode of ['horizon','bloom','wave','rose','dollar']){let changed=false;for(let x=.2;x<1;x+=.1)if(Math.abs(sample(x,.15,0,mode)-sample(x,.15,6,mode))>.01)changed=true;assert.ok(changed,mode);}});
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
test('art loops automatically, suspends hidden work and has no opt-in control',()=>{
 const s=galleryScene({reduced:true});assert.equal(s.frames.size,0);s.observers[1]([{isIntersecting:true}]);assert.equal(s.frames.size,1);s.tick(1000);const count=s.draws();s.tick(1050);assert.ok(s.draws()>count);
 s.document.hidden=true;s.documentEvents.visibilitychange();assert.equal(s.frames.size,0);s.document.hidden=false;s.documentEvents.visibilitychange();assert.equal(s.frames.size,1);s.observers[1]([{isIntersecting:false}]);assert.equal(s.frames.size,0);
 assert.doesNotMatch(readFileSync('src/art-gallery.js','utf8'),/class="art-motion"/);
});
test('gallery selection and translation work during automatic loops',()=>{
 const s=galleryScene({reduced:true});s.observers[0]([{isIntersecting:true}]);assert.equal(s.frames.size,1);const options=s.elements.get('.art-options').children;options[1].events.click();assert.equal(options[1].attributes['aria-pressed'],'true');assert.match(s.elements.get('.art-description').textContent,/flower/);s.document.documentElement.lang='es';options[2].events.click();assert.equal(options[2].textContent,'Ondas de señal');assert.equal(s.frames.size,1);
});

test('published UI contains no animation opt-in buttons and keeps interaction controls',()=>{const html=readFileSync('src/index.html','utf8');assert.doesNotMatch(html,/id="core-motion"|data-city-action="motion"/);assert.match(html,/id="core-interact"/);assert.match(html,/data-city-action="interact"/);assert.doesNotMatch(readFileSync('src/showcase.js','utf8'),/class="showcase-pause"/);});

test('rose and fictional dollar are distinct original fields with bounded render cost',()=>{assert.ok(sample(0,.15,1,'dollar')>.5);assert.equal(sample(1.4,0,1,'dollar'),0);assert.equal(sample(1,1,1,'rose'),0);for(const mode of ['rose','dollar']){let count=0;const ctx=new Proxy({globalAlpha:1,fillText(){count++;}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});draw(ctx,1200,430,2,{mode});assert.ok(count>200&&count<12000);}});
test('Zeus portrait uses the supplied photo colors, fits bounded character grid and strips room',()=>{const w={};vm.runInNewContext(readFileSync('src/zeus-data.js','utf8'),{window:w});assert.equal(w.zeusAscii.length,201);assert.ok(w.zeusAscii.every(r=>r.length===540));assert.ok(w.zeusAscii[0].includes('---'));const m={exports:{}};vm.runInNewContext(source,{module:m,window:w});let count=0;const ctx=new Proxy({globalAlpha:1,fillText(){count++;}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});m.exports.draw(ctx,390,250,1,{mode:'zeus'});assert.ok(count>1000&&count<36180);assert.match(readFileSync('Tomas-Portfolio-Review.html','utf8'),/window.zeusAscii=/);assert.doesNotMatch(readFileSync('Tomas-Portfolio-Review.html','utf8'),/<script src="zeus-data.js"/);});
test('recognizable studies use cached character atlases and visible spatial animation',()=>{const win={};vm.runInNewContext(readFileSync('src/study-data.js','utf8'),{window:win});vm.runInNewContext(readFileSync('src/zeus-data.js','utf8'),{window:win});let textCalls=0,imageCalls=0;const transforms=[];const context=new Proxy({fillText(){textCalls++;},drawImage(){imageCalls++;},translate(...a){transforms.push(a);},rotate(a){transforms.push(a);}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});const mod={exports:{}};vm.runInNewContext(source,{window:win,module:mod,document:{createElement:()=>({getContext:()=>context})}});for(const mode of ['rose','dollar','zeus']){mod.exports.draw(context,390,250,0,{mode});const first=textCalls;const before=JSON.stringify(transforms.slice(-2));mod.exports.draw(context,390,250,1,{mode});assert.equal(textCalls,first,'letter atlas must not rebuild every frame');assert.notEqual(JSON.stringify(transforms.slice(-2)),before);assert.ok(imageCalls>0);}assert.ok(textCalls<90000);assert.equal(win.originalAsciiStudies.rose.length,160);assert.equal(win.originalAsciiStudies.dollar.length,120);});
