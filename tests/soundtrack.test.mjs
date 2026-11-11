import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const code=readFileSync('src/soundtrack.js','utf8');
function setup(){
 const docEvents=new Map(),elements=new Map();let calls=0;
 function element(id){if(elements.has(id))return elements.get(id);const handlers=new Map();const el={handlers,id,style:{},dataset:{loopStart:'98'},classList:{toggle(){},add(){},remove(){}},setAttribute(){},getAttribute:()=>id==='soundtrack-audio'?'assets/interstellar-theme.mp3':null,addEventListener:(name,fn)=>{const h=handlers.get(name)||[];h.push(fn);handlers.set(name,h);},removeEventListener(){},contains:()=>false,focus(){},getBoundingClientRect:()=>({left:0,top:0}),offsetWidth:264,offsetHeight:64,hidden:true,paused:true,ended:false,duration:775,currentTime:0};elements.set(id,el);return el;}
 const audio=element('soundtrack-audio');audio.play=()=>{calls++;if(calls===1)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));audio.paused=false;return Promise.resolve();};audio.pause=()=>{audio.paused=true;};
 const document={getElementById:element,addEventListener:(n,f)=>docEvents.set(n,f),removeEventListener:(n,f)=>{if(docEvents.get(n)===f)docEvents.delete(n);}};
 vm.runInNewContext(code,{document,window:{addEventListener(){}},URL,Promise,innerWidth:390,innerHeight:844});
 const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
 return {audio,docEvents,element,calls:()=>calls,flush};
}
test('first trusted page click unlocks blocked audio then deliberate pause sticks',async()=>{const s=setup();await s.flush();assert.equal(s.calls(),1);assert.equal(s.audio.paused,true);s.docEvents.get('click')({isTrusted:true,target:{closest:()=>null}});assert.equal(s.calls(),2,'play is called synchronously in the gesture');await s.flush();assert.equal(s.audio.paused,false);assert.equal(s.docEvents.has('click'),false);s.element('soundtrack-play').handlers.get('click')[0]();assert.equal(s.audio.paused,true);assert.equal(s.docEvents.has('click'),false);assert.equal(s.calls(),2);});
test('synthetic clicks and the player button do not double-trigger page unlock',async()=>{const s=setup();await s.flush();const click=s.docEvents.get('click');click({isTrusted:false,target:{closest:()=>null}});click({isTrusted:true,target:{closest:()=>({})}});assert.equal(s.calls(),1);s.element('soundtrack-play').handlers.get('click')[0]();await s.flush();assert.equal(s.calls(),2);assert.equal(s.audio.paused,false);});
