/* ============================================================
   SwimWithSmile — API клиент
   ------------------------------------------------------------
   Бекендът е Cloudflare Pages Function (functions/exec.js) + D1 база.
   Сайтът и API-то са на един адрес: /exec. При локална разработка
   (Live Server на 127.0.0.1) се ползва онлайн версията — PROD_ORIGIN.
   ============================================================ */

const API = (() => {
  const PROD_ORIGIN = 'https://swimwithsmile.pages.dev';
  const LOCAL = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.)/.test(location.hostname) && location.port !== '8788';
  const DEFAULT_BASE = (LOCAL || location.protocol === 'file:' ? PROD_ORIGIN : location.origin) + '/exec';

  const LS_BASE  = 'sws.apiBase';
  const LS_TOKEN = 'sws.token';
  const LS_USER  = 'sws.user';
  const LS_BOOT  = 'sws.boot';
  const LS_RC    = 'sws.rc';        // кеш на прочетените екрани (за моментално показване)
  const LS_TEAM  = 'sws.lastTeam';  // последно отваряният отбор (по имейл)

  // localStorage може да липсва (частен режим) — тогава работим само в паметта
  const mem = {};
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch { delete mem[k]; } },
  };

  // Старият адрес на Google Apps Script вече не се ползва
  if (/script\.google(usercontent)?\.com/.test(ls.get(LS_BASE) || '')) ls.del(LS_BASE);
  const getBase = () => ls.get(LS_BASE) || DEFAULT_BASE;
  const setBase = (v) => ls.set(LS_BASE, String(v).replace(/\/+$/, ''));

  const getToken = () => ls.get(LS_TOKEN);
  const setToken = (t) => t ? ls.set(LS_TOKEN, t) : ls.del(LS_TOKEN);

  const getUser = () => { try { return JSON.parse(ls.get(LS_USER)); } catch { return null; } };
  const setUser = (u) => u ? ls.set(LS_USER, JSON.stringify(u)) : ls.del(LS_USER);

  class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  // Всичко минава през един POST. Content-Type: text/plain пести
  // CORS preflight, който Apps Script не обслужва добре.
  async function call(action, payload = {}, auth = true) {
    const base = getBase();
    if (!base || /ПОСТАВИ_ТУК/.test(base)) {
      throw new ApiError(0, 'Няма зададен адрес на сървъра.');
    }
    const body = { action, payload };
    if (auth) body.token = getToken();

    let res;
    try {
      res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        cache: 'no-store',
        redirect: 'follow',
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new ApiError(0, navigator.onLine === false ? 'Няма интернет. Опитай пак, когато имаш връзка.' : 'Няма връзка със сървъра. Опитай пак.');
    }

    let data;
    try { data = await res.json(); }
    catch { throw new ApiError(res.status || 0, 'Неочакван отговор от сървъра (' + (res.status || '?') + '). Опитай пак след малко.'); }

    if (!data || data.ok !== true) {
      const status = (data && data.status) || res.status || 400;
      const msg = (data && data.message) || `Грешка ${status}`;
      if (status === 401 && auth) { setToken(null); setUser(null); ls.del(LS_BOOT); }
      throw new ApiError(status, msg);
    }
    return data.data;
  }

  function startSession(r) {
    setToken(r.token);
    setUser({ id: r.coachId, name: r.fullName, email: r.email, username: r.username || '',
      teamId: r.teamId, teamName: r.teamName, role: r.role, teams: r.teams || [] });
    try { const m = JSON.parse(ls.get(LS_TEAM) || '{}'); m[String(r.email || '').toLowerCase()] = r.teamId; if (r.username) m[String(r.username).trim().toLowerCase()] = r.teamId; ls.set(LS_TEAM, JSON.stringify(m)); } catch {}
    ls.del(LS_BOOT); boot = null; rcClear();
    return r;
  }
  const lastTeamFor = (email) => { try { return JSON.parse(ls.get(LS_TEAM) || '{}')[String(email || '').trim().toLowerCase()] || null; } catch { return null; } };

  /* ---------- Кеш на четенията (stale-while-revalidate) ----------
     Всеки прочетен екран се пази в паметта и в localStorage. Следващото
     отваряне се рисува веднага от кеша, а свежите данни идват във фона.
     След всеки запис кешът се чисти, за да не се покаже нещо остаряло. */
  const RC_MAX = 80;
  let rc = null;
  const rcLoad = () => { if (rc) return rc; try { rc = JSON.parse(ls.get(LS_RC)) || {}; } catch { rc = {}; } if (rc._u !== (getUser() || {}).id) rc = { _u: (getUser() || {}).id }; return rc; };
  let rcTimer = null;
  const rcSave = () => { clearTimeout(rcTimer); rcTimer = setTimeout(() => {
    try { ls.set(LS_RC, JSON.stringify(rc)); }
    catch { // препълнен localStorage → пазим само по-новите
      const keys = Object.keys(rc).filter(k => k !== '_u').sort((a, b) => rc[a].t - rc[b].t);
      keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => delete rc[k]);
      try { ls.set(LS_RC, JSON.stringify(rc)); } catch {}
    }
  }, 300); };
  const rcKey = (action, payload) => action + ':' + JSON.stringify(payload || {});
  function rcPut(action, payload, data) {
    const c = rcLoad(); c[rcKey(action, payload)] = { t: Date.now(), d: data };
    const keys = Object.keys(c).filter(k => k !== '_u');
    if (keys.length > RC_MAX) keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - RC_MAX).forEach(k => delete c[k]);
    rcSave();
  }
  let writeSeq = 0; // расте при всеки запис → закъснели четения не презаписват екрана
  function rcClear() { writeSeq++; rc = { _u: (getUser() || {}).id }; try { ls.del(LS_RC); } catch {} }
  function peek(action, payload) { const e = rcLoad()[rcKey(action, payload)]; return e ? e.d : undefined; }
  // Четене, което попълва кеша
  async function read(action, payload = {}) {
    const seq = writeSeq;
    const d = await call(action, payload);
    if (seq === writeSeq) rcPut(action, payload, d);
    return d;
  }
  // Месецът наведнъж. Ако бекендът е стар (няма „month") → двете отделни заявки
  let noMonth = false;
  async function monthRead(year, month) {
    const payload = { year, month };
    if (!noMonth) {
      try { return await read('month', payload); }
      catch (e) { if (!(e.status === 400 && /Непозната операция/.test(e.message))) throw e; noMonth = true; }
    }
    const seq = writeSeq;
    const [sessions, calendar] = await Promise.all([
      call('sessions', payload),
      call('calendarEvents', payload).catch(() => [])
    ]);
    const d = { sessions: sessions || [], calendar: calendar || [] };
    if (seq === writeSeq) rcPut('month', payload, d);
    return d;
  }

  // Кеш първо (до 10 мин), обновяване във фона — за раздели, които се сменят само при запис
  async function swr(action, payload = {}) {
    const e = rcLoad()[rcKey(action, payload)];
    if (e && Date.now() - e.t < 10 * 60e3) { read(action, payload).catch(() => {}); return e.d; }
    return read(action, payload);
  }
  // Рисува от кеша веднага (ако има), после със свежите данни, ако са различни.
  // paint(data, fromCache). Връща Promise със свежите данни.
  async function live(action, payload, paint) {
    const cached = peek(action, payload);
    let shown = cached !== undefined ? JSON.stringify(cached) : null;
    if (cached !== undefined) { try { paint(cached, true); } catch (e) { console.error(e); } }
    const seq = writeSeq;
    try {
      const d = action === 'month' ? await monthRead(payload.year, payload.month) : await read(action, payload);
      // ако междувременно е имало запис (✓ на присъствие), екранът вече е по-нов
      if (seq === writeSeq && JSON.stringify(d) !== shown) paint(d, false);
      else if (seq !== writeSeq && cached === undefined) paint(d, false);
      return d;
    } catch (e) { if (cached === undefined) throw e; return cached; }
  }

  /* ---------- bootstrap: деца, групи, умения, награди, треньори ----------
     Показваме веднага последното известно копие (от паметта или
     localStorage), а свежите данни идват във фона. */
  let boot = null, bootPromise = null;
  const listeners = new Set();
  try { boot = JSON.parse(ls.get(LS_BOOT)); } catch { boot = null; }

  function refreshBoot() {
    if (bootPromise) return bootPromise;
    bootPromise = call('bootstrap').then(d => {
      boot = d; bootPromise = null;
      ls.set(LS_BOOT, JSON.stringify(d));
      listeners.forEach(fn => { try { fn(d); } catch {} });
      return d;
    }, e => { bootPromise = null; throw e; });
    return bootPromise;
  }
  // Връща кеша веднага, ако има; иначе чака сървъра
  async function getBoot() { if (boot) { refreshBoot().catch(() => {}); return boot; } return refreshBoot(); }

  // Записи, след които трябва да обновим bootstrap
  const BOOT_WRITES = /^(createChild|createSession|addPeopleToSession|updateChild|deleteChild|createGroup|updateGroup|deleteGroup|createSkill|updateSkill|deleteSkill|createAchievement|updateAchievement|deleteAchievement|award|toggleSkill|markAttendance|upsertParticipant|createCompetition|removeAward|deleteCompetition|removeCoach|joinTeam|linkCalendarName)$/;
  async function w(action, payload) {
    writeSeq++;
    const r = await call(action, payload);
    rcClear();
    // много бързи записи подред (✓ ✓ ✓) → едно обновяване накрая
    if (BOOT_WRITES.test(action)) { clearTimeout(bootTimer); bootTimer = setTimeout(() => refreshBoot().catch(() => {}), 900); }
    return r;
  }
  let bootTimer = null;

  // Затопляне на кеша след вход: „Днес" и текущият месец са готови преди да ги отвориш
  let warmed = false;
  function prefetch() {
    if (warmed || !getToken()) return; warmed = true;
    const u = getUser();
    if (u && !Array.isArray(u.teams)) call('myTeams').then(list => { const x = getUser(); if (x) setUser({ ...x, teams: list }); }).catch(() => {});
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    setTimeout(() => {
      if (peek('today', { date: today }) === undefined) read('today', { date: today }).catch(() => {});
      monthRead(d.getFullYear(), d.getMonth() + 1).catch(() => {});
    }, 400);
  }
  // Всички записи минават оттук: чистят кеша на екраните
  const wr = (action, payload) => { writeSeq++; return call(action, payload).then(r => { rcClear(); return r; }); };

  return {
    ApiError, getBase, setBase, getToken, getUser,
    isAuthed: () => !!getToken(),
    getBoot, refreshBoot, peekBoot: () => boot,
    peek, live, read, clearCache: rcClear, prefetch, lastTeamFor,
    onBoot(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // ---- Auth ----
    async login(login, password) {
      return startSession(await call('login', { login, password, teamId: lastTeamFor(login) }, false));
    },
    async updateProfile(dto) { return startSession(await call('updateProfile', { data: dto })); },
    async register(dto) { return startSession(await call('register', { data: dto }, false)); },
    async joinTeam(dto) { return startSession(await call('joinTeam', { data: dto }, false)); },
    inviteInfo: (code) => call('inviteInfo', { code }, false),
    logout() { setToken(null); setUser(null); ls.del(LS_BOOT); boot = null; rcClear(); },
    myTeams: () => call('myTeams').then(list => { const u = getUser(); if (u) setUser({ ...u, teams: list }); return list; }),
    async switchTeam(teamId) { return startSession(await call('switchTeam', { teamId })); },
    async createTeam(teamName) { return startSession(await call('createTeam', { data: { teamName } })); },
    calendarSettings: () => call('calendarSettings'),
    updateCalendarSettings: (dto) => wr('updateCalendarSettings', { data: dto }),
    coaches: () => call('coaches'),

    // ---- Отбор ----
    team: () => swr('team'),
    updateTeam: (dto) => wr('updateTeam', { data: dto }),
    setPlan: (plan) => wr('setPlan', { plan }),
    regenerateInvite: () => wr('regenerateInvite'),
    removeCoach: (id) => w('removeCoach', { id }),
    patchUser(patch) { setUser({ ...(getUser() || {}), ...patch }); },
    today: (date) => read('today', { date }),
    notifyStatus: () => swr('notifyStatus'),

    // ---- Деца ----
    children: (includeInactive = false) => read('children', { includeInactive }),
    child: (id) => read('child', { id }),
    createChild: (dto) => w('createChild', { data: dto }),
    updateChild: (id, dto) => w('updateChild', { id, data: dto }),
    deleteChild: (id) => w('deleteChild', { id }),
    regenerateCode: (id) => wr('regenerateCode', { id }),
    sendParentInvite: (id) => wr('sendParentInvite', { id }),
    childHistory: (id) => swr('childHistory', { id }),
    childProgress: (id) => swr('childProgress', { id }),
    childAchievements: (id) => swr('childAchievements', { id }),
    childCompetitions: (id) => swr('childCompetitions', { id }),
    childSkills: (id) => swr('childSkills', { id }),
    toggleSkill: (childId, skillId) => w('toggleSkill', { data: { childId, skillId } }),

    // ---- Групи ----
    groups: () => swr('groups'),
    createGroup: (dto) => w('createGroup', { data: dto }),
    updateGroup: (id, dto) => w('updateGroup', { id, data: dto }),
    deleteGroup: (id) => w('deleteGroup', { id }),

    // ---- Тренировки ----
    calendar: (y, m) => read('sessions', { year: y, month: m }),
    sessions: (y, m) => read('sessions', { year: y, month: m }),
    calendarEvents: (y, m) => read('calendarEvents', { year: y, month: m }),
    calendarFeed: (regenerate = false) => regenerate ? wr('calendarFeed', { regenerate: true }) : read('calendarFeed', { regenerate: false }),
    month: (y, m) => monthRead(y, m),
    importCalendarEvents: (items) => wr('importCalendarEvents', { items }),
    linkCalendarName: (childId, name) => w('linkCalendarName', { childId, name }),
    session: (id) => read('session', { id }),
    createSession: (dto) => w('createSession', { data: dto }),
    updateSession: (id, dto) => wr('updateSession', { id, data: dto }),
    deleteSession: (id, series = false) => wr('deleteSession', { id, series }),
    cancelSession: (id, cancelled = true) => wr('cancelSession', { id, cancelled }),
    upsertParticipant: (sid, dto) => w('upsertParticipant', { sessionId: sid, data: dto }),
    removeParticipant: (sid, cid) => wr('removeParticipant', { sessionId: sid, childId: cid }),
    markAttendance: (sid, items) => w('markAttendance', { sessionId: sid, items }),
    updateSets: (sid, items) => w('updateSets', { sessionId: sid, items }),
    addGroupToSession: (sid, groupId) => wr('addGroupToSession', { sessionId: sid, groupId }),
    addPeopleToSession: (sid, people, attended = false) => w('addPeopleToSession', { sessionId: sid, people, attended }),
    attendanceReport: (y, m, groupId) => swr('attendanceReport', { year: y, month: m, groupId: groupId || null }),

    // ---- Напредък ----
    createProgress: (dto) => wr('createProgress', { data: dto }),
    deleteProgress: (id) => wr('deleteProgress', { id }),

    // ---- Награди (постижения) ----
    achievements: (includeInactive = false) => swr('achievements', { includeInactive }),
    createAchievement: (dto) => w('createAchievement', { data: dto }),
    updateAchievement: (id, dto) => w('updateAchievement', { id, data: dto }),
    deleteAchievement: (id) => w('deleteAchievement', { id }),
    award: (dto) => w('award', { data: dto }),
    removeAward: (id) => w('removeAward', { id }),

    // ---- Умения ----
    skills: () => swr('skills'),
    createSkill: (dto) => w('createSkill', { data: dto }),
    updateSkill: (id, dto) => w('updateSkill', { id, data: dto }),
    deleteSkill: (id) => w('deleteSkill', { id }),

    // ---- Състезания ----
    createCompetition: (dto) => w('createCompetition', { data: dto }),
    updateCompetition: (id, dto) => wr('updateCompetition', { id, data: dto }),
    deleteCompetition: (id) => w('deleteCompetition', { id }),

    // ---- Родител (публично) ----
    parentDashboard: (code, birthDate) => call('parentDashboard', { code, birthDate }, false),
  };
})();
