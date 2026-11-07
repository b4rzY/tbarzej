import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={};vm.runInNewContext(readFileSync('src/city.js','utf8'),{window});
const {normalizeYaw,rotateWorld,projectWorld,worldDepth}=window.workflowCityGeometry;
const visibleSides=(...args)=>structuredClone(window.workflowCityGeometry.visibleSides(...args));
const cuboidFaces=(...args)=>structuredClone(window.workflowCityGeometry.cuboidFaces(...args));
const sortWorldObjects=(...args)=>Array.from(window.workflowCityGeometry.sortWorldObjects(...args));

const TAU=Math.PI*2;
const camera={cx:350,cy:275,unit:30,yaw:0};
const close=(actual,expected,message='',epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${message}: expected ${expected}, received ${actual}`);
const closePoint=(actual,expected,message='')=>{close(actual.x,expected.x,`${message} x`);close(actual.y,expected.y,`${message} y`);};
const projectedArea=points=>Math.abs(points.reduce((area,p,i)=>{const next=points[(i+1)%points.length];return area+p.x*next.y-p.y*next.x;},0))/2;
const center=face=>face.points.reduce((sum,point)=>sum.map((value,i)=>value+point[i]/face.points.length),[0,0,0]);
const faceByAxis=faces=>Object.fromEntries(faces.map(face=>[face.axis,face]));

test('yaw normalization wraps both directions and guards invalid saved values',()=>{
 for(const yaw of [-TAU*12,-TAU,-Math.PI,-.1,0,.1,Math.PI,TAU,TAU*12+.3]){
  const normalized=normalizeYaw(yaw);
  assert.ok(normalized>=0&&normalized<TAU);
  close(Math.sin(normalized),Math.sin(yaw));close(Math.cos(normalized),Math.cos(yaw));
 }
 for(const yaw of [NaN,Infinity,-Infinity,undefined,null,'90'])assert.equal(normalizeYaw(yaw),0);
 assert.equal(normalizeYaw(TAU),0);close(normalizeYaw(-Math.PI/2),Math.PI*1.5);
});

test('zero yaw preserves the original isometric projection and keeps heights upright',()=>{
 for(const [x,y,z] of [[0,0,0],[-6.45,6.45,-.28],[3.65,-3.65,4.15],[-2,3,.1]]){
  closePoint(projectWorld(x,y,z,camera),{x:350+(x-y)*30,y:275+(x+y)*30*.49-z*30});
 }
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5,TAU]){
  const view={...camera,yaw},base=projectWorld(2,3,.1,view),top=projectWorld(2,3,4.1,view);
  close(top.x,base.x);close(top.y,base.y-120,'orbit must not rotate verticals in screen space');
 }
});

test('world rotation has the expected quarter-turn positions and preserves distances',()=>{
 for(const [yaw,expected] of [[0,{x:2,y:3}],[Math.PI/2,{x:-3,y:2}],[Math.PI,{x:-2,y:-3}],[Math.PI*1.5,{x:3,y:-2}],[TAU,{x:2,y:3}]]){
  closePoint(rotateWorld(2,3,yaw),expected);
  closePoint(projectWorld(2,3,1,{...camera,yaw}),{x:350+(expected.x-expected.y)*30,y:275+((expected.x+expected.y)*.49-1)*30});
 }
 for(const yaw of [-7,-Math.PI/4,.13,Math.PI/3,4.8,TAU+1]){
  const rotated=rotateWorld(-4.5,2.25,yaw);
  close(rotated.x**2+rotated.y**2,4.5**2+2.25**2);
  closePoint(rotateWorld(rotated.x,rotated.y,-yaw),{x:-4.5,y:2.25});
 }
});

test('front-facing sides switch correctly through all four viewing quadrants',()=>{
 for(const [yaw,expected] of [[0,{x:1,y:1}],[Math.PI/2,{x:1,y:-1}],[Math.PI,{x:-1,y:-1}],[Math.PI*1.5,{x:-1,y:1}],[TAU,{x:1,y:1}]]){
  assert.deepEqual(visibleSides(yaw),expected);
 }
 const epsilon=1e-6;
 for(const [yaw,before,after] of [
  [Math.PI/4,{x:1,y:1},{x:1,y:-1}],
  [Math.PI*3/4,{x:1,y:-1},{x:-1,y:-1}],
  [Math.PI*5/4,{x:-1,y:-1},{x:-1,y:1}],
  [Math.PI*7/4,{x:-1,y:1},{x:1,y:1}]
 ]){
  assert.deepEqual(visibleSides(yaw-epsilon),before);
  assert.deepEqual(visibleSides(yaw+epsilon),after);
 }
});

test('a full orbit returns projected vertices, visible sides, and depth to their initial state',()=>{
 const bounds=[-2.1,1.3,1.7,1.6,.1,4.15];
 for(const yaw of [0,.17,Math.PI/2,2.4,Math.PI,4.1,Math.PI*1.5,5.9]){
  assert.deepEqual(visibleSides(yaw+TAU),visibleSides(yaw));
  const start=faceByAxis(cuboidFaces(...bounds,yaw)),end=faceByAxis(cuboidFaces(...bounds,yaw+TAU));
  for(const axis of ['x','y','z']){
   assert.deepEqual(start[axis],end[axis]);
   for(const point of start[axis].points){
    closePoint(projectWorld(...point,{...camera,yaw:yaw+TAU}),projectWorld(...point,{...camera,yaw}));
    close(worldDepth(...point,yaw+TAU),worldDepth(...point,yaw));
   }
  }
 }
});

test('ground depth ordering reverses after a half turn, while elevation still faces the viewer',()=>{
 const points=[[-4,-1,0],[-1,3,0],[2,1,0],[3,4,0]];
 for(const yaw of [0,.2,Math.PI/2,2.1,Math.PI,4.8]){
  const order=angle=>points.map((point,index)=>({index,depth:worldDepth(...point,angle)})).sort((a,b)=>a.depth-b.depth).map(point=>point.index);
  assert.deepEqual(order(yaw+Math.PI),order(yaw).reverse());
  for(const [x,y] of points){
   close(worldDepth(x,y,0,yaw+Math.PI),-worldDepth(x,y,0,yaw));
   close(worldDepth(x,y,3,yaw)-worldDepth(x,y,0,yaw),2.94);
  }
 }
});

test('depth measures the projection-null viewing direction rather than screen height',()=>{
 for(const yaw of [0,.23,Math.PI/2,Math.PI,4.8,TAU]){
  const view={...camera,yaw},point=[1.2,-2.4,3.1];
  // In camera coordinates [1, 1, .98] has zero screen displacement.
  const horizontal=rotateWorld(1,1,-yaw),toward=[horizontal.x,horizontal.y,.98];
  const advanced=point.map((value,i)=>value+toward[i]*2);
  closePoint(projectWorld(...advanced,view),projectWorld(...point,view));
  close(worldDepth(...advanced,yaw)-worldDepth(...point,yaw),2*(2+.98**2));
 }
});

test('cuboids expose valid bounded faces in painter order throughout the orbit',()=>{
 const bounds=[-2.1,1.3,1.7,1.6,.1,4.15],[x,y,w,d,z,h]=bounds;
 for(let step=0;step<=720;step++){
  const yaw=step*TAU/720,faces=cuboidFaces(...bounds,yaw),sides=visibleSides(yaw);
  assert.equal(faces.length,3);assert.deepEqual(new Set(faces.map(face=>face.axis)),new Set(['x','y','z']));
  let previous=-Infinity;
  for(const face of faces){
   assert.equal(face.points.length,4);assert.equal(new Set(face.points.map(point=>point.join(','))).size,4);
   for(const point of face.points){
    assert.equal(point.length,3);assert.ok(point.every(Number.isFinite));
    assert.ok(point[0]===x||point[0]===x+w);assert.ok(point[1]===y||point[1]===y+d);assert.ok(point[2]===z||point[2]===h);
    const screen=projectWorld(...point,{...camera,yaw});assert.ok(Number.isFinite(screen.x)&&Number.isFinite(screen.y));
   }
   const axisIndex={x:0,y:1,z:2}[face.axis],constant=face.axis==='z'?h:face.axis==='x'?(sides.x>0?x+w:x):(sides.y>0?y+d:y);
   assert.equal(face.sign,face.axis==='z'?1:sides[face.axis]);assert.ok(face.points.every(point=>point[axisIndex]===constant));
   const depth=worldDepth(...center(face),yaw);assert.ok(depth>=previous-1e-12);previous=depth;
  }
 }
});

test('projected face areas match orthographic geometry on either side of every boundary',()=>{
 const bounds=[-2.1,1.3,1.7,1.6,.1,4.15],[,,w,d,z,h]=bounds;
 for(let boundary=0;boundary<=8;boundary++){
  for(const offset of [-1e-6,0,1e-6]){
   const yaw=boundary*Math.PI/4+offset,view={cx:0,cy:0,unit:30,yaw};
   const expected={x:d*(h-z)*view.unit**2*Math.abs(Math.cos(yaw)+Math.sin(yaw)),y:w*(h-z)*view.unit**2*Math.abs(Math.cos(yaw)-Math.sin(yaw)),z:.98*w*d*view.unit**2};
   let nondegenerate=0;
   for(const face of cuboidFaces(...bounds,yaw)){
    const area=projectedArea(face.points.map(point=>projectWorld(...point,view)));
    close(area,expected[face.axis],`${face.axis} face at yaw ${yaw}`,1e-8);
    if(area>1e-8)nondegenerate++;
   }
   // At exact diagonals one wall is edge-on, so only two projected faces have area.
   assert.equal(nondegenerate,boundary%2===1&&offset===0?2:3);
  }
 }
});

test('orthographic zoom scales about the camera center without distance-dependent perspective',()=>{
 for(const yaw of [0,.3,Math.PI/2,Math.PI,Math.PI*1.5]){
  const view={...camera,yaw};
  for(const factor of [.55,1,2,2.4]){
   for(const point of [[-6.45,6.45,-.28],[3.65,-3.65,4.15],[0,0,1]]){
    const original=projectWorld(...point,view),zoomed=projectWorld(...point,{...view,unit:view.unit*factor});
    closePoint(zoomed,{x:view.cx+(original.x-view.cx)*factor,y:view.cy+(original.y-view.cy)*factor});
   }
  }
  const a=projectWorld(0,0,0,view),b=projectWorld(1,2,3,view),farA=projectWorld(10,-20,5,view),farB=projectWorld(11,-18,8,view);
  closePoint({x:b.x-a.x,y:b.y-a.y},{x:farB.x-farA.x,y:farB.y-farA.y});
  closePoint(projectWorld(1,2,3,{...view,cx:camera.cx+40,cy:camera.cy-25}),{x:b.x+40,y:b.y-25});
 }
});


const objectBounds=item=>({min:item.min,max:item.max});
const post={id:'post',min:[2.8,-4.45,.1],max:[4.5,-2.85,2.6]};
const northDecor9={id:'north-decor-9',min:[2.4700000000000006,-5.05,.1],max:[3.0861661178712536,-4.476052113156547,.9938578384520952]};

test('world sorting fixes the Post/north-decor occlusion regression at 60 degrees',()=>{
 const yaw=Math.PI/3,items=[northDecor9,post];
 const groundDepth=item=>worldDepth((item.min[0]+item.max[0])/2,(item.min[1]+item.max[1])/2,0,yaw);
 assert.ok(groundDepth(northDecor9)<groundDepth(post),'ground-center sorting incorrectly draws decor behind Post');
 assert.deepEqual(sortWorldObjects(items,yaw,objectBounds),[post,northDecor9]);
 assert.deepEqual(sortWorldObjects(items,yaw+Math.PI,objectBounds),[northDecor9,post]);
 assert.deepEqual(sortWorldObjects(items,0,objectBounds),[northDecor9,post],'valid default-view ordering is retained');
 assert.deepEqual(items,[northDecor9,post],'input ordering is not mutated');
});

test('projected hull SAT rejects diagonal gaps even when screen rectangles overlap',()=>{
 const tower={id:'tower',min:[0,0,0],max:[1,1,10]};
 const small={id:'small',min:[1.1,.2,.01],max:[1.2,.3,.02]};
 // Their screen rectangles overlap at x .8..1, y .617..725. The small box is
 // below the tower silhouette there, so X separation must not add an edge.
 assert.deepEqual(sortWorldObjects([tower,small],0,objectBounds),[small,tower]);
 const overlapping={id:'overlapping',min:[1.1,.2,.4],max:[1.2,.3,.5]};
 assert.deepEqual(sortWorldObjects([tower,overlapping],0,objectBounds),[tower,overlapping]);
});

test('world sorting is stable for intersecting volumes and supports empty or flat bounds',()=>{
 const first={id:'first',min:[0,0,0],max:[1,1,1]},second={...first,id:'second'};
 assert.deepEqual(sortWorldObjects([first,second],0,objectBounds),[first,second]);
 assert.deepEqual(sortWorldObjects([second,first],0,objectBounds),[second,first]);
 assert.deepEqual(sortWorldObjects([],0,objectBounds),[]);
 const flat={id:'flat',min:[0,0,0],max:[1,1,0]},point={id:'point',min:[2,2,0],max:[2,2,0]};
 assert.deepEqual(new Set(sortWorldObjects([flat,point],Math.PI/4,objectBounds)),new Set([flat,point]));
 assert.throws(()=>sortWorldObjects([{min:[NaN,0,0],max:[1,1,1]}],0,objectBounds),{name:'TypeError'});
 assert.throws(()=>sortWorldObjects([{min:[2,0,0],max:[1,1,1]}],0,objectBounds),{name:'TypeError'});
});

function worldFixture(){
 const items=[];
 for(let x=0;x<4;x++)for(let y=0;y<4;y++)items.push({id:`building-${x}-${y}`,min:[x*1.4,y*1.4,.1],max:[x*1.4+.7+(y%2)*.2,y*1.4+.8, .6+((x*3+y)%5)*.4]});
 return items;
}

function rayHitsBox(point,direction,box){
 let near=-Infinity,far=Infinity;
 for(let axis=0;axis<3;axis++){
  if(Math.abs(direction[axis])<1e-10){if(point[axis]<box.min[axis]||point[axis]>box.max[axis])return false;}
  else{
   const a=(box.min[axis]-point[axis])/direction[axis],b=(box.max[axis]-point[axis])/direction[axis];
   near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
  }
 }
 return far>Math.max(near,1e-8);
}

test('full orbit preserves every immutable item and returns the same order after 360 degrees',()=>{
 const items=worldFixture().map(item=>Object.freeze({...item,min:Object.freeze(item.min),max:Object.freeze(item.max)}));
 Object.freeze(items);
 for(let degrees=0;degrees<=360;degrees++){
  const yaw=degrees*Math.PI/180,sorted=sortWorldObjects(items,yaw,objectBounds);
  assert.equal(sorted.length,items.length);assert.deepEqual(new Set(sorted),new Set(items));
  assert.deepEqual(sortWorldObjects(items,yaw,objectBounds),sorted);
  for(const item of sorted)for(const vertex of [item.min,item.max]){
   const projected=projectWorld(...vertex,{...camera,yaw});assert.ok(Number.isFinite(projected.x)&&Number.isFinite(projected.y));
  }
 }
 assert.deepEqual(sortWorldObjects(items,TAU,objectBounds),sortWorldObjects(items,0,objectBounds));
});

test('sorted nonintersecting volumes respect independent surface-ray occlusion checks',()=>{
 const items=worldFixture();let occlusions=0;
 for(let degrees=0;degrees<360;degrees+=15){
  const yaw=degrees*Math.PI/180,direction=[Math.cos(yaw)+Math.sin(yaw),Math.cos(yaw)-Math.sin(yaw),.98],sorted=sortWorldObjects(items,yaw,objectBounds);
  const order=new Map(sorted.map((item,index)=>[item,index]));
  for(const a of items){
   const [x,y,z]=a.min,[right,bottom,roof]=a.max;
   for(const face of cuboidFaces(x,y,right-x,bottom-y,z,roof,yaw))for(const u of [.1,.5,.9])for(const v of [.1,.5,.9]){
    const point=face.points[0].map((value,i)=>value+(face.points[1][i]-value)*u+(face.points[3][i]-value)*v);
    for(const b of items)if(a!==b&&rayHitsBox(point,direction,b)){
     occlusions++;assert.ok(order.get(a)<order.get(b),`${b.id} must occlude ${a.id} at ${degrees} degrees`);
    }
   }
  }
 }
 assert.ok(occlusions>100,'the sweep must exercise genuine overlapping projections');
});
