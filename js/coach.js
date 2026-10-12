/* ============================================================
   SwimWithSmile — Деца, картон, умения, групи, посещаемост, „Клуб"
   ============================================================ */
(() => {
  const S = window.__SWS;
  const { shell, guard, modal, closeModal, ask, toast, err, navigate, route, busy, copyText, loading, emptyState, avatar,
    I, esc, $, $$, initials, fmtDate, fmtShort, fmtTime, ageFrom, toDateInput, parseD, todayStr, telHref, plural,
    MONTHS, DOW, MOODS, MOOD_EMOJI, GENDERS } = S;

  const GROUP_COLORS = ['#1F73E0', '#12805a', '#F5883C', '#8B5CF6', '#EF5F6B', '#14B8A6', '#D97706', '#EC4899', '#0EA5E9', '#64748B'];
  const pctClass = (p) => p == null ? '' : p >= 80 ? 'good' : p >= 60 ? 'mid' : 'low';

  /* ===================== ДЕЦА ===================== */
  const kidsUi = { q: '', group: '' };

  route(/^\/app\/children$/, async () => {
    if (!guard()) return;
    shell('children', `
      <div class="page-head">
        <div><h1 class="pagettl">Деца</h1><p class="subtle" id="kidsCount">Картони, нива и посещаемост</p></div>
        <button class="btn btn-primary hide-m" id="newChild">${I.plus}<span>Ново дете</span></button>
      </div>
      <div class="filters">
        <label class="search">${I.search}<input class="input" id="kq" type="search" placeholder="Търси по име…" value="${esc(kidsUi.q)}" autocomplete="off"></label>
        <div class="fchips" id="kg"></div>
      </div>
      <div id="kids">${loading()}</div>`);
    $('#newChild').onclick = () => childForm();
    const paint = (boot) => {
      if (!$('#kids')) return;
      const groups = boot.groups || [];
      $('#kg').innerHTML = groups.length ? [`<button class="fchip ${!kidsUi.group ? 'on' : ''}" data-g="">Всички</button>`,
        ...groups.map(g => `<button class="fchip ${kidsUi.group === g.id ? 'on' : ''}" data-g="${g.id}" style="--gc:${g.color}"><i></i>${esc(g.name)}</button>`),
        `<button class="fchip ${kidsUi.group === '-' ? 'on' : ''}" data-g="-">Без група</button>`].join('') : '';
      $$('#kg .fchip').forEach(b => b.onclick = () => { kidsUi.group = b.dataset.g; paint(boot); });
      const q = kidsUi.q.trim().toLowerCase();
      const all = boot.children || [];
      const list = all.filter(k => (!q || `${k.firstName} ${k.lastName}`.toLowerCase().includes(q))
        && (!kidsUi.group || (kidsUi.group === '-' ? !k.groupId : k.groupId === kidsUi.group)));
      $('#kidsCount').textContent = plural(all.length, 'дете', 'деца') + ' в отбора';
      const host = $('#kids');
      if (!all.length) { host.innerHTML = emptyState(I.kids, 'Още няма деца', 'Добави първото дете — отнема минута.', `<button class="btn btn-primary" style="margin-top:16px" id="emptyKid">${I.plus} Ново дете</button>`); $('#emptyKid').onclick = () => childForm(); return; }
      if (!list.length) { host.innerHTML = emptyState(I.search, 'Няма съвпадения', 'Опитай с друго име или група.'); return; }
      const gById = Object.fromEntries(groups.map(g => [g.id, g]));
      host.innerHTML = `<div class="kid-grid2">${list.map(k => kidCard(k, gById[k.groupId])).join('')}</div>`;
      $$('.kc[data-id]', host).forEach(el => el.onclick = () => navigate('/app/child/' + el.dataset.id));
    };
    let t;
    $('#kq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { kidsUi.q = e.target.value; const b = API.peekBoot(); if (b) paint(b); }, 120); };
    const cached = API.peekBoot();
    if (cached) paint(cached);
    const off = API.onBoot(paint); S.onLeave(off);
    try { paint(await API.refreshBoot()); } catch (e) { if (!cached) err(e); }
  });

  function kidCard(k, g) {
    const lvl = k.lvl || {};
    return `<button class="kc" data-id="${k.id}">
      ${avatar(k.firstName, k.lastName, 'av-lg')}
      <span class="kc-main">
        <span class="kc-name">${esc(k.firstName)} ${esc(k.lastName)}${k.medicalAlert ? ` <span class="kc-alert" title="Здравно предупреждение">${I.alert}</span>` : ''}</span>
        <span class="kc-meta">
          <span>${ageFrom(k.birthDate)} г.</span>
          ${g ? `<span class="gtag" style="--gc:${g.color}"><i></i>${esc(g.name)}</span>` : ''}
          ${k.specialNeeds ? '<span class="tag tag-sop">СОП</span>' : ''}
          ${k.absStreak >= 2 ? `<span class="tag tag-warn">${k.absStreak}× отс.</span>` : ''}
        </span>
        <span class="kc-lvl"><span class="lvl-ico">${lvl.icon || '💧'}</span><b>${esc(lvl.name || 'Капка')}</b><span class="lvl-bar"><i style="width:${lvl.progress || 0}%"></i></span><small>${k.points || 0} т.</small></span>
      </span>
      ${k.pct != null ? `<span class="pct ${pctClass(k.pct)}" title="Посещаемост (30 дни)">${k.pct}%</span>` : ''}
    </button>`;
  }

  /* ===================== ПРОФИЛ НА ДЕТЕ ===================== */
  const profileTab = { cur: 'card' };
  let _child = null;

  route(/^\/app\/child\/([\w-]+)$/, async (id) => {
    if (!guard()) return;
    shell('children', `<div id="prof">${loading(1, 150)}</div>`);
    let child, boot;
    try { [child, boot] = await Promise.all([API.child(id), API.getBoot()]); } catch (e) { return err(e); }
    _child = child;
    const g = (boot.groups || []).find(x => x.id === child.groupId);
    const st = child.stats || {};
    const lvl = st.level || {};
    const phone = child.parentPhone || '';
    const ePhone = child.emergencyPhone || '';
    $('#prof').innerHTML = `
      <a href="#/app/children" class="btn btn-ghost btn-sm back">${I.chevL} Всички деца</a>
      <section class="ph2 rise">
        <div class="ph2-top">
          ${avatar(child.firstName, child.lastName, 'av-xl')}
          <div class="ph2-info">
            <h1>${esc(child.firstName)} ${esc(child.lastName)}</h1>
            <div class="ph2-tags">
              <span class="badge">${ageFrom(child.birthDate)} години</span>
              ${g ? `<span class="badge gtag" style="--gc:${g.color}"><i></i>${esc(g.name)}</span>` : ''}
              ${child.specialNeeds ? `<span class="badge badge-sop">СОП</span>` : ''}
              ${child.level ? `<span class="badge">${esc(child.level)}</span>` : ''}
            </div>
          </div>
          <div class="ph2-call">
            ${phone ? `<a class="btn btn-sun btn-sm" href="${telHref(phone)}">${I.phone}<span>Родител</span></a>` : ''}
            ${ePhone && ePhone !== phone ? `<a class="btn btn-glass btn-sm" href="${telHref(ePhone)}">${I.phone}<span>Спешен</span></a>` : ''}
          </div>
        </div>
        <div class="ph2-stats">
          <div class="lvl-card"><span class="lvl-big">${lvl.icon || '💧'}</span><div><small>Ниво ${lvl.no || 1}</small><b>${esc(lvl.name || 'Капка')}</b>
            <span class="lvl-bar lvl-bar-lg"><i style="width:${lvl.progress || 0}%"></i></span>
            <small>${st.points || 0} точки${lvl.next ? ` · още ${lvl.next.min - (st.points || 0)} до ${lvl.next.icon} ${esc(lvl.next.name)}` : ' · най-високо ниво!'}</small></div></div>
          <div class="stat"><b>${st.pct30 != null ? st.pct30 + '%' : st.pct != null ? st.pct + '%' : '—'}</b><small>посещаемост</small></div>
          <div class="stat"><b>${st.streak || 0}</b><small>поредни идвания</small></div>
          <div class="stat"><b>${st.skills || 0}</b><small>умения</small></div>
          <div class="stat"><b>${st.awards || 0}</b><small>награди</small></div>
        </div>
      </section>
      ${child.medicalAlert ? `<div class="med-banner rise">${I.alert}<span><b>Внимание:</b> ${esc(child.medicalAlert)}</span></div>` : ''}
      ${st.absStreak >= 2 ? `<div class="note warn rise">🚩 Отсъства ${st.absStreak} поредни тренировки${child.specialNeeds ? ' — при СОП постоянството е важно, обади се на родителя.' : '.'}</div>` : ''}
      <div class="tabs" id="tabs" role="tablist">
        ${[['card', 'Картон'], ['skills', 'Умения'], ['sessions', 'Тренировки'], ['progress', 'Напредък'], ['ach', 'Награди'], ['comp', 'Състезания']]
          .map(([k, l]) => `<button class="tab" data-t="${k}" role="tab">${l}</button>`).join('')}
      </div>
      <div id="tabView"></div>`;
    const setTab = (t) => { profileTab.cur = t; $$('#tabs .tab').forEach(x => { x.classList.toggle('active', x.dataset.t === t); x.setAttribute('aria-selected', x.dataset.t === t); }); renderTab(t, child); };
    $$('#tabs .tab').forEach(b => b.onclick = () => setTab(b.dataset.t));
    setTab(['card','skills','sessions','progress','ach','comp'].includes(profileTab.cur) ? profileTab.cur : 'card');
  });
  const reloadChild = () => { if (_child) S.render(); };

  async function renderTab(t, child) {
    const host = $('#tabView'); host.innerHTML = loading(3, 64);
    try {
      if (t === 'card') { host.innerHTML = cardTab(child); bindCardTab(child); }
      else if (t === 'skills') await skillsTab(child, host);
      else if (t === 'sessions') { host.innerHTML = await sessionsTab(child); bindSessionsTab(child); }
      else if (t === 'progress') {
        host.innerHTML = await progressTab(child);
        const b = $('#addProg'); if (b) b.onclick = () => progressForm(child);
        $$('[data-delprog]').forEach(b => b.onclick = async () => {
          if (!await ask('Изтриване', 'Да изтрия ли тази карта за напредък?', 'Изтрий', true)) return;
          try { await API.deleteProgress(b.dataset.delprog); toast('Изтрито', 'ok'); renderTab('progress', child); } catch (e) { err(e); }
        });
        requestAnimationFrame(() => $$('.prog-fill').forEach(f => f.style.width = f.dataset.w + '%'));
      }
      else if (t === 'ach') { host.innerHTML = await achTab(child); bindAchTab(child); }
      else if (t === 'comp') { host.innerHTML = await compTab(child); bindCompTab(child); }
    } catch (e) { err(e); host.innerHTML = ''; }
  }

  /* ---------- Картон ---------- */
  const infoItem = (k, v, opts = {}) => `<div class="info-item ${opts.wide ? 'wide' : ''}"><div class="k">${esc(k)}</div><div class="v ${v ? '' : 'no-data'}">${v ? (opts.html ? v : esc(v)) : 'Няма данни'}</div></div>`;
  const phoneHtml = (p) => p ? `<a class="tel" href="${telHref(p)}">${I.phone}${esc(p)}</a>` : '';
  const section = (icon, title, items, cls = '') => `
    <div class="card-section ${cls}"><div class="card-section-title"><span class="ico">${icon}</span>${title}</div><div class="info-grid">${items}</div></div>`;

  function cardTab(c) {
    const today = todayStr();
    const medState = !c.medicalUntil ? '' : c.medicalUntil < today ? ' ⛔ изтекло' : '';
    return `<div class="card card-pad rise">
      <div class="card-actions">
        <button class="btn btn-primary btn-sm" id="editChild">${I.edit} Редакция</button>
        <button class="btn btn-ghost btn-sm" id="printChild">${I.copy} Печат</button>
      </div>
      ${section(I.phone, 'Спешна връзка',
        infoItem('Родител', c.parentName) +
        infoItem('Телефон', phoneHtml(c.parentPhone), { html: true }) +
        infoItem('Имейл', c.parentEmail) +
        infoItem('Спешен контакт', [c.emergencyName, c.emergencyPhone ? phoneHtml(c.emergencyPhone) : ''].filter(Boolean).join(' · '), { html: true }) +
        (c.parentContact || c.emergencyContact ? infoItem('Други контакти', [c.parentContact, c.emergencyContact].filter(Boolean).join(' · '), { wide: true }) : ''), 'sec-urgent')}
      ${section(I.heart, 'Здраве',
        infoItem('Диагноза', c.diagnosis) +
        infoItem('Специални потребности (СОП)', c.specialNeeds) +
        infoItem('Алергии / лекарства', c.allergiesMedical) +
        infoItem('Медицинско валидно до', c.medicalUntil ? fmtDate(c.medicalUntil) + medState : '') +
        infoItem('Обективно състояние', c.objectiveCondition, { wide: true }))}
      ${section(I.kids, 'Основно',
        infoItem('Дата на раждане', fmtDate(c.birthDate)) +
        infoItem('Пол', c.gender) +
        infoItem('Тренира от', c.trainingStartDate ? fmtDate(c.trainingStartDate) : '') +
        infoItem('В Google Calendar', c.calendarName) +
        infoItem('Цели', c.goals, { wide: true }) +
        infoItem('Бележки', c.notes, { wide: true }))}
      <div class="card-section">
        <div class="card-section-title"><span class="ico">${I.lock}</span>Достъп за родителя</div>
        <div class="pcode">
          <div><small>Код</small><b>${esc(String(c.parentCode).replace(/(\d{4})(\d{4})/, '$1 $2'))}</b><small>+ дата на раждане</small></div>
          <div class="pcode-btns">
            <button class="btn btn-soft btn-sm" id="copyCode">${I.copy} Копирай</button>
            ${c.parentEmail ? `<button class="btn btn-sky btn-sm" id="sendInvite">${I.mail} Изпрати на ${esc(c.parentEmail)}</button>` : ''}
            ${navigator.share ? `<button class="btn btn-soft btn-sm" id="shareCode">${I.share} Сподели</button>` : ''}
            <button class="btn btn-ghost btn-sm" id="regen">${I.refresh} Нов код</button>
          </div>
        </div>
        <p class="subtle small">${c.notifyParent && c.parentEmail ? '✉️ Родителят получава имейл при награда, ново умение и седмично обобщение.' : 'Добави имейл на родителя, за да получава известия.'}
          ${c.consentDate ? ` · Съгласие за данните: ${fmtDate(c.consentDate)}` : ' · <b style="color:#B45309">Няма отбелязано съгласие за личните данни.</b>'}</p>
      </div>
      <div class="danger-zone">
        <button class="btn btn-ghost btn-sm" id="archChild">${c.isActive ? '📦 Архивирай (спря да тренира)' : '♻️ Върни като активно'}</button>
        <button class="btn btn-ghost btn-sm" id="delChild" style="color:var(--red)">${I.trash} Изтрий завинаги</button>
      </div>
    </div>`;
  }
  function bindCardTab(c) {
    const loginUrl = `${location.origin}${location.pathname}#/login?parent`;
    const msg = `Здравейте! Напредъкът на ${c.firstName} в басейна: ${loginUrl}\nКод: ${c.parentCode} + датата на раждане на детето.`;
    $('#editChild').onclick = () => childForm(c);
    $('#printChild').onclick = () => window.print();
    $('#copyCode').onclick = () => copyText(msg);
    const sh = $('#shareCode'); if (sh) sh.onclick = () => navigator.share({ title: 'SwimWithSmile', text: msg }).catch(() => {});
    const si = $('#sendInvite');
    if (si) si.onclick = async () => {
      busy(si, true, 'Изпращане…');
      try { const r = await API.sendParentInvite(c.id); toast(r.sent ? 'Имейлът е изпратен' : 'Ще бъде изпратен до 10 мин', 'ok'); }
      catch (e) { err(e); }
      busy(si, false);
    };
    $('#regen').onclick = async () => {
      if (!await ask('Нов код', 'Старият код спира да работи веднага. Ще трябва да дадеш новия на родителя.', 'Смени кода', true)) return;
      try { const r = await API.regenerateCode(c.id); toast('Нов код: ' + r.parentCode, 'ok'); reloadChild(); } catch (e) { err(e); }
    };
    $('#archChild').onclick = async () => {
      try { await API.updateChild(c.id, { isActive: !c.isActive }); toast(c.isActive ? 'Архивирано' : 'Активно', 'ok'); navigate('/app/children'); } catch (e) { err(e); }
    };
    $('#delChild').onclick = async () => {
      if (!await ask('Изтриване завинаги', `Ще изтрия <b>${esc(c.firstName)} ${esc(c.lastName)}</b> и ЦЯЛАТА история — тренировки, умения, награди, състезания. Ако детето просто е спряло, по-добре го архивирай.`, 'Изтрий завинаги', true)) return;
      try { await API.deleteChild(c.id); toast('Изтрито', 'ok'); navigate('/app/children'); } catch (e) { err(e); }
    };
  }

  /* ---------- Умения ---------- */
  async function skillsTab(child, host) {
    const list = await API.childSkills(child.id) || [];
    if (!list.length) { host.innerHTML = emptyState(I.ladder, 'Няма умения', 'Добави стълба от умения от „Клуб → Умения".'); return; }
    const stages = {};
    list.forEach(s => (stages[s.stage] ||= { name: s.stageName, items: [] }).items.push(s));
    const done = list.filter(s => s.done).length;
    host.innerHTML = `<div class="card card-pad rise">
      <div class="sk-head"><div><b>${done} от ${list.length}</b> умения</div><span class="lvl-bar lvl-bar-lg"><i style="width:${Math.round(done / list.length * 100)}%"></i></span></div>
      <p class="hint" style="margin-bottom:16px">Докосни умение, когато детето го постигне — точките и нивото се смятат сами, а родителят получава известие.</p>
      ${Object.keys(stages).sort().map(k => {
        const st = stages[k]; const d = st.items.filter(s => s.done).length;
        return `<div class="sk-stage"><div class="sk-stage-h"><span class="sk-no">${k}</span><b>${esc(st.name)}</b><small>${d}/${st.items.length}</small></div>
          <div class="sk-grid">${st.items.map(s => `<button class="sk ${s.done ? 'done' : ''}" data-sk="${s.id}" aria-pressed="${s.done}">
            <span class="sk-ico">${s.icon}</span><span class="sk-n">${esc(s.name)}</span>
            <span class="sk-sub">${s.done ? `${I.check} ${fmtShort(s.achievedDate)}` : `+${s.points} т.`}</span></button>`).join('')}</div></div>`;
      }).join('')}
    </div>`;
    $$('.sk', host).forEach(b => b.onclick = async () => {
      const s = list.find(x => x.id === b.dataset.sk);
      if (s.done && !await ask('Махане на умение', `Да махна ли „${esc(s.name)}" от постигнатите?`, 'Махни', true)) return;
      b.classList.toggle('done'); b.classList.add('pop');
      try {
        const r = await API.toggleSkill(child.id, s.id);
        toast(r.done ? `🎉 ${s.name} · +${s.points} т.` : 'Махнато', 'ok');
        skillsTab(child, host);
      } catch (e) { b.classList.toggle('done'); err(e); }
    });
  }

  /* ---------- Тренировки на детето ---------- */
  let _childSessions = [];
  async function sessionsTab(c) {
    const list = await API.childHistory(c.id) || [];
    _childSessions = list;
    if (!list.length) return emptyState(I.cal, 'Няма тренировки', 'Добави детето в група или към тренировка от „График".');
    const today = todayStr();
    const upcoming = list.filter(h => h.sessionDate > today).reverse();
    const past = list.filter(h => h.sessionDate <= today);
    const marked = past.filter(h => h.attended !== null);
    const present = marked.filter(h => h.attended).length;
    const row = h => `<button class="hrow ${h.status === 'cancelled' ? 'is-cancelled' : ''}" data-sid="${h.sessionId}">
      <span class="hrow-att ${h.attended === true ? 'y' : h.attended === false ? 'n' : ''}">${h.attended === true ? I.check : h.attended === false ? I.x : '·'}</span>
      <span class="hrow-main"><b>${esc(fmtShort(h.sessionDate))} · ${fmtTime(h.startTime)}</b>
        <small>${esc(h.groupName || '')}${h.groupName ? ' · ' : ''}${esc(h.coachName)}${h.mood ? ' · ' + (MOOD_EMOJI[h.mood] || '') : ''}</small>
        ${h.swamWhat ? `<span class="hrow-t"><b>Плува:</b> ${esc(h.swamWhat)}</span>` : ''}
        ${h.dailyProgress ? `<span class="hrow-t"><b>Постигна:</b> ${esc(h.dailyProgress)}</span>` : ''}
        ${h.parentNote ? `<span class="hrow-t hrow-p">✉️ ${esc(h.parentNote)}</span>` : ''}</span>
      ${I.chevR}</button>`;
    return `<div class="card card-pad rise">
      ${marked.length ? `<div class="att-strip" title="Последните ${Math.min(30, marked.length)} тренировки">${marked.slice(0, 30).reverse().map(h => `<i class="${h.attended ? 'y' : 'n'}" title="${fmtShort(h.sessionDate)}"></i>`).join('')}</div>
        <p class="subtle" style="margin:-4px 0 18px">${present} от ${marked.length} тренировки (${Math.round(present / marked.length * 100)}%)</p>` : ''}
      ${upcoming.length ? `<h3 class="h-sm">Предстоящи <span class="badge">${upcoming.length}</span></h3><div class="hlist">${upcoming.slice(0, 6).map(row).join('')}</div>` : ''}
      ${past.length ? `<h3 class="h-sm">Минали <span class="badge">${past.length}</span></h3><div class="hlist">${past.map(row).join('')}</div>` : ''}
    </div>`;
  }
  function bindSessionsTab(c) {
    $$('#tabView .hrow[data-sid]').forEach(el => el.onclick = () => S.sessionDetail(el.dataset.sid, () => renderTab('sessions', c)));
  }

  /* ---------- Напредък (карти) ---------- */
  async function progressTab(c) {
    const list = await API.childProgress(c.id) || [];
    const add = `<button class="btn btn-primary btn-sm" id="addProg" style="margin-bottom:16px">${I.plus} Нова карта за напредък</button>`;
    if (!list.length) return add + emptyState(I.chart, 'Няма карти за напредък', 'Попълвай карта веднъж на 2–3 месеца — родителят вижда растежа.');
    const cards = list.map((p, i) => {
      const prev = list[i + 1] || null;
      const arrow = (v, pv) => (v != null && pv != null && v > pv) ? `<span class="up-arrow" title="Подобрение">${I.up}</span>` : '';
      const bar = (lbl, v, pv) => v == null ? '' : `<div class="prog-row"><div class="prog-top"><span>${lbl} ${arrow(v, pv)}</span><span class="val">${v}%</span></div><div class="prog-track"><div class="prog-fill" data-w="${v}"></div></div></div>`;
      const dots = (lbl, v, pv) => v == null ? '' : `<div class="dots-row"><span>${lbl} ${arrow(v, pv)}</span>${ratingDots(v)}</div>`;
      return `<div class="card card-pad" style="margin-bottom:16px">
        <div class="pc-head"><strong>${esc(p.periodLabel || 'Оценка')}</strong>
          <div><span class="subtle">${fmtDate(p.assessmentDate)}</span><button class="x-btn" data-delprog="${p.id}" title="Изтрий" aria-label="Изтрий картата">${I.trash}</button></div></div>
        ${bar('Сила', p.physStrength, prev?.physStrength)}${bar('Гъвкавост', p.physFlexibility, prev?.physFlexibility)}${bar('Издръжливост', p.physEndurance, prev?.physEndurance)}${bar('Координация', p.physCoordination, prev?.physCoordination)}
        <div style="margin-top:10px">${dots('Скокове/атлетика', p.jumpsAthletics, prev?.jumpsAthletics)}${dots('Баланс', p.balanceCoordination, prev?.balanceCoordination)}${dots('Работа в екип', p.teamwork, prev?.teamwork)}${dots('Дисциплина', p.discipline, prev?.discipline)}${dots('Мотивация', p.motivation, prev?.motivation)}${dots('Концентрация', p.concentration, prev?.concentration)}</div>
        ${p.nextGoals ? `<hr class="divider"><div class="info-item"><div class="k">Цели за следващия период</div><div class="v">${esc(p.nextGoals)}</div></div>` : ''}
        ${p.coachNotes ? `<div class="info-item" style="margin-top:10px"><div class="k">Бележки (само за треньори)</div><div class="v">${esc(p.coachNotes)}</div></div>` : ''}
      </div>`;
    }).join('');
    return add + `<div class="stagger">${cards}</div>`;
  }
  const ratingDots = (v) => `<span class="rate">${[1,2,3,4,5].map(i => `<span class="d ${i <= v ? 'on-' + v : ''}"></span>`).join('')}</span>`;

  function ratePick(label, id, val) {
    return `<div class="field"><label>${label}</label><div class="ratepick" data-id="${id}" data-val="${val || 0}">
      ${[1,2,3,4,5].map(i => `<button type="button" class="rp d${i}" data-v="${i}">${i}</button>`).join('')}
      <button type="button" class="rp clr" data-v="0">—</button></div></div>`;
  }
  function rangePick(label, id, val) {
    return `<div class="field"><label for="${id}">${label} <span class="subtle" id="${id}_o">${val || 0}%</span></label>
      <input class="input" id="${id}" type="range" min="0" max="100" step="5" value="${val || 0}"></div>`;
  }
  const field = (label, id, val, type = 'text', ph = '', extra = '') =>
    `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="${type}" value="${esc(val || '')}" placeholder="${esc(ph)}" ${extra}></div>`;
  const area = (label, id, val, ph = '') => `<div class="field"><label for="${id}">${label}</label><textarea class="textarea" id="${id}" placeholder="${esc(ph)}">${esc(val || '')}</textarea></div>`;

  async function progressForm(c) {
    let last = null;
    try { const list = await API.childProgress(c.id); last = (list && list[0]) || null; } catch {}
    modal({ title: 'Нова карта за напредък', large: true, body: `
      ${last ? `<p class="note">Заредени са стойностите от последната карта (${esc(last.periodLabel || fmtDate(last.assessmentDate))}). Промени само каквото се е подобрило.</p>` : ''}
      <div class="grid-2">${field('Период', 'p_period', '', 'text', 'напр. Есен 2026')}${field('Дата', 'p_date', toDateInput(new Date()), 'date')}</div>
      <h4 class="form-h">Физическо развитие <span class="subtle">(0–100%)</span></h4>
      <div class="grid-2">${rangePick('Сила', 'p_ps', last?.physStrength)}${rangePick('Гъвкавост', 'p_pf', last?.physFlexibility)}${rangePick('Издръжливост', 'p_pe', last?.physEndurance)}${rangePick('Координация', 'p_pc', last?.physCoordination)}</div>
      <h4 class="form-h">Умения и поведение <span class="subtle">(1–5)</span></h4>
      <div class="grid-2">${ratePick('Скокове/атлетика', 'p_jump', last?.jumpsAthletics)}${ratePick('Баланс/координация', 'p_bal', last?.balanceCoordination)}${ratePick('Сила/издръжливост', 'p_se', last?.strengthEndurance)}${ratePick('Работа в екип', 'p_tw', last?.teamwork)}${ratePick('Дисциплина', 'p_di', last?.discipline)}${ratePick('Мотивация', 'p_mo', last?.motivation)}${ratePick('Концентрация', 'p_co', last?.concentration)}</div>
      ${area('Цели за следващия период (вижда ги родителят)', 'p_goals', last?.nextGoals)}${area('Бележки само за треньорите', 'p_notes', '')}`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="p_save">${I.check} Запази</button>` });
    $$('#modal-host input[type=range]').forEach(r => r.oninput = () => { $('#' + r.id + '_o').textContent = r.value + '%'; });
    $$('.ratepick').forEach(rp => {
      const paint = () => $$('.rp', rp).forEach(b => b.classList.toggle('sel', +b.dataset.v === +rp.dataset.val && +b.dataset.v > 0));
      $$('.rp', rp).forEach(b => b.onclick = () => { rp.dataset.val = b.dataset.v; paint(); });
      paint();
    });
    const rv = (id) => { const n = +document.querySelector(`.ratepick[data-id="${id}"]`).dataset.val; return n > 0 ? n : null; };
    const pv = (id) => { const n = +$('#' + id).value; return n > 0 ? n : null; };
    $('#p_save').onclick = async (ev) => {
      const dto = { childId: c.id, assessmentDate: $('#p_date').value, periodLabel: $('#p_period').value.trim() || null,
        jumpsAthletics: rv('p_jump'), balanceCoordination: rv('p_bal'), strengthEndurance: rv('p_se'),
        physStrength: pv('p_ps'), physFlexibility: pv('p_pf'), physEndurance: pv('p_pe'), physCoordination: pv('p_pc'),
        teamwork: rv('p_tw'), discipline: rv('p_di'), motivation: rv('p_mo'), concentration: rv('p_co'),
        nextGoals: $('#p_goals').value.trim() || null, coachNotes: $('#p_notes').value.trim() || null };
      busy(ev.currentTarget, true, 'Запис…');
      try { await API.createProgress(dto); toast('Запазено', 'ok'); closeModal(); renderTab('progress', c); } catch (e) { busy(ev.currentTarget, false); err(e); }
    };
  }

  /* ---------- Награди ---------- */
  async function achTab(c) {
    const list = await API.childAchievements(c.id) || [];
    const add = `<button class="btn btn-primary btn-sm" id="awardBtn" style="margin-bottom:16px">${I.trophy} Дай награда</button>`;
    if (!list.length) return add + emptyState(I.trophy, 'Още няма награди', 'Първата награда е най-запомняща се!');
    return add + `<div class="stagger" style="display:grid;gap:12px">${list.map(a => `
      <div class="ach">
        <div class="ach-ico">${a.icon || '🏅'}</div>
        <div class="ach-main"><div class="n">${esc(a.name)}</div>${a.reward ? `<div class="r">🎁 ${esc(a.reward)}</div>` : ''}${a.note ? `<div class="subtle small">„${esc(a.note)}"</div>` : ''}</div>
        <div style="text-align:right"><div class="ach-date">${fmtDate(a.awardedDate)}</div>
          <button class="x-btn" data-un="${a.id}" title="Махни" aria-label="Махни наградата">${I.trash}</button></div>
      </div>`).join('')}</div>`;
  }
  function bindAchTab(c) {
    const b = $('#awardBtn'); if (b) b.onclick = () => bulkAward([c.id], () => renderTab('ach', c));
    $$('[data-un]').forEach(x => x.onclick = async () => {
      if (!await ask('Махане', 'Да махна ли тази награда?', 'Махни', true)) return;
      try { await API.removeAward(x.dataset.un); toast('Махнато', 'ok'); renderTab('ach', c); } catch (e) { err(e); }
    });
  }

  // Награда за едно или няколко деца наведнъж
  async function bulkAward(preselect = [], after) {
    let boot;
    try { boot = await API.getBoot(); } catch (e) { return err(e); }
    const defs = boot.achievements || [];
    if (!defs.length) { toast('Първо създай награди в „Клуб → Награди"', 'err'); return navigate('/app/achievements'); }
    const kids = boot.children || [], groups = boot.groups || [];
    const sel = new Set(preselect);
    const single = preselect.length === 1;
    modal({ title: 'Дай награда', large: !single, body: `
      <div class="field"><label>Награда</label><div class="achpick" id="achPick">${defs.map((d, i) => `
        <button type="button" class="ap ${i === 0 ? 'on' : ''}" data-a="${d.id}"><span>${d.icon || '🏅'}</span><b>${esc(d.name)}</b>${d.reward ? `<small>🎁 ${esc(d.reward)}</small>` : ''}</button>`).join('')}</div></div>
      ${single ? '' : `<div class="field"><label>На кого <span class="subtle" id="selN"></span></label>
        ${groups.length ? `<div class="fchips" style="margin-bottom:10px">${groups.map(g => `<button type="button" class="fchip" data-gsel="${g.id}" style="--gc:${g.color}"><i></i>${esc(g.name)}</button>`).join('')}</div>` : ''}
        <div class="pick-list" id="kidPick">${kids.map(k => `<label class="pick"><input type="checkbox" value="${k.id}" ${sel.has(k.id) ? 'checked' : ''}><span>${esc(k.firstName)} ${esc(k.lastName)}</span></label>`).join('')}</div></div>`}
      <div class="grid-2">${field('Дата', 'a_date', toDateInput(new Date()), 'date')}${field('Бележка (по желание)', 'a_note', '', 'text', 'напр. Смело скочи от блока!')}</div>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-sun" id="a_save">${I.trophy} Дай</button>` });
    let ach = defs[0].id;
    $$('#achPick .ap').forEach(b => b.onclick = () => { ach = b.dataset.a; $$('#achPick .ap').forEach(x => x.classList.toggle('on', x === b)); });
    const count = () => { const n = $('#selN'); if (n) n.textContent = sel.size ? `· избрани ${sel.size}` : ''; };
    $$('#kidPick input').forEach(i => i.onchange = () => { i.checked ? sel.add(i.value) : sel.delete(i.value); count(); });
    $$('[data-gsel]').forEach(b => b.onclick = () => {
      kids.filter(k => k.groupId === b.dataset.gsel).forEach(k => sel.add(k.id));
      $$('#kidPick input').forEach(i => i.checked = sel.has(i.value)); count();
    });
    count();
    $('#a_save').onclick = async (ev) => {
      if (!sel.size) return toast('Избери поне едно дете', 'err');
      busy(ev.currentTarget, true, '…');
      try {
        const r = await API.award({ childIds: [...sel], achievementId: ach, awardedDate: $('#a_date').value, note: $('#a_note').value.trim() || null });
        toast(r.count > 1 ? `🎉 Наградени ${r.count} деца` : 'Награден! 🎉', 'ok'); closeModal(); if (after) after();
      } catch (e) { busy(ev.currentTarget, false); err(e); }
    };
  }

  /* ---------- Състезания ---------- */
  const DISCIPLINES = ['25 м свободен стил', '25 м гръб', '25 м бруст', '25 м бътерфлай', '50 м свободен стил', '50 м гръб', '50 м бруст', '50 м бътерфлай', '100 м свободен стил', '100 м съчетано', 'Щафета'];
  const medal = (p) => p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '';
  async function compTab(c) {
    const list = await API.childCompetitions(c.id) || [];
    const add = `<button class="btn btn-primary btn-sm" id="addComp" style="margin-bottom:16px">${I.plus} Ново състезание</button>`;
    if (!list.length) return add + emptyState(I.medal, 'Няма състезания', 'Запиши времето и мястото — личните рекорди се отбелязват сами.');
    return add + `<div class="stagger" style="display:grid;gap:12px">${list.map(k => `
      <div class="comp">
        <div class="comp-medal">${medal(k.place) || (k.place ? `<span>${k.place}</span>` : '🏁')}</div>
        <div class="comp-main">
          <b>${esc(k.eventName)}</b>
          <small>${fmtDate(k.eventDate)}${k.location ? ' · ' + esc(k.location) : ''}</small>
          ${k.discipline ? `<div class="comp-res">${esc(k.discipline)}${k.timeText ? ` · <b>${esc(k.timeText)}</b>` : ''}${k.place ? ` · ${k.place} място` : ''}${k.isPB ? ' <span class="tag tag-pb">Личен рекорд</span>' : ''}</div>` : ''}
          ${k.results ? `<div class="subtle small">${esc(k.results)}</div>` : ''}
        </div>
        <div class="comp-act"><button class="x-btn" data-editc="${k.id}" aria-label="Редакция">${I.edit}</button><button class="x-btn" data-delc="${k.id}" aria-label="Изтрий">${I.trash}</button></div>
      </div>`).join('')}</div>`;
  }
  function bindCompTab(c) {
    const b = $('#addComp'); if (b) b.onclick = () => compForm(c);
    $$('[data-editc]').forEach(x => x.onclick = async () => { const list = await API.childCompetitions(c.id); compForm(c, list.find(k => k.id === x.dataset.editc)); });
    $$('[data-delc]').forEach(x => x.onclick = async () => {
      if (!await ask('Изтриване', 'Да изтрия ли този резултат?', 'Изтрий', true)) return;
      try { await API.deleteCompetition(x.dataset.delc); toast('Изтрито', 'ok'); renderTab('comp', c); } catch (e) { err(e); }
    });
  }
  function compForm(c, k) {
    let lastEvent = {};
    try { lastEvent = JSON.parse(localStorage.getItem('sws.lastEvent') || '{}'); } catch {}
    const ev = k || { eventName: lastEvent.name || '', eventDate: lastEvent.date || toDateInput(new Date()), location: lastEvent.location || '' };
    modal({ title: k ? 'Редакция на резултат' : 'Резултат от състезание', body: `
      ${field('Състезание', 'k_name', ev.eventName, 'text', 'напр. Купа „Стара Загора"')}
      <div class="grid-2">${field('Дата', 'k_date', toDateInput(ev.eventDate), 'date')}${field('Град / басейн', 'k_loc', ev.location, 'text', 'напр. Стара Загора')}</div>
      <div class="field"><label for="k_disc">Дисциплина</label><input class="input" id="k_disc" list="discList" value="${esc(k?.discipline || '')}" placeholder="напр. 25 м свободен стил">
        <datalist id="discList">${DISCIPLINES.map(d => `<option value="${d}">`).join('')}</datalist></div>
      <div class="grid-2">${field('Време', 'k_time', k?.timeText, 'text', 'напр. 32.45 или 1:05.20', 'inputmode="decimal"')}
        <div class="field"><label>Място</label><div class="placepick" id="k_place">${[1,2,3,4,5,6,7,8].map(n => `<button type="button" data-p="${n}" class="${k?.place === n ? 'on' : ''}">${medal(n) || n}</button>`).join('')}</div></div></div>
      ${area('Бележки', 'k_notes', k?.results || k?.notes, 'по желание')}`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="k_save">${I.check} Запази</button>` });
    let place = k?.place || null;
    $$('#k_place button').forEach(b => b.onclick = () => { place = place === +b.dataset.p ? null : +b.dataset.p; $$('#k_place button').forEach(x => x.classList.toggle('on', +x.dataset.p === place)); });
    $('#k_save').onclick = async (e) => {
      const dto = { childId: c.id, eventName: $('#k_name').value.trim(), eventDate: $('#k_date').value, location: $('#k_loc').value.trim() || null,
        discipline: $('#k_disc').value.trim() || null, timeText: $('#k_time').value.trim() || null, place, results: $('#k_notes').value.trim() || null };
      if (!dto.eventName) return toast('Въведи име на състезанието', 'err');
      if (dto.timeText && !/^(\d+:)?\d+([.,]\d+)?$/.test(dto.timeText)) return toast('Времето: напр. 32.45 или 1:05.20', 'err');
      try { localStorage.setItem('sws.lastEvent', JSON.stringify({ name: dto.eventName, date: dto.eventDate, location: dto.location })); } catch {}
      busy(e.currentTarget, true, 'Запис…');
      try {
        if (k) await API.updateCompetition(k.id, dto); else await API.createCompetition(dto);
        toast('Запазено', 'ok'); closeModal(); renderTab('comp', c);
      } catch (ex) { busy(e.currentTarget, false); err(ex); }
    };
  }

  /* ---------- Форма за дете ---------- */
  async function childForm(c, preset = {}, onCreated) {
    let boot = null;
    try { boot = await API.getBoot(); } catch {}
    const groups = boot?.groups || [];
    const genderOpts = ['<option value="">—</option>', ...GENDERS.map(g => `<option ${c?.gender === g ? 'selected' : ''}>${g}</option>`)].join('');
    modal({ title: c ? 'Редакция на картон' : 'Ново дете', large: true, body: `
      <div class="form-section">
        <div class="form-section-title">${I.kids} Детето</div>
        <div class="grid-2">${field('Име *', 'c_fn', c?.firstName ?? preset.firstName, 'text', '', 'autocomplete="off"')}${field('Фамилия', 'c_ln', c?.lastName, 'text', '', 'autocomplete="off"')}</div>
        <div class="grid-2">${field('Дата на раждане *', 'c_bd', toDateInput(c?.birthDate), 'date')}
          <div class="field"><label for="c_g">Пол</label><select class="select" id="c_g">${genderOpts}</select></div></div>
        <div class="grid-2">
          <div class="field"><label for="c_grp">Група</label><select class="select" id="c_grp"><option value="">— без група —</option>${groups.map(g => `<option value="${g.id}" ${c?.groupId === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
          ${field('Тренира от', 'c_start', toDateInput(c?.trainingStartDate || (c ? '' : new Date())), 'date')}</div>
        ${field('Как пише в Google Calendar', 'c_cal', c?.calendarName ?? preset.calendarName, 'text', 'напр. Йоан, Йоан П. — за да се разпознава')}
      </div>
      <div class="form-section">
        <div class="form-section-title">${I.phone} Родител и спешна връзка</div>
        <div class="grid-2">${field('Име на родителя', 'c_pn', c?.parentName, 'text', 'напр. Мария Петрова')}${field('Телефон на родителя', 'c_pp', c?.parentPhone, 'tel', '08XX XXX XXX', 'inputmode="tel"')}</div>
        ${field('Имейл на родителя', 'c_pe', c?.parentEmail, 'email', 'за известия и достъп', 'inputmode="email"')}
        <div class="grid-2">${field('Спешен контакт (друг човек)', 'c_en', c?.emergencyName, 'text', 'напр. баба Иванка')}${field('Спешен телефон', 'c_ep', c?.emergencyPhone, 'tel', '', 'inputmode="tel"')}</div>
        <label class="switch"><input type="checkbox" id="c_notify" ${c?.notifyParent === false ? '' : 'checked'}><span></span>Имейл до родителя при награда, ново умение и седмично обобщение</label>
      </div>
      <div class="form-section">
        <div class="form-section-title">${I.heart} Здраве</div>
        ${field('⚠ Важно предупреждение (вижда се навсякъде)', 'c_alert', c?.medicalAlert, 'text', 'напр. Епилепсия — винаги с треньор във водата')}
        <div class="grid-2">${field('Диагноза', 'c_diag', c?.diagnosis)}${field('Специални потребности (СОП)', 'c_sop', c?.specialNeeds, 'text', 'напр. аутизъм, ДЦП… или празно')}</div>
        <div class="grid-2">${field('Алергии / лекарства', 'c_alg', c?.allergiesMedical)}${field('Медицинско валидно до', 'c_med', toDateInput(c?.medicalUntil), 'date')}</div>
        ${area('Обективно състояние', 'c_obj', c?.objectiveCondition)}
      </div>
      <div class="form-section">
        <div class="form-section-title">${I.trophy} Цели и бележки</div>
        ${area('Цели', 'c_goals', c?.goals, 'напр. да плува 25 м без помощ до лятото')}
        ${area('Бележки за треньорите', 'c_notes', c?.notes)}
      </div>
      <label class="switch"><input type="checkbox" id="c_consent" ${c?.consentDate ? 'checked' : ''}><span></span>Родителят е дал съгласие данните (вкл. здравните) да се пазят тук${c?.consentDate ? ` · ${fmtDate(c.consentDate)}` : ''}</label>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="c_save">${I.check} Запази</button>` });
    if (!c) setTimeout(() => $('#c_fn')?.focus(), 250);

    $('#c_save').onclick = async (ev) => {
      const v = (id) => $('#' + id).value.trim() || null;
      const dto = { firstName: v('c_fn'), lastName: v('c_ln') || '', birthDate: $('#c_bd').value, gender: v('c_g'), groupId: v('c_grp'),
        trainingStartDate: $('#c_start').value || null, parentName: v('c_pn'), parentPhone: v('c_pp'), parentEmail: v('c_pe'),
        emergencyName: v('c_en'), emergencyPhone: v('c_ep'), notifyParent: $('#c_notify').checked,
        medicalAlert: v('c_alert'), diagnosis: v('c_diag'), specialNeeds: v('c_sop'), allergiesMedical: v('c_alg'),
        medicalUntil: $('#c_med').value || null, objectiveCondition: v('c_obj'), goals: v('c_goals'), notes: v('c_notes'), calendarName: v('c_cal') };
      const consent = $('#c_consent').checked;
      dto.consentDate = consent ? (c?.consentDate || todayStr()) : null;
      if (!dto.firstName || !dto.birthDate) return toast('Име и дата на раждане са задължителни', 'err');
      if (dto.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.parentEmail)) return toast('Провери имейла на родителя', 'err');
      const btn = $('#c_save');
      if (!dto.parentPhone && !dto.emergencyPhone && !btn.dataset.ok) {
        btn.dataset.ok = '1'; btn.innerHTML = `${I.check} Запази без телефон`;
        $('#c_pp').focus();
        return toast('Няма телефон за спешна връзка — добави или натисни пак „Запази"', 'err');
      }
      busy(btn, true, 'Запис…');
      try {
        if (c) { await API.updateChild(c.id, dto); toast('Обновено', 'ok'); closeModal(); S.render(); }
        else {
          const nc = await API.createChild(dto); toast('Добавено! Код за родителя: ' + (nc.parentCode || ''), 'ok'); closeModal();
          if (onCreated) { await API.refreshBoot().catch(() => {}); onCreated(nc); } else navigate('/app/child/' + nc.id);
        }
      } catch (e) { busy(btn, false); err(e); }
    };
  }

  /* ===================== КЛУБ (хъб) ===================== */
  route(/^\/app\/club$/, async () => {
    if (!guard()) return;
    const u = API.getUser() || {};
    const tiles = [
      ['/app/groups', I.layers, 'Групи', 'Деца по групи, дни и час. Тренировка за цялата група с един клик.'],
      ['/app/attendance', I.chart, 'Посещаемост', 'Месечна таблица — кой идва редовно и кой изпуска.'],
      ['/app/skills', I.ladder, 'Умения и нива', 'Стълбата от умения, точки и нива за децата.'],
      ['/app/achievements', I.trophy, 'Награди', 'Медали, тениски, грамоти — ти ги измисляш.'],
      ['#gcal', I.cal, 'Google Calendar', 'Тренировките автоматично в календара ти.'],
      ['/app/team', I.team, 'Отбор и покани', 'Треньори, покана с линк и план.'],
    ];
    shell('club', `
      <div class="page-head"><div><div class="page-eyebrow">${esc(u.teamName || '')}</div><h1 class="pagettl">Клуб</h1></div></div>
      <div class="club-grid stagger">${tiles.map(([to, ico, t, d]) => `
        <a class="club-tile" href="${to.startsWith('#') ? '#/app/club' : '#' + to}" ${to === '#gcal' ? 'data-gcal' : ''}>
          <span class="club-ico">${ico}</span><b>${t}</b><small>${d}</small><span class="club-go">${I.arrowR}</span></a>`).join('')}</div>
      <section class="card card-pad rise" id="notifyCard" style="margin-top:20px"></section>`);
    $('[data-gcal]').onclick = (e) => { e.preventDefault(); S.calendarSync(); };
    try {
      const b = await API.getBoot();
      const n = b.notify || {};
      $('#notifyCard').innerHTML = `<div class="card-section-title"><span class="ico">${I.bell}</span>Известия по имейл</div>
        ${n.enabled ? `<p>✅ Включени · изпращат се от <b>${esc(n.sender)}</b>. Родителите получават имейл при награда, ново умение, състезание и седмично обобщение в неделя. Треньорите — сутрешни сигнали за отсъствия, медицински и рождени дни.</p>`
          : `<p>Изключени. За да ги включиш: в Google таблицата меню <b>SwimWithSmile → 3) Известия по имейл (Brevo)</b> и постави ключ от безплатен акаунт в <b>brevo.com</b> (300 имейла на ден).</p>`}`;
    } catch {}
  });

  /* ===================== ГРУПИ ===================== */
  route(/^\/app\/groups$/, async () => {
    if (!guard()) return;
    shell('club', `
      <a href="#/app/club" class="btn btn-ghost btn-sm back">${I.chevL} Клуб</a>
      <div class="page-head"><div><h1 class="pagettl">Групи</h1><p class="subtle">Напр. „Делфини" пн и ср в 17:00</p></div>
        <button class="btn btn-primary" id="newGroup">${I.plus}<span>Нова група</span></button></div>
      <div id="groupList">${loading(3)}</div>`);
    $('#newGroup').onclick = () => groupForm();
    await drawGroups();
  });
  async function drawGroups() {
    let boot; try { boot = await API.refreshBoot(); } catch (e) { return err(e); }
    const host = $('#groupList'); if (!host) return;
    const groups = boot.groups || [];
    if (!groups.length) { host.innerHTML = emptyState(I.layers, 'Още няма групи', 'Групата пази децата, дните и часа — после правиш тренировка за всички с един клик.'); return; }
    host.innerHTML = `<div class="grp-grid stagger">${groups.map(g => {
      const kids = (boot.children || []).filter(k => k.groupId === g.id);
      return `<button class="grp" data-g="${g.id}" style="--gc:${g.color}">
        <span class="grp-bar"></span>
        <b>${esc(g.name)}</b>
        <small>${g.days.length ? g.days.map(d => DOW[d - 1]).join(', ') : 'без фиксирани дни'}${g.time ? ' · ' + esc(g.time) : ''}${g.location ? ' · ' + esc(g.location) : ''}</small>
        <span class="grp-kids">${kids.slice(0, 6).map(k => avatar(k.firstName, k.lastName, 'av-sm')).join('')}${kids.length > 6 ? `<em>+${kids.length - 6}</em>` : ''}${!kids.length ? '<em>няма деца</em>' : ''}</span>
      </button>`;
    }).join('')}</div>`;
    $$('.grp', host).forEach(b => b.onclick = () => groupForm(groups.find(g => g.id === b.dataset.g)));
  }
  async function groupForm(g) {
    let boot; try { boot = await API.getBoot(); } catch (e) { return err(e); }
    const kids = boot.children || [];
    const days = new Set(g?.days || []);
    let color = g?.color || GROUP_COLORS[(boot.groups || []).length % GROUP_COLORS.length];
    const members = new Set(kids.filter(k => g && k.groupId === g.id).map(k => k.id));
    modal({ title: g ? 'Група' : 'Нова група', large: true, body: `
      ${field('Име', 'g_name', g?.name, 'text', 'напр. Делфини, Начинаещи, СОП група')}
      <div class="field"><label>Цвят</label><div class="colpick" id="g_col">${GROUP_COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-label="Цвят ${c}"></button>`).join('')}</div></div>
      <div class="field"><label>Дни</label><div class="daypick" id="g_days">${DOW.map((x, i) => `<button type="button" data-d="${i + 1}">${x}</button>`).join('')}</div></div>
      <div class="grid-2">${field('Час', 'g_time', g?.time, 'time')}
        <div class="field"><label for="g_dur">Продължителност</label><select class="select" id="g_dur">${[30, 45, 60, 75, 90].map(m => `<option value="${m}" ${(g?.durationMin || 45) === m ? 'selected' : ''}>${m} мин</option>`).join('')}</select></div></div>
      ${field('Място', 'g_loc', g?.location, 'text', 'напр. Басейн „Възраждане"')}
      <div class="field"><label>Деца в групата <span class="subtle" id="g_n"></span></label>
        <div class="pick-list" id="g_kids">${kids.map(k => `<label class="pick"><input type="checkbox" value="${k.id}" ${members.has(k.id) ? 'checked' : ''}><span>${esc(k.firstName)} ${esc(k.lastName)}${k.groupId && (!g || k.groupId !== g.id) ? ` <small class="subtle">(${esc((boot.groups.find(x => x.id === k.groupId) || {}).name || '')})</small>` : ''}</span></label>`).join('') || '<p class="subtle">Първо добави деца.</p>'}</div></div>`,
      footer: `${g ? `<button class="btn btn-danger" id="g_del">${I.trash}</button>` : ''}<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="g_save">${I.check} Запази</button>` });
    const paintC = () => $$('#g_col button').forEach(b => b.classList.toggle('on', b.dataset.c === color));
    $$('#g_col button').forEach(b => b.onclick = () => { color = b.dataset.c; paintC(); }); paintC();
    const paintD = () => $$('#g_days button').forEach(b => b.classList.toggle('on', days.has(+b.dataset.d)));
    $$('#g_days button').forEach(b => b.onclick = () => { const v = +b.dataset.d; days.has(v) ? days.delete(v) : days.add(v); paintD(); }); paintD();
    const cnt = () => $('#g_n').textContent = members.size ? `· ${members.size}` : '';
    $$('#g_kids input').forEach(i => i.onchange = () => { i.checked ? members.add(i.value) : members.delete(i.value); cnt(); }); cnt();
    $('#g_save').onclick = async (e) => {
      const dto = { name: $('#g_name').value.trim(), color, days: [...days].sort(), time: $('#g_time').value || null,
        durationMin: +$('#g_dur').value, location: $('#g_loc').value.trim() || null, childIds: [...members] };
      if (!dto.name) return toast('Въведи име', 'err');
      busy(e.currentTarget, true, 'Запис…');
      try { if (g) await API.updateGroup(g.id, dto); else await API.createGroup(dto); toast('Запазено', 'ok'); closeModal(); drawGroups(); }
      catch (ex) { busy(e.currentTarget, false); err(ex); }
    };
    const del = $('#g_del');
    if (del) del.onclick = async () => {
      if (!await ask('Изтриване на група', 'Децата остават, само излизат от групата. Минали тренировки не се пипат.', 'Изтрий', true)) return;
      try { await API.deleteGroup(g.id); toast('Изтрита', 'ok'); drawGroups(); } catch (e) { err(e); }
    };
  }

  /* ===================== ПОСЕЩАЕМОСТ ===================== */
  const attState = { y: new Date().getFullYear(), m: new Date().getMonth(), group: '' };
  route(/^\/app\/attendance$/, async () => {
    if (!guard()) return;
    shell('club', `
      <a href="#/app/club" class="btn btn-ghost btn-sm back">${I.chevL} Клуб</a>
      <div class="page-head"><div><h1 class="pagettl">Посещаемост</h1><p class="subtle">Кой идва редовно — особено важно за децата със СОП</p></div></div>
      <div class="card card-pad rise">
        <div class="cal-head">
          <button class="btn-icon btn-ghost" id="aPrev" aria-label="Предишен месец">${I.chevL}</button>
          <div class="cal-title" id="aTitle"></div>
          <button class="btn-icon btn-ghost" id="aNext" aria-label="Следващ месец">${I.chevR}</button>
          <select class="select select-sm" id="aGroup" style="margin-left:auto;max-width:200px"><option value="">Всички групи</option></select>
        </div>
        <div id="aBody">${loading(4, 40)}</div>
      </div>`);
    try { const b = await API.getBoot(); $('#aGroup').innerHTML += (b.groups || []).map(g => `<option value="${g.id}" ${attState.group === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join(''); } catch {}
    $('#aPrev').onclick = () => { attState.m--; if (attState.m < 0) { attState.m = 11; attState.y--; } drawAtt(); };
    $('#aNext').onclick = () => { attState.m++; if (attState.m > 11) { attState.m = 0; attState.y++; } drawAtt(); };
    $('#aGroup').onchange = (e) => { attState.group = e.target.value; drawAtt(); };
    drawAtt();
  });
  let attTok = 0;
  async function drawAtt() {
    const tok = ++attTok;
    $('#aTitle').textContent = `${MONTHS[attState.m]} ${attState.y}`;
    $('#aBody').innerHTML = loading(4, 40);
    let r; try { r = await API.attendanceReport(attState.y, attState.m + 1, attState.group); } catch (e) { return err(e); }
    if (tok !== attTok || !$('#aBody')) return;
    if (!r.sessions.length) { $('#aBody').innerHTML = emptyState(I.chart, 'Няма тренировки този месец', ''); return; }
    const today = todayStr();
    const tot = r.rows.reduce((a, x) => ({ m: a.m + x.marked, p: a.p + x.present }), { m: 0, p: 0 });
    $('#aBody').innerHTML = `
      <div class="att-kpis">
        <div><b>${r.sessions.length}</b><small>тренировки</small></div>
        <div><b>${tot.m ? Math.round(tot.p / tot.m * 100) + '%' : '—'}</b><small>средна посещаемост</small></div>
        <div><b>${r.rows.filter(x => x.pct != null && x.pct < 60).length}</b><small>под 60%</small></div>
      </div>
      <div class="att-wrap"><table class="att-tbl">
        <thead><tr><th class="sticky">Дете</th>${r.sessions.map(s => `<th title="${esc(s.groupName || '')} ${fmtTime(s.startTime)}"><span>${parseD(s.sessionDate).getDate()}</span><small>${DOW[(parseD(s.sessionDate).getDay() + 6) % 7]}</small></th>`).join('')}<th>%</th></tr></thead>
        <tbody>${r.rows.map(x => `<tr>
          <th class="sticky"><a href="#/app/child/${x.childId}">${esc(x.name)}</a>${x.specialNeeds ? ' <span class="tag tag-sop">СОП</span>' : ''}</th>
          ${r.sessions.map(s => { const v = x.cells[s.id]; return `<td class="${v === true ? 'y' : v === false ? 'n' : v === null ? 'u' : ''}">${v === true ? '✓' : v === false ? '✗' : v === null ? (s.sessionDate <= today ? '?' : '·') : ''}</td>`; }).join('')}
          <td class="pct-cell"><span class="pct ${pctClass(x.pct)}">${x.pct == null ? '—' : x.pct + '%'}</span></td></tr>`).join('')}</tbody>
      </table></div>
      <p class="hint" style="margin-top:12px">✓ дошъл · ✗ отсъствал · ? неотбелязано · празно = не е в тази тренировка</p>`;
  }

  /* ===================== УМЕНИЯ (стълба) ===================== */
  route(/^\/app\/skills$/, async () => {
    if (!guard()) return;
    shell('club', `
      <a href="#/app/club" class="btn btn-ghost btn-sm back">${I.chevL} Клуб</a>
      <div class="page-head"><div><h1 class="pagettl">Умения и нива</h1><p class="subtle">Стълбата, по която се изкачва всяко дете</p></div>
        <button class="btn btn-primary" id="newSkill">${I.plus}<span>Ново умение</span></button></div>
      <div id="skillList">${loading(3)}</div>`);
    $('#newSkill').onclick = () => skillForm();
    await drawSkills();
  });
  async function drawSkills() {
    let list, boot;
    try { [list, boot] = await Promise.all([API.skills(), API.getBoot()]); } catch (e) { return err(e); }
    const host = $('#skillList'); if (!host) return;
    const stages = boot.stages || {};
    const P = boot.points || {};
    host.innerHTML = `
      <div class="card card-pad rise" style="margin-bottom:18px">
        <div class="card-section-title"><span class="ico">${I.star}</span>Как се трупат точки</div>
        <div class="pts-grid">
          <div><b>+${P.attended || 10}</b><small>за всяко идване</small></div>
          <div><b>+30–60</b><small>за ново умение</small></div>
          <div><b>+${P.award || 25}</b><small>за награда</small></div>
          <div><b>+${P.competition || 20}</b><small>за състезание (+бонус за медал)</small></div>
        </div>
        <div class="lvl-ladder">${(boot.levels || []).map(l => `<span><i>${l.icon}</i>${esc(l.name)}<small>${l.min}</small></span>`).join('')}</div>
      </div>
      ${[1, 2, 3, 4].map(st => {
        const items = list.filter(s => s.stage === st);
        return `<section class="card card-pad rise" style="margin-bottom:14px"><div class="sk-stage-h"><span class="sk-no">${st}</span><b>${esc(stages[st] || '')}</b><small>${items.length}</small></div>
          <div class="sk-admin">${items.map(s => `<button class="ska ${s.isActive ? '' : 'off'}" data-id="${s.id}"><span>${s.icon}</span><b>${esc(s.name)}</b><small>+${s.points}</small></button>`).join('') || '<p class="subtle">Няма умения на този етап.</p>'}</div></section>`;
      }).join('')}`;
    $$('.ska', host).forEach(b => b.onclick = () => skillForm(list.find(s => s.id === b.dataset.id)));
  }
  function skillForm(s) {
    const icons = ['⭐','🌟','🫧','😊','🛁','🏄','🦵','🎉','🐟','🌊','🔄','💦','🏊','🐬','💨','🚀','🔥','🦈','🐸','💪','🎯','🧘'];
    let icon = s?.icon || '⭐';
    modal({ title: s ? 'Умение' : 'Ново умение', body: `
      ${field('Име', 'sk_name', s?.name, 'text', 'напр. Плува без коланче')}
      <div class="field"><label>Икона</label><div class="iconpick" id="skIco">${icons.map(ic => `<button type="button" class="ic ${icon === ic ? 'sel' : ''}" data-ic="${ic}">${ic}</button>`).join('')}</div></div>
      <div class="grid-2">
        <div class="field"><label for="sk_stage">Етап</label><select class="select" id="sk_stage">${[1,2,3,4].map(n => `<option value="${n}" ${(s?.stage || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        ${field('Точки', 'sk_pts', s?.points || 30, 'number', '', 'min="0" max="500"')}</div>
      ${s ? `<label class="switch"><input type="checkbox" id="sk_on" ${s.isActive ? 'checked' : ''}><span></span>Активно</label>` : ''}`,
      footer: `${s ? `<button class="btn btn-danger" id="sk_del">${I.trash}</button>` : ''}<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="sk_save">${I.check} Запази</button>` });
    $$('#skIco .ic').forEach(b => b.onclick = () => { icon = b.dataset.ic; $$('#skIco .ic').forEach(x => x.classList.toggle('sel', x === b)); });
    $('#sk_save').onclick = async () => {
      const dto = { name: $('#sk_name').value.trim(), icon, stage: +$('#sk_stage').value, points: +$('#sk_pts').value || 0 };
      if (s) dto.isActive = $('#sk_on').checked;
      if (!dto.name) return toast('Въведи име', 'err');
      try { if (s) await API.updateSkill(s.id, dto); else await API.createSkill(dto); toast('Запазено', 'ok'); closeModal(); drawSkills(); } catch (e) { err(e); }
    };
    const d = $('#sk_del');
    if (d) d.onclick = async () => {
      if (!await ask('Изтриване', 'Умението ще изчезне и от картоните на децата (и точките за него).', 'Изтрий', true)) return;
      try { await API.deleteSkill(s.id); toast('Изтрито', 'ok'); drawSkills(); } catch (e) { err(e); }
    };
  }

  /* ===================== НАГРАДИ (дефиниции) ===================== */
  route(/^\/app\/achievements$/, async () => {
    if (!guard()) return;
    shell('club', `
      <a href="#/app/club" class="btn btn-ghost btn-sm back">${I.chevL} Клуб</a>
      <div class="page-head"><div><h1 class="pagettl">Награди</h1><p class="subtle">Ти измисляш наградите — децата ги колекционират</p></div>
        <div class="quick"><button class="btn btn-sun" id="giveAch">${I.trophy}<span>Дай награда</span></button><button class="btn btn-primary" id="newAch">${I.plus}<span>Нова</span></button></div></div>
      <div id="achList">${loading()}</div>`);
    $('#newAch').onclick = () => achDefForm();
    $('#giveAch').onclick = () => bulkAward([], loadAchDefs);
    await loadAchDefs();
  });
  async function loadAchDefs() {
    try {
      const list = await API.achievements(true) || [];
      const host = $('#achList'); if (!host) return;
      if (!list.length) { host.innerHTML = emptyState(I.trophy, 'Още няма награди', 'Създай тениска, медал, шапка…'); return; }
      host.innerHTML = `<div class="ach-grid stagger">${list.map(a => `
        <div class="card card-pad ach-def ${a.isActive ? '' : 'off'}">
          <div class="ach-ico big">${a.icon || '🏅'}</div>
          <div class="kid-name">${esc(a.name)}</div>
          ${a.category ? `<span class="badge">${esc(a.category)}</span>` : ''}
          ${a.reward ? `<div class="reward-tag">🎁 ${esc(a.reward)}</div>` : ''}
          <small class="subtle">раздадена ${a.awardedCount || 0} пъти</small>
          <div class="ach-def-act"><button class="btn btn-ghost btn-sm" data-edit="${a.id}" aria-label="Редакция">${I.edit}</button><button class="btn btn-ghost btn-sm" data-del="${a.id}" aria-label="Изтрий" style="color:var(--red)">${I.trash}</button></div>
        </div>`).join('')}</div>`;
      $$('[data-edit]').forEach(b => b.onclick = () => achDefForm(list.find(x => x.id === b.dataset.edit)));
      $$('[data-del]').forEach(b => b.onclick = async () => {
        if (!await ask('Изтриване', 'Наградата ще изчезне и от всички деца, които са я получили.', 'Изтрий', true)) return;
        try { await API.deleteAchievement(b.dataset.del); toast('Изтрито', 'ok'); loadAchDefs(); } catch (e) { err(e); }
      });
    } catch (e) { err(e); }
  }
  function achDefForm(a) {
    const icons = ['🏅','🥇','🏆','⭐','🎖️','👕','🧢','🥽','🌊','🐬','🚀','💪','🔥','❤️','📅','🎂','🦈','🐢'];
    modal({ title: a ? 'Редакция' : 'Нова награда', body: `
      <div class="field"><label>Икона</label><div class="iconpick" id="iconPick">${icons.map(ic => `<button type="button" class="ic ${a?.icon === ic ? 'sel' : ''}" data-ic="${ic}">${ic}</button>`).join('')}</div></div>
      ${field('Име', 'ad_name', a?.name, 'text', 'напр. Първи 25 метра')}
      <div class="grid-2">${field('Категория', 'ad_cat', a?.category, 'text', 'напр. Техника')}${field('Какво получава', 'ad_reward', a?.reward, 'text', 'тениска, медал, грамота…')}</div>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="ad_save">${I.check} Запази</button>` });
    let icon = a?.icon || '🏅';
    $$('#iconPick .ic').forEach(b => b.onclick = () => { icon = b.dataset.ic; $$('#iconPick .ic').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
    $('#ad_save').onclick = async () => {
      const dto = { name: $('#ad_name').value.trim(), icon, category: $('#ad_cat').value.trim() || null, reward: $('#ad_reward').value.trim() || null };
      if (!dto.name) return toast('Въведи име', 'err');
      try {
        if (a) { dto.isActive = a.isActive ?? true; await API.updateAchievement(a.id, dto); } else { await API.createAchievement(dto); }
        toast('Запазено', 'ok'); closeModal(); loadAchDefs();
      } catch (e) { err(e); }
    };
  }

  Object.assign(S, { childForm, bulkAward });
})();
