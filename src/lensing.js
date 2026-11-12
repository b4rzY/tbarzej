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
  // Keep the existing cosmos cursor; never draw a second foreground cursor.
  const active=new Map();let x=-1000,y=-1000,frame=0,visible=false,touch=false,lastTouchFrame=0,releaseTimer=0;
  const candidates=[...document.querySelectorAll('h1,h2,h3,p,.case img,.showcase-title,.showcase-copy')];
  function reset(){for(const [el,{filter,original}] of active){el.style.filter=original;filter.remove();}active.clear();}
  function activate(el){
    const filter=document.createElementNS(NS,'filter');const id='gravity-'+Math.random().toString(36).slice(2);
    filter.id=id;filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('primitiveUnits','userSpaceOnUse');filter.setAttribute('color-interpolation-filters','sRGB');
    filter.innerHTML='<feFlood flood-color="rgb(128,128,128)" result="neutral"/><feImage width="340" height="340" result="field"/><feMerge result="map"><feMergeNode in="neutral"/><feMergeNode in="field"/></feMerge><feDisplacementMap in="SourceGraphic" in2="map" scale="110" xChannelSelector="R" yChannelSelector="G" result="bent"/><feComposite in="SourceGraphic" in2="field" operator="out" result="outside"/><feComposite in="bent" in2="field" operator="in" result="inside"/><feMerge><feMergeNode in="outside"/><feMergeNode in="inside"/></feMerge>';
    const image=filter.querySelector('feImage');image.setAttribute('href',source);defs.append(filter);
    const original=el.style.filter;el.style.filter=`url(#${id})`;active.set(el,{filter,image,original});return active.get(el);
  }
  function render(time){
    frame=0;if(!visible||document.hidden){reset();return;}
    if(touch&&time-lastTouchFrame<40){frame=requestAnimationFrame(render);return;}if(touch)lastTouchFrame=time;
    const keep=new Set();
    const nearby=candidates.map(el=>({el,rect:el.getBoundingClientRect()})).filter(({rect})=>rect.width>0&&rect.height>0&&rect.width*rect.height<(touch?180000:500000)&&x>rect.left-radius&&x<rect.right+radius&&y>rect.top-radius&&y<rect.bottom+radius).sort((a,b)=>Math.hypot(x-(a.rect.left+a.rect.width/2),y-(a.rect.top+a.rect.height/2))-Math.hypot(x-(b.rect.left+b.rect.width/2),y-(b.rect.top+b.rect.height/2))).slice(0,touch?1:3);
    for(const {el,rect} of nearby){
      keep.add(el);const state=active.get(el)||activate(el);
      for(const primitive of [state.filter,...state.filter.children]){if(primitive===state.image)continue;primitive.setAttribute('x','-60');primitive.setAttribute('y','-60');primitive.setAttribute('width',String(rect.width+120));primitive.setAttribute('height',String(rect.height+120));}
      const localRadius=touch?120:radius;state.image.setAttribute('width',String(localRadius*2));state.image.setAttribute('height',String(localRadius*2));state.filter.querySelector('feDisplacementMap').setAttribute('scale',touch?'95':'110');
      state.image.setAttribute('x',String(x-rect.left-localRadius));state.image.setAttribute('y',String(y-rect.top-localRadius));
    }
    for(const [el,state]of active)if(!keep.has(el)){el.style.filter=state.original;state.filter.remove();active.delete(el);}
  }
  function update(event){
    if((window.visualViewport?.scale||1)>1.05){stop();return;}
    touch=event.pointerType==='touch'||matchMedia('(pointer: coarse)').matches;
    clearTimeout(releaseTimer);x=event.clientX;y=event.clientY;visible=true;if(!frame)frame=requestAnimationFrame(render);
  }
  function stop(){clearTimeout(releaseTimer);visible=false;cancelAnimationFrame(frame);frame=0;reset();}
  window.addEventListener('pointermove',update,{passive:true});
  window.addEventListener('pointerdown',update,{passive:true});
  const release=()=>{clearTimeout(releaseTimer);releaseTimer=setTimeout(stop,180);};
  window.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')release();},{passive:true});
  const followTouch=e=>{if(e.touches.length!==1){stop();return;}const p=e.touches[0];update({clientX:p.clientX,clientY:p.clientY,pointerType:'touch'});};
  window.addEventListener('touchstart',followTouch,{passive:true});
  window.addEventListener('touchmove',followTouch,{passive:true});
  window.addEventListener('touchend',release,{passive:true});
  window.addEventListener('touchcancel',stop,{passive:true});
  window.addEventListener('pointercancel',stop,{passive:true});
  document.documentElement.addEventListener('pointerleave',stop);
  window.addEventListener('blur',stop);window.addEventListener('resize',stop);
  window.addEventListener('scroll',()=>{if(touch&&visible){if(!frame)frame=requestAnimationFrame(render);}else stop();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',stop);
  // Reduced motion removes ambient animation elsewhere. This direct, non-inertial
  // pointer feedback remains visible on desktop, without autoplay or trailing.
  document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key==='Escape')stop();});
  window.portfolioGravity={getState:()=>({active:visible,surfaces:active.size,touch,radius}),reset:stop};
})();
