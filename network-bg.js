/* Connected digital network background (HTML5 Canvas, no dependencies).
   Drop-in: add one script tag with src="network-bg.js" and the defer attribute. It creates its own fixed canvas behind the page,
   ignores pointer events, pauses when the tab is hidden and shows one still frame for reduced-motion users. */
(() => {
  if (window.__networkBG) return; window.__networkBG = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover: hover)').matches;
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d'); if (!ctx) return;

  const COBALT = '37,99,235', BLUE = '59,130,246', CYAN = '34,211,238';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sprite = rgb => { const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'), r = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(.25, `rgba(${rgb},.5)`); r.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = r; g.fillRect(0, 0, s, s); return c; };
  const SP = { blue: sprite(BLUE), cyan: sprite(CYAN) };

  let W = 0, H = 0, dpr = 1, L = 130, P = [], pulses = [], streaks = [], raf = 0, last = 0, t = 0, inten = 1;
  let nextPulse = 600, nextStreak = rnd(3000, 6000);
  const mouse = { x: -1e4, y: -1e4 };

  const make = () => { const a = rnd(0, 6.283), s = rnd(.08, .24);
    return { x: rnd(0, W), y: rnd(0, H), bx: Math.cos(a) * s, by: Math.sin(a) * s, vx: 0, vy: 0,
      r: rnd(1.3, 2.6), cy: Math.random() < .14, ph: rnd(0, 6.283), sp: rnd(.6, 1.4) }; };

  function resize() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const per = W < 700 ? 11000 : W < 1100 ? 9000 : 7500;
    const n = Math.max(26, Math.min(170, Math.round(W * H / per)));
    L = W < 700 ? 110 : W < 1100 ? 130 : 155;
    while (P.length < n) { const p = make(); p.vx = p.bx; p.vy = p.by; P.push(p); }
    P.length = n;
    if (reduce) draw();
  }

  function step(dt) {
    const k = dt / 16.67;
    for (const p of P) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > .1) { const f = (1 - d / 140) * .06 * k; p.vx += dx / d * f; p.vy += dy / d * f; }
      p.vx += (p.bx - p.vx) * .02 * k; p.vy += (p.by - p.vy) * .02 * k;
      p.x += p.vx * k; p.y += p.vy * k;
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
    }
    const target = 1 - .62 * Math.min(1, scrollY / (H * .85));   // strongest in the hero, calmer below
    inten += (target - inten) * .08 * k;
    nextPulse -= dt; nextStreak -= dt;
    if (nextPulse <= 0 && pulses.length < 5) {
      nextPulse = rnd(350, 800);
      const a = P[(Math.random() * P.length) | 0]; let b = null;
      for (const q of P) if (q !== a && Math.hypot(q.x - a.x, q.y - a.y) < L * .9) { b = q; break; }
      if (b) pulses.push({ a, b, t: 0, dur: rnd(600, 1000), cy: Math.random() < .6 });
    }
    if (nextStreak <= 0 && streaks.length < 1) {
      nextStreak = rnd(6000, 11000);
      streaks.push({ x: rnd(-60, W * .7), y: rnd(0, H * .55), t: 0, dur: 1300, len: rnd(120, 220) });
    }
    for (const s of pulses) s.t += dt / s.dur;
    pulses = pulses.filter(s => s.t < 1 && Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y) < L * 1.15);
    for (const s of streaks) { s.t += dt / s.dur; s.x += .9 * k * 5; s.y += .45 * k * 5; }
    streaks = streaks.filter(s => s.t < 1);
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0B1220'); bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      for (let j = i + 1; j < P.length; j++) {
        const b = P[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > L * L) continue;
        const f = 1 - Math.sqrt(d2) / L;
        ctx.strokeStyle = `rgba(${a.cy || b.cy ? CYAN : BLUE},${(f * .45 * inten).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (const s of streaks) {
      const e = Math.sin(Math.PI * s.t), x2 = s.x - s.len, y2 = s.y - s.len * .5;
      const g = ctx.createLinearGradient(x2, y2, s.x, s.y);
      g.addColorStop(0, `rgba(${CYAN},0)`); g.addColorStop(1, `rgba(${CYAN},${(e * .5 * inten).toFixed(3)})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
    for (const p of P) {
      const tw = .55 + .45 * Math.sin(t * .001 * p.sp + p.ph), sz = p.r * 9;
      ctx.globalAlpha = Math.min(1, tw * .85 * inten);
      ctx.drawImage(p.cy ? SP.cyan : SP.blue, p.x - sz / 2, p.y - sz / 2, sz, sz);
      ctx.globalAlpha = Math.min(1, .8 * inten); ctx.fillStyle = '#dbeafe';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .45, 0, 6.283); ctx.fill();
    }
    for (const s of pulses) {
      const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t;
      ctx.globalAlpha = Math.sin(Math.PI * s.t) * .9 * inten;
      ctx.drawImage(s.cy ? SP.cyan : SP.blue, x - 14, y - 14, 28, 28);
    }
    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    if (!last) last = ts;
    const dt = Math.min(ts - last, 50); last = ts; t += dt;
    step(dt); draw(); raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  if (hover) {
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1e4; });
  }
  resize(); if (reduce) draw(); else start();
  window.NetworkBG = { start, stop };
})();
