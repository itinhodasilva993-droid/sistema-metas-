(function () {
  'use strict';
  const A = window.App;
  const { api, esc, toast, modal, confirmBox, fmtDate, statusPill, igLink } = A;
  const $ = (s) => document.querySelector(s);

  let users = [];
  let defaultGoal = 140;
  const qState = { page: 1, selected: new Set(), items: [] };
  const hState = { page: 1, status: '' };
  let rankWeeks = 0;

  const loaders = {
    dashboard: loadDashboard,
    avaliacao: loadQueue,
    participantes: loadUsers,
    ranking: loadRanking,
    historico: loadHistory,
    config: loadConfig,
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const st = await A.initShell();
    if (!st) return;
    const show = A.setupTabs((name) => loaders[name] && loaders[name]());
    document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });
    await loadUsersQuiet();
    refreshBadge();
    setInterval(refreshBadge, 30000);
    wireQueue(); wireHistory(); wireRanking(); wireConfig();
    $('#btn-new-user').addEventListener('click', newUserModal);
  });

  async function refreshBadge() {
    try {
      const d = await api('/api/admin/submissions?status=pending');
      const b = $('#badge-pending');
      b.textContent = d.total; b.dataset.n = d.total;
    } catch { /* silencioso */ }
  }

  async function loadUsersQuiet() {
    const d = await api('/api/admin/users');
    users = d.users; defaultGoal = d.defaultGoal;
    const opts = '<option value="">Todas as participantes</option>' + users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
    ['#q-user', '#h-user'].forEach((s) => { const el = $(s); const v = el.value; el.innerHTML = opts; el.value = v; });
  }

  // ---------------- DASHBOARD ----------------
  async function loadDashboard() {
    const d = await api('/api/admin/dashboard');
    $('#d-week').textContent = d.week.label;
    const t = d.weekTotals;
    const rate = t.approved + t.rejected ? Math.round((t.approved / (t.approved + t.rejected)) * 100) : 0;
    $('#d-stats').innerHTML = [
      ['Aguardando avaliação', d.pendingTotal, 'perfis na fila', '⏳'],
      ['Aprovados na semana', t.approved, `de ${t.sent} enviados`, '✔'],
      ['Meta batida', `${d.hitCount}/${d.members}`, `meta padrão: ${d.goal} perfis`, '🦅'],
      ['Taxa de aprovação', rate + '%', `${t.rejected} recusados`, '★'],
    ].map(([k, v, s, i]) => `<div class="card stat"><div class="ico">${i}</div><div class="k">${k}</div><div class="v gold-text">${v}</div><div class="s">${s}</div></div>`).join('');
    $('#d-hit').textContent = `${d.hitCount} de ${d.members} bateram a meta`;
    const team = $('#d-team');
    A.renderRanking(null, team, d.ranking, { details: true });
    if (!d.ranking.length) team.innerHTML = '<div class="empty"><div class="e">👥</div>Crie a primeira participante na aba <a href="#participantes" data-go="participantes">Participantes</a>.</div>';
    A.bars($('#d-days'), d.days, { total: 'sent', ok: 'approved' });
    $('#d-recent').innerHTML = d.recent.length ? `<div class="table-wrap"><table><tbody>${d.recent.map((r) => `<tr>
      <td>${igLink(r.url, r.handle)}</td><td class="dim">${esc(r.user_name)}</td><td class="right">${statusPill(r.status)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">Nenhum envio ainda.</div>';
  }

  // ---------------- FILA DE AVALIAÇÃO ----------------
  function wireQueue() {
    $('#q-search').addEventListener('input', A.debounce(() => { qState.page = 1; loadQueue(); }));
    $('#q-user').addEventListener('change', () => { qState.page = 1; loadQueue(); });
    $('#q-all').addEventListener('change', (e) => {
      qState.selected = e.target.checked ? new Set(qState.items.map((i) => i.id)) : new Set();
      renderQueue();
    });
    $('#q-bulk-ok').addEventListener('click', () => bulk('approved'));
    $('#q-bulk-no').addEventListener('click', () => bulk('rejected'));
  }

  async function loadQueue() {
    const params = new URLSearchParams({ status: 'pending', page: qState.page, q: $('#q-search').value, user: $('#q-user').value });
    const d = await api('/api/admin/submissions?' + params);
    qState.items = d.items;
    qState.selected = new Set([...qState.selected].filter((id) => d.items.some((i) => i.id === id)));
    renderQueue();
    A.pager($('#q-pager'), d.page, d.pages, (p) => { qState.page = p; loadQueue(); });
    $('#badge-pending').textContent = d.total; $('#badge-pending').dataset.n = d.total;
  }

  function renderQueue() {
    const list = $('#q-list');
    $('#q-bulk-ok').disabled = $('#q-bulk-no').disabled = qState.selected.size === 0;
    $('#q-all').checked = qState.items.length > 0 && qState.selected.size === qState.items.length;
    if (!qState.items.length) {
      list.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="e">✨</div>Tudo avaliado! Nenhum perfil aguardando.</div>';
      return;
    }
    list.innerHTML = qState.items.map((s) => `<div class="q-card ${qState.selected.has(s.id) ? 'selected' : ''}" data-id="${s.id}">
      <div class="q-top"><label class="row" style="margin:0;gap:8px"><input type="checkbox" class="checkbox" data-sel ${qState.selected.has(s.id) ? 'checked' : ''}>
        <span class="q-meta">Enviado por <b>${esc(s.user_name)}</b></span></label><span class="q-meta">${fmtDate(s.created_at)}</span></div>
      <a class="q-open" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" data-open><span class="ig-link"><span class="ig">◎</span></span>@${esc(s.handle)} <span class="dim">↗</span></a>
      <div class="q-actions"><button class="btn btn-ok btn-sm" data-act="approved">✔ Aprovar</button><button class="btn btn-bad btn-sm" data-act="rejected">✕ Recusar</button></div>
    </div>`).join('');
    list.querySelectorAll('.q-card').forEach((card) => {
      const id = Number(card.dataset.id);
      card.querySelector('[data-sel]').addEventListener('change', (e) => {
        e.target.checked ? qState.selected.add(id) : qState.selected.delete(id);
        renderQueue();
      });
      card.querySelector('[data-open]').addEventListener('click', () => card.classList.add('selected-open'));
      card.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => decide(card, id, b.dataset.act)));
    });
  }

  async function decide(card, id, status) {
    let note = '';
    if (status === 'rejected') {
      note = await askNote();
      if (note === null) return;
    }
    try {
      await api('/api/admin/submissions/review', { method: 'POST', body: { ids: [id], status, note } });
      card.classList.add('leaving');
      toast(status === 'approved' ? 'Perfil aprovado ✔' : 'Perfil recusado', status === 'approved' ? 'ok' : '');
      setTimeout(loadQueue, 280);
    } catch (e) { toast(e.message, 'err'); }
  }

  function askNote() {
    return new Promise((resolve) => {
      let value = null;
      modal(`<h2>Recusar perfil</h2>
        <div class="field"><label>Motivo (opcional, a participante verá)</label>
        <input class="input" id="note" maxlength="300" placeholder="Ex.: perfil privado, perfil fake, poucos seguidores..."></div>
        <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-bad" data-ok>Recusar</button></div>`, {
        onOpen: (m, close) => {
          const go = () => { value = m.querySelector('#note').value; close(); };
          m.querySelector('[data-ok]').addEventListener('click', go);
          m.querySelector('#note').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        },
        onClose: () => resolve(value),
      });
    });
  }

  async function bulk(status) {
    const ids = [...qState.selected];
    if (!ids.length) return;
    let note = '';
    if (status === 'rejected') { note = await askNote(); if (note === null) return; }
    else if (!(await confirmBox(`Aprovar ${ids.length} perfil(is) selecionado(s)?`, 'Aprovar'))) return;
    try {
      const r = await api('/api/admin/submissions/review', { method: 'POST', body: { ids, status, note } });
      toast(`${r.updated} perfil(is) ${status === 'approved' ? 'aprovado(s)' : 'recusado(s)'}`, 'ok');
      qState.selected.clear();
      loadQueue();
    } catch (e) { toast(e.message, 'err'); }
  }

  // ---------------- PARTICIPANTES ----------------
  async function loadUsers() {
    await loadUsersQuiet();
    const tb = $('#u-list');
    if (!users.length) {
      tb.innerHTML = '<tr><td colspan="8"><div class="empty"><div class="e">👥</div>Nenhuma participante ainda. Clique em <b>+ Nova participante</b>.</div></td></tr>';
      return;
    }
    tb.innerHTML = users.map((u) => {
      const goal = u.weekly_goal || defaultGoal;
      const pct = Math.min(100, Math.round((u.week_approved / goal) * 100));
      return `<tr data-id="${u.id}">
        <td><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="avatar" style="width:32px;height:32px;font-size:12px">${esc(A.initials(u.name))}</div><b>${esc(u.name)}</b></div></td>
        <td class="dim">@${esc(u.username)}</td>
        <td style="min-width:140px"><div style="font-size:13px"><b>${u.week_approved}</b> / ${goal}${u.weekly_goal ? ' <span class="dim">(individual)</span>' : ''}</div><div class="pbar ${u.week_approved >= goal ? 'done' : ''}" style="height:6px;margin-top:4px"><i style="width:${pct}%"></i></div></td>
        <td>${u.pending}</td><td>${u.total_approved}</td>
        <td class="dim">${u.last_login_at ? fmtDate(u.last_login_at) : 'nunca'}</td>
        <td>${u.active ? '<span class="status approved">Ativa</span>' : '<span class="status off">Desativada</span>'}</td>
        <td class="actions"><button class="btn btn-ghost btn-sm" data-edit>Gerenciar</button></td></tr>`;
    }).join('');
    tb.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      editUserModal(users.find((u) => u.id === Number(b.closest('tr').dataset.id)));
    }));
  }

  const accessUrl = () => location.origin + '/login';
  const credText = (name, username, password) =>
    `Olá, ${name}! 🦅\nSeu acesso ao painel de metas:\n\nLink: ${accessUrl()}\nUsuário: ${username}\nSenha: ${password}\n\nNo primeiro acesso você vai criar uma nova senha.`;

  function showCreds(title, name, username, password) {
    const text = credText(name, username, password);
    modal(`<h2>${esc(title)}</h2><p class="muted">Copie e envie para ela (WhatsApp, Direct...). A senha não será mostrada de novo.</p>
      <div class="cred">${esc(text)}</div>
      <div class="foot"><button class="btn btn-ghost" data-close>Fechar</button><button class="btn btn-gold" data-copy>Copiar mensagem</button></div>`, {
      onOpen: (m) => m.querySelector('[data-copy]').addEventListener('click', () => A.copy(text)),
    });
  }

  function slug(name) {
    return String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  }

  function newUserModal() {
    modal(`<h2>Nova participante</h2><div class="alert err" data-err></div>
      <form data-f>
        <div class="field"><label>Nome</label><input class="input" name="name" required maxlength="60"></div>
        <div class="field"><label>Usuário de acesso</label><input class="input" name="username" required autocapitalize="none" pattern="[a-zA-Z0-9._\\-]{3,30}"><div class="hint">Gerado a partir do nome, mas você pode mudar.</div></div>
        <div class="field"><label>Senha temporária</label><input class="input" name="password" minlength="6" placeholder="Deixe em branco para gerar automaticamente"></div>
        <div class="field"><label>Meta individual (opcional)</label><input class="input" name="weeklyGoal" type="number" min="1" placeholder="Padrão: ${defaultGoal} por semana"></div>
        <div class="foot"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-gold">Criar conta</button></div>
      </form>`, {
      onOpen: (m, close) => {
        const f = m.querySelector('[data-f]');
        let touched = false;
        f.elements.username.addEventListener('input', () => { touched = true; });
        f.elements.name.addEventListener('input', () => { if (!touched) f.elements.username.value = slug(f.elements.name.value); });
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          const body = Object.fromEntries(new FormData(f));
          try {
            const r = await api('/api/admin/users', { method: 'POST', body });
            close();
            toast('Conta criada!', 'ok');
            showCreds('Conta criada ✨', body.name, r.username, r.password);
            loadUsers();
          } catch (ex) { const er = m.querySelector('[data-err]'); er.textContent = ex.message; er.classList.add('show'); }
        });
      },
    });
  }

  function editUserModal(u) {
    if (!u) return;
    modal(`<h2>${esc(u.name)}</h2><p class="muted" style="margin-top:-8px">@${esc(u.username)}</p><div class="alert err" data-err></div>
      <form data-f>
        <div class="field"><label>Nome</label><input class="input" name="name" value="${esc(u.name)}" required maxlength="60"></div>
        <div class="field"><label>Meta individual por semana</label><input class="input" name="weeklyGoal" type="number" min="1" value="${u.weekly_goal || ''}" placeholder="Padrão: ${defaultGoal}"><div class="hint">Deixe vazio para usar a meta padrão.</div></div>
        <div class="foot" style="justify-content:space-between">
          <div class="row"><button type="button" class="btn btn-ghost btn-sm" data-reset>Redefinir senha</button>
          <button type="button" class="btn btn-ghost btn-sm" data-toggle>${u.active ? 'Desativar' : 'Reativar'}</button>
          <button type="button" class="btn btn-bad btn-sm" data-del>Excluir</button></div>
          <button class="btn btn-gold">Salvar</button></div>
      </form>`, {
      onOpen: (m, close) => {
        const f = m.querySelector('[data-f]');
        const fail = (ex) => { const er = m.querySelector('[data-err]'); er.textContent = ex.message; er.classList.add('show'); };
        f.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { name: f.elements.name.value, weeklyGoal: f.elements.weeklyGoal.value || null } });
            close(); toast('Salvo!', 'ok'); loadUsers();
          } catch (ex) { fail(ex); }
        });
        m.querySelector('[data-reset]').addEventListener('click', async () => {
          close();
          if (!(await confirmBox(`Gerar uma nova senha temporária para ${u.name}? A senha atual deixará de funcionar.`, 'Gerar senha'))) return;
          try {
            const r = await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { resetPassword: true } });
            showCreds('Nova senha gerada', u.name, r.username, r.password);
          } catch (ex) { toast(ex.message, 'err'); }
        });
        m.querySelector('[data-toggle]').addEventListener('click', async () => {
          try {
            await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } });
            close(); toast(u.active ? 'Conta desativada' : 'Conta reativada', 'ok'); loadUsers();
          } catch (ex) { fail(ex); }
        });
        m.querySelector('[data-del]').addEventListener('click', async () => {
          close();
          if (!(await confirmBox(`Excluir ${u.name} e TODOS os envios dela? Isso não pode ser desfeito. (Se quiser só bloquear o acesso, use "Desativar".)`, 'Excluir definitivamente', true))) return;
          try { await api(`/api/admin/users/${u.id}`, { method: 'DELETE' }); toast('Conta excluída', 'ok'); loadUsers(); } catch (ex) { toast(ex.message, 'err'); }
        });
      },
    });
  }

  // ---------------- RANKING ----------------
  function wireRanking() {
    $('#r-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('#r-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      rankWeeks = Number(b.dataset.w); loadRanking();
    }));
  }
  async function loadRanking() {
    const d = await api('/api/ranking?weeksBack=' + rankWeeks);
    $('#r-week').textContent = d.week;
    A.renderRanking($('#r-podium'), $('#r-list'), d.ranking, { details: true });
  }

  // ---------------- HISTÓRICO ----------------
  function wireHistory() {
    $('#h-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('#h-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      hState.status = b.dataset.s; hState.page = 1; loadHistory();
    }));
    $('#h-search').addEventListener('input', A.debounce(() => { hState.page = 1; loadHistory(); }));
    $('#h-user').addEventListener('change', () => { hState.page = 1; loadHistory(); });
  }
  async function loadHistory() {
    const params = new URLSearchParams({ status: hState.status, page: hState.page, q: $('#h-search').value, user: $('#h-user').value });
    const d = await api('/api/admin/submissions?' + params);
    const tb = $('#h-list');
    tb.innerHTML = d.items.length ? d.items.map((s) => `<tr data-id="${s.id}">
      <td>${igLink(s.url, s.handle)}</td><td>${esc(s.user_name)}</td><td class="dim">${fmtDate(s.created_at)}</td>
      <td>${statusPill(s.status)}</td><td class="dim" style="max-width:240px">${esc(s.note || '')}</td>
      <td class="actions">
        ${s.status !== 'approved' ? '<button class="btn btn-ok btn-sm" data-act="approved" title="Aprovar">✔</button>' : ''}
        ${s.status !== 'rejected' ? '<button class="btn btn-bad btn-sm" data-act="rejected" title="Recusar">✕</button>' : ''}
        ${s.status !== 'pending' ? '<button class="btn btn-ghost btn-sm" data-act="pending" title="Voltar para avaliação">↺</button>' : ''}
        <button class="btn btn-ghost btn-sm" data-del title="Apagar envio (libera o perfil para reenvio)">🗑</button>
      </td></tr>`).join('') : '<tr><td colspan="6"><div class="empty">Nenhum envio encontrado.</div></td></tr>';
    tb.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const id = Number(b.closest('tr').dataset.id);
      let note = '';
      if (b.dataset.act === 'rejected') { note = await askNote(); if (note === null) return; }
      try { await api('/api/admin/submissions/review', { method: 'POST', body: { ids: [id], status: b.dataset.act, note } }); toast('Atualizado', 'ok'); loadHistory(); refreshBadge(); }
      catch (e) { toast(e.message, 'err'); }
    }));
    tb.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const id = Number(b.closest('tr').dataset.id);
      if (!(await confirmBox('Apagar este envio? O perfil poderá ser enviado de novo.', 'Apagar', true))) return;
      try { await api('/api/admin/submissions/' + id, { method: 'DELETE' }); toast('Envio apagado', 'ok'); loadHistory(); refreshBadge(); }
      catch (e) { toast(e.message, 'err'); }
    }));
    A.pager($('#h-pager'), d.page, d.pages, (p) => { hState.page = p; loadHistory(); });
  }

  // ---------------- CONFIG ----------------
  function wireConfig() {
    $('#cfg-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const r = await api('/api/admin/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
        defaultGoal = r.settings.weekly_goal;
        document.querySelectorAll('[data-site-name]').forEach((n) => { n.textContent = r.settings.site_name; });
        toast('Configurações salvas!', 'ok');
      } catch (ex) { toast(ex.message, 'err'); }
    });
    $('#tier-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/tiers', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
        e.target.reset(); toast('Meta extra adicionada!', 'ok'); loadConfig();
      } catch (ex) { toast(ex.message, 'err'); }
    });
    $('#copy-link').addEventListener('click', () => A.copy(accessUrl()));
  }
  async function loadConfig() {
    const d = await api('/api/admin/settings');
    const f = $('#cfg-form');
    f.elements.weekly_goal.value = d.settings.weekly_goal;
    f.elements.site_name.value = d.settings.site_name;
    f.elements.message.value = d.settings.message;
    $('#access-link').textContent = accessUrl();
    const medals = ['🥈', '🥇', '💎', '👑', '🔥'];
    $('#tier-list').innerHTML = d.tiers.length ? d.tiers.map((t, i) => `<div class="tier hit"><div class="medal">${medals[i] || '★'}</div>
      <div class="info"><b>${esc(t.name)} · ${t.target} aprovados</b><span>${esc(t.reward || 'Sem recompensa definida')}</span></div>
      <button class="btn btn-bad btn-sm" data-del="${t.id}">Remover</button></div>`).join('')
      : '<div class="empty" style="padding:16px">Nenhuma meta extra.</div>';
    $('#tier-list').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox('Remover esta meta extra?', 'Remover', true))) return;
      await api('/api/admin/tiers/' + b.dataset.del, { method: 'DELETE' }); loadConfig();
    }));
  }
})();
