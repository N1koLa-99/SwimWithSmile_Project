/* ============================================================
   Cloudflare версия — замества услугите на Google.
   Този файл се слепва СЛЕД apps-script/Code.gs (tools/build-core.mjs);
   функциите с еднакви имена тук печелят (по-късната дефиниция важи).
   Данните са в паметта (заредени от D1 преди заявката); всеки запис
   се добавя в OPS и се записва в D1 наведнъж след заявката.
   ============================================================ */

/* ---------- Данни: таблиците в паметта ---------- */
function readObjects_(name) {
  if (!STORE[name]) STORE[name] = [];
  return STORE[name];
}
function headers_(name) { return SCHEMA[name].slice(); }
function sh_(name) { throw new Error('Няма Google Sheet в тази версия (' + name + ').'); }
function invalidate_(name) { _SC = {}; }
function resetCache_() { _SC = {}; }
function commit_() {}
function ensureSchema_() {}

function cleanRow_(name, obj) {
  var o = {};
  SCHEMA[name].forEach(function (h) { o[h] = (obj[h] === undefined || obj[h] === null) ? '' : String(obj[h]); });
  return o;
}
function appendObjects_(name, list) {
  if (!list || !list.length) return;
  var arr = readObjects_(name);
  list.forEach(function (obj) {
    var row = cleanRow_(name, obj);
    arr.push(row);
    OPS.push({ op: 'insert', table: name, row: row });
  });
  _SC = {};
}
function appendObject_(name, obj) { appendObjects_(name, [obj]); return obj; }

function updateById_(name, id, patch) {
  var arr = readObjects_(name);
  for (var i = 0; i < arr.length; i++) {
    if (String(arr[i].id) === String(id)) {
      var next = {}, changed = {};
      Object.keys(arr[i]).forEach(function (k) { next[k] = arr[i][k]; });
      Object.keys(patch).forEach(function (k) {
        if (SCHEMA[name].indexOf(k) < 0 || k === 'id') return;
        var v = patch[k] === null || patch[k] === undefined ? '' : String(patch[k]);
        next[k] = v; changed[k] = v;
      });
      arr[i] = next; // нов обект — не пипаме споделения кеш
      if (Object.keys(changed).length) OPS.push({ op: 'update', table: name, id: String(id), set: changed });
      _SC = {};
      return true;
    }
  }
  return false;
}

function deleteWhere_(name, pred) {
  var arr = readObjects_(name), keep = [], ids = [];
  arr.forEach(function (o) { if (pred(o)) ids.push(String(o.id)); else keep.push(o); });
  if (!ids.length) return 0;
  STORE[name] = keep;
  OPS.push({ op: 'delete', table: name, ids: ids });
  _SC = {};
  return ids.length;
}
function deleteById_(name, id) { return deleteWhere_(name, function (o) { return String(o.id) === String(id); }) > 0; }

/* ---------- Масово присъствие / серии (без директен достъп до таблицата) ---------- */
function bulkParticipants_(sid, want, field, extra) {
  var seen = {};
  readObjects_('Participants').slice().forEach(function (pt) {
    if (String(pt.sessionId) === String(sid) && want.hasOwnProperty(String(pt.childId))) {
      var patch = { updatedAt: nowIso_() }; patch[field] = want[String(pt.childId)];
      updateById_('Participants', pt.id, patch);
      seen[String(pt.childId)] = 1;
    }
  });
  var add = Object.keys(want).filter(function (cid) { return !seen[cid]; }).map(function (cid) {
    var row = { id: Utilities.getUuid(), sessionId: sid, childId: cid, attended: '', updatedAt: nowIso_() };
    row[field] = want[cid];
    return row;
  });
  if (add.length) appendObjects_('Participants', add);
}
function actMarkAttendance_(p) {
  var sid = p.sessionId;
  mustSession_(sid, p._teamId);
  var kids = childMap_(), want = {};
  (p.items || []).forEach(function (it) {
    var c = kids[it.childId];
    if (c && String(c.teamId) === p._teamId) want[it.childId] = it.attended === null ? '' : (it.attended ? 'TRUE' : 'FALSE');
  });
  bulkParticipants_(sid, want, 'attended');
  return D(null);
}
function actUpdateSets_(p) {
  var sid = p.sessionId;
  mustSession_(sid, p._teamId);
  var kids = childMap_(), want = {};
  (p.items || []).forEach(function (it) {
    var c = kids[it.childId];
    if (!c || String(c.teamId) !== p._teamId) return;
    var v = it.sets == null ? '' : String(it.sets).slice(0, 300);
    if (v) { var ps = parseSets_(v); if (ps.bad.length) throw new Denied_(400, 'Не разбирам „' + ps.bad[0] + '". Пиши така: 4x6, 5x8'); }
    want[it.childId] = v;
  });
  bulkParticipants_(sid, want, 'sets');
  return D(null);
}

/* ---------- Имейли: само в опашката; изпращат се след заявката ---------- */
function sendOutboxRow_(id) { return false; }
function processOutbox() {}
function notifyStatus_() {
  return { enabled: !!(ENV.BREVO_KEY && ENV.BREVO_SENDER), sender: ENV.BREVO_SENDER || null };
}
function appLinkHtml_(label, hash) {
  var url = ENV.APP_URL || ORIGIN;
  if (!url) return '';
  return '<p style="margin:22px 0"><a href="' + h_(url + '/' + hash) + '" style="background:#1F73E0;color:#fff;padding:12px 22px;border-radius:99px;text-decoration:none;font-weight:700">' + h_(label) + '</a></p>';
}

/* ---------- Абонамент (ICS) ---------- */
function actCalendarFeed_(p) {
  var t = findById_('Teams', p._teamId);
  if (!t) return E(404, 'Отборът не е намерен.');
  var key = t.icsKey;
  if (!key || p.regenerate) {
    if (p.regenerate) mustOwner_(p);
    key = newKey_();
    updateById_('Teams', t.id, { icsKey: key });
  }
  return D({ key: key, coachId: p._coachId, serviceUrl: ORIGIN + '/exec' });
}

/* ============================================================
   Google Calendar чрез ТАЙНИЯ iCal адрес на всеки треньор
   (Google Calendar → Настройки → моят календар → „Таен адрес във формат iCal").
   Изтегля се и се разчита извън заявката (exec.js); тук идват готовите
   събития от кеша (CALCACHE[coachId] = { events, fetchedAt, error }).
   ============================================================ */
function calKey_(coach) { return String(coach.email || '').trim().toLowerCase(); }
function scriptOwnerEmail_() { return ''; }
function isScriptOwner_(coach) { return false; }
function coachCalOn_(coach) { return nb_(coach.calendarOn) && /^https?:\/\//i.test(String(coach.icsUrl || '')); }
function coachCalendar_(coach) { return null; }

function rawCoachEvents_(coach, start, end) {
  if (!coachCalOn_(coach)) return [];
  var c = CALCACHE[calKey_(coach)];
  if (!c || !c.events) return [];
  var from = fmtYmdUtc_(start), to = fmtYmdUtc_(end);
  return c.events.filter(function (e) {
    var last = e.endDate || e.date;
    return last >= from && e.date < to;
  }).map(function (e) { return JSON.parse(JSON.stringify(e)); });
}
// Датите от CalendarEvents/today са „по обед/полунощ" в UTC на Worker-а
function fmtYmdUtc_(d) { return d.getUTCFullYear() + '-' + pad2_(d.getUTCMonth() + 1) + '-' + pad2_(d.getUTCDate()); }

function actCalendarSettings_(p) {
  var me = findById_('Coaches', p._coachId);
  var t = findById_('Teams', p._teamId) || {};
  var c = CALCACHE[calKey_(me)] || null;
  var status = 'off';
  if (coachCalOn_(me)) status = c && c.error ? 'error' : (c && c.fetchedAt ? 'ok' : 'pending');
  return D({
    myEmail: me.email, calendarOn: coachCalOn_(me), icsUrl: me.icsUrl ? maskUrl_(me.icsUrl) : '',
    hasUrl: !!me.icsUrl, status: status, error: c && c.error ? c.error : null,
    lastSync: c && c.fetchedAt ? c.fetchedAt : null, eventCount: c && c.events ? c.events.length : 0,
    hideWords: String(t.calendarHide || ''), canEditKeywords: p._role === 'owner',
    coaches: activeCoaches_(p._teamId).map(function (x) { return { id: x.id, fullName: x.fullName, on: coachCalOn_(x) }; })
  });
}
function maskUrl_(u) { u = String(u); return u.length > 60 ? u.slice(0, 48) + '…' + u.slice(-12) : u; }

function actUpdateCalendarSettings_(p) {
  var d = p.data || {};
  var me = findById_('Coaches', p._coachId);
  var patch = {};
  if (d.icsUrl !== undefined) {
    var u = String(d.icsUrl || '').trim();
    if (u && !(ENV.DEV ? /^https?:\/\/[^\s]+$/i : /^https:\/\/[^\s]+$/i).test(u.replace(/^webcal:\/\//i, 'https://')))
      return E(400, 'Постави адреса, който започва с https:// (Google Calendar → Настройки → „Таен адрес във формат iCal").');
    patch.icsUrl = u.replace(/^webcal:\/\//i, 'https://');
    if (u) patch.calendarOn = 'TRUE';
    CAL_DIRTY[calKey_(me)] = 1;
  }
  if (d.calendarOn !== undefined) patch.calendarOn = d.calendarOn ? 'TRUE' : 'FALSE';
  if (Object.keys(patch).length) {
    // Един човек → един календар във всички негови отбори
    coachRowsByEmail_(me.email).forEach(function (c) { updateById_('Coaches', c.id, patch); });
  }
  if (d.hideWords !== undefined) {
    mustOwner_(p);
    var kw = String(d.hideWords || '').split(',').map(function (x) { return x.trim(); }).filter(String).slice(0, 30).join(', ');
    updateById_('Teams', p._teamId, { calendarHide: kw });
  }
  return D(null);
}
