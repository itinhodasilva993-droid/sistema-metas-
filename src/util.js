'use strict';
const crypto = require('node:crypto');

// ---------- Senhas (scrypt, nativo do Node) ----------
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  try {
    const [algo, N, r, p, saltB64, hashB64] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const got = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (pw.length > 200) return 'Senha longa demais.';
  return null;
}

function randomPassword() {
  // Senha temporária legível (sem caracteres ambíguos)
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// ---------- Semana (segunda 00:00 até domingo 23:59, fuso de São Paulo) ----------
const TZ = process.env.TIMEZONE || 'America/Sao_Paulo';

function tzOffsetMinutes(date, timeZone = TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function localParts(ms, timeZone = TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return { y: +p.year, m: +p.month, d: +p.day, wd };
}

// Converte meia-noite local (y,m,d) para timestamp UTC
function localMidnightToUtc(y, m, d) {
  const guess = Date.UTC(y, m - 1, d);
  const off = tzOffsetMinutes(new Date(guess));
  let ms = guess - off * 60000;
  const off2 = tzOffsetMinutes(new Date(ms));
  if (off2 !== off) ms = guess - off2 * 60000;
  return ms;
}

function weekRange(ms = Date.now(), weeksBack = 0) {
  const { y, m, d, wd } = localParts(ms);
  const base = new Date(Date.UTC(y, m - 1, d - (wd - 1) - 7 * weeksBack));
  const start = localMidnightToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  const endD = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 7));
  const end = localMidnightToUtc(endD.getUTCFullYear(), endD.getUTCMonth() + 1, endD.getUTCDate());
  return { start, end };
}

function dayStart(ms = Date.now(), daysBack = 0) {
  const { y, m, d } = localParts(ms);
  const base = new Date(Date.UTC(y, m - 1, d - daysBack));
  return localMidnightToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

// ---------- Instagram ----------
const RESERVED = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv', 'direct', 'about', 'legal', 'developer']);

/**
 * Aceita: https://www.instagram.com/usuario/, instagram.com/usuario?igsh=..., @usuario, usuario
 * Retorna { handle, url } ou { error }
 */
function parseInstagram(input) {
  let s = String(input || '').trim();
  if (!s) return { error: 'Link vazio.' };
  let handle = null;
  if (/instagram\.com|instagr\.am/i.test(s)) {
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    let u;
    try { u = new URL(s); } catch { return { error: 'Link inválido.' }; }
    if (!/(^|\.)instagram\.com$|(^|\.)instagr\.am$/i.test(u.hostname)) return { error: 'O link precisa ser do Instagram.' };
    const seg = u.pathname.split('/').filter(Boolean);
    if (!seg.length) return { error: 'Link sem nome de perfil.' };
    if (RESERVED.has(seg[0].toLowerCase())) return { error: 'Envie o link do PERFIL (não de post, reels ou stories).' };
    handle = seg[0];
  } else {
    handle = s.replace(/^@/, '');
  }
  handle = handle.trim().toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle) || /^\.|\.$/.test(handle) || handle.includes('..')) {
    return { error: 'Nome de perfil inválido.' };
  }
  return { handle, url: `https://www.instagram.com/${handle}/` };
}

module.exports = {
  hashPassword, verifyPassword, validatePassword, randomPassword,
  weekRange, dayStart, localParts, parseInstagram, TZ,
};
