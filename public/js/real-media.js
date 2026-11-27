/* Mídia realista opcional na tela de login.
   Basta colocar arquivos com estes nomes em public/img/ e o site usa sozinho:
     - aguia.mp4 / aguia.webm  → vídeo da águia (em loop, sem som)  [prioridade]
     - aguia.png / aguia.webp / aguia.jpg → imagem da águia
     - fundo.mp4 → vídeo de fundo da tela inteira
     - fundo.jpg / fundo.webp → imagem de fundo da tela inteira
   Imagens com fundo preto funcionam direto: o preto "some" na tela (efeito screen).
   Se nenhum arquivo existir, continua a águia desenhada. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tryImage(urls) {
    return new Promise((resolve) => {
      const next = (i) => {
        if (i >= urls.length) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => next(i + 1);
        img.src = urls[i];
      };
      next(0);
    });
  }

  function tryVideo(urls) {
    return new Promise((resolve) => {
      const next = (i) => {
        if (i >= urls.length) return resolve(null);
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'auto';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        let done = false;
        const ok = () => { if (!done) { done = true; resolve(v); } };
        const fail = () => { if (!done) { done = true; next(i + 1); } };
        v.addEventListener('loadeddata', ok, { once: true });
        v.addEventListener('error', fail, { once: true });
        setTimeout(fail, 6000);
        v.src = urls[i];
      };
      next(0);
    });
  }

  // Remove o fundo preto da imagem (o preto vira transparente, o dourado fica)
  function keyBlack(img) {
    try {
      const max = 1200;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h);
      const a = d.data;
      // se a imagem já tem transparência, não mexe
      let hasAlpha = false;
      for (let i = 3; i < a.length; i += 4 * 97) { if (a[i] < 250) { hasAlpha = true; break; } }
      if (hasAlpha) return img;
      for (let i = 0; i < a.length; i += 4) {
        const m = Math.max(a[i], a[i + 1], a[i + 2]);
        const al = Math.max(0, Math.min(255, (m - 14) * 255 / 110));
        if (al < 255 && m > 0) {
          const f = Math.min(255 / m, 1 + (255 - al) / 255);
          a[i] = Math.min(255, a[i] * f); a[i + 1] = Math.min(255, a[i + 1] * f); a[i + 2] = Math.min(255, a[i + 2] * f);
        }
        a[i + 3] = al;
      }
      ctx.putImageData(d, 0, 0);
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Águia dourada');
      return c;
    } catch (e) { return img; }
  }

  async function mountEagle() {
    const holder = document.querySelector('.hero-eagle');
    if (!holder) return;
    const media = (await tryVideo(['/img/aguia.webm', '/img/aguia.mp4'])) ||
                  (await tryImage(['/img/aguia.webp', '/img/aguia.png', '/img/aguia.jpg']));
    if (!media) return;
    let el = media;
    if (media.tagName === 'IMG') el = keyBlack(media);
    el.className = 'real-eagle-media';
    media.alt = 'Águia dourada';
    const wrap = document.createElement('div');
    wrap.className = 'real-eagle-wrap';
    wrap.appendChild(el);
    holder.innerHTML = '';
    holder.appendChild(wrap);
    document.documentElement.classList.add('has-real-eagle');
    if (media.tagName === 'VIDEO') media.play().catch(() => {});

    const M = window.Motion;
    if (!M || reduce) { wrap.style.opacity = 1; return; }
    const { animate } = M;
    animate(wrap, { opacity: [0, 1], scale: [1.18, 1], filter: ['blur(14px) brightness(2)', 'blur(0px) brightness(1)'] },
      { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    setTimeout(() => animate(el, { y: [0, -10, 0] }, { duration: 6, repeat: Infinity, ease: 'easeInOut' }), 1400);
    // inclinação 3D seguindo o mouse / o giro do celular
    const tilt = (dx, dy) => animate(wrap, { rotateY: dx * 10, rotateX: -dy * 8 }, { duration: 0.6 });
    addEventListener('pointermove', (e) => tilt(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));
  }

  async function mountBackground() {
    const vid = await tryVideo(['/img/fundo.webm', '/img/fundo.mp4']);
    const media = vid || (await tryImage(['/img/fundo.webp', '/img/fundo.jpg', '/img/fundo.png']));
    if (!media) return;
    const bg = document.createElement('div');
    bg.className = 'real-bg';
    media.className = 'real-bg-media';
    bg.appendChild(media);
    document.body.prepend(bg);
    if (vid) vid.play().catch(() => {});
    const M = window.Motion;
    if (M && !reduce) {
      M.animate(bg, { opacity: [0, 1] }, { duration: 1.6 });
      if (!vid) M.animate(media, { scale: [1.12, 1.02] }, { duration: 18, ease: 'easeOut' });
    } else bg.style.opacity = 1;
  }

  document.addEventListener('DOMContentLoaded', () => { mountEagle(); mountBackground(); });
})();
