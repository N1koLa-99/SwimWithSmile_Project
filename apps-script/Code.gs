/* ============================================================
   SwimWithSmile — Бекенд върху Google Sheet (Google Apps Script)
   ------------------------------------------------------------
   Този скрипт заменя ASP.NET + база данни. Данните живеят в
   табовете на Google таблицата (всеки таб = таблица).

   Публикува се като Web App (Deploy → New deployment → Web app,
   "Execute as: Me", "Who has access: Anyone"). Полученият URL
   се поставя в js/api.js (DEFAULT_BASE).

   Първо стартиране:
     1) Меню „SwimWithSmile → 1) Първоначална настройка"
     2) В таб „Coaches" сложи имейл + парола (в колона passwordHash)
     3) Меню „SwimWithSmile → 2) Хеширай паролите"
   ============================================================ */

var TZ = 'Europe/Sofia';

// Новите колони (teamId, role) са добавени НАКРАЯ, за да не се разместят
// съществуващите данни. ensureSchema_() ги добавя автоматично.
var SCHEMA = {
  Teams:        ['id','name','plan','inviteCode','ownerId','createdAt'],
  Coaches:      ['id','fullName','email','passwordHash','active','createdAt','teamId','role'],
  Children:     ['id','firstName','lastName','birthDate','gender','level','trainingStartDate',
                 'diagnosis','objectiveCondition','allergiesMedical','parentContact','emergencyContact',
                 'goals','notes','parentCode','photoUrl','isActive','createdAt','teamId'],
  Sessions:     ['id','sessionDate','startTime','coachId','location','notes','createdAt','teamId'],
  Participants: ['id','sessionId','childId','attended','swamWhat','dailyProgress','mood','updatedAt'],
  Progress:     ['id','childId','coachId','assessmentDate','periodLabel','jumpsAthletics','balanceCoordination',
                 'strengthEndurance','basicSkillsComment','physStrength','physFlexibility','physEndurance',
                 'physCoordination','teamwork','discipline','motivation','concentration','nextGoals','coachNotes','createdAt'],
  Achievements: ['id','name','icon','category','reward','isActive','createdAt','teamId'],
  Awards:       ['id','childId','achievementId','awardedDate','awardedBy','note','createdAt'],
  Competitions: ['id','childId','eventDate','eventName','results','notes','createdBy','createdAt']
};

// Планове: брой треньори и деца в един отбор. Плащанията още не са
// свързани — планът се сменя от страница „Отбор" в приложението.
var PLANS = {
  solo: { name: 'Соло',  seats: 1,  kids: 15 },
  team: { name: 'Отбор', seats: 3,  kids: 60 },
  club: { name: 'Клуб',  seats: 10, kids: 300 }
};
var SCHEMA_VERSION = '2';

var DEFAULT_ACHIEVEMENTS = [
  ['Първи 25 метра','🏊','Техника','стикер'],
  ['Скок от стартов блок','🚀','Смелост','медал'],
  ['Пълна тренировка без спиране','🔥','Издръжливост','тениска']
];

/* ---------------- Меню в таблицата ---------------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SwimWithSmile')
    .addItem('1) Първоначална настройка', 'setup')
    .addItem('2) Хеширай паролите', 'hashPlainPasswords')
    .addToUi();
}

/* ---------------- Първоначална настройка ---------------- */
function setup() {
  // Гарантираме „pepper" (таен ключ) за подписване на токени и хеширане
  pepper_();
  ensureSchema_(true);

  // Демо треньор (смени го!) — паролата е в чист вид, докато не я хешираш
  if (readObjects_('Coaches').length === 0) {
    var teamId = createTeam_('SwimWithSmile', 'club', null);
    var coachId = Utilities.getUuid();
    appendObject_('Coaches', {
      id: coachId, fullName: 'Треньор', email: 'coach@example.com',
      passwordHash: 'promeni-me', active: 'TRUE', createdAt: nowIso_(), teamId: teamId, role: 'owner'
    });
    updateById_('Teams', teamId, { ownerId: coachId });
    PropertiesService.getScriptProperties().setProperty('LEGACY_TEAM_ID', teamId);
  }

  SpreadsheetApp.getUi().alert('Готово! Табовете са създадени.\n\nСега: в таб „Coaches" сложи своя имейл и парола, после пусни „2) Хеширай паролите".');
}

/* ------------------------------------------------------------
   Схема + миграция към отбори (безопасна, изпълнява се веднъж).
   Добавя липсващите колони НАКРАЯ на всеки таб и прехвърля
   старите данни (без teamId) в един отбор „SwimWithSmile".
   ------------------------------------------------------------ */
function ensureSchema_(force) {
  var props = PropertiesService.getScriptProperties();
  if (!force && props.getProperty('SCHEMA_V') === SCHEMA_VERSION) return;

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!force && props.getProperty('SCHEMA_V') === SCHEMA_VERSION) return;
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
      // Всичко като текст, за да не превръща Sheets датите/числата
      sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    });

    // Миграция: съществуващите треньори и данни → един общ отбор
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
    props.setProperty('SCHEMA_V', SCHEMA_VERSION);
  } finally {
    lock.releaseLock();
  }
}

// Попълва празните клетки в колона с дадена стойност (една операция за целия таб)
function fillEmptyColumn_(name, col, value) {
  var sh = sh_(name);
  if (sh.getLastRow() < 2) return;
  var headers = headers_(name);
  var c = headers.indexOf(col);
  if (c < 0) return;
  var rng = sh.getRange(2, c + 1, sh.getLastRow() - 1, 1);
  var vals = rng.getValues();
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(); // колона id — пропускаме празните редове
  for (var i = 0; i < vals.length; i++) {
    if (rows[i][0] !== '' && (vals[i][0] === '' || vals[i][0] === null)) vals[i][0] = value;
  }
  rng.setNumberFormat('@').setValues(vals);
}

function createTeam_(name, plan, ownerId) {
  var id = Utilities.getUuid();
  appendObject_('Teams', {
    id: id, name: name, plan: PLANS[plan] ? plan : 'solo',
    inviteCode: newInviteCode_(), ownerId: ownerId || '', createdAt: nowIso_()
  });
  return id;
}

function seedAchievements_(teamId) {
  DEFAULT_ACHIEVEMENTS.forEach(function (a) {
    appendObject_('Achievements', {
      id: Utilities.getUuid(), name: a[0], icon: a[1], category: a[2], reward: a[3],
      isActive: 'TRUE', createdAt: nowIso_(), teamId: teamId
    });
  });
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
  SpreadsheetApp.getUi().alert(n + ' парола(и) хеширани.');
}

/* ============================================================
   HTTP входни точки
   ============================================================ */
function doGet() {
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
var WRITE_RE = /^(create|update|delete|regenerate|upsert|remove|award|register|join|setPlan)/;

// Всяка грешка за достъп хвърля Denied_ → връща се като 404/403, а не 500
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
  }
  try {
    switch (action) {
      case 'login':                return actLogin_(p);
      case 'register':             return actRegister_(p);
      case 'inviteInfo':           return actInviteInfo_(p);
      case 'joinTeam':             return actJoinTeam_(p);
      case 'team':                 return actTeam_(p);
      case 'updateTeam':           return actUpdateTeam_(p);
      case 'setPlan':              return actSetPlan_(p);
      case 'regenerateInvite':     return actRegenerateInvite_(p);
      case 'removeCoach':          return actRemoveCoach_(p);
      case 'coaches':              return actCoaches_(p);

      case 'children':             return actChildren_(p);
      case 'child':                return D(childOut_(mustChild_(p.id, p._teamId)));
      case 'createChild':          return actCreateChild_(p);
      case 'updateChild':          return actUpdateChild_(p);
      case 'regenerateCode':       return actRegenerateCode_(p);
      case 'childHistory':         return actChildHistory_(p);
      case 'childProgress':        return actChildProgress_(p);
      case 'childAchievements':    return actChildAchievements_(p);
      case 'childCompetitions':    return actChildCompetitions_(p);

      case 'sessions':             return actSessions_(p);
      case 'calendar':             return actSessions_(p);
      case 'calendarEvents':       return actCalendarEvents_(p);
      case 'session':              return actSession_(p);
      case 'createSession':        return actCreateSession_(p);
      case 'updateSession':        return actUpdateSession_(p);
      case 'deleteSession':        return actDeleteSession_(p);
      case 'upsertParticipant':    return actUpsertParticipant_(p);
      case 'removeParticipant':    return actRemoveParticipant_(p);

      case 'createProgress':       return actCreateProgress_(p);
      case 'deleteProgress':       return actDeleteChildRow_('Progress', p.id, p._teamId);

      case 'achievements':         return actAchievements_(p);
      case 'createAchievement':    return actCreateAchievement_(p);
      case 'updateAchievement':    return actUpdateAchievement_(p);
      case 'deleteAchievement':    return actDeleteAchievement_(p);
      case 'award':                return actAward_(p);
      case 'removeAward':          return actDeleteChildRow_('Awards', p.id, p._teamId);

      case 'createCompetition':    return actCreateCompetition_(p);
      case 'updateCompetition':    return actUpdateCompetition_(p);
      case 'deleteCompetition':    return actDeleteChildRow_('Competitions', p.id, p._teamId);

      case 'parentDashboard':      return actParentDashboard_(p);

      default:                     return E(400, 'Непозната операция: ' + action);
    }
  } catch (err) {
    if (err instanceof Denied_) return E(err.status, err.message);
    throw err;
  } finally {
    if (lock) lock.releaseLock();
  }
}

/* ============================================================
   Действия — Auth
   ============================================================ */
function actLogin_(p) {
  var email = String(p.email || '').trim().toLowerCase();
  var password = String(p.password || '');
  var c = readObjects_('Coaches').filter(function (x) {
    return String(x.email || '').trim().toLowerCase() === email && nb_(x.active);
  })[0];
  if (!c) return E(401, 'Грешен имейл или парола.');

  var stored = String(c.passwordHash || '');
  var okpw = stored.indexOf('sha256:') === 0 ? (stored === hashPw_(password)) : (stored === password);
  if (!okpw) return E(401, 'Грешен имейл или парола.');

  return D(sessionOut_(c));
}

// Отговор след вход/регистрация: токен + кой е треньорът и в кой отбор е
function sessionOut_(c) {
  var t = findById_('Teams', c.teamId) || {};
  return { token: makeToken_(c.id), coachId: c.id, fullName: c.fullName, email: c.email,
           teamId: c.teamId || null, teamName: t.name || '', role: c.role || 'coach', plan: t.plan || 'solo' };
}

function validateNewCoach_(d) {
  var email = String(d.email || '').trim().toLowerCase();
  var name = String(d.fullName || '').trim();
  var pw = String(d.password || '');
  if (name.length < 2) return 'Въведи име и фамилия.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Невалиден имейл.';
  if (pw.length < 8) return 'Паролата трябва да е поне 8 символа.';
  var taken = readObjects_('Coaches').some(function (c) { return String(c.email || '').trim().toLowerCase() === email; });
  if (taken) return 'Вече има профил с този имейл. Влез в него.';
  return null;
}

function actRegister_(p) {
  var d = p.data || {};
  var teamName = String(d.teamName || '').trim();
  if (teamName.length < 2) return E(400, 'Въведи име на отбора.');
  var bad = validateNewCoach_(d);
  if (bad) return E(400, bad);

  var plan = PLANS[d.plan] ? d.plan : 'solo';
  var coachId = Utilities.getUuid();
  var teamId = createTeam_(teamName.slice(0, 60), plan, coachId);
  var coach = {
    id: coachId, fullName: String(d.fullName).trim().slice(0, 80), email: String(d.email).trim().toLowerCase(),
    passwordHash: hashPw_(String(d.password)), active: 'TRUE', createdAt: nowIso_(), teamId: teamId, role: 'owner'
  };
  appendObject_('Coaches', coach);
  seedAchievements_(teamId);
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
  var plan = PLANS[t.plan] || PLANS.solo;
  var used = activeCoaches_(t.id).length;
  return D({ teamName: t.name, ownerName: owner.fullName || '', seatsLeft: Math.max(0, plan.seats - used) });
}

function actJoinTeam_(p) {
  var d = p.data || {};
  var t = teamByInvite_(d.code);
  if (!t) return E(404, 'Поканата е невалидна или е сменена.');
  var plan = PLANS[t.plan] || PLANS.solo;
  if (activeCoaches_(t.id).length >= plan.seats)
    return E(403, 'Отборът е пълен за плана „' + plan.name + '". Помоли собственика да смени плана.');
  var bad = validateNewCoach_(d);
  if (bad) return E(400, bad);

  var coach = {
    id: Utilities.getUuid(), fullName: String(d.fullName).trim().slice(0, 80), email: String(d.email).trim().toLowerCase(),
    passwordHash: hashPw_(String(d.password)), active: 'TRUE', createdAt: nowIso_(), teamId: t.id, role: 'coach'
  };
  appendObject_('Coaches', coach);
  return D(sessionOut_(coach));
}

function actTeam_(p) {
  var t = findById_('Teams', p._teamId);
  if (!t) return E(404, 'Отборът не е намерен.');
  var plan = PLANS[t.plan] || PLANS.solo;
  var members = activeCoaches_(t.id).map(function (c) {
    return { id: c.id, fullName: c.fullName, email: c.email, role: c.role || 'coach', createdAt: nn_(c.createdAt) };
  });
  var kids = readObjects_('Children').filter(function (c) { return String(c.teamId) === String(t.id) && nb_(c.isActive); }).length;
  return D({
    id: t.id, name: t.name, plan: t.plan || 'solo', planName: plan.name, seats: plan.seats, kidsLimit: plan.kids,
    kids: kids, members: members, isOwner: p._role === 'owner',
    inviteCode: p._role === 'owner' ? t.inviteCode : null, plans: PLANS
  });
}

function mustOwner_(p) {
  if (p._role !== 'owner') throw new Denied_(403, 'Само собственикът на отбора може да прави това.');
}

function actUpdateTeam_(p) {
  mustOwner_(p);
  var name = String((p.data || {}).name || '').trim();
  if (name.length < 2) return E(400, 'Въведи име на отбора.');
  updateById_('Teams', p._teamId, { name: name.slice(0, 60) });
  return D(null);
}

function actSetPlan_(p) {
  mustOwner_(p);
  var plan = PLANS[p.plan];
  if (!plan) return E(400, 'Непознат план.');
  if (activeCoaches_(p._teamId).length > plan.seats)
    return E(400, 'В отбора има повече треньори, отколкото позволява „' + plan.name + '". Първо премахни някого.');
  updateById_('Teams', p._teamId, { plan: p.plan });
  return D(null);
}

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

/* ============================================================
   Действия — Деца
   ============================================================ */
function actChildren_(p) {
  var list = inTeam_(readObjects_('Children'), p._teamId);
  if (!p.includeInactive) list = list.filter(function (c) { return nb_(c.isActive); });
  list.sort(function (a, b) {
    return ((a.firstName || '') + (a.lastName || '')).localeCompare((b.firstName || '') + (b.lastName || ''), 'bg');
  });
  return D(list.map(childOut_));
}

function actCreateChild_(p) {
  var d = p.data || {};
  var t = findById_('Teams', p._teamId) || {};
  var plan = PLANS[t.plan] || PLANS.solo;
  var count = inTeam_(readObjects_('Children'), p._teamId).filter(function (c) { return nb_(c.isActive); }).length;
  if (count >= plan.kids) return E(403, 'Достигнат е лимитът от ' + plan.kids + ' деца за плана „' + plan.name + '".');
  var id = Utilities.getUuid();
  var code = newParentCode_();
  appendObject_('Children', {
    id: id, firstName: d.firstName || '', lastName: d.lastName || '', birthDate: nd_(d.birthDate),
    gender: d.gender || '', level: d.level || '',
    trainingStartDate: d.trainingStartDate ? nd_(d.trainingStartDate) : '',
    diagnosis: d.diagnosis || '', objectiveCondition: d.objectiveCondition || '',
    allergiesMedical: d.allergiesMedical || '', parentContact: d.parentContact || '',
    emergencyContact: d.emergencyContact || '', goals: d.goals || '', notes: d.notes || '',
    parentCode: code, photoUrl: d.photoUrl || '', isActive: 'TRUE', createdAt: nowIso_(), teamId: p._teamId
  });
  return D({ id: id, parentCode: code });
}

function actUpdateChild_(p) {
  mustChild_(p.id, p._teamId);
  var d = p.data || {};
  var patch = {};
  ['firstName','lastName','gender','level','diagnosis','objectiveCondition','allergiesMedical',
   'parentContact','emergencyContact','goals','notes','photoUrl'].forEach(function (k) {
    if (d[k] !== undefined) patch[k] = d[k] === null ? '' : d[k];
  });
  if (d.birthDate !== undefined) patch.birthDate = nd_(d.birthDate);
  if (d.trainingStartDate !== undefined) patch.trainingStartDate = d.trainingStartDate ? nd_(d.trainingStartDate) : '';
  if (d.isActive !== undefined) patch.isActive = d.isActive ? 'TRUE' : 'FALSE';
  if (!updateById_('Children', p.id, patch)) return E(404, 'Детето не е намерено.');
  return D(null);
}

function actRegenerateCode_(p) {
  mustChild_(p.id, p._teamId);
  var code = newParentCode_();
  if (!updateById_('Children', p.id, { parentCode: code })) return E(404, 'Детето не е намерено.');
  return D({ parentCode: code });
}

function actChildHistory_(p) {
  mustChild_(p.id, p._teamId);
  var sessions = mapById_('Sessions');
  var coaches = coachMap_();
  var out = readObjects_('Participants')
    .filter(function (pt) { return String(pt.childId) === String(p.id); })
    .map(function (pt) {
      var s = sessions[pt.sessionId] || {};
      return {
        sessionId: pt.sessionId, sessionDate: nd_(s.sessionDate), startTime: nt_(s.startTime),
        location: nn_(s.location), coachId: nn_(s.coachId),
        coachName: (coaches[s.coachId] || {}).fullName || 'Треньор',
        attended: nb_(pt.attended), swamWhat: nn_(pt.swamWhat),
        dailyProgress: nn_(pt.dailyProgress), mood: nn_(pt.mood)
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
  var ach = mapById_('Achievements');
  var out = readObjects_('Awards')
    .filter(function (a) { return String(a.childId) === String(p.id); })
    .map(function (a) {
      var d = ach[a.achievementId] || {};
      return { id: a.id, name: d.name || '', icon: d.icon || '🏅', reward: nn_(d.reward), awardedDate: nd_(a.awardedDate) };
    });
  out.sort(function (a, b) { return (b.awardedDate || '').localeCompare(a.awardedDate || ''); });
  return D(out);
}

function actChildCompetitions_(p) {
  mustChild_(p.id, p._teamId);
  var out = readObjects_('Competitions')
    .filter(function (k) { return String(k.childId) === String(p.id); })
    .map(function (k) {
      return { id: k.id, eventName: k.eventName || '', eventDate: nd_(k.eventDate),
               results: nn_(k.results), notes: nn_(k.notes) };
    });
  out.sort(function (a, b) { return (b.eventDate || '').localeCompare(a.eventDate || ''); });
  return D(out);
}

/* ============================================================
   Действия — Тренировки
   ============================================================ */
function actSessions_(p) {
  var y = Number(p.year), m = Number(p.month);           // month 1-12
  var prefix = y + '-' + pad2_(m);
  var coaches = coachMap_();
  var countBy = {};
  readObjects_('Participants').forEach(function (pt) {
    countBy[pt.sessionId] = (countBy[pt.sessionId] || 0) + 1;
  });
  var out = inTeam_(readObjects_('Sessions'), p._teamId)
    .filter(function (s) { return nd_(s.sessionDate).slice(0, 7) === prefix; })
    .map(function (s) {
      return {
        id: s.id, sessionDate: nd_(s.sessionDate), startTime: nt_(s.startTime),
        coachId: nn_(s.coachId), coachName: (coaches[s.coachId] || {}).fullName || 'Треньор',
        location: nn_(s.location), notes: nn_(s.notes), participantCount: countBy[s.id] || 0
      };
    });
  return D(out);
}

function actSession_(p) {
  var s = mustSession_(p.id, p._teamId);
  var coaches = coachMap_();
  var children = childMap_();
  var participants = readObjects_('Participants')
    .filter(function (pt) { return String(pt.sessionId) === String(p.id); })
    .map(function (pt) {
      var ch = children[pt.childId] || {};
      return {
        childId: pt.childId, childName: ((ch.firstName || '') + ' ' + (ch.lastName || '')).trim(),
        attended: nb_(pt.attended), swamWhat: nn_(pt.swamWhat),
        dailyProgress: nn_(pt.dailyProgress), mood: nn_(pt.mood)
      };
    });
  return D({
    id: s.id, sessionDate: nd_(s.sessionDate), startTime: nt_(s.startTime),
    coachId: nn_(s.coachId), coachName: (coaches[s.coachId] || {}).fullName || 'Треньор',
    location: nn_(s.location), notes: nn_(s.notes), participants: participants
  });
}

function actCreateSession_(p) {
  var d = p.data || {};
  var id = Utilities.getUuid();
  appendObject_('Sessions', {
    id: id, sessionDate: nd_(d.sessionDate), startTime: nt_(d.startTime),
    coachId: teamCoachOr_(d.coachId, p), location: d.location || '', notes: d.notes || '',
    createdAt: nowIso_(), teamId: p._teamId
  });
  return D({ id: id });
}

function actUpdateSession_(p) {
  mustSession_(p.id, p._teamId);
  var d = p.data || {};
  var patch = {};
  if (d.sessionDate !== undefined) patch.sessionDate = nd_(d.sessionDate);
  if (d.startTime !== undefined) patch.startTime = nt_(d.startTime);
  if (d.coachId !== undefined) patch.coachId = teamCoachOr_(d.coachId, p);
  if (d.location !== undefined) patch.location = d.location || '';
  if (d.notes !== undefined) patch.notes = d.notes || '';
  if (!updateById_('Sessions', p.id, patch)) return E(404, 'Тренировката не е намерена.');
  return D(null);
}

function actDeleteSession_(p) {
  mustSession_(p.id, p._teamId);
  // Изтриваме и участниците към тренировката
  readObjects_('Participants')
    .filter(function (pt) { return String(pt.sessionId) === String(p.id); })
    .forEach(function (pt) { deleteById_('Participants', pt.id); });
  deleteById_('Sessions', p.id);
  return D(null);
}

function actUpsertParticipant_(p) {
  var sid = p.sessionId;
  var d = p.data || {};
  mustSession_(sid, p._teamId);
  mustChild_(d.childId, p._teamId);
  var existing = readObjects_('Participants').filter(function (pt) {
    return String(pt.sessionId) === String(sid) && String(pt.childId) === String(d.childId);
  })[0];
  var patch = {
    attended: d.attended ? 'TRUE' : 'FALSE',
    swamWhat: d.swamWhat || '', dailyProgress: d.dailyProgress || '',
    mood: d.mood || '', updatedAt: nowIso_()
  };
  if (existing) {
    updateById_('Participants', existing.id, patch);
  } else {
    appendObject_('Participants', Object.assign(
      { id: Utilities.getUuid(), sessionId: sid, childId: d.childId }, patch));
  }
  return D(null);
}

function actRemoveParticipant_(p) {
  mustSession_(p.sessionId, p._teamId);
  readObjects_('Participants')
    .filter(function (pt) { return String(pt.sessionId) === String(p.sessionId) && String(pt.childId) === String(p.childId); })
    .forEach(function (pt) { deleteById_('Participants', pt.id); });
  return D(null);
}

/* ============================================================
   Действие — Събития от Google Calendar (само четене)
   ============================================================ */
function actCalendarEvents_(p) {
  // Календарът е личният Google календар на собственика на скрипта —
  // показва се САМО на първоначалния отбор, никога на нови отбори.
  if (p._teamId !== PropertiesService.getScriptProperties().getProperty('LEGACY_TEAM_ID')) return D([]);
  var y = Number(p.year), m = Number(p.month);        // month 1-12
  var start = new Date(y, m - 1, 1, 0, 0, 0);
  var end = new Date(y, m, 1, 0, 0, 0);               // 1-во число на следващия месец
  var cal;
  try { cal = CalendarApp.getDefaultCalendar(); } catch (e) { return D([]); }
  if (!cal) return D([]);
  var events = cal.getEvents(start, end) || [];
  var out = events.map(function (e) {
    var allDay = e.isAllDayEvent();
    var s = e.getStartTime(), en = e.getEndTime();
    return {
      id: e.getId(),
      title: e.getTitle() || '(без заглавие)',
      date: Utilities.formatDate(s, TZ, 'yyyy-MM-dd'),
      startTime: allDay ? null : Utilities.formatDate(s, TZ, 'HH:mm:ss'),
      endTime: allDay ? null : Utilities.formatDate(en, TZ, 'HH:mm:ss'),
      location: nn_(e.getLocation()),
      description: nn_((e.getDescription() || '').slice(0, 500)),
      allDay: allDay
    };
  });
  out.sort(function (a, b) {
    return (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || ''));
  });
  return D(out);
}

/* ============================================================
   Действия — Напредък
   ============================================================ */
function actCreateProgress_(p) {
  var d = p.data || {};
  mustChild_(d.childId, p._teamId);
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
  return D({ id: id });
}

/* ============================================================
   Действия — Постижения
   ============================================================ */
function actAchievements_(p) {
  var list = inTeam_(readObjects_('Achievements'), p._teamId);
  if (!p.includeInactive) list = list.filter(function (a) { return nb_(a.isActive); });
  return D(list.map(function (a) {
    return { id: a.id, name: a.name || '', icon: a.icon || '🏅', category: nn_(a.category),
             reward: nn_(a.reward), isActive: nb_(a.isActive) };
  }));
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
  // Махаме и раздадените награди с това постижение
  readObjects_('Awards')
    .filter(function (a) { return String(a.achievementId) === String(p.id); })
    .forEach(function (a) { deleteById_('Awards', a.id); });
  deleteById_('Achievements', p.id);
  return D(null);
}

function actAward_(p) {
  var d = p.data || {};
  mustChild_(d.childId, p._teamId);
  mustInTeam_('Achievements', d.achievementId, p._teamId, 'Постижението не е намерено.');
  var id = Utilities.getUuid();
  appendObject_('Awards', {
    id: id, childId: d.childId || '', achievementId: d.achievementId || '',
    awardedDate: nd_(d.awardedDate), awardedBy: p._coachId, note: d.note || '', createdAt: nowIso_()
  });
  return D({ id: id });
}

/* ============================================================
   Действия — Състезания
   ============================================================ */
function actCreateCompetition_(p) {
  var d = p.data || {};
  mustChild_(d.childId, p._teamId);
  var id = Utilities.getUuid();
  appendObject_('Competitions', {
    id: id, childId: d.childId || '', eventDate: nd_(d.eventDate), eventName: d.eventName || '',
    results: d.results || '', notes: d.notes || '', createdBy: p._coachId, createdAt: nowIso_()
  });
  return D({ id: id });
}

function actUpdateCompetition_(p) {
  mustChildRow_('Competitions', p.id, p._teamId);
  var d = p.data || {};
  var patch = {};
  ['eventName','results','notes'].forEach(function (k) { if (d[k] !== undefined) patch[k] = d[k] === null ? '' : d[k]; });
  if (d.eventDate !== undefined) patch.eventDate = nd_(d.eventDate);
  if (!updateById_('Competitions', p.id, patch)) return E(404, 'Състезанието не е намерено.');
  return D(null);
}

/* ============================================================
   Действие — Родителски достъп (публично)
   ============================================================ */
function actParentDashboard_(p) {
  var code = String(p.code || '').trim();
  var bd = nd_(p.birthDate);
  var child = readObjects_('Children').filter(function (c) {
    return String(c.parentCode || '') === code && nd_(c.birthDate) === bd && nb_(c.isActive);
  })[0];
  if (!child) return E(404, 'Няма дете с този код и дата на раждане.');

  var co = childOut_(child);
  var ach = mapById_('Achievements');
  var awards = readObjects_('Awards')
    .filter(function (a) { return String(a.childId) === String(child.id); })
    .map(function (a) { var d = ach[a.achievementId] || {};
      return { icon: d.icon || '🏅', name: d.name || '', reward: nn_(d.reward), awardedDate: nd_(a.awardedDate) }; })
    .sort(function (a, b) { return (b.awardedDate || '').localeCompare(a.awardedDate || ''); });

  var sessions = mapById_('Sessions');
  var coaches = coachMap_();
  var history = readObjects_('Participants')
    .filter(function (pt) { return String(pt.childId) === String(child.id); })
    .map(function (pt) { var s = sessions[pt.sessionId] || {};
      return { sessionDate: nd_(s.sessionDate), coachName: (coaches[s.coachId] || {}).fullName || 'Треньор' }; })
    .filter(function (h) { return h.sessionDate; })
    .sort(function (a, b) { return (b.sessionDate || '').localeCompare(a.sessionDate || ''); });

  var progs = readObjects_('Progress')
    .filter(function (r) { return String(r.childId) === String(child.id); })
    .map(progressOut_)
    .sort(function (a, b) { return (b.assessmentDate || '').localeCompare(a.assessmentDate || ''); });

  return D({
    child: {
      firstName: co.firstName, lastName: co.lastName, birthDate: co.birthDate,
      photoUrl: co.photoUrl, level: co.level, goals: co.goals, ageYears: ageFromBd_(co.birthDate)
    },
    achievements: awards, history: history, progress: progs[0] || null
  });
}

/* ============================================================
   Изходни форматери
   ============================================================ */
function childOut_(c) {
  return {
    id: c.id, firstName: c.firstName, lastName: c.lastName,
    birthDate: nd_(c.birthDate), gender: nn_(c.gender), level: nn_(c.level),
    trainingStartDate: c.trainingStartDate ? nd_(c.trainingStartDate) : null,
    diagnosis: nn_(c.diagnosis), objectiveCondition: nn_(c.objectiveCondition),
    allergiesMedical: nn_(c.allergiesMedical), parentContact: nn_(c.parentContact),
    emergencyContact: nn_(c.emergencyContact), goals: nn_(c.goals), notes: nn_(c.notes),
    parentCode: String(c.parentCode || ''), photoUrl: nn_(c.photoUrl), isActive: nb_(c.isActive)
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
   Достъп до таблицата
   ============================================================ */
function sh_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Липсва таб „' + name + '". Пусни „Първоначална настройка".');
  return sh;
}

function headers_(name) {
  var sh = sh_(name);
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function readObjects_(name) {
  var sh = sh_(name);
  if (sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var headers = vals[0].map(String);
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var row = vals[i];
    var empty = true;
    for (var k = 0; k < row.length; k++) { if (row[k] !== '' && row[k] !== null) { empty = false; break; } }
    if (empty) continue;
    var o = {};
    for (var j = 0; j < headers.length; j++) o[headers[j]] = row[j];
    out.push(o);
  }
  return out;
}

function appendObject_(name, obj) {
  var sh = sh_(name);
  var headers = headers_(name);
  var r = sh.getLastRow() + 1;
  var rng = sh.getRange(r, 1, 1, headers.length);
  rng.setNumberFormat('@');
  var row = headers.map(function (h) {
    return (obj[h] !== undefined && obj[h] !== null) ? String(obj[h]) : '';
  });
  rng.setValues([row]);
  return obj;
}

function updateById_(name, id, patch) {
  var sh = sh_(name);
  var vals = sh.getDataRange().getValues();
  var headers = vals[0].map(String);
  var idCol = headers.indexOf('id');
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idCol]) === String(id)) {
      var row = headers.map(function (h, j) {
        if (patch[h] !== undefined) return patch[h] === null ? '' : String(patch[h]);
        var v = vals[i][j];
        return (v === null || v === undefined) ? '' : String(v);
      });
      var rng = sh.getRange(i + 1, 1, 1, headers.length);
      rng.setNumberFormat('@');
      rng.setValues([row]);
      return true;
    }
  }
  return false;
}

function deleteById_(name, id) {
  var sh = sh_(name);
  var vals = sh.getDataRange().getValues();
  var headers = vals[0].map(String);
  var idCol = headers.indexOf('id');
  for (var i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][idCol]) === String(id)) { sh.deleteRow(i + 1); return true; }
  }
  return false;
}

function actDeleteById_(name, id) { deleteById_(name, id); return D(null); }

function findById_(name, id) {
  return readObjects_(name).filter(function (o) { return String(o.id) === String(id); })[0] || null;
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

// Връща реда, само ако принадлежи на отбора — иначе „не е намерен"
function mustInTeam_(name, id, teamId, msg) {
  var o = findById_(name, id);
  if (!o || String(o.teamId) !== String(teamId)) throw new Denied_(404, msg);
  return o;
}
function mustChild_(id, teamId) { return mustInTeam_('Children', id, teamId, 'Детето не е намерено.'); }
function mustSession_(id, teamId) { return mustInTeam_('Sessions', id, teamId, 'Тренировката не е намерена.'); }

// За таблици, вързани към дете (Progress, Awards, Competitions)
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

// Треньор на тренировка: само от същия отбор, иначе текущият
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
function pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

function nn_(v) {  // празно → null
  if (v === null || v === undefined) return null;
  v = String(v);
  return v === '' ? null : v;
}

function nd_(v) {  // нормализирана дата „yyyy-MM-dd"
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function nt_(v) {  // време „HH:mm:ss"
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, TZ, 'HH:mm:ss');
  return String(v);
}

function nb_(v) {  // булево
  return v === true || v === 1 || v === '1' ||
    String(v).toUpperCase() === 'TRUE' || String(v).toLowerCase() === 'true' ||
    String(v).toLowerCase() === 'да';
}

function num_(v) {  // число или null
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function numStr_(v) {  // за запис: число като текст, или празно
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isNaN(n) ? '' : String(n);
}

function newInviteCode_() {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без 0/O/1/I — лесно за диктуване
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
  var b = new Date(bd + 'T00:00:00'), n = new Date();
  var a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
