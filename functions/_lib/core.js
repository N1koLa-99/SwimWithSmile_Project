// ⚠️ ГЕНЕРИРАН ФАЙЛ — не го редактирай на ръка.
// Източник: apps-script/Code.gs + tools/overrides.js  →  node tools/build-core.mjs
import { Utilities } from './util.js';

const noop = () => {};
const LockService = { getScriptLock: () => ({ waitLock: noop, tryLock: () => true, releaseLock: noop, hasLock: () => true }) };
const SpreadsheetApp = { flush: noop, getUi: () => { throw new Error('Няма Google Sheet'); }, getActiveSpreadsheet: () => { throw new Error('Няма Google Sheet'); } };
const CacheService = null, CalendarApp = null, ScriptApp = null, UrlFetchApp = null, Session = null, ContentService = null;

// ctx: { store, ops, props, env, calcache, origin }
export function createCore(ctx) {
  const STORE = ctx.store, OPS = ctx.ops, ENV = ctx.env || {}, CALCACHE = ctx.calcache || {}, ORIGIN = ctx.origin || '';
  const CAL_DIRTY = ctx.calDirty || {};
  const PropertiesService = { getScriptProperties: () => ({
    getProperty: (k) => (ctx.props[k] !== undefined ? ctx.props[k] : null),
    setProperty: (k, v) => { ctx.props[k] = String(v); OPS.push({ op: 'prop', k, v: String(v) }); },
  }) };

/* ============================================================
   SwimWithSmile — Бекенд върху Google Sheet (Google Apps Script)
   ------------------------------------------------------------
   Данните живеят в табовете на Google таблицата (всеки таб =
   таблица). Скриптът се публикува като Web App:
     Deploy → New deployment → Web app
     Execute as: Me · Who has access: Anyone
   URL-ът (завършва на /exec) се поставя в js/api.js.

   Първо стартиране:
     1) Меню „SwimWithSmile → 1) Първоначална настройка"
     2) В таб „Coaches" сложи имейл + парола (в колона passwordHash)
     3) Меню „SwimWithSmile → 2) Хеширай паролите"
     4) (по желание) „3) Известия по имейл (Brevo)"
   ============================================================ */

var TZ = 'Europe/Sofia';

// Новите колони се добавят НАКРАЯ на всеки таб, за да не се разместят
// съществуващите данни. ensureSchema_() ги добавя автоматично.
var SCHEMA = {
  Teams:        ['id','name','plan','inviteCode','ownerId','createdAt','icsKey','calendarKeywords','poolLength','calendarHide'],
  Coaches:      ['id','fullName','email','passwordHash','active','createdAt','teamId','role','calendarOn','icsUrl','username'],
  Children:     ['id','firstName','lastName','birthDate','gender','level','trainingStartDate',
                 'diagnosis','objectiveCondition','allergiesMedical','parentContact','emergencyContact',
                 'goals','notes','parentCode','photoUrl','isActive','createdAt','teamId',
                 'parentName','parentPhone','parentEmail','emergencyName','emergencyPhone',
                 'medicalAlert','specialNeeds','medicalUntil','consentDate','groupId','notifyParent','calendarName',
                 'isAdult','weightKg'],
  Groups:       ['id','name','color','location','days','time','durationMin','isActive','createdAt','teamId'],
  Sessions:     ['id','sessionDate','startTime','coachId','location','notes','createdAt','teamId',
                 'groupId','durationMin','seriesId','status','gcalKey','poolLength'],
  Participants: ['id','sessionId','childId','attended','swamWhat','dailyProgress','mood','updatedAt','parentNote','sets'],
  Progress:     ['id','childId','coachId','assessmentDate','periodLabel','jumpsAthletics','balanceCoordination',
                 'strengthEndurance','basicSkillsComment','physStrength','physFlexibility','physEndurance',
                 'physCoordination','teamwork','discipline','motivation','concentration','nextGoals','coachNotes','createdAt'],
  Achievements: ['id','name','icon','category','reward','isActive','createdAt','teamId'],
  Awards:       ['id','childId','achievementId','awardedDate','awardedBy','note','createdAt'],
  Competitions: ['id','childId','eventDate','eventName','results','notes','createdBy','createdAt',
                 'discipline','timeText','place','location'],
  Skills:       ['id','name','icon','stage','points','sortOrder','isActive','createdAt','teamId'],
  ChildSkills:  ['id','childId','skillId','achievedDate','coachId','note','createdAt'],
  Outbox:       ['id','teamId','childId','kind','toEmail','toName','subject','html','status','createdAt','sentAt','error']
};

// Платформата е БЕЗПЛАТНА — без планове и лимити (старите стойности в колона plan се игнорират).
var FREE = { name: 'Безплатен', seats: 1000, kids: 100000 };
function planOf_(t) { return FREE; }
var SCHEMA_VERSION = '10';

// Google Calendar: кои събития се виждат в сайта
var CAL_OFF_WORDS = ['почивк', 'почивен', 'почивни', 'отпуск', 'болничн', 'болен', 'болна', 'ваканц', 'не работя', 'отсъствам'];
var CAL_PRIVATE = ['#лично', '#скрий', '#private'];
var CAL_DEFAULT_KEYWORDS = '#sws';
var DEFAULT_POOL = 25;

var DEFAULT_ACHIEVEMENTS = [
  ['Първи 25 метра','🏊','Техника','стикер'],
  ['Скок от стартов блок','🚀','Смелост','медал'],
  ['Пълна тренировка без спиране','🔥','Издръжливост','тениска'],
  ['Месец без отсъствие','📅','Постоянство','грамота']
];

// Стълба от умения — етап 1 → 4. Всеки отбор може да ги промени.
var STAGES = { 1: 'Приятел с водата', 2: 'Плава с помощ', 3: 'Самостоятелно', 4: 'Плувец' };
var DEFAULT_SKILLS = [
  [1,'Влиза сам във водата','🛁'], [1,'Потапя лицето','😊'], [1,'Издишва под водата','🫧'], [1,'Звездичка по корем','⭐'],
  [2,'Звездичка по гръб','🌟'], [2,'Плъзгане с дъска','🏄'], [2,'Крака кроул с дъска','🦵'], [2,'Плува без коланче','🎉'],
  [3,'Плува без плавници','🐟'], [3,'10 м кроул','🌊'], [3,'10 м гръб','🔄'], [3,'Скок във водата','💦'],
  [4,'25 м кроул','🏊'], [4,'25 м гръб','🐬'], [4,'Дишане настрани','💨'], [4,'Скок от стартов блок','🚀'], [4,'50 м без спиране','🔥']
];
var STAGE_POINTS = { 1: 30, 2: 40, 3: 50, 4: 60 };

// Точки и нива — смятат се „на живо" от данните, нищо не се пази отделно
var POINTS = { attended: 10, award: 25, competition: 20, place1: 30, place2: 20, place3: 10 };
var LEVELS = [
  { min: 0,    name: 'Капка',        icon: '💧' },
  { min: 100,  name: 'Жабче',        icon: '🐸' },
  { min: 250,  name: 'Рибка',        icon: '🐟' },
  { min: 450,  name: 'Октопод',      icon: '🐙' },
  { min: 700,  name: 'Костенурка',   icon: '🐢' },
  { min: 1000, name: 'Делфин',       icon: '🐬' },
  { min: 1400, name: 'Акула',        icon: '🦈' },
  { min: 1900, name: 'Кит',          icon: '🐋' }
];

/* ---------------- Меню в таблицата ---------------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SwimWithSmile')
    .addItem('1) Първоначална настройка', 'setup')
    .addItem('2) Хеширай паролите', 'hashPlainPasswords')
    .addSeparator()
    .addItem('3) Известия по имейл (Brevo)', 'setupNotifications')
    .addItem('Изпрати чакащите имейли сега', 'processOutbox')
    .addItem('Тестов имейл до мен', 'sendTestEmail')
    .addSeparator()
    .addItem('Изчисти кеша на сайта', 'clearCacheMenu')
    .addSeparator()
    .addItem('☁️ Премести данните в Cloudflare', 'exportForCloudflare')
    .addToUi();
}

/* ---------------- Пренос към Cloudflare (еднократно) ----------------
   Праща всички табове + PEPPER (за да важат същите пароли) към новия сайт.
   Новата база приема преноса само докато е празна. */
function exportForCloudflare() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Пренос към Cloudflare', 'Адресът на новия сайт, напр. https://swimwithsmile.pages.dev', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var base = r.getResponseText().trim().replace(/\/+$/, '').replace(/\/exec$/, '');
  if (!/^https:\/\//.test(base)) { ui.alert('Адресът трябва да започва с https://'); return; }
  _NOCACHE = true; resetCache_();
  var tables = {};
  Object.keys(SCHEMA).forEach(function (n) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n);
    tables[n] = sh ? readObjects_(n) : [];
  });
  var pr = PropertiesService.getScriptProperties();
  var payload = JSON.stringify({ tables: tables, props: { PEPPER: pr.getProperty('PEPPER'), LEGACY_TEAM_ID: pr.getProperty('LEGACY_TEAM_ID') } });
  var res = UrlFetchApp.fetch(base + '/exec?import=1', { method: 'post', contentType: 'text/plain', payload: payload, muteHttpExceptions: true });
  var txt = res.getContentText();
  var out = {}; try { out = JSON.parse(txt); } catch (e) {}
  if (out.ok) {
    var c = out.data.imported;
    ui.alert('Готово! Пренесени: ' + c.Teams + ' отбора, ' + c.Coaches + ' треньори, ' + c.Children + ' плувци, ' + c.Sessions + ' тренировки.\n\nОтвори ' + base + ' и влез със същия имейл и парола.');
  } else {
    ui.alert('Не стана: ' + (out.message || ('HTTP ' + res.getResponseCode() + ' ' + txt.slice(0, 300))));
  }
}

/* ---------------- Първоначална настройка ---------------- */
function setup() {
  pepper_();
  ensureSchema_(true);

  if (readObjects_('Coaches').length === 0) {
    var teamId = createTeam_('SwimWithSmile', 'club', null);
    var coachId = Utilities.getUuid();
    appendObject_('Coaches', {
      id: coachId, fullName: 'Треньор', email: 'coach@example.com',
      passwordHash: 'promeni-me', active: 'TRUE', createdAt: nowIso_(), teamId: teamId, role: 'owner'
    });
    updateById_('Teams', teamId, { ownerId: coachId });
    PropertiesService.getScriptProperties().setProperty('LEGACY_TEAM_ID', teamId);
    seedAchievements_(teamId);
    seedSkills_(teamId);
  }

  commit_();
  try { installChangeTrigger_(); } catch (e) {}
  SpreadsheetApp.getUi().alert('Готово! Табовете са създадени.\n\nСега: в таб „Coaches" сложи своя имейл и парола, после пусни „2) Хеширай паролите".');
}

/* ------------------------------------------------------------
   Схема + миграции (безопасни, изпълняват се веднъж на версия).
   ------------------------------------------------------------ */
function ensureSchema_(force) {
  // Бърз път: версията на схемата е в кеша заедно с версиите на табовете (една заявка)
  if (!force && verAll_()['SCHEMA_OK'] === SCHEMA_VERSION) return;
  var props = PropertiesService.getScriptProperties();
  if (!force && props.getProperty('SCHEMA_V') === SCHEMA_VERSION) { markSchemaOk_(); return; }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!force && props.getProperty('SCHEMA_V') === SCHEMA_VERSION) return;
    _NOCACHE = true;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(SCHEMA).forEach(function (name) {
      var sh = ss.getSheetByName(name) || ss.insertSheet(name);
      var want = SCHEMA[name];
      var have = sh.getLastColumn() > 0
        ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).filter(function (h) { return h; })
        : [];
      var headers = have.slice();
      want.forEach(function (h) { if (headers.indexOf(h) < 0) headers.push(h); });
      if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
      sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    });
    resetCache_();

    // v2: съществуващите треньори и данни → един общ отбор
    var coaches = readObjects_('Coaches');
    var orphans = coaches.filter(function (c) { return !c.teamId; });
    if (orphans.length) {
      var legacy = props.getProperty('LEGACY_TEAM_ID');
      if (!legacy || !findById_('Teams', legacy)) {
        legacy = createTeam_('SwimWithSmile', 'club', orphans[0].id);
        props.setProperty('LEGACY_TEAM_ID', legacy);
      }
      orphans.forEach(function (c, i) {
        updateById_('Coaches', c.id, { teamId: legacy, role: (c.role || (i === 0 ? 'owner' : 'coach')) });
      });
      ['Children', 'Sessions', 'Achievements'].forEach(function (name) {
        fillEmptyColumn_(name, 'teamId', legacy);
      });
    }

    // v3: всеки отбор получава стълба от умения и ключ за календара
    readObjects_('Teams').forEach(function (t) {
      var hasSkills = readObjects_('Skills').some(function (s) { return String(s.teamId) === String(t.id); });
      if (!hasSkills) seedSkills_(t.id);
      if (!t.icsKey) updateById_('Teams', t.id, { icsKey: newKey_() });
    });

    props.setProperty('SCHEMA_V', SCHEMA_VERSION);
    Object.keys(SCHEMA).forEach(function (n) { _DIRTY[n] = 1; });
    _NOCACHE = false; resetCache_();
    commit_();
    markSchemaOk_();
    try { installChangeTrigger_(); } catch (e) {}
  } finally {
    _NOCACHE = false;
    lock.releaseLock();
  }
}

function fillEmptyColumn_(name, col, value) {
  var sh = sh_(name);
  if (sh.getLastRow() < 2) return;
  var headers = headers_(name);
  var c = headers.indexOf(col);
  if (c < 0) return;
  var rng = sh.getRange(2, c + 1, sh.getLastRow() - 1, 1);
  var vals = rng.getValues();
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (rows[i][0] !== '' && (vals[i][0] === '' || vals[i][0] === null)) vals[i][0] = value;
  }
  rng.setNumberFormat('@').setValues(vals);
  invalidate_(name);
}

function createTeam_(name, plan, ownerId) {
  var id = Utilities.getUuid();
  appendObject_('Teams', {
    id: id, name: name, plan: 'free',
    inviteCode: newInviteCode_(), ownerId: ownerId || '', createdAt: nowIso_(), icsKey: newKey_()
  });
  return id;
}

function seedAchievements_(teamId) {
  appendObjects_('Achievements', DEFAULT_ACHIEVEMENTS.map(function (a) {
    return { id: Utilities.getUuid(), name: a[0], icon: a[1], category: a[2], reward: a[3],
             isActive: 'TRUE', createdAt: nowIso_(), teamId: teamId };
  }));
}

function seedSkills_(teamId) {
  appendObjects_('Skills', DEFAULT_SKILLS.map(function (s, i) {
    return { id: Utilities.getUuid(), name: s[1], icon: s[2], stage: String(s[0]),
             points: String(STAGE_POINTS[s[0]] || 40), sortOrder: String(i + 1),
             isActive: 'TRUE', createdAt: nowIso_(), teamId: teamId };
  }));
}

function hashPlainPasswords() {
  var sh = sh_('Coaches');
  var vals = sh.getDataRange().getValues();
  var headers = vals[0].map(String);
  var col = headers.indexOf('passwordHash');
  var n = 0;
  for (var i = 1; i < vals.length; i++) {
    var v = String(vals[i][col] || '');
    if (v && v.indexOf('sha256:') !== 0) {
      sh.getRange(i + 1, col + 1).setNumberFormat('@').setValue(hashPw_(v));
      n++;
    }
  }
  invalidate_('Coaches'); commit_();
  SpreadsheetApp.getUi().alert(n + ' парола(и) хеширани.');
}

/* ============================================================
   HTTP входни точки
   ============================================================ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ics) {
    try {
      ensureSchema_(false);
      var ics = buildIcs_(p.ics, p.coach);
      commit_();
      return ContentService.createTextOutput(ics).setMimeType(ContentService.MimeType.ICAL);
    } catch (err) {
      return ContentService.createTextOutput('Грешка: ' + (err && err.message ? err.message : err))
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }
  return ContentService
    .createTextOutput('SwimWithSmile API е активно.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = handle_(req);
  } catch (err) {
    out = E(500, 'Сървърна грешка: ' + (err && err.message ? err.message : err));
  }
  return json_(out);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function D(data) { return { ok: true, data: (data === undefined ? null : data) }; }
function E(status, message) { return { ok: false, status: status, message: message }; }

/* ---------------- Рутер ---------------- */
var PUBLIC_ACTIONS = { login: 1, parentDashboard: 1, register: 1, inviteInfo: 1, joinTeam: 1 };
var WRITE_RE = /^(create|update|delete|regenerate|upsert|remove|award|register|join|setPlan|mark|toggle|add|send|cancel|import|link)/;

function Denied_(status, message) { this.status = status; this.message = message; }

function handle_(req) {
  var action = req.action;
  var p = req.payload || {};

  ensureSchema_(false);

  if (!PUBLIC_ACTIONS[action]) {
    var coachId = verifyToken_(req.token);
    var coach = coachId ? findById_('Coaches', coachId) : null;
    if (!coach || !nb_(coach.active) || !coach.teamId) return E(401, 'Сесията изтече. Влез отново.');
    p._coachId = coach.id;
    p._teamId = String(coach.teamId);
    p._role = coach.role || 'coach';
  }

  var isWrite = WRITE_RE.test(action);
  var lock = null;
  if (isWrite) {
    lock = LockService.getScriptLock();
    try { lock.waitLock(20000); } catch (e) { return E(503, 'Сървърът е зает, опитай пак.'); }
    resetCache_(); // след изчакване на ключалката — четем наново
  }
  try {
    switch (action) {
      case 'login':                return actLogin_(p);
      case 'register':             return actRegister_(p);
      case 'inviteInfo':           return actInviteInfo_(p);
      case 'joinTeam':             return actJoinTeam_(p);
      case 'team':                 return actTeam_(p);
      case 'myTeams':              return actMyTeams_(p);
      case 'switchTeam':           return actSwitchTeam_(p);
      case 'createTeam':           return actCreateTeam_(p);
      case 'updateProfile':        return actUpdateProfile_(p);
      case 'createDemo':           return actCreateDemo_(p);
      case 'deleteDemo':           return actDeleteDemo_(p);
      case 'calendarSettings':     return actCalendarSettings_(p);
      case 'updateCalendarSettings': return actUpdateCalendarSettings_(p);
      case 'updateTeam':           return actUpdateTeam_(p);
      case 'setPlan':              return actSetPlan_(p);
      case 'regenerateInvite':     return actRegenerateInvite_(p);
      case 'removeCoach':          return actRemoveCoach_(p);
      case 'coaches':              return actCoaches_(p);
      case 'bootstrap':            return actBootstrap_(p);
      case 'today':                return actToday_(p);

      case 'children':             return actChildren_(p);
      case 'child':                return actChild_(p);
      case 'createChild':          return actCreateChild_(p);
      case 'updateChild':          return actUpdateChild_(p);
      case 'deleteChild':          return actDeleteChild_(p);
      case 'regenerateCode':       return actRegenerateCode_(p);
      case 'childHistory':         return actChildHistory_(p);
      case 'childProgress':        return actChildProgress_(p);
      case 'childAchievements':    return actChildAchievements_(p);
      case 'childCompetitions':    return actChildCompetitions_(p);
      case 'childSkills':          return actChildSkills_(p);
      case 'toggleSkill':          return actToggleSkill_(p);
      case 'sendParentInvite':     return actSendParentInvite_(p);

      case 'groups':               return D(groupsOut_(p._teamId, true));
      case 'createGroup':          return actCreateGroup_(p);
      case 'updateGroup':          return actUpdateGroup_(p);
      case 'deleteGroup':          return actDeleteGroup_(p);

      case 'sessions':             return actSessions_(p);
      case 'month':                return actMonth_(p);
      case 'calendar':             return actSessions_(p);
      case 'calendarEvents':       return actCalendarEvents_(p);
      case 'calendarFeed':         return actCalendarFeed_(p);
      case 'importCalendarEvents': return actImportCalendarEvents_(p);
      case 'linkCalendarName':     return actLinkCalendarName_(p);
      case 'session':              return actSession_(p);
      case 'createSession':        return actCreateSession_(p);
      case 'updateSession':        return actUpdateSession_(p);
      case 'deleteSession':        return actDeleteSession_(p);
      case 'cancelSession':        return actCancelSession_(p);
      case 'upsertParticipant':    return actUpsertParticipant_(p);
      case 'removeParticipant':    return actRemoveParticipant_(p);
      case 'markAttendance':       return actMarkAttendance_(p);
      case 'updateSets':           return actUpdateSets_(p);
      case 'addGroupToSession':    return actAddGroupToSession_(p);
      case 'addPeopleToSession':   return actAddPeopleToSession_(p);
      case 'attendanceReport':     return actAttendanceReport_(p);

      case 'createProgress':       return actCreateProgress_(p);
      case 'deleteProgress':       return actDeleteChildRow_('Progress', p.id, p._teamId);

      case 'achievements':         return actAchievements_(p);
      case 'createAchievement':    return actCreateAchievement_(p);
      case 'updateAchievement':    return actUpdateAchievement_(p);
      case 'deleteAchievement':    return actDeleteAchievement_(p);
      case 'award':                return actAward_(p);
      case 'removeAward':          return actDeleteChildRow_('Awards', p.id, p._teamId);

      case 'skills':               return D(skillsOut_(p._teamId, true));
      case 'createSkill':          return actCreateSkill_(p);
      case 'updateSkill':          return actUpdateSkill_(p);
      case 'deleteSkill':          return actDeleteSkill_(p);

      case 'createCompetition':    return actCreateCompetition_(p);
      case 'updateCompetition':    return actUpdateCompetition_(p);
      case 'deleteCompetition':    return actDeleteChildRow_('Competitions', p.id, p._teamId);

      case 'notifyStatus':         return D(notifyStatus_());

      case 'parentDashboard':      return actParentDashboard_(p);

      default:                     return E(400, 'Непозната операция: ' + action);
    }
  } catch (err) {
    if (err instanceof Denied_) return E(err.status, err.message);
    throw err;
  } finally {
    try { commit_(); } catch (e) {}
    if (lock) lock.releaseLock();
  }
}

/* ============================================================
   Auth и отбор
   ============================================================ */
function passwordOk_(c, password) {
  var stored = String(c.passwordHash || '');
  password = String(password || '');
  return stored.indexOf('sha256:') === 0 ? (stored === hashPw_(password)) : (stored !== '' && stored === password);
}

// Един човек = един имейл; във всеки отбор има отделен ред в Coaches
function coachRowsByEmail_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return [];
  return readObjects_('Coaches').filter(function (x) {
    return String(x.email || '').trim().toLowerCase() === email && nb_(x.active) && x.teamId;
  });
}
function accountByEmail_(email) {
  email = String(email || '').trim().toLowerCase();
  return readObjects_('Coaches').filter(function (x) { return String(x.email || '').trim().toLowerCase() === email; })
    .sort(function (a, b) { return (nb_(b.active) ? 1 : 0) - (nb_(a.active) ? 1 : 0); })[0] || null;
}
function teamsForEmail_(email) {
  var teams = mapById_('Teams');
  return coachRowsByEmail_(email).map(function (c) {
    var t = teams[c.teamId] || {};
    return { coachId: c.id, teamId: c.teamId, teamName: t.name || 'Отбор', role: c.role || 'coach' };
  }).sort(function (a, b) { return a.teamName.localeCompare(b.teamName, 'bg'); });
}

function actLogin_(p) {
  var email = loginEmail_(p.login || p.email);
  var rows = coachRowsByEmail_(email).filter(function (c) { return passwordOk_(c, p.password); });
  if (!rows.length) return E(401, 'Грешен имейл/потребителско име или парола.');
  // Предпочитаният отбор (последно отваряният на това устройство), иначе първият
  var c = rows.filter(function (x) { return p.teamId && String(x.teamId) === String(p.teamId); })[0] || rows[0];
  return D(sessionOut_(c));
}

// Смяна на отбора без нов вход (същият имейл)
function actSwitchTeam_(p) {
  var me = findById_('Coaches', p._coachId);
  var target = coachRowsByEmail_(me && me.email).filter(function (c) { return String(c.teamId) === String(p.teamId); })[0];
  if (!target) return E(404, 'Не си член на този отбор.');
  return D(sessionOut_(target));
}

function actMyTeams_(p) {
  var me = findById_('Coaches', p._coachId);
  return D(teamsForEmail_(me && me.email));
}

// Профил: име, потребителско име, парола (важи за всички отбори на човека)
function actUpdateProfile_(p) {
  var d = p.data || {};
  var me = findById_('Coaches', p._coachId);
  var email = String(me.email || '').trim().toLowerCase();
  var patch = {};
  if (d.fullName !== undefined) {
    var n = String(d.fullName || '').trim();
    if (n.length < 2) return E(400, 'Въведи име и фамилия.');
    patch.fullName = n.slice(0, 80);
  }
  if (d.username !== undefined) {
    var ue = usernameError_(d.username); if (ue) return E(400, ue);
    var owner = usernameOwner_(d.username);
    if (owner && owner !== email) return E(400, 'Това потребителско име е заето. Избери друго.');
    patch.username = cleanUser_(d.username);
  }
  if (d.newPassword !== undefined) {
    if (!passwordOk_(me, d.currentPassword)) return E(400, 'Сегашната парола не е вярна.');
    if (String(d.newPassword || '').length < 8) return E(400, 'Новата парола трябва да е поне 8 символа.');
    patch.passwordHash = hashPw_(String(d.newPassword));
  }
  coachRowsByEmail_(email).forEach(function (c) { updateById_('Coaches', c.id, patch); });
  var fresh = findById_('Coaches', p._coachId);
  return D(sessionOut_(fresh));
}

// Нов отбор от вече влязъл треньор (ставаш собственик)
function actCreateTeam_(p) {
  var name = String((p.data || {}).teamName || '').trim();
  if (name.length < 2) return E(400, 'Въведи име на отбора.');
  var me = findById_('Coaches', p._coachId);
  var coachId = Utilities.getUuid();
  var teamId = createTeam_(name.slice(0, 60), 'free', coachId);
  var row = { id: coachId, fullName: me.fullName, email: String(me.email).trim().toLowerCase(), passwordHash: me.passwordHash,
    active: 'TRUE', createdAt: nowIso_(), teamId: teamId, role: 'owner', calendarOn: me.calendarOn || '', icsUrl: me.icsUrl || '', username: me.username || '' };
  appendObject_('Coaches', row);
  seedAchievements_(teamId);
  seedSkills_(teamId);
  return D(sessionOut_(row));
}

function sessionOut_(c) {
  var t = findById_('Teams', c.teamId) || {};
  return { token: makeToken_(c.id), coachId: c.id, fullName: c.fullName, email: c.email, username: c.username || '',
           teamId: c.teamId || null, teamName: t.name || '', role: c.role || 'coach', plan: 'free',
           teams: teamsForEmail_(c.email) };
}

// Потребителско име: 3–30 знака — букви (и кирилица), цифри, интервал, . _ -
function normUser_(u) { return String(u || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function usernameError_(u) {
  u = String(u || '').trim().replace(/\s+/g, ' ');
  if (u.length < 3 || u.length > 30) return 'Потребителското име трябва да е между 3 и 30 знака.';
  if (/@/.test(u)) return 'Потребителското име не може да съдържа @.';
  if (!/^[0-9A-Za-zА-Яа-яЁёЍѝ._ -]+$/.test(u)) return 'Потребителското име може да има само букви, цифри, интервал, точка, долна черта и тире.';
  return null;
}
// Имейл на човека, който вече ползва това потребителско име (или null)
function usernameOwner_(u) {
  var n = normUser_(u);
  if (!n) return null;
  var hit = readObjects_('Coaches').filter(function (c) { return normUser_(c.username) === n; })[0];
  return hit ? String(hit.email || '').trim().toLowerCase() : null;
}
// Вход с имейл ИЛИ потребителско име → имейлът на акаунта
function loginEmail_(login) {
  login = String(login || '').trim();
  if (login.indexOf('@') >= 0) return login.toLowerCase();
  return usernameOwner_(login) || '';
}

function validateNewCoach_(d) {
  var email = String(d.email || '').trim().toLowerCase();
  var name = String(d.fullName || '').trim();
  var pw = String(d.password || '');
  if (name.length < 2) return 'Въведи име и фамилия.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Невалиден имейл.';
  var ue = usernameError_(d.username); if (ue) return ue;
  if (pw.length < 8) return 'Паролата трябва да е поне 8 символа.';
  var taken = readObjects_('Coaches').some(function (c) { return String(c.email || '').trim().toLowerCase() === email; });
  if (taken) return 'Вече има профил с този имейл. Влез в него.';
  if (usernameOwner_(d.username)) return 'Това потребителско име е заето. Избери друго.';
  return null;
}
function cleanUser_(u) { return String(u || '').trim().replace(/\s+/g, ' ').slice(0, 30); }

function actRegister_(p) {
  var d = p.data || {};
  var teamName = String(d.teamName || '').trim();
  if (teamName.length < 2) return E(400, 'Въведи име на отбора.');
  var existing = accountByEmail_(d.email);
  if (existing && !passwordOk_(existing, d.password))
    return E(400, 'Вече има профил с този имейл. Въведи неговата парола, за да създадеш още един отбор, или влез.');
  if (!existing) { var bad = validateNewCoach_(d); if (bad) return E(400, bad); }

  var coachId = Utilities.getUuid();
  var teamId = createTeam_(teamName.slice(0, 60), 'free', coachId);
  var coach = {
    id: coachId, fullName: existing ? existing.fullName : String(d.fullName).trim().slice(0, 80), email: String(d.email).trim().toLowerCase(),
    passwordHash: existing ? existing.passwordHash : hashPw_(String(d.password)), active: 'TRUE', createdAt: nowIso_(), teamId: teamId, role: 'owner',
    username: existing ? (existing.username || '') : cleanUser_(d.username)
  };
  appendObject_('Coaches', coach);
  seedAchievements_(teamId);
  seedSkills_(teamId);
  var out = sessionOut_(coach);
  out.inviteCode = findById_('Teams', teamId).inviteCode;
  return D(out);
}

function teamByInvite_(code) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return null;
  return readObjects_('Teams').filter(function (t) { return String(t.inviteCode || '').toUpperCase() === code; })[0] || null;
}

function activeCoaches_(teamId) {
  return readObjects_('Coaches').filter(function (c) { return nb_(c.active) && String(c.teamId) === String(teamId); });
}

function actInviteInfo_(p) {
  var t = teamByInvite_(p.code);
  if (!t) return E(404, 'Поканата е невалидна или е сменена.');
  var owner = findById_('Coaches', t.ownerId) || {};
  var plan = planOf_(t);
  var used = activeCoaches_(t.id).length;
  return D({ teamName: t.name, ownerName: owner.fullName || '', seatsLeft: Math.max(0, plan.seats - used), members: used });
}

function actJoinTeam_(p) {
  var d = p.data || {};
  var t = teamByInvite_(d.code);
  if (!t) return E(404, 'Поканата е невалидна или е сменена.');
  var plan = planOf_(t);
  var email = String(d.email || '').trim().toLowerCase();
  // Вече има профил с този имейл → присъединяваме съществуващия акаунт (с неговата парола)
  var existing = accountByEmail_(email);
  if (existing) {
    if (!passwordOk_(existing, d.password)) return E(401, 'Има профил с този имейл — въведи неговата парола, за да добавиш отбора към него.');
    var mine = readObjects_('Coaches').filter(function (c) {
      return String(c.email || '').trim().toLowerCase() === email && String(c.teamId) === String(t.id);
    })[0];
    if (mine) {
      if (!nb_(mine.active)) { updateById_('Coaches', mine.id, { active: 'TRUE' }); mine.active = 'TRUE'; }
      return D(sessionOut_(mine));
    }
    var linked = { id: Utilities.getUuid(), fullName: existing.fullName, email: email, passwordHash: existing.passwordHash,
      active: 'TRUE', createdAt: nowIso_(), teamId: t.id, role: 'coach', calendarOn: existing.calendarOn || '', icsUrl: existing.icsUrl || '', username: existing.username || '' };
    appendObject_('Coaches', linked);
    return D(sessionOut_(linked));
  }
  var bad = validateNewCoach_(d);
  if (bad) return E(400, bad);

  var coach = {
    id: Utilities.getUuid(), fullName: String(d.fullName).trim().slice(0, 80), email: email,
    passwordHash: hashPw_(String(d.password)), active: 'TRUE', createdAt: nowIso_(), teamId: t.id, role: 'coach',
    username: cleanUser_(d.username)
  };
  appendObject_('Coaches', coach);
  return D(sessionOut_(coach));
}

function actTeam_(p) {
  var t = findById_('Teams', p._teamId);
  var hasDemo = !!demoState_(p._teamId);
  if (!t) return E(404, 'Отборът не е намерен.');
  var plan = planOf_(t);
  var members = activeCoaches_(t.id).map(function (c) {
    return { id: c.id, fullName: c.fullName, email: c.email, username: c.username || '', role: c.role || 'coach', createdAt: nn_(c.createdAt) };
  });
  var kids = readObjects_('Children').filter(function (c) { return String(c.teamId) === String(t.id) && nb_(c.isActive); }).length;
  return D({
    id: t.id, name: t.name, plan: 'free', planName: plan.name,
    kids: kids, members: members, isOwner: p._role === 'owner',
    inviteCode: p._role === 'owner' ? t.inviteCode : null,
    poolLength: num_(t.poolLength) || DEFAULT_POOL, hasDemo: hasDemo,
    calendarKeywords: kwText_(t)
  });
}

function mustOwner_(p) {
  if (p._role !== 'owner') throw new Denied_(403, 'Само собственикът на отбора може да прави това.');
}

function actUpdateTeam_(p) {
  mustOwner_(p);
  var d = p.data || {}, patch = {};
  if (d.name !== undefined) {
    var name = String(d.name || '').trim();
    if (name.length < 2) return E(400, 'Въведи име на отбора.');
    patch.name = name.slice(0, 60);
  }
  if (d.poolLength !== undefined) {
    var pl = poolOk_(d.poolLength);
    if (pl === null) return E(400, 'Дължината на басейна трябва да е между 5 и 100 метра.');
    patch.poolLength = String(pl);
  }
  updateById_('Teams', p._teamId, patch);
  return D(null);
}

function actSetPlan_(p) { return D(null); } // плановете са премахнати — всичко е безплатно

function actRegenerateInvite_(p) {
  mustOwner_(p);
  var code = newInviteCode_();
  updateById_('Teams', p._teamId, { inviteCode: code });
  return D({ inviteCode: code });
}

function actRemoveCoach_(p) {
  mustOwner_(p);
  if (String(p.id) === String(p._coachId)) return E(400, 'Не можеш да премахнеш себе си.');
  var c = findById_('Coaches', p.id);
  if (!c || String(c.teamId) !== p._teamId) return E(404, 'Треньорът не е намерен.');
  updateById_('Coaches', c.id, { active: 'FALSE' });
  return D(null);
}

function actCoaches_(p) {
  return D(activeCoaches_(p._teamId)
    .map(function (c) { return { id: c.id, fullName: c.fullName, email: c.email }; }));
}

/* ------------------------------------------------------------
   bootstrap — всичко, което приложението ползва постоянно,
   в ЕДНА заявка (децата, групите, уменията, наградите, треньорите)
   ------------------------------------------------------------ */
function actBootstrap_(p) {
  var stats = statsByChild_(p._teamId);
  var kids = inTeam_(readObjects_('Children'), p._teamId)
    .filter(function (c) { return nb_(c.isActive); })
    .map(function (c) { return childListOut_(c, stats[c.id]); });
  sortKids_(kids);
  return D({
    coaches: activeCoaches_(p._teamId).map(function (c) { return { id: c.id, fullName: c.fullName, email: c.email }; }),
    children: kids,
    groups: groupsOut_(p._teamId, false),
    skills: skillsOut_(p._teamId, false),
    achievements: inTeam_(readObjects_('Achievements'), p._teamId).filter(function (a) { return nb_(a.isActive); }).map(achOut_),
    levels: LEVELS, stages: STAGES, points: POINTS,
    notify: notifyStatus_(),
    team: (function () { var t = findById_('Teams', p._teamId) || {}; return { name: t.name || '', poolLength: poolOk_(t.poolLength) || DEFAULT_POOL }; })()
  });
}

/* ============================================================
   Метри: „4x6, 5x8" дължини × дължината на басейна
   ============================================================ */
function poolOk_(v) {
  var n = Number(String(v == null ? '' : v).replace(',', '.'));
  if (!isFinite(n) || n < 5 || n > 100) return null;
  return Math.round(n * 10) / 10;
}
// Връща { lengths, meters (направо в метри, напр. 4x50м), bad: [неразчетени] }
function parseSets_(txt) {
  var out = { lengths: 0, meters: 0, bad: [] };
  String(txt || '').split(/[,;+\n]+/).forEach(function (tok) {
    var t = tok.trim().toLowerCase();
    if (!t) return;
    var m = t.match(/^(\d{1,3})\s*[x×х*]\s*(\d{1,4})\s*(.*)$/) || t.match(/^()(\d{1,4})\s*(.*)$/);
    if (!m) { out.bad.push(tok.trim()); return; }
    var reps = m[1] ? Number(m[1]) : 1, n = Number(m[2]);
    var inMeters = /^(м|m|метра|метр)(?![a-zа-я])/i.test(m[3] || '');
    if (inMeters) out.meters += reps * n; else out.lengths += reps * n;
  });
  return out;
}
function metersFor_(sets, pool) {
  if (!sets) return null;
  var r = parseSets_(sets);
  var total = Math.round(r.lengths * (pool || DEFAULT_POOL) + r.meters);
  return total > 0 ? total : null;
}
// Калории (приблизително): MET на стила × кг × активно време.
// Активното време е от метрите: ~3 мин на 100 м (деца и начинаещи), 2,5 мин за възрастни.
var SWIM_MET = [
  [/делф|бътерф|butter/, 9.5], [/бруст|жаба|breast/, 5.3], [/гръб|back/, 4.8],
  [/крак|дъск|kick/, 4.0], [/ръц|pull/, 4.5], [/игр|свобод.*игр|плъзг|звезд/, 3.5], [/кроул|свобод|free/, 5.8]
];
function swimMet_(rest) {
  var t = String(rest || '').toLowerCase();
  for (var i = 0; i < SWIM_MET.length; i++) if (SWIM_MET[i][0].test(t)) return SWIM_MET[i][1];
  return 5.8;
}
function ageYears_(bd) {
  if (!bd) return null;
  var d = new Date(nd_(bd)); if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 31557600000;
}
// Тегло: въведеното в картона или приблизително по възрастта
function childKg_(c) {
  c = c || {};
  var w = Number(String(c.weightKg || '').replace(',', '.'));
  if (w >= 8 && w <= 250) return w;
  var a = ageYears_(c.birthDate);
  if (a === null) return nb_(c.isAdult) ? 70 : 30;
  if (a < 2) return 11;
  if (a <= 10) return Math.round(2 * a + 8);
  if (a < 18) return Math.round(3.5 * a - 7);
  return 70;
}
function kcalFor_(sets, pool, c) {
  if (!sets) return null;
  var kg = childKg_(c), adult = nb_((c || {}).isAdult) || (ageYears_((c || {}).birthDate) || 0) >= 18;
  var minPer100 = adult ? 2.5 : 3, kcal = 0;
  String(sets).split(/[,;+\n]+/).forEach(function (tok) {
    var t = tok.trim().toLowerCase(); if (!t) return;
    var m = t.match(/^(\d{1,3})\s*[x×х*]\s*(\d{1,4})\s*(.*)$/) || t.match(/^()(\d{1,4})\s*(.*)$/);
    if (!m) return;
    var reps = m[1] ? Number(m[1]) : 1, n = Number(m[2]), rest = m[3] || '';
    var meters = /^(м|m|метра|метр)(?![a-zа-я])/i.test(rest) ? reps * n : reps * n * (pool || DEFAULT_POOL);
    kcal += swimMet_(rest) * kg * (meters / 100 * minPer100 / 60);
  });
  return kcal > 0 ? Math.round(kcal) : null;
}
function sessionPool_(s) {
  var t = findById_('Teams', s.teamId) || {};
  return poolOk_(s.poolLength) || poolOk_(t.poolLength) || DEFAULT_POOL;
}

/* ============================================================
   Деца
   ============================================================ */
function sortKids_(list) {
  list.sort(function (a, b) {
    return ((a.firstName || '') + (a.lastName || '')).localeCompare((b.firstName || '') + (b.lastName || ''), 'bg');
  });
  return list;
}

function actChildren_(p) {
  var stats = statsByChild_(p._teamId);
  var list = inTeam_(readObjects_('Children'), p._teamId);
  if (!p.includeInactive) list = list.filter(function (c) { return nb_(c.isActive); });
  return D(sortKids_(list.map(function (c) { return childListOut_(c, stats[c.id]); })));
}

function actChild_(p) {
  var c = mustChild_(p.id, p._teamId);
  var out = childOut_(c);
  out.stats = statsByChild_(p._teamId)[c.id] || emptyStats_();
  return D(out);
}

var CHILD_TEXT_FIELDS = ['firstName','lastName','gender','level','diagnosis','objectiveCondition','allergiesMedical',
  'parentContact','emergencyContact','goals','notes','photoUrl','parentName','parentPhone','parentEmail',
  'emergencyName','emergencyPhone','medicalAlert','specialNeeds','calendarName'];

function childPatch_(d, p) {
  var patch = {};
  CHILD_TEXT_FIELDS.forEach(function (k) {
    if (d[k] !== undefined) patch[k] = d[k] === null ? '' : String(d[k]).slice(0, 2000);
  });
  if (patch.parentEmail) patch.parentEmail = patch.parentEmail.trim().toLowerCase();
  ['birthDate','trainingStartDate','medicalUntil','consentDate'].forEach(function (k) {
    if (d[k] !== undefined) patch[k] = d[k] ? nd_(d[k]) : '';
  });
  if (d.groupId !== undefined) {
    var g = d.groupId ? findById_('Groups', d.groupId) : null;
    patch.groupId = (g && String(g.teamId) === p._teamId) ? g.id : '';
  }
  if (d.weightKg !== undefined) { var w = Number(String(d.weightKg || '').replace(',', '.')); patch.weightKg = w >= 8 && w <= 250 ? String(Math.round(w * 10) / 10) : ''; }
  if (d.notifyParent !== undefined) patch.notifyParent = d.notifyParent ? 'TRUE' : 'FALSE';
  if (d.isAdult !== undefined) patch.isAdult = d.isAdult ? 'TRUE' : 'FALSE';
  if (d.isActive !== undefined) patch.isActive = d.isActive ? 'TRUE' : 'FALSE';
  return patch;
}

function actCreateChild_(p) {
  var d = p.data || {};
  if (!String(d.firstName || '').trim()) return E(400, 'Името е задължително.');
  var limit = planLimitError_(p._teamId, 1);
  if (limit) return limit;
  var row = newChildRow_(childPatch_(d, p), p._teamId);
  appendObject_('Children', row);
  return D({ id: row.id, parentCode: row.parentCode });
}

// Проверка за лимита на плана (колко плувци ще добавим)
function planLimitError_(teamId, adding) {
  var t = findById_('Teams', teamId) || {};
  var plan = planOf_(t);
  var count = inTeam_(readObjects_('Children'), teamId).filter(function (c) { return nb_(c.isActive); }).length;
  if (count + adding > plan.kids) return E(403, 'Достигнат е лимитът от ' + plan.kids + ' плувци за плана „' + plan.name + '".');
  return null;
}

// Нов ред за картон — общо за „Нов плувец" и за автоматичните картони
function newChildRow_(row, teamId) {
  row.id = Utilities.getUuid(); row.parentCode = newParentCode_(); row.createdAt = nowIso_(); row.teamId = teamId;
  row.isActive = 'TRUE';
  if (row.notifyParent === undefined) row.notifyParent = 'TRUE';
  return row;
}

function actUpdateChild_(p) {
  mustChild_(p.id, p._teamId);
  var patch = childPatch_(p.data || {}, p);
  if (!updateById_('Children', p.id, patch)) return E(404, 'Картонът не е намерен.');
  return D(null);
}

function actDeleteChild_(p) {
  mustChild_(p.id, p._teamId);
  var cid = String(p.id);
  var byChild = function (r) { return String(r.childId) === cid; };
  ['Participants', 'Progress', 'Awards', 'Competitions', 'ChildSkills'].forEach(function (n) { deleteWhere_(n, byChild); });
  deleteById_('Children', cid);
  return D(null);
}

function actRegenerateCode_(p) {
  mustChild_(p.id, p._teamId);
  var code = newParentCode_();
  if (!updateById_('Children', p.id, { parentCode: code })) return E(404, 'Картонът не е намерен.');
  return D({ parentCode: code });
}

function actChildHistory_(p) {
  var kid = mustChild_(p.id, p._teamId);
  var sessions = mapById_('Sessions');
  var coaches = coachMap_();
  var groups = mapById_('Groups');
  var out = readObjects_('Participants')
    .filter(function (pt) { return String(pt.childId) === String(p.id); })
    .map(function (pt) {
      var s = sessions[pt.sessionId] || {};
      return {
        sessionId: pt.sessionId, sessionDate: nd_(s.sessionDate), startTime: nt_(s.startTime),
        location: nn_(s.location), coachId: nn_(s.coachId),
        coachName: (coaches[s.coachId] || {}).fullName || 'Треньор',
        groupName: (groups[s.groupId] || {}).name || null, status: nn_(s.status),
        attended: tri_(pt.attended), swamWhat: nn_(pt.swamWhat),
        dailyProgress: nn_(pt.dailyProgress), mood: nn_(pt.mood), parentNote: nn_(pt.parentNote),
        sets: nn_(pt.sets), meters: s.id ? metersFor_(pt.sets, sessionPool_(s)) : null,
        kcal: s.id ? kcalFor_(pt.sets, sessionPool_(s), kid) : null
      };
    })
    .filter(function (h) { return h.sessionDate; });
  out.sort(function (a, b) {
    return (b.sessionDate + (b.startTime || '')).localeCompare(a.sessionDate + (a.startTime || ''));
  });
  return D(out);
}

function actChildProgress_(p) {
  mustChild_(p.id, p._teamId);
  var out = readObjects_('Progress')
    .filter(function (r) { return String(r.childId) === String(p.id); })
    .map(progressOut_);
  out.sort(function (a, b) {
    return (b.assessmentDate || '').localeCompare(a.assessmentDate || '') ||
           (b._createdAt || '').localeCompare(a._createdAt || '');
  });
  return D(out);
}

function actChildAchievements_(p) {
  mustChild_(p.id, p._teamId);
  return D(awardsForChild_(p.id));
}

function awardsForChild_(childId) {
  var ach = mapById_('Achievements');
  var coaches = coachMap_();
  var out = readObjects_('Awards')
    .filter(function (a) { return String(a.childId) === String(childId); })
    .map(function (a) {
      var d = ach[a.achievementId] || {};
      return { id: a.id, name: d.name || '', icon: d.icon || '🏅', reward: nn_(d.reward), category: nn_(d.category),
               awardedDate: nd_(a.awardedDate), note: nn_(a.note), coachName: (coaches[a.awardedBy] || {}).fullName || null };
    });
  out.sort(function (a, b) { return (b.awardedDate || '').localeCompare(a.awardedDate || ''); });
  return out;
}

function actChildCompetitions_(p) {
  mustChild_(p.id, p._teamId);
  return D(competitionsForChild_(p.id));
}

function competitionsForChild_(childId) {
  var list = readObjects_('Competitions')
    .filter(function (k) { return String(k.childId) === String(childId); })
    .map(function (k) {
      return { id: k.id, eventName: k.eventName || '', eventDate: nd_(k.eventDate),
               discipline: nn_(k.discipline), timeText: nn_(k.timeText), timeMs: parseTime_(k.timeText),
               place: num_(k.place), location: nn_(k.location),
               results: nn_(k.results), notes: nn_(k.notes), isPB: false };
    });
  // Личен рекорд: най-доброто време по дисциплина
  var best = {};
  list.forEach(function (k) {
    if (!k.discipline || k.timeMs == null) return;
    var key = k.discipline.toLowerCase().trim();
    if (!best[key] || k.timeMs < best[key].timeMs) best[key] = k;
  });
  Object.keys(best).forEach(function (key) {
    var count = list.filter(function (k) { return k.discipline && k.discipline.toLowerCase().trim() === key && k.timeMs != null; }).length;
    if (count > 1) best[key].isPB = true;
  });
  list.sort(function (a, b) { return (b.eventDate || '').localeCompare(a.eventDate || ''); });
  return list;
}

/* ---------------- Умения на детето ---------------- */
function actChildSkills_(p) {
  mustChild_(p.id, p._teamId);
  return D(childSkillsOut_(p.id, p._teamId));
}

function childSkillsOut_(childId, teamId) {
  var done = {};
  var coaches = coachMap_();
  readObjects_('ChildSkills').forEach(function (r) {
    if (String(r.childId) === String(childId)) done[r.skillId] = r;
  });
  return skillsOut_(teamId, false).map(function (s) {
    var r = done[s.id];
    s.done = !!r;
    s.achievedDate = r ? nd_(r.achievedDate) : null;
    s.coachName = r ? ((coaches[r.coachId] || {}).fullName || null) : null;
    return s;
  });
}

function actToggleSkill_(p) {
  var d = p.data || {};
  var child = mustChild_(d.childId, p._teamId);
  var skill = mustInTeam_('Skills', d.skillId, p._teamId, 'Умението не е намерено.');
  var existing = readObjects_('ChildSkills').filter(function (r) {
    return String(r.childId) === String(child.id) && String(r.skillId) === String(skill.id);
  })[0];
  if (existing) {
    deleteById_('ChildSkills', existing.id);
    return D({ done: false });
  }
  appendObject_('ChildSkills', {
    id: Utilities.getUuid(), childId: child.id, skillId: skill.id,
    achievedDate: d.date ? nd_(d.date) : today_(), coachId: p._coachId, note: d.note || '', createdAt: nowIso_()
  });
  queueParentEmail_(child, 'skill', 'Ново умение: ' + skill.name + ' ' + (skill.icon || ''),
    '<p><b>' + h_(child.firstName) + '</b> вече може: <b>' + h_(skill.name) + '</b> ' + h_(skill.icon || '') + '</p>' +
    '<p>+' + (num_(skill.points) || 0) + ' точки 🌟</p>');
  return D({ done: true });
}

/* ---------------- Покана към родителя (имейл с кода) ---------------- */
function actSendParentInvite_(p) {
  var child = mustChild_(p.id, p._teamId);
  if (!child.parentEmail) return E(400, 'Първо въведи имейл на родителя в картона.');
  var team = findById_('Teams', p._teamId) || {};
  var html = '<p>Здравейте' + (child.parentName ? ', ' + h_(child.parentName) : '') + '!</p>' +
    '<p>Треньорите от <b>' + h_(team.name || 'SwimWithSmile') + '</b> вече водят дневник на тренировките на <b>' +
    h_(child.firstName) + '</b>. Можете да виждате наградите, уменията и напредъка по всяко време.</p>' +
    '<p style="font-size:18px">Код за достъп: <b style="letter-spacing:2px">' + h_(child.parentCode) + '</b><br>' +
    '+ датата на раждане' + (nb_(child.isAdult) ? '' : ' на детето') + '.</p>' + appLinkHtml_('Отвори родителския достъп', '#/login?parent');
  var id = enqueue_({ teamId: p._teamId, childId: child.id, kind: 'invite', toEmail: child.parentEmail,
    toName: child.parentName || '', subject: 'Достъп до дневника на ' + child.firstName, html: html });
  var sent = sendOutboxRow_(id);
  return D({ sent: sent, queued: !sent });
}

/* ============================================================
   Групи
   ============================================================ */
function groupsOut_(teamId, includeInactive) {
  var kids = inTeam_(readObjects_('Children'), teamId).filter(function (c) { return nb_(c.isActive); });
  return inTeam_(readObjects_('Groups'), teamId)
    .filter(function (g) { return includeInactive || nb_(g.isActive); })
    .map(function (g) {
      return { id: g.id, name: g.name || '', color: nn_(g.color) || '#1F73E0', location: nn_(g.location),
               days: String(g.days || '').split(',').filter(String).map(Number), time: nn_(g.time),
               durationMin: num_(g.durationMin) || 45, isActive: nb_(g.isActive),
               count: kids.filter(function (c) { return String(c.groupId) === String(g.id); }).length };
    })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'bg'); });
}

function groupRow_(d) {
  var row = {};
  if (d.name !== undefined) row.name = String(d.name || '').trim().slice(0, 60);
  if (d.color !== undefined) row.color = String(d.color || '').slice(0, 20);
  if (d.location !== undefined) row.location = String(d.location || '').slice(0, 120);
  if (d.days !== undefined) row.days = (d.days || []).map(Number).filter(function (n) { return n >= 1 && n <= 7; }).join(',');
  if (d.time !== undefined) row.time = d.time ? String(d.time).slice(0, 5) : '';
  if (d.durationMin !== undefined) row.durationMin = numStr_(d.durationMin);
  if (d.isActive !== undefined) row.isActive = d.isActive ? 'TRUE' : 'FALSE';
  return row;
}

function actCreateGroup_(p) {
  var row = groupRow_(p.data || {});
  if (!row.name) return E(400, 'Въведи име на групата.');
  row.id = Utilities.getUuid(); row.isActive = 'TRUE'; row.createdAt = nowIso_(); row.teamId = p._teamId;
  appendObject_('Groups', row);
  var ids = (p.data || {}).childIds || [];
  ids.forEach(function (cid) {
    var c = findById_('Children', cid);
    if (c && String(c.teamId) === p._teamId) updateById_('Children', c.id, { groupId: row.id });
  });
  return D({ id: row.id });
}

function actUpdateGroup_(p) {
  mustInTeam_('Groups', p.id, p._teamId, 'Групата не е намерена.');
  var d = p.data || {};
  updateById_('Groups', p.id, groupRow_(d));
  if (d.childIds) {
    var want = {};
    d.childIds.forEach(function (id) { want[id] = 1; });
    inTeam_(readObjects_('Children'), p._teamId).forEach(function (c) {
      var inG = String(c.groupId) === String(p.id);
      if (want[c.id] && !inG) updateById_('Children', c.id, { groupId: p.id });
      else if (!want[c.id] && inG) updateById_('Children', c.id, { groupId: '' });
    });
  }
  return D(null);
}

function actDeleteGroup_(p) {
  mustInTeam_('Groups', p.id, p._teamId, 'Групата не е намерена.');
  inTeam_(readObjects_('Children'), p._teamId).forEach(function (c) {
    if (String(c.groupId) === String(p.id)) updateById_('Children', c.id, { groupId: '' });
  });
  deleteById_('Groups', p.id);
  return D(null);
}

/* ============================================================
   Тренировки
   ============================================================ */
function sessOut_(s, coaches, groups, countBy) {
  var g = groups[s.groupId] || {};
  var c = countBy ? (countBy[s.id] || { n: 0, present: 0, marked: 0 }) : null;
  return {
    id: s.id, sessionDate: nd_(s.sessionDate), startTime: nt_(s.startTime),
    coachId: nn_(s.coachId), coachName: (coaches[s.coachId] || {}).fullName || 'Треньор',
    location: nn_(s.location), notes: nn_(s.notes),
    groupId: nn_(s.groupId), groupName: g.name || null, groupColor: g.color || null,
    title: s.gcalKey ? String(s.notes || '').replace(/^От Google Calendar: /, '') || null : (!g.name && c && c.names.length ? namesTitle_(c.names) : null), fromCalendar: !!s.gcalKey,
    durationMin: num_(s.durationMin) || num_(g.durationMin) || 45,
    seriesId: nn_(s.seriesId), status: nn_(s.status), poolLength: sessionPool_(s), poolOverride: poolOk_(s.poolLength),
    participantCount: c ? c.n : undefined, presentCount: c ? c.present : undefined, markedCount: c ? c.marked : undefined
  };
}

// Индивидуална тренировка (без група) се казва на детето/децата, не на треньора
function namesTitle_(names) {
  return names.length <= 2 ? names.join(', ') : names.slice(0, 2).join(', ') + ' +' + (names.length - 2);
}
function participantCounts_() {
  var countBy = {}, kids = childMap_();
  readObjects_('Participants').forEach(function (pt) {
    var c = countBy[pt.sessionId] || (countBy[pt.sessionId] = { n: 0, present: 0, marked: 0, names: [] });
    c.n++;
    var ch = kids[pt.childId];
    if (ch && ch.firstName) c.names.push(String(ch.firstName).trim());
    var a = tri_(pt.attended);
    if (a !== null) c.marked++;
    if (a === true) c.present++;
  });
  return countBy;
}

function actSessions_(p) {
  var y = Number(p.year), m = Number(p.month);
  var prefix = y + '-' + pad2_(m);
  var coaches = coachMap_(), groups = mapById_('Groups'), countBy = participantCounts_();
  var out = inTeam_(readObjects_('Sessions'), p._teamId)
    .filter(function (s) { return nd_(s.sessionDate).slice(0, 7) === prefix; })
    .map(function (s) { return sessOut_(s, coaches, groups, countBy); });
  return D(out);
}

function sessionFull_(s, teamId) {
  var coaches = coachMap_(), groups = mapById_('Groups'), children = childMap_();
  var stats = statsByChild_(teamId);
  var out = sessOut_(s, coaches, groups, participantCounts_());
  out.participants = readObjects_('Participants')
    .filter(function (pt) { return String(pt.sessionId) === String(s.id); })
    .map(function (pt) {
      var ch = children[pt.childId] || {};
      return {
        childId: pt.childId, childName: ((ch.firstName || '') + ' ' + (ch.lastName || '')).trim(),
        firstName: ch.firstName || '', lastName: ch.lastName || '',
        medicalAlert: nn_(ch.medicalAlert), specialNeeds: nn_(ch.specialNeeds),
        absStreak: (stats[pt.childId] || {}).absStreak || 0,
        attended: tri_(pt.attended), swamWhat: nn_(pt.swamWhat),
        dailyProgress: nn_(pt.dailyProgress), mood: nn_(pt.mood), parentNote: nn_(pt.parentNote),
        sets: nn_(pt.sets), meters: metersFor_(pt.sets, out.poolLength),
        kcal: kcalFor_(pt.sets, out.poolLength, ch), kg: childKg_(ch), kgSet: !!ch.weightKg,
        adult: nb_(ch.isAdult) || (ageYears_(ch.birthDate) || 0) >= 18
      };
    })
    .sort(function (a, b) { return a.childName.localeCompare(b.childName, 'bg'); });
  out.totalMeters = out.participants.reduce(function (a, x) { return a + (x.attended !== false && x.meters ? x.meters : 0); }, 0);
  out.totalKcal = out.participants.reduce(function (a, x) { return a + (x.attended !== false && x.kcal ? x.kcal : 0); }, 0);
  return out;
}

function actSession_(p) {
  return D(sessionFull_(mustSession_(p.id, p._teamId), p._teamId));
}

// Нова тренировка — по желание повтаряща се всяка седмица до дата
function actCreateSession_(p) {
  var d = p.data || {};
  var date = nd_(d.sessionDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return E(400, 'Избери дата.');
  var group = d.groupId ? findById_('Groups', d.groupId) : null;
  if (group && String(group.teamId) !== p._teamId) group = null;

  var dates = [date];
  if (d.repeatUntil) {
    var until = nd_(d.repeatUntil);
    var days = (d.repeatDays && d.repeatDays.length) ? d.repeatDays.map(Number) : [isoDow_(date)];
    dates = [];
    var cur = parseDate_(date), end = parseDate_(until);
    var guard = 0;
    while (cur <= end && guard++ < 400) {
      var ds = fmtDate_(cur);
      if (days.indexOf(isoDow_(ds)) >= 0) dates.push(ds);
      cur.setDate(cur.getDate() + 1);
    }
    if (!dates.length) return E(400, 'Няма дни в избрания период.');
    if (dates.length > 120) return E(400, 'Максимум 120 тренировки наведнъж.');
  }

  var seriesId = dates.length > 1 ? Utilities.getUuid() : '';
  var coachId = teamCoachOr_(d.coachId, p);
  var rows = dates.map(function (ds) {
    return {
      id: Utilities.getUuid(), sessionDate: ds, startTime: nt_(d.startTime),
      coachId: coachId, location: d.location || (group && group.location) || '', notes: d.notes || '',
      createdAt: nowIso_(), teamId: p._teamId, groupId: group ? group.id : '',
      durationMin: numStr_(d.durationMin) || (group ? numStr_(group.durationMin) : ''), seriesId: seriesId, status: '',
      poolLength: poolOk_(d.poolLength) ? String(poolOk_(d.poolLength)) : ''
    };
  });
  // Хората, записани по име. Нови имена → нов картон автоматично (преди тренировката, за да не остане половин запис)
  var res = resolvePeople_(d.people, p._teamId);
  if (res.error) return res.error;
  // План (серии) за всички — по желание, напр. „4x6 кроул, 2x10 гръб"
  var plan = String(d.sets || '').trim().slice(0, 300);
  if (plan && parseSets_(plan).bad.length) return E(400, 'Не разбирам плана „' + parseSets_(plan).bad[0] + '". Пиши така: 4x6 кроул, 2x10 гръб');
  appendObjects_('Sessions', rows);

  // Плувците от групата се добавят автоматично (присъствието е „неотбелязано")
  var ids = {};
  if (group) {
    inTeam_(readObjects_('Children'), p._teamId)
      .filter(function (c) { return nb_(c.isActive) && String(c.groupId) === String(group.id); })
      .forEach(function (c) { ids[c.id] = 1; });
  }
  res.ids.forEach(function (id) { ids[id] = 1; });
  var parts = [];
  rows.forEach(function (s) {
    Object.keys(ids).forEach(function (cid) {
      parts.push({ id: Utilities.getUuid(), sessionId: s.id, childId: cid, attended: '', updatedAt: nowIso_(), sets: plan });
    });
  });
  if (parts.length) appendObjects_('Participants', parts);
  return D({ id: rows[0].id, count: rows.length, seriesId: seriesId || null, created: res.created });
}

function actUpdateSession_(p) {
  var s = mustSession_(p.id, p._teamId);
  var d = p.data || {};
  var patch = {};
  if (d.sessionDate !== undefined) patch.sessionDate = nd_(d.sessionDate);
  if (d.startTime !== undefined) patch.startTime = nt_(d.startTime);
  if (d.coachId !== undefined) patch.coachId = teamCoachOr_(d.coachId, p);
  if (d.location !== undefined) patch.location = d.location || '';
  if (d.notes !== undefined) patch.notes = d.notes || '';
  if (d.durationMin !== undefined) patch.durationMin = numStr_(d.durationMin);
  if (d.poolLength !== undefined) {
    if (d.poolLength === null || d.poolLength === '') patch.poolLength = '';
    else { var pl = poolOk_(d.poolLength); if (pl === null) return E(400, 'Дължината на басейна трябва да е между 5 и 100 метра.'); patch.poolLength = String(pl); }
  }
  if (d.groupId !== undefined) {
    var g = d.groupId ? findById_('Groups', d.groupId) : null;
    patch.groupId = (g && String(g.teamId) === p._teamId) ? g.id : '';
  }
  // „Промени и следващите от серията" — без датата
  if (d.applyToSeries && s.seriesId) {
    var from = nd_(s.sessionDate);
    var seriesPatch = {};
    Object.keys(patch).forEach(function (k) { if (k !== 'sessionDate') seriesPatch[k] = patch[k]; });
    inTeam_(readObjects_('Sessions'), p._teamId).forEach(function (x) {
      if (String(x.seriesId) === String(s.seriesId) && nd_(x.sessionDate) >= from && x.id !== s.id)
        updateById_('Sessions', x.id, seriesPatch);
    });
  }
  if (!updateById_('Sessions', p.id, patch)) return E(404, 'Тренировката не е намерена.');
  return D(null);
}

function actDeleteSession_(p) {
  var s = mustSession_(p.id, p._teamId);
  var ids = {};
  ids[s.id] = 1;
  if (p.series && s.seriesId) {
    var from = nd_(s.sessionDate);
    inTeam_(readObjects_('Sessions'), p._teamId).forEach(function (x) {
      if (String(x.seriesId) === String(s.seriesId) && nd_(x.sessionDate) >= from) ids[x.id] = 1;
    });
  }
  deleteWhere_('Participants', function (pt) { return ids[pt.sessionId]; });
  deleteWhere_('Sessions', function (x) { return ids[x.id]; });
  return D({ deleted: Object.keys(ids).length });
}

function actCancelSession_(p) {
  mustSession_(p.id, p._teamId);
  updateById_('Sessions', p.id, { status: p.cancelled === false ? '' : 'cancelled' });
  return D(null);
}

// Частичен запис: пипа само подадените полета
function actUpsertParticipant_(p) {
  var sid = p.sessionId;
  var d = p.data || {};
  mustSession_(sid, p._teamId);
  mustChild_(d.childId, p._teamId);
  var existing = readObjects_('Participants').filter(function (pt) {
    return String(pt.sessionId) === String(sid) && String(pt.childId) === String(d.childId);
  })[0];
  var patch = { updatedAt: nowIso_() };
  if (d.attended !== undefined) patch.attended = d.attended === null ? '' : (d.attended ? 'TRUE' : 'FALSE');
  ['swamWhat','dailyProgress','mood','parentNote','sets'].forEach(function (k) {
    if (d[k] !== undefined) patch[k] = d[k] === null ? '' : String(d[k]).slice(0, 2000);
  });
  if (patch.sets) {
    var ps = parseSets_(patch.sets);
    if (ps.bad.length) return E(400, 'Не разбирам „' + ps.bad[0] + '". Пиши така: 4x6, 5x8 (повторения × дължини) или 4x50м.');
  }
  if (existing) {
    updateById_('Participants', existing.id, patch);
  } else {
    if (patch.attended === undefined) patch.attended = '';
    appendObject_('Participants', Object.assign({ id: Utilities.getUuid(), sessionId: sid, childId: d.childId }, patch));
  }
  return D(null);
}

// Масово присъствие: [{childId, attended}] — един запис в таблицата
function actMarkAttendance_(p) {
  var sid = p.sessionId;
  mustSession_(sid, p._teamId);
  var items = p.items || [];
  var kids = childMap_();
  var want = {};
  items.forEach(function (it) {
    var c = kids[it.childId];
    if (c && String(c.teamId) === p._teamId)
      want[it.childId] = it.attended === null ? '' : (it.attended ? 'TRUE' : 'FALSE');
  });
  var sh = sh_('Participants');
  var vals = sh.getDataRange().getValues();
  var H = vals[0].map(String);
  var cS = H.indexOf('sessionId'), cC = H.indexOf('childId'), cA = H.indexOf('attended'), cU = H.indexOf('updatedAt');
  var seen = {}, changed = false;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][cS]) === String(sid) && want.hasOwnProperty(String(vals[i][cC]))) {
      vals[i][cA] = want[String(vals[i][cC])]; vals[i][cU] = nowIso_();
      seen[String(vals[i][cC])] = 1; changed = true;
    }
  }
  if (changed) {
    sh.getRange(1, 1, vals.length, H.length).setNumberFormat('@')
      .setValues(vals.map(function (r) { return r.map(function (v) { v = cell_(v); return v === null || v === undefined ? '' : String(v); }); }));
    invalidate_('Participants');
  }
  var add = Object.keys(want).filter(function (cid) { return !seen[cid]; }).map(function (cid) {
    return { id: Utilities.getUuid(), sessionId: sid, childId: cid, attended: want[cid], updatedAt: nowIso_() };
  });
  if (add.length) appendObjects_('Participants', add);
  return D(null);
}

// Едни и същи серии за много плувци наведнъж: items [{childId, sets}]
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
  var sh = sh_('Participants');
  var vals = sh.getDataRange().getValues();
  var H = vals[0].map(String);
  var cS = H.indexOf('sessionId'), cC = H.indexOf('childId'), cX = H.indexOf('sets'), cU = H.indexOf('updatedAt');
  if (cX < 0) return E(500, 'Липсва колона sets — обнови схемата.');
  var seen = {}, changed = false;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][cS]) === String(sid) && want.hasOwnProperty(String(vals[i][cC]))) {
      vals[i][cX] = want[String(vals[i][cC])]; vals[i][cU] = nowIso_(); seen[String(vals[i][cC])] = 1; changed = true;
    }
  }
  if (changed) {
    sh.getRange(1, 1, vals.length, H.length).setNumberFormat('@')
      .setValues(vals.map(function (r) { return r.map(function (v) { v = cell_(v); return v === null || v === undefined ? '' : String(v); }); }));
    invalidate_('Participants');
  }
  var add = Object.keys(want).filter(function (cid) { return !seen[cid]; }).map(function (cid) {
    return { id: Utilities.getUuid(), sessionId: sid, childId: cid, attended: '', sets: want[cid], updatedAt: nowIso_() };
  });
  if (add.length) appendObjects_('Participants', add);
  return D(null);
}

function actAddGroupToSession_(p) {
  mustSession_(p.sessionId, p._teamId);
  mustInTeam_('Groups', p.groupId, p._teamId, 'Групата не е намерена.');
  var present = {};
  readObjects_('Participants').forEach(function (pt) { if (String(pt.sessionId) === String(p.sessionId)) present[pt.childId] = 1; });
  var add = inTeam_(readObjects_('Children'), p._teamId)
    .filter(function (c) { return nb_(c.isActive) && String(c.groupId) === String(p.groupId) && !present[c.id]; })
    .map(function (c) { return { id: Utilities.getUuid(), sessionId: p.sessionId, childId: c.id, attended: '', updatedAt: nowIso_() }; });
  if (add.length) appendObjects_('Participants', add);
  return D({ added: add.length });
}

// Списък от хора за тренировка: [{ childId }] или [{ name, isAdult }].
// Име, което няма картон → създава се картон само с име (останалото се попълва после).
function normName_(x) { return String(x || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

function resolvePeople_(people, teamId) {
  people = Array.isArray(people) ? people.slice(0, 100) : [];
  if (!people.length) return { ids: [], created: [] };
  var all = inTeam_(readObjects_('Children'), teamId);
  var byId = {}, byName = {};
  all.forEach(function (c) {
    byId[c.id] = c;
    var full = normName_((c.firstName || '') + ' ' + (c.lastName || ''));
    if (full && !byName[full]) byName[full] = c;
    var cal = normName_(c.calendarName);
    if (cal && !byName[cal]) byName[cal] = c;
  });
  var ids = [], newRows = [], seen = {};
  people.forEach(function (x) {
    if (!x) return;
    if (x.childId) { if (byId[x.childId] && !seen[x.childId]) { seen[x.childId] = 1; ids.push(x.childId); } return; }
    var name = String(x.name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!name) return;
    var key = normName_(name);
    var hit = byName[key];
    if (hit) {
      if (!nb_(hit.isActive)) updateById_('Children', hit.id, { isActive: 'TRUE' });
      if (!seen[hit.id]) { seen[hit.id] = 1; ids.push(hit.id); }
      return;
    }
    var parts = name.split(' ');
    var row = newChildRow_({ firstName: parts.shift(), lastName: parts.join(' '),
      isAdult: x.isAdult ? 'TRUE' : 'FALSE', trainingStartDate: today_() }, teamId);
    byName[key] = row; seen[row.id] = 1;
    newRows.push(row); ids.push(row.id);
  });
  if (newRows.length) {
    var limit = planLimitError_(teamId, newRows.length);
    if (limit) return { error: limit };
    appendObjects_('Children', newRows);
  }
  return { ids: ids, created: newRows.map(function (r) { return { id: r.id, name: (r.firstName + ' ' + r.lastName).trim() }; }) };
}

function actAddPeopleToSession_(p) {
  mustSession_(p.sessionId, p._teamId);
  var res = resolvePeople_(p.people, p._teamId);
  if (res.error) return res.error;
  var present = {};
  readObjects_('Participants').forEach(function (pt) { if (String(pt.sessionId) === String(p.sessionId)) present[pt.childId] = 1; });
  var add = res.ids.filter(function (cid) { return !present[cid]; }).map(function (cid) {
    return { id: Utilities.getUuid(), sessionId: p.sessionId, childId: cid, attended: p.attended ? 'TRUE' : '', updatedAt: nowIso_() };
  });
  if (add.length) appendObjects_('Participants', add);
  return D({ added: add.length, created: res.created });
}

function actRemoveParticipant_(p) {
  mustSession_(p.sessionId, p._teamId);
  deleteWhere_('Participants', function (pt) {
    return String(pt.sessionId) === String(p.sessionId) && String(pt.childId) === String(p.childId);
  });
  return D(null);
}

/* ---------------- Отчет за посещаемост (месец) ---------------- */
function actAttendanceReport_(p) {
  var y = Number(p.year), m = Number(p.month);
  var prefix = y + '-' + pad2_(m);
  var coaches = coachMap_(), groups = mapById_('Groups');
  var sessions = inTeam_(readObjects_('Sessions'), p._teamId)
    .filter(function (s) { return nd_(s.sessionDate).slice(0, 7) === prefix && s.status !== 'cancelled'; })
    .filter(function (s) { return !p.groupId || String(s.groupId) === String(p.groupId); })
    .map(function (s) { return sessOut_(s, coaches, groups, null); })
    .sort(function (a, b) { return (a.sessionDate + a.startTime).localeCompare(b.sessionDate + b.startTime); });
  var sid = {};
  sessions.forEach(function (s) { sid[s.id] = 1; });
  var cells = {};
  readObjects_('Participants').forEach(function (pt) {
    if (!sid[pt.sessionId]) return;
    (cells[pt.childId] || (cells[pt.childId] = {}))[pt.sessionId] = tri_(pt.attended);
  });
  var rows = inTeam_(readObjects_('Children'), p._teamId)
    .filter(function (c) { return cells[c.id] || (nb_(c.isActive) && (!p.groupId || String(c.groupId) === String(p.groupId))); })
    .map(function (c) {
      var cc = cells[c.id] || {};
      var marked = 0, present = 0;
      Object.keys(cc).forEach(function (k) { if (cc[k] !== null) { marked++; if (cc[k]) present++; } });
      return { childId: c.id, name: (c.firstName + ' ' + c.lastName).trim(), specialNeeds: nn_(c.specialNeeds),
               cells: cc, marked: marked, present: present, pct: marked ? Math.round(present / marked * 100) : null };
    });
  rows.sort(function (a, b) { return a.name.localeCompare(b.name, 'bg'); });
  return D({ sessions: sessions, rows: rows });
}

/* ============================================================
   Google Calendar
   ============================================================ */
// Google Calendar на всеки треньор от отбора.
//  • Собственикът на скрипта (ти) — личният ти календар, автоматично.
//  • Другите треньори — споделят своя календар с имейла на собственика
//    („Виждане на всички подробности за събитията") и включват „Свържи" в сайта.
// В сайта излизат САМО събития, които:
//  — съдържат име на плувец от отбора (тренировка), или
//  — са почивка/отпуск/болничен (вижда се кой отсъства), или
//  — съдържат ключова дума на отбора (по подразбиране #sws).
// „#лично" в заглавието/описанието скрива събитието винаги.
var _OWNER = null;
function scriptOwnerEmail_() {
  if (_OWNER !== null) return _OWNER;
  var c = tcache_(), e = '';
  try { e = (c && c.get('OWNER')) || ''; } catch (x) {}
  if (e) return (_OWNER = e);
  // ID-то на основния календар = имейлът на собственика (не иска допълнителни разрешения)
  try { e = String(CalendarApp.getDefaultCalendar().getId() || ''); } catch (x) {}
  if (e.indexOf('@') < 0) { try { e = String(Session.getEffectiveUser().getEmail() || ''); } catch (x) {} }
  _OWNER = e.trim().toLowerCase();
  if (_OWNER && c) { try { c.put('OWNER', _OWNER, TC_TTL); } catch (x) {} }
  return _OWNER;
}
function isScriptOwner_(coach) {
  var o = scriptOwnerEmail_();
  return !!o && String(coach.email || '').trim().toLowerCase() === o;
}
function coachCalOn_(coach) {
  if (isScriptOwner_(coach)) return String(coach.calendarOn || '').toUpperCase() !== 'FALSE';
  return nb_(coach.calendarOn);
}
function coachCalendar_(coach) {
  if (!coachCalOn_(coach)) return null;
  if (isScriptOwner_(coach)) { try { return CalendarApp.getDefaultCalendar(); } catch (e) { return null; } }
  var id = String(coach.email || '').trim().toLowerCase();
  if (!id) return null;
  var cal = null;
  try { cal = CalendarApp.getCalendarById(id); } catch (e) {}
  if (!cal) { try { cal = CalendarApp.subscribeToCalendar(id, { hidden: true, selected: false }); } catch (e) {} }
  return cal;
}

// Суровите събития на един треньор (кеш 5 мин)
function rawCoachEvents_(coach, start, end, fresh) {
  var c = tcache_();
  var key = 'CAL|' + coach.id + '|' + start.getTime() + '|' + end.getTime();
  if (c && !fresh) { try { var hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) {} }
  var cal = coachCalendar_(coach);
  if (!cal) return [];
  var list = [];
  try { list = cal.getEvents(start, end) || []; } catch (e) { return []; }
  var out = list
    .filter(function (e) { return String(e.getDescription() || '').indexOf('[SwimWithSmile]') < 0; })
    .map(function (e) {
      var allDay = e.isAllDayEvent();
      var s = e.getStartTime(), en = e.getEndTime();
      var date = Utilities.formatDate(s, TZ, 'yyyy-MM-dd');
      var st = allDay ? null : Utilities.formatDate(s, TZ, 'HH:mm:ss');
      return {
        id: e.getId(), key: e.getId() + '|' + date + '|' + (st || ''),
        title: e.getTitle() || '(без заглавие)', date: date, startTime: st,
        endTime: allDay ? null : Utilities.formatDate(en, TZ, 'HH:mm:ss'),
        endDate: allDay ? Utilities.formatDate(new Date(en.getTime() - 1000), TZ, 'yyyy-MM-dd') : null,
        durationMin: allDay ? null : Math.max(15, Math.round((en.getTime() - s.getTime()) / 60000)),
        location: nn_(e.getLocation()), description: nn_((e.getDescription() || '').slice(0, 500)),
        allDay: allDay
      };
    });
  if (c) { try { var j = JSON.stringify(out); if (j.length < 90000) c.put(key, j, 300); } catch (e) {} }
  return out;
}

function readCalendar_(teamId, start, end, fresh) {
  var seen = {}, out = [];
  activeCoaches_(teamId).forEach(function (coach) {
    rawCoachEvents_(coach, start, end, fresh).forEach(function (ev) {
      if (seen[ev.key]) { // едно и също събитие в двата календара
        if (seen[ev.key].coachNames.indexOf(coach.fullName) < 0) seen[ev.key].coachNames.push(coach.fullName);
        return;
      }
      var e = JSON.parse(JSON.stringify(ev));
      e.coachId = coach.id; e.coachName = coach.fullName; e.coachNames = [coach.fullName];
      seen[ev.key] = e; out.push(e);
    });
  });
  return out;
}

function kwText_(t) {
  var v = t.calendarKeywords;
  if (v === '' || v === undefined || v === null) return CAL_DEFAULT_KEYWORDS;
  return String(v).replace(/^\s*,\s*$/, '');
}
function teamKeywords_(teamId) {
  var t = findById_('Teams', teamId) || {};
  var raw = (t.calendarKeywords === '' || t.calendarKeywords === undefined || t.calendarKeywords === null) ? CAL_DEFAULT_KEYWORDS : String(t.calendarKeywords);
  return raw.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return x.length >= 2; });
}

// Какво е събитието за сайта: 'training' | 'off' | 'event' | null (скрито)
// Показваме ВСИЧКО от Google Calendar. Скрито е само:
//  — „#лично" / „#скрий" в заглавието или описанието;
//  — събитие с дума от „Скрий събития с…" на отбора (напр. „гироси, зъболекар").
function calKind_(ev, kids, hideWords) {
  var raw = (String(ev.title || '') + ' ' + String(ev.description || '')).toLowerCase();
  if (CAL_PRIVATE.some(function (t) { return raw.indexOf(t) >= 0; })) return { kind: null };
  var title = String(ev.title || '').toLowerCase();
  if (hideWords.some(function (w) { return title.indexOf(w) >= 0; })) return { kind: null };
  var child = matchChild_(ev.title, kids);
  if (child) return { kind: 'training', child: child };
  if (CAL_OFF_WORDS.some(function (w) { return title.indexOf(w) >= 0; })) return { kind: 'off' };
  return { kind: 'event' };
}
function teamHideWords_(teamId) {
  var t = findById_('Teams', teamId) || {};
  return String(t.calendarHide || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return x.length >= 2; });
}

function actCalendarEvents_(p) {
  var y = Number(p.year), m = Number(p.month);
  return D(annotateEvents_(readCalendar_(p._teamId, new Date(y, m - 1, 1, 0, 0, 0), new Date(y, m, 1, 0, 0, 0), !!p.fresh), p._teamId));
}

// Месецът наведнъж: тренировки + календар (една заявка вместо две)
function actMonth_(p) {
  var sessions = actSessions_(p).data;
  var cal = [];
  try { cal = actCalendarEvents_(p).data; } catch (e) { cal = []; }
  return D({ sessions: sessions, calendar: cal });
}

function annotateEvents_(events, teamId) {
  if (!events.length) return [];
  var kids = inTeam_(readObjects_('Children'), teamId).filter(function (c) { return nb_(c.isActive); });
  var hideWords = teamHideWords_(teamId);
  var imported = {};
  inTeam_(readObjects_('Sessions'), teamId).forEach(function (s) { if (s.gcalKey) imported[s.gcalKey] = s.id; });
  var out = [];
  events.forEach(function (ev) {
    var k = calKind_(ev, kids, hideWords);
    if (!k.kind) return;
    ev.kind = k.kind;
    var c = k.child || null;
    ev.childId = c ? c.id : null;
    ev.childName = c ? (c.firstName + ' ' + (c.lastName || '')).trim() : null;
    ev.guessName = c || k.kind === 'off' ? null : guessName_(ev.title);
    ev.sessionId = imported[ev.key] || null;
    delete ev.description; // не изпращаме описанията (може да са лични)
    out.push(ev);
  });
  out.sort(function (a, b) { return (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')); });
  return out;
}

// Настройки: моят календар + ключовите думи на отбора
function actCalendarSettings_(p) {
  var me = findById_('Coaches', p._coachId);
  var t = findById_('Teams', p._teamId) || {};
  var status = 'off';
  if (coachCalOn_(me)) {
    var cal = null;
    try { cal = coachCalendar_(me); } catch (e) {}
    status = cal ? 'ok' : 'no-access';
  }
  return D({
    shareWith: scriptOwnerEmail_(), myEmail: me.email, isScriptOwner: isScriptOwner_(me),
    calendarOn: coachCalOn_(me), status: status,
    hideWords: String(t.calendarHide || ''),
    canEditKeywords: p._role === 'owner',
    coaches: activeCoaches_(p._teamId).map(function (c) { return { id: c.id, fullName: c.fullName, on: coachCalOn_(c) }; })
  });
}

function actUpdateCalendarSettings_(p) {
  var d = p.data || {};
  if (d.calendarOn !== undefined) {
    var me = findById_('Coaches', p._coachId);
    // Един човек → един календар: включваме/изключваме във всички негови отбори
    coachRowsByEmail_(me.email).forEach(function (c) { updateById_('Coaches', c.id, { calendarOn: d.calendarOn ? 'TRUE' : 'FALSE' }); });
  }
  if (d.hideWords !== undefined) {
    mustOwner_(p);
    var kw = String(d.hideWords || '').split(',').map(function (x) { return x.trim(); }).filter(String).slice(0, 30).join(', ');
    updateById_('Teams', p._teamId, { calendarHide: kw });
  }
  return D(null);
}

// Нормализира за сравнение: малки букви, само букви/цифри, единични интервали
function norm_(s) { return ' ' + String(s || '').toLowerCase().replace(/[^0-9a-zа-яёѝ]+/gi, ' ').replace(/\s+/g, ' ').trim() + ' '; }

// Кое дете е в заглавието? 1) „Име в календара" 2) име + фамилия 3) само име, ако е уникално
function matchChild_(title, kids) {
  var t = norm_(title);
  if (t.trim() === '') return null;
  var hit = function (needle) { needle = norm_(needle); return needle.trim() && t.indexOf(needle) >= 0; };
  var byAlias = kids.filter(function (c) {
    return String(c.calendarName || '').split(',').some(function (a) { return a.trim() && hit(a); });
  });
  if (byAlias.length === 1) return byAlias[0];
  var byFull = kids.filter(function (c) { return c.lastName && hit(c.firstName + ' ' + c.lastName); });
  if (byFull.length === 1) return byFull[0];
  var byFirst = kids.filter(function (c) { return hit(c.firstName); });
  if (byFirst.length === 1) {
    var same = kids.filter(function (c) { return norm_(c.firstName) === norm_(byFirst[0].firstName); });
    if (same.length === 1) return byFirst[0];
  }
  return null;
}

// Първата дума, която прилича на име (за „Нов картон")
function guessName_(title) {
  var stop = { 'тренировка': 1, 'плуване': 1, 'басейн': 1, 'индивидуална': 1, 'индивидуално': 1, 'урок': 1, 'час': 1, 'с': 1, 'и': 1, 'за': 1 };
  var words = String(title || '').replace(/[^A-Za-zА-Яа-яЁёЍѝ\s-]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && !stop[w.toLowerCase()]; });
  return words.length ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : null;
}

// „Това е Йоан" → пазим името от календара в картона, за да се познава занапред
function actLinkCalendarName_(p) {
  var c = mustChild_(p.childId, p._teamId);
  var name = String(p.name || '').trim().slice(0, 60);
  if (!name) return D(null);
  var list = String(c.calendarName || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (list.map(function (x) { return x.toLowerCase(); }).indexOf(name.toLowerCase()) < 0) list.push(name);
  updateById_('Children', c.id, { calendarName: list.join(', ') });
  return D({ calendarName: list.join(', ') });
}

// Събития от календара → тренировки в графика (с детето вътре). Не се дублират.
function actImportCalendarEvents_(p) {
  var items = p.items || [];
  var imported = {};
  inTeam_(readObjects_('Sessions'), p._teamId).forEach(function (s) { if (s.gcalKey) imported[s.gcalKey] = s.id; });
  var sessions = [], parts = [], out = [];
  items.forEach(function (it) {
    if (!it.key || !it.date) return;
    if (imported[it.key]) { out.push({ key: it.key, sessionId: imported[it.key], existed: true }); return; }
    var child = it.childId ? mustChild_(it.childId, p._teamId) : null;
    var id = Utilities.getUuid();
    sessions.push({ id: id, sessionDate: nd_(it.date), startTime: nt_(it.startTime || '17:00'), coachId: p._coachId,
      location: it.location || '', notes: it.title ? 'От Google Calendar: ' + String(it.title).slice(0, 200) : '',
      createdAt: nowIso_(), teamId: p._teamId, groupId: '', durationMin: numStr_(it.durationMin), seriesId: '', status: '', gcalKey: it.key });
    if (child) parts.push({ id: Utilities.getUuid(), sessionId: id, childId: child.id, attended: '', updatedAt: nowIso_() });
    imported[it.key] = id;
    out.push({ key: it.key, sessionId: id, existed: false });
  });
  appendObjects_('Sessions', sessions);
  appendObjects_('Participants', parts);
  return D({ created: sessions.length, items: out });
}

// Ключ за абонамент: Google Calendar → „От URL" → <API>?ics=КЛЮЧ
function actCalendarFeed_(p) {
  var t = findById_('Teams', p._teamId);
  if (!t) return E(404, 'Отборът не е намерен.');
  var key = t.icsKey;
  if (!key || p.regenerate) {
    if (p.regenerate) mustOwner_(p);
    key = newKey_();
    updateById_('Teams', t.id, { icsKey: key });
  }
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  return D({ key: key, coachId: p._coachId, serviceUrl: url });
}

function buildIcs_(key, coachId) {
  var team = readObjects_('Teams').filter(function (t) { return t.icsKey && String(t.icsKey) === String(key); })[0];
  if (!team) throw new Error('Невалиден ключ.');
  var coaches = coachMap_(), groups = mapById_('Groups'), countBy = participantCounts_();
  var from = fmtDate_(addDays_(new Date(), -60)), to = fmtDate_(addDays_(new Date(), 180));
  var lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SwimWithSmile//BG', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsEsc_('Плуване · ' + (team.name || 'SwimWithSmile')),
    'X-WR-TIMEZONE:' + TZ, 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Sofia',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'TZNAME:EEST', 'DTSTART:19700329T030000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'TZNAME:EET', 'DTSTART:19701025T040000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'
  ];
  var stamp = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  inTeam_(readObjects_('Sessions'), team.id).forEach(function (s) {
    var ds = nd_(s.sessionDate);
    if (!ds || ds < from || ds > to) return;
    if (coachId && String(s.coachId) !== String(coachId)) return;
    if (s.gcalKey) return; // внесена от Google Calendar → вече е там
    var o = sessOut_(s, coaches, groups, countBy);
    var st = (o.startTime || '17:00:00').slice(0, 5);
    var start = parseDate_(ds);
    start.setHours(Number(st.slice(0, 2)), Number(st.slice(3, 5)), 0, 0);
    var end = new Date(start.getTime() + (o.durationMin || 45) * 60000);
    var title = (o.status === 'cancelled' ? '❌ ОТМЕНЕНА · ' : '🏊 ') + (o.groupName || 'Тренировка') + ' · ' + String(o.coachName).split(' ')[0];
    var desc = [o.participantCount ? 'Деца: ' + o.participantCount : '', o.notes || '', '[SwimWithSmile]'].filter(String).join('\n');
    lines.push('BEGIN:VEVENT', 'UID:' + s.id + '@swimwithsmile', 'DTSTAMP:' + stamp,
      'DTSTART;TZID=Europe/Sofia:' + icsLocal_(start), 'DTEND;TZID=Europe/Sofia:' + icsLocal_(end),
      'SUMMARY:' + icsEsc_(title), 'DESCRIPTION:' + icsEsc_(desc));
    if (o.location) lines.push('LOCATION:' + icsEsc_(o.location));
    if (o.status === 'cancelled') lines.push('STATUS:CANCELLED');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(icsFold_).join('\r\n') + '\r\n';
}

function icsLocal_(d) {
  return d.getFullYear() + pad2_(d.getMonth() + 1) + pad2_(d.getDate()) + 'T' + pad2_(d.getHours()) + pad2_(d.getMinutes()) + '00';
}
function icsEsc_(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsFold_(line) {
  // RFC 5545: редове до 75 байта (кирилицата е 2 байта, емоджитата — 4)
  var chars = Array.from(line), out = [], cur = '', bytes = 0, limit = 74;
  chars.forEach(function (ch) {
    var c = ch.codePointAt(0), b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 74; }
    cur += ch; bytes += b;
  });
  out.push(cur);
  return out.join('\r\n');
}

/* ============================================================
   Напредък
   ============================================================ */
function actCreateProgress_(p) {
  var d = p.data || {};
  var child = mustChild_(d.childId, p._teamId);
  var id = Utilities.getUuid();
  appendObject_('Progress', {
    id: id, childId: d.childId || '', coachId: p._coachId,
    assessmentDate: nd_(d.assessmentDate), periodLabel: d.periodLabel || '',
    jumpsAthletics: numStr_(d.jumpsAthletics), balanceCoordination: numStr_(d.balanceCoordination),
    strengthEndurance: numStr_(d.strengthEndurance), basicSkillsComment: d.basicSkillsComment || '',
    physStrength: numStr_(d.physStrength), physFlexibility: numStr_(d.physFlexibility),
    physEndurance: numStr_(d.physEndurance), physCoordination: numStr_(d.physCoordination),
    teamwork: numStr_(d.teamwork), discipline: numStr_(d.discipline),
    motivation: numStr_(d.motivation), concentration: numStr_(d.concentration),
    nextGoals: d.nextGoals || '', coachNotes: d.coachNotes || '', createdAt: nowIso_()
  });
  queueParentEmail_(child, 'progress', 'Нова оценка на напредъка на ' + child.firstName,
    '<p>Треньорът попълни нова карта за напредък' + (d.periodLabel ? ' (<b>' + h_(d.periodLabel) + '</b>)' : '') + '.</p>' +
    (d.nextGoals ? '<p>Следваща цел: <b>' + h_(d.nextGoals) + '</b></p>' : ''));
  return D({ id: id });
}

/* ============================================================
   Постижения (награди)
   ============================================================ */
function achOut_(a) {
  return { id: a.id, name: a.name || '', icon: a.icon || '🏅', category: nn_(a.category),
           reward: nn_(a.reward), isActive: nb_(a.isActive) };
}

function actAchievements_(p) {
  var list = inTeam_(readObjects_('Achievements'), p._teamId);
  if (!p.includeInactive) list = list.filter(function (a) { return nb_(a.isActive); });
  var counts = {};
  readObjects_('Awards').forEach(function (a) { counts[a.achievementId] = (counts[a.achievementId] || 0) + 1; });
  return D(list.map(function (a) { var o = achOut_(a); o.awardedCount = counts[a.id] || 0; return o; }));
}

function actCreateAchievement_(p) {
  var d = p.data || {};
  var id = Utilities.getUuid();
  appendObject_('Achievements', {
    id: id, name: d.name || '', icon: d.icon || '🏅', category: d.category || '',
    reward: d.reward || '', isActive: 'TRUE', createdAt: nowIso_(), teamId: p._teamId
  });
  return D({ id: id });
}

function actUpdateAchievement_(p) {
  mustInTeam_('Achievements', p.id, p._teamId, 'Постижението не е намерено.');
  var d = p.data || {};
  var patch = {};
  ['name','icon','category','reward'].forEach(function (k) { if (d[k] !== undefined) patch[k] = d[k] === null ? '' : d[k]; });
  if (d.isActive !== undefined) patch.isActive = d.isActive ? 'TRUE' : 'FALSE';
  if (!updateById_('Achievements', p.id, patch)) return E(404, 'Постижението не е намерено.');
  return D(null);
}

function actDeleteAchievement_(p) {
  mustInTeam_('Achievements', p.id, p._teamId, 'Постижението не е намерено.');
  deleteWhere_('Awards', function (a) { return String(a.achievementId) === String(p.id); });
  deleteById_('Achievements', p.id);
  return D(null);
}

function actAward_(p) {
  var d = p.data || {};
  var ids = d.childIds && d.childIds.length ? d.childIds : [d.childId];
  var ach = mustInTeam_('Achievements', d.achievementId, p._teamId, 'Постижението не е намерено.');
  var kids = ids.map(function (cid) { return mustChild_(cid, p._teamId); });
  var rows = kids.map(function (c) {
    return { id: Utilities.getUuid(), childId: c.id, achievementId: ach.id,
             awardedDate: d.awardedDate ? nd_(d.awardedDate) : today_(), awardedBy: p._coachId,
             note: d.note || '', createdAt: nowIso_() };
  });
  appendObjects_('Awards', rows);
  kids.forEach(function (c) {
    queueParentEmail_(c, 'award', c.firstName + ' получи награда: ' + ach.name + ' ' + (ach.icon || ''),
      '<p style="font-size:42px;margin:0">' + h_(ach.icon || '🏅') + '</p>' +
      '<p><b>' + h_(c.firstName) + '</b> получи постижението <b>„' + h_(ach.name) + '"</b>' +
      (ach.reward ? ' и печели <b>' + h_(ach.reward) + '</b> 🎁' : '') + '.</p>' +
      (d.note ? '<p><i>„' + h_(d.note) + '"</i></p>' : ''));
  });
  return D({ id: rows[0].id, count: rows.length });
}

/* ============================================================
   Умения (стълба)
   ============================================================ */
function skillsOut_(teamId, includeInactive) {
  return inTeam_(readObjects_('Skills'), teamId)
    .filter(function (s) { return includeInactive || nb_(s.isActive); })
    .map(function (s) {
      return { id: s.id, name: s.name || '', icon: s.icon || '⭐', stage: num_(s.stage) || 1,
               stageName: STAGES[num_(s.stage) || 1] || '', points: num_(s.points) || 0,
               sortOrder: num_(s.sortOrder) || 0, isActive: nb_(s.isActive) };
    })
    .sort(function (a, b) { return (a.stage - b.stage) || (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'bg'); });
}

function actCreateSkill_(p) {
  var d = p.data || {};
  var name = String(d.name || '').trim();
  if (!name) return E(400, 'Въведи име на умението.');
  var stage = Math.min(4, Math.max(1, Number(d.stage) || 1));
  var id = Utilities.getUuid();
  appendObject_('Skills', { id: id, name: name.slice(0, 80), icon: d.icon || '⭐', stage: String(stage),
    points: numStr_(d.points) || String(STAGE_POINTS[stage]), sortOrder: String(Date.now() % 100000),
    isActive: 'TRUE', createdAt: nowIso_(), teamId: p._teamId });
  return D({ id: id });
}

function actUpdateSkill_(p) {
  mustInTeam_('Skills', p.id, p._teamId, 'Умението не е намерено.');
  var d = p.data || {};
  var patch = {};
  if (d.name !== undefined) patch.name = String(d.name || '').trim().slice(0, 80);
  if (d.icon !== undefined) patch.icon = d.icon || '⭐';
  if (d.stage !== undefined) patch.stage = String(Math.min(4, Math.max(1, Number(d.stage) || 1)));
  if (d.points !== undefined) patch.points = numStr_(d.points);
  if (d.isActive !== undefined) patch.isActive = d.isActive ? 'TRUE' : 'FALSE';
  updateById_('Skills', p.id, patch);
  return D(null);
}

function actDeleteSkill_(p) {
  mustInTeam_('Skills', p.id, p._teamId, 'Умението не е намерено.');
  deleteWhere_('ChildSkills', function (r) { return String(r.skillId) === String(p.id); });
  deleteById_('Skills', p.id);
  return D(null);
}

/* ============================================================
   Състезания
   ============================================================ */
function competitionRow_(d) {
  var row = {};
  ['eventName','results','notes','discipline','location'].forEach(function (k) {
    if (d[k] !== undefined) row[k] = d[k] === null ? '' : String(d[k]).slice(0, 500);
  });
  if (d.timeText !== undefined) row.timeText = d.timeText ? String(d.timeText).trim().replace(',', '.') : '';
  if (d.place !== undefined) row.place = numStr_(d.place);
  if (d.eventDate !== undefined) row.eventDate = nd_(d.eventDate);
  return row;
}

function actCreateCompetition_(p) {
  var d = p.data || {};
  var child = mustChild_(d.childId, p._teamId);
  var row = competitionRow_(d);
  if (!row.eventName) return E(400, 'Въведи име на състезанието.');
  row.id = Utilities.getUuid(); row.childId = child.id; row.createdBy = p._coachId; row.createdAt = nowIso_();
  appendObject_('Competitions', row);
  var place = num_(row.place);
  queueParentEmail_(child, 'competition', 'Резултат от ' + row.eventName,
    '<p><b>' + h_(child.firstName) + '</b> участва в <b>' + h_(row.eventName) + '</b>' +
    (row.location ? ' (' + h_(row.location) + ')' : '') + '.</p>' +
    (row.discipline ? '<p>' + h_(row.discipline) + (row.timeText ? ' — <b>' + h_(row.timeText) + '</b>' : '') + '</p>' : '') +
    (place ? '<p style="font-size:20px">' + (place <= 3 ? ['🥇', '🥈', '🥉'][place - 1] + ' ' : '') + '<b>' + place + ' място</b></p>' : ''));
  return D({ id: row.id });
}

function actUpdateCompetition_(p) {
  mustChildRow_('Competitions', p.id, p._teamId);
  if (!updateById_('Competitions', p.id, competitionRow_(p.data || {}))) return E(404, 'Състезанието не е намерено.');
  return D(null);
}

/* ============================================================
   Статистика: точки, ниво, посещаемост — смята се на живо
   ============================================================ */
function emptyStats_() {
  return { points: 0, level: levelFor_(0), marked: 0, present: 0, pct: null, pct30: null,
           streak: 0, absStreak: 0, lastSeen: null, lastMarked: null, skills: 0, awards: 0, competitions: 0,
           meters: 0, meters30: 0, kcal: 0 };
}

function levelFor_(points) {
  var cur = LEVELS[0], next = null;
  for (var i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
  }
  var idx = LEVELS.indexOf(cur);
  return { no: idx + 1, name: cur.name, icon: cur.icon, min: cur.min,
           next: next ? { name: next.name, icon: next.icon, min: next.min } : null,
           progress: next ? Math.round((points - cur.min) / (next.min - cur.min) * 100) : 100 };
}

var _SC = {};
function statsByChild_(teamId) {
  if (_SC[teamId]) return _SC[teamId];
  return (_SC[teamId] = computeStats_(teamId));
}

function computeStats_(teamId) {
  var kids = inTeam_(readObjects_('Children'), teamId);
  var out = {};
  var kidById = {};
  kids.forEach(function (c) { out[c.id] = emptyStats_(); out[c.id]._hist = []; kidById[c.id] = c; });

  var sessions = mapById_('Sessions');
  var todayS = today_(), d30 = fmtDate_(addDays_(new Date(), -30));
  readObjects_('Participants').forEach(function (pt) {
    var st = out[pt.childId]; if (!st) return;
    var s = sessions[pt.sessionId]; if (!s || s.status === 'cancelled') return;
    var a = tri_(pt.attended); if (a === null) return;
    var ds = nd_(s.sessionDate); if (ds > todayS) return;
    st._hist.push({ k: ds + nt_(s.startTime), a: a, d: ds });
    if (a && pt.sets) { var pl = sessionPool_(s), mt = metersFor_(pt.sets, pl); if (mt) { st.meters += mt; if (ds >= d30) st.meters30 += mt; st.kcal += kcalFor_(pt.sets, pl, kidById[pt.childId]) || 0; } }
  });
  var skillPts = {};
  inTeam_(readObjects_('Skills'), teamId).forEach(function (s) { skillPts[s.id] = num_(s.points) || 0; });
  readObjects_('ChildSkills').forEach(function (r) {
    var st = out[r.childId]; if (!st || skillPts[r.skillId] === undefined) return;
    st.skills++; st.points += skillPts[r.skillId];
  });
  readObjects_('Awards').forEach(function (a) { var st = out[a.childId]; if (st) { st.awards++; st.points += POINTS.award; } });
  readObjects_('Competitions').forEach(function (k) {
    var st = out[k.childId]; if (!st) return;
    st.competitions++; st.points += POINTS.competition;
    var pl = num_(k.place);
    if (pl === 1) st.points += POINTS.place1; else if (pl === 2) st.points += POINTS.place2; else if (pl === 3) st.points += POINTS.place3;
  });

  Object.keys(out).forEach(function (id) {
    var st = out[id], h = st._hist;
    h.sort(function (a, b) { return a.k.localeCompare(b.k); });
    var m30 = 0, p30 = 0;
    h.forEach(function (x) {
      st.marked++; st.lastMarked = x.d; if (x.a) { st.present++; st.lastSeen = x.d; }
      if (x.d >= d30) { m30++; if (x.a) p30++; }
    });
    for (var i = h.length - 1; i >= 0 && h[i].a; i--) st.streak++;
    for (var j = h.length - 1; j >= 0 && !h[j].a; j--) st.absStreak++;
    st.pct = st.marked ? Math.round(st.present / st.marked * 100) : null;
    st.pct30 = m30 ? Math.round(p30 / m30 * 100) : null;
    st.points += st.present * POINTS.attended;
    st.level = levelFor_(st.points);
    delete st._hist;
  });
  return out;
}

/* ============================================================
   Днес — един екран: тренировки днес + сигнали
   ============================================================ */
function actToday_(p) {
  var date = p.date ? nd_(p.date) : today_();
  var sessions = inTeam_(readObjects_('Sessions'), p._teamId)
    .filter(function (s) { return nd_(s.sessionDate) === date; })
    .sort(function (a, b) { return nt_(a.startTime).localeCompare(nt_(b.startTime)); })
    .map(function (s) { return sessionFull_(s, p._teamId); });

  // Следващите 7 дни (само заглавия)
  var coaches = coachMap_(), groups = mapById_('Groups'), countBy = participantCounts_();
  var until = fmtDate_(addDays_(parseDate_(date), 7));
  var upcoming = inTeam_(readObjects_('Sessions'), p._teamId)
    .filter(function (s) { var d = nd_(s.sessionDate); return d > date && d <= until; })
    .map(function (s) { return sessOut_(s, coaches, groups, countBy); })
    .sort(function (a, b) { return (a.sessionDate + a.startTime).localeCompare(b.sessionDate + b.startTime); })
    .slice(0, 8);

  var d0 = parseDate_(date); d0.setHours(0, 0, 0, 0);
  var calendar = [];
  try {
    calendar = annotateEvents_(readCalendar_(p._teamId, d0, new Date(d0.getTime() + 86400000), !!p.fresh), p._teamId)
      .filter(function (e) { return !e.sessionId && (!e.allDay || e.kind === 'off'); });
  } catch (e) { calendar = []; }
  return D({ date: date, sessions: sessions, upcoming: upcoming, calendar: calendar, alerts: alertsFor_(p._teamId, date) });
}

function alertsFor_(teamId, date) {
  var stats = statsByChild_(teamId);
  var alerts = [];
  var soon = fmtDate_(addDays_(parseDate_(date), 30));
  var md = date.slice(5), week = [];
  for (var i = 0; i < 7; i++) week.push(fmtDate_(addDays_(parseDate_(date), i)).slice(5));
  inTeam_(readObjects_('Children'), teamId).filter(function (c) { return nb_(c.isActive); }).forEach(function (c) {
    var name = (c.firstName + ' ' + c.lastName).trim();
    var st = stats[c.id] || emptyStats_();
    if (st.absStreak >= 2)
      alerts.push({ kind: 'absence', level: st.absStreak >= 3 ? 'high' : 'mid', childId: c.id, childName: name,
        text: 'Отсъства ' + st.absStreak + ' поредни тренировки' + (c.specialNeeds ? ' · СОП — нужно е постоянство' : '') });
    var mu = nd_(c.medicalUntil);
    if (mu && mu < date) alerts.push({ kind: 'medical', level: 'high', childId: c.id, childName: name, text: 'Медицинското е изтекло на ' + bgDate_(mu) });
    else if (mu && mu <= soon) alerts.push({ kind: 'medical', level: 'mid', childId: c.id, childName: name, text: 'Медицинското изтича на ' + bgDate_(mu) });
    var bd = nd_(c.birthDate).slice(5);
    if (bd && bd === md) alerts.push({ kind: 'birthday', level: 'fun', childId: c.id, childName: name, text: 'Има рожден ден днес! 🎂' });
    else if (bd && week.indexOf(bd) > 0) alerts.push({ kind: 'birthday', level: 'fun', childId: c.id, childName: name, text: 'Рожден ден на ' + bd.split('-').reverse().join('.') + ' 🎂' });
    if (!nb_(c.isAdult) && !c.parentPhone && !c.emergencyPhone && !c.emergencyContact && !c.parentContact)
      alerts.push({ kind: 'contact', level: 'mid', childId: c.id, childName: name, text: 'Няма телефон за спешна връзка' });
  });
  var rank = { high: 0, mid: 1, fun: 2 };
  alerts.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
  return alerts;
}

/* ============================================================
   Родителски достъп (публично) — без здравни данни
   ============================================================ */
function actParentDashboard_(p) {
  var code = String(p.code || '').trim();
  var bd = nd_(p.birthDate);
  if (!/^\d{8}$/.test(code) || !bd) return E(400, 'Въведи кода и датата на раждане.');
  var child = readObjects_('Children').filter(function (c) {
    return String(c.parentCode || '') === code && nd_(c.birthDate) === bd && nb_(c.isActive);
  })[0];
  if (!child) return E(404, 'Няма профил с този код и дата на раждане.');

  var teamId = String(child.teamId);
  var team = findById_('Teams', teamId) || {};
  var stats = statsByChild_(teamId)[child.id] || emptyStats_();
  var sessions = mapById_('Sessions');
  var coaches = coachMap_(), groups = mapById_('Groups');
  var todayS = today_();

  var history = readObjects_('Participants')
    .filter(function (pt) { return String(pt.childId) === String(child.id); })
    .map(function (pt) {
      var s = sessions[pt.sessionId] || {};
      return { sessionDate: nd_(s.sessionDate), startTime: nt_(s.startTime),
               coachName: (coaches[s.coachId] || {}).fullName || 'Треньор', status: nn_(s.status),
               groupName: (groups[s.groupId] || {}).name || null, location: nn_(s.location),
               attended: tri_(pt.attended), mood: nn_(pt.mood),
               dailyProgress: nn_(pt.dailyProgress), parentNote: nn_(pt.parentNote),
               meters: s.id && tri_(pt.attended) === true ? metersFor_(pt.sets, sessionPool_(s)) : null,
               kcal: s.id && tri_(pt.attended) === true ? kcalFor_(pt.sets, sessionPool_(s), child) : null };
    })
    .filter(function (h) { return h.sessionDate; })
    .sort(function (a, b) { return (b.sessionDate + b.startTime).localeCompare(a.sessionDate + a.startTime); });

  var past = history.filter(function (h) { return h.sessionDate <= todayS; });
  var upcoming = history.filter(function (h) { return h.sessionDate > todayS && h.status !== 'cancelled'; }).reverse().slice(0, 5)
    .map(function (h) { return { sessionDate: h.sessionDate, startTime: h.startTime, coachName: h.coachName, location: h.location, groupName: h.groupName }; });

  var progs = readObjects_('Progress')
    .filter(function (r) { return String(r.childId) === String(child.id); })
    .map(progressOut_)
    .sort(function (a, b) { return (b.assessmentDate || '').localeCompare(a.assessmentDate || ''); })
    .map(function (r) { delete r.coachNotes; delete r._createdAt; return r; });

  return D({
    teamName: team.name || '',
    child: {
      firstName: child.firstName, lastName: child.lastName, birthDate: nd_(child.birthDate),
      level: nn_(child.level), goals: nn_(child.goals), ageYears: nd_(child.birthDate) ? ageFromBd_(nd_(child.birthDate)) : null, isAdult: nb_(child.isAdult),
      groupName: (groups[child.groupId] || {}).name || null
    },
    stats: stats,
    skills: childSkillsOut_(child.id, teamId),
    achievements: awardsForChild_(child.id).map(function (a) { return { icon: a.icon, name: a.name, reward: a.reward, awardedDate: a.awardedDate, note: a.note }; }),
    competitions: competitionsForChild_(child.id).map(function (k) { delete k.notes; return k; }),
    history: past.slice(0, 60),
    upcoming: upcoming,
    progress: progs[0] || null,
    previousProgress: progs[1] || null,
    levels: LEVELS
  });
}

/* ============================================================
   Известия по имейл — Brevo (безплатно до 300 имейла/ден)
   ------------------------------------------------------------
   Имейлите се пишат в таб „Outbox" и се изпращат от тригер на
   всеки 10 минути. Нищо не спира, ако Brevo не е настроен.
   ============================================================ */
function notifyStatus_() {
  var pr = PropertiesService.getScriptProperties();
  return { enabled: !!(pr.getProperty('BREVO_KEY') && pr.getProperty('BREVO_SENDER')), sender: pr.getProperty('BREVO_SENDER') || null };
}

function setupNotifications() {
  var ui = SpreadsheetApp.getUi();
  var pr = PropertiesService.getScriptProperties();
  var r1 = ui.prompt('Brevo API ключ', 'Brevo → SMTP & API → API Keys → Generate. Постави ключа (xkeysib-…):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var r2 = ui.prompt('Имейл на подателя', 'Имейл, потвърден в Brevo (Senders), напр. info@swimwithsmile.bg:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var r3 = ui.prompt('Адрес на сайта', 'Напр. https://swimwithsmile.netlify.app (за линковете в имейлите):', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  pr.setProperty('BREVO_KEY', r1.getResponseText().trim());
  pr.setProperty('BREVO_SENDER', r2.getResponseText().trim());
  pr.setProperty('BREVO_NAME', 'SwimWithSmile');
  pr.setProperty('APP_URL', r3.getResponseText().trim().replace(/\/+$/, ''));

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['processOutbox', 'dailyDigest'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processOutbox').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(7).everyDays(1).inTimezone(TZ).create();
  ui.alert('Готово! Известията са включени.\n\n• Имейлите към родителите тръгват до 10 мин.\n• Всяка сутрин в 7:00 треньорите получават сигнали (отсъствия, медицински, рождени дни).\n• В неделя родителите получават седмично обобщение.');
}

function sendTestEmail() {
  var me = Session.getActiveUser().getEmail();
  var ok = sendBrevo_(me, 'Тест', 'Тестов имейл от SwimWithSmile', wrapEmail_('<p>Ако виждаш това, известията работят. 🎉</p>'));
  SpreadsheetApp.getUi().alert(ok === true ? 'Изпратено до ' + me : 'Грешка: ' + ok);
}

function enqueue_(o) {
  var id = Utilities.getUuid();
  appendObject_('Outbox', { id: id, teamId: o.teamId || '', childId: o.childId || '', kind: o.kind || '',
    toEmail: o.toEmail, toName: o.toName || '', subject: o.subject, html: o.html,
    status: 'pending', createdAt: nowIso_(), sentAt: '', error: '' });
  return id;
}

function queueParentEmail_(child, kind, subject, bodyHtml) {
  if (!child || !child.parentEmail || !nb_(child.notifyParent === '' ? 'TRUE' : child.notifyParent)) return;
  if (!notifyStatus_().enabled) return;
  enqueue_({ teamId: child.teamId, childId: child.id, kind: kind, toEmail: child.parentEmail, toName: child.parentName || '',
    subject: subject, html: bodyHtml + appLinkHtml_('Виж напредъка', '#/login?parent') +
      '<p style="color:#7E93B4;font-size:12px">Код за достъп: ' + h_(child.parentCode) + '</p>' });
}

function appLinkHtml_(label, hash) {
  var url = PropertiesService.getScriptProperties().getProperty('APP_URL');
  if (!url) return '';
  return '<p style="margin:22px 0"><a href="' + h_(url + '/' + hash) + '" style="background:#1F73E0;color:#fff;padding:12px 22px;border-radius:99px;text-decoration:none;font-weight:700">' + h_(label) + '</a></p>';
}

function wrapEmail_(inner) {
  return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0B2545;line-height:1.5">' +
    '<div style="background:linear-gradient(135deg,#46D6F7,#1F5FD6);color:#fff;padding:18px 22px;border-radius:16px 16px 0 0;font-weight:800;font-size:18px">🌊 SwimWithSmile</div>' +
    '<div style="background:#fff;border:1px solid #E3ECFA;border-top:0;padding:22px;border-radius:0 0 16px 16px">' + inner + '</div>' +
    '<p style="color:#7E93B4;font-size:12px;text-align:center">Получавате този имейл, защото тренирате (или детето ви тренира) с отбор в SwimWithSmile. За отписване кажете на треньора.</p></div>';
}

function sendBrevo_(toEmail, toName, subject, html) {
  var pr = PropertiesService.getScriptProperties();
  var key = pr.getProperty('BREVO_KEY'), sender = pr.getProperty('BREVO_SENDER');
  if (!key || !sender) return 'Brevo не е настроен';
  try {
    var res = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'api-key': key, accept: 'application/json' },
      payload: JSON.stringify({ sender: { name: pr.getProperty('BREVO_NAME') || 'SwimWithSmile', email: sender },
        to: [{ email: toEmail, name: toName || undefined }], subject: subject, htmlContent: html })
    });
    var code = res.getResponseCode();
    return code >= 200 && code < 300 ? true : ('HTTP ' + code + ': ' + res.getContentText().slice(0, 200));
  } catch (e) { return String(e && e.message || e); }
}

function sendOutboxRow_(id) {
  var row = findById_('Outbox', id);
  if (!row || row.status === 'sent') return false;
  var r = sendBrevo_(row.toEmail, row.toName, row.subject, wrapEmail_(row.html));
  updateById_('Outbox', id, r === true ? { status: 'sent', sentAt: nowIso_(), error: '' }
                                       : { status: 'error', error: String(r).slice(0, 300) });
  return r === true;
}

// Тригер на 10 минути
function processOutbox() {
  if (!notifyStatus_().enabled) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var pending = readObjects_('Outbox').filter(function (r) { return r.status === 'pending'; }).slice(0, 60);
    pending.forEach(function (r) { sendOutboxRow_(r.id); });
  } finally { try { commit_(); } catch (e) {} lock.releaseLock(); }
}

// Тригер всяка сутрин в 7:00
function dailyDigest() {
  if (!notifyStatus_().enabled) return;
  ensureSchema_(false);
  var todayS = today_();
  readObjects_('Teams').forEach(function (t) {
    // 1) Треньорите: само НОВИ сигнали, за да не се повтарят всеки ден
    var stats = statsByChild_(t.id);
    var yest = fmtDate_(addDays_(new Date(), -1));
    var in14 = fmtDate_(addDays_(new Date(), 14));
    var md = todayS.slice(5);
    var alerts = [];
    inTeam_(readObjects_('Children'), t.id).filter(function (c) { return nb_(c.isActive); }).forEach(function (c) {
      var name = (c.firstName + ' ' + c.lastName).trim();
      var st = stats[c.id] || emptyStats_();
      if (st.absStreak >= 2 && st.lastMarked >= yest)
        alerts.push({ childName: name, text: 'отсъства ' + st.absStreak + ' поредни тренировки' + (c.specialNeeds ? ' (СОП)' : '') });
      var mu = nd_(c.medicalUntil);
      if (mu && mu === in14) alerts.push({ childName: name, text: 'медицинското изтича след 14 дни (' + bgDate_(mu) + ')' });
      if (mu && mu === yest) alerts.push({ childName: name, text: 'медицинското изтече вчера' });
      if (nd_(c.birthDate).slice(5) === md) alerts.push({ childName: name, text: 'има рожден ден днес 🎂' });
    });
    if (alerts.length) {
      var html = '<p><b>Добро утро!</b> Ето какво да имаш предвид днес:</p><ul>' +
        alerts.map(function (a) { return '<li><b>' + h_(a.childName) + '</b> — ' + h_(a.text) + '</li>'; }).join('') + '</ul>' +
        appLinkHtml_('Отвори „Днес"', '#/app/today');
      activeCoaches_(t.id).forEach(function (c) {
        enqueue_({ teamId: t.id, kind: 'coachDigest', toEmail: c.email, toName: c.fullName, subject: 'SwimWithSmile · сигнали за ' + todayS, html: html });
      });
    }

    // 2) Родителите: седмично обобщение в неделя
    if (Utilities.formatDate(new Date(), TZ, 'u') === '7') weeklyParentDigest_(t, stats);
  });
  commit_();
  processOutbox();
}

function weeklyParentDigest_(team, stats) {
  var from = fmtDate_(addDays_(new Date(), -6)), todayS = today_();
  var sessions = mapById_('Sessions');
  var byChild = {};
  readObjects_('Participants').forEach(function (pt) {
    var s = sessions[pt.sessionId]; if (!s || String(s.teamId) !== String(team.id)) return;
    var d = nd_(s.sessionDate); if (d < from || d > todayS) return;
    (byChild[pt.childId] || (byChild[pt.childId] = [])).push({ d: d, a: tri_(pt.attended), note: nn_(pt.parentNote), prog: nn_(pt.dailyProgress) });
  });
  inTeam_(readObjects_('Children'), team.id).forEach(function (c) {
    var list = byChild[c.id];
    if (!list || !c.parentEmail || !nb_(c.isActive) || c.notifyParent === 'FALSE') return;
    var present = list.filter(function (x) { return x.a === true; }).length;
    var st = stats[c.id] || emptyStats_();
    var notes = list.filter(function (x) { return x.note || x.prog; })
      .map(function (x) { return '<li>' + x.d.split('-').reverse().join('.') + ' — ' + h_(x.note || x.prog) + '</li>'; }).join('');
    enqueue_({ teamId: team.id, childId: c.id, kind: 'weekly', toEmail: c.parentEmail, toName: c.parentName || '',
      subject: 'Седмицата на ' + c.firstName + ' в басейна',
      html: '<p>Тази седмица <b>' + h_(c.firstName) + '</b> беше на <b>' + present + ' от ' + list.length + '</b> тренировки.</p>' +
        '<p>Ниво: <b>' + h_(st.level.icon + ' ' + st.level.name) + '</b> · ' + st.points + ' точки</p>' +
        (notes ? '<p>От треньора:</p><ul>' + notes + '</ul>' : '') +
        appLinkHtml_('Виж напредъка', '#/login?parent') +
        '<p style="color:#7E93B4;font-size:12px">Код за достъп: ' + h_(c.parentCode) + '</p>' });
  });
}

/* ============================================================
   Изходни форматери
   ============================================================ */
function childListOut_(c, st) {
  st = st || emptyStats_();
  return {
    id: c.id, firstName: c.firstName, lastName: c.lastName, birthDate: nd_(c.birthDate),
    level: nn_(c.level), groupId: nn_(c.groupId), photoUrl: nn_(c.photoUrl), isActive: nb_(c.isActive), isAdult: nb_(c.isAdult),
    medicalAlert: nn_(c.medicalAlert), specialNeeds: nn_(c.specialNeeds),
    points: st.points, lvl: { no: st.level.no, name: st.level.name, icon: st.level.icon, progress: st.level.progress },
    pct: st.pct30 != null ? st.pct30 : st.pct, absStreak: st.absStreak
  };
}

function childOut_(c) {
  return {
    id: c.id, firstName: c.firstName, lastName: c.lastName,
    birthDate: nd_(c.birthDate), gender: nn_(c.gender), level: nn_(c.level),
    trainingStartDate: c.trainingStartDate ? nd_(c.trainingStartDate) : null,
    diagnosis: nn_(c.diagnosis), objectiveCondition: nn_(c.objectiveCondition),
    allergiesMedical: nn_(c.allergiesMedical), parentContact: nn_(c.parentContact),
    emergencyContact: nn_(c.emergencyContact), goals: nn_(c.goals), notes: nn_(c.notes),
    parentCode: String(c.parentCode || ''), photoUrl: nn_(c.photoUrl), isActive: nb_(c.isActive),
    parentName: nn_(c.parentName), parentPhone: nn_(c.parentPhone), parentEmail: nn_(c.parentEmail),
    emergencyName: nn_(c.emergencyName), emergencyPhone: nn_(c.emergencyPhone),
    medicalAlert: nn_(c.medicalAlert), specialNeeds: nn_(c.specialNeeds),
    medicalUntil: nd_(c.medicalUntil) || null, consentDate: nd_(c.consentDate) || null,
    groupId: nn_(c.groupId), calendarName: nn_(c.calendarName), isAdult: nb_(c.isAdult), weightKg: num_(c.weightKg) || null, notifyParent: c.notifyParent === '' || c.notifyParent == null ? true : nb_(c.notifyParent)
  };
}

function progressOut_(r) {
  return {
    id: r.id, childId: r.childId, coachId: nn_(r.coachId),
    assessmentDate: nd_(r.assessmentDate), periodLabel: nn_(r.periodLabel),
    jumpsAthletics: num_(r.jumpsAthletics), balanceCoordination: num_(r.balanceCoordination),
    strengthEndurance: num_(r.strengthEndurance), basicSkillsComment: nn_(r.basicSkillsComment),
    physStrength: num_(r.physStrength), physFlexibility: num_(r.physFlexibility),
    physEndurance: num_(r.physEndurance), physCoordination: num_(r.physCoordination),
    teamwork: num_(r.teamwork), discipline: num_(r.discipline),
    motivation: num_(r.motivation), concentration: num_(r.concentration),
    nextGoals: nn_(r.nextGoals), coachNotes: nn_(r.coachNotes),
    _createdAt: String(r.createdAt || '')
  };
}

/* ============================================================
   Достъп до таблицата (с кеш за една заявка)
   ============================================================ */
var _RC = {}, _HC = {};
function resetCache_() { _RC = {}; _HC = {}; _SC = {}; _VER = null; }
function invalidate_(name) { delete _RC[name]; delete _HC[name]; _SC = {}; _DIRTY[name] = 1; }

/* ------------------------------------------------------------
   Кеш МЕЖДУ заявките (CacheService) — най-голямото ускорение.
   Четенето от Google Sheet е бавно (0,3–1,5 сек на таб). Всеки таб
   се пази като JSON в кеша под ключ с „версия". При запис:
   SpreadsheetApp.flush() → нова версия → следващото четене взима
   свежите данни от таблицата. Ръчните промени в таблицата също
   сменят версията (onEdit / onSheetChange_).
   ------------------------------------------------------------ */
var TC_TTL = 21600;       // 6 часа (максимумът на CacheService)
var TC_CHUNK = 40000;     // символа на парче (лимитът е 100 KB на стойност)
var _DIRTY = {}, _VER = null, _NOCACHE = false;
function tcache_() { try { return CacheService.getScriptCache(); } catch (e) { return null; } }
function newVer_() { return String(Date.now()) + Math.floor(Math.random() * 1e6); }

function verAll_() {
  if (_VER) return _VER;
  var c = tcache_();
  try { _VER = (c && c.getAll(Object.keys(SCHEMA).map(function (n) { return 'V|' + n; }).concat(['SCHEMA_OK']))) || {}; } catch (e) { _VER = {}; }
  return _VER;
}
function markSchemaOk_() {
  var c = tcache_(); if (!c) return;
  try { c.put('SCHEMA_OK', SCHEMA_VERSION, TC_TTL); } catch (e) {}
  verAll_()['SCHEMA_OK'] = SCHEMA_VERSION;
}

// Текущата версия на таба. Ако липсва — създаваме я ПРЕДИ да четем таблицата.
function tver_(name) {
  var c = tcache_(); if (!c) return null;
  verAll_();
  var k = 'V|' + name;
  if (!_VER[k]) { _VER[k] = newVer_(); try { c.put(k, _VER[k], TC_TTL); } catch (e) {} }
  return _VER[k];
}

function bumpVer_(names) {
  var c = tcache_(); if (!c || !names.length) return;
  var o = {};
  names.forEach(function (n) { o['V|' + n] = newVer_(); });
  try { c.putAll(o, TC_TTL); } catch (e) { try { c.removeAll(Object.keys(o)); } catch (x) {} }
  if (_VER) Object.keys(o).forEach(function (k) { _VER[k] = o[k]; });
}

// Извиква се в края на всяка заявка/тригер: записите стават видими за всички
function commit_() {
  var names = Object.keys(_DIRTY);
  if (!names.length) return;
  try { SpreadsheetApp.flush(); } catch (e) {}
  bumpVer_(names);
  _DIRTY = {};
}

// Ръчна промяна в таблицата → кешът за този таб се обновява
function onEdit(e) {
  try { var n = e.range.getSheet().getName(); if (SCHEMA[n]) bumpVer_([n]); } catch (x) {}
}
function onSheetChange_(e) { bumpVer_(Object.keys(SCHEMA)); }
function clearCacheMenu() {
  bumpVer_(Object.keys(SCHEMA));
  try { CacheService.getScriptCache().removeAll(Object.keys(SCHEMA).map(function (n) { return 'V|' + n; })); } catch (e) {}
  SpreadsheetApp.getUi().alert('Кешът е изчистен — сайтът ще прочете таблицата наново.');
}
function installChangeTrigger_() {
  var fns = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (fns.indexOf('onSheetChange_') < 0) ScriptApp.newTrigger('onSheetChange_').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onChange().create();
  if (fns.indexOf('warmUp') < 0) ScriptApp.newTrigger('warmUp').timeBased().everyMinutes(10).create();
}
// На 10 мин: кешът е винаги пълен и скриптът е „топъл" → първата заявка сутрин не чака
function warmUp() {
  try { ensureSchema_(false); Object.keys(SCHEMA).forEach(function (n) { if (n !== 'Outbox') table_(n); }); } catch (e) {}
}

// Дати от клетки (ако някой е въвел ръчно) → низове, за да е еднакво с и без кеш
function cell_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (v.getFullYear() < 1901) return Utilities.formatDate(v, TZ, 'HH:mm:ss');
    var t = Utilities.formatDate(v, TZ, 'HH:mm:ss');
    return t === '00:00:00' ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : Utilities.formatDate(v, TZ, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return v;
}

function tableFromCache_(name, ver) {
  var c = tcache_(); if (!c || !ver) return null;
  var base = 'T|' + name + '|' + ver;
  try {
    var keys = [base]; for (var i = 0; i < 4; i++) keys.push(base + '|' + i);
    var got = c.getAll(keys);
    var n = Number(got[base]); if (!n) return null;
    var parts = [];
    for (var j = 0; j < n; j++) {
      if (got[base + '|' + j] === undefined && j >= 4) {
        var more = c.getAll(Array.apply(null, Array(n - j)).map(function (_, k) { return base + '|' + (j + k); }));
        for (var q = j; q < n; q++) { if (more[base + '|' + q] === undefined) return null; got[base + '|' + q] = more[base + '|' + q]; }
      }
      if (got[base + '|' + j] === undefined) return null;
      parts.push(got[base + '|' + j]);
    }
    return JSON.parse(parts.join(''));
  } catch (e) { return null; }
}

function tableToCache_(name, ver, t) {
  var c = tcache_(); if (!c || !ver) return;
  try {
    var json = JSON.stringify(t), o = {}, n = 0, base = 'T|' + name + '|' + ver;
    for (var i = 0; i < json.length; i += TC_CHUNK) o[base + '|' + (n++)] = json.slice(i, i + TC_CHUNK);
    if (n > 200) return; // огромен таб — не кешираме
    o[base] = String(n);
    c.putAll(o, TC_TTL);
  } catch (e) {}
}

function sh_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Липсва таб „' + name + '". Пусни „Първоначална настройка".');
  return sh;
}

// Целият таб като { h: [заглавия], rows: [[...], ...] } — от кеша или от таблицата
function table_(name) {
  // Таб, записван в тази заявка → четем направо от таблицата (кешът още е стар)
  var ver = (_NOCACHE || _DIRTY[name]) ? null : tver_(name);
  var t = ver ? tableFromCache_(name, ver) : null;
  if (t) return t;
  var sh = sh_(name);
  var lastC = sh.getLastColumn(), lastR = sh.getLastRow();
  if (lastC < 1) { t = { h: [], rows: [] }; }
  else {
    var vals = sh.getRange(1, 1, Math.max(1, lastR), lastC).getValues();
    var h = vals[0].map(String), rows = [];
    for (var i = 1; i < vals.length; i++) {
      var row = vals[i], empty = true;
      for (var k = 0; k < row.length; k++) { if (row[k] !== '' && row[k] !== null) { empty = false; break; } }
      if (empty) continue;
      rows.push(row.map(cell_));
    }
    t = { h: h, rows: rows };
  }
  if (ver) tableToCache_(name, ver, t);
  return t;
}

function headers_(name) {
  if (_HC[name]) return _HC[name];
  return (_HC[name] = table_(name).h.slice());
}

function readObjects_(name) {
  if (_RC[name]) return _RC[name];
  var t = table_(name);
  if (!_HC[name]) _HC[name] = t.h.slice();
  var out = new Array(t.rows.length);
  for (var i = 0; i < t.rows.length; i++) {
    var row = t.rows[i], o = {};
    for (var j = 0; j < t.h.length; j++) o[t.h[j]] = row[j] === undefined ? '' : row[j];
    out[i] = o;
  }
  return (_RC[name] = out);
}

function rowFor_(headers, obj) {
  return headers.map(function (h) { return (obj[h] !== undefined && obj[h] !== null) ? String(obj[h]) : ''; });
}

function appendObject_(name, obj) {
  appendObjects_(name, [obj]);
  return obj;
}

function appendObjects_(name, list) {
  if (!list || !list.length) return;
  var sh = sh_(name);
  var headers = headers_(name);
  var r = sh.getLastRow() + 1;
  var rng = sh.getRange(r, 1, list.length, headers.length);
  rng.setNumberFormat('@');
  rng.setValues(list.map(function (o) { return rowFor_(headers, o); }));
  invalidate_(name);
}

function updateById_(name, id, patch) {
  var sh = sh_(name);
  var last = sh.getLastRow();
  if (last < 2) return false;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var idCol = headers.indexOf('id');
  if (idCol < 0) return false;
  // Четем само колоната с id-тата (много по-бързо от целия таб)
  var ids = sh.getRange(2, idCol + 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      var rng = sh.getRange(i + 2, 1, 1, headers.length);
      var cur = rng.getValues()[0];
      var row = headers.map(function (h, j) {
        if (patch[h] !== undefined) return patch[h] === null ? '' : String(patch[h]);
        var v = cell_(cur[j]);
        return (v === null || v === undefined) ? '' : String(v);
      });
      rng.setNumberFormat('@');
      rng.setValues([row]);
      invalidate_(name);
      return true;
    }
  }
  return false;
}

function deleteById_(name, id) {
  return deleteWhere_(name, function (o) { return String(o.id) === String(id); }) > 0;
}

// Трие всички редове, за които pred(obj) е вярно — с един запис
function deleteWhere_(name, pred) {
  var sh = sh_(name);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = vals[0].map(String);
  var keep = [], removed = 0;
  for (var i = 1; i < vals.length; i++) {
    var o = {};
    for (var j = 0; j < headers.length; j++) o[headers[j]] = vals[i][j];
    if (pred(o)) removed++; else keep.push(vals[i]);
  }
  if (!removed) return 0;
  if (removed === 1 && keep.length > 50) {
    // един ред — по-бързо е да изтрием само него
    for (var k = vals.length - 1; k >= 1; k--) {
      var ob = {};
      for (var q = 0; q < headers.length; q++) ob[headers[q]] = vals[k][q];
      if (pred(ob)) { sh.deleteRow(k + 1); break; }
    }
  } else {
    sh.getRange(2, 1, last - 1, headers.length).clearContent();
    if (keep.length) {
      sh.getRange(2, 1, keep.length, headers.length).setNumberFormat('@')
        .setValues(keep.map(function (r) { return r.map(function (v) { return v === null || v === undefined ? '' : String(v); }); }));
    }
  }
  invalidate_(name);
  return removed;
}

function findById_(name, id) {
  if (id === undefined || id === null || id === '') return null;
  var list = readObjects_(name);
  for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
  return null;
}

function mapById_(name) {
  var m = {};
  readObjects_(name).forEach(function (o) { m[o.id] = o; });
  return m;
}

function coachMap_() { return mapById_('Coaches'); }
function childMap_() { return mapById_('Children'); }

function inTeam_(list, teamId) {
  return list.filter(function (o) { return String(o.teamId) === String(teamId); });
}

function mustInTeam_(name, id, teamId, msg) {
  var o = findById_(name, id);
  if (!o || String(o.teamId) !== String(teamId)) throw new Denied_(404, msg);
  return o;
}
function mustChild_(id, teamId) { return mustInTeam_('Children', id, teamId, 'Картонът не е намерен.'); }
function mustSession_(id, teamId) { return mustInTeam_('Sessions', id, teamId, 'Тренировката не е намерена.'); }

function mustChildRow_(name, id, teamId) {
  var row = findById_(name, id);
  if (!row) throw new Denied_(404, 'Записът не е намерен.');
  mustChild_(row.childId, teamId);
  return row;
}
function actDeleteChildRow_(name, id, teamId) {
  mustChildRow_(name, id, teamId);
  deleteById_(name, id);
  return D(null);
}

function teamCoachOr_(coachId, p) {
  var c = coachId ? findById_('Coaches', coachId) : null;
  return (c && String(c.teamId) === p._teamId) ? c.id : p._coachId;
}

/* ============================================================
   Сигурност — токени и пароли
   ============================================================ */
function pepper_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('PEPPER');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('PEPPER', s); }
  return s;
}

function sign_(msg) {
  var raw = Utilities.computeHmacSha256Signature(msg, pepper_());
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '');
}

function makeToken_(coachId) { return coachId + '.' + sign_('tok:' + coachId); }

function verifyToken_(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  var id = String(token).slice(0, String(token).lastIndexOf('.'));
  return token === makeToken_(id) ? id : null;
}

function hashPw_(plain) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 'pw:' + pepper_() + ':' + plain, Utilities.Charset.UTF_8);
  return 'sha256:' + Utilities.base64Encode(raw);
}

/* ============================================================
   Дребни помощници
   ============================================================ */
function nowIso_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

// Дати като „yyyy-MM-dd" ↔ Date (по обед, за да няма изместване от часовата зона)
function parseDate_(s) { var p = String(s).split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0); }
function fmtDate_(d) { return d.getFullYear() + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate()); }
function addDays_(d, n) { var x = new Date(d.getTime()); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + n); return x; }
function isoDow_(s) { var d = parseDate_(s).getDay(); return d === 0 ? 7 : d; } // пн=1 … нд=7

function nn_(v) {
  if (v === null || v === undefined) return null;
  v = String(v);
  return v === '' ? null : v;
}

function nd_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function nt_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, TZ, 'HH:mm:ss');
  v = String(v);
  return /^\d{1,2}:\d{2}$/.test(v) ? (v.length === 4 ? '0' + v : v) + ':00' : v;
}

function nb_(v) {
  return v === true || v === 1 || v === '1' ||
    String(v).toUpperCase() === 'TRUE' || String(v).toLowerCase() === 'true' ||
    String(v).toLowerCase() === 'да';
}

// Присъствие с три състояния: true / false / null (неотбелязано)
function tri_(v) {
  if (v === null || v === undefined || v === '') return null;
  return nb_(v);
}

function num_(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function numStr_(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isNaN(n) ? '' : String(n);
}

// „1:05.32" / „65.32" / „32,4" → милисекунди
function parseTime_(t) {
  if (!t) return null;
  t = String(t).trim().replace(',', '.');
  var m = t.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return Math.round(((Number(m[1] || 0) * 60) + Number(m[2])) * 1000);
}

function bgDate_(s) { return String(s || '').split('-').reverse().join('.'); }

function h_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function newKey_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }

function newInviteCode_() {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var existing = {};
  try { readObjects_('Teams').forEach(function (t) { existing[String(t.inviteCode || '')] = 1; }); } catch (e) {}
  for (var i = 0; i < 100; i++) {
    var code = '';
    for (var k = 0; k < 10; k++) code += abc.charAt(Math.floor(Math.random() * abc.length));
    if (!existing[code]) return code;
  }
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function newParentCode_() {
  var existing = {};
  readObjects_('Children').forEach(function (c) { existing[String(c.parentCode || '')] = 1; });
  for (var i = 0; i < 2000; i++) {
    var code = String(Math.floor(10000000 + Math.random() * 90000000));
    if (!existing[code]) return code;
  }
  return String(Date.now()).slice(-8);
}

function ageFromBd_(bd) {
  if (!bd) return null;
  var b = parseDate_(bd), n = new Date();
  var a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

/* ============================================================
   Примерни данни (за показване) — само собственикът.
   Създава групи, плувци (деца и възрастни, със и без СОП), тренировки
   за последните 5 седмици и следващите 2, присъствие, метри, умения,
   награди, състезания и карти за напредък. „deleteDemo" ги маха.
   ============================================================ */
var DEMO_TAG = '(примерен плувец)';

function demoState_(teamId) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('DEMO_' + teamId) || 'null'); } catch (e) { return null; }
}

function actCreateDemo_(p) {
  mustOwner_(p);
  if (demoState_(p._teamId)) return E(400, 'Примерните данни вече са добавени.');
  var team = findById_('Teams', p._teamId) || {};
  if (!poolOk_(team.poolLength)) updateById_('Teams', p._teamId, { poolLength: '25' });
  var pool = poolOk_(team.poolLength) || 25;
  var now = new Date(), y = now.getFullYear();
  var ymdOf = function (d) { return fmtDate_(d); };
  var bd = function (age, mmdd) { return (y - age) + '-' + mmdd; };
  var soonBd = function (age) { var d = addDays_(now, 3); return (d.getFullYear() - age) + '-' + pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate()); };

  // --- групи ---
  var G = [
    { key: 'del', name: 'Делфини', color: '#1F73E0', days: [1, 3], time: '17:00', dur: 45, loc: 'Басейн Локомотив' },
    { key: 'aku', name: 'Акули', color: '#12805a', days: [2, 4], time: '18:00', dur: 60, loc: 'Басейн Локомотив' },
    { key: 'vaz', name: 'Възрастни', color: '#8B5CF6', days: [5], time: '19:30', dur: 60, loc: 'Басейн Локомотив' },
    { key: 'sop', name: 'Индивидуални', color: '#F5883C', days: [6], time: '10:00', dur: 30, loc: 'Малкия басейн' }
  ];
  var groupRows = G.map(function (g) {
    g.id = Utilities.getUuid();
    return { id: g.id, name: g.name, color: g.color, location: g.loc, days: g.days.join(','), time: g.time + ':00',
             durationMin: String(g.dur), isActive: 'TRUE', createdAt: nowIso_(), teamId: p._teamId };
  });
  appendObjects_('Groups', groupRows);
  var gid = {}; G.forEach(function (g) { gid[g.key] = g.id; });

  // --- плувци: [име, фамилия, рождена дата, пол, група, ниво(0-4 етапа умения), допълнителни полета] ---
  var P = [
    ['Йоан', 'Петров', bd(8, '04-12'), 'момче', 'sop', 4, { specialNeeds: 'Аутизъм — нужни са ясни правила и един и същ ред на тренировката', diagnosis: 'Разстройство от аутистичния спектър', goals: 'Да плува 10 м без помощ', parentName: 'Мила Петрова', parentPhone: '0888 123 401', emergencyName: 'Петър Петров', emergencyPhone: '0888 123 402' }],
    ['Елена', 'Маринова', bd(9, '09-03'), 'момиче', 'sop', 6, { specialNeeds: 'Синдром на Даун — по-бавно темпо, много похвали', parentName: 'Ива Маринова', parentPhone: '0888 123 411', emergencyPhone: '0888 123 412', goals: 'Звездичка по гръб сама' }],
    ['Калоян', 'Николов', bd(11, '01-25'), 'момче', 'sop', 7, { specialNeeds: 'ADHD — кратки задачи, чести почивки', parentName: 'Рая Николова', parentPhone: '0888 123 421', _absent: true }],
    ['Мария', 'Георгиева', bd(9, '06-18'), 'момиче', 'del', 8, { parentName: 'Ани Георгиева', parentPhone: '0888 123 431', parentEmail: 'ani.g@example.com' }],
    ['Алекс', 'Димитров', bd(7, '11-30'), 'момче', 'del', 3, { medicalAlert: 'Астма — инхалаторът е в синята чанта', allergiesMedical: 'Астма', parentName: 'Димитър Димитров', parentPhone: '0888 123 441' }],
    ['Борис', 'Тодоров', soonBd(6), 'момче', 'del', 1, { parentName: 'Нели Тодорова' }],
    ['Ева', 'Колева', bd(10, '02-14'), 'момиче', 'del', 11, { parentName: 'Яна Колева', parentPhone: '0888 123 461' }],
    ['Виктор', 'Стоянов', bd(13, '05-07'), 'момче', 'aku', 17, { goals: 'Под 0:32 на 50 м свободен стил', parentName: 'Стоян Стоянов', parentPhone: '0888 123 471' }],
    ['Сияна', 'Иванова', bd(12, '08-21'), 'момиче', 'aku', 14, { parentName: 'Тони Иванова', parentPhone: '0888 123 481' }],
    ['Деница', 'Попова', bd(14, '03-02'), 'момиче', 'aku', 13, { parentName: 'Галя Попова', parentPhone: '0888 123 491', medicalUntil: ymdOf(addDays_(now, -5)) }],
    ['Иван', 'Христов', bd(34, '10-10'), 'мъж', 'vaz', 2, { isAdult: 'TRUE', parentPhone: '0888 555 101', notes: 'Страх от дълбокото — започваме от плиткото' }],
    ['Петя', 'Ангелова', bd(41, '07-29'), 'жена', 'vaz', 17, { isAdult: 'TRUE', parentPhone: '0888 555 102', goals: 'Триатлон — 1,5 км в открита вода' }],
    ['Георги', 'Василев', bd(67, '12-01'), 'мъж', 'vaz', 9, { isAdult: 'TRUE', parentPhone: '0888 555 103', medicalAlert: 'След операция на коляно — без бруст крака', emergencyName: 'Мария Василева', emergencyPhone: '0888 555 104' }],
    ['Радост', 'Илиева', bd(25, '04-04'), 'жена', 'vaz', 12, { isAdult: 'TRUE', parentPhone: '0888 555 105' }]
  ];
  var kids = P.map(function (k) {
    var extra = k[6], row = { firstName: k[0], lastName: k[1], birthDate: k[2], gender: k[3], groupId: gid[k[4]],
      notes: ((extra.notes ? extra.notes + ' ' : '') + DEMO_TAG).trim(), consentDate: ymdOf(addDays_(now, -40)), trainingStartDate: ymdOf(addDays_(now, -200)) };
    Object.keys(extra).forEach(function (f) { if (f !== 'notes' && f.charAt(0) !== '_') row[f] = extra[f]; });
    if (!row.isAdult) row.isAdult = 'FALSE';
    row = newChildRow_(row, p._teamId);
    row._g = k[4]; row._skills = k[5]; row._absent = !!extra._absent;
    return row;
  });
  appendObjects_('Children', kids.map(function (k) { var o = {}; Object.keys(k).forEach(function (f) { if (f.charAt(0) !== '_') o[f] = k[f]; }); return o; }));

  // --- тренировки: 5 седмици назад + 2 напред, по дните на групите ---
  var sets = { 0: ['1x2', '2x2', '1x4'], 1: ['2x4', '4x2', '3x3'], 2: ['4x4', '2x6', '3x4'], 3: ['4x6, 2x4', '5x6', '4x8'], 4: ['4x8, 4x6', '6x8, 2x10', '10x6, 4x4'] };
  var moods = ['много добро', 'добро', 'добро', 'неутрално', 'умора'];
  var notesP = ['Браво! Днес доплува сама до въжето 💪', 'Чудесна тренировка, много старание!', 'Първи път без дъска — супер!', 'Днес беше уморен, но не се отказа 🙂'];
  var sessions = [], parts = [], from = addDays_(now, -35), until = addDays_(now, 14), todayS = today_(), seed = 7;
  var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (var d = from; d <= until; d = addDays_(d, 1)) {
    var ds = ymdOf(d), dow = isoDow_(ds);
    G.forEach(function (g) {
      if (g.days.indexOf(dow) < 0) return;
      var sid = Utilities.getUuid();
      var cancelled = ds < todayS && rnd() < 0.04;
      sessions.push({ id: sid, sessionDate: ds, startTime: g.time + ':00', coachId: p._coachId, location: g.loc, notes: '',
        createdAt: nowIso_(), teamId: p._teamId, groupId: g.id, durationMin: String(g.dur), seriesId: 'demo-' + g.key,
        status: cancelled ? 'cancelled' : '', poolLength: '' });
      kids.filter(function (k) { return k._g === g.key; }).forEach(function (k) {
        var past = ds < todayS, row = { id: Utilities.getUuid(), sessionId: sid, childId: k.id, attended: '', updatedAt: nowIso_() };
        if (past && !cancelled) {
          var daysAgo = Math.round((now - d) / 86400000);
          var here = k._absent ? daysAgo > 12 && rnd() < 0.8 : rnd() < 0.86;
          row.attended = here ? 'TRUE' : 'FALSE';
          if (here) {
            var stage = Math.min(4, Math.floor(k._skills / 4));
            var opts = sets[stage]; row.sets = opts[Math.floor(rnd() * opts.length)];
            row.mood = moods[Math.floor(rnd() * moods.length)];
            if (rnd() < 0.18) row.parentNote = notesP[Math.floor(rnd() * notesP.length)];
            if (rnd() < 0.12) row.dailyProgress = 'Подобри дишането настрани';
          }
        }
        parts.push(row);
      });
    });
  }
  appendObjects_('Sessions', sessions);
  appendObjects_('Participants', parts);

  // --- умения ---
  var skills = skillsOut_(p._teamId, false);
  var cs = [];
  kids.forEach(function (k) {
    skills.slice(0, k._skills).forEach(function (s, i) {
      cs.push({ id: Utilities.getUuid(), childId: k.id, skillId: s.id, achievedDate: ymdOf(addDays_(now, -150 + i * 8)), coachId: p._coachId, note: '', createdAt: nowIso_() });
    });
  });
  appendObjects_('ChildSkills', cs);

  // --- награди ---
  var ach = inTeam_(readObjects_('Achievements'), p._teamId).filter(function (a) { return nb_(a.isActive); });
  var byName = function (n) { return kids.filter(function (k) { return k.firstName === n; })[0]; };
  var aw = [];
  [['Ева', 0], ['Виктор', 1], ['Виктор', 2], ['Сияна', 0], ['Мария', 3], ['Петя', 2], ['Йоан', 0], ['Радост', 0]].forEach(function (x, i) {
    var k = byName(x[0]), a = ach[x[1] % Math.max(1, ach.length)];
    if (k && a) aw.push({ id: Utilities.getUuid(), childId: k.id, achievementId: a.id, awardedDate: ymdOf(addDays_(now, -3 - i * 4)), awardedBy: p._coachId, note: '', createdAt: nowIso_() });
  });
  appendObjects_('Awards', aw);

  // --- състезания ---
  var comp = [
    ['Виктор', 'Купа Велико Търново', '50 м свободен стил', '0:33.48', 1, -20],
    ['Виктор', 'Купа Велико Търново', '100 м свободен стил', '1:14.10', 2, -20],
    ['Сияна', 'Купа Велико Търново', '50 м гръб', '0:41.92', 3, -20],
    ['Деница', 'Коледен турнир Габрово', '50 м бруст', '0:46.30', 5, -60],
    ['Петя', 'Мастърс София', '400 м свободен стил', '6:12.40', 2, -45]
  ].map(function (c) {
    var k = byName(c[0]);
    return { id: Utilities.getUuid(), childId: k.id, eventDate: ymdOf(addDays_(now, c[5])), eventName: c[1], results: '', notes: '',
      createdBy: p._coachId, createdAt: nowIso_(), discipline: c[2], timeText: c[3], place: String(c[4]), location: c[1].indexOf('Габрово') >= 0 ? 'Габрово' : (c[1].indexOf('София') >= 0 ? 'София' : 'Велико Търново') };
  });
  appendObjects_('Competitions', comp);

  // --- карти за напредък ---
  var prog = [];
  [['Йоан', [2, 3, 2, 2, 3, 2, 3, 2, 3, 2, 4, 2], 'Да издишва под водата 5 пъти подред'], ['Мария', [4, 4, 3, 3, 4, 4, 3, 4, 4, 4, 5, 4], 'Плъзгане с дъска 10 м'], ['Виктор', [5, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5], 'Обръщане със салто']].forEach(function (x) {
    var k = byName(x[0]), v = x[1];
    prog.push({ id: Utilities.getUuid(), childId: k.id, coachId: p._coachId, assessmentDate: ymdOf(addDays_(now, -10)), periodLabel: 'Есен ' + y,
      jumpsAthletics: String(v[0]), balanceCoordination: String(v[1]), strengthEndurance: String(v[2]), basicSkillsComment: '',
      physStrength: String(v[3]), physFlexibility: String(v[4]), physEndurance: String(v[5]), physCoordination: String(v[6]),
      teamwork: String(v[7]), discipline: String(v[8]), motivation: String(v[9]), concentration: String(v[10]),
      nextGoals: x[2], coachNotes: '', createdAt: nowIso_() });
  });
  appendObjects_('Progress', prog);

  PropertiesService.getScriptProperties().setProperty('DEMO_' + p._teamId, JSON.stringify({ groups: G.map(function (g) { return g.id; }), at: nowIso_() }));
  return D({ children: kids.length, sessions: sessions.length, groups: G.length });
}

function actDeleteDemo_(p) {
  mustOwner_(p);
  var st = demoState_(p._teamId) || { groups: [] };
  var kidIds = {};
  inTeam_(readObjects_('Children'), p._teamId).forEach(function (c) { if (String(c.notes || '').indexOf(DEMO_TAG) >= 0) kidIds[c.id] = 1; });
  var sessIds = {};
  inTeam_(readObjects_('Sessions'), p._teamId).forEach(function (s) { if (String(s.seriesId || '').indexOf('demo-') === 0) sessIds[s.id] = 1; });
  var byKid = function (r) { return kidIds[r.childId]; };
  deleteWhere_('Participants', function (r) { return kidIds[r.childId] || sessIds[r.sessionId]; });
  ['ChildSkills', 'Awards', 'Competitions', 'Progress'].forEach(function (t) { deleteWhere_(t, byKid); });
  deleteWhere_('Sessions', function (s) { return sessIds[s.id]; });
  deleteWhere_('Children', function (c) { return kidIds[c.id]; });
  var gids = {}; (st.groups || []).forEach(function (g) { gids[g] = 1; });
  deleteWhere_('Groups', function (g) { return gids[g.id]; });
  PropertiesService.getScriptProperties().setProperty('DEMO_' + p._teamId, '');
  return D({ deleted: Object.keys(kidIds).length });
}


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


  return { handle_, buildIcs_, SCHEMA, SCHEMA_VERSION, seedSkills_, seedAchievements_, newKey_, nowIso_, readObjects_, updateById_, parseSets_ };
}
