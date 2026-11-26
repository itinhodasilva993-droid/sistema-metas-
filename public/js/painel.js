(function () {
  'use strict';
  const A = window.App;
  const { api, esc, toast, fmtDate, statusPill, igLink } = A;
  const $ = (s) => document.querySelector(s);
  const eState = { page: 1, status: '' };
  let rankWeeks = 0;

  const loaders = { inicio: loadOverview, envios: loadSubs, ranking: loadRanking };

  document.addEventListener('DOMContentLoaded', async () => {
    const st = await A.initShell();
    if (!st) return;
    $('#hello-name').textContent = st.user.name.split(' ')[0];
    const show = A.setupTabs((name) => loaders[name] && loaders[name]());
    document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });
    wireSend(); wireSubs(); wireRanking();
    refreshBadge();
  });

  async function refreshBadge() {
    try {
      const d = await api('/api/member/submissions?status=pending');
      $('#badge-pending').textContent = d.total; $('#badge-pending').dataset.n = d.total;
    } catch { /* silencioso */ }
  }

  // ---------------- INÍCIO ----------------
  async function loadOverview() {
    const d = await api('/api/member/overview');
    $('#m-week').textContent = d.week.label;
    A.ring($('#m-ring'), d.approved, d.goal);
    const hit = d.approved >= d.goal;
    $('#m-big').innerHTML = hit ? '<span class="gold-text">Meta batida! 🦅</span>' : `Faltam <span class="gold-text">${d.remaining}</span> perfis`;
    $('#m-sub').textContent = hit
      ? 'Parabéns! Continue enviando para conquistar as metas extras.'
      : `Sua meta é de ${d.goal} perfis aprovados até domingo.`;
    $('#m-chips').innerHTML = `<span class="chip">Em avaliação <b>${d.pending}</b></span>
      <span class="chip">Enviados <b>${d.sent}</b></span><span class="chip">Recusados <b>${d.rejected}</b></span>
      <span class="chip">Total aprovado <b>${d.totalApproved}</b></span>`;
    $('#m-message').textContent = d.message || 'Sem recados por enquanto.';
    const medals = ['🥈', '🥇', '💎', '👑', '🔥'];
    $('#m-tiers').innerHTML = d.tiers.length ? d.tiers.map((t, i) => `<div class="tier ${t.hit ? 'hit' : ''}"><div class="medal">${medals[i] || '★'}</div>
      <div class="info"><b>${esc(t.name)} · ${t.target}</b><span>${esc(t.reward || '')}${t.hit ? ' · conquistada!' : ` · faltam ${Math.max(0, t.target - d.approved)}`}</span>
      <div class="pbar ${t.hit ? 'done' : ''}" style="height:5px;margin-top:6px"><i style="width:${Math.min(100, (d.approved / t.target) * 100)}%"></i></div></div></div>`).join('')
      : '<p class="dim">Nenhuma meta extra nesta semana.</p>';
    $('#m-pos').textContent = d.position ? `${d.position}º lugar` : '—';
    $('#m-pos-sub').textContent = `entre ${d.participants} participantes`;
    $('#m-top').innerHTML = '';
    A.renderRanking(null, $('#m-top'), d.ranking.slice(0, 3).concat(d.ranking.slice(3).filter((r) => r.me)));
    A.bars($('#m-days'), d.days, { total: 'count' });
    $('#m-history').innerHTML = d.history.map((h) => `<div class="tier ${h.hit ? 'hit' : ''}" style="padding:8px 0"><div class="medal" style="width:34px;height:34px;font-size:15px">${h.hit ? '🦅' : '·'}</div>
      <div class="info"><b>${esc(h.label)}</b><span>${h.approved} aprovados</span></div></div>`).join('');

    // Comemoração: só uma vez por semana ao bater a meta
    try {
      const key = 'celebrated-' + d.week.start;
      if (hit && !localStorage.getItem(key)) { localStorage.setItem(key, '1'); A.celebrate(); toast('Meta da semana batida! 🦅✨', 'ok'); }
    } catch { /* sem storage */ }
  }

  // ---------------- ENVIAR ----------------
  function wireSend() {
    const ta = $('#links');
    const count = () => {
      const n = ta.value.split(/[\n,;\s]+/).filter(Boolean).length;
      $('#links-count').textContent = `${n} link${n === 1 ? '' : 's'}`;
    };
    ta.addEventListener('input', count);
    $('#send-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#send-btn');
      btn.disabled = true; btn.textContent = 'Enviando...';
      try {
        const r = await api('/api/member/submissions', { method: 'POST', body: { links: ta.value } });
        $('#send-results').innerHTML = r.results.map((x) => x.ok
          ? `<div class="ok">✔ @${esc(x.handle)} enviado para avaliação</div>`
          : `<div class="err">✕ ${esc(x.handle ? '@' + x.handle : x.input)}: ${esc(x.error)}</div>`).join('');
        // mantém só os que falharam no campo, para corrigir
        ta.value = r.results.filter((x) => !x.ok).map((x) => x.input).join('\n');
        count();
        if (r.added) toast(`${r.added} perfil(is) enviado(s)! ✨`, 'ok');
        else toast('Nenhum perfil novo enviado.', 'err');
        refreshBadge();
      } catch (ex) { toast(ex.message, 'err'); }
      btn.disabled = false; btn.textContent = 'Enviar para avaliação';
    });
  }

  // ---------------- MEUS ENVIOS ----------------
  function wireSubs() {
    $('#e-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('#e-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      eState.status = b.dataset.s; eState.page = 1; loadSubs();
    }));
  }
  async function loadSubs() {
    const d = await api(`/api/member/submissions?status=${eState.status}&page=${eState.page}`);
    $('#e-list').innerHTML = d.items.length ? d.items.map((s) => `<tr>
      <td>${igLink(s.url, s.handle)}</td><td class="dim">${fmtDate(s.created_at)}</td><td>${statusPill(s.status)}</td>
      <td class="dim">${esc(s.note || '')}</td></tr>`).join('')
      : '<tr><td colspan="4"><div class="empty"><div class="e">📭</div>Nada por aqui ainda. <a href="#enviar" data-go="enviar">Enviar perfis</a></div></td></tr>';
    A.pager($('#e-pager'), d.page, d.pages, (p) => { eState.page = p; loadSubs(); });
  }

  // ---------------- RANKING ----------------
  function wireRanking() {
    $('#r-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('#r-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      rankWeeks = Number(b.dataset.w); loadRanking();
    }));
  }
  async function loadRanking() {
    const [d, me] = [await api('/api/ranking?weeksBack=' + rankWeeks), await api('/api/me')];
    $('#r-week').textContent = d.week;
    A.renderRanking($('#r-podium'), $('#r-list'), d.ranking.map((r) => ({ ...r, me: r.id === me.user.id })));
  }
})();
