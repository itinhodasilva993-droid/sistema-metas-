/* Música ambiente da tela de login.
   - Se existir public/img/musica.mp3, toca esse arquivo em loop.
   - Senão, toca uma trilha épica gerada no próprio navegador (sem direitos autorais).
   Navegadores só deixam tocar som depois do primeiro toque/clique, então ela começa aí.
   O botão no canto liga e desliga (a escolha fica salva). */
(function () {
  'use strict';
  const KEY = 'metas-musica';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) {}

  let started = false, ctx = null, master = null, timer = null, fileAudio = null;
  const VOL = 0.22;

  // ---------- Trilha gerada (Ré menor: Dm, Bb, F, C) ----------
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]];
  const BAR = 6; // segundos por acorde

  function synthStart() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    // eco/ambiente
    const delay = ctx.createDelay(2); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(master);
    const bus = ctx.createGain(); bus.connect(master); bus.connect(delay);

    let bar = 0, next = ctx.currentTime + 0.1;
    function pad(chord, t) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(1300, t + BAR * 0.5); f.frequency.linearRampToValueAtTime(450, t + BAR + 1.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 1.8); g.gain.setValueAtTime(0.06, t + BAR - 0.5); g.gain.linearRampToValueAtTime(0, t + BAR + 1.6);
      f.connect(g); g.connect(bus);
      chord.forEach((m) => [-7, 7].forEach((det) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + BAR + 1.7);
      }));
      // baixo grave
      const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = hz(chord[0] - 12);
      const bg = ctx.createGain(); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.16, t + 1); bg.gain.linearRampToValueAtTime(0, t + BAR + 0.8);
      b.connect(bg); bg.connect(master); b.start(t); b.stop(t + BAR + 1);
      // tambor épico no começo de cada acorde
      const k = ctx.createOscillator(); k.type = 'sine';
      k.frequency.setValueAtTime(90, t); k.frequency.exponentialRampToValueAtTime(38, t + 0.6);
      const kg = ctx.createGain(); kg.gain.setValueAtTime(0.35, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      k.connect(kg); kg.connect(master); k.start(t); k.stop(t + 1.5);
    }
    function bell(m, t, v) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(m) * 2.01;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.4);
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus);
      o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
    }
    function schedule() {
      while (next < ctx.currentTime + 1.5) {
        const chord = CHORDS[bar % CHORDS.length];
        pad(chord, next);
        // melodia de sinos: arpejo suave, mais cheio a cada volta
        const steps = bar < 4 ? 4 : 8;
        for (let i = 0; i < steps; i++) {
          if (Math.random() < 0.25) continue;
          const m = chord[(Math.random() * chord.length) | 0] + 12 + (Math.random() < 0.3 ? 12 : 0);
          bell(m, next + i * (BAR / steps) + Math.random() * 0.03, 0.05 + Math.random() * 0.03);
        }
        next += BAR; bar++;
      }
    }
    schedule();
    timer = setInterval(schedule, 400);
  }

  function setVolume(on) {
    if (fileAudio) { fileAudio.muted = !on; if (on) fileAudio.play().catch(() => {}); return; }
    if (!ctx) return;
    if (on && ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(on ? VOL : 0, ctx.currentTime + (on ? 2.5 : 0.4));
  }

  function start() {
    if (started) return;
    started = true;
    const a = new Audio('/img/musica.mp3');
    a.loop = true; a.volume = 0.5; a.muted = muted;
    a.play().then(() => { fileAudio = a; }).catch(() => { synthStart(); setVolume(!muted); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'music-btn';
    const paint = () => {
      btn.classList.toggle('off', muted);
      btn.setAttribute('aria-label', muted ? 'Ligar música' : 'Desligar música');
      btn.title = muted ? 'Ligar música' : 'Desligar música';
      btn.innerHTML = muted
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="eq"><i></i><i></i><i></i></span>';
    };
    paint();
    document.body.appendChild(btn);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (err) {}
      paint();
      if (!started) { start(); return; }
      setVolume(!muted);
    });
    // começa no primeiro toque/clique/tecla na página
    const first = () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => removeEventListener(ev, first, true));
      if (!muted) start();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, first, true));
  });
})();
