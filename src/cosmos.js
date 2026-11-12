/* Original procedural artwork. No images, tracking, or runtime dependencies. */
(function () {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function seeded(seed) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function deformPoint(x, y, pointer, radius) {
    const dx = pointer.x - x, dy = pointer.y - y;
    const distance = Math.hypot(dx, dy);
    const influence = Math.pow(Math.max(0, 1 - distance / radius), 2);
    return { x: x + dx * influence * 0.32, y: y + dy * influence * 0.32, influence };
  }
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { seeded, deformPoint, clamp };
    return;
  }
  const canvas = document.getElementById('galaxy-canvas');
  const mesh = document.getElementById('mesh-canvas');
  const interaction = document.getElementById('interaction-canvas');
  if (!canvas || !mesh || !interaction) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const wire = mesh.getContext('2d');
  const grid = interaction.getContext('2d');
  if (!ctx || !wire || !grid) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  let width = 0, height = 0, dpr = 1, stars = [], nodes = [];
  let frame = 0, lastFrame = 0, resizeTimer = 0, destroyed = false, motionTime = 0;
  let scrollEnergy = 0, lastScrollY = window.scrollY || 0;
  let enabled = !reduced.matches, explicitMotion = false;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 };
  const getState = () => ({ motion: enabled, enabled, reducedMotion: reduced.matches, coarsePointer: coarse.matches, paused: document.hidden || !enabled, destroyed });
  function announce() { window.dispatchEvent(new CustomEvent('cosmosstatechange', { detail: getState() })); }
  function glow(x, y, radius, color, strength) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color},${strength})`);
    gradient.addColorStop(0.25, `rgba(${color},${strength * 0.43})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function backdrop() {
    const random = seeded(134777);
    ctx.globalCompositeOperation = 'source-over';
    const sky = ctx.createLinearGradient(0, height, width, 0);
    sky.addColorStop(0, '#030711'); sky.addColorStop(0.55, '#090d21'); sky.addColorStop(1, '#030713');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    glow(width * .83, height * .36, width * .60, '37,47,105', .23);
    glow(width * .31, height * .12, width * .42, '56,28,90', .15);
    stars = [];
    const count = Math.min(1900, Math.round(width * height / 670));
    for (let i = 0; i < count; i++) {
      const x = random() * width, y = random() * height;
      const size = .25 + Math.pow(random(), 5) * 1.15;
      const alpha = .13 + random() * .56;
      if (size > .75) { stars.push({ x, y, size, phase: random() * 6.28, speed: .7 + random() * 1.1 }); continue; }
      ctx.fillStyle = `rgba(${random() > .82 ? '255,215,183' : '185,207,246'},${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();

    }
    // Project a logarithmic spiral disk onto an oblique galactic plane.
    const cx = width * .73, cy = height * .40;
    const scale = Math.max(width * .61, height * .64);
    const tilt = -.39, flatten = .32;
    const project = (r, angle) => {
      const x = Math.cos(angle) * r * scale, y = Math.sin(angle) * r * scale * flatten;
      return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) };
    };
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(1, flatten);
    glow(0, 0, scale * 1.14, '75,105,174', .25);
    glow(0, 0, scale * .53, '130,145,184', .27);
    ctx.restore();
    ctx.globalCompositeOperation = 'screen';
    // Uneven gas clouds establish the arms, with cool ionized edges.
    for (let i = 0; i < 720; i++) {
      const r = .07 + Math.pow(random(), .67) * 1.1;
      const arm = Math.floor(random() * 3);
      const angle = r * 5.2 + arm * Math.PI * 2 / 3 + (random() - .5) * .48;
      const p = project(r, angle);
      const color = i % 5 === 0 ? '113,64,135' : i % 3 === 0 ? '86,143,193' : '118,134,174';
      glow(p.x, p.y, scale * (.012 + random() * .035), color, .015 + (1 - Math.min(r, 1)) * .025);
    }
    // Thousands of tiny grains create photographic texture rather than a smooth gradient.
    for (let i = 0; i < 57000; i++) {
      const r = Math.pow(random(), .70) * 1.13;
      const arm = Math.floor(random() * 3);
      const spread = (random() + random() + random() - 1.5) * (.13 + r * .25);
      const angle = r * 5.2 + arm * Math.PI * 2 / 3 + spread;
      const p = project(r, angle);
      const fade = Math.pow(Math.max(0, 1 - r / 1.16), .6);
      const alpha = (.025 + random() * .17) * fade;
      const warm = r < .19 && random() > .35;
      ctx.fillStyle = `rgba(${warm ? '238,218,193' : i % 7 === 0 ? '165,135,200' : '176,207,242'},${alpha})`;
      const size = .25 + random() * .95;
      ctx.fillRect(p.x, p.y, size, size);
    }
    // Branching dark dust ribbons carve organic gaps through the luminous disk.
    ctx.globalCompositeOperation = 'source-over';
    for (let arm = 0; arm < 3; arm++) {
      for (let branch = 0; branch < 3; branch++) {
        ctx.beginPath();
        for (let j = 0; j < 120; j++) {
          const r = .13 + j / 120 * .91;
          const angle = r * 5.2 + arm * Math.PI * 2 / 3 + .12 + branch * .055 + Math.sin(r * 24 + branch) * .015;
          const p = project(r, angle);
          if (!j) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(3,7,20,${.12 - branch * .025})`;
        ctx.lineWidth = scale * (.003 + branch * .002); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'screen';
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(1, .56);
    glow(0, 0, scale * .27, '142,167,206', .35);
    glow(0, 0, scale * .115, '231,216,192', .50);
    glow(0, 0, scale * .048, '255,242,217', .72);
    ctx.restore();
    // Bright foreground stars belong to the animation layer, not the static picture.
    for (let i = 0; i < (width < 600 ? 16 : 32); i++) {
      stars.push({ x: random() * width, y: random() * height, size: 1.2 + random() * .9,
        phase: random() * Math.PI * 2, speed: .9 + random() * .8, sparkle: true });
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // Original particle displacement field: bounded density, no texture or third-party code.
  function buildMesh() {
    nodes = [];
    const random = seeded(98171);
    const spacing = Math.max(width < 600 ? 13 : 15, Math.sqrt(width * height / 6500));
    for (let y = 0; y < height + spacing; y += spacing) {
      for (let x = 0; x < width + spacing; x += spacing) {
        nodes.push({ x: x + random() * 3, y: y + random() * 3, dx: 0, dy: 0 });
      }
    }
  }
  function drawMesh(time) {
    wire.clearRect(0, 0, width, height);
    grid.clearRect(0, 0, width, height);
    for (const original of stars) {
      const drift = enabled ? time * .001 : 0;
      const depth = original.size * 1.8;
      const star = { ...original,
        x: (original.x + drift * depth * .8) % width,
        y: (original.y + drift * depth * .3) % height };
      const shimmer = (Math.sin(time * .0022 * star.speed + star.phase) + 1) / 2;
      const alpha = enabled ? .06 + shimmer * shimmer * .94 : .65;
      const pulse = enabled ? shimmer * shimmer : .45;
      if (enabled && scrollEnergy > .05) {
        const length = scrollEnergy * depth * 17;
        wire.strokeStyle = `rgba(182,212,255,${scrollEnergy * alpha * .5})`;
        wire.lineWidth = Math.max(.6, star.size * .65);
        wire.beginPath(); wire.moveTo(star.x,star.y); wire.lineTo(star.x,star.y-length); wire.stroke();
      }
      if (star.sparkle) {
        const glowRadius = star.size * (4 + pulse * 5);
        const halo = wire.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
        halo.addColorStop(0, `rgba(185,218,255,${.12 + pulse * .5})`);
        halo.addColorStop(1, 'rgba(112,171,255,0)');
        wire.fillStyle = halo; wire.fillRect(star.x-glowRadius,star.y-glowRadius,glowRadius*2,glowRadius*2);
        const ray = star.size * (1 + pulse * 3.5);
        wire.strokeStyle = `rgba(206,229,255,${pulse * .65})`; wire.lineWidth = .75;
        wire.beginPath(); wire.moveTo(star.x-ray,star.y); wire.lineTo(star.x+ray,star.y);
        wire.moveTo(star.x,star.y-ray); wire.lineTo(star.x,star.y+ray); wire.stroke();
      }
      wire.fillStyle = `rgba(218,236,255,${alpha})`; wire.beginPath();
      wire.arc(star.x, star.y, star.size * (.65 + pulse * .55), 0, Math.PI * 2); wire.fill();
    }
    // A restrained shooting star crosses the outer sky about once every 12 seconds.
    const cometPhase = (time / 1000 + 10) % 12;
    if (enabled && cometPhase < 2.2) {
      const progress = cometPhase / 2.2;
      const x = width * (.92 - progress * .46), y = height * (.12 + progress * .29);
      const tailX = x + width * .12, tailY = y - height * .075;
      const fade = Math.sin(progress * Math.PI);
      const trail = wire.createLinearGradient(x, y, tailX, tailY);
      trail.addColorStop(0, `rgba(213,232,255,${fade * .95})`);
      trail.addColorStop(1, 'rgba(145,192,255,0)');
      wire.strokeStyle = trail; wire.lineWidth = 1.6;
      wire.beginPath(); wire.moveTo(x, y); wire.lineTo(tailX, tailY); wire.stroke();
      wire.fillStyle = `rgba(236,246,255,${fade})`;
      wire.beginPath(); wire.arc(x, y, 2, 0, Math.PI * 2); wire.fill();
    }
    /* DOM-wide optical field is rendered by lensing.js. */
    const radius = width < 600 ? 105 : 150;
    for (const p of nodes) {
      const dx = p.x - pointer.x, dy = p.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / radius);
      const force = influence * influence * pointer.strength;
      const targetX = (-dx + dy * .55) / Math.max(distance, 1) * force * 85;
      const targetY = (-dy - dx * .55) / Math.max(distance, 1) * force * 85;
      // Direct feedback with no inertia when the visitor requests reduced motion.
      const ease = enabled ? .22 : 1;
      p.dx += (targetX - p.dx) * ease;
      p.dy += (targetY - p.dy) * ease;
      const displacement = Math.min(1, Math.hypot(p.dx, p.dy) / 28);
      const vicinity = Math.max(0, 1 - distance / (radius * 1.8)) * pointer.strength;
      const alpha = Math.max(vicinity * .32, displacement * .72);
      if (alpha < .008) continue;
      grid.fillStyle = `rgba(183,213,248,${alpha})`;
      grid.beginPath(); grid.arc(p.x + p.dx, p.y + p.dy, .75 + displacement * .35, 0, Math.PI * 2); grid.fill();
    }
    /* Foreground photon ring is rendered by lensing.js. */
  }

  function tick(time) {
    if (destroyed || !enabled || document.hidden) { frame = 0; return; }
    frame = requestAnimationFrame(tick);
    if (time - lastFrame < 1000 / 30) return;
    const elapsed = lastFrame ? Math.min(time - lastFrame, 80) : 0;
    lastFrame = time; motionTime += elapsed;
    pointer.x += (pointer.targetX - pointer.x) * .14; pointer.y += (pointer.targetY - pointer.y) * .14;
    pointer.strength += (pointer.targetStrength - pointer.strength) * .13;
    scrollEnergy *= .88;
    drawMesh(motionTime);
  }
  function start() { if (!frame && enabled && !document.hidden && !destroyed) frame = requestAnimationFrame(tick); }
  function resize() {
    if (destroyed) return;
    width = canvas.parentElement?.clientWidth || window.innerWidth; height = canvas.parentElement?.clientHeight || window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const c of [canvas, mesh, interaction]) { c.width = Math.round(width * dpr); c.height = Math.round(height * dpr); c.style.width = `${width}px`; c.style.height = `${height}px`; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); wire.setTransform(dpr, 0, 0, dpr, 0, 0); grid.setTransform(dpr, 0, 0, dpr, 0, 0);
    backdrop(); buildMesh(); drawMesh(0); start();
  }
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 180); };
  function onPointer(event) {
    if (destroyed || event.pointerType === 'touch' || (window.visualViewport?.scale || 1) > 1.05) return;
    if (pointer.targetStrength === 0) { pointer.x = event.clientX; pointer.y = event.clientY; pointer.strength = .65; }
    pointer.targetX = event.clientX; pointer.targetY = event.clientY; pointer.targetStrength = 1;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (!enabled) pointer.strength = 1;
    drawMesh(motionTime);
  }
  const onScroll = () => { const current=window.scrollY||0; if(enabled) scrollEnergy=Math.min(1,scrollEnergy+Math.abs(current-lastScrollY)/180); lastScrollY=current; };
  const onLeave = () => { pointer.targetStrength = 0; if (!enabled) { pointer.strength = 0; drawMesh(motionTime); } };
  function setMotion(value) {
    if (destroyed) return getState();
    enabled = Boolean(value); explicitMotion = true;
    if (!enabled) { cancelAnimationFrame(frame); frame = 0; lastFrame = 0; pointer.strength = 0; pointer.targetStrength = 0; drawMesh(0); } else start();
    announce(); return getState();
  }
  function onPreference() { if (!explicitMotion) { enabled = !reduced.matches; if (!enabled) { cancelAnimationFrame(frame); frame = 0; drawMesh(0); } else start(); } announce(); }
  function onVisibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); announce(); }
  function destroy() {
    destroyed = true; cancelAnimationFrame(frame); clearTimeout(resizeTimer);
    window.visualViewport?.removeEventListener('resize', onLeave);
    window.removeEventListener('touchstart', onTouch); window.removeEventListener('touchmove', onTouch);
    window.removeEventListener('touchend', onTouchEnd); window.removeEventListener('touchcancel', onLeave);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onPointer); window.removeEventListener('blur', onLeave);
    document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', onPreference); coarse.removeEventListener('change', onPreference); announce();
  }
  const onTouch = event => { if (event.touches.length !== 1 || (window.visualViewport?.scale || 1) > 1.05) { onLeave(); return; } const touch = event.touches[0]; if (touch) onPointer(touch); };
  const onTouchEnd = event => { if (!event.touches.length) onLeave(); };
  window.visualViewport?.addEventListener('resize', onLeave, { passive: true });
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onLeave, { passive: true });
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize', onResize, { passive: true }); window.addEventListener('pointermove', onPointer, { passive: true }); window.addEventListener('blur', onLeave);
  document.documentElement.addEventListener('pointerleave', onLeave); document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onPreference); coarse.addEventListener('change', onPreference);
  window.portfolioCosmos = { getState, setMotion, destroy };
  resize(); announce();
})();
;
