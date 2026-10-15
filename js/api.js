/* ============================================================
   SwimWithSmile — API клиент (Google Apps Script + Google Sheet)
   ------------------------------------------------------------
   Приложението говори с едно Google Apps Script Web App, което
   чете/пише в Google таблица.

   ➜ ВАЖНО: постави тук адреса на своя разгърнат Web App
     (Deploy → Web app → URL, който завършва на /exec):
   ============================================================ */

const API = (() => {
  const DEFAULT_BASE = 'https://script.google.com/macros/s/AKfycbwZ2OL6KZZfollnugL3M0o8g71BaRgb5gXiXvqChjd5V1BHY7Cr-tIK3c6-KyC6a-wFmg/exec';

  const LS_BASE  = 'sws.apiBase';
  const LS_TOKEN = 'sws.token';
  const LS_USER  = 'sws.user';
  const LS_BOOT  = 'sws.boot';

  // localStorage може да липсва (частен режим) — тогава работим само в паметта
  const mem = {};
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch { delete mem[k]; } },
  };

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
      throw new ApiError(0, 'Няма зададен адрес на сървъра. Отвори ⚙️ и постави адреса на Apps Script.');
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
    catch { throw new ApiError(res.status || 0, 'Неочакван отговор от сървъра. Провери дали адресът завършва на /exec и че достъпът е „Anyone".'); }

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
    setUser({ id: r.coachId, name: r.fullName, email: r.email,
      teamId: r.teamId, teamName: r.teamName, role: r.role, plan: r.plan });
    ls.del(LS_BOOT);
    return r;
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
    const r = await call(action, payload);
    if (BOOT_WRITES.test(action)) refreshBoot().catch(() => {});
    return r;
  }

  return {
    ApiError, getBase, setBase, getToken, getUser,
    isAuthed: () => !!getToken(),
    getBoot, refreshBoot, peekBoot: () => boot,
    onBoot(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // ---- Auth ----
    async login(email, password) {
      return startSession(await call('login', { email, password }, false));
    },
    async register(dto) { return startSession(await call('register', { data: dto }, false)); },
    async joinTeam(dto) { return startSession(await call('joinTeam', { data: dto }, false)); },
    inviteInfo: (code) => call('inviteInfo', { code }, false),
    logout() { setToken(null); setUser(null); ls.del(LS_BOOT); boot = null; },
    coaches: () => call('coaches'),

    // ---- Отбор ----
    team: () => call('team'),
    updateTeam: (dto) => call('updateTeam', { data: dto }),
    setPlan: (plan) => call('setPlan', { plan }),
    regenerateInvite: () => call('regenerateInvite'),
    removeCoach: (id) => w('removeCoach', { id }),
    patchUser(patch) { setUser({ ...(getUser() || {}), ...patch }); },
    today: (date) => call('today', { date }),
    notifyStatus: () => call('notifyStatus'),

    // ---- Деца ----
    children: (includeInactive = false) => call('children', { includeInactive }),
    child: (id) => call('child', { id }),
    createChild: (dto) => w('createChild', { data: dto }),
    updateChild: (id, dto) => w('updateChild', { id, data: dto }),
    deleteChild: (id) => w('deleteChild', { id }),
    regenerateCode: (id) => call('regenerateCode', { id }),
    sendParentInvite: (id) => call('sendParentInvite', { id }),
    childHistory: (id) => call('childHistory', { id }),
    childProgress: (id) => call('childProgress', { id }),
    childAchievements: (id) => call('childAchievements', { id }),
    childCompetitions: (id) => call('childCompetitions', { id }),
    childSkills: (id) => call('childSkills', { id }),
    toggleSkill: (childId, skillId) => w('toggleSkill', { data: { childId, skillId } }),

    // ---- Групи ----
    groups: () => call('groups'),
    createGroup: (dto) => w('createGroup', { data: dto }),
    updateGroup: (id, dto) => w('updateGroup', { id, data: dto }),
    deleteGroup: (id) => w('deleteGroup', { id }),

    // ---- Тренировки ----
    calendar: (y, m) => call('sessions', { year: y, month: m }),
    sessions: (y, m) => call('sessions', { year: y, month: m }),
    calendarEvents: (y, m) => call('calendarEvents', { year: y, month: m }),
    calendarFeed: (regenerate = false) => call('calendarFeed', { regenerate }),
    importCalendarEvents: (items) => call('importCalendarEvents', { items }),
    linkCalendarName: (childId, name) => w('linkCalendarName', { childId, name }),
    session: (id) => call('session', { id }),
    createSession: (dto) => w('createSession', { data: dto }),
    updateSession: (id, dto) => call('updateSession', { id, data: dto }),
    deleteSession: (id, series = false) => call('deleteSession', { id, series }),
    cancelSession: (id, cancelled = true) => call('cancelSession', { id, cancelled }),
    upsertParticipant: (sid, dto) => w('upsertParticipant', { sessionId: sid, data: dto }),
    removeParticipant: (sid, cid) => call('removeParticipant', { sessionId: sid, childId: cid }),
    markAttendance: (sid, items) => w('markAttendance', { sessionId: sid, items }),
    addGroupToSession: (sid, groupId) => call('addGroupToSession', { sessionId: sid, groupId }),
    addPeopleToSession: (sid, people, attended = false) => w('addPeopleToSession', { sessionId: sid, people, attended }),
    attendanceReport: (y, m, groupId) => call('attendanceReport', { year: y, month: m, groupId: groupId || null }),

    // ---- Напредък ----
    createProgress: (dto) => call('createProgress', { data: dto }),
    deleteProgress: (id) => call('deleteProgress', { id }),

    // ---- Награди (постижения) ----
    achievements: (includeInactive = false) => call('achievements', { includeInactive }),
    createAchievement: (dto) => w('createAchievement', { data: dto }),
    updateAchievement: (id, dto) => w('updateAchievement', { id, data: dto }),
    deleteAchievement: (id) => w('deleteAchievement', { id }),
    award: (dto) => w('award', { data: dto }),
    removeAward: (id) => w('removeAward', { id }),

    // ---- Умения ----
    skills: () => call('skills'),
    createSkill: (dto) => w('createSkill', { data: dto }),
    updateSkill: (id, dto) => w('updateSkill', { id, data: dto }),
    deleteSkill: (id) => w('deleteSkill', { id }),

    // ---- Състезания ----
    createCompetition: (dto) => w('createCompetition', { data: dto }),
    updateCompetition: (id, dto) => call('updateCompetition', { id, data: dto }),
    deleteCompetition: (id) => w('deleteCompetition', { id }),

    // ---- Родител (публично) ----
    parentDashboard: (code, birthDate) => call('parentDashboard', { code, birthDate }, false),
  };
})();
