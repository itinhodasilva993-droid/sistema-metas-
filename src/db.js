'use strict';
/**
 * Camada de banco de dados com duas opções:
 *  - Local (padrão): SQLite embutido no Node (node:sqlite), arquivo em ./data/sistema.db
 *  - Nuvem: Turso (libSQL, compatível com SQLite) quando TURSO_DATABASE_URL estiver definido.
 *    Ideal para hospedagens grátis que apagam os arquivos ao reiniciar (ex.: Render free).
 *
 * API única e assíncrona: D.get(sql, ...args), D.all(sql, ...args), D.run(sql, ...args), D.tx(async (t) => {...})
 */
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','member')),
    active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    weekly_goal INTEGER,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    handle TEXT NOT NULL COLLATE NOCASE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    note TEXT,
    created_at INTEGER NOT NULL,
    reviewed_at INTEGER,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_submissions_handle ON submissions(handle)',
  'CREATE INDEX IF NOT EXISTS ix_submissions_user_created ON submissions(user_id, created_at)',
  'CREATE INDEX IF NOT EXISTS ix_submissions_status ON submissions(status, created_at)',
  `CREATE TABLE IF NOT EXISTS tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target INTEGER NOT NULL,
    reward TEXT,
    created_at INTEGER NOT NULL
  )`,
  'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)',
];

const DEFAULT_SETTINGS = {
  weekly_goal: '140',
  site_name: 'Águia Dourada',
  message: 'Bem-vinda! Envie os perfis do Instagram e acompanhe sua meta da semana. Bora bater os 140! 🦅',
};

const norm = (v) => (typeof v === 'bigint' ? Number(v) : v);
const normRow = (r) => {
  if (!r) return r;
  const o = {};
  for (const k of Object.keys(r)) o[k] = norm(r[k]);
  return o;
};

// ---------------- Backend local: node:sqlite ----------------
function localBackend() {
  const { DatabaseSync } = require('node:sqlite');
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = process.env.DB_FILE || path.join(DATA_DIR, 'sistema.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const cache = new Map();
  const stmt = (sql) => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  const api = {
    kind: 'sqlite-local',
    async get(sql, ...a) { return normRow(stmt(sql).get(...a)); },
    async all(sql, ...a) { return stmt(sql).all(...a).map(normRow); },
    async run(sql, ...a) { const r = stmt(sql).run(...a); return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }; },
    async exec(sql) { db.exec(sql); },
    // Node executa tudo numa única thread: como as operações são síncronas por baixo,
    // a transação inteira roda sem intercalar com outras requisições.
    async tx(fn) {
      db.exec('BEGIN');
      try { const r = await fn(api); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
  return api;
}

// ---------------- Backend nuvem: Turso / libSQL ----------------
function tursoBackend() {
  const url = process.env.TURSO_DATABASE_URL;
  // file: só para testes locais; em produção usa o cliente web (sem binários nativos)
  const { createClient } = url.startsWith('file:') ? require('@libsql/client') : require('@libsql/client/web');
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const wrap = (ex) => ({
    async get(sql, ...a) { const r = await ex.execute({ sql, args: a }); return normRow(r.rows[0] ? { ...r.rows[0] } : undefined); },
    async all(sql, ...a) { const r = await ex.execute({ sql, args: a }); return r.rows.map((x) => normRow({ ...x })); },
    async run(sql, ...a) { const r = await ex.execute({ sql, args: a }); return { changes: Number(r.rowsAffected), lastInsertRowid: Number(r.lastInsertRowid ?? 0) }; },
  });
  const api = {
    kind: 'turso',
    ...wrap(client),
    async exec(sql) { await client.executeMultiple(sql); },
    async tx(fn) {
      const t = await client.transaction('write');
      try { const r = await fn(wrap(t)); await t.commit(); return r; } catch (e) { try { await t.rollback(); } catch { /* */ } throw e; } finally { t.close(); }
    },
  };
  return api;
}

const D = process.env.TURSO_DATABASE_URL ? tursoBackend() : localBackend();

let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const s of SCHEMA) await D.run(s);
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) await D.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', k, v);
      const c = await D.get('SELECT COUNT(*) AS c FROM tiers');
      const seeded = await D.get("SELECT value FROM settings WHERE key = 'tiers_seeded'");
      if (c.c === 0 && !seeded) {
        const now = Date.now();
        await D.run('INSERT INTO tiers (name, target, reward, created_at) VALUES (?, ?, ?, ?)', 'Meta Prata', 170, 'Bônus prata', now);
        await D.run('INSERT INTO tiers (name, target, reward, created_at) VALUES (?, ?, ?, ?)', 'Meta Ouro', 200, 'Bônus ouro', now);
      }
      await D.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('tiers_seeded', '1')");
    })();
  }
  return readyPromise;
}

async function getSettings() {
  const rows = await D.all('SELECT key, value FROM settings');
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  s.weekly_goal = Math.max(1, parseInt(s.weekly_goal, 10) || 140);
  delete s.tiers_seeded;
  return s;
}

async function setSetting(key, value) {
  await D.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
}

module.exports = { D, ready, getSettings, setSetting };
