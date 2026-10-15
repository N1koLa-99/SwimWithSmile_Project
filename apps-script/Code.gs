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
  Teams:        ['id','name','plan','inviteCode','ownerId','createdAt','icsKey'],
  Coaches:      ['id','fullName','email','passwordHash','active','createdAt','teamId','role'],
  Children:     ['id','firstName','lastName','birthDate','gender','level','trainingStartDate',
                 'diagnosis','objectiveCondition','allergiesMedical','parentContact','emergencyContact',
                 'goals','notes','parentCode','photoUrl','isActive','createdAt','teamId',
                 'parentName','parentPhone','parentEmail','emergencyName','emergencyPhone',
                 'medicalAlert','specialNeeds','medicalUntil','consentDate','groupId','notifyParent','calendarName',
                 'isAdult'],
  Groups:       ['id','name','color','location','days','time','durationMin','isActive','createdAt','teamId'],
  Sessions:     ['id','sessionDate','startTime','coachId','location','notes','createdAt','teamId',
                 'groupId','durationMin','seriesId','status','gcalKey'],
  Participants: ['id','sessionId','childId','attended','swamWhat','dailyProgress','mood','updatedAt','parentNote'],
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

// Планове: брой треньори и плувци (деца и възрастни) в един отбор. Плащанията още не са
// свързани — планът се сменя от страница „Отбор" в приложението.
var PLANS = {
  solo: { name: 'Соло',  seats: 1,  kids: 15 },
  team: { name: 'Отбор', seats: 3,  kids: 60 },
  club: { name: 'Клуб',  seats: 10, kids: 300 }
};
var SCHEMA_VERSION = '5';

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
    .addToUi();
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

  SpreadsheetApp.getUi().alert('Готово! Табовете са създадени.\n\nСега: в таб „Coaches" сложи своя имейл и парола, после пусни „2) Хеширай паролите".');
}

/* ------------------------------------------------------------
   Схема + миграции (безопасни, изпълняват се веднъж на версия).
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
  } finally {
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
    id: id, name: name, plan: PLANS[plan] ? plan : 'solo',
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
      return ContentService.createTextOutput(buildIcs_(p.ics, p.coach))
        .setMimeType(ContentService.MimeType.ICAL);
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
    if (lock) lock.releaseLock();
  }
}

/* ============================================================
   Auth и отбор
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
    notify: notifyStatus_()
  });
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
  var plan = PLANS[t.plan] || PLANS.solo;
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
  mustChild_(p.id, p._teamId);
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
        dailyProgress: nn_(pt.dailyProgress), mood: nn_(pt.mood), parentNote: nn_(pt.parentNote)
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
    title: s.gcalKey ? String(s.notes || '').replace(/^От Google Calendar: /, '') || null : null, fromCalendar: !!s.gcalKey,
    durationMin: num_(s.durationMin) || num_(g.durationMin) || 45,
    seriesId: nn_(s.seriesId), status: nn_(s.status),
    participantCount: c ? c.n : undefined, presentCount: c ? c.present : undefined, markedCount: c ? c.marked : undefined
  };
}

function participantCounts_() {
  var countBy = {};
  readObjects_('Participants').forEach(function (pt) {
    var c = countBy[pt.sessionId] || (countBy[pt.sessionId] = { n: 0, present: 0, marked: 0 });
    c.n++;
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
  var out = sessOut_(s, coaches, groups, null);
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
        dailyProgress: nn_(pt.dailyProgress), mood: nn_(pt.mood), parentNote: nn_(pt.parentNote)
      };
    })
    .sort(function (a, b) { return a.childName.localeCompare(b.childName, 'bg'); });
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
      durationMin: numStr_(d.durationMin) || (group ? numStr_(group.durationMin) : ''), seriesId: seriesId, status: ''
    };
  });
  // Хората, записани по име. Нови имена → нов картон автоматично (преди тренировката, за да не остане половин запис)
  var res = resolvePeople_(d.people, p._teamId);
  if (res.error) return res.error;
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
      parts.push({ id: Utilities.getUuid(), sessionId: s.id, childId: cid, attended: '', updatedAt: nowIso_() });
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
  ['swamWhat','dailyProgress','mood','parentNote'].forEach(function (k) {
    if (d[k] !== undefined) patch[k] = d[k] === null ? '' : String(d[k]).slice(0, 2000);
  });
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
      .setValues(vals.map(function (r) { return r.map(function (v) { return v === null || v === undefined ? '' : String(v); }); }));
    invalidate_('Participants');
  }
  var add = Object.keys(want).filter(function (cid) { return !seen[cid]; }).map(function (cid) {
    return { id: Utilities.getUuid(), sessionId: sid, childId: cid, attended: want[cid], updatedAt: nowIso_() };
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
// Събития от личния календар на собственика на скрипта.
// Всяко събитие се сравнява с имената на децата → „Йоан" = Йоан Петров.
function readCalendar_(teamId, start, end) {
  if (String(teamId) !== PropertiesService.getScriptProperties().getProperty('LEGACY_TEAM_ID')) return [];
  var cal;
  try { cal = CalendarApp.getDefaultCalendar(); } catch (e) { return []; }
  if (!cal) return [];
  return (cal.getEvents(start, end) || [])
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
        durationMin: allDay ? null : Math.max(15, Math.round((en.getTime() - s.getTime()) / 60000)),
        location: nn_(e.getLocation()), description: nn_((e.getDescription() || '').slice(0, 500)),
        allDay: allDay
      };
    });
}

function actCalendarEvents_(p) {
  var y = Number(p.year), m = Number(p.month);
  return D(annotateEvents_(readCalendar_(p._teamId, new Date(y, m - 1, 1, 0, 0, 0), new Date(y, m, 1, 0, 0, 0)), p._teamId));
}

function annotateEvents_(events, teamId) {
  if (!events.length) return [];
  var p = { _teamId: teamId };
  var kids = inTeam_(readObjects_('Children'), p._teamId).filter(function (c) { return nb_(c.isActive); });
  var imported = {};
  inTeam_(readObjects_('Sessions'), p._teamId).forEach(function (s) { if (s.gcalKey) imported[s.gcalKey] = s.id; });
  events.forEach(function (ev) {
    var c = matchChild_(ev.title, kids);
    ev.childId = c ? c.id : null;
    ev.childName = c ? (c.firstName + ' ' + (c.lastName || '')).trim() : null;
    ev.guessName = c ? null : guessName_(ev.title);
    ev.sessionId = imported[ev.key] || null;
  });
  events.sort(function (a, b) { return (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')); });
  return events;
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
           streak: 0, absStreak: 0, lastSeen: null, lastMarked: null, skills: 0, awards: 0, competitions: 0 };
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
  kids.forEach(function (c) { out[c.id] = emptyStats_(); out[c.id]._hist = []; });

  var sessions = mapById_('Sessions');
  var todayS = today_(), d30 = fmtDate_(addDays_(new Date(), -30));
  readObjects_('Participants').forEach(function (pt) {
    var st = out[pt.childId]; if (!st) return;
    var s = sessions[pt.sessionId]; if (!s || s.status === 'cancelled') return;
    var a = tri_(pt.attended); if (a === null) return;
    var ds = nd_(s.sessionDate); if (ds > todayS) return;
    st._hist.push({ k: ds + nt_(s.startTime), a: a, d: ds });
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
  var calendar = annotateEvents_(readCalendar_(p._teamId, d0, new Date(d0.getTime() + 86400000)), p._teamId)
    .filter(function (e) { return !e.sessionId && !e.allDay; });
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
               dailyProgress: nn_(pt.dailyProgress), parentNote: nn_(pt.parentNote) };
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
  } finally { lock.releaseLock(); }
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
    groupId: nn_(c.groupId), calendarName: nn_(c.calendarName), isAdult: nb_(c.isAdult), notifyParent: c.notifyParent === '' || c.notifyParent == null ? true : nb_(c.notifyParent)
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
function resetCache_() { _RC = {}; _HC = {}; _SC = {}; }
function invalidate_(name) { delete _RC[name]; delete _HC[name]; _SC = {}; }

function sh_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Липсва таб „' + name + '". Пусни „Първоначална настройка".');
  return sh;
}

function headers_(name) {
  if (_HC[name]) return _HC[name];
  var sh = sh_(name);
  return (_HC[name] = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String));
}

function readObjects_(name) {
  if (_RC[name]) return _RC[name];
  var sh = sh_(name);
  if (sh.getLastRow() < 2) return (_RC[name] = []);
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
