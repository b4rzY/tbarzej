import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import QRCode from 'qrcode';
import './style.css';
import {softwareRenderer} from './software.js';
const $=s=>document.querySelector(s);let theme='tree',link='https://barzelatto.dev',paused=false,scan=false,aligned=false;
const themes={tree:{category:'Nature & hospitality',name:'The living link',title:'A welcome worth growing.',copy:'A flowering canopy becomes an invitation. Imagine a boutique hotel’s welcome guide, a garden trail, or a café’s seasonal menu.',color:0x973653,bg:0xeeeade},food:{category:'Restaurants & cafés',name:'The tasting edition',title:'The menu becomes the moment.',copy:'A sculptural chocolate tasting plate. From a table-side menu to a chef’s tasting story, a little curiosity opens the appetite.',color:0x7d2a21,bg:0xf3e5d9},beauty:{category:'Beauty & wellness',name:'A signature experience',title:'Book a little transformation.',copy:'A sculptural bottle for a beauty brand’s next chapter. Scan to book a treatment, explore a collection, or meet your stylist.',color:0x593155,bg:0xeee2ec},gym:{category:'Fitness & movement',name:'Your next move',title:'Turn interest into momentum.',copy:'A miniature training studio with a moving treadmill. Link to class schedules, trial sessions, or a personal training plan.',color:0x273e66,bg:0xe1e9ee}};
const stage=$('#stage'),canvas=$('#scene');let renderer,controls,scene,camera,root,qrGroup,animated=[];const clock=new THREE.Clock();
const mat=(c,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color:c,roughness,metalness});
function mesh(geo,m,x=0,y=0,z=0,parent=root){let o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(x,y,z,w,h,d,m,parent=root){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent)}
function cyl(x,y,z,r1,r2,h,m,parent=root){return mesh(new THREE.CylinderGeometry(r1,r2,h,64),m,x,y,z,parent)}
function branch(a,b,r,m,parent=root){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=mesh(new THREE.CylinderGeometry(r*.65,r,v.length(),10),m,0,0,0,parent);o.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
function cleanup(){if(!root)return;root.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}});scene.remove(root)}
function create(){cleanup();animated=[];root=new THREE.Group();scene.add(root);const t=themes[theme];scene.background=new THREE.Color(t.bg);stage.style.background='#'+t.bg.toString(16);let dark=mat(t.color),cream=mat(0xf8f2df),gold=mat(0xa78857,.35,.55);const matrix=QRCode.create(link,{errorCorrectionLevel:'H'}).modules;const n=matrix.size,cell=3.35/n;qrGroup=new THREE.Group();root.add(qrGroup);qrGroup.position.y=2.6;
// Every dark QR module has the same top face: no random omission or decorative finder corruption.
const cubeGeo=new THREE.BoxGeometry(cell, .055, cell);let count=0;matrix.data.forEach(v=>count+=v?1:0);const instances=new THREE.InstancedMesh(cubeGeo,dark,count);instances.castShadow=true;instances.receiveShadow=true;const tmp=new THREE.Object3D();let i=0;
const organic=theme==='tree';
for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(!matrix.get(y,x))continue;
 const nx=(x-(n-1)/2)*cell,nz=(y-(n-1)/2)*cell;
 const crown=organic? .3+1.1*Math.max(0,1-(nx*nx+nz*nz)/5.5)+.09*Math.sin(x*3+y):.12;
 tmp.position.set(nx,crown,nz);tmp.updateMatrix();instances.setMatrixAt(i++,tmp.matrix);
}
qrGroup.add(instances);
// Sculptural modules have uninterrupted top faces so the orthographic alignment preserves each bit.
if(organic){const petalGeo=new THREE.IcosahedronGeometry(cell*.27,1),petalMat=mat(0xc5768e,.85);const bloom=new THREE.InstancedMesh(petalGeo,petalMat,count*3);let k=0;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(!matrix.get(y,x))continue;const nx=(x-(n-1)/2)*cell,nz=(y-(n-1)/2)*cell,cy=.3+1.1*Math.max(0,1-(nx*nx+nz*nz)/5.5)+.09*Math.sin(x*3+y);
 for(let j=0;j<3;j++){tmp.position.set(nx+Math.sin(j*2.1)*cell*.2,cy-.06-j*.075,nz+Math.cos(j*2.1)*cell*.2);tmp.scale.set(1.2,.75,1.2);tmp.updateMatrix();bloom.setMatrixAt(k++,tmp.matrix)}}qrGroup.add(bloom);tmp.scale.set(1,1,1);
}
const plinth=box(0,-.13,0,4.55,.22,4.55,mat(0xe4dfd3)); box(0,-.005,0,4.45,.025,4.45,mat(0xf8f5ee));
if(theme==='tree'){
 const bark=mat(0x715340);cyl(0,1.05,0,.09,.24,2.2,bark);
 for(let i=0;i<17;i++){const a=i*2.399,r=.45+(i%5)*.22;branch([0,.7+i*.045,0],[Math.cos(a)*r,2.9+(i%3)*.13,Math.sin(a)*r],.045,bark)}
 const petals=[mat(0xc5768e),mat(0xe3a2b3),mat(0xb95d7a)];
 for(let i=0;i<36;i++){let p=mesh(new THREE.SphereGeometry(.025,6,4),petals[i%3],Math.sin(i)*1.6,.1+((i*.31)%2),Math.cos(i*2)*1.6);animated.push({o:p,type:'petal',phase:i})}
 const grass=mat(0x819875);for(let i=0;i<65;i++){let a=i*2.399,r=2.06;const x=Math.cos(a)*r,z=Math.sin(a)*r;let blade=mesh(new THREE.ConeGeometry(.025,.12+i%3*.035,4),grass,x,.08,z);blade.rotation.z=Math.sin(i)*.2}
}else if(theme==='food'){
 qrGroup.position.y=.58;qrGroup.scale.set(.82,1,.82);
 const porcelain=mat(0xf9f6eb,.18);cyl(0,.08,0,2.02,1.85,.16,porcelain);const rim=mesh(new THREE.TorusGeometry(1.88,.045,12,96),gold,0,.18,0);rim.rotation.x=Math.PI/2;
 box(0,.36,0,3.05,.37,3.05,mat(0x2e1c16,.38));box(0,.56,0,2.97,.045,2.97,cream);
 // QR tiles become the chocolate mosaic; a pale ganache layer supplies the negative space.
 const raspberry=mat(0x922e44);for(let i=0;i<3;i++){mesh(new THREE.SphereGeometry(.13,16,12),raspberry,1.55,.25,-.9+i*.3)}
 branch([-1.7,.2,-1.6],[-1.7,.2,1.3],.025,gold);for(let j=0;j<4;j++)branch([-1.78+j*.05,.2,-1.6],[-1.78+j*.05,.2,-1.9],.012,gold);
}else if(theme==='beauty'){
 qrGroup.scale.set(.46,1,.46);qrGroup.position.y=2.45;box(0,2.5,0,1.85,.12,1.85,cream);
 const lavender=mat(0xa4859d,.22,.15);box(0,.9,0,1.45,1.65,1.05,lavender);box(0,1.87,0,.65,.3,.65,gold);cyl(0,2.18,0,.23,.23,.36,mat(0x493344,.3));
 box(0,.95,.53,.92,.7,.025,cream);box(0,1,.55,.53,.03,.01,gold);box(0,.86,.55,.34,.025,.01,gold);
 const leaf=mat(0x7f927a);for(let i=0;i<7;i++){let a=i*.7;branch([-1.25,.1,-.35],[-1.3+Math.sin(a)*.45,.6+i*.1,-.3+Math.cos(a)*.3],.015,gold);const o=mesh(new THREE.SphereGeometry(.16,8,6),leaf,-1.3+Math.sin(a)*.45,.6+i*.1,-.3+Math.cos(a)*.3);o.scale.set(.6,1.6,.25);o.rotation.z=a}
 cyl(1.35,.18,.7,.42,.42,.25,cream);cyl(1.35,.32,.7,.4,.4,.08,gold);
}else{
 qrGroup.position.y=.48;box(0,.42,0,3.85,.06,3.85,cream);
 const metal=mat(0x334454,.35,.65),rubber=mat(0x17232b);box(0,.2,.4,3.85,.28,3.8,metal);
 for(let i=0;i<14;i++){let o=box(0,.4,-.7+i*.16,1.3,.015,.025,mat(0x526575));animated.push({o,type:'belt',phase:i})}
 for(let x of [-1.95,1.95]){branch([x,.2,-.8],[x,1.8,-1.1],.055,metal);branch([x,1.8,-1.1],[x,1.45,.35],.05,metal)}box(0,1.82,-1.7,3.9,.35,.2,metal);box(0,1.84,-1.59,.6,.16,.025,mat(0x83b4a3));
 for(let x of [-1.7,1.7]){let b=cyl(x,.19,.4,.06,.06,.7,metal);b.rotation.z=Math.PI/2;for(let dx of [-.26,.26]){let d=cyl(x+dx,.19,.4,.2,.2,.12,rubber);d.rotation.z=Math.PI/2}}
 
}
if(theme==='beauty')animated.push({o:qrGroup,type:'scent',phase:0});$('#theme-category').textContent=t.category;$('#theme-title').textContent=t.name;$('#use-title').textContent=t.title;$('#use-copy').textContent=t.copy;
}
async function makeQR(){await QRCode.toCanvas($('#qr'),link,{width:768,margin:4,errorCorrectionLevel:'H',color:{dark:'#102018',light:'#ffffff'}});$('#fallback').href=link;$('#error').textContent='';if(renderer)create()}
try{
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xeeeade)}catch{renderer=softwareRenderer(canvas);renderer.software=true}scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-3.6,3.6,3.6,-3.6,.1,80);camera.position.set(5.5,5.4,7);controls=new OrbitControls(camera,canvas);controls.target.set(0,1.8,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=13;controls.maxPolarAngle=Math.PI*.48;controls.autoRotate=true;controls.autoRotateSpeed=.45;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a7e6a,2.4));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;scene.add(key);const fill=new THREE.DirectionalLight(0xffdfbd,1);fill.position.set(4,3,-4);scene.add(fill);
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.left=-3.5*w/h;camera.right=3.5*w/h;camera.top=3.5;camera.bottom=-3.5;camera.updateProjectionMatrix()}).observe(stage);
let visible=true;new IntersectionObserver(([entry])=>visible=entry.isIntersecting).observe(stage);let t=0,lastFrame=0;function frame(now=0){requestAnimationFrame(frame);if(renderer.software&&now-lastFrame<50)return;lastFrame=now;const dt=Math.min(clock.getDelta(),.05);if(!visible||document.hidden||scan)return;if(!paused){t+=dt;animated.forEach(({o,type,phase})=>{if(type==='petal'){o.position.y=2.3-((t*.23+phase*.13)%2.2);o.position.x=Math.sin(phase+t*.4)*1.8;}if(type==='steam'){o.position.y=1+Math.sin(t*1.3+phase)*.12;o.rotation.z=Math.sin(t+phase)*.12}if(type==='scent'&&!aligned)o.rotation.y=Math.sin(t*.4)*.04;if(type==='belt')o.position.z=-.7+((phase*.16+t*.65)%2.2)})}controls.autoRotate=!paused&&!aligned;controls.update();renderer.render(scene,camera)}frame();
}catch(e){$('#webgl-warning').hidden=false;console.warn('WebGL unavailable; scan view remains available.');}
$('#align').onclick=()=>{aligned=!aligned;controls.target.set(0,aligned?qrGroup.position.y:1.8,0);camera.position.set(aligned?0:5.5,aligned?12:5.4,aligned?.001:7);controls.enableRotate=!aligned;root.children.forEach(o=>{if(o!==qrGroup)o.visible=!aligned});scene.background.set(aligned?0xffffff:themes[theme].bg);stage.classList.toggle('aligned',aligned);camera.zoom=aligned?(theme==='beauty'?1.8:theme==='food'?1.1:.9):1;camera.updateProjectionMatrix();$('#align').textContent=aligned?'Return to sculpture':'Align 3D code';controls.update();};
$('#view').onclick=()=>{scan=!scan;$('#scan-panel').hidden=!scan;$('#view').textContent=scan?'Back to 3D object':'Show scan-ready QR';$('#view-hint').textContent=scan?'Camera-ready · Four-module quiet zone':'Drag to orbit · Scroll to explore'};
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{theme=b.dataset.theme;document.querySelectorAll('[data-theme]').forEach(x=>x.setAttribute('aria-pressed',x===b));if(renderer)create();if(aligned){aligned=false;$('#align').click()}});
$('#motion').onclick=()=>{paused=!paused;$('#motion').textContent=paused?'Resume motion':'Pause motion';$('#motion').setAttribute('aria-pressed',paused)};
$('#destination-form').onsubmit=e=>{e.preventDefault();try{const u=new URL($('#destination').value);if(!['https:','http:'].includes(u.protocol))throw Error();if(u.href.length>180)throw Error();link=u.href;makeQR().catch(()=>$('#error').textContent='Could not generate this code. Try a shorter link.')}catch{$('#error').textContent='Enter a complete http:// or https:// link, up to 180 characters.'}};
$('#download').onclick=()=>{const a=document.createElement('a');a.download='barzelatto-qr-'+theme+'.png';a.href=$('#qr').toDataURL('image/png');a.click()};makeQR();
