/* Música da tela de login.
   - Toca /audio/musica.mp3 (trilha épica própria, sem direitos autorais) em loop.
   - Para usar outra música, suba um arquivo chamado musica.mp3 em public/img.
   Celular e navegador só deixam tocar som depois do primeiro toque, então começa aí.
   Usa <audio>, que toca no iPhone mesmo com a chave do silencioso ligada.
   O botão no canto liga e desliga (a escolha fica salva). */
(function () {
  'use strict';
  const KEY = 'metas-musica';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) {}

  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.55;
  audio.setAttribute('playsinline', '');
  audio.src = '/audio/musica.mp3';
  // música personalizada (opcional)
  fetch('/img/musica.mp3', { method: 'HEAD' }).then((r) => {
    if (r.ok && (r.headers.get('content-type') || '').includes('audio')) {
      const playing = !audio.paused;
      audio.src = '/img/musica.mp3';
      if (playing) audio.play().catch(() => {});
    }
  }).catch(() => {});

  let fadeTimer = null;
  function fadeTo(target, ms) {
    clearInterval(fadeTimer);
    const start = audio.volume, t0 = Date.now();
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      try { audio.volume = start + (target - start) * k; } catch (e) {}
      if (k >= 1) { clearInterval(fadeTimer); if (target === 0) audio.pause(); }
    }, 50);
  }
  function play() {
    // play() precisa ser chamado direto dentro do toque (regra do iPhone)
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
    try { audio.volume = 0.05; } catch (e) {}
    fadeTo(0.55, 2500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'music-btn';
    const paint = () => {
      const on = !muted && !audio.paused;
      btn.classList.toggle('off', !on);
      btn.setAttribute('aria-label', on ? 'Desligar música' : 'Ligar música');
      btn.title = on ? 'Desligar música' : 'Ligar música';
      btn.innerHTML = on
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="eq"><i></i><i></i><i></i></span>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    };
    audio.addEventListener('play', paint);
    audio.addEventListener('pause', paint);
    paint();
    document.body.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!audio.paused && !muted) { muted = true; fadeTo(0, 400); }
      else { muted = false; play(); }
      try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (err) {}
      paint();
    });

    // começa no primeiro toque/clique/tecla em qualquer lugar da página
    const EVENTS = ['touchend', 'click', 'keydown'];
    const first = (e) => {
      if (e.target === btn || btn.contains(e.target)) return;
      EVENTS.forEach((ev) => document.removeEventListener(ev, first, true));
      if (!muted && audio.paused) play();
    };
    EVENTS.forEach((ev) => document.addEventListener(ev, first, true));
  });
})();
