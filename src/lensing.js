/* Local optical displacement of actual DOM pixels. No screen capture, webcam,
   cloned content or external services. SVG filters preserve text and links. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const radius=170, size=256;
  const map=document.createElement('canvas'); map.width=map.height=size;
  const context=map.getContext('2d'); if(!context)return;
  const pixels=context.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),r=Math.hypot(dx,dy);
    // Smooth compact radial field. Neutral at both center and perimeter, with
    // an asymmetric swirl near the photon ring rather than a magnifying glass.
    const strength=r<1?Math.sin(Math.PI*r)**2*.85:0;
    const turn=.32*(1-Math.min(r,1));
    const i=(y*size+x)*4;
    pixels.data[i]=128+127*strength*(dx+dy*turn);
    pixels.data[i+1]=128+127*strength*(dy-dx*turn);
    pixels.data[i+2]=128; pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  const source=map.toDataURL();
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.style.cssText='position:absolute;pointer-events:none';
  const defs=document.createElementNS(NS,'defs');svg.append(defs);document.body.append(svg);
  const halo=document.createElement('div');halo.className='gravity-horizon';halo.setAttribute('aria-hidden','true');
  halo.innerHTML='<span class="gravity-disk"></span><span class="gravity-core"></span>';
  document.body.append(halo);
  const active=new Map();let x=-1000,y=-1000,tx=x,ty=y,frame=0,visible=false,last=0;
  const selectors='#cosmos,.masthead,.intro-main,#core-stage,.section-heading,.case,.exhibit,.focus-heading,.focus-list,#background,#contact,footer,#motion-studies';
  function reset(){for(const [el,{filter,original}] of active){el.style.filter=original;filter.remove();}active.clear();halo.classList.remove('visible');}
  function activate(el){
    const filter=document.createElementNS(NS,'filter');const id='gravity-'+Math.random().toString(36).slice(2);
    filter.id=id;filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('primitiveUnits','userSpaceOnUse');filter.setAttribute('color-interpolation-filters','sRGB');
    filter.innerHTML='<feFlood flood-color="rgb(128,128,128)" result="neutral"/><feImage width="340" height="340" result="field"/><feMerge result="map"><feMergeNode in="neutral"/><feMergeNode in="field"/></feMerge><feDisplacementMap in="SourceGraphic" in2="map" scale="110" xChannelSelector="R" yChannelSelector="G"/>';
    const image=filter.querySelector('feImage');image.setAttribute('href',source);defs.append(filter);
    const original=el.style.filter;el.style.filter=`url(#${id})`;active.set(el,{filter,image,original});return active.get(el);
  }
  function render(time){
    frame=0;if(!visible||document.hidden||reduced.matches){reset();return;}
    if(time-last<30){frame=requestAnimationFrame(render);return;}last=time;
    x+=(tx-x)*.48;y+=(ty-y)*.48;
    halo.style.transform=`translate3d(${x}px,${y}px,0)`;halo.classList.add('visible');
    const candidates=[...document.querySelectorAll(selectors)];const keep=new Set();
    for(const el of candidates){
      const rect=el.getBoundingClientRect();
      if(rect.width===0||rect.height===0||x<rect.left-radius||x>rect.right+radius||y<rect.top-radius||y>rect.bottom+radius)continue;
      // Never apply twice through an ancestor. Filter one painted surface at a time.
      if(candidates.some(other=>other!==el&&other.contains(el)))continue;
      keep.add(el);const state=active.get(el)||activate(el);
      state.filter.setAttribute('x','-60');state.filter.setAttribute('y','-60');
      state.filter.setAttribute('width',String(rect.width+120));state.filter.setAttribute('height',String(rect.height+120));
      state.image.setAttribute('x',String(x-rect.left-radius));state.image.setAttribute('y',String(y-rect.top-radius));
    }
    for(const [el,state]of active)if(!keep.has(el)){el.style.filter=state.original;state.filter.remove();active.delete(el);}
    if(Math.hypot(tx-x,ty-y)>.2)frame=requestAnimationFrame(render);
  }
  function update(event){if(reduced.matches)return;tx=event.clientX;ty=event.clientY;if(!visible){x=tx;y=ty;}visible=true;if(!frame)frame=requestAnimationFrame(render);}
  function stop(){visible=false;cancelAnimationFrame(frame);frame=0;reset();}
  window.addEventListener('pointermove',update,{passive:true});
  window.addEventListener('pointerdown',update,{passive:true});
  window.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')stop();},{passive:true});
  document.documentElement.addEventListener('pointerleave',stop);
  window.addEventListener('blur',stop);window.addEventListener('resize',stop);
  window.addEventListener('scroll',()=>{if(visible&&!frame)frame=requestAnimationFrame(render);},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',stop);
  // Keyboard users keep unwarped, readable controls. Touch never cancels scrolling.
  document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key==='Escape')stop();});
  window.portfolioGravity={getState:()=>({active:visible&&!reduced.matches,surfaces:active.size,radius}),reset:stop};
})();
