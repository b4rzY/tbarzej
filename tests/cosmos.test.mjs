import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const code=readFileSync('src/cosmos.js','utf8');
function scene({coarse=false,reduced=false}={}){
 const events=new Map(),frames=new Map();let id=0,lines=0;
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),stroke(){lines++;}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const canvases={'galaxy-canvas':{style:{},getContext:()=>context},'mesh-canvas':{style:{},getContext:()=>context}};
 const w={innerWidth:390,innerHeight:844,devicePixelRatio:3,matchMedia:q=>({matches:q.includes('coarse')?coarse:reduced,addEventListener(){},removeEventListener(){}}),dispatchEvent(){},addEventListener(n,f,opt){events.set(n,{f,opt});},removeEventListener(n){events.delete(n);}};
 const d={hidden:false,getElementById:id=>canvases[id],documentElement:{addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}};
 vm.runInNewContext(code,{window:w,document:d,CustomEvent:function(){},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:id=>frames.delete(id),setTimeout,clearTimeout});
 return {w,events,canvases,lines:()=>lines,tick(time=1000){const [id,f]=frames.entries().next().value;frames.delete(id);f(time);}};
}
test('phone background renders and touch mesh reacts without canceling scroll',()=>{const s=scene({coarse:true});assert.equal(s.canvases['galaxy-canvas'].width,585);const before=s.lines();let prevented=false;s.events.get('touchstart').f({touches:[{clientX:200,clientY:330}],preventDefault(){prevented=true}});s.tick();assert.ok(s.lines()>before);assert.equal(prevented,false);assert.equal(s.events.get('touchmove').opt.passive,true);s.events.get('touchend').f({touches:[]});s.w.portfolioCosmos.destroy();assert.equal(s.events.has('touchstart'),false);});
test('desktop cursor remains interactive and pause stops animation',()=>{const s=scene();const before=s.lines();s.events.get('pointermove').f({clientX:200,clientY:330,pointerType:'mouse'});s.tick();assert.ok(s.lines()>before);s.w.portfolioCosmos.setMotion(false);assert.equal(s.w.portfolioCosmos.getState().motion,false);});
test('reduced motion preserves galaxy but disables motion until opted in',()=>{const s=scene({reduced:true,coarse:true});assert.ok(s.canvases['galaxy-canvas'].width);assert.equal(s.w.portfolioCosmos.getState().motion,false);s.w.portfolioCosmos.setMotion(true);assert.equal(s.w.portfolioCosmos.getState().motion,true);});
test('soundtrack is looping and local with browser-policy fallback',()=>{const html=readFileSync('src/index.html','utf8');assert.match(html,/<audio id="soundtrack-audio" src="assets\/interstellar-theme.mp3" data-loop-start="98" preload="none">/);assert.doesNotMatch(html,/<audio[^>]*autoplay/);assert.ok(readFileSync('src/assets/interstellar-theme.mp3').length>1000000);});

test('audible autoplay attempt has manual fallback and in-flow bottom controls',()=>{const js=readFileSync('src/soundtrack.js','utf8'),css=readFileSync('src/styles.css','utf8');assert.match(js,/Promise.resolve\(\).then\(\(\)=>audio.play\(\)\)/);assert.match(js,/NotAllowedError/);assert.match(js,/autoplayBlocked=true/);assert.match(js,/Tap to listen/);assert.match(css,/position:relative;inset:auto;width:264px/);});

test('galaxy visibly animates with compositor transforms',()=>{const s=scene();s.tick();assert.match(s.canvases['galaxy-canvas'].style.transform,/scale\(1.28\).*translate.*rotate/);});
test('pinch gestures are left to the browser',()=>{const s=scene({coarse:true});s.events.get('touchstart').f({touches:[{clientX:50,clientY:50},{clientX:150,clientY:150}]});assert.equal(s.events.get('touchstart').opt.passive,true);assert.doesNotMatch(readFileSync('src/index.html','utf8'),/user-scalable=no|maximum-scale=1/);});

test("soundtrack starts and repeats at selected phrase",()=>{const s=readFileSync("src/soundtrack.js","utf8");assert.match(s,/audio.dataset.loopStart/);assert.match(s,/loadedmetadata.*,seekCue/);assert.match(s,/ended.*seekCue\(\);audio.play/);});

test("galaxy movement advances over consecutive animation frames",()=>{const s=scene();s.tick(1000);const before=s.canvases["galaxy-canvas"].style.transform;for(let t=1040;t<4000;t+=40)s.tick(t);assert.notEqual(s.canvases["galaxy-canvas"].style.transform,before);});
