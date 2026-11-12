// SwimWithSmile API на Cloudflare Pages Functions + D1.
// POST /exec            { action, payload, token } → { ok, data } (същото като Apps Script)
// GET  /exec?ics=КЛЮЧ   → абонамент за Google Calendar
// POST /exec?import=1   → еднократен пренос от Google Sheet (само при празна база)
import { createCore } from './_lib/core.js';
import { parseIcs } from './_lib/ics.js';

const SCHEMA = createCore({ store: {}, ops: [], props: {} }).SCHEMA;
const TABLES = Object.keys(SCHEMA);
const CAL_TTL = 10 * 60 * 1000;      // календарът се обновява най-много на 10 мин
const CAL_ACTIONS = { today: 1, month: 1, calendarEvents: 1, calendarSettings: 1 };

// Кеш в паметта на isolate-а: таблиците + версията им в D1 (Meta.ver)
const MEM = { ver: null, tables: null, props: null, schemaOk: false };

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
const q = (n) => '"' + n + '"';

async function ensureSchema(db) {
  if (MEM.schemaOk) return;
  const stmts = TABLES.map((t) => db.prepare(`CREATE TABLE IF NOT EXISTS ${q(t)} (${SCHEMA[t].map((c) => c === 'id' ? '"id" TEXT PRIMARY KEY' : `${q(c)} TEXT NOT NULL DEFAULT ''`).join(', ')})`));
  stmts.push(db.prepare('CREATE TABLE IF NOT EXISTS "Props" ("k" TEXT PRIMARY KEY, "v" TEXT)'));
  stmts.push(db.prepare('CREATE TABLE IF NOT EXISTS "Meta" ("k" TEXT PRIMARY KEY, "v" TEXT)'));
  stmts.push(db.prepare('CREATE TABLE IF NOT EXISTS "CalCache" ("k" TEXT PRIMARY KEY, "fetchedAt" TEXT, "events" TEXT, "error" TEXT, "url" TEXT)'));
  stmts.push(db.prepare('CREATE INDEX IF NOT EXISTS "ix_part_session" ON "Participants" ("sessionId")'));
  await db.batch(stmts);
  // нови колони (при промяна на SCHEMA)
  const infos = await db.batch(TABLES.map((t) => db.prepare(`PRAGMA table_info(${q(t)})`)));
  const add = [];
  infos.forEach((r, i) => {
    const have = new Set((r.results || []).map((x) => x.name));
    SCHEMA[TABLES[i]].forEach((c) => { if (!have.has(c)) add.push(db.prepare(`ALTER TABLE ${q(TABLES[i])} ADD COLUMN ${q(c)} TEXT NOT NULL DEFAULT ''`)); });
  });
  if (add.length) { await db.batch(add); MEM.ver = null; }
  MEM.schemaOk = true;
}

async function load(db) {
  const row = await db.prepare('SELECT v FROM "Meta" WHERE k = \'ver\'').first();
  const ver = row ? row.v : '0';
  if (MEM.tables && MEM.ver === ver) return;
  const res = await db.batch(TABLES.map((t) => db.prepare(`SELECT * FROM ${q(t)} ORDER BY rowid`)).concat([db.prepare('SELECT k, v FROM "Props"')]));
  const tables = {};
  TABLES.forEach((t, i) => { tables[t] = res[i].results || []; });
  const props = {};
  (res[TABLES.length].results || []).forEach((r) => { props[r.k] = r.v; });
  MEM.tables = tables; MEM.props = props; MEM.ver = ver;
}

// Записите от заявката → D1 (на порции, всяка порция е транзакция)
async function flush(db, ops, store, props) {
  if (!ops.length) return;
  const st = [];
  for (const o of ops) {
    if (o.op === 'insert') {
      const cols = SCHEMA[o.table];
      st.push(db.prepare(`INSERT OR REPLACE INTO ${q(o.table)} (${cols.map(q).join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((c) => o.row[c] ?? '')));
    } else if (o.op === 'update') {
      const ks = Object.keys(o.set);
      st.push(db.prepare(`UPDATE ${q(o.table)} SET ${ks.map((k) => q(k) + ' = ?').join(', ')} WHERE id = ?`).bind(...ks.map((k) => o.set[k]), o.id));
    } else if (o.op === 'delete') {
      for (let i = 0; i < o.ids.length; i += 90) {
        const part = o.ids.slice(i, i + 90);
        st.push(db.prepare(`DELETE FROM ${q(o.table)} WHERE id IN (${part.map(() => '?').join(',')})`).bind(...part));
      }
    } else if (o.op === 'prop') {
      st.push(db.prepare('INSERT OR REPLACE INTO "Props" (k, v) VALUES (?, ?)').bind(o.k, o.v));
    }
  }
  const ver = String(Date.now()) + Math.floor(Math.random() * 1e6);
  st.push(db.prepare('INSERT OR REPLACE INTO "Meta" (k, v) VALUES (\'ver\', ?)').bind(ver));
  for (let i = 0; i < st.length; i += 400) await db.batch(st.slice(i, i + 400));
  // паметта вече отговаря на базата
  MEM.tables = store; MEM.props = props; MEM.ver = ver;
}

/* ---------- Google Calendar (таен iCal адрес) ---------- */
function ymdOff(days) {
  const d = new Date(Date.now() + 3 * 3600000 + days * 86400000);
  return d.toISOString().slice(0, 10);
}
async function refreshCal(db, key, url) {
  let events = null, error = null;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'SwimWithSmile/1.0' }, cf: { cacheTtl: 0 } });
    if (!r.ok) throw new Error(r.status === 404 ? 'Адресът не е намерен (404) — копирай го наново от Google Calendar.' : 'Google Calendar върна грешка ' + r.status);
    const text = await r.text();
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('Това не е iCal адрес — трябва „Таен адрес във формат iCal".');
    events = parseIcs(text, ymdOff(-35), ymdOff(150));
  } catch (e) { error = String(e.message || e).slice(0, 300); }
  const now = new Date().toISOString();
  if (events) await db.prepare('INSERT OR REPLACE INTO "CalCache" (k, fetchedAt, events, error, url) VALUES (?, ?, ?, NULL, ?)').bind(key, now, JSON.stringify(events), url).run();
  else await db.prepare('INSERT INTO "CalCache" (k, fetchedAt, events, error, url) VALUES (?, ?, \'[]\', ?, ?) ON CONFLICT(k) DO UPDATE SET error = excluded.error, url = excluded.url').bind(key, now, error, url).run();
  return { events: events || [], fetchedAt: now, error, url };
}
async function loadCalCache(db) {
  const r = await db.prepare('SELECT k, fetchedAt, events, error, url FROM "CalCache"').all();
  const m = {};
  (r.results || []).forEach((x) => { let ev = []; try { ev = JSON.parse(x.events || '[]'); } catch {} m[x.k] = { events: ev, fetchedAt: x.fetchedAt, error: x.error, url: x.url }; });
  return m;
}
// Треньорите от отбора на този токен, които са свързали календар
function teamCalCoaches(store, token) {
  const id = String(token || '').slice(0, String(token || '').lastIndexOf('.'));
  const me = (store.Coaches || []).find((c) => c.id === id);
  if (!me) return [];
  const seen = {};
  return (store.Coaches || []).filter((c) => c.teamId === me.teamId && /^(true|1|да)$/i.test(c.active) && /^true$/i.test(c.calendarOn) && /^https?:\/\//i.test(c.icsUrl || ''))
    .map((c) => ({ key: String(c.email || '').trim().toLowerCase(), url: c.icsUrl }))
    .filter((x) => x.key && !seen[x.key] && (seen[x.key] = 1));
}

/* ---------- Имейли (Brevo) след заявката ---------- */
async function sendOutbox(env, db) {
  if (!env.BREVO_KEY || !env.BREVO_SENDER) return;
  const r = await db.prepare('SELECT * FROM "Outbox" WHERE status = \'pending\' LIMIT 20').all();
  for (const row of r.results || []) {
    let status = 'sent', error = '';
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'api-key': env.BREVO_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: env.BREVO_NAME || 'SwimWithSmile', email: env.BREVO_SENDER }, to: [{ email: row.toEmail, name: row.toName || undefined }], subject: row.subject,
          htmlContent: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0B2545;line-height:1.5"><div style="background:linear-gradient(135deg,#46D6F7,#1F5FD6);color:#fff;padding:18px 22px;border-radius:16px 16px 0 0;font-weight:800;font-size:18px">🌊 SwimWithSmile</div><div style="background:#fff;border:1px solid #E3ECFA;border-top:0;padding:22px;border-radius:0 0 16px 16px">' + row.html + '</div></div>' }),
      });
      if (!res.ok) { status = 'error'; error = 'HTTP ' + res.status; }
    } catch (e) { status = 'error'; error = String(e.message || e).slice(0, 200); }
    await db.prepare('UPDATE "Outbox" SET status = ?, sentAt = ?, error = ? WHERE id = ?').bind(status, new Date().toISOString(), error, row.id).run();
  }
  MEM.ver = null; // Outbox е сменен извън паметта
}

/* ---------- Еднократен пренос от Google Sheet ---------- */
async function doImport(env, db, body) {
  const cnt = await db.prepare('SELECT COUNT(*) AS n FROM "Teams"').first();
  if (cnt && cnt.n > 0 && !(env.IMPORT_KEY && body.key === env.IMPORT_KEY)) return json({ ok: false, status: 403, message: 'Базата вече има данни — преносът е заключен.' }, 403);
  const tables = body.tables || {}, props = body.props || {};
  const st = [];
  for (const t of TABLES) {
    const cols = SCHEMA[t];
    for (const r of tables[t] || []) {
      if (!r || r.id === undefined || r.id === null || r.id === '') continue;
      st.push(db.prepare(`INSERT OR REPLACE INTO ${q(t)} (${cols.map(q).join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((c) => r[c] === undefined || r[c] === null ? '' : String(r[c]))));
    }
  }
  for (const k of Object.keys(props)) if (/^(PEPPER|LEGACY_TEAM_ID)$/.test(k) && props[k]) st.push(db.prepare('INSERT OR REPLACE INTO "Props" (k, v) VALUES (?, ?)').bind(k, String(props[k])));
  st.push(db.prepare('INSERT OR REPLACE INTO "Meta" (k, v) VALUES (\'ver\', ?)').bind('imp' + Date.now()));
  for (let i = 0; i < st.length; i += 400) await db.batch(st.slice(i, i + 400));
  MEM.ver = null;
  // довършване: умения и ключ за календара на всеки отбор
  await load(db);
  const store = {}; TABLES.forEach((t) => { store[t] = MEM.tables[t].slice(); });
  const ops = [], p = { ...MEM.props };
  const core = createCore({ store, ops, props: p, env });
  store.Teams.forEach((t) => {
    if (!store.Skills.some((s) => s.teamId === t.id)) core.seedSkills_(t.id);
    if (!t.icsKey) core.updateById_('Teams', t.id, { icsKey: core.newKey_() });
  });
  await flush(db, ops, store, p);
  const counts = {}; TABLES.forEach((t) => { counts[t] = (MEM.tables[t] || []).length; });
  return json({ ok: true, data: { imported: counts } });
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (!db) return json({ ok: false, status: 500, message: 'Липсва D1 базата (binding „DB") в Cloudflare → Settings → Bindings.' }, 500);
  const url = new URL(request.url);
  const origin = env.APP_URL || url.origin;

  try {
    await ensureSchema(db);

    if (request.method === 'GET') {
      const key = url.searchParams.get('ics');
      if (!key) return new Response('SwimWithSmile API е активно.', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });
      await load(db);
      const store = {}; TABLES.forEach((t) => { store[t] = MEM.tables[t]; });
      const core = createCore({ store, ops: [], props: { ...MEM.props }, env, origin });
      try {
        return new Response(core.buildIcs_(key, url.searchParams.get('coach')), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'max-age=600' } });
      } catch (e) { return new Response('Грешка: ' + e.message, { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
    }

    let body;
    try { body = JSON.parse(await request.text() || '{}'); } catch { return json({ ok: false, status: 400, message: 'Невалидна заявка.' }); }
    if (url.searchParams.has('import')) return await doImport(env, db, body);

    await load(db);
    const store = {}; TABLES.forEach((t) => { store[t] = MEM.tables[t].slice(); });
    const props = { ...MEM.props };
    const ops = [], calDirty = {};

    // Календар: от кеша; ако е стар — обновяваме (fresh → веднага, иначе във фона)
    let calcache = {};
    const action = body.action;
    if (CAL_ACTIONS[action]) {
      calcache = await loadCalCache(db);
      const fresh = body.payload && body.payload.fresh;
      const need = teamCalCoaches(store, body.token).filter((c) => {
        const x = calcache[c.key];
        return fresh || !x || x.url !== c.url || !x.fetchedAt || Date.now() - Date.parse(x.fetchedAt) > CAL_TTL;
      });
      if (need.length) {
        const missing = need.filter((c) => fresh || !calcache[c.key] || calcache[c.key].url !== c.url);
        const later = need.filter((c) => !missing.includes(c));
        for (const c of missing) calcache[c.key] = await refreshCal(db, c.key, c.url);
        if (later.length) context.waitUntil(Promise.all(later.map((c) => refreshCal(db, c.key, c.url))).catch(() => {}));
      }
    }

    const core = createCore({ store, ops, props, env, calcache, calDirty, origin });
    let out;
    try { out = core.handle_(body); }
    catch (e) { MEM.ver = null; return json({ ok: false, status: 500, message: 'Сървърна грешка: ' + (e && e.message ? e.message : e) }); }

    if (ops.length) {
      try { await flush(db, ops, store, props); }
      catch (e) { MEM.ver = null; return json({ ok: false, status: 503, message: 'Не успях да запиша — опитай пак. (' + (e.message || e) + ')' }); }
      if (ops.some((o) => o.table === 'Outbox' && o.op === 'insert')) context.waitUntil(sendOutbox(env, db).catch(() => {}));
    }
    // Нов iCal адрес → изтегляме веднага, за да се види „свързан"
    const keys = Object.keys(calDirty);
    if (keys.length) {
      for (const k of keys) {
        const c = store.Coaches.find((x) => String(x.email || '').trim().toLowerCase() === k && x.icsUrl);
        if (c) await refreshCal(db, k, c.icsUrl);
      }
    }
    return json(out);
  } catch (e) {
    MEM.ver = null; MEM.schemaOk = false;
    return json({ ok: false, status: 500, message: 'Сървърна грешка: ' + (e && e.message ? e.message : e) }, 200);
  }
}
