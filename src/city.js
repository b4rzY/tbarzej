/* Public exhibit adapted from the owner's existing Dots City renderer.
 * Geometry, traffic, camera projection and occlusion are retained.
 * All names, roles, status and activity below are synthetic demonstration data.
 * No private application models, routes, integrations or persistence are included.
 */
(() => {
'use strict';
const workflowRoles = [
 {id:'plan',en:'Plan',es:'Planificar',x:-3.65,y:-3.65,h:4.15,color:'#74dfff',detail:'Define the goal and split it into smaller tasks.',detailEs:'Definir el objetivo y dividirlo en tareas más pequeñas.'},
 {id:'research',en:'Research',es:'Investigar',x:-3.65,y:0,h:2.35,color:'#73e4b5',detail:'Gather context and compare useful sources.',detailEs:'Reunir contexto y comparar fuentes útiles.'},
 {id:'ideate',en:'Ideate',es:'Idear',x:-3.65,y:3.65,h:1.7,color:'#f08dcf',detail:'Explore possible approaches before choosing a direction.',detailEs:'Explorar enfoques antes de elegir una dirección.'},
 {id:'write',en:'Write',es:'Redactar',x:0,y:-3.65,h:2.75,color:'#c7e87d',detail:'Turn the chosen direction into a clear draft.',detailEs:'Convertir la dirección elegida en un borrador claro.'},
 {id:'build',en:'Build',es:'Construir',x:0,y:0,h:2.15,color:'#ff8c9b',detail:'Implement a focused piece of the work.',detailEs:'Implementar una parte concreta del trabajo.'},
 {id:'review',en:'Review',es:'Revisar',x:0,y:3.65,h:1.65,color:'#ffc580',detail:'Check the result and flag what needs a human decision.',detailEs:'Revisar el resultado y señalar lo que necesita una decisión humana.'},
 {id:'deliver',en:'Deliver',es:'Entregar',x:3.65,y:-3.65,h:2.6,color:'#ae9aff',detail:'Prepare the reviewed result for the next step.',detailEs:'Preparar el resultado revisado para el siguiente paso.'},
 {id:'reflect',en:'Reflect',es:'Reflexionar',x:3.65,y:0,h:1.05,color:'#8eaaff',detail:'Summarize what changed and what remains open.',detailEs:'Resumir los cambios y lo que queda pendiente.'},
 {id:'tools',en:'Tools',es:'Herramientas',x:3.65,y:3.65,h:1.8,color:'#e7b8ff',detail:'Support the workflow with small, reusable utilities.',detailEs:'Apoyar el flujo con utilidades pequeñas y reutilizables.'}
].map(role=>Object.freeze({...role,name:role.en,status:'working'}));
// Orthographic world camera. Geometry is reprojected; the canvas itself is never rotated.
const normalizeYaw=yaw=>((Number.isFinite(yaw)?yaw:0)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
function rotateWorld(x,y,yaw=0){const c=Math.cos(yaw),s=Math.sin(yaw);return {x:x*c-y*s,y:x*s+y*c};}
function projectWorld(x,y,z,camera){const c=camera.cos??Math.cos(camera.yaw),s=camera.sin??Math.sin(camera.yaw),u=x*c-y*s,v=x*s+y*c;return {x:camera.cx+(u-v)*camera.unit,y:camera.cy+((u+v)*.49-z)*camera.unit};}
function worldDepth(x,y,z=0,yaw=0){const p=rotateWorld(x,y,yaw);return p.x+p.y+z*.98;}
function visibleSides(yaw=0){const c=Math.cos(yaw),s=Math.sin(yaw);return {x:c+s>=0?1:-1,y:c-s>=0?1:-1};}
function cuboidFaces(x,y,w,d,z,h,yaw=0){
 const sides=visibleSides(yaw),a=[x,y,z],b=[x+w,y,z],c=[x+w,y+d,z],dd=[x,y+d,z],A=[x,y,h],B=[x+w,y,h],C=[x+w,y+d,h],D=[x,y+d,h];
 const faces=[{axis:'x',sign:sides.x,points:sides.x>0?[b,c,C,B]:[dd,a,A,D]},{axis:'y',sign:sides.y,points:sides.y>0?[dd,c,C,D]:[a,b,B,A]},{axis:'z',sign:1,points:[A,B,C,D]}];
 return faces.sort((a,b)=>depth(a)-depth(b));
 function depth(face){const center=face.points.reduce((s,p)=>s.map((v,i)=>v+p[i]/4),[0,0,0]);return worldDepth(...center,yaw);}
}

// Sort axis-aligned world volumes back-to-front without mistaking center distance
// for occlusion. boundsFor(item) returns {min: [x,y,z], max: [x,y,z]}.
// Intersecting volumes and genuine painter cycles use a stable depth fallback;
// representing those exactly would require splitting geometry or a depth buffer.
function sortWorldObjects(items,yaw,boundsFor){
 const angle=normalizeYaw(yaw),c=Math.cos(angle),s=Math.sin(angle),direction=[c+s,c-s,.98],epsilon=1e-9;
 const projection={cx:0,cy:0,unit:1,yaw:angle,cos:c,sin:s};
 // AABBs share three projected edge directions. Their hulls therefore share
 // these SAT axes, allowing intervals to be cached once rather than per pair.
 const axes=[[-.49*direction[0],c-s],[-.49*direction[1],-s-c],[1,0]].map(([x,y])=>{const length=Math.hypot(x,y);return [x/length,y/length];});
 const nodes=items.map((item,index)=>{
  const bounds=boundsFor(item),min=bounds?.min,max=bounds?.max;
  if(!min||!max||min.length!==3||max.length!==3||!min.every(Number.isFinite)||!max.every(Number.isFinite)||min.some((value,i)=>value>max[i]))throw new TypeError('World bounds must contain finite ordered min/max triples');
  const points=[];
  for(let corner=0;corner<8;corner++)points.push(projectWorld(corner&1?max[0]:min[0],corner&2?max[1]:min[1],corner&4?max[2]:min[2],projection));
  const hull=convexHull(points);
  const rect={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  const intervals=axes.map(()=>[Infinity,-Infinity]);
  for(const point of hull){
   rect.minX=Math.min(rect.minX,point.x);rect.maxX=Math.max(rect.maxX,point.x);rect.minY=Math.min(rect.minY,point.y);rect.maxY=Math.max(rect.maxY,point.y);
   for(let axis=0;axis<axes.length;axis++){const value=point.x*axes[axis][0]+point.y*axes[axis][1];intervals[axis][0]=Math.min(intervals[axis][0],value);intervals[axis][1]=Math.max(intervals[axis][1],value);}
  }
  return {item,index,min,max,rect,intervals,depth:direction.reduce((sum,value,i)=>sum+value*(min[i]+max[i])/2,0),next:[],incoming:0,emitted:false};
 });
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j],ar=a.rect,br=b.rect;
  if(ar.maxX<=br.minX+epsilon||br.maxX<=ar.minX+epsilon||ar.maxY<=br.minY+epsilon||br.maxY<=ar.minY+epsilon)continue;
  if(a.intervals.some((range,axis)=>range[1]<=b.intervals[axis][0]+epsilon||b.intervals[axis][1]<=range[0]+epsilon))continue;
  let order=0,conflict=false;
  for(let axis=0;axis<3;axis++){
   if(Math.abs(direction[axis])<epsilon)continue;
   let separated=0;
   if(a.max[axis]<=b.min[axis]+epsilon&&a.min[axis]<b.max[axis]-epsilon)separated=1;
   else if(b.max[axis]<=a.min[axis]+epsilon&&b.min[axis]<a.max[axis]-epsilon)separated=-1;
   if(!separated)continue;
   const candidate=separated*(direction[axis]>0?1:-1);
   if(order&&order!==candidate){conflict=true;break;}
   order=candidate;
  }
  if(!order||conflict)continue;
  const before=order>0?a:b,after=order>0?b:a;before.next.push(after);after.incoming++;
 }
 const fallback=[...nodes].sort((a,b)=>a.depth-b.depth||a.index-b.index),ordered=[];
 for(let count=0;count<nodes.length;count++){
  // Prefer the nearest available entry in stable depth order. If a cycle has
  // no available entry, break it deterministically rather than dropping items.
  const node=fallback.find(candidate=>!candidate.emitted&&!candidate.incoming)||fallback.find(candidate=>!candidate.emitted);
  node.emitted=true;ordered.push(node.item);for(const next of node.next)next.incoming--;
 }
 return ordered;
}

function convexHull(points){
 const sorted=points.sort((a,b)=>a.x-b.x||a.y-b.y).filter((point,i,array)=>!i||point.x!==array[i-1].x||point.y!==array[i-1].y);
 if(sorted.length<=2)return sorted;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];
 for(const point of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),point)<=0)lower.pop();lower.push(point);}
 for(let i=sorted.length-1;i>=0;i--){const point=sorted[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),point)<=0)upper.pop();upper.push(point);}
 lower.pop();upper.pop();return lower.concat(upper);
}

function attachCityRenderer(viewport){
 const canvas=viewport.querySelector('.city-canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas is unavailable');
 const defs=workflowRoles.map(a=>({...a})),agents=defs;
 let selected='plan';
 const getAgent=id=>agents.find(a=>a.id===id);
 let W=0,H=0,U=30,CX=0,CY=0,px=1,visualT=0,drawLabels=[];
 let camera={scale:1,x:0,y:0,yaw:0},projection={cx:0,cy:0,unit:30,yaw:0,cos:1,sin:0};
 const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');let reduced=motionQuery.matches;
 const targets=new Map([...viewport.querySelectorAll('[data-map-landmark]')].map(e=>[e.dataset.mapLandmark,e]));
 function syncTargets(){for(const label of drawLabels){const target=targets.get(label.id);if(!target)continue;const size=Math.max(44,label.h);target.style.cssText=`left:${label.x}px;top:${label.y-(size-label.h)/2}px;width:${label.w}px;height:${size}px;`;}}
function resize(){const width=canvas.clientWidth,height=canvas.clientHeight,nextPx=Math.min(window.devicePixelRatio||1,2);if(!width||!height||(width===W&&height===H&&nextPx===px))return false;W=width;H=height;px=nextPx;camera.x=Math.max(-W,Math.min(W,camera.x));camera.y=Math.max(-H,Math.min(H,camera.y));const backingWidth=Math.round(W*px),backingHeight=Math.round(H*px);if(canvas.width!==backingWidth)canvas.width=backingWidth;if(canvas.height!==backingHeight)canvas.height=backingHeight;ctx.setTransform(px,0,0,px,0,0);return true;}

function P(x,y,z=0){return projectWorld(x,y,z,projection);}
function poly(points,fill,stroke,width=1,glow=0){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.shadowColor=stroke;ctx.shadowBlur=glow;ctx.stroke();ctx.shadowBlur=0;}}
function line(points,color,width=1,glow=0,dash=[]){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.stroke();ctx.shadowBlur=0;ctx.setLineDash([]);}
function rand(seed){const x=Math.sin(seed*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function circle(p,r,fill,glow=0){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.shadowBlur=glow;ctx.shadowColor=fill;ctx.fill();ctx.shadowBlur=0;}
function isoTile(x,y,w,d,z,fill,stroke,glow=0){poly([P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)],fill,stroke,1,glow);}
function block(x,y,w,d,z,h,col,main=false,seed=null){
 const faces=cuboidFaces(x,y,w,d,z,h,camera.yaw);
 for(const face of faces){
  const roof=face.axis==='z';
  const lit=face.axis==='y'?face.sign>0:face.sign<0;
  const fill=roof?(main?'#1e2940':'#152136'):main?(lit?'#172137':'#101b2f'):(lit?'#10192c':'#0c1525');
  poly(face.points.map(v=>P(...v)),fill,col+(main?(roof?'ee':'94'):(roof?'7b':'45')),roof&&main?1.2:.65,roof&&main?4:0);
  if(roof||seed===null)continue;
  const rows=Math.floor(h/.32),length=face.axis==='y'?w:d,cols=Math.max(2,Math.floor(length/.23));
  const faceSeed=seed+(face.sign<0?431:0);
  for(let row=0;row<rows;row++)for(let n=0;n<cols;n++){
   const isY=face.axis==='y',zz=.26+row*.31;if(zz+.13>=h)continue;
   if(rand(faceSeed+row*(isY?29:31)+n*(isY?3:7)+(isY?0:5))<=(isY?.3:.35))continue;
   const q=.13+n*(length-.2)/cols;
   const points=isY?[[x+q,y+(face.sign>0?d+.008:-.008),zz],[x+q+.07,y+(face.sign>0?d+.008:-.008),zz],[x+q+.07,y+(face.sign>0?d+.008:-.008),zz+.13],[x+q,y+(face.sign>0?d+.008:-.008),zz+.13]]:[[x+(face.sign>0?w+.008:-.008),y+q,zz],[x+(face.sign>0?w+.008:-.008),y+q+.07,zz],[x+(face.sign>0?w+.008:-.008),y+q+.07,zz+.13],[x+(face.sign>0?w+.008:-.008),y+q,zz+.13]];
   const cWin=isY?(rand(faceSeed+row*17+n)>.76?col+'ba':main?'#b1c9ed75':'#9cabc64d'):(rand(faceSeed+row+n)>.67?col+'aa':'#93abc45c');
   poly(points.map(v=>P(...v)),cWin);
  }
 }
 if(main){
  line([P(x,y,h+.06),P(x+w,y,h+.06),P(x+w,y+d,h+.06),P(x,y+d,h+.06),P(x,y,h+.06)],col,1.4,6);
  isoTile(x+.13,y+.13,w-.26,d-.26,h+.04,null,col+'44');
  const sides=visibleSides(camera.yaw),nearX=x+(sides.x>0?w:0),nearY=y+(sides.y>0?d:0);
  line([P(nearX,nearY,z),P(nearX,nearY,h)],col+'8c',1);
 }
}
function building(x,y,w,d,h,col,seed,main=false){block(x,y,w,d,.1,h,col,main,seed);}
function drawGround(){const edge=6.45;
 for(const face of cuboidFaces(-edge,-edge,edge*2,edge*2,-.28,0,camera.yaw)){
  if(face.axis==='z')continue;poly(face.points.map(v=>P(...v)),face.axis==='x'?'#172038':'#1b1530',face.axis==='x'?'#738fe16a':'#b685da77');
 }
 isoTile(-edge,-edge,edge*2,edge*2,0,'#111c2b','#7085b370');for(let i=-6;i<=6;i+=.5){line([P(i,-6.3,.005),P(i,6.3,.005)],'#57728b0e',.5);line([P(-6.3,i,.005),P(6.3,i,.005)],'#57728b0e',.5);}for(const q of [-5.5,-1.82,1.82,5.5]){isoTile(-6.2,q-.27,12.4,.54,.012,'#0b1321',null);isoTile(q-.27,-6.2,.54,12.4,.013,'#0b1321',null);line([P(-6.2,q,.025),P(6.2,q,.025)],'#afbbce50',.7,0,[3,5]);line([P(q,-6.2,.025),P(q,6.2,.025)],'#afbbce50',.7,0,[3,5]);}
line([P(-6.4,6.4,.05),P(6.4,6.4,.05)],'#c382e0',1.2,8);line([P(6.4,6.4,.05),P(6.4,-6.4,.05)],'#80c4ef',1.2,8);
for(let i=0;i<36;i++){let q=-5.8+i*.33;circle(P(q,5.17,.07),.75,'#d6c9a68f',2);circle(P(5.17,q,.07),.75,'#a9d5dd8f',2);}
}
function traffic(){const items=[];for(let n=0;n<29;n++){const lane=[-5.5,-1.82,1.82,5.5][n%4],alongY=n%2===1,s=((visualT*.72*(alongY?-1:1)+n*1.71)%12.4+12.4)%12.4-6.2;items.push({type:'car',x:alongY?lane:s,y:alongY?s:lane,alongY,col:n%3===0?'#caa1f1':'#8ac8d8'});}return items;}
function drawCar(it){
 const w=it.alongY?.105:.245,d=it.alongY?.245:.105,x=it.x-w/2,y=it.y-d/2;
 // Small world-space vehicle bodies become clear at street-level zoom.
 block(x,y,w,d,.035,.105,it.col,false);isoTile(x+.025,y+.025,w-.05,d-.05,.11,it.col+'bf',null);
 block(x+w*.27,y+d*.22,w*.48,d*.56,.105,.16,'#b5d9e6',false);
 const lights=it.alongY?[[x+.025,y,.09],[x+w-.025,y,.09]]:[[x+w,y+.025,.09],[x+w,y+d-.025,.09]];
 for(const light of lights)circle(P(...light),Math.max(.5,U*.013),'#e9f2d1',3);
}
function tree(x,y,size=1){
 line([P(x,y,.05),P(x,y,.3*size)],'#576e72',1);
 const base=[[x-.19*size,y-.19*size,.22*size],[x+.19*size,y-.19*size,.22*size],[x+.19*size,y+.19*size,.22*size],[x-.19*size,y+.19*size,.22*size]],top=[x,y,.8*size];
 const faces=base.map((v,i)=>({points:[v,base[(i+1)%4],top],color:['#203c46','#254750','#2a4b51','#1d343f'][i]}));
 faces.sort((a,b)=>a.points.reduce((v,p)=>v+worldDepth(...p,camera.yaw),0)-b.points.reduce((v,p)=>v+worldDepth(...p,camera.yaw),0));
 for(const f of faces)poly(f.points.map(v=>P(...v)),f.color);
}
function decorations(){const items=[];for(let i=0;i<25;i++){const v=-5.9+i*.48;items.push({type:'tree',x:-6,y:v,size:.55+rand(i)*.3},{type:'tree',x:v,y:-6,size:.55+rand(i+44)*.3});}for(let i=0;i<15;i++){const v=-5.7+i*.78;if(i%3!==0)items.push({type:'tree',x:v,y:5.92,size:.65},{type:'tree',x:5.92,y:v,size:.65});}return items;}
function roofFeature(a){let x=a.x,y=a.y,h=a.h,col=a.color;if(a.id==='plan'){line([P(x,y,h+.1),P(x,y,h+1.05)],col,1.1,3);circle(P(x,y,h+1.05),2.2,col,10);let p=P(x,y,h+.55);ctx.strokeStyle=col+'50';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y,18+Math.sin(visualT*1.2)*3,7,0,0,Math.PI*2);ctx.stroke();}else if(a.id==='ideate'){let p=P(x,y,h+.35);for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(p.x,p.y-i*4,14-i*3,5-i*.7,0,0,Math.PI*2);ctx.strokeStyle=col+(i===0?'cc':'80');ctx.lineWidth=1.3;ctx.stroke();}}else if(a.id==='review'){isoTile(x-.37,y-.33,.74,.65,h+.08,'#30253d',col);line([P(x-.4,y-.3,h+.08),P(x-.4,y-.3,h+.63)],col,1);line([P(x+.36,y-.3,h+.08),P(x+.36,y-.3,h+.63)],col,1);poly([P(x-.4,y-.3,h+.63),P(x+.36,y-.3,h+.63),P(x+.36,y-.3,h+.18),P(x-.4,y-.3,h+.18)],'#2c2634',col);let q=P(x,y-.31,h+.4);poly([{x:q.x-2,y:q.y-3},{x:q.x+4,y:q.y},{x:q.x-2,y:q.y+3}],col);}else if(a.id==='deliver'){let p=P(x,y,h+.3);circle(p,5,col+'aa',9);line([P(x,y,h+.2),P(x,y,h+.85)],col,1);poly([P(x,y,h+.85),P(x+.52,y,h+.67),P(x,y,h+.5)],col+'bb');}else if(a.id==='build'){let p=P(x,y,h+.2);ctx.font=`bold ${Math.max(10,U*.36)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText('</>',p.x,p.y);}else if(a.id==='write'){let p=P(x,y,h+.22);ctx.font=`600 ${Math.max(9,U*.29)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText('WRITE',p.x,p.y);}else if(a.id==='research'){let p=P(x,y,h+.23);ctx.font=`600 ${Math.max(8,U*.23)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText('READ',p.x,p.y);}else if(a.id==='tools'){let p=P(x,y,h+.23);poly([{x:p.x,y:p.y-7},{x:p.x+6,y:p.y},{x:p.x,y:p.y+7},{x:p.x-6,y:p.y}],col+'33',col,1,4);}}
function plaza(a){const x=a.x,y=a.y;isoTile(x-1.1,y-1.05,2.2,2.1,.05,'#152538',a.color+'55');for(let i=0;i<3;i++){let p=P(x,y,.08+i*.13);ctx.beginPath();ctx.ellipse(p.x,p.y,Math.max(1,U*(.9-i*.2)),Math.max(1,U*.45*(.9-i*.2)),0,0,Math.PI*2);ctx.fillStyle=['#1b3553','#244773','#2b6594'][i];ctx.fill();ctx.strokeStyle=a.color+'66';ctx.lineWidth=.8;ctx.stroke();}const p=P(x,y,.55);circle(p,4,a.color,12);line([P(x,y,.2),P(x,y,.85)],'#92dbff',2,7);tree(x-1.05,y+.85,.75);tree(x+.9,y-.9,.75);}
function agentPos(a,i){let x=a.x+.35,y=a.y+1.35,z=.40;const speed=a.status==='working'?visualT*1.1+i:0;if(a.status==='working'){x+=Math.sin(speed)*.5;y+=Math.cos(speed)*.28;}return {x,y,z:z+Math.sin(visualT*2+i)*.08};}
function drawDot(a,i){let pos=agentPos(a,i),p=P(pos.x,pos.y,pos.z),r=Math.max(5.2,U*.20),ground=P(pos.x,pos.y,.06);ctx.beginPath();ctx.ellipse(ground.x,ground.y,r*1.25,r*.45,0,0,Math.PI*2);ctx.fillStyle=a.color+'25';ctx.fill();if(a.id===selected){ctx.beginPath();ctx.ellipse(ground.x,ground.y,r*1.8,r*.8,0,0,Math.PI*2);ctx.strokeStyle=a.color+'ac';ctx.lineWidth=.8;ctx.stroke();}let grad=ctx.createRadialGradient(p.x-r*.28,p.y-r*.35,r*.05,p.x,p.y,r);grad.addColorStop(0,'#e9f6ff');grad.addColorStop(.24,a.color);grad.addColorStop(1,a.color+'8c');circle(p,r,grad,0);ctx.shadowColor=a.color;ctx.shadowBlur=12;ctx.strokeStyle=a.color+'99';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;circle({x:p.x-r*.25,y:p.y},Math.max(1,r*.13),'#182038');circle({x:p.x+r*.25,y:p.y},Math.max(1,r*.13),'#182038');if(a.status==='awaiting'){circle({x:p.x+r,y:p.y-r},3,'#f1cc83',8);} }
function label(a,i){let p=P(a.x,a.y,a.h+.55);if(a.id==='plan')p.y-=15;if(a.id==='reflect')p=P(a.x,a.y,1.55);const fs=W<500?8:9;ctx.font=`500 ${fs}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;const maxWidth=Math.max(60,Math.min(125,W*.22));let text=a.name;if(ctx.measureText(text).width>maxWidth){while(text.length&&ctx.measureText(text+'…').width>maxWidth)text=text.slice(0,-1);text+='…';}const tw=ctx.measureText(text).width,w=tw+25,h=20;let x=p.x-w/2,y=p.y-15;ctx.fillStyle='#10192cec';ctx.strokeStyle=a.id===selected?a.color:a.color+'65';ctx.lineWidth=.8;ctx.beginPath();ctx.roundRect(x,y,w,h,5);ctx.fill();ctx.stroke();circle({x:x+8,y:y+10},2.2,a.color,3);ctx.fillStyle='#e3eafa';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(text,x+14,y+10);ctx.textBaseline='alphabetic';drawLabels.push({x:x-6,y:y-5,w:w+12,h:h+12,id:a.id});}
function linkPulse(){const pairs=[['plan','research'],['research','ideate'],['ideate','write'],['write','review'],['build','review'],['review','deliver'],['deliver','reflect']];for(let i=0;i<pairs.length;i++){const a=getAgent(pairs[i][0]),b=getAgent(pairs[i][1]);if(a.status==='idle'||b.status==='idle')continue;const start={x:a.x+.25,y:a.y+1.25},end={x:b.x+.25,y:b.y+1.25};let mid={x:start.x,y:end.y};line([P(start.x,start.y,.08),P(mid.x,mid.y,.08),P(end.x,end.y,.08)],a.color+'28',1);let q=(visualT*.22+i*.31)%1;let pp=q<.5?{x:start.x,y:start.y+(mid.y-start.y)*q*2}:{x:mid.x+(end.x-mid.x)*(q-.5)*2,y:mid.y};circle(P(pp.x,pp.y,.12),1.8,a.color,7);}}
function objectBounds(it){
 if(it.type==='tree'){const r=.19*it.size;return {min:[it.x-r,it.y-r,.05],max:[it.x+r,it.y+r,.8*it.size]};}
 if(it.type==='car'){const w=it.alongY?.105:.245,d=it.alongY?.245:.105;return {min:[it.x-w/2,it.y-d/2,.035],max:[it.x+w/2,it.y+d/2,.16]};}
 if(it.type==='orb'){const z=agentPos(it.a,defs.findIndex(d=>d.id===it.a.id)).z;return {min:[it.x-.2,it.y-.2,z-.2],max:[it.x+.2,it.y+.2,z+.2]};}
 if(it.a?.id==='reflect')return {min:[it.a.x-1.25,it.a.y-1.2,.05],max:[it.a.x+1.25,it.a.y+1.2,1.05]};
 const roofExtra=it.type==='main'?(it.a.id==='plan'?1.1:it.a.id==='deliver'?.9:.65):0;
 return {min:[it.x,it.y,.1],max:[it.x+it.w,it.y+it.d,it.h+roofExtra]};
}
function draw(){if(!W||!H)return;ctx.clearRect(0,0,W,H);U=Math.min(W/28,H/17)*camera.scale;CX=W*.5+camera.x;CY=H*.5+camera.y+H*((W<500?.47:.55)-.5)*camera.scale;projection={cx:CX,cy:CY,unit:U,yaw:camera.yaw,cos:Math.cos(camera.yaw),sin:Math.sin(camera.yaw)};drawLabels=[];
// Atmospheric light without imported backgrounds.
const haze=ctx.createRadialGradient(CX,CY,10,CX,CY,W*.6);haze.addColorStop(0,'#1f3f5d20');haze.addColorStop(.5,'#6a398d12');haze.addColorStop(1,'#00000000');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);for(let i=0;i<50;i++){let x=rand(i+700)*W,y=rand(i+290)*H*.8;ctx.globalAlpha=.1+rand(i+12)*.18;circle({x,y},.55,'#c3d3ef');}ctx.globalAlpha=1;drawGround();linkPulse();
for(let n=0;n<16;n++){const q=-5.2+rand(n+14)*10.4;circle(P(n%2?5.85:q,n%2?q:5.85,.2),Math.max(1,U*.025),'#ffc77f',6);}
for(const a of agents)isoTile(a.x-1.2,a.y-1.16,2.4,2.32,.03,'#172335',a.color+(a.id===selected?'bb':'3b'),a.id===selected?5:0);
// A layered skyline around the edges, behind the nine main workspaces.
let items=[...decorations(),...traffic()];for(let i=0;i<13;i++){let q=-5.9+i*.93;items.push({type:'decor',x:q,y:-5.05,w:.36+rand(i)*.27,d:.34+rand(i+4)*.25,h:.65+rand(i+90)*1.5,col:i%2?'#7295b1':'#9186b2',seed:100+i});if(i<11)items.push({type:'decor',x:-5.05,y:q+.5,w:.35+rand(i+33)*.3,d:.36+rand(i+34)*.26,h:.55+rand(i+91)*1.25,col:i%2?'#9d86b1':'#71969c',seed:200+i});}
for(const a of agents){items.push({type:'main',a,x:a.x-.85,y:a.y-.8,w:1.7,d:1.6,h:a.h,col:a.color,seed:defs.findIndex(d=>d.id===a.id)*87});const pos=agentPos(a,defs.findIndex(d=>d.id===a.id));items.push({type:'orb',a,x:pos.x,y:pos.y});}
items=sortWorldObjects(items,camera.yaw,objectBounds);
for(const it of items){
 if(it.type==='tree'){tree(it.x,it.y,it.size);continue;}
 if(it.type==='car'){drawCar(it);continue;}
 if(it.type==='orb'){ctx.globalAlpha=1;drawDot(it.a,defs.findIndex(d=>d.id===it.a.id));ctx.globalAlpha=1;continue;}
 if(it.type==='main'){const a=it.a;ctx.globalAlpha=1;if(a.id==='reflect')plaza(a);else{building(it.x,it.y,it.w,it.d,it.h,it.col,it.seed,true);roofFeature(a);}ctx.globalAlpha=1;}else building(it.x,it.y,it.w,it.d,it.h,it.col,it.seed);
}
for(let i=0;i<agents.length;i++){ctx.globalAlpha=1;label(agents[i],i);}ctx.globalAlpha=1;syncTargets();

}

 let last=0,lastPaint=0,animation=0,visible=true,dirty=true,disposed=false;
 const panel=viewport.closest('[data-workflow-city]'),page=typeof document==='object'?document:null;
 const frameInterval=1000/30;
 const canAnimate=()=>!panel?.classList.contains('motion-paused');
 const motionStatus=panel?.querySelector?.('[data-city-status]');
 function updateMotionStatus(){if(motionStatus)motionStatus.textContent=canAnimate()?'Simulation running':reduced&&!panel?.classList.contains('motion-enabled')?'Paused · Reduce Motion':'Simulation paused';}
 const onScreen=()=>visible&&!page?.hidden;
 function schedule(){if(!disposed&&!animation&&onScreen()&&(dirty||canAnimate()))animation=requestAnimationFrame(frame);}
 function wake(){updateMotionStatus();dirty=true;last=0;lastPaint=0;if(!onScreen()&&animation){cancelAnimationFrame(animation);animation=0;}schedule();}
 function frame(ms){animation=0;if(disposed||!onScreen()){last=0;return;}const active=canAnimate();if(dirty||!frameInterval||ms-lastPaint>=frameInterval){if(last&&active)visualT+=Math.min(.1,(ms-last)/1000);if(dirty||active)draw();dirty=false;last=active?ms:0;lastPaint=ms;}schedule();}
 const resizeObserver=new ResizeObserver(()=>{if(disposed||!resize())return;draw();dirty=false;last=0;lastPaint=0;schedule();});resizeObserver.observe(canvas);
 const visibilityObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(items=>{visible=items[0].isIntersecting;wake();}):null;visibilityObserver?.observe(viewport);
 const motionObserver=typeof MutationObserver==='function'?new MutationObserver(wake):null;if(panel)motionObserver?.observe(panel,{attributes:true,attributeFilter:['class']});
 const motionChange=()=>{reduced=motionQuery.matches;wake();};motionQuery.addEventListener?.('change',motionChange);page?.addEventListener?.('visibilitychange',wake);
 updateMotionStatus();resize();draw();dirty=false;schedule();
 const cleanup=()=>{disposed=true;if(animation)cancelAnimationFrame(animation);resizeObserver.disconnect();visibilityObserver?.disconnect();motionObserver?.disconnect();motionQuery.removeEventListener?.('change',motionChange);page?.removeEventListener?.('visibilitychange',wake);};
 cleanup.setCamera=next=>{camera={scale:Math.max(.75,Math.min(6,Number.isFinite(next.scale)?next.scale:1)),x:Number.isFinite(next.x)?next.x:0,y:Number.isFinite(next.y)?next.y:0,yaw:normalizeYaw(next.yaw)};if(disposed)return;draw();dirty=false;last=0;schedule();};
 cleanup.getTime=()=>visualT;
 cleanup.select=id=>{if(!getAgent(id))return;selected=id;wake();};
 cleanup.setLanguage=language=>{for(const a of agents)a.name=language==='es'?a.es:a.en;wake();};
 return cleanup;
}

const labels={
 en:{interact:'Explore city',leave:'Finish exploring',motion:'Pause animation',play:'Play animation','zoom-in':'Zoom in','zoom-out':'Zoom out','rotate-left':'Rotate left','rotate-right':'Rotate right',reset:'Reset view',running:'Simulation running',paused:'Simulation paused',reduced:'Paused · Reduce Motion',unavailable:'The interactive city is unavailable in this browser. The workflow example is described above.'},
 es:{interact:'Explorar ciudad',leave:'Terminar exploración',motion:'Pausar animación',play:'Reproducir animación','zoom-in':'Acercar','zoom-out':'Alejar','rotate-left':'Girar a la izquierda','rotate-right':'Girar a la derecha',reset:'Restablecer vista',running:'Simulación en marcha',paused:'Simulación en pausa',reduced:'En pausa · Movimiento reducido',unavailable:'La ciudad interactiva no está disponible en este navegador. El ejemplo del flujo se describe arriba.'}
};
function initWorkflowCity(root){
 if(!root)return null;if(root.workflowCity)return root.workflowCity;
 const viewport=root.querySelector('[data-city-viewport]');if(!viewport)return null;
 let language=root.dataset.language==='es'?'es':'en',interactive=false,selected='plan',disposed=false;
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');
 let playing=true,camera={scale:1,x:0,y:0,yaw:0},drag=null,suppressClick=false,dragDistance=0;
 const pointers=new Map(),listeners=[];
 const on=(element,event,handler,options)=>{element.addEventListener(event,handler,options);listeners.push(()=>element.removeEventListener(event,handler,options));};
 viewport.innerHTML='<canvas class="city-canvas" aria-hidden="true"></canvas>'+workflowRoles.map(a=>`<button type="button" class="city-building" data-map-landmark="${a.id}" aria-pressed="${a.id===selected}"><span class="scene-accessible-label">${a.en}</span></button>`).join('');
 viewport.tabIndex=0;viewport.setAttribute('role','group');viewport.style.touchAction='pan-y pinch-zoom';
 root.classList.toggle('motion-paused',!playing);
 let renderer;
 try{renderer=attachCityRenderer(viewport);}catch(error){
  viewport.textContent=labels[language].unavailable;root.dataset.cityUnavailable='true';
  root.querySelectorAll('[data-city-action]').forEach(button=>{button.disabled=true;});
  return null;
 }
 const roleList=root.querySelector('[data-city-roles]');if(roleList)roleList.innerHTML=workflowRoles.map(a=>`<button type="button" data-city-role="${a.id}" aria-pressed="${a.id===selected}">${a.en}</button>`).join('');
 const buttons=[...root.querySelectorAll('[data-city-action]')],targets=[...viewport.querySelectorAll('[data-map-landmark]')];
 function renderUI(){
  const copy=labels[language];root.dataset.cityInteractive=String(interactive);
  viewport.style.touchAction=interactive?'none':'pan-y pinch-zoom';
  viewport.setAttribute('aria-label',language==='es'?'Ciudad ilustrativa de agentes. Selecciona un edificio para conocer su función. Flechas izquierda y derecha: girar. Mayús y flechas: desplazar. Más y menos: acercar y alejar. Inicio: restablecer vista. Escape: salir de la exploración.':'Illustrative agent city. Select a building to learn its role. Left and Right arrows: orbit. Shift and arrow keys: pan. Plus and minus: zoom. Home: reset view. Escape: exit exploration.');
  for(const button of buttons){const action=button.dataset.cityAction;let text=copy[action];if(action==='interact'){text=interactive?copy.leave:copy.interact;button.setAttribute('aria-pressed',String(interactive));}if(action==='motion'){text=playing?copy.motion:copy.play;button.setAttribute('aria-pressed',String(playing));}if(text){const textTarget=button.querySelector('[data-city-control-label]');if(textTarget)textTarget.textContent=text;else if(action==='interact'||action==='motion'||!button.querySelector('svg'))button.textContent=text;button.setAttribute('aria-label',text);button.title=text;}}
  for(const target of targets){const role=workflowRoles.find(a=>a.id===target.dataset.mapLandmark);target.setAttribute('aria-label',(language==='es'?'Explorar función: ':'Explore role: ')+role[language==='es'?'es':'en']);target.setAttribute('aria-pressed',String(role.id===selected));target.querySelector('span').textContent=role[language==='es'?'es':'en'];}
  root.querySelectorAll('[data-city-role]').forEach(button=>{const role=workflowRoles.find(a=>a.id===button.dataset.cityRole);button.textContent=role[language==='es'?'es':'en'];button.setAttribute('aria-pressed',String(role.id===selected));});
  const role=workflowRoles.find(a=>a.id===selected),detail=root.querySelector('[data-city-selection]');if(detail)detail.textContent=role[language==='es'?'es':'en']+': '+role[language==='es'?'detailEs':'detail'];
  const status=root.querySelector('[data-city-status]');if(status)status.textContent=playing?copy.running:media.matches?copy.reduced:copy.paused;
 }
 function updateCamera(){camera.scale=Math.max(.75,Math.min(4,camera.scale));camera.yaw=normalizeYaw(camera.yaw);const rect=viewport.getBoundingClientRect();camera.x=Math.max(-rect.width,Math.min(rect.width,camera.x));camera.y=Math.max(-rect.height,Math.min(rect.height,camera.y));renderer.setCamera(camera);}
 function setInteractive(value){interactive=value;drag=null;pointers.clear();renderUI();}
 function act(action){
  if(action==='interact')setInteractive(!interactive);
  else if(action==='motion'){playing=!playing;root.classList.toggle('motion-paused',!playing);root.classList.toggle('motion-enabled',playing);renderUI();}
  else if(action==='reset'){camera={scale:1,x:0,y:0,yaw:0};updateCamera();}
  else if(action==='zoom-in'){camera.scale*=1.2;updateCamera();}
  else if(action==='zoom-out'){camera.scale/=1.2;updateCamera();}
  else if(action==='rotate-left'){camera.yaw-=Math.PI/12;updateCamera();}
  else if(action==='rotate-right'){camera.yaw+=Math.PI/12;updateCamera();}
 }
 on(root,'click',event=>{const control=event.target.closest('[data-city-action]');if(control&&root.contains(control)){act(control.dataset.cityAction);return;}const roleButton=event.target.closest('[data-city-role]');if(roleButton&&root.contains(roleButton)){selected=roleButton.dataset.cityRole;renderer.select(selected);renderUI();return;}const target=event.target.closest('[data-map-landmark]');if(target&&viewport.contains(target)){if(suppressClick){suppressClick=false;return;}selected=target.dataset.mapLandmark;renderer.select(selected);renderUI();}});
 on(viewport,'wheel',event=>{if(!interactive||event.ctrlKey)return;event.preventDefault();camera.scale*=Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.002);updateCamera();},{passive:false});
 const distance=()=>{const pair=[...pointers.values()];return pair.length<2?0:Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);};
 on(viewport,'pointerdown',event=>{if(!interactive||event.button>0)return;suppressClick=false;dragDistance=0;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});drag={x:event.clientX,y:event.clientY,distance:distance()};event.target.setPointerCapture?.(event.pointerId);});
 on(viewport,'pointermove',event=>{if(!interactive||!pointers.has(event.pointerId)||!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const nextDistance=distance();if(pointers.size>1){if(drag.distance>0)camera.scale*=nextDistance/drag.distance;suppressClick=true;}else{dragDistance+=Math.hypot(dx,dy);if(dragDistance>5)suppressClick=true;if(event.shiftKey){camera.x+=dx;camera.y+=dy;}else camera.yaw+=dx*.008;}drag={x:event.clientX,y:event.clientY,distance:nextDistance};updateCamera();});
 const release=event=>{pointers.delete(event.pointerId);const remaining=[...pointers.values()][0];drag=remaining?{...remaining,distance:0}:null;};
 on(viewport,'pointerup',release);on(viewport,'pointercancel',release);on(viewport,'lostpointercapture',release);
 on(viewport,'keydown',event=>{if(event.key==='Escape'){setInteractive(false);root.querySelector('[data-city-action="interact"]')?.focus();return;}if(event.target!==viewport)return;if(event.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(event.key==='ArrowLeft')camera.x-=24;if(event.key==='ArrowRight')camera.x+=24;if(event.key==='ArrowUp')camera.y-=24;if(event.key==='ArrowDown')camera.y+=24;updateCamera();return;}const actions={ArrowLeft:'rotate-left',ArrowRight:'rotate-right','+':'zoom-in','=':'zoom-in','-':'zoom-out',Home:'reset'};if(actions[event.key]){event.preventDefault();act(actions[event.key]);}});
 on(media,'change',()=>{playing=true;root.classList.toggle('motion-paused',!playing);root.classList.remove('motion-enabled');renderUI();});
 // Renderer owns drawing; controller owns translated status and explicit user controls.
 const status=root.querySelector('[data-city-status]');const statusObserver=status?new MutationObserver(()=>{const text=playing?labels[language].running:media.matches?labels[language].reduced:labels[language].paused;if(status.textContent!==text)status.textContent=text;}):null;
 statusObserver?.observe(status,{childList:true});
 function setLanguage(value){language=value==='es'?'es':'en';renderer.setLanguage(language);renderUI();}
 const cameraResizeObserver=new ResizeObserver(()=>{if(!disposed)updateCamera();});cameraResizeObserver.observe(viewport);
 const languageObserver=new MutationObserver(()=>setLanguage(root.dataset.language));languageObserver.observe(root,{attributes:true,attributeFilter:['data-language']});
 renderUI();renderer.setLanguage(language);
 const api={setLanguage,getState:()=>({playing,interactive,selected,camera:{...camera},language,time:renderer.getTime()}),destroy(){if(disposed)return;disposed=true;renderer();cameraResizeObserver.disconnect();listeners.forEach(remove=>remove());languageObserver.disconnect();statusObserver?.disconnect();delete root.workflowCity;}};
 root.workflowCity=api;return api;
}
window.initWorkflowCity=initWorkflowCity;
// Pure helpers permit camera and public-data regression testing without a browser.
window.workflowCityGeometry={normalizeYaw,rotateWorld,projectWorld,worldDepth,visibleSides,cuboidFaces,sortWorldObjects,roles:workflowRoles};
})();
