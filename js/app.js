/* ============================================================
   SwimWithSmile — Приложение (SPA)
   Vanilla JS · hash router · без build стъпка
   app.js    — ядро, „Днес", график и тренировки
   coach.js  — плувци, картон, умения, групи, посещаемост, „Клуб"
   parent.js — родителски изглед
   landing.js— начална страница, вход, регистрация, „Отбор"
   ============================================================ */
(() => {
  const app = document.getElementById('app');

  /* ---------- Икони (SVG) ---------- */
  const svg = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    wave: svg('<path d="M2 6c1.5 0 2 1.5 3.5 1.5S7.5 6 9 6s2 1.5 3.5 1.5S14.5 6 16 6s2 1.5 3.5 1.5S21 6 22 6"/><path d="M2 12c1.5 0 2 1.5 3.5 1.5S7.5 12 9 12s2 1.5 3.5 1.5S14.5 12 16 12s2 1.5 3.5 1.5S21 12 22 12"/><path d="M2 18c1.5 0 2 1.5 3.5 1.5S7.5 18 9 18s2 1.5 3.5 1.5S14.5 18 16 18s2 1.5 3.5 1.5S21 18 22 18"/>'),
    cal: svg('<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
    kids: svg('<circle cx="9" cy="7" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M16 3.1a4 4 0 0 1 0 7.8M22 21c0-3-1.8-5.6-4.5-6.6"/>'),
    trophy: svg('<path d="M6 4h12v4a6 6 0 0 1-12 0V4z"/><path d="M6 6H3v1a3 3 0 0 0 3 3M18 6h3v1a3 3 0 0 1-3 3M9 20h6M10 16h4l.5 4h-5z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
    chevL: svg('<path d="M15 18l-6-6 6-6"/>', 2.4),
    chevR: svg('<path d="M9 18l6-6-6-6"/>', 2.4),
    chevD: svg('<path d="M6 9l6 6 6-6"/>', 2.4),
    edit: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    check: svg('<path d="M20 6L9 17l-5-5"/>', 2.6),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    pin: svg('<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    up: svg('<path d="M12 19V6M6 12l6-6 6 6"/>', 3),
    down: svg('<path d="M12 5v13M6 12l6 6 6-6"/>', 3),
    team: svg('<circle cx="8" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M14 14.6c.8-.4 1.6-.6 2.5-.6 2.8 0 5 2.4 5 5.4"/>'),
    arrowR: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.2),
    copy: svg('<rect x="9" y="9" width="12" height="12" rx="3"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
    share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
    refresh: svg('<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>'),
    lock: svg('<rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
    eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>',
    menu: svg('<path d="M4 7h16M4 12h16M4 17h10"/>', 2.2),
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    alert: svg('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', 2.4),
    layers: svg('<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    bell: svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
    chart: svg('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
    ladder: svg('<path d="M7 2v20M17 2v20M7 6h10M7 11h10M7 16h10"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    ban: svg('<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>'),
    medal: svg('<circle cx="12" cy="15" r="6"/><path d="M8.5 2h7L13 9.3M8.5 2 11 9.3"/><path d="M12 12.5v5"/>'),
  };

  /* ---------- Помощници ---------- */
  const MONTHS = ['януари','февруари','март','април','май','юни','юли','август','септември','октомври','ноември','декември'];
  const DOW = ['пн','вт','ср','чт','пт','сб','нд'];
  const DOW_LONG = ['понеделник','вторник','сряда','четвъртък','петък','събота','неделя'];
  const MOODS = ['много добро','добро','неутрално','умора','лошо'];
  const MOOD_EMOJI = { 'много добро':'😄','добро':'🙂','неутрално':'😐','умора':'😴','лошо':'😢' };
  const GENDERS = ['момче','момиче','мъж','жена'];

  const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const initials = (a, b) => ((a?.[0] || '') + (b?.[0] || '')).toUpperCase();
  const pad = (n) => String(n).padStart(2, '0');

  // „2026-10-12" → локална дата (без изместване от часовата зона)
  const parseD = (d) => { if (!d) return null; if (d instanceof Date) return d; const s = String(d); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s); };
  const ymd = (d) => { const t = parseD(d); return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`; };
  const todayStr = () => ymd(new Date());
  const addDays = (d, n) => { const t = parseD(d); const x = new Date(t); x.setDate(x.getDate() + n); return x; };
  const dowIdx = (d) => (parseD(d).getDay() + 6) % 7; // пн=0
  function fmtDate(d) { if (!d) return ''; const dt = parseD(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0,3)} ${dt.getFullYear()}`; }
  function fmtDay(d) { const dt = parseD(d); return `${DOW_LONG[dowIdx(dt)]}, ${dt.getDate()} ${MONTHS[dt.getMonth()]}`; }
  function fmtShort(d) { const dt = parseD(d); return `${DOW[dowIdx(dt)]} ${dt.getDate()}.${pad(dt.getMonth()+1)}`; }
  function fmtTime(t) { return t ? String(t).slice(0,5) : ''; }
  function ageFrom(bd) {
    if (!bd) return '';
    const b = parseD(bd), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  const toDateInput = (d) => d ? ymd(d) : '';
  const telHref = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // Стабилен цвят по низ (за аватари)
  const AV_COLORS = ['#1F73E0', '#12805a', '#F5883C', '#8B5CF6', '#EF5F6B', '#14B8A6', '#D97706', '#EC4899'];
  const hashColor = (s) => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; return AV_COLORS[Math.abs(h) % AV_COLORS.length]; };
  const avatar = (first, last, cls = '') => `<span class="av ${cls}" style="--c:${hashColor((first||'') + (last||''))}">${esc(initials(first, last) || '?')}</span>`;

  /* ---------- Тост ---------- */
  function toast(msg, type = '') {
    const host = document.getElementById('toast-host');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const ico = type === 'ok' ? I.check : type === 'err' ? I.x : I.wave;
    el.innerHTML = `${ico}<span>${esc(msg)}</span>`;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = 'all .3s'; setTimeout(() => el.remove(), 300); }, 2800);
  }
  const err = (e) => {
    toast(e?.message || 'Възникна грешка', 'err');
    if (e && e.status === 401) { try { API.logout(); } catch {} navigate('/login'); }
  };

  /* ---------- Модал ---------- */
  let _modalStack = 0;
  function modal({ title, body, footer, large }) {
    const host = document.getElementById('modal-host');
    host.hidden = false;
    _modalStack++;
    host.innerHTML = `
      <div class="modal-scrim" data-close></div>
      <div class="modal ${large ? 'modal-lg' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head"><h3>${esc(title)}</h3><button class="x-btn" data-close aria-label="Затвори">${I.x}</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    $$('[data-close]', host).forEach(b => b.onclick = closeModal);
    document.body.classList.add('modal-open');
    return host;
  }
  function closeModal() { const h = document.getElementById('modal-host'); h.hidden = true; h.innerHTML = ''; document.body.classList.remove('modal-open'); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Потвърждение в стила на приложението (вместо confirm())
  function ask(title, text, okLabel = 'Да', danger = false) {
    return new Promise(res => {
      modal({ title, body: `<p>${text}</p>`,
        footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="askOk">${esc(okLabel)}</button>` });
      let done = false;
      $('#askOk').onclick = () => { done = true; closeModal(); res(true); };
      $$('#modal-host [data-close]').forEach(b => b.addEventListener('click', () => { if (!done) res(false); }));
    });
  }

  const busy = (btn, on, label = '') => {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${label}`; }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.label || label; }
  };

  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); toast('Копирано', 'ok'); }
    catch { const i = document.createElement('textarea'); i.value = txt; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); toast('Копирано', 'ok'); }
  }

  /* ---------- Рутер ---------- */
  const routes = [];
  const route = (re, handler) => routes.push({ re, handler });
  function navigate(hash) { if (location.hash.replace(/^#/, '') === hash) render(); else location.hash = hash; }

  let _cleanup = [];
  const onLeave = (fn) => _cleanup.push(fn);
  let _lastPath = null;

  async function render() {
    const hash = location.hash.replace(/^#/, '') || '/';
    _cleanup.splice(0).forEach(fn => { try { fn(); } catch {} });
    closeModal();
    const base = hash.split('/').slice(0, 3).join('/');
    if (base !== _lastPath) window.scrollTo(0, 0);
    _lastPath = base;
    for (const r of routes) {
      const m = hash.match(r.re);
      if (m) { try { await r.handler(...m.slice(1)); } catch (e) { err(e); } return; }
    }
    navigate(API.isAuthed() ? '/app/today' : '/');
  }
  window.addEventListener('hashchange', render);

  function openConfig() {
    modal({
      title: 'Връзка към API',
      body: `<div class="field"><label>Адрес на сървъра</label>
        <input class="input" id="apiBaseIn" value="${esc(API.getBase())}" placeholder="https://swimwithsmile.pages.dev/exec">
        <span class="hint">Обикновено не се пипа. Завършва на <b>/exec</b>. Празно = по подразбиране.</span></div>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="saveCfg">Запази</button>`
    });
    $('#saveCfg').onclick = () => { const v = $('#apiBaseIn').value.trim(); if (v) API.setBase(v); else { try { localStorage.removeItem('sws.apiBase'); } catch {} } toast('Запазено', 'ok'); closeModal(); };
  }

  /* ============================================================
     ЧЕРУПКА (треньор) — топбар + долна навигация
     ============================================================ */
  const NAV = [
    { to: '/app/today', key: 'today', ico: I.sun, label: 'Днес' },
    { to: '/app/calendar', key: 'calendar', ico: I.cal, label: 'График' },
    { to: '/app/children', key: 'children', ico: I.kids, label: 'Плувци' },
    { to: '/app/club', key: 'club', ico: I.grid, label: 'Клуб' },
  ];
  function shell(active, content) {
    const u = API.getUser() || {};
    document.body.classList.add('has-topbar');
    const navLink = it => `<a href="#${it.to}" class="${active===it.key?'active':''}" ${active===it.key?'aria-current="page"':''}>${it.ico}<span>${it.label}</span></a>`;
    const ini = esc(initials(...(u.name || 'Т').split(' ')));
    app.innerHTML = `
      <div class="aqua-bg"></div>
      <header class="topbar">
        <a class="brand" href="#/app/today" aria-label="SwimWithSmile — Днес">
          ${logoMark()}
          <div class="brand-txt">
            <div class="brand-name">Swim<span>With</span>Smile</div>
          </div>
        </a>
        ${u.teamName ? `<button class="team-pill" id="teamPill" aria-label="Смени отбора">${I.team}<span>${esc(u.teamName)}</span>${(u.teams || []).length > 1 ? I.chevD : ''}</button>` : ''}
        <nav class="nav" aria-label="Основна навигация">${NAV.map(navLink).join('')}</nav>
        <div class="topbar-right">
          <button class="usr" id="meBtn" aria-label="Профил и изход"><span class="nm">${esc(u.name || u.email || 'Треньор')}</span><span class="avatar">${ini}</span></button>
        </div>
      </header>
      <main class="wrap" id="view">${content}</main>
      <nav class="bottom-nav" aria-label="Основна навигация">
        ${navLink(NAV[0])}${navLink(NAV[1])}
        <button class="fab" id="fabBtn" aria-label="Бързо добавяне">${I.plus}</button>
        ${navLink(NAV[2])}${navLink(NAV[3])}
      </nav>`;
    $('#meBtn').onclick = () => accountSheet();
    $('#fabBtn').onclick = () => quickSheet();
    const tp = $('#teamPill'); if (tp) tp.onclick = () => teamSheet();
    API.prefetch();
  }

  // Избор на отбор — треньорът може да е в колкото иска отбори
  async function teamSheet() {
    const u = API.getUser() || {};
    const paint = (teams) => {
      const body = $('#modal-host .modal-body'); if (!body) return;
      body.innerHTML = `
        <p class="subtle" style="margin-bottom:12px">Избери в кой отбор да влезеш. Всеки отбор има свои плувци, график и треньори.</p>
        <div class="menu-list">${teams.map(t => `
          <button class="menu-row team-row ${t.teamId === u.teamId ? 'cur' : ''}" data-tid="${esc(t.teamId)}">${I.team}
            <span><b>${esc(t.teamName)}</b><small>${t.role === 'owner' ? 'собственик' : 'треньор'}</small></span>
            ${t.teamId === u.teamId ? `<span class="tag">тук си</span>` : I.chevR}</button>`).join('')}
        </div>
        <div class="menu-list" style="margin-top:12px">
          <button class="menu-row" id="tNew">${I.plus}<span>Нов отбор</span>${I.chevR}</button>
          <a class="menu-row" href="#/app/team">${I.link}<span>Покани колега в „${esc(u.teamName || '')}"</span>${I.chevR}</a>
        </div>`;
      $$('#modal-host [data-tid]').forEach(b => b.onclick = async () => {
        if (b.dataset.tid === u.teamId) return closeModal();
        busy(b, true);
        try { const r = await API.switchTeam(b.dataset.tid); closeModal(); toast(`Ти си в „${r.teamName}"`, 'ok'); navigate('/app/today'); render(); }
        catch (e) { busy(b, false); err(e); }
      });
      $('#tNew').onclick = () => newTeamForm();
      $$('#modal-host a.menu-row').forEach(a => a.addEventListener('click', closeModal));
    };
    modal({ title: 'Отбори', body: '' });
    paint(u.teams && u.teams.length ? u.teams : [{ teamId: u.teamId, teamName: u.teamName, role: u.role }]);
    try { const list = await API.myTeams(); if ($('#modal-host .modal-body')) paint(list); } catch {}
  }
  // Профил: име, потребителско име, парола
  function profileForm() {
    const u = API.getUser() || {};
    modal({ title: 'Моят профил', body: `
      <div class="field"><label for="pfName">Име и фамилия</label><input class="input" id="pfName" value="${esc(u.name || '')}" maxlength="80" autocomplete="name"></div>
      <div class="field"><label for="pfUser">Потребителско име</label><input class="input" id="pfUser" value="${esc(u.username || '')}" maxlength="30" placeholder="напр. Ники" autocomplete="username">
        <span class="hint">Влизаш с него или с имейла (${esc(u.email || '')}). Уникално е.</span></div>
      <details class="howto"><summary>Смени паролата</summary>
        <div class="field" style="margin-top:10px"><label for="pfCur">Сегашна парола</label><input class="input" id="pfCur" type="password" autocomplete="current-password"></div>
        <div class="field"><label for="pfNew">Нова парола</label><input class="input" id="pfNew" type="password" autocomplete="new-password" placeholder="поне 8 символа"></div>
      </details>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="pfSave">${I.check} Запази</button>` });
    $('#pfSave').onclick = async (ev) => {
      const dto = {};
      const name = $('#pfName').value.trim(), user = $('#pfUser').value.trim(), cur = $('#pfCur').value, nw = $('#pfNew').value;
      if (name !== (u.name || '')) dto.fullName = name;
      if (user !== (u.username || '')) dto.username = user;
      if (nw || cur) { if (nw.length < 8) return toast('Новата парола — поне 8 символа', 'err'); dto.newPassword = nw; dto.currentPassword = cur; }
      if (!Object.keys(dto).length) return closeModal();
      busy(ev.currentTarget, true, 'Запис…');
      try { await API.updateProfile(dto); toast('Запазено', 'ok'); closeModal(); render(); }
      catch (e) { busy(ev.currentTarget, false); err(e); }
    };
  }

  function newTeamForm() {
    modal({ title: 'Нов отбор', body: `
      <div class="field"><label for="ntName">Име на отбора</label><input class="input" id="ntName" placeholder="напр. Делфините — Велико Търново" maxlength="60"></div>
      <p class="hint">Ставаш собственик. Влизаш със същия имейл и парола — после сменяш отбора от бутона горе.</p>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="ntOk">${I.check} Създай</button>` });
    $('#ntName').focus();
    $('#ntOk').onclick = async (ev) => {
      const name = $('#ntName').value.trim();
      if (name.length < 2) return toast('Въведи име на отбора', 'err');
      busy(ev.currentTarget, true, 'Създаване…');
      try { const r = await API.createTeam(name); closeModal(); toast(`Отбор „${r.teamName}" е готов`, 'ok'); navigate('/app/team'); }
      catch (e) { busy(ev.currentTarget, false); err(e); }
    };
  }

  // Лист с бързи действия (централният „+" долу)
  function quickSheet() {
    const items = [
      ['session', I.cal, 'Тренировка', 'нова или повтаряща се'],
      ['child', I.kids, 'Плувец', 'нов картон'],
      ['award', I.trophy, 'Награда', 'на един или много плувци'],
      ['today', I.check, 'Присъствие', 'днешните тренировки'],
    ];
    modal({ title: 'Добави', body: `<div class="qa-grid">${items.map(([k, ico, t, d]) => `
      <button class="qa-tile" data-q="${k}"><span class="qa-ico">${ico}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>` });
    $$('.qa-tile').forEach(b => b.onclick = () => {
      const k = b.dataset.q; closeModal();
      if (k === 'session') window.__SWS.sessionForm(null, new Date());
      else if (k === 'child') window.__SWS.childForm();
      else if (k === 'award') window.__SWS.bulkAward();
      else navigate('/app/today');
    });
  }

  // Профил: отбор, календар, изход
  function accountSheet() {
    const u = API.getUser() || {};
    modal({ title: 'Профил', body: `
      <div class="me-card"><span class="avatar avatar-lg">${esc(initials(...(u.name || 'Т').split(' ')))}</span>
        <div><b>${esc(u.name || 'Треньор')}</b><small>${u.username ? '@' + esc(u.username) + ' · ' : ''}${esc(u.email || '')}</small>${u.teamName ? `<small>${esc(u.teamName)} · ${u.role === 'owner' ? 'собственик' : 'треньор'}</small>` : ''}</div></div>
      <div class="menu-list">
        <button class="menu-row" id="meProfile">${I.user}<span>Моят профил${u.username ? '' : ' <small class="txt-red">· избери потребителско име</small>'}</span>${I.chevR}</button>
        <a href="#/app/team" class="menu-row">${I.team}<span>Отбор и покани</span>${I.chevR}</a>
        <button class="menu-row" id="meTeams">${I.layers}<span>Смени / нов отбор</span>${I.chevR}</button>
        <button class="menu-row" id="meCal">${I.cal}<span>Google Calendar</span>${I.chevR}</button>
        <a href="#/" class="menu-row">${I.wave}<span>Начална страница</span>${I.chevR}</a>
        <button class="menu-row danger" id="meOut">${I.logout}<span>Изход</span></button>
      </div>` });
    $$('#modal-host a.menu-row').forEach(a => a.addEventListener('click', closeModal));
    $('#meCal').onclick = () => window.__SWS.calendarSync();
    $('#meTeams').onclick = () => teamSheet();
    $('#meProfile').onclick = () => profileForm();
    $('#meOut').onclick = () => { closeModal(); API.logout(); navigate('/'); };
  }
  const guard = () => { if (!API.isAuthed()) { navigate('/login'); return false; } return true; };

  let _logoN = 0;
  function logoMark(size = 38) {
    const id = 'lg' + (++_logoN);
    return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46D6F7"/><stop offset="1" stop-color="#1F5FD6"/></linearGradient></defs>
      <rect width="40" height="40" rx="12" fill="url(#${id})"/>
      <circle cx="14.5" cy="14.5" r="2.3" fill="#fff"/><circle cx="25.5" cy="14.5" r="2.3" fill="#fff"/>
      <path d="M8 22.5c2 0 2-1.8 4-1.8s2 1.8 4 1.8 2-1.8 4-1.8 2 1.8 4 1.8 2-1.8 4-1.8 2 1.8 4 1.8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M13 27.6c3.9 3.3 10.1 3.3 14 0" stroke="#FFC53D" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    </svg>`;
  }

  const loading = (n = 4, h = 74) => `<div style="display:grid;gap:14px">${`<div class="skel" style="height:${h}px"></div>`.repeat(n)}</div>`;
  const emptyState = (icon, title, sub, action = '') => `<div class="empty rise"><div class="ico">${icon}</div><h3>${esc(title)}</h3><p class="subtle">${esc(sub||'')}</p>${action}</div>`;

  window.__SWS = { app, shell, guard, modal, teamSheet, newTeamForm, closeModal, ask, toast, err, navigate, render, route, routes, onLeave, logoMark, openConfig,
    busy, copyText, loading, emptyState, avatar, hashColor,
    I, esc, $, $$, initials, fmtDate, fmtDay, fmtShort, fmtTime, ageFrom, toDateInput, parseD, ymd, todayStr, addDays, dowIdx, telHref, plural,
    MONTHS, DOW, DOW_LONG, MOODS, MOOD_EMOJI, GENDERS, pad };
})();

/* ============================================================
   ЧАСТ 2 — Днес, график и тренировки
   ============================================================ */
(() => {
  const S = window.__SWS;
  const { shell, guard, modal, closeModal, ask, toast, err, navigate, route, busy, copyText, loading, emptyState, avatar,
    I, esc, $, $$, fmtDate, fmtDay, fmtShort, fmtTime, toDateInput, parseD, ymd, todayStr, addDays, dowIdx,
    MONTHS, DOW, MOODS, MOOD_EMOJI, pad } = S;

  const COACH_PALETTE = ['#1F73E0', '#12805a', '#F5883C', '#8B5CF6', '#EF5F6B', '#14B8A6', '#EAB308', '#EC4899'];
  const coachColors = (boot) => { const m = {}; (boot?.coaches || []).forEach((c, i) => m[c.id] = { name: c.fullName || c.email, color: COACH_PALETTE[i % COACH_PALETTE.length] }); return m; };
  const sessColor = (s, cc) => s.groupColor || (cc[s.coachId] || {}).color || '#9DB2D6';
  const firstName = (n) => String(n || 'Треньор').split(' ')[0];

  /* ---------- Метри: „4x6, 5x8" дължини × басейна ---------- */
  // ===== Разчитане на тренировка, написана на ръка (общо за сървъра и сайта) =====
  // Всеки ред е серия: „200 крака кроул", „2 x 200 гръб" (=400 м), „два пъти по двеста", „4 по 50 ръце",
  // „6 дължини кроул", „кроул 100". Под 25 без мярка = дължини на басейна; 25 и повече = метри.
  // Ред без число („загрявка") е просто бележка — 0 м, не е грешка.
  var SWIM_NUMW = { 'един': 1, 'една': 1, 'едно': 1, 'два': 2, 'две': 2, 'три': 3, 'четири': 4, 'пет': 5, 'шест': 6, 'седем': 7, 'осем': 8, 'девет': 9, 'десет': 10,
    'единадесет': 11, 'единайсет': 11, 'дванадесет': 12, 'дванайсет': 12, 'тринадесет': 13, 'тринайсет': 13, 'четиринадесет': 14, 'четиринайсет': 14,
    'петнадесет': 15, 'петнайсет': 15, 'шестнадесет': 16, 'шестнайсет': 16, 'седемнадесет': 17, 'седемнайсет': 17, 'осемнадесет': 18, 'осемнайсет': 18,
    'деветнадесет': 19, 'деветнайсет': 19, 'двадесет': 20, 'двайсет': 20, 'тридесет': 30, 'трийсет': 30, 'четиридесет': 40, 'четирийсет': 40,
    'петдесет': 50, 'шестдесет': 60, 'седемдесет': 70, 'осемдесет': 80, 'деветдесет': 90, 'сто': 100, 'двеста': 200, 'триста': 300,
    'четиристотин': 400, 'петстотин': 500, 'шестстотин': 600, 'седемстотин': 700, 'осемстотин': 800, 'деветстотин': 900, 'хиляда': 1000, 'половин': 0.5 };
  function swimWordsToDigits(line) {
    var t = String(line).toLowerCase().split(/(\s+)/), out = [], i = 0;
    while (i < t.length) {
      var w = t[i].replace(/[.,]$/, '');
      if (SWIM_NUMW[w] !== undefined && w !== 'половин') {
        var acc = SWIM_NUMW[w], j = i + 1;
        for (;;) {                         // „сто и петдесет", „двайсет и пет", „двеста петдесет"
          var k = j; while (k < t.length && /^\s+$/.test(t[k])) k++;
          var nx = (t[k] || '').replace(/[.,]$/, '');
          if (nx === 'и') { var k2 = k + 1; while (k2 < t.length && /^\s+$/.test(t[k2])) k2++; var n2 = (t[k2] || '').replace(/[.,]$/, '');
            if (SWIM_NUMW[n2] !== undefined && SWIM_NUMW[n2] < acc && n2 !== 'половин') { acc += SWIM_NUMW[n2]; j = k2 + 1; continue; } break; }
          if (SWIM_NUMW[nx] !== undefined && SWIM_NUMW[nx] < acc && acc >= 20 && nx !== 'половин') { acc += SWIM_NUMW[nx]; j = k + 1; continue; }
          break;
        }
        out.push(String(acc)); i = j;
      } else { out.push(t[i]); i++; }
    }
    return out.join('');
  }
  function swimLine(raw, pool) {
    pool = pool || 25;
    var line = swimWordsToDigits(raw).replace(/(^|\s)(хикс|икс)(?=\s|$)/g, '$1x').replace(/(\d)\s*[хx×*]\s*(\d)/g, '$1x$2');
    // „2 пъти по 200", „2 пъти 200", „4 по 50", „2x200"
    var m = line.match(/(\d+(?:[.,]\d+)?)\s*(?:x|пъти(?:\s*(?:по|x))?|път(?:\s*по)?|по)\s*(\d+(?:[.,]\d+)?)\s*(метра|метър|метри|м\.?|m|дължини|дължина|дълж\.?|д\.)?(?![a-zа-я0-9])/i);
    var reps = 1, dist, unit, used;
    if (m) { reps = parseFloat(m[1].replace(',', '.')); dist = parseFloat(m[2].replace(',', '.')); unit = m[3]; used = m[0]; }
    else {
      m = line.match(/(\d+(?:[.,]\d+)?)\s*(метра|метър|метри|м\.?|m|дължини|дължина|дълж\.?|д\.)?(?![a-zа-я0-9])/i);
      if (!m) return { m: 0, what: String(raw).trim(), ok: false };
      dist = parseFloat(m[1].replace(',', '.')); unit = m[2]; used = m[0];
    }
    var lengths = unit ? /^д/i.test(unit) : dist < 25;
    var meters = Math.round(reps * dist * (lengths ? pool : 1));
    if (!(meters > 0) || meters > 20000) return { m: 0, what: String(raw).trim(), ok: false };
    var what = line.replace(used, ' ').replace(/^\s*(по|пъти)\s+/, '').replace(/\s+/g, ' ').trim();
    return { m: meters, what: what, ok: true, reps: reps, dist: dist, lengths: lengths };
  }
  function swimLines(txt, pool) {
    return String(txt || '').split(/\n|;|,(?!\d)/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return swimLine(x, pool); });
  }

  function parseSets(txt) {
    const out = { lengths: 0, meters: 0, bad: [] };
    swimLines(txt, 1).forEach(l => { if (l.lengths) out.lengths += l.m; else out.meters += l.m; });
    return out;
  }
  const metersOf = (sets, pool) => { if (!sets) return null; const r = parseSets(sets); const v = Math.round(r.lengths * (pool || 25) + r.meters); return v > 0 ? v : null; };
  const fmtM = (m) => m >= 1000 ? (m / 1000).toFixed(m % 1000 ? 2 : 0).replace('.', ',') + ' км' : m + ' м';

  /* ---------- Бутони за присъствие (три състояния) ---------- */
  // true = присъства, false = отсъства, null = неотбелязано. Повторно докосване = изчистване.
  const attButtons = (state, size = '') => `
    <div class="att2 ${size}" data-att="${state === true ? '1' : state === false ? '0' : ''}" role="group" aria-label="Присъствие">
      <button type="button" class="att2-b yes" data-v="1" aria-pressed="${state === true}" title="Присъства">${I.check}</button>
      <button type="button" class="att2-b no" data-v="0" aria-pressed="${state === false}" title="Отсъства">${I.x}</button>
      <button type="button" class="att2-b clr" data-v="" title="Махни отметката">↺</button>
    </div>`;
  const paintAtt = (box, v) => {
    box.dataset.att = v;
    $$('.att2-b', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  };
  // Свързва бутоните; onChange(childId, true|false|null) → Promise
  function bindAtt(root, onChange) {
    $$('[data-att]', root).forEach(box => {
      const row = box.closest('[data-cid]');
      $$('.att2-b', box).forEach(b => b.onclick = async (e) => {
        e.stopPropagation();
        const prev = box.dataset.att;
        const next = prev === b.dataset.v ? '' : b.dataset.v;
        paintAtt(box, next);                               // веднага — без чакане на сървъра
        if (navigator.vibrate) try { navigator.vibrate(8); } catch {}
        try { await onChange(row.dataset.cid, next === '' ? null : next === '1'); }
        catch (ex) { paintAtt(box, prev); err(ex); }
        root.dispatchEvent(new CustomEvent('attchange'));
      });
    });
  }
  const attCount = (root) => {
    const all = $$('[data-att]', root);
    return { total: all.length, present: all.filter(b => b.dataset.att === '1').length, marked: all.filter(b => b.dataset.att !== '').length };
  };

  /* ---------- Избор на хора по име (с автоматичен картон за нови) ---------- */
  const peopleCount = (n) => { n = n || 0; return n === 1 ? '1 плувец' : `${n} плувци`; };
  const normName = (x) => String(x || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const fullName = (k) => `${k.firstName || ''} ${k.lastName || ''}`.trim();

  // Поле с подсказки: пишеш име → избираш съществуващ картон или Enter за ново име
  function nameSuggest(input, box, getKids, onPick) {
    let hits = [], cur = -1;
    const paint = () => {
      const q = normName(input.value);
      if (!q) { box.hidden = true; hits = []; return; }
      hits = getKids().filter(k => normName(fullName(k)).includes(q) || normName(k.calendarName).includes(q)).slice(0, 6);
      const exact = getKids().some(k => normName(fullName(k)) === q);
      cur = hits.length ? 0 : -1;
      box.innerHTML = hits.map((k, i) => `<button type="button" class="ns-i ${i === cur ? 'on' : ''}" data-i="${i}">${avatar(k.firstName, k.lastName, 'av-sm')}<span>${esc(fullName(k))}</span>${k.isAdult ? '<small>възрастен</small>' : ''}</button>`).join('')
        + (exact ? '' : `<button type="button" class="ns-i ns-new" data-new>${I.plus}<span>Нов картон: <b>${esc(input.value.trim())}</b></span></button>`);
      box.hidden = false;
      $$('[data-i]', box).forEach(b => b.onmousedown = (e) => { e.preventDefault(); pick(hits[+b.dataset.i]); });
      const nb = $('[data-new]', box); if (nb) nb.onmousedown = (e) => { e.preventDefault(); pickNew(); };
    };
    const reset = () => { input.value = ''; box.hidden = true; hits = []; };
    const pick = (k) => { reset(); onPick({ childId: k.id, name: fullName(k) }); };
    const pickNew = () => { const v = input.value.trim().replace(/\s+/g, ' '); if (!v) return; reset(); onPick({ name: v, isNew: true }); };
    input.addEventListener('input', paint);
    input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 120));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!hits.length) return; e.preventDefault();
        cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
        $$('[data-i]', box).forEach(b => b.classList.toggle('on', +b.dataset.i === cur));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const q = normName(input.value); if (!q) return;
        const exact = getKids().find(k => normName(fullName(k)) === q);
        if (exact) pick(exact); else if (cur >= 0 && hits[cur]) pick(hits[cur]); else pickNew();
      } else if (e.key === 'Escape') { box.hidden = true; }
    });
  }

  // Списък от хора за нова тренировка. get() → [{ childId } | { name, isAdult }]
  function peoplePicker(host, kids) {
    const list = [];
    host.innerHTML = `<div class="pp-chips" data-chips></div>
      <div class="ns-wrap"><input class="input" data-q type="text" placeholder="Напиши име и натисни Enter…" autocomplete="off" enterkeyhint="done"><div class="ns-box" data-box hidden></div></div>`;
    const chips = $('[data-chips]', host);
    const paint = () => {
      chips.innerHTML = list.map((x, i) => `<span class="pp-chip ${x.isNew ? 'is-new' : ''}">
        <span>${esc(x.name)}</span>
        ${x.isNew ? `<button type="button" class="pp-type" data-type="${i}" title="Смени: дете / възрастен">${x.isAdult ? '🧑 възрастен' : '🧒 дете'}</button><small>нов</small>` : ''}
        <button type="button" class="pp-x" data-x="${i}" aria-label="Махни ${esc(x.name)}">×</button></span>`).join('');
      $$('[data-x]', chips).forEach(b => b.onclick = () => { list.splice(+b.dataset.x, 1); paint(); });
      $$('[data-type]', chips).forEach(b => b.onclick = () => { const x = list[+b.dataset.type]; x.isAdult = !x.isAdult; paint(); });
    };
    nameSuggest($('[data-q]', host), $('[data-box]', host), () => kids.filter(k => !list.some(x => x.childId === k.id)), (x) => {
      if (list.some(y => (x.childId && y.childId === x.childId) || (!x.childId && !y.childId && normName(y.name) === normName(x.name)))) return;
      list.push(x); paint();
    });
    return {
      get: () => list.map(x => x.childId ? { childId: x.childId } : { name: x.name, isAdult: !!x.isAdult }),
      pending: () => $('[data-q]', host).value.trim(),
      // Написано, но без Enter → добавяме го сами (съществуващ по точно име или нов картон)
      commit: () => {
        const inp = $('[data-q]', host), v = inp.value.trim(); if (!v) return;
        const n = normName(v);
        const hits = kids.filter(k => normName(((k.firstName || '') + ' ' + (k.lastName || '')).trim()) === n || normName(k.firstName || '') === n);
        const x = hits.length === 1 ? { childId: hits[0].id, name: ((hits[0].firstName || '') + ' ' + (hits[0].lastName || '')).trim() } : { name: v, isNew: true };
        if (!list.some(y => (x.childId && y.childId === x.childId) || (!x.childId && !y.childId && normName(y.name) === n))) list.push(x);
        inp.value = ''; paint();
      },
    };
  }

  // най-честите серии в тренировката (за общото поле „Какво плуваха")
  const commonSets = (parts) => { const c = {}; parts.forEach(p => { if (p.sets) c[p.sets] = (c[p.sets] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ''; };
  const prettySets = (t) => setsToText(t).split('\n').join(' · ');
  /* ---------- Ред за плувец в тренировка ---------- */
  function kidRow(p, opts = {}) {
    const alert = p.medicalAlert ? `<button type="button" class="kid-alert" data-alert="${esc(p.medicalAlert)}" title="${esc(p.medicalAlert)}" aria-label="Здравно предупреждение">${I.alert}</button>` : '';
    const sop = p.specialNeeds ? `<span class="tag tag-sop" title="${esc(p.specialNeeds)}">СОП</span>` : '';
    const abs = p.absStreak >= 2 ? `<span class="tag tag-warn" title="Поредни отсъствия">${p.absStreak}× отс.</span>` : '';
    const notes = [p.swamWhat, p.dailyProgress, p.parentNote].filter(Boolean).length;
    // Натискане на детето (снимка/име) → неговите серии, настроение и бележки
    return `<div class="krow ${opts.details ? 'krow-tap' : ''}" data-cid="${p.childId}">
      ${opts.details ? `<div class="krow-open" role="button" tabindex="0" data-more aria-label="Серии, настроение и бележки за ${esc(p.childName)}">` : ''}${avatar(p.firstName || p.childName, p.lastName || '')}
      <div class="krow-main">
        <div class="krow-name">${esc(p.childName)} ${opts.details ? `<span class="krow-chev">${I.chevR}</span>` : ''}${alert}</div>
        ${p.sets ? `<div class="krow-sets">${esc(prettySets(p.sets))}</div>` : ''}
        <div class="krow-meta">${sop}${abs}${p.meters ? `<span class="tag tag-m">🏊 ${fmtM(p.meters)}${p.kcal ? ` · 🔥 ${p.kcal}` : ''}</span>` : ''}${p.mood ? `<span>${MOOD_EMOJI[p.mood] || ''}</span>` : ''}${notes ? `<span class="subtle">📝 ${notes}</span>` : ''}${opts.details && !p.sets ? `<span class="krow-hint">+ какво плува</span>` : ''}</div>
      </div>${opts.details ? '</div>' : ''}
      ${attButtons(p.attended)}
    </div>`;
  }
  function bindAlerts(root) {
    $$('[data-alert]', root).forEach(b => b.onclick = (e) => { e.stopPropagation(); toast('⚠ ' + b.dataset.alert, 'err'); });
  }

  let _gcalById = {}; // събития от Google Calendar по ключ

  /* ============================================================
     ДНЕС
     ============================================================ */
  route(/^\/app\/today$/, async () => {
    if (!guard()) return;
    const u = API.getUser() || {};
    // до 10:00 — утро, до 17:00 — ден, след това — вечер
    const nowD = new Date(), mins = nowD.getHours() * 60 + nowD.getMinutes();
    const hello = mins < 600 ? 'Добро утро' : mins < 1020 ? 'Добър ден' : 'Добър вечер';
    shell('today', `
      <div class="page-head today-head">
        <div><div class="page-eyebrow">${esc(fmtDay(new Date()))}</div><h1 class="pagettl">${hello}, ${esc(firstName(u.name))}</h1></div>
        <div class="quick">
          <button class="btn btn-primary" id="qSession">${I.plus}<span>Тренировка</span></button>
          <button class="btn btn-soft" id="qChild">${I.kids}<span>Плувец</span></button>
          <button class="btn btn-soft" id="qAward">${I.trophy}<span>Награда</span></button>
        </div>
      </div>
      <div class="today-grid">
        <div id="todaySessions">${loading(2, 160)}</div>
        <aside id="todaySide">${loading(2, 90)}</aside>
      </div>`);
    $('#qSession').onclick = () => sessionForm(null, new Date());
    $('#qChild').onclick = () => S.childForm();
    $('#qAward').onclick = () => S.bulkAward();
    await drawToday();
  });

  async function drawToday(fresh) {
    const date = todayStr();
    try { await API.live('today', { date }, (d) => paintToday(d)); }
    catch (e) { return err(e); }
  }
  /* Днес: тренировките от сайта И събитията от Google Calendar са в един списък по час.
     Събитие от Google с разпознати деца изглежда като тренировка — ✓ / ✗ веднага;
     при първото докосване то тихо се записва в графика (без бутон „Добави"). */
  function paintToday(d) {
    const host = $('#todaySessions'); if (!host) return;
    const cal = d.calendar || [];
    cal.forEach(ev => _gcalById[ev.key] = ev);
    const offs = cal.filter(ev => ev.kind === 'off');
    const gev = cal.filter(ev => ev.kind !== 'off' && !ev.allDay);
    const toMin = (t) => { const [h, m] = String(t || '0:0').split(':'); return +h * 60 + +m; };
    const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    const items = [
      ...d.sessions.map(x => ({ t: x.startTime || '', dur: x.durationMin || 45, s: x,
        kids: (x.participants || []).map(p => ({ id: p.childId, name: p.firstName || firstName(p.childName), last: p.lastName || '', att: p.attended })) })),
      ...gev.map(x => ({ t: x.startTime || '', dur: x.durationMin || 45, g: x,
        kids: (x.children || []).map(c => ({ id: c.id, name: c.firstName || firstName(c.name), last: '', att: null })), unk: x.unknownNames || [] })),
    ].sort((a, b) => a.t.localeCompare(b.t));
    let nextMarked = false;
    items.forEach(it => {
      const st = toMin(it.t), en = st + it.dur;
      it.state = it.s && it.s.status === 'cancelled' ? 'cancelled' : nowM >= en ? 'past' : nowM >= st ? 'now' : (!nextMarked ? (nextMarked = true, 'next') : 'later');
      it.in = st - nowM;
    });
    const kidsCount = new Set(items.flatMap(it => it.kids.map(k => k.id))).size;
    const nxt = items.find(it => it.state === 'now') || items.find(it => it.state === 'next');
    const inTxt = (m) => m <= 0 ? 'сега' : m < 60 ? `след ${m} мин` : `след ${Math.floor(m / 60)} ч${m % 60 ? ' ' + (m % 60) + ' мин' : ''}`;
    const offHtml = offs.length ? `<div class="today-off">${offs.map(ev => `<span>🌴 <b>${esc(firstName(ev.coachName))}</b> — ${esc(ev.title)}</span>`).join('')}</div>` : '';
    if (!items.length) {
      host.innerHTML = offHtml + emptyState(I.sun, 'Днес няма тренировки', 'Нито в графика, нито в Google Calendar.',
        `<button class="btn btn-primary" id="emptyNew" style="margin-top:16px">${I.plus} Добави тренировка</button>`);
      $('#emptyNew').onclick = () => sessionForm(null, new Date());
      drawSide(d); return;
    }
    const kidBtn = (k, it) => `<button type="button" class="tl-kid ${k.att === true ? 'yes' : k.att === false ? 'no' : ''}" data-kid="${k.id}">
        ${avatar(k.name, k.last)}<span>${esc(k.name)}</span>${k.att === true ? '<i class="tl-st">✓</i>' : k.att === false ? '<i class="tl-st">✗</i>' : ''}</button>`;
    host.innerHTML = offHtml + `
      <div class="tl-sum card">
        <div><b>${items.length}</b><small>${items.length === 1 ? 'час' : 'часа'} днес</small></div>
        <div><b>${kidsCount}</b><small>${kidsCount === 1 ? 'дете' : 'деца'}</small></div>
        ${nxt ? `<div class="tl-next"><small>${nxt.state === 'now' ? 'Сега' : 'Следва'}</small><b>${fmtTime(nxt.t)} · ${esc(nxt.kids.map(k => k.name).concat(nxt.unk || []).join(', ') || (nxt.s && (nxt.s.groupName || nxt.s.title)) || (nxt.g && nxt.g.title) || 'тренировка')}</b>
          <em>${inTxt(nxt.in)}</em></div>` : `<div class="tl-next"><small>За днес</small><b>Всички часове минаха</b></div>`}
      </div>
      <div class="tl">${items.map((it, i) => `
        <section class="tl-item is-${it.state}" data-i="${i}">
          <div class="tl-time"><b>${fmtTime(it.t)}</b><small>${it.dur} мин</small>${it.state === 'now' ? '<span class="tl-now">сега</span>' : ''}</div>
          <div class="tl-body">
            <div class="tl-kids">${it.kids.map(k => kidBtn(k, it)).join('')}
              ${(it.unk || []).map(n => `<button type="button" class="tl-kid q" data-who><i class="tl-q">?</i><span>${esc(n)}</span></button>`).join('')}
              ${!it.kids.length && !(it.unk || []).length ? `<button type="button" class="tl-kid empty" data-open>${I.plus}<span>Добави деца</span></button>` : ''}
            </div>
            <button type="button" class="tl-meta" data-open>
              ${it.g ? '<span class="g-badge">Google</span>' : ''}
              ${it.s && it.s.groupName ? `<span class="tl-grp" style="--gc:${it.s.groupColor || '#1F73E0'}">${esc(it.s.groupName)}</span>` : ''}
              <span>${esc(firstName((it.s || it.g).coachName))}${it.s && it.s.location ? ' · ' + esc(it.s.location) : ''}${it.state === 'cancelled' ? ' · отменена' : ''}</span>
              <span class="tl-open">Тренировката ${I.chevR}</span>
            </button>
          </div>
        </section>`).join('')}</div>
      <p class="hint" style="margin-top:10px">Натисни дете — отваря се неговата тренировка (присъствие, какво плува).</p>`;
    // отваряне: тренировка от сайта — направо; от Google — тихо се записва и се отваря
    const openItem = async (it, cid, btn) => {
      if (it.s) return sessionDetail(it.s.id, drawToday, cid);
      const ev = it.g;
      if ((ev.unknownNames || []).length || !(ev.childIds || []).length) return gcalDetail(ev.key, drawToday);
      if (btn) busy(btn, true, '');
      try {
        const r = await API.importCalendarEvents([{ key: ev.key, date: ev.date, startTime: ev.startTime, durationMin: ev.durationMin,
          location: ev.location, title: ev.title, childIds: ev.childIds, childId: ev.childId }]);
        API.clearCache && API.clearCache();
        sessionDetail(r.items[0].sessionId, drawToday, cid);
        drawToday();
      } catch (e) { err(e); } finally { if (btn) busy(btn, false); }
    };
    $$('.tl-item', host).forEach(sec => {
      const it = items[+sec.dataset.i];
      $$('[data-kid]', sec).forEach(b => b.onclick = () => openItem(it, b.dataset.kid, b));
      $$('[data-open]', sec).forEach(b => b.onclick = () => openItem(it, null, b));
      $$('[data-who]', sec).forEach(b => b.onclick = () => gcalDetail(it.g.key, drawToday));
    });
    drawSide(d);
  }
  function todaySessionCard(s) {
    const cancelled = s.status === 'cancelled';
    const parts = s.participants || [];
    const present = parts.filter(p => p.attended === true).length;
    const marked = parts.filter(p => p.attended !== null).length;
    return `<section class="card tcard rise ${cancelled ? 'is-cancelled' : ''}" data-sid="${s.id}" style="--gc:${s.groupColor || '#1F73E0'}">
      <header class="tcard-h">
        <div class="tcard-time">${fmtTime(s.startTime)}</div>
        <div class="tcard-ttl">
          <b>${esc(s.groupName || s.title || 'Тренировка')}${cancelled ? ' · отменена' : ''}</b>
          <small>${esc(s.coachName)}${s.location ? ' · ' + esc(s.location) : ''} · ${s.durationMin} мин</small>
        </div>
        <button class="btn-icon btn-ghost" data-open aria-label="Отвори тренировката">${I.chevR}</button>
      </header>
      ${parts.length ? `
        <div class="tcard-bar"><span class="att-sum" data-sum>${present} от ${parts.length} присъстват</span>
          ${marked < parts.length ? `<button class="btn btn-soft btn-sm" data-allin>${I.check} Всички са тук</button>` : ''}</div>
        <div class="klist">${parts.map(p => kidRow(p)).join('')}</div>`
      : `<div class="tcard-empty"><p class="subtle">Още няма записани плувци.</p><button class="btn btn-soft btn-sm" data-open>${I.plus} Добави плувци</button></div>`}
    </section>`;
  }

  function bindTodayCard(s) {
    const card = $(`.tcard[data-sid="${s.id}"]`); if (!card) return;
    $$('[data-open]', card).forEach(b => b.onclick = () => sessionDetail(s.id, drawToday));
    bindAlerts(card);
    const sum = () => { const c = attCount(card); const el = $('[data-sum]', card); if (el) el.textContent = `${c.present} от ${c.total} присъстват`; };
    bindAtt(card, (cid, v) => API.upsertParticipant(s.id, { childId: cid, attended: v }));
    card.addEventListener('attchange', sum);
    const all = $('[data-allin]', card);
    if (all) all.onclick = async () => {
      const boxes = $$('[data-att]', card).filter(b => b.dataset.att === '');
      boxes.forEach(b => paintAtt(b, '1')); sum();
      busy(all, true);
      try { await API.markAttendance(s.id, boxes.map(b => ({ childId: b.closest('[data-cid]').dataset.cid, attended: true }))); toast('Отбелязано', 'ok'); all.remove(); }
      catch (e) { boxes.forEach(b => paintAtt(b, '')); sum(); busy(all, false); err(e); }
    };
  }

  const gKids = (ev) => (ev.children || []).map(c => ({ childId: c.id, childName: c.name, firstName: c.firstName || c.name, lastName: '', attended: null }));
  function googleTodayCard(ev) {
    const kids = gKids(ev), unknown = ev.unknownNames || [];
    const dur = ev.durationMin || 45;
    return `<section class="card tcard tcard-g rise" data-gk="${esc(ev.key)}" style="--gc:#2F6FED">
      <header class="tcard-h">
        <div class="tcard-time">${fmtTime(ev.startTime)}</div>
        <div class="tcard-ttl">
          <b>${esc(kids.length && !unknown.length ? kids.map(k => k.firstName).join(', ') : ev.title)}</b>
          <small><span class="g-badge">Google</span> ${esc(firstName(ev.coachName))} · ${dur} мин</small>
        </div>
        <button class="btn-icon btn-ghost" data-gopen aria-label="Отвори">${I.chevR}</button>
      </header>
      ${kids.length ? `
        <div class="tcard-bar"><span class="att-sum" data-sum>0 от ${kids.length} присъстват</span>
          <button class="btn btn-soft btn-sm" data-allin>${I.check} Всички са тук</button></div>
        <div class="klist">${kids.map(p => kidRow(p)).join('')}</div>` : ''}
      ${unknown.length ? `<div class="tcard-empty"><p class="subtle">${unknown.map(n => `„${esc(n)}"`).join(', ')} — ${unknown.length > 1 ? 'кои са?' : 'кой е?'}</p>
        <button class="btn btn-soft btn-sm" data-gwho>${I.user} Избери</button></div>` : ''}
      ${!kids.length && !unknown.length ? `<div class="tcard-empty"><p class="subtle">Събитие от Google Calendar.</p></div>` : ''}
    </section>`;
  }
  function bindGoogleCard(ev) {
    const card = $(`.tcard-g[data-gk="${CSS.escape(ev.key)}"]`); if (!card) return;
    let sid = null, pending = null;
    // първото отбелязване записва събитието като тренировка (веднъж)
    const ensure = () => sid ? Promise.resolve(sid) : (pending ||= API.importCalendarEvents([{ key: ev.key, date: ev.date, startTime: ev.startTime, durationMin: ev.durationMin,
      location: ev.location, title: ev.title, childIds: ev.childIds || [], childId: ev.childId || null }]).then(r => { sid = r.items[0].sessionId; API.clearCache && API.clearCache(); return sid; }));
    const sum = () => { const c = attCount(card); const el = $('[data-sum]', card); if (el) el.textContent = `${c.present} от ${c.total} присъстват`; };
    bindAtt(card, async (cid, v) => { const id = await ensure(); await API.upsertParticipant(id, { childId: cid, attended: v }); });
    card.addEventListener('attchange', sum);
    bindAlerts(card);
    const all = $('[data-allin]', card);
    if (all) all.onclick = async () => {
      const boxes = $$('[data-att]', card).filter(b => b.dataset.att === '');
      boxes.forEach(b => paintAtt(b, '1')); sum(); busy(all, true);
      try { const id = await ensure(); await API.markAttendance(id, boxes.map(b => ({ childId: b.closest('[data-cid]').dataset.cid, attended: true }))); toast('Отбелязано', 'ok'); all.remove(); }
      catch (e) { boxes.forEach(b => paintAtt(b, '')); sum(); busy(all, false); err(e); }
    };
    const open = async (e) => {
      if ((ev.unknownNames || []).length || !(ev.childIds || []).length) return gcalDetail(ev.key, drawToday);
      const b = e.currentTarget; busy(b, true, '');
      try { const id = await ensure(); sessionDetail(id, drawToday); } catch (x) { err(x); } finally { busy(b, false); }
    };
    $$('[data-gopen]', card).forEach(b => b.onclick = open);
    const who = $('[data-gwho]', card); if (who) who.onclick = () => gcalDetail(ev.key, drawToday);
  }

  function drawSide(d) {
    const side = $('#todaySide'); if (!side) return;
    const ico = { absence: '🚩', medical: '🩺', birthday: '🎂', contact: '📵' };
    // липсващите телефони — един ред, не по ред за всяко дете
    const all = d.alerts || [];
    const noPhone = all.filter(a => a.kind === 'contact');
    const alerts = all.filter(a => a.kind !== 'contact');
    // следващите дни: тренировки + събития от Google, по ред
    (d.upcomingCal || []).forEach(ev => _gcalById[ev.key] = ev);
    const up = [...(d.upcoming || []).map(s => ({ k: s.sessionDate + (s.startTime || ''), s })),
      ...(d.upcomingCal || []).map(g => ({ k: g.date + (g.startTime || ''), g }))].sort((a, b) => a.k.localeCompare(b.k)).slice(0, 10);
    side.innerHTML = `
      ${alerts.length || noPhone.length ? `<section class="card card-pad rise side-card">
        <div class="card-section-title"><span class="ico">${I.bell}</span>Внимание</div>
        <div class="alerts">${alerts.slice(0, 8).map(a => `
          <a class="alrt alrt-${a.level}" href="#/app/child/${a.childId}"><span class="alrt-i">${ico[a.kind] || '•'}</span>
            <span><b>${esc(a.childName)}</b><small>${esc(a.text)}</small></span></a>`).join('')}
          ${noPhone.length ? `<details class="alrt-group"><summary><span class="alrt-i">📵</span><span><b>${noPhone.length} ${noPhone.length === 1 ? 'плувец' : 'плувци'} без телефон</b><small>за спешна връзка</small></span></summary>
            <div class="alrt-names">${noPhone.map(a => `<a href="#/app/child/${a.childId}">${esc(a.childName)}</a>`).join('')}</div></details>` : ''}
        </div>
      </section>` : ''}
      <section class="card card-pad rise side-card">
        <div class="card-section-title"><span class="ico">${I.cal}</span>Следващите дни</div>
        ${up.length ? `<div class="up-list">${up.map(x => x.s ? `
          <button class="up-item" data-sid="${x.s.id}" style="--gc:${x.s.groupColor || '#1F73E0'}">
            <span class="up-d">${esc(fmtShort(x.s.sessionDate))}</span><span class="up-t">${fmtTime(x.s.startTime)}</span>
            <span class="up-n">${esc(x.s.groupName || x.s.title || 'Тренировка')}${x.s.status === 'cancelled' ? ' · ❌' : ''}</span>
            <span class="up-c">${x.s.participantCount || 0}</span></button>` : `
          <button class="up-item up-g" data-gk="${esc(x.g.key)}" style="--gc:#2F6FED">
            <span class="up-d">${esc(fmtShort(x.g.date))}</span><span class="up-t">${fmtTime(x.g.startTime)}</span>
            <span class="up-n">${esc((x.g.unknownNames || []).length ? x.g.title : (x.g.childName || x.g.title))}</span>
            <span class="g-badge">G</span></button>`).join('')}</div>`
        : `<p class="subtle">Нищо за следващите 7 дни.</p>`}
        <a class="btn btn-ghost btn-sm" href="#/app/calendar" style="margin-top:12px">Целият график ${I.arrowR}</a>
      </section>`;
    $$('.up-item[data-sid]', side).forEach(b => b.onclick = () => sessionDetail(b.dataset.sid, drawToday));
    $$('.up-item[data-gk]', side).forEach(b => b.onclick = () => openGcal(b.dataset.gk, drawToday));
  }

  /* ============================================================
     ГРАФИК
     ============================================================ */
  const now = new Date();
  const calState = { y: now.getFullYear(), m: now.getMonth(), view: null };
  const prefView = () => { try { return localStorage.getItem('sws.calView'); } catch { return null; } };

  route(/^\/app\/calendar$/, async () => {
    if (!guard()) return;
    if (!calState.view) calState.view = prefView() || 'month';
    shell('calendar', `
      <div class="page-head calx-mhead">
        <div><h1 class="pagettl">График</h1></div>
        <div class="quick">
          <button class="btn btn-soft" id="gcalBtn">${I.link}<span>Google Calendar</span></button>
          <button class="btn-icon btn-ghost" id="calRefresh" aria-label="Обнови от Google Calendar" title="Обнови">${I.refresh}</button>
          <button class="btn btn-primary hide-m" id="newSession">${I.plus}<span>Нова тренировка</span></button>
        </div>
      </div>
      <div class="calx">
        <div class="calx-scrim" id="calScrim" hidden></div>
        <aside class="calx-side" id="calSide" aria-label="Навигация на графика">
          <button class="btn btn-primary calx-new" id="newSession2">${I.plus}<span>Нова тренировка</span></button>
          <div class="mini" id="miniCal"></div>
          <div class="calx-sec"><b>Покажи</b><div id="calFilters"></div></div>
          <div class="calx-sec calx-g">
            <button class="calx-link" id="gcalBtn2">${I.link}<span>Google Calendar</span></button>
            <button class="calx-link" id="calRefresh2">${I.refresh}<span>Обнови от Google</span></button>
            <button class="calx-link calx-only-m" id="calView2">${I.list}<span>Списък / месец</span></button>
          </div>
          <div id="calBanner"></div>
        </aside>
        <section class="calx-main card">
          <div class="cal-head">
            <button class="btn-icon btn-ghost calx-burger" id="calMenu" aria-label="Меню на графика">${I.menu}</button>
            <button class="btn btn-soft btn-sm" id="todayBtn">Днес</button>
            <div class="cal-nav"><button class="btn-icon btn-ghost" id="prevM" aria-label="Предишен месец">${I.chevL}</button><button class="btn-icon btn-ghost" id="nextM" aria-label="Следващ месец">${I.chevR}</button></div>
            <button type="button" class="cal-title-btn" id="calTitleBtn" aria-label="Избери месец"><span class="cal-title" id="calTitle"></span><svg class="caret" viewBox="0 0 24 24" width="18" height="18"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg></button>
            <button type="button" class="cal-todayico" id="todayIco" aria-label="Днес" title="Днес"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 9.5h17"/></svg><b>${new Date().getDate()}</b></button>
            <div class="mz" id="mz" role="group" aria-label="Мащаб">
              <button type="button" data-z="out" aria-label="Намали" title="Намали (Ctrl −)">−</button>
              <button type="button" data-z="fit" class="mz-v" title="Целият месец на екрана"></button>
              <button type="button" data-z="in" aria-label="Увеличи" title="Увеличи (Ctrl +)">+</button>
            </div>
            <div class="seg-mini" role="group" aria-label="Изглед">
              <button data-v="month" aria-label="Месец" title="Месец">${I.grid}</button>
              <button data-v="list" aria-label="Списък" title="Списък">${I.list}</button>
            </div>
          </div>
          <div class="mini-drop" id="miniDrop" hidden></div>
          <div id="calBody">${loading()}</div>
        </section>
      </div>`);
    $('#newSession2').onclick = () => { calDrawer(false); sessionForm(); };
    // Телефон/таблет: лявата колона е чекмедже (☰), като в Google Calendar
    const calDrawer = (open) => { document.body.classList.toggle('calx-open', open); $('#calScrim').hidden = !open; if (open && _lastCal) paintCalendar(_lastCal); };
    $('#calMenu').onclick = () => calDrawer(!document.body.classList.contains('calx-open'));
    $('#calScrim').onclick = () => calDrawer(false);
    S.onLeave && S.onLeave(() => document.body.classList.remove('calx-open'));
    $('#gcalBtn2').onclick = () => calendarSync();
    $('#calRefresh2').onclick = () => $('#calRefresh').click();
    $('#todayIco').onclick = () => $('#todayBtn').click();
    $('#calTitleBtn').onclick = () => { if (innerWidth >= 1000) return; const d = $('#miniDrop'); d.hidden = !d.hidden; $('#calTitleBtn').classList.toggle('open', !d.hidden); if (!d.hidden && _lastCal) paintCalendar(_lastCal); };
    $('#calView2').onclick = () => { document.body.classList.remove('calx-open'); $('#calScrim').hidden = true; $(`.seg-mini button[data-v="${calState.view === 'month' ? 'list' : 'month'}"]`).click(); };
    $('#newSession').onclick = () => sessionForm();
    $('#gcalBtn').onclick = () => calendarSync();
    $('#calRefresh').onclick = async (e) => {
      const b = e.currentTarget; b.classList.add('spinning');
      try { await API.read('calendarEvents', { year: calState.y, month: calState.m + 1, fresh: true }); } catch {}
      b.classList.remove('spinning'); API.clearCache(); drawCalendar();
    };
    $('#prevM').onclick = () => { calState.m--; if (calState.m<0){calState.m=11;calState.y--;} drawCalendar(); };
    $('#nextM').onclick = () => { calState.m++; if (calState.m>11){calState.m=0;calState.y++;} drawCalendar(); };
    $('#todayBtn').onclick = () => { calState.y=now.getFullYear(); calState.m=now.getMonth(); drawCalendar(); };
    const paintSeg = () => { $$('.seg-mini button').forEach(b => b.classList.toggle('on', b.dataset.v === calState.view)); $('#mz').hidden = calState.view !== 'month'; };
    $$('#mz button').forEach(b => b.onclick = () => MZ.step(b.dataset.z));
    $$('.seg-mini button').forEach(b => b.onclick = () => { calState.view = b.dataset.v; try { localStorage.setItem('sws.calView', b.dataset.v); } catch {} paintSeg(); drawCalendar(); });
    paintSeg();
    drawCalendar();
  });

  let calRenderToken = 0;

  async function drawCalendar() {
    const myToken = ++calRenderToken;
    const t = $('#calTitle'); if (!t) return;
    t.textContent = innerWidth < 700 && calState.y === new Date().getFullYear() ? MONTHS[calState.m] : `${MONTHS[calState.m]} ${calState.y}`;
    const body = $('#calBody');
    const y = calState.y, m = calState.m + 1;
    if (API.peek('month', { year: y, month: m }) === undefined) body.innerHTML = loading();
    let boot = API.peekBoot();
    if (!boot) { try { boot = await API.getBoot(); } catch {} }
    try {
      await API.live('month', { year: y, month: m }, (d) => {
        if (myToken !== calRenderToken) return;
        paintCalendar({ list: d.sessions || [], calEvents: d.calendar || [], boot: API.peekBoot() || boot });
      });
    } catch (e) { if (myToken === calRenderToken) err(e); }
    // съседните месеци — за моментално прелистване
    if (myToken === calRenderToken) setTimeout(() => {
      [[y, m - 1], [y, m + 1]].map(([yy, mm]) => mm < 1 ? [yy - 1, 12] : mm > 12 ? [yy + 1, 1] : [yy, mm])
        .forEach(([yy, mm]) => { if (API.peek('month', { year: yy, month: mm }) === undefined) API.month(yy, mm).catch(() => {}); });
    }, 600);
  }

  // Филтри като „Моите календари" в Google: групи/треньори, Google, почивки
  const calHide = (() => { try { return new Set(JSON.parse(localStorage.getItem('sws.calHide') || '[]')); } catch { return new Set(); } })();
  const saveHide = () => { try { localStorage.setItem('sws.calHide', JSON.stringify([...calHide])); } catch {} };
  let _lastCal = null;

  function paintCalendar({ list, calEvents, boot }) {
    const body = $('#calBody'); if (!body) return;
    _lastCal = { list, calEvents, boot };
    const cc = coachColors(boot);
    const groups = (boot?.groups || []);
    const allCal = calEvents.filter(ev => !ev.sessionId);
    const sKey = (s) => groups.length ? 'g:' + (s.groupId || '') : 'c:' + s.coachId;
    const eKey = (ev) => ev.kind === 'off' ? 'off' : 'gcal';
    const filters = [
      ...(groups.length
        ? [...groups.map(g => ({ k: 'g:' + g.id, label: g.name, color: g.color })), ...(list.some(x => !x.groupId) ? [{ k: 'g:', label: 'Индивидуални', color: '#9DB2D6' }] : [])]
        : Object.entries(cc).map(([id, c]) => ({ k: 'c:' + id, label: c.name, color: c.color }))),
      ...(allCal.some(e => e.kind !== 'off') ? [{ k: 'gcal', label: 'Google Calendar', color: '#818CF8', dashed: true }] : []),
      ...(allCal.some(e => e.kind === 'off') ? [{ k: 'off', label: '🌴 Почивки', color: '#F5A623' }] : []),
    ];
    list = list.filter(x => !calHide.has(sKey(x)));
    calEvents = calEvents.filter(ev => !calHide.has(eKey(ev)));
    const filterHtml = filters.length ? `<div class="cfl">${filters.map(f => `<label class="cfl-i ${calHide.has(f.k) ? 'off' : ''}" style="--fc:${f.color}">
      <input type="checkbox" data-fk="${esc(f.k)}" ${calHide.has(f.k) ? '' : 'checked'}><i class="${f.dashed ? 'dashed' : ''}"></i><span>${esc(f.label)}</span></label>`).join('')}</div>` : '';
    const byDay = {};
    list.forEach(s => { const d = parseD(s.sessionDate).getDate(); (byDay[d] ||= []).push(s); });
    Object.values(byDay).forEach(a => a.sort((x, y) => (x.startTime || '').localeCompare(y.startTime || '')));
    const byDayCal = {};
    calEvents = calEvents.filter(ev => !ev.sessionId); // внесените вече са тренировки
    calEvents.forEach(ev => {
      _gcalById[ev.key || ev.id] = ev;
      // почивка за няколко дни → на всеки ден от месеца
      let d0 = parseD(ev.date), d1 = ev.endDate ? parseD(ev.endDate) : d0;
      for (let x = d0, n = 0; x <= d1 && n < 62; x = addDays(x, 1), n++) {
        if (x.getFullYear() === calState.y && x.getMonth() === calState.m) (byDayCal[x.getDate()] ||= []).push(ev);
      }
    });
    const known = calEvents.filter(ev => ev.childId && !ev.allDay && !(ev.unknownNames || []).length);
    const banner = known.length ? `<div class="gcal-banner"><span>${I.cal}</span><p>В Google Calendar разпознах <b>${known.length}</b> ${known.length === 1 ? 'тренировка' : 'тренировки'} с плувци от отбора (${esc([...new Set(known.flatMap(k => (k.children || []).map(c => c.firstName)))].slice(0, 4).join(', '))}${new Set(known.flatMap(k => (k.children || []).map(c => c.firstName))).size > 4 ? '…' : ''}).</p><button class="btn btn-primary btn-sm" id="gcalImportAll">${I.plus} Добави ги в графика</button></div>` : '';

    // На компютър филтрите и банерът са в лявата колона (като в Google Calendar), на телефон — над графика
    const side = $('.calx-side');
    const wide = !!side;   // филтрите винаги са в лявата колона; на телефон тя е чекмеджето ☰
    let legendHtml = filterHtml + banner;
    if (wide) { $('#calFilters').innerHTML = filterHtml || '<p class="subtle small">Още няма тренировки.</p>'; $('#calBanner').innerHTML = banner; legendHtml = ''; }
    else { $('#calFilters') && ($('#calFilters').innerHTML = ''); $('#calBanner') && ($('#calBanner').innerHTML = ''); }
    paintMini(byDay, byDayCal, cc);

    const today = new Date();
    const isThisMonth = today.getFullYear() === calState.y && today.getMonth() === calState.m;

    if (calState.view === 'list') {
      const days = Object.keys({ ...byDay, ...byDayCal }).map(Number).sort((a, b) => a - b);
      if (!days.length) { body.innerHTML = legendHtml + emptyState(I.cal, 'Няма тренировки този месец', 'Добави първата — може и повтаряща се.'); return; }
      body.innerHTML = legendHtml + `<div class="agenda">${days.map(d => {
        const date = new Date(calState.y, calState.m, d);
        const isToday = isThisMonth && today.getDate() === d;
        return `<div class="ag-day ${isToday ? 'today' : ''}" ${isToday ? 'id="agToday"' : ''}>
          <div class="ag-date"><b>${d}</b><span>${DOW[dowIdx(date)]}</span></div>
          <div class="ag-items">
            ${(byDay[d] || []).map(s => `<button class="slot ${s.status === 'cancelled' ? 'is-cancelled' : ''}" data-sid="${s.id}" style="border-left:5px solid ${sessColor(s, cc)}">
              <div class="slot-time">${fmtTime(s.startTime)}</div>
              <div class="slot-main"><div class="t">${esc(s.groupName || s.title || 'Тренировка')}${s.status === 'cancelled' ? ' · отменена' : ''}</div>
                <div class="s">${esc(firstName(s.coachName))}${s.location ? ' · ' + esc(s.location) : ''} · ${s.markedCount ? `${s.presentCount}/${s.participantCount} дошли` : peopleCount(s.participantCount)}</div></div>
              ${I.chevR}</button>`).join('')}
            ${(byDayCal[d] || []).map(ev => gcalSlot(ev)).join('')}
          </div></div>`;
      }).join('')}</div>`;
      $$('.slot[data-sid]', body).forEach(el => el.onclick = () => sessionDetail(el.dataset.sid, refreshCal));
      $$('.slot[data-gcal]', body).forEach(el => el.onclick = () => openGcal(el.dataset.gcal));
      bindBanner(known);
      const t = $('#agToday'); if (t && !body.dataset.scrolled) { body.dataset.scrolled = '1'; t.scrollIntoView({ block: 'center' }); }
      return;
    }

    const first = new Date(calState.y, calState.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(calState.y, calState.m + 1, 0).getDate();
    const weeks = Math.ceil((offset + days) / 7);
    // „17:00" → в тясна колона „17" (минутите :00 се скриват)
    const tHtml = (t) => { const [h, m] = String(t).split(':'); return `<b>${h}<em class="${m === '00' ? 'z' : ''}">:${m}</em></b>`; };

    /* Като в Google Calendar: всяка седмица има „ленти" (редове). Многодневните събития са една лента
       през дните, после целодневните, после тези с час. Колко ленти се виждат зависи от мащаба → „+N". */
    const items = [];
    list.forEach(x => {
      const d = parseD(x.sessionDate).getDate();
      items.push({ a: d, b: d, timed: true, t: x.startTime || '', cls: x.status === 'cancelled' ? 'is-cancelled' : '',
        attrs: `data-sid="${x.id}"`, ec: sessColor(x, cc), name: x.groupName || x.title || 'Тренировка',
        tip: `${fmtTime(x.startTime)} · ${x.groupName || x.title || ''} · ${x.coachName} · ${peopleCount(x.participantCount)}` });
    });
    const mStart = new Date(calState.y, calState.m, 1), mEnd = new Date(calState.y, calState.m, days);
    calEvents.forEach(ev => {
      let d0 = parseD(ev.date), d1 = ev.endDate ? parseD(ev.endDate) : d0;
      if (d1 < mStart || d0 > mEnd) return;
      if (d0 < mStart) d0 = mStart; if (d1 > mEnd) d1 = mEnd;
      const off = ev.kind === 'off', timed = !ev.allDay && !off;
      items.push({ a: d0.getDate(), b: d1.getDate(), timed, t: timed ? (ev.startTime || '') : '',
        cls: `cal-gcal ${ev.childId && !(ev.unknownNames || []).length ? 'is-known' : ''} ${off ? 'is-off' : ''}`, attrs: `data-gcal="${esc(ev.key || ev.id)}"`,
        name: off ? '🌴 ' + firstName(ev.coachName) + (ev.title && !/почив/i.test(ev.title) ? ' · ' + ev.title : '') : ((ev.unknownNames || []).length ? ev.title : ev.childName) || ev.title,
        tip: `${ev.title} · ${ev.coachName || ''}${off ? '' : ' (Google Calendar)'}${ev.childName ? ' → ' + ev.childName : ''}` });
    });
    // седмиците: сегменти, подредени като в Google
    const segs = Array.from({ length: weeks }, () => []);
    items.forEach(it => {
      for (let ci = offset + it.a - 1; ci <= offset + it.b - 1;) {
        const w = Math.floor(ci / 7), c = ci % 7, cEnd = Math.min(6, c + (offset + it.b - 1 - ci));
        segs[w].push({ it, c, n: cEnd - c + 1, cont: ci > offset + it.a - 1, more: cEnd < 6 && (offset + it.b - 1) > w * 7 + cEnd });
        ci = w * 7 + cEnd + 1;
      }
    });
    const nDays = new Date(calState.y, calState.m, 0).getDate();      // дни в предишния месец
    let weeksHtml = '';
    segs.forEach((list2, w) => {
      list2.sort((x, y) => (y.n - x.n) || ((x.it.timed ? 1 : 0) - (y.it.timed ? 1 : 0)) || x.it.t.localeCompare(y.it.t) || (x.c - y.c));
      const lanes = [];
      list2.forEach(sg => {
        let l = 0;
        for (;; l++) { const row = lanes[l] || (lanes[l] = Array(7).fill(false)); let ok = true; for (let k = sg.c; k < sg.c + sg.n; k++) if (row[k]) { ok = false; break; } if (ok) break; }
        for (let k = sg.c; k < sg.c + sg.n; k++) lanes[l][k] = true;
        sg.l = l;
      });
      let bg = '';
      for (let c = 0; c < 7; c++) {
        const ci = w * 7 + c, d = ci - offset + 1, inM = d >= 1 && d <= days;
        const num = inM ? d : d < 1 ? nDays + d : d - days;
        const isToday = inM && isThisMonth && today.getDate() === d;
        bg += `<div class="cal-cell ${inM ? '' : 'out'} ${isToday ? 'today' : ''} ${c >= 5 ? 'weekend' : ''}" ${inM ? `data-day="${d}"` : `data-mo="${d < 1 ? -1 : 1}"`}><div class="cal-daynum">${num}</div></div>`;
      }
      const evs = list2.map(sg => {
        const it = sg.it, span = !it.timed || sg.n > 1;
        return `<div class="cal-ev ${it.cls} ${span ? 'bar' : 'dot'} ${sg.cont ? 'cont' : ''} ${sg.more ? 'more-r' : ''}" ${it.attrs} title="${esc(it.tip)}"
          data-l="${sg.l}" data-c="${sg.c}" data-n="${sg.n}" style="grid-column:${sg.c + 1} / span ${sg.n};grid-row:${sg.l + 1}${it.ec ? ';--ec:' + it.ec : ''}">${!span && it.t ? tHtml(fmtTime(it.t)) : ''}<span>${esc(it.name)}</span></div>`;
      }).join('');
      weeksHtml += `<div class="wk" data-w="${w}" data-lanes="${lanes.length}"><div class="wk-bg">${bg}</div><div class="wk-ev">${evs}</div></div>`;
    });
    const key = calState.y + '-' + calState.m;
    const old = $('#calScroll');
    const keepTop = old && old.dataset.k === key ? old.scrollTop : null;
    body.innerHTML = `${legendHtml}<div class="cal-scroll" id="calScroll" data-k="${key}"><div class="cal-grid mzg" data-w="${weeks}">
      <div class="mz-dow">${DOW.map((d, i) => `<div class="cal-dow ${i >= 5 ? 'weekend' : ''}">${d}</div>`).join('')}</div>${weeksHtml}</div></div>`;
    const sc = $('#calScroll');
    MZ.attach(sc, weeks, (dir) => (dir > 0 ? $('#nextM') : $('#prevM')).click());
    if (keepTop !== null) sc.scrollTop = keepTop;
    else if (isThisMonth && sc.scrollHeight > sc.clientHeight + 4) { const tc = $('.cal-cell.today', sc); if (tc) sc.scrollTop = tc.closest('.wk').offsetTop - sc.querySelector('.mz-dow').offsetHeight; }
    const openDay = (d) => dayModal(d, byDay[d] || [], byDayCal[d] || [], cc);
    $$('.cal-cell[data-day]', body).forEach(c => c.onclick = () => { if (MZ.busy()) return; openDay(+c.dataset.day); });
    $$('.cal-cell[data-mo]', body).forEach(c => c.onclick = () => { if (MZ.busy()) return; (+c.dataset.mo < 0 ? $('#prevM') : $('#nextM')).click(); });
    sc.addEventListener('click', (e) => {
      const ev = e.target.closest('.cal-ev'), mo = e.target.closest('.cal-more');
      if (MZ.busy()) return;
      if (mo) { e.stopPropagation(); openDay(+mo.dataset.day); return; }
      if (!ev) return;
      e.stopPropagation();
      // телефон: чипът е малък → отваряме целия ден (кой идва, по часове), както в Google Calendar
      if (ev.closest('.mzg.mz-narrow')) { const cell = ev.closest('.wk').firstElementChild.children[+ev.dataset.c]; if (cell && cell.dataset.day) return openDay(+cell.dataset.day); }
      if (ev.dataset.sid) sessionDetail(ev.dataset.sid, refreshCal); else if (ev.dataset.gcal) openGcal(ev.dataset.gcal);
    });
    bindBanner(known);
  }

  /* ---------- Мащаб на месеца: щипка, Ctrl + колелце, − / + (като графика на BeautyHause) ----------
     Мащабът е височината на един ред (седмица). Щипката/колелцето идват много пъти на кадър —
     прилагаме само последната стойност веднъж на кадър (rAF), а точката под пръстите остава на място. */
  const MZ = (() => {
    const KEY = 'sws.cal.rh2', MIN = 44, MAX = 340;
    const phone = () => innerWidth < 700;
    let rh = +(localStorage.getItem(KEY) || 0) || 0;
    let auto = !rh;                                   // без ръчен мащаб → целият месец на екрана (като Google)
    let sc = null, grid = null, weeks = 6, req = null, raf = 0, tween = 0, pinch = null, quietUntil = 0, lastFit = -1, lastTwo = null, lastWrap = null;
    const clamp = (v) => Math.max(MIN, Math.min(MAX, v));
    // „Целият месец на екрана" е по подразбиране само на компютър; на телефона редовете са по-високи, за да се четат имената
    const fitNow = () => auto;
    const headH = () => (grid && grid.firstElementChild ? grid.firstElementChild.offsetHeight : 30);
    const fitRh = () => sc ? clamp(Math.floor((sc.clientHeight - headH() - 2) / weeks)) : 90;
    const defRh = () => phone() ? 96 : 124;
    function apply(v) {
      rh = clamp(v);
      if (!grid) return;
      const cw = grid.clientWidth / 7;
      const two = cw < 74 && rh >= 150;                           // тясна колона и увеличено → час отгоре, име отдолу
      const wrap = rh >= (two ? 220 : 170);                       // още по-увеличено → името на 2 реда
      const narrow = cw < 74 && !two;                             // телефон: името на 2 реда, за да се чете
      // телефон: по-дребен шрифт, за да се събират имената (по-едър, ако се увеличи с щипка)
      const fs = cw < 74 ? (narrow ? Math.max(8.5, Math.min(11, 7.4 + rh * 0.017)) : Math.max(10, Math.min(12, 8.8 + rh * 0.018))) : Math.max(10.5, Math.min(13, 9.6 + rh * 0.028));
      const lines = narrow ? 2 : (two ? 1 : 0) + (wrap ? 2 : 1);
      const ph = lines === 1 ? Math.round(fs * 1.45 + 5) : Math.round(fs * (1.1 * lines + .1) + (narrow ? 3 : 5));
      if (wrap !== lastWrap) { grid.classList.toggle('mz-wrap', wrap); lastWrap = wrap; }
      grid.style.setProperty('--rh', rh.toFixed(1) + 'px');
      grid.style.setProperty('--fs', fs.toFixed(2) + 'px');
      grid.style.setProperty('--ph', ph + 'px');
      if (two !== lastTwo) { grid.classList.toggle('mz-two', two); lastTwo = two; }
      grid.classList.toggle('mz-narrow', cw < 74 && !two);
      const dn = Math.min(cw < 74 ? 22 : 26, Math.max(18, rh * 0.2));
      grid.style.setProperty('--dn', dn.toFixed(1) + 'px');
      const avail = rh - dn - 10;
      const fit = Math.max(0, Math.floor(avail / (ph + 2)));
      const fitM = Math.max(0, Math.floor((avail - 15) / (ph + 2)));   // колко събития + ред „+N" (той е нисък)
      if (fit * 100 + fitM !== lastFit) { lastFit = fit * 100 + fitM; paintFit(fit, fitM); }
      const v2 = $('#mz .mz-v'); if (v2) { v2.textContent = fitNow() ? 'Месец' : Math.round(rh / defRh() * 100) + '%'; v2.title = auto ? 'Целият месец е на екрана' : 'Целият месец на екрана'; }
    }
    // Колко ленти се виждат в седмицата; скритите събития → „+N" под деня (като в Google)
    function paintFit(fit, fitM = fit - 1) {
      grid.querySelectorAll('.wk').forEach(wk => {
        const L = +wk.dataset.lanes, layer = wk.lastElementChild, cells = wk.firstElementChild.children;
        layer.querySelectorAll('.cal-more').forEach(x => x.remove());
        const vis = L <= fit ? L : Math.max(0, fitM);
        layer.style.gridTemplateRows = L <= fit ? '' : `repeat(${vis}, var(--ph)) 15px`;
        const hid = [0, 0, 0, 0, 0, 0, 0];
        for (const ev of layer.children) {
          const h = +ev.dataset.l >= vis; ev.hidden = h;
          if (h) for (let k = +ev.dataset.c, e = k + +ev.dataset.n; k < e; k++) hid[k]++;
        }
        let html = '';
        hid.forEach((n, c) => { if (n && cells[c].dataset.day) html += `<button type="button" class="cal-more" data-day="${cells[c].dataset.day}" style="grid-column:${c + 1};grid-row:${vis + 1}">+${n}</button>`; });
        if (html) layer.insertAdjacentHTML('beforeend', html);
      });
    }
    function at(v, fx, fy) { req = { v, fx, fy }; if (!raf) raf = requestAnimationFrame(flush); }
    function flush() { cancelAnimationFrame(raf); raf = 0; const q = req; req = null; if (q) atNow(q.v, q.fx, q.fy); }
    function atNow(v, fx, fy) {
      if (!sc) return apply(v);
      const r = sc.getBoundingClientRect(), hh = headH();
      const py = (fy == null ? r.top + hh : fy) - r.top - hh;
      const rows = (sc.scrollTop + py) / rh;
      apply(v);
      sc.scrollTop = rows * rh - py;
    }
    const save = () => { auto = false; try { localStorage.setItem(KEY, rh.toFixed(1)); } catch {} };
    function tweenTo(target) {
      cancelAnimationFrame(tween); req = null; cancelAnimationFrame(raf); raf = 0;
      const from = rh, t0 = performance.now(), dur = 240, ease = (t) => 1 - Math.pow(1 - t, 3);
      const r = sc ? sc.getBoundingClientRect() : null;
      const fy = r ? r.top + Math.min(r.height, sc.scrollHeight) / 2 : null;
      const keepAuto = target === 'fit';
      if (keepAuto) target = fitRh();
      const stepF = (t) => { const k = Math.min(1, (t - t0) / dur); atNow(from + (clamp(target) - from) * ease(k), 0, fy); if (k < 1) tween = requestAnimationFrame(stepF); else if (keepAuto) { auto = true; try { localStorage.removeItem(KEY); } catch {} } else save(); };
      tween = requestAnimationFrame(stepF);
    }
    function step(kind) {
      if (kind === 'in') tweenTo(rh * 1.25);
      else if (kind === 'out') tweenTo(rh / 1.25);
      else tweenTo(fitNow() ? defRh() : 'fit');
    }
    // Графикът заема видимия екран между горната лента и долното меню (като в Google Calendar)
    function fitHeight() {
      const top = document.querySelector('.topbar');
      const nav = document.querySelector('.bottom-nav');
      const t = top && getComputedStyle(top).position.match(/sticky|fixed/) ? top.offsetHeight : 0;
      const b = nav && getComputedStyle(nav).display !== 'none' && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
      if (innerWidth >= 1000) { sc.style.maxHeight = sc.style.height = ''; return; }   // компютър: височината идва от оформлението
      const y0 = sc.getBoundingClientRect().top + (scrollY || 0);
      const bottom = b ? nav.getBoundingClientRect().top + (scrollY || 0) : innerHeight;   // долното меню „плава" над ръба
      sc.style.maxHeight = sc.style.height = Math.max(320, bottom - Math.max(y0, t) - 14) + 'px';
    }
    const d2 = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY) || 1;
    let swipeDir = 0;
    function attach(el, w, onSwipe) {
      sc = el; grid = el.firstElementChild; weeks = w; lastFit = -1; lastTwo = null; lastWrap = null;
      if (swipeDir) { grid.classList.add(swipeDir > 0 ? 'slide-l' : 'slide-r'); swipeDir = 0; }
      // плъзгане наляво/надясно = следващ/предишен месец (като в Google Calendar)
      let sw = null;
      el.addEventListener('touchstart', (e) => { sw = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null; }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (!sw || pinch || !onSwipe) { sw = null; return; }
        const p0 = e.changedTouches[0], dx = p0.clientX - sw.x, dy = p0.clientY - sw.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - sw.t < 700) { quietUntil = Date.now() + 350; swipeDir = dx < 0 ? 1 : -1; onSwipe(swipeDir); }
        sw = null;
      });
      fitHeight();
      if (!rh) rh = defRh();
      apply(fitNow() ? fitRh() : rh);
      // след като страницата се подреди — точната височина до долното меню
      requestAnimationFrame(() => { if (sc !== el) return; const h0 = el.style.height; fitHeight(); if (el.style.height !== h0) { lastFit = -1; apply(fitNow() ? fitRh() : rh); } });
      // Safari: собствената щипка на браузъра се спира само така
      ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => el.addEventListener(n, (e) => e.preventDefault(), { passive: false }));
      el.addEventListener('touchstart', (e) => {
        if (e.touches.length >= 2) { cancelAnimationFrame(tween); pinch = { d0: d2(e.touches), v0: rh }; quietUntil = Date.now() + 600; }
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (!pinch || e.touches.length < 2) return;
        e.preventDefault();
        const [a, b] = e.touches;
        at(pinch.v0 * d2(e.touches) / pinch.d0, 0, (a.clientY + b.clientY) / 2);
        quietUntil = Date.now() + 600;
      }, { passive: false });
      const end = (e) => { if (pinch && e.touches.length < 2) { flush(); save(); pinch = null; quietUntil = Date.now() + 400; } };
      el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
      el.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;                                    // тъчпад-щипка на лаптоп = Ctrl + колелце
        e.preventDefault();
        let d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
        d = Math.max(-60, Math.min(60, d));
        at((req ? req.v : rh) * Math.exp(-d * 0.0045), 0, e.clientY);
        clearTimeout(el._wz); el._wz = setTimeout(save, 200);
      }, { passive: false });
      if (window.ResizeObserver && !el._ro) { el._ro = new ResizeObserver(() => { lastTwo = null; lastWrap = null; lastFit = -1; if (sc === el) fitHeight(); apply(fitNow() ? fitRh() : rh); }); el._ro.observe(el); }
    }
    // Ctrl + / Ctrl − / Ctrl 0 върху графика вместо мащаба на браузъра
    addEventListener('keydown', (e) => {
      if (!sc || !sc.isConnected || !(e.ctrlKey || e.metaKey)) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); step('in'); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); step('out'); }
      else if (e.key === '0') { e.preventDefault(); tweenTo(defRh()); }
    });
    return { attach, step, busy: () => Date.now() < quietUntil || !!pinch };
  })();
  // Малкият календар вляво: месецът, днес, дни с тренировки; клик = денят
  function paintMini(byDay, byDayCal, cc) {
    ['#miniCal', '#miniDrop'].forEach(sel => { const host = $(sel); if (host && !(sel === '#miniDrop' && host.hidden)) paintMiniIn(host, byDay, byDayCal, cc); });
  }
  function paintMiniIn(host, byDay, byDayCal, cc) {
    const first = new Date(calState.y, calState.m, 1), off = (first.getDay() + 6) % 7;
    const n = new Date(calState.y, calState.m + 1, 0).getDate(), t = new Date();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(calState.y, calState.m, i - off + 1), inM = d.getMonth() === calState.m, dd = d.getDate();
      const has = inM && ((byDay[dd] || []).length || (byDayCal[dd] || []).length);
      const isT = d.toDateString() === t.toDateString();
      if (i >= 35 && i - off >= n) break;
      cells += `<button type="button" class="mini-d ${inM ? '' : 'out'} ${isT ? 'today' : ''} ${has ? 'has' : ''}" data-md="${inM ? dd : ''}" data-mo="${inM ? '' : (i < off ? -1 : 1)}">${dd}</button>`;
    }
    host.innerHTML = `<div class="mini-h"><b>${MONTHS[calState.m]} ${calState.y}</b>
        <button type="button" class="btn-icon btn-ghost" data-mm="-1" aria-label="Предишен месец">${I.chevL}</button><button type="button" class="btn-icon btn-ghost" data-mm="1" aria-label="Следващ месец">${I.chevR}</button></div>
      <div class="mini-g">${DOW.map(x => `<span>${x[0]}</span>`).join('')}${cells}</div>`;
    $$('[data-mm]', host).forEach(b => b.onclick = () => (+b.dataset.mm < 0 ? $('#prevM') : $('#nextM')).click());
    $$('.mini-d', host).forEach(b => b.onclick = () => {
      if (b.dataset.mo) return (+b.dataset.mo < 0 ? $('#prevM') : $('#nextM')).click();
      const d = +b.dataset.md; const dd = $('#miniDrop'); if (dd) { dd.hidden = true; $('#calTitleBtn')?.classList.remove('open'); } document.body.classList.remove('calx-open'); $('#calScrim') && ($('#calScrim').hidden = true); dayModal(d, byDay[d] || [], byDayCal[d] || [], cc);
    });
  }
  function bindBanner(known) {
    $$('[data-fk]').forEach(cb => cb.onchange = () => {
      cb.checked ? calHide.delete(cb.dataset.fk) : calHide.add(cb.dataset.fk); saveHide();
      if (_lastCal) paintCalendar(_lastCal);
    });
    const b = $('#gcalImportAll'); if (!b) return;
    b.onclick = () => importEvents(known, refreshCal, b);
  }
  const refreshCal = () => { if ($('#calBody')) drawCalendar(); };
  // Ред за събитие от Google Calendar (списък/ден)
  const gcalSlot = (ev) => ev.kind === 'off'
    ? `<button class="slot slot-gcal slot-off" data-gcal="${esc(ev.key || ev.id)}"><div class="slot-time">🌴</div>
        <div class="slot-main"><div class="t">${esc(ev.coachName || 'Треньор')} · ${esc(ev.title)}</div><div class="s">${ev.allDay ? 'цял ден' : fmtTime(ev.startTime) + '–' + fmtTime(ev.endTime)} · от Google Calendar</div></div>${I.chevR}</button>`
    : `<button class="slot slot-gcal" data-gcal="${esc(ev.key || ev.id)}">
        <div class="slot-time">${ev.allDay ? 'ден' : fmtTime(ev.startTime)}</div>
        <div class="slot-main"><div class="t">${ev.childName ? '✓ ' + esc(ev.childName) : esc(ev.title)}</div><div class="s">${esc(firstName(ev.coachName))} · Google Calendar${ev.childName ? ' · ' + esc(ev.title) : ''}</div></div>${I.chevR}</button>`;

  // Внася събития от Google Calendar като тренировки (с плувеца вътре)
  async function importEvents(evs, after, btn) {
    if (btn) busy(btn, true, 'Добавяне…');
    try {
      const r = await API.importCalendarEvents(evs.map(ev => ({ key: ev.key, date: ev.date, startTime: ev.startTime, durationMin: ev.durationMin,
        location: ev.location, title: ev.title, childId: ev.childId || null, childIds: ev.childIds || (ev.childId ? [ev.childId] : []) })));
      toast(r.created ? `Добавени ${r.created} в графика` : 'Вече са в графика', 'ok');
      closeModal(); (after || refreshAll)();
      return r;
    } catch (e) { if (btn) busy(btn, false); err(e); }
  }

  // Събитие от Google Calendar: кой е това дете?
  /* Натискане на събитие от Google: ако знаем кои деца са — отваря се направо като тренировка
     (тихо се записва в графика). Само при непознато име питаме „Кой е?". */
  async function openGcal(key, after) {
    const ev = _gcalById[key]; if (!ev) return;
    after = after || (() => { refreshCal(); if ($('#todaySessions')) drawToday(); });
    const ready = ev.kind !== 'off' && !ev.allDay && (ev.childIds || []).length && !(ev.unknownNames || []).length;
    if (!ready) return gcalDetail(key, after);
    modal({ title: 'Тренировка', body: loading(3, 60), large: true });
    try {
      const r = await API.importCalendarEvents([{ key: ev.key, date: ev.date, startTime: ev.startTime, durationMin: ev.durationMin,
        location: ev.location, title: ev.title, childIds: ev.childIds, childId: ev.childId }]);
      ev.sessionId = r.items[0].sessionId; API.clearCache && API.clearCache();
      sessionDetail(ev.sessionId, after); after();
    } catch (e) { closeModal(); err(e); }
  }
  async function gcalDetail(id, after) {
    const ev = _gcalById[id];
    if (!ev) return;
    if (ev.kind === 'off') {
      const span = ev.endDate && ev.endDate !== ev.date ? `${fmtDate(ev.date)} – ${fmtDate(ev.endDate)}` : fmtDay(ev.date);
      modal({ title: '🌴 ' + (ev.title || 'Почивка'), body: `
        <div class="chips"><span class="chip">${I.user}&nbsp;${esc(ev.coachName || '')}</span><span class="chip">${I.cal}&nbsp;${esc(span)}</span>
        ${ev.allDay ? '' : `<span class="chip">${I.clock}&nbsp;${fmtTime(ev.startTime)}–${fmtTime(ev.endTime)}</span>`}</div>
        <p class="subtle" style="margin-top:12px">От Google Calendar на ${esc(firstName(ev.coachName))}. Показва се, защото в заглавието пише почивка/отпуск/болничен.</p>`,
        footer: `<button class="btn btn-primary" data-close>Добре</button>` });
      return;
    }
    after = after || (() => { refreshCal(); if ($('#todaySessions')) drawToday(); });
    const when = ev.allDay ? 'Цял ден' : `${fmtTime(ev.startTime)}${ev.endTime ? '–' + fmtTime(ev.endTime) : ''}`;
    let kids = [];
    try { kids = (await API.getBoot()).children || []; } catch {}
    const head = `
      <div class="chips">
        <span class="chip">${I.cal}&nbsp;${esc(fmtDay(ev.date))}</span>
        <span class="chip">${I.clock}&nbsp;${esc(when)}</span>
        ${ev.location ? `<span class="chip">${I.pin}&nbsp;${esc(ev.location)}</span>` : ''}
      </div>
      ${ev.description ? `<p class="note">${esc(ev.description)}</p>` : ''}`;
    // Кои деца са в събитието: разпознатите + имената, които още не познаваме.
    // „Лора, Денис" = двама; „Близнаците" може да е двама наведнъж (Давид и Самуил).
    const people = (ev.children || (ev.childId ? [{ id: ev.childId, name: ev.childName }] : []))
      .map(c => kids.find(k => k.id === c.id)).filter(Boolean);
    const unknown = (ev.unknownNames && ev.unknownNames.length ? ev.unknownNames : (!people.length && ev.guessName ? [ev.guessName] : [])).slice();
    let openPick = -1;

    const kidName = (k) => `${k.firstName} ${k.lastName || ''}`.trim();
    const paint = () => {
      const body = $('#modal-host .modal-body'); if (!body) return;
      body.innerHTML = head + `
        <div class="who2">
          <h4>${people.length + unknown.length > 1 ? 'Кои идват?' : 'Кой идва?'}</h4>
          ${people.map(k => `<div class="w2 ok">${S.avatar(k.firstName, k.lastName, 'av-sm')}<b>${esc(kidName(k))}</b>
            <a class="linkbtn" href="#/app/child/${k.id}">картон</a><button class="w2-x" data-rm="${k.id}" aria-label="Не е ${esc(k.firstName)}">${I.x}</button></div>`).join('')}
          ${unknown.map((n, i) => `<div class="w2 q ${openPick === i ? 'open' : ''}">
              <span class="w2-q">?</span><b>„${esc(n)}"</b><small>кой е?</small>
              <button class="btn btn-soft btn-sm" data-pick="${i}">${openPick === i ? 'Затвори' : 'Избери'}</button>
            </div>
            ${openPick === i ? `<div class="w2-pick">
              <p class="subtle small">Избери един или няколко (напр. близнаците — и двамата). После „${esc(n)}" ще се познава само.</p>
              <label class="search" style="max-width:none;margin:8px 0">${I.search}<input class="input" id="w2q" type="search" placeholder="Търси плувец…" autocomplete="off"></label>
              <div class="w2-list" id="w2list"></div>
              <div class="w2-act"><button class="btn btn-ghost btn-sm" id="w2new">${I.plus} Нов картон „${esc(n)}"</button>
                <button class="btn btn-primary btn-sm" id="w2ok" disabled>${I.check} Това са те</button></div>
            </div>` : ''}`).join('')}
          ${!people.length && !unknown.length ? `<p class="subtle small">В заглавието няма име на плувец. Може да го добавиш в графика и без плувец.</p>` : ''}
        </div>
        <p class="subtle small" style="margin-top:14px">Събитието в Google Calendar не се променя.</p>`;
      const foot = $('#modal-host .modal-foot');
      if (foot) foot.innerHTML = `<button class="btn btn-ghost" data-close>Затвори</button>
        <button class="btn btn-primary" id="gImport">${I.check} Продължи${people.length ? ` (${people.length})` : ''}</button>`;
      $$('#modal-host [data-close]').forEach(x => x.onclick = closeModal);
      $('#gImport').onclick = async (e) => {
        if (unknown.length && !await ask('Има непознати имена', `${unknown.map(x => '„' + x + '"').join(', ')} още не са свързани с картон. Да добавя ли тренировката само с ${people.length ? people.map(k => k.firstName).join(', ') : 'никого'}?`, 'Добави')) return;
        const r = await importEvents([{ ...ev, childIds: people.map(k => k.id), childId: people[0]?.id || null }], after, e.currentTarget);
        if (r && r.items && r.items[0]) sessionDetail(r.items[0].sessionId, after);   // веднага към присъствието и сериите
      };
      $$('[data-rm]', body).forEach(x => x.onclick = () => { const i = people.findIndex(k => k.id === x.dataset.rm); if (i >= 0) people.splice(i, 1); paint(); });
      $$('[data-pick]', body).forEach(x => x.onclick = () => { openPick = openPick === +x.dataset.pick ? -1 : +x.dataset.pick; paint(); });
      if (openPick >= 0) bindPick(unknown[openPick]);
    };
    const bindPick = (name) => {
      const sel = new Set();
      const okBtn = $('#w2ok');
      const list = (q = '') => {
        q = q.trim().toLowerCase(); const g = name.toLowerCase();
        const arr = kids.filter(k => !people.some(p => p.id === k.id) && (!q || kidName(k).toLowerCase().includes(q)))
          .sort((a, b) => (b.firstName.toLowerCase() === g) - (a.firstName.toLowerCase() === g));
        $('#w2list').innerHTML = arr.slice(0, 12).map(k => `<label class="w2-i ${sel.has(k.id) ? 'on' : ''}"><input type="checkbox" value="${k.id}" ${sel.has(k.id) ? 'checked' : ''}>
          ${S.avatar(k.firstName, k.lastName, 'av-sm')}<span class="w2-n">${esc(kidName(k))}</span><i></i></label>`).join('') || `<p class="subtle small">Няма такъв картон — направи нов.</p>`;
        $$('#w2list input').forEach(cb => cb.onchange = () => { cb.checked ? sel.add(cb.value) : sel.delete(cb.value); cb.closest('.w2-i').classList.toggle('on', cb.checked);
          okBtn.disabled = !sel.size; okBtn.innerHTML = `${I.check} ${sel.size > 1 ? `Това са те (${sel.size})` : 'Това е'}`; });
      };
      list();
      $('#w2q').oninput = (e) => list(e.target.value);
      okBtn.onclick = async () => {
        busy(okBtn, true, '');
        try {
          const chosen = [...sel].map(id => kids.find(k => k.id === id));
          for (const k of chosen) await API.linkCalendarName(k.id, name);
          toast(`Запомних: „${name}" = ${chosen.map(k => k.firstName).join(' и ')}`, 'ok');
          chosen.forEach(k => { if (!people.some(p => p.id === k.id)) people.push(k); k.calendarName = [k.calendarName, name].filter(Boolean).join(', '); });
          unknown.splice(unknown.indexOf(name), 1); openPick = -1; paint();
          API.clearCache && API.clearCache();
        } catch (e) { busy(okBtn, false); err(e); }
      };
      $('#w2new').onclick = () => {
        S.childForm(null, { firstName: name.split(' ')[0], calendarName: name }, async (nc) => {
          try { kids = (await API.getBoot()).children || kids; } catch {}
          const k = kids.find(x => x.id === nc.id) || { id: nc.id, firstName: name.split(' ')[0], lastName: '' };
          people.push(k); unknown.splice(unknown.indexOf(name), 1); openPick = -1;
          gcalDetailShow();
        });
      };
    };
    const gcalDetailShow = () => {
      modal({ title: ev.title || 'Събитие', body: '', footer: '<span></span>' });
      paint();
    };
    gcalDetailShow();
  }

  // Денят: всяка тренировка е карта — час, кой идва (имената), треньор. Натискане → отваря се.
  function dayModal(day, sessions, calEvents, cc) {
    const date = new Date(calState.y, calState.m, day);
    const chip = (n, cls = '') => `<span class="dk ${cls}"><i>${esc(String(n).trim().charAt(0).toUpperCase())}</i>${esc(n)}</span>`;
    const items = [
      ...sessions.map(x => ({ t: x.startTime || '', s: x })),
      ...calEvents.filter(e => !e.sessionId).map(e => ({ t: e.allDay ? '' : (e.startTime || ''), g: e })),
    ].sort((a, b) => a.t.localeCompare(b.t));
    const card = (it) => {
      if (it.s) {
        const x = it.s, kids = x.kids || [];
        return `<button class="dcard ${x.status === 'cancelled' ? 'is-cancelled' : ''}" data-sid="${x.id}" style="--ec:${sessColor(x, cc)}">
          <div class="dcard-t"><b>${fmtTime(x.startTime)}</b><small>${x.durationMin || 45} мин</small></div>
          <div class="dcard-m">
            ${x.groupName ? `<div class="dcard-ttl">${esc(x.groupName)}${x.status === 'cancelled' ? ' · отменена' : ''}</div>` : x.status === 'cancelled' ? '<div class="dcard-ttl">Отменена</div>' : ''}
            <div class="dcard-kids">${kids.length ? kids.map(n => chip(n)).join('') + (x.participantCount > kids.length ? `<span class="dk dk-more">+${x.participantCount - kids.length}</span>` : '') : '<span class="subtle small">няма записани деца</span>'}</div>
            <div class="dcard-s">${esc(firstName(x.coachName))}${x.location ? ' · ' + esc(x.location) : ''}${x.markedCount ? ` · ${x.presentCount}/${x.participantCount} дошли` : ''}</div>
          </div>${I.chevR}</button>`;
      }
      const e = it.g;
      if (e.kind === 'off') return `<button class="dcard dcard-off" data-gcal="${esc(e.key || e.id)}" style="--ec:#E8930C">
          <div class="dcard-t"><b>🌴</b></div><div class="dcard-m"><div class="dcard-ttl">${esc(firstName(e.coachName))} — ${esc(e.title)}</div>
          <div class="dcard-s">${e.allDay ? 'цял ден' : fmtTime(e.startTime) + '–' + fmtTime(e.endTime)}</div></div></button>`;
      const kids = (e.children || []).map(c => c.firstName || c.name), unk = e.unknownNames || [];
      return `<button class="dcard dcard-g" data-gcal="${esc(e.key || e.id)}" style="--ec:#2F6FED">
          <div class="dcard-t"><b>${e.allDay ? 'цял ден' : fmtTime(e.startTime)}</b>${e.durationMin ? `<small>${e.durationMin} мин</small>` : ''}</div>
          <div class="dcard-m">
            ${!kids.length && !unk.length ? `<div class="dcard-ttl">${esc(e.title)}</div>` : ''}
            ${kids.length || unk.length ? `<div class="dcard-kids">${kids.map(n => chip(n)).join('')}${unk.map(n => chip(n + ' ?', 'dk-q')).join('')}</div>` : ''}
            <div class="dcard-s"><span class="g-badge">Google</span> ${esc(firstName(e.coachName))}${unk.length ? ' · кой е?' : ''}</div>
          </div>${I.chevR}</button>`;
    };
    modal({ title: fmtDay(date), body: items.length ? `<div class="dlist">${items.map(card).join('')}</div>` : emptyState(I.cal, 'Свободен ден', 'Няма тренировки за този ден.'),
      footer: `<button class="btn btn-ghost" data-close>Затвори</button><button class="btn btn-primary" id="addOnDay">${I.plus} Тренировка</button>` });
    $('#addOnDay').onclick = () => { closeModal(); sessionForm(null, date); };
    $$('#modal-host .dcard[data-sid]').forEach(el => el.onclick = () => sessionDetail(el.dataset.sid, refreshCal));
    $$('#modal-host .dcard[data-gcal]').forEach(el => el.onclick = () => openGcal(el.dataset.gcal));
  }


  /* ---------- Форма за тренировка (с повторение) ---------- */
  function timeOptions(selected) {
    let o = '';
    for (let mins = 6 * 60; mins <= 22 * 60; mins += 15) {
      const t = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
      o += `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`;
    }
    return o;
  }

  async function sessionForm(existing, presetDate, after) {
    let boot = null;
    try { boot = await API.getBoot(); } catch (e) { return err(e); }
    const me = (API.getUser() || {}).id;
    const coaches = boot.coaches || [], groups = boot.groups || [];
    const d = existing ? toDateInput(existing.sessionDate) : toDateInput(presetDate || new Date());
    const coachSel = existing?.coachId || me;
    const dur = existing?.durationMin || 45;
    const durOpts = [30, 45, 60, 75, 90, 120].map(m => `<option value="${m}" ${m === dur ? 'selected' : ''}>${m} мин</option>`).join('');
    const teamPool = (boot.team && boot.team.poolLength) || 25;
    const groupId0 = existing?.groupId || '';
    const moreOpen = existing && (existing.location || existing.notes || existing.poolOverride);
    modal({ title: existing ? 'Редакция на тренировка' : 'Нова тренировка', body: `
      ${existing ? '' : `<div class="field"><label>Кой ще тренира?</label><div id="s_people"></div>
        <span class="hint">Пиши име и Enter. Нов човек → картонът се прави сам.</span></div>`}
      ${groups.length ? `<div class="field"><label>${existing ? 'Група' : 'Или цяла група'}</label>
        <div class="gpick" id="gPick">
          <button type="button" class="gp ${!existing?.groupId ? 'on' : ''}" data-g="">Без група</button>
          ${groups.map(g => `<button type="button" class="gp ${existing?.groupId === g.id ? 'on' : ''}" data-g="${g.id}" style="--gc:${g.color}"><i></i>${esc(g.name)}<small>${g.count}</small></button>`).join('')}
        </div></div>` : ''}
      <div class="grid-2 keep2">
        <div class="field"><label for="s_date">Кога</label><input class="input" id="s_date" type="date" value="${d}"></div>
        <div class="field"><label for="s_time">Час</label><select class="select" id="s_time">${timeOptions(existing ? fmtTime(existing.startTime) : '17:00')}</select></div>
      </div>
      <div class="grid-2 keep2">
        <div class="field"><label for="s_coach">Треньор</label><select class="select" id="s_coach">${coaches.map(c => `<option value="${c.id}" ${coachSel === c.id ? 'selected' : ''}>${esc(c.fullName || c.email)}</option>`).join('')}</select></div>
        <div class="field"><label for="s_dur">Колко време</label><select class="select" id="s_dur">${durOpts}</select></div>
      </div>
      ${existing ? '' : `<div id="planBox" ${groupId0 ? '' : 'hidden'}>${setsField('s_sets', '', teamPool)}<p class="hint" style="margin-top:-6px">Тренировката на групата — за всички от нея. При отделни деца се записва после, на всяко дете.</p></div>
        <label class="switch"><input type="checkbox" id="s_rep"><span></span>Повтаряй всяка седмица</label>
        <div id="repBox" class="rep-box" hidden>
          <div class="field"><label>В кои дни</label><div class="daypick" id="dayPick">${DOW.map((x, i) => `<button type="button" data-d="${i + 1}">${x}</button>`).join('')}</div></div>
          <div class="field"><label for="s_until">До дата</label><input class="input" id="s_until" type="date"></div>
          <p class="hint" id="repInfo"></p>
        </div>`}
      <details class="more" ${moreOpen ? 'open' : ''}><summary>Място, басейн, бележки</summary>
        <div class="grid-2">
          <div class="field"><label for="s_loc">Място</label><input class="input" id="s_loc" placeholder="Басейн / зала" value="${esc(existing?.location || '')}"></div>
          <div class="field"><label for="s_pool">Басейн (м)</label><input class="input" id="s_pool" type="number" min="5" max="100" step="0.5" inputmode="decimal" placeholder="${teamPool}" value="${existing?.poolOverride || ''}"></div>
        </div>
        <div class="field"><label for="s_notes">Бележки</label><textarea class="textarea" id="s_notes" placeholder="По желание">${esc(existing?.notes || '')}</textarea></div>
      </details>
      ${existing?.seriesId ? `<label class="switch"><input type="checkbox" id="s_series"><span></span>Приложи и за следващите от серията</label>` : ''}`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="s_save">${I.check} Запази</button>` });

    let groupId = existing?.groupId || '';
    const people = existing ? null : peoplePicker($('#s_people'), (boot.children || []));
    if (!existing) { bindSetsField('s_sets', teamPool); setTimeout(() => $('#s_people input')?.focus(), 250); }
    $$('#gPick .gp').forEach(b => b.onclick = () => {
      groupId = b.dataset.g; $$('#gPick .gp').forEach(x => x.classList.toggle('on', x === b));
      const pb = $('#planBox'); if (pb) pb.hidden = !groupId;
      const g = groups.find(x => x.id === groupId);
      if (g && !existing) {
        if (g.time) $('#s_time').value = g.time;
        if (g.location) $('#s_loc').value = g.location;
        if (g.durationMin) $('#s_dur').value = String(g.durationMin);
        if (g.days?.length) { $('#s_rep').checked = true; $('#repBox').hidden = false; days = new Set(g.days); paintDays(); }
      }
    });
    let days = new Set();
    const paintDays = () => {
      $$('#dayPick button').forEach(b => b.classList.toggle('on', days.has(+b.dataset.d)));
      const info = $('#repInfo'); if (!info) return;
      const from = $('#s_date').value, until = $('#s_until').value;
      if (!from || !until || !days.size) { info.textContent = 'Избери дни и крайна дата.'; return; }
      let n = 0; for (let x = parseD(from); x <= parseD(until); x = addDays(x, 1)) if (days.has(dowIdx(x) + 1)) n++;
      info.textContent = n ? `Ще се създадат ${n} тренировки.` : 'Няма дни в този период.';
    };
    if (!existing) {
      days.add(dowIdx(d) + 1);
      $('#s_until').value = ymd(addDays(d, 7 * 8));
      $('#s_rep').onchange = (e) => { $('#repBox').hidden = !e.target.checked; paintDays(); };
      $$('#dayPick button').forEach(b => b.onclick = () => { const v = +b.dataset.d; days.has(v) ? days.delete(v) : days.add(v); paintDays(); });
      ['#s_date', '#s_until'].forEach(id => $(id).onchange = paintDays);
      paintDays();
    }

    $('#s_save').onclick = async (ev) => {
      const btn = ev.currentTarget;
      const dto = { sessionDate: $('#s_date').value, startTime: $('#s_time').value + ':00', groupId: groupId || null,
        location: $('#s_loc').value.trim() || null, coachId: $('#s_coach').value, durationMin: +$('#s_dur').value,
        notes: $('#s_notes').value.trim() || null, poolLength: $('#s_pool').value ? +$('#s_pool').value : null };
      if (!dto.sessionDate) return toast('Избери дата', 'err');
      if (dto.poolLength !== null && (dto.poolLength < 5 || dto.poolLength > 100)) return toast('Басейнът трябва да е между 5 и 100 м', 'err');
      if (people) {
        if (people.pending()) people.commit();
        if (people.pending()) return toast('Натисни Enter, за да добавиш „' + people.pending() + '"', 'err');
        dto.people = people.get();
        const plan = groupId ? $('#s_sets')?.value.trim() : '';
        if (plan) { if (parseSets(plan).bad.length) return toast('Провери „Какво плува" — напр. 4x6 кроул', 'err'); dto.sets = plan; }
      }
      if (!existing && $('#s_rep').checked) {
        if (!days.size || !$('#s_until').value) return toast('Избери дни и крайна дата', 'err');
        dto.repeatDays = [...days]; dto.repeatUntil = $('#s_until').value;
      }
      busy(btn, true, 'Запис…');
      try {
        if (existing) {
          dto.applyToSeries = !!$('#s_series')?.checked;
          await API.updateSession(existing.id, dto); toast('Обновено', 'ok'); closeModal();
          refreshCal(); (after || refreshAll)(); return;
        }
        const r = await API.createSession(dto);
        const nNew = (r.created || []).length;
        toast((r.count > 1 ? `Създадени ${r.count} тренировки` : 'Създадено') + (nNew ? ` · ${nNew === 1 ? 'нов картон' : nNew + ' нови картона'}` : ''), 'ok');
        closeModal(); refreshCal(); (after || refreshAll)();
        if (r.count === 1) sessionDetail(r.id, after || refreshAll);
      } catch (e) { busy(btn, false); err(e); }
    };
  }
  // Обновява екрана, на който сме
  function refreshAll() { if ($('#todaySessions')) drawToday(); if ($('#calBody')) refreshCal(); }

  /* ---------- Детайли на тренировка: присъствие с едно докосване ---------- */
  let _sdToken = 0;
  async function sessionDetail(id, after, openCid) {
    after = after || refreshAll;
    const tok = ++_sdToken;
    modal({ title: 'Тренировка', body: loading(3, 60), large: true });
    $('#modal-host .modal').classList.add('modal-tall');
    let boot = API.peekBoot();
    const cached = API.peek('session', { id });
    let touched = false, shown = null;
    const draw = (s) => {
      if (tok !== _sdToken || !$('#modal-host .modal-body') || touched) return;
      shown = JSON.stringify(s);
      drawSessionDetail(s, boot, id, after, openCid);
      const mb = $('#modal-host .modal-body');
      ['click', 'input', 'focusin'].forEach(evn => mb.addEventListener(evn, () => { touched = true; }, { once: true }));
    };
    if (cached && boot) draw(cached);
    try {
      const [s, b] = await Promise.all([API.read('session', { id }), boot ? Promise.resolve(boot) : API.getBoot()]);
      boot = b;
      if (JSON.stringify(s) !== shown) { touched = false; draw(s); }
    } catch (e) { if (!shown) { closeModal(); return err(e); } }
  }

  function drawSessionDetail(s, boot, id, after, openCid0) {
    const kids = boot.children || [], groups = boot.groups || [];
    const present = new Set((s.participants || []).map(p => p.childId));
    const addable = kids.filter(c => !present.has(c.id));
    const addGroups = groups.filter(g => g.count > 0);
    const cancelled = s.status === 'cancelled';
    const parts = s.participants || [];

    const body = `
      <div class="sd-hero" style="--gc:${s.groupColor || '#1F73E0'}">
        <div class="sd-time">${fmtTime(s.startTime)}<small>${s.durationMin} мин</small></div>
        <div class="sd-info">
          <b>${esc(s.groupName || s.title || 'Тренировка')}${cancelled ? ' · <span class="txt-red">отменена</span>' : ''}</b>
          <small>${esc(fmtDay(s.sessionDate))}</small>
          <small>${esc(s.coachName)}${s.location ? ' · ' + esc(s.location) : ''}</small>
        </div>
        <div class="sd-m" id="sdTotals"></div>
        <div class="sd-menu"><button class="btn-icon btn-ghost" id="sdMenuBtn" aria-label="Още действия" title="Още">⋯</button>
          <div class="sd-pop" id="sdPop" hidden>
            <button id="sdEdit">${I.edit}<span>Редакция (час, дата, треньор)</span></button>
            <button id="sdCancel">${cancelled ? I.refresh : I.ban}<span>${cancelled ? 'Възстанови' : 'Отмени тренировката'}</span></button>
            <button id="sdDel" class="danger">${I.trash}<span>Изтрий</span></button>
          </div></div>
      </div>
      ${s.notes && !s.fromCalendar ? `<p class="note">${esc(s.notes)}</p>` : ''}

      <section class="sd-sec">
        <div class="sd-head">
          <strong><span class="sd-n">1</span>Кой дойде <span class="badge" id="sdSum"></span></strong>
          ${parts.length ? `<button class="btn btn-primary btn-sm" id="allIn" ${parts.some(p => p.attended === null) ? '' : 'hidden'}>${I.check} Всички са тук</button>
            <button class="btn btn-ghost btn-sm" id="attClr" ${parts.some(p => p.attended !== null) ? '' : 'hidden'}>↺ Изчисти</button>` : ''}
        </div>
        <div class="klist" id="partList">${parts.length ? parts.map(p => kidRow(p, { details: true })).join('') : `<p class="subtle small" style="padding:6px 2px">Още няма плувци — добави отдолу.</p>`}</div>
        <div class="sd-addrow">
          <div class="ns-wrap sd-name"><input class="input" id="addName" type="text" placeholder="+ Добави дете (име и Enter)" autocomplete="off" enterkeyhint="done"><div class="ns-box" id="addNameBox" hidden></div></div>
          ${addGroups.length ? `<select class="select select-sm" id="addGroup" aria-label="Добави група"><option value="">+ Група</option>${addGroups.map(g => `<option value="${g.id}">${esc(g.name)} (${g.count})</option>`).join('')}</select>` : ''}
        </div>
      </section>

      ${parts.length && s.groupId ? `<section class="sd-sec">
        <div class="sd-head"><strong><span class="sd-n">2</span>Тренировката на групата</strong><small class="sd-saved" id="sdSaved"></small></div>
        ${setsField('sd_sets', commonSets(parts), s.poolLength)}
        <p class="hint">Записва се само — за всички от групата, които дойдоха. Някой плува друго? Натисни детето.</p>
      </section>` : parts.length ? `<p class="hint sd-tip">👆 Натисни детето, за да запишеш какво плува.</p>` : ''}`;
    $('#modal-host .modal-body').innerHTML = body;

    const list = $('#partList');
    const sum = () => { const c = attCount(list); $('#sdSum').textContent = c.total ? `${c.present}/${c.total}` : '0'; };
    sum();
    let dirty = false;
    bindAtt(list, async (cid, v) => { await API.upsertParticipant(id, { childId: cid, attended: v }); dirty = true; const p = parts.find(x => x.childId === cid); if (p) { p.attended = v; paintTotals(); } });
    list.addEventListener('attchange', sum);
    bindAlerts(list);
    // Натискане на дете → под него се отваря неговата тренировка (серии + настроение), записва се само
    let openCid = null;
    const openKid = (cid) => {
      $$('.kpanel', list).forEach(x => x.remove()); $$('.krow.open', list).forEach(x => x.classList.remove('open'));
      if (openCid === cid) { openCid = null; return; }
      openCid = cid;
      const p = parts.find(x => x.childId === cid), row = $(`[data-cid="${cid}"]`, list);
      row.classList.add('open');
      row.insertAdjacentHTML('afterend', `<div class="kpanel">
        ${setsField('ks_sets', p.sets || '', s.poolLength, { kg: p.kg, adult: p.adult })}
        <div class="kp-foot"><div class="moodpick moodpick-sm" id="ksMood">${MOODS.map(m => `<button type="button" data-m="${m}" class="${p.mood === m ? 'on' : ''}" title="${m}">${MOOD_EMOJI[m]}</button>`).join('')}</div>
          <small class="sd-saved" id="ksSaved"></small>
          <button type="button" class="btn btn-ghost btn-sm" id="ksMore">${I.edit} Бележки</button></div>
      </div>`);
      bindSetsField('ks_sets', s.poolLength, { kg: p.kg, adult: p.adult });
      const panel = row.nextElementSibling, saved = $('#ksSaved', panel);
      let t = 0;
      const save = (patch, msg = '✓ Записано') => { saved.textContent = 'Записвам…';
        return API.upsertParticipant(id, { childId: cid, ...patch }).then(() => { saved.textContent = msg; dirty = true; }).catch(e => { saved.textContent = ''; err(e); }); };
      $('#ks_sets', panel).addEventListener('input', () => {
        clearTimeout(t); saved.textContent = '';
        t = setTimeout(() => {
          const v = $('#ks_sets', panel).value.trim();
          if (v && parseSets(v).bad.length) return;
          p.sets = v || null; p.meters = v ? metersOf(v, s.poolLength) : null; p.kcal = v ? kcalOf(v, s.poolLength || 25, p.kg || 30, p.adult) : null;
          paintKidSets(p); paintTotals(); save({ sets: p.sets });
        }, 700);
      });
      $$('#ksMood button', panel).forEach(b => b.onclick = () => {
        p.mood = p.mood === b.dataset.m ? null : b.dataset.m;
        $$('#ksMood button', panel).forEach(x => x.classList.toggle('on', x.dataset.m === p.mood));
        save({ mood: p.mood });
      });
      $('#ksMore', panel).onclick = () => participantNotes(s, p, after);
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    if (openCid0 && parts.some(p => p.childId === openCid0)) setTimeout(() => openKid(openCid0), 30);
    $$('[data-more]', list).forEach(b => {
      b.onclick = () => openKid(b.closest('[data-cid]').dataset.cid);
      b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } };
    });

    // затваряне → обнови екрана отдолу, ако нещо е променено
    $$('#modal-host [data-close]').forEach(b => b.addEventListener('click', () => { if (dirty) after(); }));

    // ⋯ меню
    const pop = $('#sdPop');
    $('#sdMenuBtn').onclick = (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; };
    $('#modal-host .modal-body').addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('.sd-menu')) pop.hidden = true; });
    $('#sdEdit').onclick = () => sessionForm(s, null, after);

    // Общо: метри и калории на живо
    const paintTotals = () => {
      const pool = s.poolLength || 25;
      let m = 0, k = 0;
      parts.forEach(p => { if (p.attended === false || !p.sets) return; m += metersOf(p.sets, pool) || 0; k += kcalOf(p.sets, pool, p.kg || 30, p.adult); });
      $('#sdTotals').innerHTML = m ? `<b>${fmtM(m)}</b><small>🔥 ≈ ${k} kcal · басейн ${pool} м</small>` : `<small>басейн ${pool} м</small>`;
    };
    paintTotals();
    // „Какво плуваха" — авто-запис за всички присъстващи (без тези с различни серии)
    if (parts.length && s.groupId) {
      bindSetsField('sd_sets', s.poolLength);
      const hid = $('#sd_sets'), saved = $('#sdSaved');
      let common = commonSets(parts), timer = 0;
      hid.addEventListener('input', () => {
        clearTimeout(timer); saved.textContent = '';
        timer = setTimeout(async () => {
          const v = hid.value.trim();
          if (v && parseSets(v).bad.length) return;
          const who = parts.filter(p => p.attended !== false && (!p.sets || p.sets === common));
          if (!who.length) return;
          saved.textContent = 'Записвам…';
          try {
            await API.updateSets(id, who.map(p => ({ childId: p.childId, sets: v || null })));
            who.forEach(p => { p.sets = v || null; p.meters = v ? metersOf(v, s.poolLength) : null; p.kcal = v ? kcalOf(v, s.poolLength || 25, p.kg || 30, p.adult) : null; paintKidSets(p); });
            common = v; dirty = true; paintTotals(); saved.textContent = '✓ Записано';
          } catch (e) { saved.textContent = ''; err(e); }
        }, 700);
      });
    }
    function paintKidSets(p) {
      const row = $(`#partList [data-cid="${p.childId}"] .krow-main`); if (!row) return;
      let line = $('.krow-sets', row);
      if (!p.sets) { if (line) line.remove(); } else { if (!line) { line = document.createElement('div'); line.className = 'krow-sets'; row.firstElementChild.after(line); } line.textContent = prettySets(p.sets); }
      const meta = $('.krow-meta', row); if (!meta) return;
      const hint = $('.krow-hint', meta); if (hint && p.sets) hint.remove();
      let tag = $('.tag-m', meta);
      if (!p.meters) { if (tag) tag.remove(); return; }
      if (!tag) { tag = document.createElement('span'); tag.className = 'tag tag-m'; meta.prepend(tag); }
      tag.textContent = `🏊 ${fmtM(p.meters)}${p.kcal ? ` · 🔥 ${p.kcal}` : ''}`;
    }
    $('#sdCancel').onclick = async () => {
      if (!cancelled && !await ask('Отмяна на тренировката', 'Тренировката остава в графика, но се отбелязва като отменена и не се брои в посещаемостта.', 'Отмени тренировката', true)) return sessionDetail(id, after);
      try { await API.cancelSession(id, !cancelled); toast(cancelled ? 'Възстановена' : 'Отменена', 'ok'); refreshCal(); after(); sessionDetail(id, after); } catch (e) { err(e); }
    };
    $('#sdDel').onclick = () => deleteSessionFlow(s, after);
    const allIn = $('#allIn');
    if (allIn) allIn.onclick = async () => {
      const boxes = $$('[data-att]', list).filter(b => b.dataset.att === '');
      boxes.forEach(b => paintAtt(b, '1')); sum(); busy(allIn, true);
      try { await API.markAttendance(id, boxes.map(b => ({ childId: b.closest('[data-cid]').dataset.cid, attended: true }))); dirty = true; busy(allIn, false); toast('Отбелязано', 'ok');
        boxes.forEach(b => { const p = parts.find(x => x.childId === b.closest('[data-cid]').dataset.cid); if (p) p.attended = true; }); paintTotals(); syncAttBtns(); }
      catch (e) { boxes.forEach(b => paintAtt(b, '')); sum(); busy(allIn, false); err(e); }
    };
    // ↺ Изчисти — всички обратно на „неотбелязано"
    const attClr = $('#attClr');
    const syncAttBtns = () => {
      const boxes = $$('[data-att]', list);
      if (allIn) allIn.hidden = !boxes.some(b => b.dataset.att === '');
      if (attClr) attClr.hidden = !boxes.some(b => b.dataset.att !== '');
    };
    list.addEventListener('attchange', syncAttBtns);
    if (attClr) attClr.onclick = async () => {
      const boxes = $$('[data-att]', list).filter(b => b.dataset.att !== '');
      const prev = boxes.map(b => b.dataset.att);
      boxes.forEach(b => paintAtt(b, '')); sum(); syncAttBtns();
      try { await API.markAttendance(id, boxes.map(b => ({ childId: b.closest('[data-cid]').dataset.cid, attended: null }))); dirty = true;
        boxes.forEach(b => { const p = parts.find(x => x.childId === b.closest('[data-cid]').dataset.cid); if (p) p.attended = null; }); paintTotals(); }
      catch (e) { boxes.forEach((b, i) => paintAtt(b, prev[i])); sum(); syncAttBtns(); err(e); }
    };
    const addName = $('#addName');
    nameSuggest(addName, $('#addNameBox'), () => addable, async (x) => {
      addName.disabled = true;
      try {
        const r = await API.addPeopleToSession(id, [x.childId ? { childId: x.childId } : { name: x.name }], true);
        toast((r.created || []).length ? `Добавено · нов картон за ${x.name}` : 'Добавено', 'ok');
        after(); sessionDetail(id, after);
      } catch (e) { addName.disabled = false; err(e); }
    });
    const addG = $('#addGroup');
    if (addG) addG.onchange = async () => {
      if (!addG.value) return;
      addG.disabled = true;
      try { const r = await API.addGroupToSession(id, addG.value); toast(r.added ? `Добавени: ${peopleCount(r.added)}` : 'Всички вече са тук', 'ok'); after(); sessionDetail(id, after); } catch (e) { addG.disabled = false; err(e); }
    };
  }

  async function deleteSessionFlow(s, after) {
    if (s.seriesId) {
      modal({ title: 'Изтриване', body: `<p>Тази тренировка е част от повтаряща се серия.</p>`,
        footer: `<button class="btn btn-ghost" data-close>Отказ</button>
          <button class="btn btn-danger" id="delOne">${I.trash} Само тази</button>
          <button class="btn btn-danger" id="delAll">${I.trash} Тази и следващите</button>` });
      const go = async (series) => { try { const r = await API.deleteSession(s.id, series); toast(`Изтрити: ${r.deleted}`, 'ok'); closeModal(); refreshCal(); after(); } catch (e) { err(e); } };
      $('#delOne').onclick = () => go(false); $('#delAll').onclick = () => go(true);
      return;
    }
    if (!await ask('Изтриване', 'Да изтрия ли тренировката заедно с отбелязаното присъствие и бележките?', 'Изтрий', true)) return sessionDetail(s.id, after);
    try { await API.deleteSession(s.id); toast('Изтрито', 'ok'); refreshCal(); after(); } catch (e) { err(e); }
  }

  /* ---------- Тренировката — пише се на ръка, по една серия на ред ----------
     „200 крака кроул", „2 x 200 гръб", „два пъти по двеста", „4 по 50 ръце", „6 дължини кроул".
     Под полето се вижда как е разчетено всеки ред + общо метри и калории. Време не показваме —
     всяко дете плува със свое темпо. */
  const STYLE_MET = { 'делфин': 9.5, 'бруст': 5.3, 'гръб': 4.8, 'крака': 4.0, 'ръце': 4.5, 'упражн': 4.5, 'игри': 3.5, 'кроул': 5.8, '': 5.8 };
  const styleOf = (rest) => { const t = String(rest || '').toLowerCase(); return ['делфин', 'бруст', 'гръб', 'крака', 'ръце', 'упражн', 'игри', 'кроул'].find(k => t.includes(k.slice(0, 4))) || ''; };
  const kcalOf = (sets, pool, kg = 30, adult = false) => {
    let k = 0;
    swimLines(sets, pool || 25).forEach(l => { if (l.m) k += (STYLE_MET[styleOf(l.what)] || 5.8) * kg * (l.m / 100 * (adult ? 2.5 : 3) / 60); });
    return Math.round(k);
  };
  // старите записи са със запетаи — в полето ги показваме ред по ред
  const setsToText = (v) => String(v || '').split(/\n|;|,(?!\d)/).map(x => x.trim()).filter(Boolean).join('\n');
  const SWIM_EXAMPLES = ['200 крака кроул', '2 x 100 гръб', '4 по 50 ръце кроул', '100 кроул'];

  function setsField(id, value, pool, who) {
    return `<div class="field wb2" id="${id}_wb">
      <label for="${id}_ta">Какво плува <span class="subtle">— по една серия на ред</span></label>
      <input type="hidden" id="${id}" value="${esc(value || '')}">
      <textarea class="textarea wb2-ta" id="${id}_ta" rows="4" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="200 крака кроул&#10;2 x 100 гръб&#10;4 по 50 ръце кроул">${esc(setsToText(value))}</textarea>
      <div class="wb2-ex">${SWIM_EXAMPLES.map(x => `<button type="button" data-q="${x}">+ ${x}</button>`).join('')}</div>
      <div class="wb2-out" id="${id}_out"></div>
      <span class="hint">Басейн ${pool || 25} м · под 25 без „м" = дължини${who ? '' : ' · калориите са за дете ~30 кг'}</span>
    </div>`;
  }
  function bindSetsField(id, pool, who) {
    const box = $('#' + id + '_wb'), hid = $('#' + id), ta = $('#' + id + '_ta'), out = $('#' + id + '_out');
    pool = pool || 25;
    const kg = who?.kg || 30, adult = !!who?.adult;
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(320, Math.max(96, ta.scrollHeight + 2)) + 'px'; };
    const paint = () => {
      const lines = swimLines(ta.value, pool);
      if (!lines.length) { out.innerHTML = ''; return; }
      const total = lines.reduce((a, l) => a + l.m, 0);
      out.innerHTML = `<ul class="wb2-lines">${lines.map(l => `<li class="${l.ok ? '' : 'no'}"><b>${l.ok ? fmtM(l.m) : '—'}</b><span>${esc(l.what || (l.ok ? '' : ''))}${l.ok ? '' : ' <i>без метри</i>'}</span></li>`).join('')}</ul>
        ${total ? `<div class="wb2-sum"><span>🏊 <b>${fmtM(total)}</b></span><span>🔥 ≈ <b>${kcalOf(ta.value, pool, kg, adult)}</b> kcal</span></div>` : ''}`;
    };
    const sync = () => { hid.value = ta.value.split('\n').map(x => x.trim()).filter(Boolean).join('\n'); paint(); grow(); hid.dispatchEvent(new Event('input')); };
    ta.addEventListener('input', sync);
    $$('[data-q]', box).forEach(b => b.onclick = () => {
      ta.value = (ta.value.replace(/\s+$/, '') ? ta.value.replace(/\s+$/, '') + '\n' : '') + b.dataset.q;
      sync(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    });
    paint(); grow();
  }

  // Еднакви серии за всички присъстващи
  function setsForAll(s, parts, after) {
    const who = parts.filter(p => p.attended !== false);
    modal({ title: '🏊 Какво плуваха', body: `
      <p class="subtle" style="margin-bottom:12px">За ${peopleCount(who.length)} (без отсъстващите). Различно за някого — през ✎ до името.</p>
      ${setsField('sa_sets', '', s.poolLength)}`,
      footer: `<button class="btn btn-ghost" id="sa_back">${I.chevL} Назад</button><button class="btn btn-primary" id="sa_ok">${I.check} Запиши за всички</button>` });
    bindSetsField('sa_sets', s.poolLength);
    $('#sa_back').onclick = () => sessionDetail(s.id, after);
    $('#sa_ok').onclick = async (ev) => {
      const v = $('#sa_sets').value.trim();
      if (!v) return toast('Напиши серии, напр. 4x6, 5x8', 'err');
      if (parseSets(v).bad.length) return toast('Не разбирам серията', 'err');
      busy(ev.currentTarget, true, 'Запис…');
      try { await API.updateSets(s.id, who.map(p => ({ childId: p.childId, sets: v }))); toast('Записано', 'ok'); after(); sessionDetail(s.id, after); }
      catch (e) { busy(ev.currentTarget, false); err(e); }
    };
  }

  // Бележки за едно дете в една тренировка
  function participantNotes(s, p, after) {
    modal({ title: `${p.childName} · ${fmtShort(s.sessionDate)}`, body: `
      ${p.medicalAlert ? `<div class="med-banner">${I.alert}<span>${esc(p.medicalAlert)}</span></div>` : ''}
      <div class="field"><label>Присъствие</label>${attButtons(p.attended, 'att2-lg')}</div>
      ${setsField('pn_sets', p.sets, s.poolLength, { kg: p.kg, adult: p.adult })}
      <div class="field"><label for="pn_swam">Бележка за упражненията <span class="subtle">(по желание)</span></label><textarea class="textarea" id="pn_swam" placeholder="напр. 6×25 крака гръб, дишане настрани…">${esc(p.swamWhat || '')}</textarea>
        <div class="qchips" data-for="pn_swam">${['крака с дъска','звездичка','плъзгане','дишане','кроул','гръб','скокове','игри във водата'].map(x => `<button type="button">${x}</button>`).join('')}</div></div>
      <div class="field"><label>Настроение</label><div class="moodpick" id="pn_mood">${MOODS.map(m => `<button type="button" data-m="${m}" class="${p.mood === m ? 'on' : ''}" title="${m}">${MOOD_EMOJI[m]}</button>`).join('')}</div></div>
      <div class="field"><label for="pn_prog">Какво постигна днес <span class="subtle">(за треньорите)</span></label><textarea class="textarea" id="pn_prog" placeholder="Напр. първи път без коланче!">${esc(p.dailyProgress || '')}</textarea></div>
      <div class="field"><label for="pn_parent">Бележка за родителя <span class="subtle">(вижда я)</span></label><textarea class="textarea" id="pn_parent" placeholder="Напр. Браво! Днес доплува 10 м сама 💪">${esc(p.parentNote || '')}</textarea></div>
      <button class="btn btn-ghost btn-sm" id="pn_rm" style="color:var(--red)">${I.trash} Махни от тренировката</button>`,
      footer: `<button class="btn btn-ghost" id="pn_back">${I.chevL} Назад</button><button class="btn btn-primary" id="pn_save">${I.check} Запази</button>` });
    const box = $('#modal-host [data-att]');
    let att = p.attended;
    $$('.att2-b', box).forEach(b => b.onclick = () => { const v = b.dataset.v === '' || box.dataset.att === b.dataset.v ? '' : b.dataset.v; paintAtt(box, v); att = v === '' ? null : v === '1'; });
    let mood = p.mood || null;
    $$('#pn_mood button').forEach(b => b.onclick = () => { mood = mood === b.dataset.m ? null : b.dataset.m; $$('#pn_mood button').forEach(x => x.classList.toggle('on', x.dataset.m === mood)); });
    $$('.qchips button').forEach(b => b.onclick = () => { const ta = $('#' + b.parentElement.dataset.for); ta.value = (ta.value.trim() ? ta.value.trim() + ', ' : '') + b.textContent; ta.focus(); });
    bindSetsField('pn_sets', s.poolLength, { kg: p.kg, adult: p.adult });
    $('#pn_back').onclick = () => sessionDetail(s.id, after);
    $('#pn_rm').onclick = async () => {
      if (!await ask('Махане', `Да махна ли ${esc(p.childName)} от тази тренировка?`, 'Махни', true)) return participantNotes(s, p, after);
      try { await API.removeParticipant(s.id, p.childId); toast('Махнато', 'ok'); after(); sessionDetail(s.id, after); } catch (e) { err(e); }
    };
    $('#pn_save').onclick = async (ev) => {
      busy(ev.currentTarget, true, 'Запис…');
      const bad = parseSets($('#pn_sets').value).bad;
      if (bad.length) { busy(ev.currentTarget, false); return toast(`Не разбирам „${bad[0]}". Пиши: 200 крака кроул`, 'err'); }
      try {
        await API.upsertParticipant(s.id, { childId: p.childId, attended: att, mood,
          swamWhat: $('#pn_swam').value.trim() || null, dailyProgress: $('#pn_prog').value.trim() || null,
          sets: $('#pn_sets').value.trim() || null,
          parentNote: $('#pn_parent').value.trim() || null });
        toast('Запазено', 'ok'); after(); sessionDetail(s.id, after);
      } catch (e) { busy(ev.currentTarget, false); err(e); }
    };
  }

  // Линк „Добави в Google Calendar" за една тренировка
  function gcalTemplate(s) {
    const st = parseD(s.sessionDate); const [h, m] = fmtTime(s.startTime || '17:00').split(':').map(Number);
    st.setHours(h, m, 0, 0);
    const en = new Date(st.getTime() + (s.durationMin || 45) * 60000);
    const f = (d) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const q = new URLSearchParams({ action: 'TEMPLATE', text: `🏊 ${s.groupName || s.title || 'Тренировка'} · ${firstName(s.coachName)}`,
      dates: `${f(st)}/${f(en)}`, ctz: 'Europe/Sofia', location: s.location || '', details: 'SwimWithSmile' });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  /* ---------- Google Calendar: в сайта (свързване) и от сайта (абонамент) ---------- */
  async function calendarSync(tab = 'in') {
    // Засега само Google → сайта (износът към Google идва по-късно — calendarOut()).
    modal({ title: 'Google Calendar', body: `<div id="gcPane">${loading(2, 60)}</div>` });
    return calendarIn();
  }

  // Моят Google Calendar → в графика на сайта (само подбраните събития)
  async function calendarIn() {
    let st;
    try { st = await API.calendarSettings(); } catch (e) { closeModal(); return err(e); }
    const pane = $('#gcPane'); if (!pane) return;
    const badge = st.status === 'ok' ? '<span class="tag tag-ok">свързан</span>'
      : st.status === 'error' ? '<span class="tag tag-warn">грешка</span>'
      : st.status === 'pending' ? '<span class="tag">зарежда…</span>' : '<span class="tag">не е свързан</span>';
    const ago = st.lastSync ? Math.max(0, Math.round((Date.now() - Date.parse(st.lastSync)) / 60000)) : null;
    pane.innerHTML = `
      <div class="gc-me">
        <div><b>Моят календар</b> ${badge}<small>${st.hasUrl ? (st.status === 'ok' ? `${st.eventCount} събития · обновен ${ago < 1 ? 'сега' : `преди ${ago} мин`}` : esc(st.myEmail)) : 'Постави тайния адрес отдолу'}</small></div>
        ${st.hasUrl ? `<label class="switch"><input type="checkbox" id="gcOn" ${st.calendarOn ? 'checked' : ''}><span></span></label>` : ''}
      </div>
      ${st.error ? `<div class="note warn" style="margin-top:10px">${esc(st.error)}</div>` : ''}
      <div class="field" style="margin-top:14px">
        <label for="gcUrl">Таен адрес във формат iCal</label>
        <div class="invite-box"><input class="input" id="gcUrl" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" value="" autocomplete="off" spellcheck="false">
          <button class="btn btn-primary" id="gcSave">${I.check}<span class="hide-xs">${st.hasUrl ? 'Смени' : 'Свържи'}</span></button></div>
        ${st.hasUrl ? `<span class="hint">Сега: ${esc(st.icsUrl)}</span>` : ''}
      </div>
      <details class="howto" ${st.hasUrl ? '' : 'open'}><summary>Къде е този адрес? (30 секунди, веднъж)</summary>
        <ol>
          <li>Отвори <b>calendar.google.com</b> на компютър (на телефона — в браузъра, режим „Компютър").</li>
          <li>Вляво при „Моите календари": до твоя календар <b>⋮ → Настройки и споделяне</b>.</li>
          <li>Слез до <b>„Интегриране на календара"</b>.</li>
          <li>Копирай <b>„Таен адрес във формат iCal"</b> (завършва на <code>basic.ics</code>) и го постави горе.</li>
        </ol>
        <p class="subtle">Адресът е само за четене и не се показва на никого. Сайтът проверява календара на всеки 10 мин (↻ в графика — веднага).</p></details>
      <div class="gc-rules">
        <b>Какво излиза в графика</b>
        <ul>
          <li>📅 <b>Всички</b> събития от календара ти — с час и заглавие</li>
          <li>✓ Име на плувец („Йоан", „Мария П.") се свързва с картона му</li>
          <li>🌴 Почивка, отпуск, болничен — колегата вижда, че те няма</li>
          <li>🙈 „<b>#лично</b>" в заглавието скрива събитието</li>
        </ul>
      </div>
      ${st.canEditKeywords ? `
        <div class="field" style="margin-top:12px"><label for="gcKw">Скрий събития с думите <span class="subtle">(със запетая)</span></label>
          <input class="input" id="gcKw" value="${esc(st.hideWords || '')}" placeholder="гироси, зъболекар, фитнес">
          <span class="hint">Празно — виждат се всички.</span></div>
        <button class="btn btn-soft btn-sm" id="gcKwSave">${I.check} Запази</button>` : ''}
      <div class="gc-coaches">${(st.coaches || []).map(c => `<span class="chip">${c.on ? '🟢' : '⚪'} ${esc(c.fullName)}</span>`).join('')}</div>`;
    const on = $('#gcOn');
    if (on) on.onchange = async (e) => {
      try { await API.updateCalendarSettings({ calendarOn: e.target.checked }); toast(e.target.checked ? 'Включено' : 'Изключено', 'ok'); refreshCal(); calendarIn(); }
      catch (ex) { e.target.checked = !e.target.checked; err(ex); }
    };
    $('#gcSave').onclick = async (e) => {
      const v = $('#gcUrl').value.trim();
      if (!v) return toast('Постави адреса от Google Calendar', 'err');
      if (!/^(https|webcal):\/\//i.test(v)) return toast('Адресът започва с https://', 'err');
      if (!/\.ics(\?|$)/i.test(v) && !await ask('Сигурен ли си?', 'Адресът не завършва на .ics — трябва „Таен адрес във формат iCal". Да опитам ли все пак?', 'Опитай')) return calendarSync('in');
      const b = e.currentTarget; busy(b, true, '');
      try { await API.updateCalendarSettings({ icsUrl: v }); toast('Свързано — проверявам календара', 'ok'); refreshCal(); calendarIn(); }
      catch (ex) { busy(b, false); err(ex); }
    };
    const ks = $('#gcKwSave'); if (ks) ks.onclick = async () => {
      busy(ks, true);
      try { await API.updateCalendarSettings({ hideWords: $('#gcKw').value }); toast('Запазено', 'ok'); refreshCal(); calendarIn(); }
      catch (e) { busy(ks, false); err(e); }
    };
  }

  // Тренировките от сайта → абонамент в Google Calendar
  async function calendarOut() {
    let f;
    try { f = await API.calendarFeed(); } catch (e) { closeModal(); return err(e); }
    const pane = $('#gcPane'); if (!pane) return;
    const base = f.serviceUrl || API.getBase();
    const urlAll = `${base}?ics=${f.key}`;
    const urlMine = `${urlAll}&coach=${encodeURIComponent(f.coachId)}`;
    const sub = (u) => 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(u.replace(/^https?:/, 'webcal:'));
    const isOwner = (API.getUser() || {}).role === 'owner';
    pane.innerHTML = `
      <p>Тренировките от сайта се появяват в твоя Google Calendar и на телефона. Промените се синхронизират сами (Google проверява на няколко часа).</p>
      <div class="seg seg-2" id="feedSeg" style="margin:18px 0 14px"><button class="seg-btn active" data-u="all">Целият отбор</button><button class="seg-btn" data-u="mine">Само моите</button></div>
      <a class="btn btn-primary btn-block btn-lg" id="feedAdd" target="_blank" rel="noopener" href="${sub(urlAll)}">${I.cal} Добави в Google Calendar</a>
      <div class="invite-box" style="margin-top:14px"><input class="input" readonly id="feedUrl" value="${esc(urlAll)}" aria-label="Адрес на календара"><button class="btn btn-soft" id="feedCopy">${I.copy}</button></div>
      <details class="howto"><summary>Не се отваря? Ръчно за 30 секунди</summary>
        <ol><li>Копирай адреса горе.</li><li>Отвори <b>calendar.google.com</b> на компютър.</li><li>Вляво: <b>Други календари → + → От URL</b>.</li><li>Постави адреса → <b>Добавяне на календар</b>.</li></ol>
        <p class="subtle">На iPhone: Настройки → Календар → Акаунти → Добавяне → Друг → Абониран календар.</p></details>
      ${isOwner ? `<button class="btn btn-ghost btn-sm" id="feedRegen" style="margin-top:12px">${I.refresh} Смени адреса (старият спира)</button>` : ''}`;
    let cur = urlAll;
    $$('#feedSeg .seg-btn').forEach(b => b.onclick = () => {
      $$('#feedSeg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
      cur = b.dataset.u === 'mine' ? urlMine : urlAll;
      $('#feedUrl').value = cur; $('#feedAdd').href = sub(cur);
    });
    $('#feedCopy').onclick = () => copyText(cur);
    const rg = $('#feedRegen');
    if (rg) rg.onclick = async () => {
      if (!await ask('Нов адрес', 'Всички, които са абонирани със стария адрес, ще трябва да добавят новия.', 'Смени', true)) return calendarSync('out');
      try { await API.calendarFeed(true); toast('Новият адрес е готов', 'ok'); calendarSync('out'); } catch (e) { err(e); }
    };
  }

  Object.assign(S, { parseSets, metersOf, kcalOf, fmtM, setsField, bindSetsField, sessionForm, sessionDetail, calendarSync, attButtons, paintAtt, bindAtt, kidRow, refreshAll, peoplePicker, nameSuggest, peopleCount });
})();

// Първото рисуване — след като се заредят всички скриптове (coach, parent, landing)
document.addEventListener('DOMContentLoaded', () => window.__SWS.render());
