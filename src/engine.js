/* A small, dependency-free 3D sculpture (WebGL + software projection). All surfaces are real, beveled meshes. */
(() => {
  'use strict';
  const boot = () => {
    const canvas = document.getElementById('core-canvas');
    const stage = document.getElementById('core-stage');
    if (!canvas || !stage) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const state = { ready: false, available: false, exploded: true, selectedLayer: -1, motion: !reduced.matches, zoom: 1, renderer: 'static' };
    let gl, ctx2d, softwareCanvas, lastSoftwareDraw = -Infinity, program, shadowProgram, mesh, shadowBuffer, disposed = false, lost = false;
    let raf = 0, visible = true, width = 1, height = 1, last = 0, phase = 0;
    let yaw = -.56, pitch = .46, separation = 1, targetSeparation = 1;
    let drawModels = [], pointers = new Map(), gesture = null, dragged = false;
    const removers = [];
    const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); removers.push(() => el.removeEventListener(type, fn, opts)); };
    const emit = reason => {
      if (reason !== undefined) state.reason = reason;
      stage.dataset.engine = state.renderer;
      document.dispatchEvent(new CustomEvent('corestatechange', { detail: { ...state } }));
    };
    const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    const multiply = (a, b) => {
      const o = new Float32Array(16);
      for(let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) o[c*4+r] += a[k*4+r]*b[c*4+k];
      return o;
    };
    const rotation = (x,y) => {
      const a=identity(), b=identity(), cx=Math.cos(x), sx=Math.sin(x), cy=Math.cos(y), sy=Math.sin(y);
      a[5]=cx;a[6]=sx;a[9]=-sx;a[10]=cx;
      b[0]=cy;b[2]=-sy;b[8]=sy;b[10]=cy;
      return multiply(a,b);
    };
    const transform = (m,p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
    const compile = (type, source) => {
      const shader = gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {const e=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(e);}
      return shader;
    };
    const link = (vs,fs) => {
      const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
      return p;
    };
    function makeMesh(software = false) {
      const vertices=[], normals=[], indices=[];
      const corners=software?12:24, count=corners*4, half=1.34, radius=.32, thick=.115, bevel=.055, rings=[];
      // Nine quarter-circle bevel rings preserve smooth highlights around every edge.
      for(let j=0;j<=8;j++) {
        const t=j/8*Math.PI, y=Math.cos(t)*thick, inset=bevel*(1-Math.sin(t));
        const ring=[];
        for(let i=0;i<count;i++) {
          const quadrant=Math.floor(i/corners), angle=(quadrant+(i%corners)/(corners-1))*Math.PI/2;
          const nx=Math.cos(angle), nz=Math.sin(angle);
          // Corner centers match the quadrant of the sampled circular normal.
          const centerX=(Math.cos((quadrant+.5)*Math.PI/2)>0?1:-1)*(half-radius);
          const centerZ=(Math.sin((quadrant+.5)*Math.PI/2)>0?1:-1)*(half-radius);
          ring.push(vertices.length/3);vertices.push(centerX+(radius-inset)*nx,y,centerZ+(radius-inset)*nz);
          normals.push(nx*Math.sin(t),Math.cos(t),nz*Math.sin(t));
        }
        rings.push(ring);
      }
      for(let r=0;r<rings.length-1;r++) for(let i=0;i<count;i++) {
        const n=(i+1)%count,a=rings[r][i],b=rings[r][n],c=rings[r+1][i],d=rings[r+1][n];
        indices.push(a,c,b,b,c,d);
      }
      for(const [r,sign] of [[0,1],[8,-1]]) {
        const c=vertices.length/3;vertices.push(0,sign*thick,0);normals.push(0,sign,0);
        for(let i=0;i<count;i++) indices.push(c,rings[r][i],rings[r][(i+1)%count]);
      }
      if(software)return {vertices,normals,indices,rings,count:indices.length};
      const buffer=(type,data)=>{const b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b;};
      return {position:buffer(gl.ARRAY_BUFFER,new Float32Array(vertices)),normal:buffer(gl.ARRAY_BUFFER,new Float32Array(normals)),index:buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices)),count:indices.length,vertices,indices};
    }
    const vertexSource=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uProjection;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;void main(){vec4 p=uModel*vec4(aPosition,1.0);vPosition=p.xyz;vNormal=mat3(uModel)*aNormal;vLocal=aPosition;gl_Position=uProjection*p;}`;
    const fragmentSource=`precision highp float;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;uniform float uGlass;uniform float uSelected;uniform float uTime;uniform vec3 uTint;
      vec3 environment(vec3 r){float sky=smoothstep(-.6,.85,r.y);vec3 col=mix(vec3(.20,.22,.29),vec3(.94,.94,1.),sky);float strip=pow(max(0.,1.-abs(dot(r,normalize(vec3(.6,.8,.15)))-.28)*2.2),12.);float strip2=pow(max(0.,1.-abs(r.x+.64)*3.5),20.);col+=vec3(1.,.97,.94)*strip*.85;col+=vec3(.68,.77,1.)*strip2*.55;col+=vec3(.36,.21,.55)*pow(max(0.,r.x),4.)*.3;return col;}
      void main(){vec3 n=normalize(vNormal);vec3 eye=normalize(vec3(0.,0.,9.)-vPosition);vec3 r=reflect(-eye,n);float f=pow(1.-max(dot(n,eye),0.),3.);float light=max(dot(n,normalize(vec3(-.5,.9,1.2))),0.);vec3 env=environment(r);vec3 metal=mix(uTint*(.69+light*.25),env,.45+f*.43);float top=smoothstep(.75,.99,abs(vLocal.y)/.115);vec3 glass=mix(vec3(.69,.79,.96),vec3(.90,.85,.99),smoothstep(-1.3,1.3,vLocal.x));glass=mix(glass,env,.24+f*.62);glass+=vec3(.32,.5,.65)*pow(f,2.)*.45;float wave=sin(vLocal.x*2.1+vLocal.z*1.4)*.5+.5;glass+=vec3(.025,.035,.05)*wave;vec3 color=mix(metal,glass,uGlass);float highlight=pow(max(dot(reflect(-normalize(vec3(-.45,.8,1.3)),n),eye),0.),80.);color+=highlight*.44;color+=uSelected*vec3(.12,.25,.39)*(.18+f*.7);color=pow(max(color,vec3(0.)),vec3(.92));gl_FragColor=vec4(color,1.);}`;
    function initialize() {
      try {
        gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});
        if(!gl){initializeSoftware();return;}
        const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
        program=link(vertexSource,precision&&precision.precision?fragmentSource:fragmentSource.replace('precision highp float','precision mediump float'));
        shadowProgram=link(`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition;gl_Position=vec4(aPosition,0.,1.);}`,`precision mediump float;varying vec2 vUV;uniform float uAspect;uniform float uZoom;void main(){vec2 p=(vUV-vec2(0.,-.73*uZoom))*vec2(1.,4.4);float d=dot(p,p);float a=exp(-d*8./(uZoom*uZoom))*.16;gl_FragColor=vec4(.27,.28,.41,a);}`);
        shadowBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,shadowBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        mesh=makeMesh();if(softwareCanvas){softwareCanvas.remove();softwareCanvas=null;}state.renderer='webgl';lost=false;state.available=true;state.ready=false;if(reduced.matches)state.motion=false;resize();request();
      } catch(error) { console.warn('Portfolio WebGL fallback:', error.message);initializeSoftware(); }
    }
    function initializeSoftware() {
      // A canvas that has acquired WebGL cannot later acquire a 2D context.
      // Preserve the original canvas as the stable event/focus surface.
      if(gl&&!softwareCanvas){
        softwareCanvas=document.createElement('canvas');
        softwareCanvas.setAttribute('aria-hidden','true');softwareCanvas.tabIndex=-1;
        softwareCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        stage.insertBefore(softwareCanvas,canvas);
      }
      try { ctx2d=(softwareCanvas||canvas).getContext('2d',{alpha:true}); } catch (_) { ctx2d=null; }
      if(!ctx2d){if(softwareCanvas){softwareCanvas.remove();softwareCanvas=null;}state.available=false;state.ready=false;state.renderer='static';stage.classList.remove('is-live');emit('WebGL is unavailable and software drawing is unsupported. The rendered preview remains available.');return;}
      gl=null;mesh=makeMesh(true);lost=false;state.renderer='canvas2d';state.available=true;state.ready=false;
      if(reduced.matches)state.motion=false;lastSoftwareDraw=-Infinity;resize();request();
    }
    function renderSoftware() {
      const c=ctx2d,surface=softwareCanvas||canvas,w=surface.width,h=surface.height;
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
      c.save();c.translate(w*.5,h*.79);c.scale(w*.34*state.zoom,h*.055*state.zoom);
      const shadow=c.createRadialGradient(0,0,.1,0,0,1);shadow.addColorStop(0,'rgba(80,78,110,.21)');shadow.addColorStop(.5,'rgba(90,86,120,.09)');shadow.addColorStop(1,'rgba(90,86,120,0)');
      c.fillStyle=shadow;c.fillRect(-1,-1,2,2);c.restore();
      const rgb=(r,g,b)=>`rgb(${Math.round(clamp(r,0,255))},${Math.round(clamp(g,0,255))},${Math.round(clamp(b,0,255))})`;
      for(const item of drawModels){
        const matrix=multiply(item.projection,item.model),points=[],normalMatrix=new Float32Array(item.model);
        normalMatrix[12]=normalMatrix[13]=normalMatrix[14]=0;
        for(let i=0;i<mesh.vertices.length;i+=3){const p=transform(matrix,mesh.vertices.slice(i,i+3));points.push([(p[0]+1)*w*.5,(1-p[1])*h*.5,p[2]]);}
        const faces=[];
        for(let ring=0;ring<mesh.rings.length-1;ring++)for(let k=0;k<mesh.rings[ring].length;k++){
          const next=(k+1)%mesh.rings[ring].length,ids=[mesh.rings[ring][k],mesh.rings[ring+1][k],mesh.rings[ring+1][next],mesh.rings[ring][next]],n=[0,0,0];
          for(const id of ids)for(let axis=0;axis<3;axis++)n[axis]+=mesh.normals[id*3+axis]/4;
          const normal=transform(normalMatrix,n);if(normal[2]<=.015)continue;
          faces.push({ids,normal,cap:false,depth:ids.reduce((v,id)=>v+points[id][2],0)/4});
        }
        const topNormal=transform(normalMatrix,[0,1,0]);
        const capIds=mesh.rings[topNormal[2]>=0?0:8];
        faces.push({ids:capIds,normal:topNormal,cap:true,depth:capIds.reduce((v,id)=>v+points[id][2],0)/capIds.length});
        faces.sort((a,b)=>b.depth-a.depth);
        for(const face of faces){
          c.beginPath();face.ids.forEach((id,j)=>{const p=points[id];if(j===0)c.moveTo(p[0],p[1]);else c.lineTo(p[0],p[1]);});c.closePath();
          if(face.cap){
            const xs=face.ids.map(id=>points[id][0]),ys=face.ids.map(id=>points[id][1]);
            const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
            const gradient=c.createLinearGradient(minX,minY,maxX,maxY);
            if(item.glass){gradient.addColorStop(0,'#f2f6ff');gradient.addColorStop(.24,'#d6e4f7');gradient.addColorStop(.5,'#c7def3');gradient.addColorStop(.73,'#e0d8f3');gradient.addColorStop(1,'#f4effc');}
            else{gradient.addColorStop(0,'#f9f6f5');gradient.addColorStop(.3,'#e0dfe7');gradient.addColorStop(.56,item.index===2?'#bfc5d6':'#d2d2df');gradient.addColorStop(.82,'#efedf5');gradient.addColorStop(1,'#faf8fd');}
            c.fillStyle=gradient;c.fill();
            if(state.selectedLayer===item.layer){c.fillStyle='rgba(116,171,226,.13)';c.fill();}
            c.strokeStyle=item.glass?'rgba(244,253,255,.94)':'rgba(255,255,255,.85)';c.lineWidth=Math.max(1,w/700);c.stroke();
          }else{
            const n=face.normal,len=Math.hypot(...n)||1,nx=n[0]/len,ny=n[1]/len,nz=n[2]/len;
            const light=clamp(-nx*.35+ny*.7+nz*.55,0,1),strip=Math.pow(Math.max(0,1-Math.abs(nx+.32)*2.8),4);
            let brightness=132+light*76+strip*46;
            if(item.glass){brightness=164+light*55+strip*30;c.fillStyle=rgb(brightness-18+nx*14,brightness+3,brightness+27);}
            else{brightness-=Math.pow(Math.max(0,1-Math.abs(nx-.38)*3),8)*65;c.fillStyle=rgb(brightness,brightness,brightness+8);}
            c.fill();c.strokeStyle=c.fillStyle;c.lineWidth=.65;c.stroke();
          }
        }
      }
    }
    const uniform=(p,n)=>gl.getUniformLocation(p,n);
    function bindAttribute(p,name,buffer,size) { const loc=gl.getAttribLocation(p,name);if(loc<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0); }
    function resize(){
      const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      const dpr=Math.min(devicePixelRatio||1,matchMedia('(max-width: 700px)').matches?1.5:1.75);
      const w=Math.round(width*dpr),h=Math.round(height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}if(softwareCanvas&&(softwareCanvas.width!==w||softwareCanvas.height!==h)){softwareCanvas.width=w;softwareCanvas.height=h;}request();
    }
    function request(){if(!raf&&!disposed&&!lost&&state.available&&visible&&!document.hidden)raf=requestAnimationFrame(render);}
    function render(time){
      raf=0;if(disposed||lost||!state.available||!visible||document.hidden)return;
      if(state.renderer==='canvas2d'&&time-lastSoftwareDraw<32){request();return;}
      if(state.renderer==='canvas2d')lastSoftwareDraw=time;
      const dt=Math.min((time-last)/1000||0,.04);last=time;
      if(state.motion)phase+=dt;
      if(reduced.matches)separation=targetSeparation;else separation+=(targetSeparation-separation)*Math.min(1,dt*9);
      if(Math.abs(separation-targetSeparation)<.001)separation=targetSeparation;
      if(state.renderer==='webgl'){
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(shadowProgram);bindAttribute(shadowProgram,'aPosition',shadowBuffer,2);gl.uniform1f(uniform(shadowProgram,'uZoom'),state.zoom);gl.drawArrays(gl.TRIANGLES,0,6);
      gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.useProgram(program);
      bindAttribute(program,'aPosition',mesh.position,3);bindAttribute(program,'aNormal',mesh.normal,3);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
      }
      const aspect=width/height, span=2.82/state.zoom, proj=identity();proj[0]=1/(span*Math.max(1,aspect));proj[5]=1/(span*Math.max(1,1/aspect));proj[10]=-.1;
      if(state.renderer==='webgl')gl.uniformMatrix4fv(uniform(program,'uProjection'),false,proj);
      const rot=rotation(pitch, yaw+phase*.065);drawModels=[];
      for(let i=5;i>=0;i--){
        const layer=Math.floor(i/2),glass=i%2===1;
        const y=(2.5-i)*(.245+separation*.19)+Math.sin(phase*.65+layer*.45)*.035;
        const translate=identity();translate[13]=y;translate[12]=state.selectedLayer===layer?.075:0;
        const model=multiply(rot,translate);drawModels.push({model,projection:proj,layer,glass,index:i});
        if(state.renderer==='webgl'){
        gl.uniformMatrix4fv(uniform(program,'uModel'),false,model);gl.uniform1f(uniform(program,'uGlass'),glass?1:0);gl.uniform1f(uniform(program,'uSelected'),state.selectedLayer===layer?1:0);
        gl.uniform3f(uniform(program,'uTint'),i===2?.79:.88,i===2?.80:.87,i===2?.85:.9);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
        }
      }
      if(state.renderer==='canvas2d')renderSoftware();
      if(!state.ready){state.ready=true;delete state.reason;stage.classList.add('is-live');emit();}
      if(state.motion||separation!==targetSeparation)request();
    }
    function pick(clientX,clientY){
      const rect=canvas.getBoundingClientRect(),x=(clientX-rect.left)/rect.width*2-1,y=1-(clientY-rect.top)/rect.height*2;
      let nearest=Infinity,selected=-1;
      // Exact projected triangle picking includes rounded corners and plate sides.
      for(const item of drawModels){
        const matrix=multiply(item.projection,item.model),points=[];
        for(let i=0;i<mesh.vertices.length;i+=3)points.push(transform(matrix,mesh.vertices.slice(i,i+3)));
        for(let j=0;j<mesh.indices.length;j+=3){
          const a=points[mesh.indices[j]],b=points[mesh.indices[j+1]],c=points[mesh.indices[j+2]];
          const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)continue;
          const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;
          if(u>=0&&v>=0&&u+v<=1){const z=u*a[2]+v*b[2]+(1-u-v)*c[2];if(z<nearest){nearest=z;selected=item.layer;}}
        }
      }
      api.selectLayer(selected);
    }
    const api={
      setExploded(value){const next=!!value;if(next===state.exploded)return;state.exploded=next;targetSeparation=next?1:0;if(reduced.matches)separation=targetSeparation;emit();request();},
      selectLayer(index){const next=Number.isInteger(index)&&index>=0&&index<=2?index:-1;if(next===state.selectedLayer)return;state.selectedLayer=next;emit();request();},
      setMotion(value){const next=!!value;if(next===state.motion)return;state.motion=next;emit();request();},
      rotate(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy))return;yaw+=dx;pitch=clamp(pitch+dy,.12,1.05);request();},
      zoom(delta){if(!Number.isFinite(delta))return;const next=clamp(state.zoom+delta,.75,1.25);if(next===state.zoom)return;state.zoom=next;emit();request();},
      reset(){yaw=-.56;pitch=.46;phase=0;state.zoom=1;state.selectedLayer=-1;state.exploded=true;targetSeparation=1;state.motion=!reduced.matches;if(reduced.matches)separation=1;emit();request();},
      getState(){return {...state};},
      dispose(){if(disposed)return;disposed=true;if(softwareCanvas){softwareCanvas.remove();softwareCanvas=null;}cancelAnimationFrame(raf);removers.forEach(fn=>fn());observer?.disconnect();resizer?.disconnect();interactionObserver?.disconnect();if(gl&&!lost){if(mesh)for(const name of ['position','normal','index'])gl.deleteBuffer(mesh[name]);gl.deleteBuffer(shadowBuffer);gl.deleteProgram(program);gl.deleteProgram(shadowProgram);}state.available=false;state.ready=false;state.renderer='static';stage.classList.remove('is-live');emit('disposed');}
    };
    window.portfolioEngine=api;
    on(canvas,'pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const interactive=e.pointerType==='mouse'||stage.dataset.interaction==='true';
      if(!interactive)return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged=false;
      if(pointers.size===1)gesture={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};
      else {dragged=true;gesture={distance:distance()};}
      try{canvas.setPointerCapture(e.pointerId);}catch(_){}
      if(e.pointerType==='mouse')canvas.focus({preventScroll:true});
    });
    const distance=()=>{const p=[...pointers.values()];return p.length>=2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;};
    on(canvas,'pointermove',e=>{
      if(!pointers.has(e.pointerId)||!gesture)return;
      const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size>=2){const d=distance();if(gesture.distance)api.zoom((d-gesture.distance)/350);gesture.distance=d;dragged=true;}
      else {if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>5)dragged=true;if(dragged)api.rotate((e.clientX-old.x)*.006,(e.clientY-old.y)*.004);}
    });
    const finish=(e,cancel)=>{if(!pointers.has(e.pointerId))return;const click=!cancel&&!dragged&&pointers.size===1;pointers.delete(e.pointerId);if(click)pick(e.clientX,e.clientY);if(pointers.size){const p=[...pointers.values()][0];gesture={...p,startX:p.x,startY:p.y};dragged=true;}else gesture=null;};
    on(canvas,'pointerup',e=>finish(e,false));on(canvas,'pointercancel',e=>finish(e,true));on(canvas,'lostpointercapture',e=>finish(e,true));
    // Touch taps remain available without capturing a scrolling gesture.
    let passiveTap=null;
    on(canvas,'pointerdown',e=>{if(e.pointerType!=='mouse'&&stage.dataset.interaction!=='true')passiveTap={x:e.clientX,y:e.clientY};},{passive:true});
    on(canvas,'pointerup',e=>{if(passiveTap&&Math.hypot(e.clientX-passiveTap.x,e.clientY-passiveTap.y)<6)pick(e.clientX,e.clientY);passiveTap=null;},{passive:true});
    on(canvas,'pointercancel',()=>{passiveTap=null;},{passive:true});
    on(canvas,'wheel',e=>{if(document.activeElement!==canvas)return;e.preventDefault();api.zoom(-e.deltaY*.001);},{passive:false});
    on(canvas,'webglcontextlost',e=>{if(state.renderer!=='webgl')return;e.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;state.available=false;state.ready=false;state.renderer='static';stage.classList.remove('is-live');emit('Graphics context paused. Preview shown.');});
    on(canvas,'webglcontextrestored',()=>{if(!disposed)initialize();});
    on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();request();}});
    on(reduced,'change',()=>{if(reduced.matches){state.motion=false;separation=targetSeparation;emit();request();}});
    const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=performance.now();request();}else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'80px'}):null;
    observer?.observe(stage);
    const resizer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;resizer?.observe(canvas);on(window,'resize',resize,{passive:true});
    const syncInteraction=()=>{canvas.style.touchAction=stage.dataset.interaction==='true'?'none':'pan-y pinch-zoom';if(stage.dataset.interaction!=='true'){pointers.clear();gesture=null;}};
    const interactionObserver=typeof MutationObserver!=='undefined'?new MutationObserver(syncInteraction):null;
    interactionObserver?.observe(stage,{attributes:true,attributeFilter:['data-interaction']});syncInteraction();
    initialize();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
