// Малък разчитач на iCal (.ics) за тайния адрес на Google Calendar.
// Поддържа: часови зони (TZID / UTC „Z" / цял ден), повторения (RRULE: DAILY,
// WEEKLY+BYDAY, MONTHLY+BYMONTHDAY/BYDAY, YEARLY; INTERVAL, COUNT, UNTIL),
// EXDATE, RECURRENCE-ID (променени единични срещи) и STATUS:CANCELLED.
// Връща събитията в местно време на София, в прозорец [from, to].
import { partsIn } from './util.js';

const TZ = 'Europe/Sofia';
const DAY = 86400000;
const DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const pad = (n) => String(n).padStart(2, '0');

function unfold(text) { return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, ''); }
function unesc(v) { return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }

// "20261112T170000" → наивни милисекунди (без зона)
function naive(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/.exec(v);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
// София (ЕС правило): лятно часово време от последната неделя на март 01:00 UTC
// до последната неделя на октомври 01:00 UTC. Без Intl — много по-бързо.
const dstCache = {};
function lastSunUtc(y, m) { const d = new Date(Date.UTC(y, m + 1, 0)); return Date.UTC(y, m, d.getUTCDate() - d.getUTCDay(), 1); }
function sofiaOffset(utcMs) {
  const y = new Date(utcMs).getUTCFullYear();
  const r = dstCache[y] || (dstCache[y] = [lastSunUtc(y, 2), lastSunUtc(y, 9)]);
  return (utcMs >= r[0] && utcMs < r[1] ? 3 : 2) * 3600000;
}
// Отместване на зоната (мс) в даден UTC момент
function offset(tz, utcMs) {
  if (tz === TZ) return sofiaOffset(utcMs);
  const p = partsIn(new Date(utcMs), tz);
  return Date.UTC(+p.yyyy, +p.MM - 1, +p.dd, +p.HH, +p.mm, +p.ss) - Math.floor(utcMs / 1000) * 1000;
}
// наивно време в зона tz → наивно време в София
function toSofia(nv, tz, isUtc) {
  if (!isUtc && (!tz || tz === TZ)) return nv;
  let utc;
  if (isUtc) utc = nv;
  else { utc = nv - offset(tz, nv); utc = nv - offset(tz, utc); }
  return utc + offset(TZ, utc);
}
const ymd = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const hms = (ms) => { const d = new Date(ms); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`; };

function prop(line) {
  // NAME;PARAM=X;PARAM2=Y:value
  const ci = line.indexOf(':');
  if (ci < 0) return null;
  const head = line.slice(0, ci), value = line.slice(ci + 1);
  const parts = head.split(';');
  const params = {};
  for (let i = 1; i < parts.length; i++) { const [k, v] = parts[i].split('='); params[k.toUpperCase()] = (v || '').replace(/^"|"$/g, ''); }
  return { name: parts[0].toUpperCase(), params, value };
}
function dt(p) {
  if (!p) return null;
  const allDay = p.params.VALUE === 'DATE' || /^\d{8}$/.test(p.value);
  return { nv: naive(p.value), tz: p.params.TZID || null, utc: /Z$/.test(p.value), allDay };
}

function parseRule(s) {
  const r = {};
  s.split(';').forEach((kv) => { const [k, v] = kv.split('='); r[k.toUpperCase()] = v; });
  return {
    freq: r.FREQ, interval: Math.max(1, +(r.INTERVAL || 1)), count: r.COUNT ? +r.COUNT : null,
    until: r.UNTIL ? { nv: naive(r.UNTIL), utc: /Z$/.test(r.UNTIL) } : null,
    byday: r.BYDAY ? r.BYDAY.split(',').map((x) => { const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(x); return m ? { n: m[1] ? +m[1] : 0, d: DOW[m[2]] } : null; }).filter(Boolean) : null,
    bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null,
  };
}

// n-ти ден от седмицата в месеца (n<0 → от края)
function nthDow(y, m, dow, n) {
  if (n > 0) { const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); const day = 1 + ((dow - first + 7) % 7) + (n - 1) * 7; const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return day <= dim ? day : null; }
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); const last = new Date(Date.UTC(y, m, dim)).getUTCDay();
  const day = dim - ((last - dow + 7) % 7) + (n + 1) * 7; return day >= 1 ? day : null;
}

// Всички начала (наивни, в зоната на събитието) до „toNv"
function expand(start, rule, toNv, limit = 3000, fromNv = 0) {
  const out = [];
  const timeOfDay = start % DAY;
  const until = rule.until ? (rule.until.utc ? rule.until.nv + 3 * 3600000 : rule.until.nv) : Infinity;
  const end = Math.min(toNv, until);
  let produced = 0;
  const push = (t) => { if (t < start) return true; if (t > end) return false; produced++; out.push(t); return !(rule.count && produced >= rule.count) && out.length < limit; };
  const s = new Date(start), y0 = s.getUTCFullYear(), m0 = s.getUTCMonth(), d0 = s.getUTCDate();
  let guard = 0;
  if (rule.freq === 'DAILY') {
    const skip = rule.count ? 0 : Math.max(0, Math.floor((fromNv - start) / (rule.interval * DAY)) - 1);
    for (let t = start + skip * rule.interval * DAY; guard++ < 20000; t += rule.interval * DAY) if (!push(t)) break;
  } else if (rule.freq === 'WEEKLY') {
    const days = rule.byday && rule.byday.length ? rule.byday.map((x) => x.d).sort() : [s.getUTCDay()];
    // начало на седмицата (понеделник) на DTSTART
    const wk0 = start - timeOfDay - ((s.getUTCDay() + 6) % 7) * DAY;
    // без COUNT → прескачаме направо до прозореца
    const skip = rule.count ? 0 : Math.max(0, Math.floor((fromNv - wk0) / (7 * DAY * rule.interval)) - 1) * rule.interval;
    outer: for (let w = skip; guard++ < 5000; w += rule.interval) {
      for (const d of days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))) {
        const t = wk0 + w * 7 * DAY + ((d + 6) % 7) * DAY + timeOfDay;
        if (t > end) break outer;
        if (!push(t)) break outer;
      }
    }
  } else if (rule.freq === 'MONTHLY') {
    outer2: for (let k = 0; guard++ < 2000; k += rule.interval) {
      const y = y0 + Math.floor((m0 + k) / 12), m = (m0 + k) % 12;
      if (Date.UTC(y, m, 1) > end) break;
      let days = [];
      if (rule.byday && rule.byday.length) rule.byday.forEach((b) => { const dd = nthDow(y, m, b.d, b.n || 1); if (dd) days.push(dd); });
      else if (rule.bymonthday) days = rule.bymonthday.map((d) => d < 0 ? new Date(Date.UTC(y, m + 1, 0)).getUTCDate() + d + 1 : d);
      else days = [d0];
      const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (const dd of days.sort((a, b) => a - b)) { if (dd > dim) continue; if (!push(Date.UTC(y, m, dd) + timeOfDay)) break outer2; }
    }
  } else if (rule.freq === 'YEARLY') {
    for (let k = 0; guard++ < 200; k += rule.interval) {
      const t = Date.UTC(y0 + k, m0, d0) + timeOfDay;
      if (new Date(t).getUTCDate() !== d0) continue;
      if (!push(t)) break;
    }
  } else {
    push(start);
  }
  return out;
}

/**
 * @param {string} text  съдържанието на .ics
 * @param {string} from  'yyyy-MM-dd'
 * @param {string} to    'yyyy-MM-dd'
 */
export function parseIcs(text, from, to) {
  const lines = unfold(text).split('\n');
  const fromNv = naive(from.replace(/-/g, '')), toNv = naive(to.replace(/-/g, '')) + DAY;
  const fromKey = from.replace(/-/g, ''), events = [], overrides = {};
  let cur = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') { cur = { ex: [] }; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const c = line.charCodeAt(0);
    // бързо прескачане на редове, които не ни трябват
    if (c !== 68 && c !== 83 && c !== 85 && c !== 76 && c !== 82 && c !== 69) continue; // D S U L R E
    const p = prop(line); if (!p) continue;
    switch (p.name) {
      case 'UID': cur.uid = p.value; break;
      case 'SUMMARY': cur.title = unesc(p.value); break;
      case 'DESCRIPTION': cur.desc = unesc(p.value).slice(0, 300); break;
      case 'LOCATION': cur.loc = unesc(p.value); break;
      case 'DTSTART': cur.start = dt(p); break;
      case 'DTEND': cur.end = dt(p); break;
      case 'DURATION': cur.dur = p.value; break;
      case 'RRULE': cur.rrule = p.value; break;
      case 'EXDATE': p.value.split(',').forEach((v) => cur.ex.push(dt({ params: p.params, value: v }))); break;
      case 'RECURRENCE-ID': cur.rid = dt(p); break;
      case 'STATUS': cur.status = p.value.toUpperCase(); break;
    }
  }
  const out = [];
  // променените срещи от серия: махаме оригиналния ден
  for (const e of events) if (e.rid && e.uid) (overrides[e.uid] ||= new Set()).add(toSofia(e.rid.nv, e.rid.tz, e.rid.utc));
  for (const e of events) {
    if (!e.start || e.start.nv == null) continue;
    if (e.status === 'CANCELLED') continue;
    // бързо: единични стари събития
    if (!e.rrule && !e.rid) {
      const lastKey = e.end && e.end.nv != null ? new Date(e.end.nv).toISOString().slice(0, 10).replace(/-/g, '') : null;
      if (lastKey && lastKey < fromKey) continue;
    }
    const allDay = e.start.allDay;
    let durMs;
    if (e.end && e.end.nv != null) durMs = e.end.nv - e.start.nv;
    else if (e.dur) { const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(e.dur) || []; durMs = ((+m[1] || 0) * 24 * 60 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 60000; }
    else durMs = allDay ? DAY : 3600000;
    if (allDay && durMs < DAY) durMs = DAY;
    const tz = allDay ? null : e.start.tz, utc = allDay ? false : e.start.utc;
    let starts;
    if (e.rrule) {
      // разширяваме в зоната на събитието (за верен час при смяна на лятно време)
      const local = (allDay || !utc) ? e.start.nv : toSofia(e.start.nv, null, true);
      starts = expand(local, parseRule(e.rrule), toNv + 2 * DAY, 3000, fromNv - 2 * DAY);
      const ex = new Set(e.ex.filter(Boolean).map((x) => x.allDay ? x.nv : (utc ? toSofia(x.nv, null, true) : x.nv)));
      starts = starts.filter((t) => !ex.has(t));
      if (utc && !allDay) starts = starts.map((t) => ({ sof: t })); // вече в София
      else starts = starts.map((t) => ({ sof: allDay ? t : toSofia(t, tz, false) }));
      const ov = overrides[e.uid];
      if (ov) starts = starts.filter((x) => !ov.has(x.sof));
    } else {
      starts = [{ sof: allDay ? e.start.nv : toSofia(e.start.nv, tz, utc) }];
    }
    for (const { sof } of starts) {
      const endSof = sof + durMs;
      if (endSof <= fromNv || sof >= toNv) continue;
      const date = ymd(sof);
      const st = allDay ? null : hms(sof);
      out.push({
        id: e.uid || ('e' + sof), key: (e.uid || 'e') + '|' + date + '|' + (st || ''),
        title: e.title || '(без заглавие)', date, startTime: st,
        endTime: allDay ? null : hms(endSof),
        endDate: allDay ? ymd(endSof - DAY) : null,
        durationMin: allDay ? null : Math.max(15, Math.round(durMs / 60000)),
        location: e.loc || null, description: e.desc || null, allDay,
      });
      if (out.length >= 1500) break;
    }
    if (out.length >= 1500) break;
  }
  out.sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')));
  return out;
}
