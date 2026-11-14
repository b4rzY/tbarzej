/* Independently authored mathematical character art. No third-party source/assets. */
(function () {
'use strict';
const glyphs = ' .,:;+=xX#%@';
const clamp = n => Math.max(0, Math.min(1, n));
function sample(x, y, time, mode = 'horizon') {
  const r = Math.hypot(x,y), a = Math.atan2(y,x);
  if (mode === 'bloom') {
    const petals = .40 + .17*Math.cos(5*a + time*.12) + .055*Math.cos(10*a-time*.2);
    const bloom = Math.exp(-Math.pow((r-petals)/.075,2));
    const inner = Math.exp(-Math.pow((r-.20-.06*Math.sin(3*a+time*.2))/.045,2));
    return clamp((bloom+inner*.8)*( .60+.4*Math.sin(a*13-r*32+time)*Math.sin(a*13-r*32+time)));
  }
  if (mode === 'wave') {
    const envelope = Math.exp(-Math.pow(x/1.15,8));
    const wave = Math.sin(x*4+time*.4)*.20 + Math.sin(x*8-time*.3)*.06;
    return clamp(envelope*(Math.exp(-Math.pow((y-wave)/.045,2)) + .65*Math.exp(-Math.pow((y+wave+.12)/.045,2)) + .4*Math.exp(-Math.pow((y-wave*.5-.20)/.04,2))));
  }
  // Thin oblique disk and a separate lensed upper image around a dark horizon.
  const diskR = Math.hypot(x, y/.24);
  const disk = diskR>.34 && diskR<1.36 ? Math.pow(1-diskR/1.4,.65) * (.48+.52*Math.pow(Math.sin(diskR*43-a*3-time*.8),2)) : 0;
  const ring = Math.exp(-Math.pow((r-.34)/.024,2));
  const upper = y<0 ? Math.exp(-Math.pow((Math.hypot(x,y/.88)-.44)/.09,2))*.64 : 0;
  const front = y>0 && y<.16 ? disk : 0;
  return r<.315 && !front ? 0 : clamp(disk+ring*.8+upper);
}
function draw(ctx, width, height, time=0, {mode='horizon', background=false}={}) {
  const step = background ? Math.max(9, Math.sqrt(width*height/6500)) : Math.max(7, width/90);
  const cx=width*(background?.72:.5), cy=height*(background?.38:.50);
  const scale=background?Math.min(width*.39,height*.62):Math.min(width*.34,height*.68);
  ctx.save();ctx.font=`${Math.ceil(step)}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
  const colors=mode==='bloom'?['#582e5f','#b85eac','#efb1d5']:mode==='wave'?['#1a5360','#4a9eaa','#b5e7da']:['#6e3424','#b87540','#f2cf91'];
  // Draw on an aligned character lattice; movement changes the field, not the typography.
  for(let y=0;y<height;y+=step*1.15)for(let x=0;x<width;x+=step){
    const nx=(x-cx)/scale, ny=(y-cy)/scale;
    const tilt=background?-.15:0;
    const u=nx*Math.cos(tilt)+ny*Math.sin(tilt),v=-nx*Math.sin(tilt)+ny*Math.cos(tilt);
    const value=sample(u,v,time,mode);if(value<.05)continue;
    ctx.globalAlpha=(background?.80:1)*(.30+value*.70);
    ctx.fillStyle=colors[Math.min(2,Math.floor(value*3))];
    ctx.fillText(glyphs[Math.max(1,Math.min(glyphs.length-1,Math.floor(value*(glyphs.length-1))))],x,y);
  }
  ctx.restore();
}
if(typeof window!=='undefined')window.portfolioAscii={sample,draw};
if(typeof module!=='undefined')module.exports={sample,draw};
})();
