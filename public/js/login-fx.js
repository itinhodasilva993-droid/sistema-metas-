/* Efeito de fundo do login: "portal dourado" cinematográfico.
   Um sol dourado pulsando atrás do nome, raios de luz girando, anéis em órbita
   com faíscas, ondas de energia, névoa e brasas subindo. Tudo em canvas (leve). */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    const sky = document.createElement('div');
    sky.className = 'sky';
    sky.innerHTML = '<canvas class="sky-fire"></canvas>';
    document.body.prepend(sky);
    const cv = sky.querySelector('canvas');
    const ctx = cv.getContext('2d');
    let W, H, dpr, cx, cy, R;
    const title = document.querySelector('.hero-title');

    function place() {
      const mobile = innerWidth < 900;
      if (title && title.offsetParent) {
        const r = title.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2 + scrollY;
        R = Math.max(70, Math.min(r.width * 0.42, mobile ? 150 : 260));
      } else { cx = W / 2; cy = H * 0.3; R = 120; }
    }
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      place();
    }
    addEventListener('resize', resize);
    resize();
    setTimeout(place, 600); setTimeout(place, 2000);

    const PALETTE = [[255, 241, 184], [243, 215, 122], [255, 170, 60], [255, 120, 30], [212, 175, 55]];
    const embers = [];
    function ember(x, y, vx, vy, life, size) {
      embers.push({ x, y, vx, vy, life, max: life, size, c: PALETTE[(Math.random() * PALETTE.length) | 0], wob: Math.random() * 6 });
    }
    // anéis em órbita (inclinação, velocidade, faíscas)
    const rings = [
      { k: 1.55, tilt: 0.22, rot: -0.35, sp: 0.35, n: 3 },
      { k: 1.95, tilt: 0.16, rot: 0.25, sp: -0.22, n: 2 },
      { k: 2.4, tilt: 0.12, rot: -0.12, sp: 0.15, n: 2 },
    ];
    const waves = [];
    let lastWave = 0, born = performance.now();
    let mx = 0, my = 0;
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

    function ringPath(rg, scale, t) {
      return { rx: R * rg.k * scale, ry: R * rg.k * rg.tilt * scale, rot: rg.rot + Math.sin(t * 0.0002) * 0.05 };
    }
    function drawRing(rg, t, front, intro) {
      const { rx, ry, rot } = ringPath(rg, intro, t);
      ctx.save();
      ctx.translate(cx + mx * 18, cy - scrollY + my * 12);
      ctx.rotate(rot);
      // metade de trás (0..PI) ou da frente (PI..2PI)
      const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
      const grad = ctx.createLinearGradient(-rx, 0, rx, 0);
      grad.addColorStop(0, 'rgba(212,175,55,0)');
      grad.addColorStop(0.5, `rgba(255,220,140,${front ? 0.55 : 0.22})`);
      grad.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.strokeStyle = grad; ctx.lineWidth = front ? 1.6 : 1;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke();
      // faíscas viajando no anel
      for (let i = 0; i < rg.n; i++) {
        const a = ((t * 0.001 * rg.sp + i / rg.n) % 1) * Math.PI * 2;
        const isFront = Math.sin(a) > 0;
        if (isFront !== front) continue;
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        const s = front ? 7 : 4;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
        g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.3, 'rgba(255,200,90,.7)'); g.addColorStop(1, 'rgba(255,150,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 3, 0, Math.PI * 2); ctx.fill();
        if (front && Math.random() < 0.5) ember(cx + mx * 18 + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot), (Math.random() - 0.5) * 0.6, -0.2 - Math.random() * 0.4, 600 + Math.random() * 600, 1 + Math.random() * 1.6);
      }
      ctx.restore();
    }

    function frame(now) {
      if (!reduce) requestAnimationFrame(frame);
      const t = now;
      const intro = reduce ? 1 : Math.max(0, Math.min(1, (now - born) / 1600));
      const ease = 1 - Math.pow(1 - intro, 3);
      const Y = cy - scrollY;
      ctx.clearRect(0, 0, W, H);

      // névoa dourada no fundo
      const fog = ctx.createRadialGradient(cx, Y, 0, cx, Y, Math.max(W, H) * 0.8);
      fog.addColorStop(0, `rgba(90,62,12,${0.38 * ease})`);
      fog.addColorStop(0.35, `rgba(40,26,6,${0.22 * ease})`);
      fog.addColorStop(1, 'rgba(6,6,8,0)');
      ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';
      // raios de luz girando
      ctx.save(); ctx.translate(cx + mx * 18, Y + my * 12); ctx.rotate(t * 0.00005);
      const rays = 14;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        const len = R * (3.2 + Math.sin(t * 0.0007 + i * 1.7) * 0.6) * ease;
        const wdt = 0.05 + (i % 3) * 0.02;
        const g = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, len);
        g.addColorStop(0, 'rgba(255,210,120,0.055)'); g.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, a - wdt, a + wdt); ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      rings.forEach((rg) => drawRing(rg, t, false, ease));

      // o sol dourado (pulsando)
      const pulse = 1 + Math.sin(t * 0.0015) * 0.04;
      const r0 = R * pulse * ease;
      const ox = cx + mx * 18, oy = Y + my * 12;
      let g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r0 * 2.6);
      g.addColorStop(0, 'rgba(255,200,90,0.55)'); g.addColorStop(0.4, 'rgba(255,150,40,0.18)'); g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, r0 * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      g = ctx.createRadialGradient(ox - r0 * 0.3, oy - r0 * 0.35, r0 * 0.05, ox, oy, r0);
      g.addColorStop(0, 'rgba(255,248,215,0.95)');
      g.addColorStop(0.35, 'rgba(246,206,110,0.85)');
      g.addColorStop(0.75, 'rgba(176,122,28,0.75)');
      g.addColorStop(1, 'rgba(70,44,8,0.0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, r0, 0, Math.PI * 2); ctx.fill();
      // escurece o centro para o nome aparecer bem
      g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r0 * 0.95);
      g.addColorStop(0, 'rgba(60,34,4,0.45)'); g.addColorStop(1, 'rgba(60,34,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, r0, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';

      rings.forEach((rg) => drawRing(rg, t, true, ease));

      // ondas de energia saindo do sol
      if (!reduce && now - lastWave > 4200) { waves.push({ t0: now }); lastWave = now; }
      for (let i = waves.length - 1; i >= 0; i--) {
        const k = (now - waves[i].t0) / 2600;
        if (k >= 1) { waves.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(255,214,130,${0.5 * (1 - k)})`;
        ctx.lineWidth = 2 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.ellipse(ox, oy, R * (1 + k * 3), R * (1 + k * 3) * 0.32, -0.2, 0, Math.PI * 2); ctx.stroke();
      }

      // brasas subindo
      const mobile = W < 700;
      if (Math.random() < (mobile ? 0.35 : 0.6)) ember(Math.random() * W, H + 10, (Math.random() - 0.5) * 0.3, -0.6 - Math.random() * 1.1, 4000 + Math.random() * 3000, 1 + Math.random() * 2.2);
      if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2; ember(ox + Math.cos(a) * R, oy + Math.sin(a) * R, Math.cos(a) * 0.5, Math.sin(a) * 0.5 - 0.3, 1200 + Math.random() * 1000, 1 + Math.random() * 2); }
      const ms = 16;
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life -= ms;
        if (e.life <= 0 || e.y < -20) { embers.splice(i, 1); continue; }
        e.wob += 0.05;
        e.x += e.vx * ms * 0.06 + Math.sin(e.wob) * 0.15;
        e.y += e.vy * ms * 0.06;
        e.vy -= 0.0006 * ms;
        const k = e.life / e.max, rr = e.size * (0.6 + k) * 4;
        const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rr);
        eg.addColorStop(0, `rgba(${e.c[0]},${e.c[1]},${e.c[2]},${0.9 * k})`);
        eg.addColorStop(0.4, `rgba(${e.c[0]},${(e.c[1] * 0.7) | 0},${(e.c[2] * 0.4) | 0},${0.35 * k})`);
        eg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, Math.PI * 2); ctx.fill();
      }
      if (embers.length > 500) embers.splice(0, embers.length - 500);
      ctx.globalCompositeOperation = 'source-over';
    }
    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
    requestAnimationFrame(frame);
    void visible;
  });
})();
