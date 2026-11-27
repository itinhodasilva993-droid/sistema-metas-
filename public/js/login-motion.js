/* Animações da tela de login com a biblioteca Motion (dos criadores do Framer Motion) */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  document.addEventListener('DOMContentLoaded', () => {
    // Águia brava
    const holder = $('.hero-eagle');
    if (holder && window.eagleHeadSVG) holder.innerHTML = window.eagleHeadSVG();

    // Título letra por letra
    $$('.hero-title [data-split]').forEach((w) => {
      const txt = w.textContent;
      w.textContent = '';
      for (const ch of txt) {
        const s = document.createElement('span');
        s.className = 'ch gold-text';
        s.textContent = ch;
        w.appendChild(s);
      }
    });

    const M = window.Motion;
    if (!M || reduce) { document.documentElement.classList.add('motion-off'); return; }
    const { animate, stagger, hover, press } = M;
    // Motion assume as animações de entrada (desliga a rede de segurança em CSS)
    $$('.eagle-head, .hero-title .ch, .auth-card').forEach((e) => { e.style.animation = 'none'; });
    try { run(); } catch (err) { console.error(err); document.documentElement.classList.add('motion-off'); }
    function run() {
    const spring = { type: 'spring', stiffness: 140, damping: 16 };

    const head = $('.eagle-head');
    const card = $('.auth-card');
    const kids = card ? $$(':scope > *', card).filter((el) => !el.classList.contains('alert')) : [];
    const formKids = card ? $$('form > *', card) : [];

    if (head) animate(head, { opacity: [0, 1], x: [-80, 0], scale: [0.85, 1], rotate: [-8, 0] }, { ...spring, stiffness: 90, damping: 14, delay: 0.1 });
    animate('.hero-title .ch', { opacity: [0, 1], y: [50, 0], rotateX: [-80, 0], filter: ['blur(8px)', 'blur(0px)'] },
      { delay: stagger(0.06, { startDelay: 0.35 }), duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    animate('.auth-hero p', { opacity: [0, 1], y: [16, 0] }, { delay: 1.1, duration: 0.6 });
    if (card) animate(card, { opacity: [0, 1], y: [70, 0], scale: [0.92, 1] }, { ...spring, delay: 0.25 });
    animate(kids.filter((k) => k.tagName !== 'FORM').concat(formKids), { opacity: [0, 1], y: [18, 0] },
      { delay: stagger(0.07, { startDelay: 0.5 }), duration: 0.5, ease: 'easeOut' });

    // Vida da águia: respiração, piscada, grito
    if (head) {
      const g = $('.eh-head', head);
      setTimeout(() => animate(g, { y: [0, -5, 0], rotate: [0, -1.5, 0] }, { duration: 5, repeat: Infinity, ease: 'easeInOut' }), 1500);
      const lid = $('.eh-lid', head), jaw = $('.eh-jaw', head), pupil = $('.eh-pupil', head);
      const blink = () => {
        animate(lid, { scaleY: [0, 1, 0] }, { duration: 0.28 });
        setTimeout(blink, 2500 + Math.random() * 3500);
      };
      setTimeout(blink, 2200);
      const screech = () => {
        animate(jaw, { rotate: [0, 9, 9, 0] }, { duration: 0.9, times: [0, 0.2, 0.7, 1] });
        animate(pupil, { r: [5, 3.6, 3.6, 5] }, { duration: 0.9 });
        animate(head, { scale: [1, 1.04, 1] }, { duration: 0.9 });
        setTimeout(screech, 7000 + Math.random() * 5000);
      };
      setTimeout(screech, 3200);
      // segue o mouse com o olhar e uma leve inclinação
      addEventListener('pointermove', (e) => {
        const r = head.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        animate(pupil, { cx: 284 + dx * 4, cy: 179 + dy * 3 }, { duration: 0.3 });
      });
    }

    // Botão e campos
    const btn = $('#btn');
    if (btn) {
      hover(btn, (el) => { animate(el, { scale: 1.03 }, spring); return () => animate(el, { scale: 1 }, spring); });
      press(btn, (el) => { animate(el, { scale: 0.95 }, { duration: 0.1 }); return () => animate(el, { scale: 1 }, spring); });
    }
    $$('.auth-card .input').forEach((inp) => {
      inp.addEventListener('focus', () => animate(inp, { scale: [1, 1.02, 1] }, { duration: 0.35 }));
    });

    // Ganchos chamados pelo auth.js
    window.onLoginError = () => {
      if (card) animate(card, { x: [0, -14, 12, -9, 7, -3, 0] }, { duration: 0.5 });
      if (head) animate($('.eh-jaw', head), { rotate: [0, 10, 0] }, { duration: 0.5 });
    };
    window.onLoginSuccess = () => new Promise((resolve) => {
      const flash = document.createElement('div');
      flash.className = 'gold-flash';
      document.body.appendChild(flash);
      if (head) animate(head, { x: [0, 40], scale: [1, 1.12], opacity: [1, 0] }, { duration: 0.6, ease: 'easeIn' });
      if (card) animate(card, { scale: [1, 0.94], opacity: [1, 0], y: [0, -20] }, { duration: 0.45, ease: 'easeIn' });
      animate(flash, { opacity: [0, 0.9, 1] }, { duration: 0.55, delay: 0.15 }).then(resolve);
      setTimeout(resolve, 900); // garante o redirecionamento
    });
    }
  });
})();
