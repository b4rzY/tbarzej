/* Independently authored mathematical character art. No third-party source/assets. */
(function () {
'use strict';
const glyphs = ' .,:;=+itnoxOQMW@';
const clamp = n => Math.max(0, Math.min(1, n));
function sample(x, y, time, mode = 'horizon') {
  const r = Math.hypot(x,y), a = Math.atan2(y,x);
  if (mode === 'rose') {
    // Nested, overlapping polar petals: an original rose-like rosette.
    const boundary=.65+.055*Math.sin(a*7+time*.08);
    if(r>boundary)return 0;
    const petal=Math.sin(r*30-a*4+.8*Math.sin(a*5+r*9)+time*.17);
    const folds=Math.pow(Math.max(0,petal),3);
    const light=.5+.5*Math.cos(a-1.1);
    return clamp((.18+folds*.82)*Math.pow(1-r/(boundary+.04),.22)*(.6+light*.4)+Math.exp(-r*r/0.009)*.6);
  }
  if (mode === 'dollar') {
    // Fictional banknote geometry, not a scan or reproduction of currency.
    const ax=Math.abs(x),ay=Math.abs(y);if(ax>1.32||ay>.57)return 0;
    const line=(d,w=.012)=>Math.exp(-Math.pow(d/w,2));
    const border=Math.max(line(ax-1.27),line(ay-.52),.6*line(ax-1.19),.6*line(ay-.44));
    const oval=Math.hypot(x/.38,y/.42);
    const seal=line(oval-1,.045)*.8;
    const dollar=ay<.30?Math.max(line(x-Math.sin(y*10)*.13,.028),.8*line(x,.012)):0;
    const corner=Math.hypot((ax-1.02)/.13,(ay-.32)/.13);
    const ornament=line(corner-1,.10)*.7;
    const texture=.09+.14*Math.pow(Math.sin(x*47+y*37+time*.35)*Math.cos(y*51-x*23),2);
    const rays=ax>.49&&ax<.87&&ay<.30?.35*Math.pow(Math.cos(Math.atan2(y,ax-.65)*12+time*.1),8):0;
    return clamp(Math.max(border,seal,dollar,ornament,rays,texture));
  }
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
  if(mode==='zeus'){
    const rows=typeof window!=='undefined'?window.zeusAscii:null;if(!rows)return;
    const cell=Math.min(width/126,height/132),ox=(width-cell*120)/2,oy=(height-cell*124)/2;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.ceil(cell*1.2)}px monospace`;
    rows.forEach((row,y)=>{for(let x=0;x<120;x++){const rgb=row.slice(x*3,x*3+3);if(rgb==='---')continue;const r=parseInt(rgb[0],16)*17,g=parseInt(rgb[1],16)*17,b=parseInt(rgb[2],16)*17;const light=(r*.2126+g*.7152+b*.0722)/255;ctx.fillStyle=`rgb(${Math.min(255,r*1.4+22)},${Math.min(255,g*1.4+18)},${Math.min(255,b*1.4+15)})`;ctx.globalAlpha=.8+.2*Math.sin(time*.8+y*.05+x*.03)**2;ctx.fillText(' .,:;=+itnoxOQMW@'[Math.max(2,Math.min(15,Math.floor(light*15)))],ox+x*cell,oy+y*cell);}});ctx.restore();return;
  }
  const step = Math.max(3.5, width / (background ? 240 : 210));
  const small=width<760;
  const cx=width*(background?(small?.5:.74):.5), cy=height*(background?(small?.57:.38):.50);
  const scale=background?Math.min(width*(small?.33:.18),height*.48):Math.min(width*((mode==='bloom'||mode==='rose')?.62:hero?.35:.31),height*((mode==='bloom'||mode==='rose')?.66:.70));
  ctx.save();
  const inheritedAlpha=ctx.globalAlpha;
  if(mode==='horizon'){
    const glow=ctx.createRadialGradient(cx,cy,scale*.21,cx,cy,scale*.52);
    glow.addColorStop(0,'rgba(250,124,42,0)');glow.addColorStop(.48,'rgba(230,105,29,.18)');glow.addColorStop(1,'rgba(185,65,13,0)');
    ctx.fillStyle=glow;ctx.fillRect(cx-scale*.55,cy-scale*.55,scale*1.1,scale*1.1);
    ctx.fillStyle='#03050a';ctx.beginPath();ctx.arc(cx,cy,scale*.278,0,Math.PI*2);ctx.fill();
  }
  ctx.font=`${Math.ceil(step)}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
  const colors=mode==='dollar'?['#467c58','#9bd4a1','#e0ffd7']:(mode==='bloom'||mode==='rose')?['#884569','#d879a6','#ffe0ee']:mode==='wave'?['#336e80','#73c0ce','#d0fff0']:['#b84d1d','#f1a14b','#fff1cc'];
  // Draw on an aligned character lattice; movement changes the field, not the typography.
  for(let y=Math.max(0,cy-scale*.8);y<Math.min(height,cy+scale*.8);y+=step*1.3)for(let x=Math.max(0,cx-scale*1.55);x<Math.min(width,cx+scale*1.55);x+=step){
    const nx=(x-cx)/scale, ny=(y-cy)/scale;
    const tilt=mode==='dollar'?0:.12;
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
