import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const code=readFileSync('src/cosmos.js','utf8');
function scene({coarse=false,reduced=false}={}){
 const events=new Map(),frames=new Map();let id=0,lines=0;
 const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),stroke(){lines++;}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const canvases={'galaxy-canvas':{style:{},getContext:()=>context},'mesh-canvas':{style:{},getContext:()=>context}};
 const w={innerWidth:390,innerHeight:844,devicePixelRatio:3,matchMedia:q=>({matches:q.includes('coarse')?coarse:reduced,addEventListener(){},removeEventListener(){}}),dispatchEvent(){},addEventListener(n,f,opt){events.set(n,{f,opt});},removeEventListener(n){events.delete(n);}};
 const d={hidden:false,getElementById:id=>canvases[id],documentElement:{addEventListener(){},removeEventListener(){}},addEventListener(){},removeEventListener(){}};
 vm.runInNewContext(code,{window:w,document:d,CustomEvent:function(){},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:id=>frames.delete(id),setTimeout,clearTimeout});
 return {w,events,canvases,lines:()=>lines,tick(){const [id,f]=frames.entries().next().value;frames.delete(id);f(1000);}};
}
test('phone background renders and touch mesh reacts without canceling scroll',()=>{const s=scene({coarse:true});assert.equal(s.canvases['galaxy-canvas'].width,585);const before=s.lines();let prevented=false;s.events.get('touchstart').f({touches:[{clientX:200,clientY:330}],preventDefault(){prevented=true}});s.tick();assert.ok(s.lines()>before);assert.equal(prevented,false);assert.equal(s.events.get('touchmove').opt.passive,true);s.events.get('touchend').f({touches:[]});s.w.portfolioCosmos.destroy();assert.equal(s.events.has('touchstart'),false);});
test('desktop cursor remains interactive and pause stops animation',()=>{const s=scene();const before=s.lines();s.events.get('pointermove').f({clientX:200,clientY:330,pointerType:'mouse'});s.tick();assert.ok(s.lines()>before);s.w.portfolioCosmos.setMotion(false);assert.equal(s.w.portfolioCosmos.getState().motion,false);});
test('reduced motion preserves galaxy but disables motion until opted in',()=>{const s=scene({reduced:true,coarse:true});assert.ok(s.canvases['galaxy-canvas'].width);assert.equal(s.w.portfolioCosmos.getState().motion,false);s.w.portfolioCosmos.setMotion(true);assert.equal(s.w.portfolioCosmos.getState().motion,true);});
test('soundtrack is user initiated, looping, and local',()=>{const html=readFileSync('src/index.html','utf8');assert.match(html,/<audio id="soundtrack-audio" src="assets\/interstellar-theme.mp3" loop preload="none">/);assert.doesNotMatch(html,/<audio[^>]*autoplay/);assert.ok(readFileSync('src/assets/interstellar-theme.mp3').length>1000000);});
