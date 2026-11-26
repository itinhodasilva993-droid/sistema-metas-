/* Utilitários compartilhados: API, águia SVG, brilhos, toasts, modais */
(function () {
  'use strict';

  // ---------- API ----------
  async function api(url, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    let res;
    try { res = await fetch(url, init); } catch { throw new Error('Sem conexão com o servidor.'); }
    let data = {};
    try { data = await res.json(); } catch { /* vazio */ }
    if (res.status === 401 && !opts.allow401) { location.href = '/login'; throw new Error(data.error || 'Sessão expirada.'); }
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  }

  // ---------- Escapar HTML ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Águia dourada (SVG original) ----------
  let eagleSeq = 0;
  function eagleSVG(cls = '') {
    const id = 'eg' + (++eagleSeq);
    const wing = `
      <g class="wing">
        <path fill="url(#${id}g)" stroke="#6e5414" stroke-width="1.2" stroke-linejoin="round"
          d="M184,116 C158,90 112,66 8,52 C30,64 46,73 56,81 C36,82 20,87 4,96 C34,98 54,101 66,106
             C48,111 34,119 22,131 C52,126 74,126 90,128 C76,137 68,146 60,159 C90,148 114,143 132,143
             C126,153 122,162 120,175 C144,159 166,151 186,150 Z"/>
        <path fill="none" stroke="#7a5d17" stroke-width="1.4" stroke-linecap="round" opacity=".75"
          d="M176,124 C148,106 112,92 62,84 M176,132 C148,120 120,114 84,112 M178,140 C156,134 132,132 104,134 M180,146 C164,146 150,148 136,152"/>
        <path fill="url(#${id}h)" opacity=".85"
          d="M184,118 C160,100 132,86 92,76 C130,92 156,106 176,126 Z"/>
      </g>`;
    return `
<svg class="eagle ${cls}" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Águia dourada">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect">
      <stop offset="0" stop-color="#fff3c4"/>
      <stop offset=".25" stop-color="#f3d77a"/>
      <stop offset=".55" stop-color="#d4af37"/>
      <stop offset=".8" stop-color="#9c7a22"/>
      <stop offset="1" stop-color="#f3d77a"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-0.6 -0.6; 0.6 0.6; -0.6 -0.6" dur="7s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff8dc" stop-opacity="0"/>
      <stop offset=".6" stop-color="#fff8dc" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff8dc" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="${id}r" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#d4af37" stop-opacity=".55"/>
      <stop offset="1" stop-color="#d4af37" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse class="halo" cx="200" cy="140" rx="150" ry="110" fill="url(#${id}r)"/>
  <g class="eagle-fly">
    ${wing}
    <g transform="translate(400,0) scale(-1,1)">${wing}</g>
    <!-- cauda -->
    <path fill="url(#${id}g)" stroke="#6e5414" stroke-width="1.2" stroke-linejoin="round"
      d="M186,186 L170,236 L188,226 L200,248 L212,226 L230,236 L214,186 Z"/>
    <path stroke="#7a5d17" stroke-width="1.2" fill="none" opacity=".7" d="M193,196 L188,224 M200,196 L200,244 M207,196 L212,224"/>
    <!-- corpo -->
    <path fill="url(#${id}g)" stroke="#6e5414" stroke-width="1.2"
      d="M181,110 C165,130 167,164 179,188 C187,202 213,202 221,188 C233,164 235,130 219,110 Z"/>
    <path fill="none" stroke="#7a5d17" stroke-width="1.2" stroke-linecap="round" opacity=".7"
      d="M186,134 q14,8 28,0 M183,148 q17,9 34,0 M185,162 q15,9 30,0 M190,176 q10,7 20,0"/>
    <!-- garras -->
    <path fill="none" stroke="#d4af37" stroke-width="3" stroke-linecap="round"
      d="M190,192 l-6,14 m6,-14 l-1,15 m1,-15 l5,13 M210,192 l6,14 m-6,-14 l1,15 m-1,-15 l-5,13"/>
    <!-- cabeça -->
    <path fill="url(#${id}g)" stroke="#6e5414" stroke-width="1.2" stroke-linejoin="round"
      d="M184,116 C177,101 181,83 196,75 C207,69 220,71 230,77 C241,77 251,84 254,97 C255,102 251,106 247,103
         C247,99 244,96 239,97 L227,100 C223,107 219,114 212,120 C201,124 190,123 184,116 Z"/>
    <path fill="#5a430c" opacity=".55" d="M230,77 C241,77 251,84 254,97 C255,102 251,106 247,103 C247,99 244,96 239,97 L227,100 C229,92 230,85 230,77 Z"/>
    <path fill="none" stroke="#fff3c4" stroke-width="1.2" opacity=".7" stroke-linecap="round" d="M233,80 C242,81 249,87 251,95"/>
    <path fill="none" stroke="#6e5414" stroke-width="1.1" stroke-linejoin="round" opacity=".8"
      d="M186,116 l5,6 4,-5 5,6 4,-5 5,5 4,-5"/>
    <circle cx="218" cy="86" r="3.4" fill="#120d02"/>
    <circle cx="219" cy="85" r="1" fill="#fff6d6"/>
    <path d="M207,80 L225,83.5" stroke="#4a3608" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
  }

  function mountEagles() {
    document.querySelectorAll('[data-eagle]').forEach((el) => {
      el.outerHTML = eagleSVG(el.getAttribute('data-eagle') || '');
    });
  }

  // ---------- Brilhos dourados de fundo ----------
  function sparkles() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.id = 'sparkles';
    document.body.prepend(c);
    const ctx = c.getContext('2d');
    let w, h, dpr, parts = [];
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
      const n = Math.round(Math.min(70, (innerWidth * innerHeight) / 22000));
      parts = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(any) {
      return {
        x: Math.random() * w, y: any ? Math.random() * h : h + 10,
        r: (Math.random() * 1.6 + 0.4) * dpr, vy: (Math.random() * 0.35 + 0.08) * dpr,
        vx: (Math.random() - 0.5) * 0.15 * dpr, a: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.006,
      };
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy; p.x += p.vx; p.a += p.s;
        if (p.y < -10) Object.assign(p, spawn(false));
        const alpha = 0.25 + Math.sin(p.a) * 0.25 + 0.2;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255,236,170,${alpha})`);
        g.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    addEventListener('resize', resize);
    resize(); tick();
  }

  // ---------- Confete dourado (meta batida) ----------
  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'celebrate';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const colors = ['#fff1b8', '#f3d77a', '#d4af37', '#a8862b', '#ffffff'];
    const ps = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4,
      r: Math.random() * 6 + 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0],
    }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      }
      if (++t < 200) requestAnimationFrame(frame); else c.remove();
    })();
  }

  // ---------- Toasts ----------
  function toast(msg, type = '') {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3600);
  }

  // ---------- Modal ----------
  function modal(html, { onOpen, onClose, locked = false } = {}) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg show';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(bg);
    let closed = false;
    const close = () => { if (closed) return; closed = true; bg.remove(); onClose && onClose(); };
    bg.addEventListener('click', (e) => { if ((e.target === bg && !locked) || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape' && !locked) { close(); document.removeEventListener('keydown', onKey); } });
    if (onOpen) onOpen(bg.querySelector('.modal'), close);
    const first = bg.querySelector('input, textarea, select, button');
    if (first) setTimeout(() => first.focus(), 30);
    return close;
  }

  function confirmBox(text, okLabel = 'Confirmar', danger = false) {
    return new Promise((resolve) => {
      let ok = false;
      modal(`<h2>Confirmar</h2><p class="muted">${esc(text)}</p>
        <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn ${danger ? 'btn-bad' : 'btn-gold'}" data-ok>${esc(okLabel)}</button></div>`, {
        onOpen: (m, cl) => m.querySelector('[data-ok]').addEventListener('click', () => { ok = true; cl(); }),
        onClose: () => resolve(ok),
      });
    });
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copiado! ✨', 'ok'); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copiado! ✨', 'ok'); } catch { toast('Não foi possível copiar.', 'err'); }
      ta.remove();
    }
  }

  // ---------- Formatação ----------
  const fmtDate = (ms) => ms ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms) : '—';
  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const STATUS = { pending: 'Em avaliação', approved: 'Aprovado', rejected: 'Recusado' };
  const statusPill = (s) => `<span class="status ${s}">${STATUS[s] || s}</span>`;
  const igLink = (url, handle) => `<a class="ig-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="ig">◎</span><span class="h">@${esc(handle)}</span></a>`;

  function ring(el, value, goal) {
    const r = 92, C = 2 * Math.PI * r;
    const pct = Math.min(1, goal ? value / goal : 0);
    const id = 'rg' + Math.random().toString(36).slice(2, 8);
    el.innerHTML = `<svg viewBox="0 0 210 210">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#a8862b"/></linearGradient></defs>
      <circle class="track" cx="105" cy="105" r="${r}" fill="none" stroke-width="14"/>
      <circle class="bar" cx="105" cy="105" r="${r}" fill="none" stroke="url(#${id})" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
      <div class="center"><div><div class="num gold-text" data-count="${value}">0</div><div class="of">de ${goal} aprovados</div></div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.querySelector('.bar').style.strokeDashoffset = C * (1 - pct); }));
    countUp(el.querySelector('[data-count]'));
  }

  function countUp(node) {
    const target = Number(node.dataset.count) || 0;
    const t0 = performance.now(), dur = 1200;
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      node.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function setupTabs(onChange) {
    const tabs = document.querySelectorAll('.tab[data-view]');
    function show(name) {
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === name));
      document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
      if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
      onChange && onChange(name);
    }
    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
    const initial = location.hash.slice(1);
    show([...tabs].some((t) => t.dataset.view === initial) ? initial : tabs[0].dataset.view);
    return show;
  }

  async function logout() {
    try { await api('/api/logout', { method: 'POST' }); } catch { /* ignora */ }
    location.href = '/login';
  }

  function passwordModal(forced = false) {
    modal(`<h2>${forced ? 'Crie sua nova senha' : 'Trocar senha'}</h2>
      ${forced ? '<p class="muted">Por segurança, troque a senha temporária que você recebeu.</p>' : ''}
      <div class="alert err" data-err></div>
      <form data-pw>
        <div class="field"><label>Senha atual</label><input class="input" type="password" name="current" autocomplete="current-password" required></div>
        <div class="field"><label>Nova senha</label><input class="input" type="password" name="next" minlength="6" autocomplete="new-password" required></div>
        <div class="field"><label>Repita a nova senha</label><input class="input" type="password" name="again" minlength="6" autocomplete="new-password" required></div>
        <div class="foot">${forced ? '' : '<button type="button" class="btn btn-ghost" data-close>Cancelar</button>'}<button class="btn btn-gold">Salvar senha</button></div>
      </form>`, {
      locked: forced,
      onOpen: (m, close) => {
        m.querySelector('[data-pw]').addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const err = m.querySelector('[data-err]');
          if (f.get('next') !== f.get('again')) { err.textContent = 'As senhas não conferem.'; err.classList.add('show'); return; }
          try {
            await api('/api/me/password', { method: 'POST', body: { current: f.get('current'), next: f.get('next') } });
            close(); toast('Senha alterada com sucesso!', 'ok');
          } catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
        });
      },
    });
  }


  // ---------- Ranking (pódio + lista) ----------
  function renderRanking(podiumEl, listEl, ranking, { details = false } = {}) {
    if (!ranking.length) {
      if (podiumEl) podiumEl.innerHTML = '';
      listEl.innerHTML = '<div class="empty"><div class="e">🏆</div>Nenhuma participante ainda.</div>';
      return;
    }
    if (podiumEl) {
      const top = ranking.slice(0, 3);
      const order = [top[1], top[0], top[2]];
      const crowns = ['🥈', '👑', '🥉'];
      podiumEl.innerHTML = order.map((r, i) => r ? `<div class="pod ${i === 1 ? 'first' : ''}">
        <div class="crown">${crowns[i]}</div><div class="avatar">${esc(initials(r.name))}</div>
        <b>${esc(r.name)}</b><div class="n gold-text">${r.approved}</div><div class="dim" style="font-size:12px">aprovados</div></div>` : '<div></div>').join('');
    }
    listEl.innerHTML = ranking.map((r) => rankRow(r, details)).join('');
  }

  function rankRow(r, details = false) {
    const p = r.position <= 3 ? 'p' + r.position : '';
    return `<li class="rank-item ${r.me ? 'me' : ''}">
      <div class="rank-pos ${p}">${r.position}</div>
      <div><div class="rank-name">${esc(r.name)} ${r.me ? '<small>(você)</small>' : ''} ${r.hit ? '<span title="Meta batida">🦅</span>' : ''}
        ${details ? `<small>${r.pending || 0} pend. · ${r.rejected || 0} recus.</small>` : ''}</div>
        <div class="pbar ${r.hit ? 'done' : ''}"><i style="width:${r.percent}%"></i></div></div>
      <div class="rank-score">${r.approved}<small>de ${r.goal}</small></div></li>`;
  }

  function bars(el, days, keys) {
    const max = Math.max(1, ...days.map((d) => d[keys.total] || 0));
    el.innerHTML = days.map((d) => {
      const tot = d[keys.total] || 0;
      const ok = keys.ok ? d[keys.ok] || 0 : null;
      return `<div class="b"><div class="val">${ok !== null ? ok : tot}</div><div class="stack">
        <div class="col ${ok !== null ? 'ghost' : ''}" style="height:${(tot / max) * 100}%"></div>
        ${ok !== null ? `<div class="col" style="height:${(ok / max) * 100}%"></div>` : ''}
      </div><div class="lbl">${esc(d.label)}</div></div>`;
    }).join('');
  }

  function pager(el, page, pages, onGo) {
    if (pages <= 1) { el.innerHTML = ''; return; }
    el.innerHTML = `<button class="btn btn-ghost btn-sm" ${page <= 1 ? 'disabled' : ''} data-p="${page - 1}">‹ Anterior</button>
      <span>Página ${page} de ${pages}</span>
      <button class="btn btn-ghost btn-sm" ${page >= pages ? 'disabled' : ''} data-p="${page + 1}">Próxima ›</button>`;
    el.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => onGo(Number(b.dataset.p))));
  }

  async function initShell() {
    const st = await api('/api/state', { allow401: true });
    if (!st.user) { location.href = '/login'; return null; }
    document.querySelectorAll('[data-site-name]').forEach((n) => { n.textContent = st.siteName; });
    document.getElementById('me-name').textContent = st.user.name;
    document.getElementById('me-user').textContent = '@' + st.user.username;
    document.getElementById('me-avatar').textContent = initials(st.user.name);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-pw').addEventListener('click', () => passwordModal(false));
    if (st.user.mustChangePassword) passwordModal(true);
    return st;
  }

  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  window.App = { api, esc, eagleSVG, mountEagles, sparkles, celebrate, toast, modal, confirmBox, copy, fmtDate, initials, statusPill, igLink, ring, countUp, setupTabs, logout, passwordModal, STATUS, renderRanking, bars, pager, initShell, debounce };

  document.addEventListener('DOMContentLoaded', () => { mountEagles(); sparkles(); });
})();
