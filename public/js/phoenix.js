/* Fundo da tela de login: águia dourada (vista de perfil) voando de forma realista,
   com batidas de asa articuladas, planeio, inclinação e rastro de fogo de fênix. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- Desenho da águia de perfil (virada para a direita) ----------
  function feather(x, y, dx, dy, w) {
    // pena em forma de folha, da base (x,y) até a ponta (x+dx, y+dy)
    const mx = x + dx * 0.55, my = y + dy * 0.55;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * w, ny = dx / len * w;
    return `M${x},${y} Q${mx + nx},${my + ny} ${x + dx},${y + dy} Q${mx - nx},${my - ny} ${x},${y} Z`;
  }

  function wingSVG(id, far) {
    const fill = far ? `url(#${id}gd)` : `url(#${id}g)`;
    const stroke = far ? '#4d3a0c' : '#6e5414';
    // Primárias (pontas da asa, "dedos")
    const prim = [[-66, -34, 8.5], [-60, -50, 8.5], [-50, -62, 8.5], [-37, -70, 8], [-23, -74, 7.5], [-9, -73, 7]]
      .map(([dx, dy, w]) => `<path d="${feather(0, 0, dx, dy, w)}" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>`).join('');
    // Secundárias (borda de trás do braço da asa)
    const sec = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const bx = 6 - t * 30, by = 2 - t * 56;
      sec.push(`<path d="${feather(bx, by, -38 - t * 10, 12 - t * 6, 7)}" fill="${fill}" stroke="${stroke}" stroke-width=".7"/>`);
    }
    return `
      <g class="w-arm">
        ${sec.join('')}
        <path d="M10,6 C8,-18 -6,-44 -26,-60 C-33,-56 -38,-50 -40,-44 C-28,-28 -14,-10 -4,8 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
        <path d="M6,0 C2,-18 -8,-36 -22,-50" fill="none" stroke="${far ? '#3b2c08' : '#fff3c4'}" stroke-width="1.2" opacity=".55"/>
        <g class="w-hand" transform="translate(-28,-58)">
          ${prim}
          <path d="M6,6 C-2,-8 -14,-22 -26,-30 C-18,-10 -6,2 6,6 Z" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>
        </g>
      </g>`;
  }

  function birdSVG() {
    const id = 'ph' + Math.random().toString(36).slice(2, 7);
    return `
<svg class="real-eagle" viewBox="0 -170 300 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff3c4"/><stop offset=".3" stop-color="#f3d77a"/>
      <stop offset=".65" stop-color="#d4af37"/><stop offset="1" stop-color="#8f6d1c"/>
    </linearGradient>
    <linearGradient id="${id}gd" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8952f"/><stop offset="1" stop-color="#5e4712"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7e3a0"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#7d5e17"/>
    </linearGradient>
  </defs>
  <!-- asa de trás -->
  <g class="wing-far" transform="translate(160,104)">${wingSVG(id, true)}</g>
  <!-- cauda -->
  <g>
    ${[[-50, -12], [-54, -5], [-55, 2], [-54, 9], [-50, 15]].map(([dx, dy]) => `<path d="${feather(98, 114, dx, dy, 5)}" fill="url(#${id}b)" stroke="#6e5414" stroke-width=".8"/>`).join('')}
  </g>
  <!-- corpo -->
  <path d="M96,112 C108,95 146,89 180,93 C198,95 208,99 215,104 C222,110 219,119 210,123 C188,133 150,137 122,132 C106,129 98,121 96,112 Z" fill="url(#${id}b)" stroke="#6e5414" stroke-width="1"/>
  <path d="M120,122 q8,3 16,1 M140,124 q8,3 16,0 M160,122 q8,3 16,-1 M180,118 q7,2 14,-2" stroke="#7a5d17" stroke-width="1" fill="none" opacity=".7"/>
  <!-- pernas recolhidas -->
  <path d="M150,126 q6,8 16,9 M158,126 q4,7 12,9" stroke="#d4af37" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <!-- cabeça -->
  <g transform="translate(212,104) scale(1.3) translate(-212,-104)">
  <path d="M204,104 C206,93 216,87 228,88 C236,89 242,93 245,98 C252,98 260,101 263,107 C265,112 263,117 259,119 C259,115 256,112 252,112 L244,112 C240,117 232,121 222,121 C213,120 206,113 204,104 Z" fill="url(#${id}g)" stroke="#6e5414" stroke-width="1"/>
  <path d="M245,98 C252,98 260,101 263,107 C265,112 263,117 259,119 C259,115 256,112 252,112 L244,112 C246,107 246,102 245,98 Z" fill="#4a3608" opacity=".55"/>
  <path d="M246,100 C253,100 259,103 261,108" stroke="#fff3c4" stroke-width="1" fill="none" opacity=".6"/>
  <circle cx="234" cy="99" r="2.4" fill="#120d02"/><circle cx="234.7" cy="98.3" r=".75" fill="#fff6d6"/>
  <path d="M226,95.5 L242,97.5" stroke="#3b2c08" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M206,108 l4,5 3,-4 4,5 3,-4 4,4" stroke="#6e5414" stroke-width=".9" fill="none" opacity=".8"/>
  </g>
  <!-- asa da frente -->
  <g class="wing-near" transform="translate(166,104)">${wingSVG(id, false)}</g>
</svg>`;
  }

  // ---------- Animação ----------
  document.addEventListener('DOMContentLoaded', () => {
    const sky = document.createElement('div');
    sky.className = 'sky';
    sky.innerHTML = '<canvas class="sky-fire"></canvas><div class="sky-bird"></div>';
    document.body.prepend(sky);
    const bird = sky.querySelector('.sky-bird');
    bird.innerHTML = birdSVG();
    const near = bird.querySelector('.wing-near'), far = bird.querySelector('.wing-far');
    const parts = (g) => ({ arm: g.querySelector('.w-arm'), hand: g.querySelector('.w-hand') });
    const N = parts(near), F = parts(far);

    function setWing(P, g, pivot, lift, fold, depth) {
      // lift: 1 = asa toda em cima, -1 = embaixo (escala vertical = escorço da vista lateral)
      const sy = lift >= 0 ? 0.12 + lift * 0.7 : lift * 0.75;
      const rot = -12 + (1 - lift) * 10;
      const K = 2.05;
      g.setAttribute('transform', `translate(${pivot}) rotate(${rot}) scale(${depth * K},${(sy * K).toFixed(3)})`);
      P.hand.setAttribute('transform', `translate(-28,-58) rotate(${(fold * 38).toFixed(1)})`);
    }

    const mobile = () => innerWidth < 700;
    if (reduce) {
      bird.style.width = '200px';
      bird.style.transform = `translate(${innerWidth * 0.55}px, 40px)`;
      setWing(N, near, '166,104', 0.6, 0, 1); setWing(F, far, '160,104', 0.6, 0, 0.9);
      return;
    }

    const cv = sky.querySelector('.sky-fire');
    const ctx = cv.getContext('2d');
    let W, H, dpr;
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    addEventListener('resize', resize);
    resize();

    const embers = [];
    const PALETTE = [[255, 241, 184], [243, 215, 122], [255, 170, 60], [255, 120, 30], [212, 175, 55]];
    function ember(x, y, vx, vy, life, size) {
      embers.push({ x, y, vx, vy, life, max: life, size, c: PALETTE[(Math.random() * PALETTE.length) | 0], wob: Math.random() * 6 });
    }

    // Estado de voo
    let dir = 1;                // 1 = para a direita, -1 = para a esquerda
    let x = -300, y = 0, vy = 0, pitch = 0;
    let phase = 0;              // fase da batida de asa
    let mode = 'flap', modeT = 0, flapsLeft = 6, glideDur = 1.5;
    let last = performance.now(), visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); });

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(40, now - last) / 1000; last = now;
      const bw = mobile() ? 130 : 280;
      const speed = (mobile() ? 0.16 : 0.12) * W + 60; // px/s
      const top = mobile() ? 30 : H * 0.08, bottom = mobile() ? 90 : H * 0.38;

      // Alterna entre batidas e planeio
      modeT += dt;
      let lift, fold;
      if (mode === 'flap') {
        const prev = phase;
        phase += dt * Math.PI * 2 * 1.5; // ~1,5 batida por segundo
        const s = Math.sin(phase);
        // descida forte (asa estendida) e subida com asa dobrada
        lift = s;
        fold = Math.max(0, Math.cos(phase)) * (s > -0.2 ? 1 : 0.3);
        vy -= dt * 60 * Math.max(0, -Math.cos(phase)); // impulso na descida da asa → sobe
        if (Math.floor(prev / (Math.PI * 2)) !== Math.floor(phase / (Math.PI * 2))) {
          flapsLeft--;
          if (flapsLeft <= 0) { mode = 'glide'; modeT = 0; glideDur = 0.9 + Math.random() * 1.1; }
        }
      } else {
        // planeio: asas abertas, levemente acima da linha, pequenas correções
        lift = 0.28 + Math.sin(now / 420) * 0.05;
        fold = 0.05;
        if (modeT > glideDur) { mode = 'flap'; modeT = 0; flapsLeft = 5 + ((Math.random() * 4) | 0); phase = Math.PI * 0.5; }
      }

      // Física vertical simples: gravidade leve + manter entre top e bottom
      vy += dt * 26;                                  // planeio desce devagar
      if (y < top) vy += dt * 80;
      if (y > bottom) vy -= dt * 120;
      vy *= 0.985;
      y += vy * dt;

      x += dir * speed * dt;
      if (dir === 1 && x > W + bw) { dir = -1; }
      if (dir === -1 && x < -bw) { dir = 1; }

      const targetPitch = Math.max(-14, Math.min(14, vy * 0.35)) * dir;
      pitch += (targetPitch - pitch) * Math.min(1, dt * 4);

      setWing(N, near, '166,104', lift, fold, 1);
      setWing(F, far, '160,104', Math.max(-1, Math.min(1, lift * 0.92 + 0.06)), fold, 0.88);
      bird.style.width = bw + 'px';
      bird.style.transform = `translate(${x - bw / 2}px, ${y - bw * 0.913}px) scaleX(${dir}) rotate(${pitch.toFixed(2)}deg)`;

      // Rastro de fênix: cauda + pontas das asas
      const tailX = x - dir * bw * 0.22, tailY = y + bw * 0.04;
      const n = mobile() ? 1 : 2;
      for (let i = 0; i < n; i++) {
        ember(tailX + (Math.random() - 0.5) * bw * 0.2, tailY + (Math.random() - 0.5) * bw * 0.16,
          -dir * (0.8 + Math.random() * 1.4), -0.3 + (Math.random() - 0.5) * 0.6, 700 + Math.random() * 900, 1.4 + Math.random() * 3);
      }
      if (Math.random() < 0.6) {
        const wy = y - bw * 0.25 * lift;
        ember(x - dir * bw * 0.05 + (Math.random() - 0.5) * bw * 0.2, wy, -dir * (0.4 + Math.random()), -0.4, 600 + Math.random() * 500, 1.2 + Math.random() * 2);
      }
      if (Math.random() < (mobile() ? 0.25 : 0.5)) {
        ember(Math.random() * W, H + 10, (Math.random() - 0.5) * 0.3, -0.6 - Math.random() * 1.1, 4000 + Math.random() * 3000, 1 + Math.random() * 2.2);
      }

      const ms = dt * 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life -= ms;
        if (e.life <= 0 || e.y < -20) { embers.splice(i, 1); continue; }
        e.wob += 0.05;
        e.x += e.vx * ms * 0.06 + Math.sin(e.wob) * 0.15;
        e.y += e.vy * ms * 0.06;
        e.vy -= 0.0006 * ms;
        const k = e.life / e.max;
        const r = e.size * (0.6 + k);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4);
        g.addColorStop(0, `rgba(${e.c[0]},${e.c[1]},${e.c[2]},${0.9 * k})`);
        g.addColorStop(0.4, `rgba(${e.c[0]},${(e.c[1] * 0.7) | 0},${(e.c[2] * 0.4) | 0},${0.35 * k})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(e.x, e.y, r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (embers.length > 600) embers.splice(0, embers.length - 600);
    }
    y = mobile() ? 60 : H * 0.2;
    x = W * 0.12;
    requestAnimationFrame(frame);
  });
})();
