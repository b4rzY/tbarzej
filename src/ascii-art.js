/* Independently authored mathematical character art. No third-party source/assets. */
(function () {
'use strict';
const glyphs = ' .,:;=+itnoxOQMW@';
const clamp = n => Math.max(0, Math.min(1, n));
function sample(x, y, time, mode = 'horizon') {
  const r = Math.hypot(x,y), a = Math.atan2(y,x);
  if (mode === 'bloom') {
    const petals = .48 + .14*Math.cos(5*a + time*.12) + .035*Math.cos(10*a-time*.2);
    const bloom = r < petals ? Math.pow(Math.max(0,1-r/petals),.25)*(.55+.45*Math.pow(Math.cos(r*32-a*5+time*.2),2)) : Math.exp(-Math.pow((r-petals)/.04,2))*.35;
    const inner = Math.exp(-Math.pow((r-.20-.06*Math.sin(3*a+time*.2))/.045,2));
    return clamp((bloom+inner*.8)*( .60+.4*Math.sin(a*13-r*32+time)*Math.sin(a*13-r*32+time)));
  }
  if (mode === 'wave') {
    const envelope = Math.exp(-Math.pow(x/1.15,8));
    const wave = Math.sin(x*4+time*.4)*.20 + Math.sin(x*8-time*.3)*.06;
    return clamp(envelope*(Math.exp(-Math.pow((y-wave)/.045,2)) + .65*Math.exp(-Math.pow((y+wave+.12)/.045,2)) + .4*Math.exp(-Math.pow((y-wave*.5-.20)/.04,2))));
  }
  // An independently designed continuous orbit field, not a port of another renderer.
  const diskR = Math.hypot(x, y/.20);
  const diskAngle = Math.atan2(y/.20,x);
  const bands = .65+.35*Math.cos(diskR*70+Math.sin(diskAngle*3-time*.25));
  const swirl = .75+.25*Math.sin(diskAngle*5-time/(.3+diskR)+diskR*24);
  const disk = diskR>.30 && diskR<1.40 ? Math.pow(1-diskR/1.42,.40)*bands*swirl : 0;
  const rim = Math.exp(-Math.pow((r-.30)/.018,2));
  const arch = y<0 ? Math.exp(-Math.pow((Math.hypot(x,y/.86)-.36)/.068,2))*(.65+.35*Math.pow(Math.sin(a*15-time*.7+r*55),2)) : 0;
  // Foreground disk crosses the lower edge, the back disk disappears behind the void.
  if(r<.285 && y<.025)return 0;
  return clamp(disk*1.25 + rim*.8 + arch*.95);
}

function draw(ctx, width, height, time=0, {mode='horizon', background=false, hero=false}={}) {
  const step = Math.max(3.5, width / (background ? 240 : 210));
  const small=width<760;
  const cx=width*(background?(small?.5:.74):.5), cy=height*(background?(small?.57:.38):.50);
  const scale=background?Math.min(width*(small?.33:.18),height*.48):Math.min(width*(mode==='bloom'?.62:hero?.35:.31),height*(mode==='bloom'?.66:.70));
  ctx.save();
  const inheritedAlpha=ctx.globalAlpha;
  if(mode==='horizon'){
    const glow=ctx.createRadialGradient(cx,cy,scale*.21,cx,cy,scale*.52);
    glow.addColorStop(0,'rgba(250,124,42,0)');glow.addColorStop(.48,'rgba(230,105,29,.18)');glow.addColorStop(1,'rgba(185,65,13,0)');
    ctx.fillStyle=glow;ctx.fillRect(cx-scale*.55,cy-scale*.55,scale*1.1,scale*1.1);
    ctx.fillStyle='#03050a';ctx.beginPath();ctx.arc(cx,cy,scale*.278,0,Math.PI*2);ctx.fill();
  }
  ctx.font=`${Math.ceil(step)}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
  const colors=mode==='bloom'?['#884569','#d879a6','#ffe0ee']:mode==='wave'?['#336e80','#73c0ce','#d0fff0']:['#b84d1d','#f1a14b','#fff1cc'];
  // Draw on an aligned character lattice; movement changes the field, not the typography.
  for(let y=Math.max(0,cy-scale*.8);y<Math.min(height,cy+scale*.8);y+=step*1.3)for(let x=Math.max(0,cx-scale*1.55);x<Math.min(width,cx+scale*1.55);x+=step){
    const nx=(x-cx)/scale, ny=(y-cy)/scale;
    const tilt=.12;
    const u=nx*Math.cos(tilt)+ny*Math.sin(tilt),v=-nx*Math.sin(tilt)+ny*Math.cos(tilt);
    const value=sample(u,v,time,mode);if(value<.05)continue;
    ctx.globalAlpha=inheritedAlpha*(background?.90:1)*(.50+value*.50);
    ctx.fillStyle=colors[Math.min(2,Math.floor(value*3))];
    ctx.fillText(glyphs[Math.max(1,Math.min(glyphs.length-1,Math.floor(value*(glyphs.length-1))))],x,y);
  }
  ctx.restore();
}
if(typeof window!=='undefined')window.portfolioAscii={sample,draw};
if(typeof module!=='undefined')module.exports={sample,draw};
})();
