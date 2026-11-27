'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { D, ready, getSettings, setSetting } = require('./db');
const U = require('./util');

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SETUP_TOKEN = process.env.SETUP_TOKEN || '';
const SESSION_DAYS = 30;
const PUBLIC = path.join(__dirname, '..', 'public');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // necessário atrás de proxy (Render, Railway, Nginx...)
app.use(express.json({ limit: '200kb' }));
app.use(async (req, res, next) => {
  try { await ready(); } catch (e) { console.error('Banco indisponível:', e.message); return res.status(503).send('Banco de dados indisponível. Tente de novo em instantes.'); }
  next();
});

// Cabeçalhos de segurança
app.use(async (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ---------------- Sessões ----------------
function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const expires = now + SESSION_DAYS * 86400000;
  await D.run('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', sha(token), userId, now, expires);
  res.setHeader('Set-Cookie',
    `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${IS_PROD ? '; Secure' : ''}`);
}

async function clearSession(req, res) {
  const token = parseCookies(req.headers.cookie).sid;
  if (token) await D.run('DELETE FROM sessions WHERE id = ?', sha(token));
  res.setHeader('Set-Cookie', `sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${IS_PROD ? '; Secure' : ''}`);
}

app.use(async (req, res, next) => {
  req.user = null;
  const token = parseCookies(req.headers.cookie).sid;
  if (token) {
    const row = await D.get(`
      SELECT u.id, u.name, u.username, u.role, u.active, u.must_change_password, u.weekly_goal, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`, sha(token));
    if (row && row.expires_at > Date.now() && row.active) req.user = row;
  }
  next();
});

// Proteção CSRF: toda escrita na API precisa do cabeçalho enviado pelo nosso JS
app.use('/api', async (req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'fetch') {
    return res.status(403).json({ error: 'Requisição bloqueada.' });
  }
  next();
});

const needsSetup = async () => (await D.get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")).c === 0;
const publicUser = (u) => u && ({
  id: u.id, name: u.name, username: u.username, role: u.role, mustChangePassword: !!u.must_change_password,
});
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Faça login para continuar.' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Faça login para continuar.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao ADM.' });
  next();
}
function requireMember(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Faça login para continuar.' });
  if (req.user.role !== 'member') return res.status(403).json({ error: 'Área exclusiva das participantes.' });
  next();
}
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

// Limite de tentativas de login (memória)
const attempts = new Map();
function tooMany(key) {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() - a.first > 15 * 60000) { attempts.delete(key); return false; }
  return a.count >= 10;
}
function failAttempt(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > 15 * 60000) attempts.set(key, { count: 1, first: Date.now() });
  else a.count++;
}

// ---------------- Cálculos de meta ----------------
function goalFor(user, settings) {
  return user.weekly_goal || settings.weekly_goal;
}

async function weeklyRanking(range) {
  const settings = (await getSettings());
  const rows = await D.all(`
    SELECT u.id, u.name, u.weekly_goal,
      COALESCE(SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected,
      COUNT(s.id) AS sent
    FROM users u
    LEFT JOIN submissions s ON s.user_id = u.id AND s.created_at >= ? AND s.created_at < ?
    WHERE u.role = 'member' AND u.active = 1
    GROUP BY u.id
    ORDER BY approved DESC, sent DESC, u.name COLLATE NOCASE ASC`, range.start, range.end);
  let pos = 0, last = null;
  return rows.map((r, i) => {
    if (r.approved !== last) { pos = i + 1; last = r.approved; }
    const goal = goalFor(r, settings);
    return { ...r, goal, position: pos, percent: Math.min(100, Math.round((r.approved / goal) * 100)), hit: r.approved >= goal };
  });
}

function weekLabel(range) {
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: U.TZ, day: '2-digit', month: '2-digit' });
  return `${f.format(range.start)} a ${f.format(range.end - 1)}`;
}

// ---------------- Rotas: estado / setup / login ----------------
app.get('/api/state', async (req, res) => {
  const s = (await getSettings());
  res.json({ needsSetup: (await needsSetup()), setupTokenRequired: !!SETUP_TOKEN, user: publicUser(req.user), siteName: s.site_name });
});

app.post('/api/setup', async (req, res) => {
  if (!(await needsSetup())) return bad(res, 'A conta ADM já foi criada.', 409);
  const { name, username, password, token } = req.body || {};
  if (SETUP_TOKEN) {
    const a = Buffer.from(String(token || '')), b = Buffer.from(SETUP_TOKEN);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return bad(res, 'Código de configuração incorreto.', 403);
  }
  const uname = String(username || '').trim().toLowerCase();
  if (!String(name || '').trim()) return bad(res, 'Informe seu nome.');
  if (!/^[a-z0-9._-]{3,30}$/.test(uname)) return bad(res, 'Usuário: 3 a 30 caracteres (letras, números, ponto, traço).');
  const pwErr = U.validatePassword(password);
  if (pwErr) return bad(res, pwErr);
  const r = await D.run(`INSERT INTO users (name, username, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)`, String(name).trim().slice(0, 60), uname, U.hashPassword(password), Date.now());
  await createSession(res, Number(r.lastInsertRowid));
  res.json({ ok: true, redirect: '/admin' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const uname = String(username || '').trim().toLowerCase();
  const key = `${req.ip}|${uname}`;
  if (tooMany(key)) return bad(res, 'Muitas tentativas. Aguarde 15 minutos e tente de novo.', 429);
  const user = await D.get('SELECT * FROM users WHERE username = ?', uname);
  if (!user || !U.verifyPassword(String(password || ''), user.password_hash)) {
    failAttempt(key);
    return bad(res, 'Usuário ou senha incorretos.', 401);
  }
  if (!user.active) return bad(res, 'Sua conta está desativada. Fale com o ADM.', 403);
  attempts.delete(key);
  await D.run('UPDATE users SET last_login_at = ? WHERE id = ?', Date.now(), user.id);
  await D.run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
  await createSession(res, user.id);
  res.json({ ok: true, user: publicUser(user), redirect: user.role === 'admin' ? '/admin' : '/painel' });
});

app.post('/api/logout', async (req, res) => {
  await clearSession(req, res);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/me/password', requireAuth, async (req, res) => {
  const { current, next } = req.body || {};
  const user = await D.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!U.verifyPassword(String(current || ''), user.password_hash)) return bad(res, 'Senha atual incorreta.');
  const pwErr = U.validatePassword(next);
  if (pwErr) return bad(res, pwErr);
  if (current === next) return bad(res, 'A nova senha precisa ser diferente da atual.');
  await D.run('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', U.hashPassword(next), user.id);
  // encerra outras sessões
  const token = parseCookies(req.headers.cookie).sid;
  await D.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', user.id, sha(token || ''));
  res.json({ ok: true });
});

// ---------------- Painel da participante ----------------
app.get('/api/member/overview', requireMember, async (req, res) => {
  const settings = (await getSettings());
  const range = U.weekRange();
  const ranking = await weeklyRanking(range);
  const me = ranking.find((r) => r.id === req.user.id) || { approved: 0, pending: 0, rejected: 0, sent: 0, position: null };
  const goal = goalFor(req.user, settings);
  const tiers = (await D.all('SELECT id, name, target, reward FROM tiers ORDER BY target ASC'))
    .map((t) => ({ ...t, hit: me.approved >= t.target }));

  const history = [];
  for (let i = 1; i <= 6; i++) {
    const r = U.weekRange(Date.now(), i);
    const c = (await D.get(`SELECT COUNT(*) AS c FROM submissions WHERE user_id = ? AND status = 'approved' AND created_at >= ? AND created_at < ?`, req.user.id, r.start, r.end)).c;
    history.push({ label: weekLabel(r), approved: c, hit: c >= goal });
  }
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = U.dayStart(Date.now(), i), end = U.dayStart(Date.now(), i - 1);
    const c = (await D.get(`SELECT COUNT(*) AS c FROM submissions WHERE user_id = ? AND created_at >= ? AND created_at < ?`, req.user.id, start, end)).c;
    days.push({ label: new Intl.DateTimeFormat('pt-BR', { timeZone: U.TZ, weekday: 'short' }).format(start).replace('.', ''), count: c });
  }
  const total = (await D.get(`SELECT COUNT(*) AS c FROM submissions WHERE user_id = ? AND status = 'approved'`, req.user.id)).c;

  res.json({
    user: publicUser(req.user),
    week: { label: weekLabel(range), start: range.start, end: range.end },
    goal, approved: me.approved, pending: me.pending, rejected: me.rejected, sent: me.sent,
    position: me.position, participants: ranking.length,
    remaining: Math.max(0, goal - me.approved),
    tiers, message: settings.message, siteName: settings.site_name,
    ranking: ranking.map((r) => ({ id: r.id, name: r.name, approved: r.approved, goal: r.goal, position: r.position, percent: r.percent, hit: r.hit, me: r.id === req.user.id })),
    history, days, totalApproved: total,
  });
});

app.get('/api/member/submissions', requireMember, async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 30;
  const where = status ? 'AND status = ?' : '';
  const args = status ? [req.user.id, status] : [req.user.id];
  const items = await D.all(`SELECT id, url, handle, status, note, created_at, reviewed_at FROM submissions
    WHERE user_id = ? ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, ...args);
  const total = (await D.get(`SELECT COUNT(*) AS c FROM submissions WHERE user_id = ? ${where}`, ...args)).c;
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

app.post('/api/member/submissions', requireMember, async (req, res) => {
  const raw = String((req.body && req.body.links) || '');
  const lines = raw.split(/[\n,;\s]+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return bad(res, 'Cole pelo menos um link de perfil.');
  if (lines.length > 100) return bad(res, 'Envie no máximo 100 links por vez.');
  const results = [];
  const seen = new Set();
  await D.tx(async (t) => {
    for (const line of lines) {
      const p = U.parseInstagram(line);
      if (p.error) { results.push({ input: line, ok: false, error: p.error }); continue; }
      if (seen.has(p.handle)) { results.push({ input: line, ok: false, error: 'Repetido nesta lista.' }); continue; }
      seen.add(p.handle);
      const existing = await t.get('SELECT user_id FROM submissions WHERE handle = ?', p.handle);
      if (existing) {
        results.push({ input: line, handle: p.handle, ok: false,
          error: existing.user_id === req.user.id ? 'Você já enviou este perfil.' : 'Este perfil já foi enviado por outra participante.' });
        continue;
      }
      await t.run('INSERT INTO submissions (user_id, url, handle, status, created_at) VALUES (?, ?, ?, ?, ?)', req.user.id, p.url, p.handle, 'pending', Date.now());
      results.push({ input: line, handle: p.handle, ok: true });
    }
  });
  res.json({ results, added: results.filter((r) => r.ok).length });
});

// ---------------- Ranking (ADM e participantes) ----------------
app.get('/api/ranking', requireAuth, async (req, res) => {
  const weeksBack = Math.max(0, Math.min(52, parseInt(req.query.weeksBack, 10) || 0));
  const range = U.weekRange(Date.now(), weeksBack);
  res.json({ week: weekLabel(range), ranking: (await weeklyRanking(range)).map((r) => ({
    id: r.id, name: r.name, approved: r.approved, goal: r.goal, position: r.position, percent: r.percent, hit: r.hit,
    ...(req.user.role === 'admin' ? { pending: r.pending, rejected: r.rejected, sent: r.sent } : {}),
  })) });
});

// ---------------- Painel ADM ----------------
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  const settings = (await getSettings());
  const range = U.weekRange();
  const ranking = await weeklyRanking(range);
  const pending = (await D.get("SELECT COUNT(*) AS c FROM submissions WHERE status = 'pending'")).c;
  const week = await D.get(`SELECT
      COALESCE(SUM(status='approved'),0) AS approved, COALESCE(SUM(status='rejected'),0) AS rejected,
      COALESCE(SUM(status='pending'),0) AS pending, COUNT(*) AS sent
    FROM submissions WHERE created_at >= ? AND created_at < ?`, range.start, range.end);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = U.dayStart(Date.now(), i), end = U.dayStart(Date.now(), i - 1);
    const r = await D.get(`SELECT COUNT(*) AS sent, COALESCE(SUM(status='approved'),0) AS approved FROM submissions WHERE created_at >= ? AND created_at < ?`, start, end);
    days.push({ label: new Intl.DateTimeFormat('pt-BR', { timeZone: U.TZ, weekday: 'short', day: '2-digit' }).format(start).replace('.', ''), ...r });
  }
  const recent = await D.all(`SELECT s.id, s.handle, s.url, s.status, s.created_at, u.name AS user_name
    FROM submissions s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 8`);
  res.json({
    week: { label: weekLabel(range) }, goal: settings.weekly_goal, pendingTotal: pending,
    weekTotals: week, members: ranking.length, hitCount: ranking.filter((r) => r.hit).length,
    ranking, days, recent,
  });
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const range = U.weekRange();
  const users = await D.all(`SELECT u.id, u.name, u.username, u.role, u.active, u.must_change_password, u.weekly_goal, u.created_at, u.last_login_at,
      (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.status='approved' AND s.created_at >= ? AND s.created_at < ?) AS week_approved,
      (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.status='approved') AS total_approved,
      (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.status='pending') AS pending
    FROM users u WHERE u.role = 'member' ORDER BY u.active DESC, u.name COLLATE NOCASE`, range.start, range.end);
  res.json({ users, defaultGoal: (await getSettings()).weekly_goal });
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { name, username, password, weeklyGoal } = req.body || {};
  const nm = String(name || '').trim();
  const uname = String(username || '').trim().toLowerCase();
  if (!nm) return bad(res, 'Informe o nome.');
  if (!/^[a-z0-9._-]{3,30}$/.test(uname)) return bad(res, 'Usuário: 3 a 30 caracteres (letras minúsculas, números, ponto, traço).');
  if (await D.get('SELECT 1 FROM users WHERE username = ?', uname)) return bad(res, 'Esse usuário já existe.', 409);
  const pw = password ? String(password) : U.randomPassword();
  const pwErr = U.validatePassword(pw);
  if (pwErr) return bad(res, pwErr);
  const goal = weeklyGoal ? Math.max(1, Math.min(10000, parseInt(weeklyGoal, 10) || 0)) || null : null;
  const r = await D.run(`INSERT INTO users (name, username, password_hash, role, must_change_password, weekly_goal, created_at)
    VALUES (?, ?, ?, 'member', 1, ?, ?)`, nm.slice(0, 60), uname, U.hashPassword(pw), goal, Date.now());
  res.json({ ok: true, id: Number(r.lastInsertRowid), username: uname, password: pw });
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await D.get("SELECT * FROM users WHERE id = ? AND role = 'member'", id);
  if (!user) return bad(res, 'Conta não encontrada.', 404);
  const b = req.body || {};
  const out = { ok: true };
  if (b.name !== undefined) {
    const nm = String(b.name).trim();
    if (!nm) return bad(res, 'Nome vazio.');
    await D.run('UPDATE users SET name = ? WHERE id = ?', nm.slice(0, 60), id);
  }
  if (b.active !== undefined) {
    await D.run('UPDATE users SET active = ? WHERE id = ?', b.active ? 1 : 0, id);
    if (!b.active) await D.run('DELETE FROM sessions WHERE user_id = ?', id);
  }
  if (b.weeklyGoal !== undefined) {
    const g = b.weeklyGoal === null || b.weeklyGoal === '' ? null : Math.max(1, Math.min(10000, parseInt(b.weeklyGoal, 10) || 1));
    await D.run('UPDATE users SET weekly_goal = ? WHERE id = ?', g, id);
  }
  if (b.resetPassword) {
    const pw = typeof b.resetPassword === 'string' && b.resetPassword.length >= 6 ? b.resetPassword : U.randomPassword();
    await D.run('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', U.hashPassword(pw), id);
    await D.run('DELETE FROM sessions WHERE user_id = ?', id);
    out.password = pw;
    out.username = user.username;
  }
  res.json(out);
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = await D.run("DELETE FROM users WHERE id = ? AND role = 'member'", id);
  if (!r.changes) return bad(res, 'Conta não encontrada.', 404);
  res.json({ ok: true });
});

app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
  const userId = parseInt(req.query.user, 10) || null;
  const q = String(req.query.q || '').trim().toLowerCase().replace(/^@/, '');
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 40;
  const cond = [], args = [];
  if (status) { cond.push('s.status = ?'); args.push(status); }
  if (userId) { cond.push('s.user_id = ?'); args.push(userId); }
  if (q) { cond.push('(s.handle LIKE ? OR u.name LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const order = status === 'pending' ? 'ASC' : 'DESC';
  const items = await D.all(`SELECT s.id, s.url, s.handle, s.status, s.note, s.created_at, s.reviewed_at, u.id AS user_id, u.name AS user_name
    FROM submissions s JOIN users u ON u.id = s.user_id ${where}
    ORDER BY s.created_at ${order} LIMIT ${limit} OFFSET ${(page - 1) * limit}`, ...args);
  const total = (await D.get(`SELECT COUNT(*) AS c FROM submissions s JOIN users u ON u.id = s.user_id ${where}`, ...args)).c;
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

async function review(ids, status, note, adminId) {
  let n = 0;
  await D.tx(async (t) => {
    for (const id of ids) {
      n += (await t.run('UPDATE submissions SET status = ?, note = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?', status, note || null, Date.now(), adminId, id)).changes;
    }
  });
  return n;
}

app.post('/api/admin/submissions/review', requireAdmin, async (req, res) => {
  const { ids, status, note } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) return bad(res, 'Status inválido.');
  const list = (Array.isArray(ids) ? ids : [ids]).map((x) => parseInt(x, 10)).filter(Boolean).slice(0, 500);
  if (!list.length) return bad(res, 'Nenhum perfil selecionado.');
  const n = await review(list, status, status === 'pending' ? null : String(note || '').slice(0, 300), req.user.id);
  res.json({ ok: true, updated: n });
});

app.delete('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
  const r = await D.run('DELETE FROM submissions WHERE id = ?', parseInt(req.params.id, 10));
  if (!r.changes) return bad(res, 'Envio não encontrado.', 404);
  res.json({ ok: true });
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  res.json({ settings: (await getSettings()), tiers: await D.all('SELECT * FROM tiers ORDER BY target ASC') });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const b = req.body || {};
  if (b.weekly_goal !== undefined) {
    const g = parseInt(b.weekly_goal, 10);
    if (!(g >= 1 && g <= 10000)) return bad(res, 'Meta semanal inválida.');
    await setSetting('weekly_goal', g);
  }
  if (b.site_name !== undefined) await setSetting('site_name', String(b.site_name).trim().slice(0, 40) || 'Águia Dourada');
  if (b.message !== undefined) await setSetting('message', String(b.message).slice(0, 500));
  res.json({ ok: true, settings: (await getSettings()) });
});

app.post('/api/admin/tiers', requireAdmin, async (req, res) => {
  const { name, target, reward } = req.body || {};
  const t = parseInt(target, 10);
  if (!String(name || '').trim()) return bad(res, 'Dê um nome para a meta.');
  if (!(t >= 1 && t <= 10000)) return bad(res, 'Quantidade inválida.');
  await D.run('INSERT INTO tiers (name, target, reward, created_at) VALUES (?, ?, ?, ?)', String(name).trim().slice(0, 40), t, String(reward || '').trim().slice(0, 80), Date.now());
  res.json({ ok: true });
});

app.delete('/api/admin/tiers/:id', requireAdmin, async (req, res) => {
  await D.run('DELETE FROM tiers WHERE id = ?', parseInt(req.params.id, 10));
  res.json({ ok: true });
});

app.use('/api', (req, res) => bad(res, 'Rota não encontrada.', 404));

// ---------------- Páginas ----------------
const page = (file) => (req, res) => res.sendFile(path.join(PUBLIC, file));
app.get('/', async (req, res) => {
  if ((await needsSetup())) return res.redirect('/setup');
  if (!req.user) return res.redirect('/login');
  res.redirect(req.user.role === 'admin' ? '/admin' : '/painel');
});
app.get('/setup', async (req, res, next) => ((await needsSetup()) ? next() : res.redirect('/login')), page('setup.html'));
app.get('/login', async (req, res, next) => {
  if ((await needsSetup())) return res.redirect('/setup');
  if (req.user) return res.redirect(req.user.role === 'admin' ? '/admin' : '/painel');
  next();
}, page('login.html'));
app.get('/admin', async (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin') return res.redirect('/painel');
  next();
}, page('admin.html'));
app.get('/painel', async (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'member') return res.redirect('/admin');
  next();
}, page('painel.html'));

app.use(express.static(PUBLIC, { index: false, maxAge: IS_PROD ? '1h' : 0 }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) return bad(res, 'Erro interno. Tente novamente.', 500);
  res.status(500).send('Erro interno.');
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n  🦅  Sistema de Metas rodando na porta ${PORT} (banco: ${D.kind})`));
  console.log('  Conectando ao banco de dados...');
  ready().then(async () => {
    console.log('  ✔ Banco de dados conectado.');
    if (await needsSetup()) console.log(`  Primeiro acesso: abra /setup para criar a conta ADM.\n`);
  }).catch((e) => { console.error('  ✖ Falha ao conectar no banco de dados:', e && e.message ? e.message : e); });
}

module.exports = app;
