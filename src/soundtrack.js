/* Owner-supplied local soundtrack. Autoplay remains subject to browser policy. */
(() => {
 'use strict';
 const root=document.getElementById('soundtrack');if(!root)return;
 const audio=document.getElementById('soundtrack-audio'), play=document.getElementById('soundtrack-play'), toggle=document.getElementById('soundtrack-settings'), panel=document.getElementById('soundtrack-panel'), handle=document.getElementById('soundtrack-drag'), file=document.getElementById('soundtrack-file');
 let url=audio.getAttribute('src')||'',name=url?'Interstellar Main Theme':'',lang='en',drag=null,position=null,failed=false,pending=false,autoplayBlocked=false,userPaused=false,removed=false,generation=0;
 const t=()=>lang==='es'?{title:'Banda sonora',add:'Añade tu audio',play:'Reproducir banda sonora',pause:'Pausar banda sonora',blocked:'Toca para escuchar',ready:'Lista · En bucle',playing:'Sonando · En bucle',loading:'Cargando audio…',error:'No se pudo reproducir. Elige otro archivo.',help:'La música se reproduce en bucle. Si tu navegador bloquea el inicio automático, toca cualquier parte de la página o pulsa Reproducir.',choose:'Elegir audio',volume:'Volumen',reset:'Restablecer posición',close:'Cerrar',drag:'Mover reproductor. Usa las flechas para moverlo e Inicio para restablecer.',type:'Elige un archivo de audio compatible.'}:{title:'Soundtrack',add:'Add your audio',play:'Play soundtrack',pause:'Pause soundtrack',blocked:'Tap to listen',ready:'Ready · Loop on',playing:'Playing · Loop on',loading:'Loading audio…',error:'Unable to play. Choose another file.',help:'Music loops automatically when your browser allows it. If blocked, tap anywhere on the page or press Play to listen.',choose:'Choose audio file',volume:'Volume',reset:'Reset position',close:'Close',drag:'Move soundtrack player. Use arrow keys to move, Home to reset.',type:'Choose a supported audio file.'};
 const text=(id,value)=>document.getElementById(id).textContent=value;
 const announce=value=>text('soundtrack-announcement',value);
 function render(){const c=t(),playing=!audio.paused&&!audio.ended;root.classList.toggle('is-playing',playing);root.setAttribute('aria-label',c.title);text('soundtrack-title',name||c.title);text('soundtrack-status',failed?c.error:pending?c.loading:!url?c.add:playing?c.playing:autoplayBlocked?c.blocked:c.ready);play.setAttribute('aria-label',playing?c.pause:c.play);play.disabled=!url||pending;handle.setAttribute('aria-label',c.drag);text('soundtrack-explainer',c.help);text('soundtrack-file-label',c.choose);file.setAttribute('aria-label',c.choose);text('soundtrack-volume-label',c.volume);text('soundtrack-reset',c.reset);text('soundtrack-close',c.close);}
 function setOpen(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open&&position)place(position.x,position.y);}
 function place(x,y){const margin=12,w=root.offsetWidth,h=root.offsetHeight;position={x:Math.min(Math.max(margin,x),Math.max(margin,innerWidth-w-margin)),y:Math.min(Math.max(margin,y),Math.max(margin,innerHeight-h-margin))};root.style.left=position.x+'px';root.style.top=position.y+'px';root.style.bottom='auto';}
 function reset(){position=null;root.style.left='';root.style.top='';root.style.bottom='';}
 toggle.addEventListener('click',()=>setOpen(panel.hidden));
 document.getElementById('soundtrack-close').addEventListener('click',()=>{setOpen(false);toggle.focus();});
 document.getElementById('soundtrack-reset').addEventListener('click',reset);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){setOpen(false);toggle.focus();}});
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))setOpen(false);});
 function disarmUnlock(){document.removeEventListener('click',unlockOnGesture,true);}
 function startPlayback(){
  if(!url)return;const token=++generation;failed=false;autoplayBlocked=false;pending=true;render();
  let attempt;try{attempt=audio.play();}catch(error){attempt=Promise.reject(error);}
  Promise.resolve(attempt).then(()=>{if(token===generation)disarmUnlock();}).catch(error=>{
   if(token!==generation)return;
   if(error?.name==='NotAllowedError'){autoplayBlocked=true;announce(t().blocked);}
   else if(error?.name!=='AbortError'){failed=true;announce(t().error);}
  }).finally(()=>{if(token===generation){pending=false;render();}});
 }
 function unlockOnGesture(event){
  if(!event.isTrusted||userPaused||!audio.paused||event.target?.closest?.('#soundtrack-play'))return;
  // Call play synchronously in this trusted click, preserving Safari user activation.
  startPlayback();
 }
 document.addEventListener('click',unlockOnGesture,true);
 play.addEventListener('click',()=>{
  if(!url)return;
  if(!audio.paused){userPaused=true;generation++;pending=false;disarmUnlock();audio.pause();render();return;}
  userPaused=false;startPlayback();
 });
 file.addEventListener('change',()=>{const selected=file.files?.[0];if(!selected)return;if(selected.type&&!selected.type.startsWith('audio/')){announce(t().type);return;}generation++;audio.pause();if(url.startsWith('blob:'))URL.revokeObjectURL(url);url=URL.createObjectURL(selected);name=selected.name.replace(/\.[^.]+$/,'');audio.src=url;failed=false;pending=false;render();announce(t().ready);play.focus();});
 document.getElementById('soundtrack-volume').addEventListener('input',e=>{audio.volume=Number(e.target.value);});audio.volume=.35;
 const cue=Number(audio.dataset.loopStart)||0;
 const seekCue=()=>{if(Number.isFinite(audio.duration)&&audio.duration>cue)audio.currentTime=cue;};
 audio.addEventListener('loadedmetadata',seekCue,{once:true});
 audio.addEventListener('ended',()=>{seekCue();audio.play().catch(error=>{autoplayBlocked=error?.name==='NotAllowedError';failed=!autoplayBlocked;render();});});
 for(const event of ['play','pause','ended','loadedmetadata'])audio.addEventListener(event,render);
 audio.addEventListener('error',()=>{failed=true;pending=false;render();announce(t().error);});
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=root.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};handle.setPointerCapture(e.pointerId);root.classList.add('is-dragging');});
 handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)place(e.clientX-drag.dx,e.clientY-drag.dy);});
 function endDrag(){drag=null;root.classList.remove('is-dragging');}
 handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);handle.addEventListener('lostpointercapture',endDrag);
 handle.addEventListener('keydown',e=>{const delta={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]}[e.key];if(e.key==='Home'){e.preventDefault();reset();}if(delta){e.preventDefault();const r=root.getBoundingClientRect();place(r.left+delta[0],r.top+delta[1]);}});
 window.addEventListener('resize',()=>{if(position)place(position.x,position.y);});
 window.addEventListener('pagehide',e=>{audio.pause();if(!e.persisted&&url.startsWith('blob:')){URL.revokeObjectURL(url);removed=true;}});
 window.portfolioSoundtrack={setLanguage(next){lang=next==='es'?'es':'en';render();},getState(){return{playing:!audio.paused,hasSource:!!url,position,failed,pending,autoplayBlocked,userPaused,removed};}};
 render();
 // Try once without a gesture; first real tap/click can unlock if policy blocks it.
 if(url)startPlayback();
})();
;
