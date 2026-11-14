/* Original interactive character studies, rendered locally. */
(function(){
'use strict';
const root=document.querySelector('[data-art-gallery]');if(!root||!window.portfolioAscii)return;
const text={en:{title:'Small characters. Infinite possibilities.',intro:'Letters, numbers and a little mathematics. Three original studies rendered live, not video.',names:['Event horizon','Petal field','Signal waves'],copy:['An accretion disk bends around an absence of light. An illustrative study, not a physical simulation.','Five-fold symmetry grows into a slowly changing flower.','Interfering waves become a living typographic landscape.'],pause:'Pause artwork',play:'Animate artwork',note:'Original code studies. ASCII inspiration: JIN2.'},es:{title:'Pequeños caracteres. Infinitas posibilidades.',intro:'Letras, números y un poco de matemática. Tres estudios originales en tiempo real, no videos.',names:['Horizonte de eventos','Campo de pétalos','Ondas de señal'],copy:['Un disco de acreción rodea la ausencia de luz. Un estudio visual, no una simulación física.','La simetría de cinco pliegues crea una flor que cambia lentamente.','Ondas que interfieren forman un paisaje tipográfico vivo.'],pause:'Pausar arte',play:'Animar arte',note:'Estudios de código originales. Inspiración ASCII: JIN2.'}};
root.innerHTML='<div class="art-heading"><h2></h2><p></p></div><div class="art-stage"><canvas aria-hidden="true"></canvas></div><div class="art-controls" role="group"><div class="art-options"></div><button type="button" class="art-motion"></button></div><p class="art-description" aria-live="polite"></p><p class="art-credit"></p>';
const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let motion=!reduced.matches,chosen=false,visible=false,frame=0,last=0,time=0,w=0,h=0,mode=0;
const modes=['horizon','bloom','wave'];
function renderText(){const t=text[document.documentElement.lang==='es'?'es':'en'];root.querySelector('h2').textContent=t.title;root.querySelector('.art-heading p').textContent=t.intro;root.querySelector('.art-controls').setAttribute('aria-label',document.documentElement.lang==='es'?'Controles de arte':'Artwork controls');root.querySelector('.art-description').textContent=t.copy[mode];root.querySelector('.art-credit').textContent=t.note;root.querySelector('.art-motion').textContent=motion?t.pause:t.play;root.querySelectorAll('[data-art-mode]').forEach((b,i)=>{b.textContent=t.names[i];b.setAttribute('aria-pressed',String(i===mode));});}
for(let i=0;i<3;i++){const button=document.createElement('button');button.type='button';button.dataset.artMode=String(i);button.addEventListener('click',()=>{mode=i;renderText();draw();});root.querySelector('.art-options').append(button);}
function draw(){ctx.fillStyle='#05070b';ctx.fillRect(0,0,w,h);window.portfolioAscii.draw(ctx,w,h,time,{mode:modes[mode]});}
function tick(now){frame=0;if(!motion||!visible||document.hidden)return;if(now-last>=1000/24){time+=last?Math.min(now-last,80)/1000:0;last=now;draw();}frame=requestAnimationFrame(tick);}
function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
function start(){if(!frame&&motion&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);draw();}
root.querySelector('.art-motion').addEventListener('click',()=>{motion=!motion;chosen=true;renderText();motion?start():stop();});
new ResizeObserver(resize).observe(canvas);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?start():stop();}).observe(root);
new MutationObserver(renderText).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());reduced.addEventListener('change',()=>{if(!chosen){motion=!reduced.matches;renderText();motion?start():stop();}});
renderText();resize();
})();
