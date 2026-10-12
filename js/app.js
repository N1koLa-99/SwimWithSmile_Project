/* ============================================================
   SwimWithSmile — Приложение (SPA)
   Vanilla JS · hash router · без build стъпка
   app.js    — ядро, „Днес", график и тренировки
   coach.js  — деца, картон, умения, групи, посещаемост, „Клуб"
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
  const GENDERS = ['момче','момиче'];

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
      body: `<div class="field"><label>Адрес на сървъра (Google Apps Script)</label>
        <input class="input" id="apiBaseIn" value="${esc(API.getBase())}" placeholder="https://script.google.com/macros/s/.../exec">
        <span class="hint">Адресът на твоето Apps Script Web App — завършва на <b>/exec</b>.</span></div>`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="saveCfg">Запази</button>`
    });
    $('#saveCfg').onclick = () => { API.setBase($('#apiBaseIn').value.trim()); toast('Запазено', 'ok'); closeModal(); };
  }

  /* ============================================================
     ЧЕРУПКА (треньор) — топбар + долна навигация
     ============================================================ */
  const NAV = [
    { to: '/app/today', key: 'today', ico: I.sun, label: 'Днес' },
    { to: '/app/calendar', key: 'calendar', ico: I.cal, label: 'График' },
    { to: '/app/children', key: 'children', ico: I.kids, label: 'Деца' },
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
            ${u.teamName ? `<div class="brand-team">${esc(u.teamName)}</div>` : ''}
          </div>
        </a>
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
  }

  // Лист с бързи действия (централният „+" долу)
  function quickSheet() {
    const items = [
      ['session', I.cal, 'Тренировка', 'нова или повтаряща се'],
      ['child', I.kids, 'Дете', 'нов картон'],
      ['award', I.trophy, 'Награда', 'на едно или много деца'],
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
        <div><b>${esc(u.name || 'Треньор')}</b><small>${esc(u.email || '')}</small>${u.teamName ? `<small>${esc(u.teamName)} · ${u.role === 'owner' ? 'собственик' : 'треньор'}</small>` : ''}</div></div>
      <div class="menu-list">
        <a href="#/app/team" class="menu-row">${I.team}<span>Отбор и покани</span>${I.chevR}</a>
        <button class="menu-row" id="meCal">${I.cal}<span>Google Calendar</span>${I.chevR}</button>
        <a href="#/" class="menu-row">${I.wave}<span>Начална страница</span>${I.chevR}</a>
        <button class="menu-row" id="meApi">${I.gear}<span>Връзка със сървъра</span>${I.chevR}</button>
        <button class="menu-row danger" id="meOut">${I.logout}<span>Изход</span></button>
      </div>` });
    $$('#modal-host a.menu-row').forEach(a => a.addEventListener('click', closeModal));
    $('#meCal').onclick = () => window.__SWS.calendarSync();
    $('#meApi').onclick = () => openConfig();
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

  window.__SWS = { app, shell, guard, modal, closeModal, ask, toast, err, navigate, render, route, routes, onLeave, logoMark, openConfig,
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

  /* ---------- Бутони за присъствие (три състояния) ---------- */
  // true = присъства, false = отсъства, null = неотбелязано. Повторно докосване = изчистване.
  const attButtons = (state, size = '') => `
    <div class="att2 ${size}" data-att="${state === true ? '1' : state === false ? '0' : ''}" role="group" aria-label="Присъствие">
      <button type="button" class="att2-b yes" data-v="1" aria-pressed="${state === true}" title="Присъства">${I.check}</button>
      <button type="button" class="att2-b no" data-v="0" aria-pressed="${state === false}" title="Отсъства">${I.x}</button>
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

  /* ---------- Ред за дете в тренировка ---------- */
  function kidRow(p, opts = {}) {
    const alert = p.medicalAlert ? `<button type="button" class="kid-alert" data-alert="${esc(p.medicalAlert)}" title="${esc(p.medicalAlert)}" aria-label="Здравно предупреждение">${I.alert}</button>` : '';
    const sop = p.specialNeeds ? `<span class="tag tag-sop" title="${esc(p.specialNeeds)}">СОП</span>` : '';
    const abs = p.absStreak >= 2 ? `<span class="tag tag-warn" title="Поредни отсъствия">${p.absStreak}× отс.</span>` : '';
    const notes = [p.swamWhat, p.dailyProgress, p.parentNote].filter(Boolean).length;
    return `<div class="krow" data-cid="${p.childId}">
      ${avatar(p.firstName || p.childName, p.lastName || '')}
      <div class="krow-main">
        <div class="krow-name">${esc(p.childName)} ${alert}</div>
        <div class="krow-meta">${sop}${abs}${p.mood ? `<span>${MOOD_EMOJI[p.mood] || ''}</span>` : ''}${notes ? `<span class="subtle">${I.edit}${notes}</span>` : ''}</div>
      </div>
      ${opts.details ? `<button type="button" class="btn-icon btn-ghost krow-more" data-more aria-label="Бележки за ${esc(p.childName)}">${I.edit}</button>` : ''}
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
    const h = new Date().getHours();
    const hello = h < 11 ? 'Добро утро' : h < 18 ? 'Добър ден' : 'Добър вечер';
    shell('today', `
      <div class="page-head today-head">
        <div><div class="page-eyebrow">${esc(fmtDay(new Date()))}</div><h1 class="pagettl">${hello}, ${esc(firstName(u.name))}</h1></div>
        <div class="quick">
          <button class="btn btn-primary" id="qSession">${I.plus}<span>Тренировка</span></button>
          <button class="btn btn-soft" id="qChild">${I.kids}<span>Дете</span></button>
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

  async function drawToday() {
    let d;
    try { d = await API.today(todayStr()); } catch (e) { return err(e); }
    const host = $('#todaySessions'); if (!host) return;
    if (!d.sessions.length) {
      host.innerHTML = emptyState(I.sun, 'Днес няма тренировки', 'Почивен ден или още не са добавени.',
        `<button class="btn btn-primary" id="emptyNew" style="margin-top:16px">${I.plus} Добави тренировка</button>`);
      $('#emptyNew').onclick = () => sessionForm(null, new Date());
    } else {
      host.innerHTML = d.sessions.map(s => todaySessionCard(s)).join('');
      d.sessions.forEach(s => bindTodayCard(s));
    }
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
      : `<div class="tcard-empty"><p class="subtle">Няма добавени деца.</p><button class="btn btn-soft btn-sm" data-open>${I.plus} Добави деца</button></div>`}
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

  function drawSide(d) {
    const side = $('#todaySide'); if (!side) return;
    const ico = { absence: '🚩', medical: '🩺', birthday: '🎂', contact: '📵' };
    const alerts = d.alerts || [];
    const cal = d.calendar || [];
    cal.forEach(ev => _gcalById[ev.key] = ev);
    const calCard = cal.length ? `
      <section class="card card-pad rise side-card">
        <div class="card-section-title"><span class="ico">${I.cal}</span>Днес в Google Calendar</div>
        <div class="up-list">${cal.map(ev => `
          <div class="gc-row ${ev.childId ? 'known' : ''}">
            <span class="up-t">${fmtTime(ev.startTime)}</span>
            <span class="gc-n">${ev.childName ? `<b>✓ ${esc(ev.childName)}</b>` : `<b>${esc(ev.title)}</b><small>непознат — кой е?</small>`}</span>
            <button class="btn ${ev.childId ? 'btn-primary' : 'btn-soft'} btn-sm" data-gk="${esc(ev.key)}">${ev.childId ? 'Добави' : 'Кой е?'}</button>
          </div>`).join('')}</div>
        ${cal.filter(e => e.childId).length > 1 ? `<button class="btn btn-ghost btn-sm" id="gcTodayAll" style="margin-top:10px">${I.plus} Добави всички разпознати</button>` : ''}
      </section>` : '';
    side.innerHTML = calCard + `
      <section class="card card-pad rise side-card">
        <div class="card-section-title"><span class="ico">${I.bell}</span>Внимание</div>
        ${alerts.length ? `<div class="alerts">${alerts.slice(0, 12).map(a => `
          <a class="alrt alrt-${a.level}" href="#/app/child/${a.childId}"><span class="alrt-i">${ico[a.kind] || '•'}</span>
            <span><b>${esc(a.childName)}</b><small>${esc(a.text)}</small></span></a>`).join('')}
          ${alerts.length > 12 ? `<p class="subtle" style="margin-top:8px">+${alerts.length - 12} още</p>` : ''}</div>`
        : `<p class="subtle">Всичко е наред — няма пропуски, изтекли медицински или липсващи телефони. 👌</p>`}
      </section>
      <section class="card card-pad rise side-card">
        <div class="card-section-title"><span class="ico">${I.cal}</span>Следващите дни</div>
        ${(d.upcoming || []).length ? `<div class="up-list">${d.upcoming.map(s => `
          <button class="up-item" data-sid="${s.id}" style="--gc:${s.groupColor || '#1F73E0'}">
            <span class="up-d">${esc(fmtShort(s.sessionDate))}</span><span class="up-t">${fmtTime(s.startTime)}</span>
            <span class="up-n">${esc(s.groupName || s.title || 'Тренировка')} · ${esc(firstName(s.coachName))}${s.status === 'cancelled' ? ' · ❌' : ''}</span>
            <span class="up-c">${s.participantCount || 0}</span></button>`).join('')}</div>`
        : `<p class="subtle">Няма планирани тренировки за следващите 7 дни.</p>`}
        <a class="btn btn-ghost btn-sm" href="#/app/calendar" style="margin-top:12px">Целият график ${I.arrowR}</a>
      </section>`;
    $$('.up-item', side).forEach(b => b.onclick = () => sessionDetail(b.dataset.sid, drawToday));
    $$('[data-gk]', side).forEach(b => b.onclick = () => {
      const ev = _gcalById[b.dataset.gk];
      if (ev.childId) importEvents([ev], drawToday, b); else gcalDetail(ev.key, drawToday);
    });
    const all = $('#gcTodayAll'); if (all) all.onclick = () => importEvents(cal.filter(e => e.childId), drawToday, all);
  }

  /* ============================================================
     ГРАФИК
     ============================================================ */
  const now = new Date();
  const calState = { y: now.getFullYear(), m: now.getMonth(), view: null };
  const prefView = () => { try { return localStorage.getItem('sws.calView'); } catch { return null; } };

  route(/^\/app\/calendar$/, async () => {
    if (!guard()) return;
    if (!calState.view) calState.view = prefView() || (innerWidth < 700 ? 'list' : 'month');
    shell('calendar', `
      <div class="page-head">
        <div><h1 class="pagettl">График</h1><p class="subtle">Тренировки по дни</p></div>
        <div class="quick">
          <button class="btn btn-soft" id="gcalBtn">${I.link}<span>Google Calendar</span></button>
          <button class="btn btn-primary hide-m" id="newSession">${I.plus}<span>Нова тренировка</span></button>
        </div>
      </div>
      <div class="card card-pad rise">
        <div class="cal-head">
          <div class="cal-nav"><button class="btn-icon btn-ghost" id="prevM" aria-label="Предишен месец">${I.chevL}</button></div>
          <div class="cal-title" id="calTitle"></div>
          <div class="cal-nav"><button class="btn-icon btn-ghost" id="nextM" aria-label="Следващ месец">${I.chevR}</button></div>
          <button class="btn btn-soft btn-sm" id="todayBtn" style="margin-left:auto">Днес</button>
          <div class="seg-mini" role="group" aria-label="Изглед">
            <button data-v="month" aria-label="Месец" title="Месец">${I.grid}</button>
            <button data-v="list" aria-label="Списък" title="Списък">${I.list}</button>
          </div>
        </div>
        <div id="calBody">${loading()}</div>
      </div>`);
    $('#newSession').onclick = () => sessionForm();
    $('#gcalBtn').onclick = () => calendarSync();
    $('#prevM').onclick = () => { calState.m--; if (calState.m<0){calState.m=11;calState.y--;} drawCalendar(); };
    $('#nextM').onclick = () => { calState.m++; if (calState.m>11){calState.m=0;calState.y++;} drawCalendar(); };
    $('#todayBtn').onclick = () => { calState.y=now.getFullYear(); calState.m=now.getMonth(); drawCalendar(); };
    const paintSeg = () => $$('.seg-mini button').forEach(b => b.classList.toggle('on', b.dataset.v === calState.view));
    $$('.seg-mini button').forEach(b => b.onclick = () => { calState.view = b.dataset.v; try { localStorage.setItem('sws.calView', b.dataset.v); } catch {} paintSeg(); drawCalendar(); });
    paintSeg();
    drawCalendar();
  });

  let calRenderToken = 0;
  let _monthCache = {};

  async function drawCalendar() {
    const myToken = ++calRenderToken;
    const t = $('#calTitle'); if (!t) return;
    t.textContent = `${MONTHS[calState.m]} ${calState.y}`;
    const body = $('#calBody');
    const key = calState.y + '-' + calState.m;
    if (_monthCache[key]) paintCalendar(_monthCache[key]); else body.innerHTML = loading();
    let list = [], calEvents = [], boot = null;
    try {
      [list, calEvents, boot] = await Promise.all([
        API.sessions(calState.y, calState.m + 1).then(r => r || []),
        API.calendarEvents(calState.y, calState.m + 1).then(r => r || []).catch(() => []),
        API.getBoot().catch(() => null)
      ]);
    } catch (e) { return err(e); }
    if (myToken !== calRenderToken) return;
    _monthCache[key] = { list, calEvents, boot };
    paintCalendar(_monthCache[key]);
  }

  function paintCalendar({ list, calEvents, boot }) {
    const body = $('#calBody'); if (!body) return;
    const cc = coachColors(boot);
    const byDay = {};
    list.forEach(s => { const d = parseD(s.sessionDate).getDate(); (byDay[d] ||= []).push(s); });
    Object.values(byDay).forEach(a => a.sort((x, y) => (x.startTime || '').localeCompare(y.startTime || '')));
    const byDayCal = {};
    calEvents = calEvents.filter(ev => !ev.sessionId); // внесените вече са тренировки
    calEvents.forEach(ev => { const d = parseD(ev.date).getDate(); (byDayCal[d] ||= []).push(ev); _gcalById[ev.key || ev.id] = ev; });
    const known = calEvents.filter(ev => ev.childId && !ev.allDay);
    const banner = known.length ? `<div class="gcal-banner"><span>${I.cal}</span><p>В Google Calendar разпознах <b>${known.length}</b> ${known.length === 1 ? 'тренировка' : 'тренировки'} с деца от отбора (${esc([...new Set(known.map(k => k.childName.split(' ')[0]))].slice(0, 4).join(', '))}${new Set(known.map(k => k.childName)).size > 4 ? '…' : ''}).</p><button class="btn btn-primary btn-sm" id="gcalImportAll">${I.plus} Добави ги в графика</button></div>` : '';

    // легенда: групи (ако има) иначе треньори
    const groups = (boot?.groups || []);
    let legend = groups.length
      ? groups.map(g => `<span class="legend-item"><span class="dot" style="background:${g.color}"></span>${esc(g.name)}</span>`).join('')
      : Object.values(cc).map(c => `<span class="legend-item"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</span>`).join('');
    if (calEvents.length) legend += `<span class="legend-item"><span class="dot dot-gcal"></span>Google Calendar (само преглед)</span>`;
    const legendHtml = (legend ? `<div class="coach-legend">${legend}</div>` : '') + banner;

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
                <div class="s">${esc(firstName(s.coachName))}${s.location ? ' · ' + esc(s.location) : ''} · ${s.markedCount ? `${s.presentCount}/${s.participantCount} дошли` : `${s.participantCount || 0} деца`}</div></div>
              ${I.chevR}</button>`).join('')}
            ${(byDayCal[d] || []).map(ev => `<button class="slot slot-gcal" data-gcal="${esc(ev.key || ev.id)}">
              <div class="slot-time">${ev.allDay ? 'ден' : fmtTime(ev.startTime)}</div>
              <div class="slot-main"><div class="t">${ev.childName ? '✓ ' + esc(ev.childName) : esc(ev.title)}</div><div class="s">Google Calendar · ${ev.childName ? esc(ev.title) : 'кой е това?'}</div></div>${I.chevR}</button>`).join('')}
          </div></div>`;
      }).join('')}</div>`;
      $$('.slot[data-sid]', body).forEach(el => el.onclick = () => sessionDetail(el.dataset.sid, refreshCal));
      $$('.slot[data-gcal]', body).forEach(el => el.onclick = () => gcalDetail(el.dataset.gcal));
      bindBanner(known);
      const t = $('#agToday'); if (t && !body.dataset.scrolled) { body.dataset.scrolled = '1'; t.scrollIntoView({ block: 'center' }); }
      return;
    }

    const first = new Date(calState.y, calState.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(calState.y, calState.m + 1, 0).getDate();
    let cells = DOW.map((d,i) => `<div class="cal-dow ${i>=5?'weekend':''}">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) cells += `<div class="cal-cell empty"></div>`;
    const MAX_EV = 3;
    for (let d = 1; d <= days; d++) {
      const arr = byDay[d] || [];
      const isToday = isThisMonth && today.getDate() === d;
      const dow = (offset + d - 1) % 7;
      const shown = arr.slice(0, MAX_EV);
      const rest = arr.length - shown.length;
      const events = shown.map(s => {
        const label = `${fmtTime(s.startTime)} ${s.groupName || firstName(s.coachName)}`;
        const title = `${fmtTime(s.startTime)} · ${s.groupName || ''} · ${s.coachName} · ${s.participantCount || 0} деца`;
        return `<div class="cal-ev ${s.status === 'cancelled' ? 'is-cancelled' : ''}" data-sid="${s.id}" style="--ec:${sessColor(s, cc)}" title="${esc(title)}"><b>${fmtTime(s.startTime)}</b> ${esc(s.groupName || s.title || firstName(s.coachName))}</div>`;
      }).join('') + (rest > 0 ? `<div class="cal-more">+${rest} още</div>` : '');
      const calArr = byDayCal[d] || [];
      const calPills = calArr.slice(0, 2).map(ev => `<div class="cal-ev cal-gcal ${ev.childId ? 'is-known' : ''}" data-gcal="${esc(ev.key || ev.id)}" title="${esc(ev.title)} (Google Calendar)${ev.childName ? ' → ' + esc(ev.childName) : ''}">${ev.allDay ? '' : `<b>${fmtTime(ev.startTime)}</b> `}${ev.childName ? `✓ ${esc(ev.childName)}` : esc(ev.title)}</div>`).join('')
        + (calArr.length > 2 ? `<div class="cal-more">+${calArr.length - 2} от календара</div>` : '');
      cells += `<div class="cal-cell ${isToday?'today':''} ${dow>=5?'weekend':''}" data-day="${d}">
        <div class="cal-daynum">${d}</div><div class="cal-events">${events}${calPills}</div></div>`;
    }
    body.innerHTML = `${legendHtml}<div class="cal-grid">${cells}</div>`;
    $$('.cal-cell[data-day]', body).forEach(c => c.onclick = () => dayModal(+c.dataset.day, byDay[+c.dataset.day] || [], byDayCal[+c.dataset.day] || [], cc));
    $$('.cal-ev[data-sid]', body).forEach(el => el.onclick = (e) => { e.stopPropagation(); sessionDetail(el.dataset.sid, refreshCal); });
    $$('.cal-ev[data-gcal]', body).forEach(el => el.onclick = (e) => { e.stopPropagation(); gcalDetail(el.dataset.gcal); });
    bindBanner(known);
  }
  function bindBanner(known) {
    const b = $('#gcalImportAll'); if (!b) return;
    b.onclick = () => importEvents(known, refreshCal, b);
  }
  const refreshCal = () => { _monthCache = {}; if ($('#calBody')) drawCalendar(); };

  // Внася събития от Google Calendar като тренировки (с детето вътре)
  async function importEvents(evs, after, btn) {
    if (btn) busy(btn, true, 'Добавяне…');
    try {
      const r = await API.importCalendarEvents(evs.map(ev => ({ key: ev.key, date: ev.date, startTime: ev.startTime, durationMin: ev.durationMin,
        location: ev.location, title: ev.title, childId: ev.childId || null })));
      toast(r.created ? `Добавени ${r.created} в графика` : 'Вече са в графика', 'ok');
      closeModal(); (after || refreshAll)();
      return r;
    } catch (e) { if (btn) busy(btn, false); err(e); }
  }

  // Събитие от Google Calendar: кой е това дете?
  async function gcalDetail(id, after) {
    const ev = _gcalById[id];
    if (!ev) return;
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
    const known = ev.childId && kids.find(k => k.id === ev.childId);
    const nameInCal = ev.guessName || ev.title;

    const chooser = () => `
      <div class="who">
        <h4>Кой е това?</h4>
        <p class="subtle small">Избери детето веднъж — после всяко събитие с „${esc(nameInCal)}" ще се познава само.</p>
        <label class="search" style="max-width:none;margin:10px 0">${I.search}<input class="input" id="whoQ" type="search" placeholder="Търси дете…" autocomplete="off"></label>
        <div class="who-list" id="whoList"></div>
        <div class="field" style="margin:14px 0 0"><label for="whoAlias">Как пише в календара</label><input class="input" id="whoAlias" value="${esc(nameInCal)}"><span class="hint">Може няколко, със запетая: „Йоан, Йоан П."</span></div>
        <button class="btn btn-soft btn-block" id="whoNew" style="margin-top:12px">${I.plus} Нов картон за „${esc(nameInCal)}"</button>
      </div>`;

    modal({ title: ev.title || 'Събитие', body: head + (known ? `
      <div class="who-ok">${S.avatar(known.firstName, known.lastName, 'av-lg')}
        <div><small>Това е</small><b>${esc(known.firstName)} ${esc(known.lastName)}</b><button class="linkbtn" id="notHim">Не е той/тя?</button></div></div>
      <p class="subtle small" style="margin-top:10px">Добави събитието като тренировка — ще можеш да отбележиш присъствие, умения и бележки и всичко отива в картона.</p>`
      : chooser()) + `<p class="subtle small" style="margin-top:14px">Събитието в Google Calendar не се променя.</p>`,
      footer: known
        ? `<a class="btn btn-ghost" href="#/app/child/${known.id}">${I.user} Картон</a><button class="btn btn-primary" id="gImport">${I.plus} Добави в графика</button>`
        : `<button class="btn btn-ghost" id="gImportNoKid">Добави без дете</button><button class="btn btn-ghost" data-close>Затвори</button>` });

    if (known) {
      $('#gImport').onclick = (e) => importEvents([ev], after, e.currentTarget);
      $('#notHim').onclick = () => { ev.childId = null; ev.childName = null; gcalDetail(id, after); };
      return;
    }
    $('#gImportNoKid').onclick = (e) => importEvents([{ ...ev, childId: null }], after, e.currentTarget);
    const paintList = (q = '') => {
      q = q.trim().toLowerCase();
      const g = (ev.guessName || '').toLowerCase();
      const list = kids.filter(k => !q || `${k.firstName} ${k.lastName}`.toLowerCase().includes(q))
        .sort((a, b) => (b.firstName.toLowerCase() === g) - (a.firstName.toLowerCase() === g));
      $('#whoList').innerHTML = list.slice(0, 8).map(k => `<button class="who-i" data-k="${k.id}">${S.avatar(k.firstName, k.lastName, 'av-sm')}<span>${esc(k.firstName)} ${esc(k.lastName)}</span>${I.chevR}</button>`).join('')
        || `<p class="subtle small">Няма такова дете — направи нов картон.</p>`;
      $$('#whoList .who-i').forEach(b => b.onclick = async () => {
        const kid = kids.find(k => k.id === b.dataset.k);
        busy(b, true, '');
        try {
          await API.linkCalendarName(kid.id, $('#whoAlias').value.trim() || nameInCal);
          toast(`Запомних: „${$('#whoAlias').value.trim() || nameInCal}" = ${kid.firstName}`, 'ok');
          importEvents([{ ...ev, childId: kid.id }], after);
        } catch (e) { busy(b, false); err(e); }
      });
    };
    paintList();
    $('#whoQ').oninput = (e) => paintList(e.target.value);
    $('#whoNew').onclick = () => {
      const alias = $('#whoAlias').value.trim() || nameInCal;
      S.childForm(null, { firstName: ev.guessName || '', calendarName: alias }, async (nc) => {
        await importEvents([{ ...ev, childId: nc.id }], after);
      });
    };
  }

  function dayModal(day, sessions, calEvents, cc) {
    const date = new Date(calState.y, calState.m, day);
    const rows = sessions.length ? sessions.map(s => `
      <button class="slot ${s.status === 'cancelled' ? 'is-cancelled' : ''}" data-sid="${s.id}" style="border-left:5px solid ${sessColor(s, cc)}">
        <div class="slot-time">${fmtTime(s.startTime)}</div>
        <div class="slot-main"><div class="t">${esc(s.groupName || s.title || s.coachName)}</div>
          <div class="s">${esc(s.coachName)}${s.location ? ' · ' + esc(s.location) : ''} · ${s.participantCount || 0} деца</div></div>
        ${I.chevR}
      </button>`).join('') : emptyState(I.cal, 'Няма тренировки', 'Добави първата за този ден.');
    const calRows = calEvents.map(ev => `
      <button class="slot slot-gcal" data-gcal="${esc(ev.key || ev.id)}"><div class="slot-time">${ev.allDay ? 'ден' : fmtTime(ev.startTime)}</div>
        <div class="slot-main"><div class="t">${ev.childName ? '✓ ' + esc(ev.childName) : esc(ev.title)}</div><div class="s">Google Calendar · ${ev.childName ? esc(ev.title) : 'кой е това?'}</div></div>${I.chevR}</button>`).join('');
    modal({ title: fmtDay(date), body: `<div class="stagger" style="display:grid;gap:12px">${rows}${calRows}</div>`,
      footer: `<button class="btn btn-ghost" data-close>Затвори</button><button class="btn btn-primary" id="addOnDay">${I.plus} Добави</button>` });
    $('#addOnDay').onclick = () => { closeModal(); sessionForm(null, date); };
    $$('#modal-host .slot[data-sid]').forEach(el => el.onclick = () => sessionDetail(el.dataset.sid, refreshCal));
    $$('#modal-host .slot[data-gcal]').forEach(el => el.onclick = () => gcalDetail(el.dataset.gcal));
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
    modal({ title: existing ? 'Редакция на тренировка' : 'Нова тренировка', body: `
      ${groups.length ? `<div class="field"><label>Група</label>
        <div class="gpick" id="gPick">
          <button type="button" class="gp ${!existing?.groupId ? 'on' : ''}" data-g="">Без група</button>
          ${groups.map(g => `<button type="button" class="gp ${existing?.groupId === g.id ? 'on' : ''}" data-g="${g.id}" style="--gc:${g.color}"><i></i>${esc(g.name)}<small>${g.count}</small></button>`).join('')}
        </div>
        ${existing ? '' : '<span class="hint">Децата от групата се добавят автоматично.</span>'}</div>` : ''}
      <div class="grid-2">
        <div class="field"><label for="s_date">Дата</label><input class="input" id="s_date" type="date" value="${d}"></div>
        <div class="field"><label for="s_time">Час</label><select class="select" id="s_time">${timeOptions(existing ? fmtTime(existing.startTime) : '17:00')}</select></div>
      </div>
      <div class="grid-2">
        <div class="field"><label for="s_coach">Треньор</label><select class="select" id="s_coach">${coaches.map(c => `<option value="${c.id}" ${coachSel === c.id ? 'selected' : ''}>${esc(c.fullName || c.email)}</option>`).join('')}</select></div>
        <div class="field"><label for="s_dur">Продължителност</label><select class="select" id="s_dur">${durOpts}</select></div>
      </div>
      <div class="field"><label for="s_loc">Място</label><input class="input" id="s_loc" placeholder="Басейн / зала" value="${esc(existing?.location || '')}"></div>
      ${existing ? '' : `
        <label class="switch"><input type="checkbox" id="s_rep"><span></span>Повтаряй всяка седмица</label>
        <div id="repBox" class="rep-box" hidden>
          <div class="field"><label>В кои дни</label><div class="daypick" id="dayPick">${DOW.map((x, i) => `<button type="button" data-d="${i + 1}">${x}</button>`).join('')}</div></div>
          <div class="field"><label for="s_until">До дата</label><input class="input" id="s_until" type="date"></div>
          <p class="hint" id="repInfo"></p>
        </div>`}
      <div class="field"><label for="s_notes">Бележки</label><textarea class="textarea" id="s_notes" placeholder="По желание">${esc(existing?.notes || '')}</textarea></div>
      ${existing?.seriesId ? `<label class="switch"><input type="checkbox" id="s_series"><span></span>Приложи и за следващите от серията</label>` : ''}`,
      footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="s_save">${I.check} Запази</button>` });

    let groupId = existing?.groupId || '';
    $$('#gPick .gp').forEach(b => b.onclick = () => {
      groupId = b.dataset.g; $$('#gPick .gp').forEach(x => x.classList.toggle('on', x === b));
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
        notes: $('#s_notes').value.trim() || null };
      if (!dto.sessionDate) return toast('Избери дата', 'err');
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
        toast(r.count > 1 ? `Създадени ${r.count} тренировки` : 'Създадено', 'ok');
        closeModal(); refreshCal(); (after || refreshAll)();
        if (r.count === 1) sessionDetail(r.id, after || refreshAll);
      } catch (e) { busy(btn, false); err(e); }
    };
  }
  // Обновява екрана, на който сме
  function refreshAll() { if ($('#todaySessions')) drawToday(); if ($('#calBody')) refreshCal(); }

  /* ---------- Детайли на тренировка: присъствие с едно докосване ---------- */
  async function sessionDetail(id, after) {
    after = after || refreshAll;
    modal({ title: 'Тренировка', body: loading(3, 60), large: true });
    $('#modal-host .modal').classList.add('modal-tall');
    let s, boot;
    try { [s, boot] = await Promise.all([API.session(id), API.getBoot()]); }
    catch (e) { closeModal(); return err(e); }
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
      </div>
      ${s.notes && !s.fromCalendar ? `<p class="note">${esc(s.notes)}</p>` : ''}
      <div class="act-row">
        <button class="act" id="sdEdit"><span>${I.edit}</span>Редакция</button>
        <a class="act" target="_blank" rel="noopener" href="${gcalTemplate(s)}"><span>${I.cal}</span>В календара</a>
        <button class="act" id="sdCancel"><span>${cancelled ? I.refresh : I.ban}</span>${cancelled ? 'Възстанови' : 'Отмени'}</button>
        <button class="act act-red" id="sdDel"><span>${I.trash}</span>Изтрий</button>
      </div>
      <div class="sd-head">
        <strong>Деца <span class="badge" id="sdSum"></span></strong>
        <div class="sd-add">
          ${parts.some(p => p.attended === null) ? `<button class="btn btn-soft btn-sm" id="allIn">${I.check} Всички са тук</button>` : ''}
          ${addGroups.length ? `<select class="select select-sm" id="addGroup" aria-label="Добави група"><option value="">+ Група…</option>${addGroups.map(g => `<option value="${g.id}">${esc(g.name)} (${g.count})</option>`).join('')}</select>` : ''}
          ${addable.length ? `<select class="select select-sm" id="addChild" aria-label="Добави дете"><option value="">+ Дете…</option>${addable.map(c => `<option value="${c.id}">${esc(c.firstName + ' ' + c.lastName)}</option>`).join('')}</select>` : ''}
        </div>
      </div>
      <div class="klist" id="partList">${parts.length ? parts.map(p => kidRow(p, { details: true })).join('') : emptyState(I.kids, 'Още няма деца', 'Добави група или отделно дете от менюто горе.')}</div>
      <p class="hint" style="margin-top:10px">Докосни ✓ или ✗ — записва се веднага. ✎ отваря бележките за детето.</p>`;
    $('#modal-host .modal-body').innerHTML = body;

    const list = $('#partList');
    const sum = () => { const c = attCount(list); $('#sdSum').textContent = c.total ? `${c.present}/${c.total}` : '0'; };
    sum();
    let dirty = false;
    bindAtt(list, async (cid, v) => { await API.upsertParticipant(id, { childId: cid, attended: v }); dirty = true; });
    list.addEventListener('attchange', sum);
    bindAlerts(list);
    $$('[data-more]', list).forEach(b => b.onclick = () => {
      const cid = b.closest('[data-cid]').dataset.cid;
      participantNotes(s, parts.find(p => p.childId === cid), after);
    });
    // затваряне → обнови екрана отдолу, ако нещо е променено
    $$('#modal-host [data-close]').forEach(b => b.addEventListener('click', () => { if (dirty) after(); }));

    $('#sdEdit').onclick = () => sessionForm(s, null, after);
    $('#sdCancel').onclick = async () => {
      if (!cancelled && !await ask('Отмяна на тренировката', 'Тренировката остава в графика, но се отбелязва като отменена и не се брои в посещаемостта.', 'Отмени тренировката', true)) return sessionDetail(id, after);
      try { await API.cancelSession(id, !cancelled); toast(cancelled ? 'Възстановена' : 'Отменена', 'ok'); refreshCal(); after(); sessionDetail(id, after); } catch (e) { err(e); }
    };
    $('#sdDel').onclick = () => deleteSessionFlow(s, after);
    const allIn = $('#allIn');
    if (allIn) allIn.onclick = async () => {
      const boxes = $$('[data-att]', list).filter(b => b.dataset.att === '');
      boxes.forEach(b => paintAtt(b, '1')); sum(); busy(allIn, true);
      try { await API.markAttendance(id, boxes.map(b => ({ childId: b.closest('[data-cid]').dataset.cid, attended: true }))); dirty = true; allIn.remove(); toast('Отбелязано', 'ok'); }
      catch (e) { boxes.forEach(b => paintAtt(b, '')); sum(); busy(allIn, false); err(e); }
    };
    const addSel = $('#addChild');
    if (addSel) addSel.onchange = async () => {
      if (!addSel.value) return;
      addSel.disabled = true;
      try { await API.upsertParticipant(id, { childId: addSel.value, attended: true }); toast('Добавено', 'ok'); after(); sessionDetail(id, after); } catch (e) { addSel.disabled = false; err(e); }
    };
    const addG = $('#addGroup');
    if (addG) addG.onchange = async () => {
      if (!addG.value) return;
      addG.disabled = true;
      try { const r = await API.addGroupToSession(id, addG.value); toast(r.added ? `Добавени ${r.added} деца` : 'Всички вече са тук', 'ok'); after(); sessionDetail(id, after); } catch (e) { addG.disabled = false; err(e); }
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

  // Бележки за едно дете в една тренировка
  function participantNotes(s, p, after) {
    modal({ title: `${p.childName} · ${fmtShort(s.sessionDate)}`, body: `
      ${p.medicalAlert ? `<div class="med-banner">${I.alert}<span>${esc(p.medicalAlert)}</span></div>` : ''}
      <div class="field"><label>Присъствие</label>${attButtons(p.attended, 'att2-lg')}</div>
      <div class="field"><label for="pn_swam">Какво плува</label><textarea class="textarea" id="pn_swam" placeholder="напр. 6×25 крака гръб, дишане настрани…">${esc(p.swamWhat || '')}</textarea>
        <div class="qchips" data-for="pn_swam">${['крака с дъска','звездичка','плъзгане','дишане','кроул','гръб','скокове','игри във водата'].map(x => `<button type="button">${x}</button>`).join('')}</div></div>
      <div class="field"><label>Настроение</label><div class="moodpick" id="pn_mood">${MOODS.map(m => `<button type="button" data-m="${m}" class="${p.mood === m ? 'on' : ''}" title="${m}">${MOOD_EMOJI[m]}</button>`).join('')}</div></div>
      <div class="field"><label for="pn_prog">Какво постигна днес <span class="subtle">(за треньорите)</span></label><textarea class="textarea" id="pn_prog" placeholder="Напр. първи път без коланче!">${esc(p.dailyProgress || '')}</textarea></div>
      <div class="field"><label for="pn_parent">Бележка за родителя <span class="subtle">(вижда я)</span></label><textarea class="textarea" id="pn_parent" placeholder="Напр. Браво! Днес доплува 10 м сама 💪">${esc(p.parentNote || '')}</textarea></div>
      <button class="btn btn-ghost btn-sm" id="pn_rm" style="color:var(--red)">${I.trash} Махни от тренировката</button>`,
      footer: `<button class="btn btn-ghost" id="pn_back">${I.chevL} Назад</button><button class="btn btn-primary" id="pn_save">${I.check} Запази</button>` });
    const box = $('#modal-host [data-att]');
    let att = p.attended;
    $$('.att2-b', box).forEach(b => b.onclick = () => { const v = box.dataset.att === b.dataset.v ? '' : b.dataset.v; paintAtt(box, v); att = v === '' ? null : v === '1'; });
    let mood = p.mood || null;
    $$('#pn_mood button').forEach(b => b.onclick = () => { mood = mood === b.dataset.m ? null : b.dataset.m; $$('#pn_mood button').forEach(x => x.classList.toggle('on', x.dataset.m === mood)); });
    $$('.qchips button').forEach(b => b.onclick = () => { const ta = $('#' + b.parentElement.dataset.for); ta.value = (ta.value.trim() ? ta.value.trim() + ', ' : '') + b.textContent; ta.focus(); });
    $('#pn_back').onclick = () => sessionDetail(s.id, after);
    $('#pn_rm').onclick = async () => {
      if (!await ask('Махане', `Да махна ли ${esc(p.childName)} от тази тренировка?`, 'Махни', true)) return participantNotes(s, p, after);
      try { await API.removeParticipant(s.id, p.childId); toast('Махнато', 'ok'); after(); sessionDetail(s.id, after); } catch (e) { err(e); }
    };
    $('#pn_save').onclick = async (ev) => {
      busy(ev.currentTarget, true, 'Запис…');
      try {
        await API.upsertParticipant(s.id, { childId: p.childId, attended: att, mood,
          swamWhat: $('#pn_swam').value.trim() || null, dailyProgress: $('#pn_prog').value.trim() || null,
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

  /* ---------- Абонамент в Google Calendar ---------- */
  async function calendarSync() {
    modal({ title: 'Google Calendar', body: loading(2, 60) });
    let f;
    try { f = await API.calendarFeed(); } catch (e) { closeModal(); return err(e); }
    const base = API.getBase();
    const urlAll = `${base}?ics=${f.key}`;
    const urlMine = `${urlAll}&coach=${encodeURIComponent(f.coachId)}`;
    const sub = (u) => 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(u.replace(/^https?:/, 'webcal:'));
    const isOwner = (API.getUser() || {}).role === 'owner';
    $('#modal-host .modal-body').innerHTML = `
      <p>Тренировките се появяват автоматично в твоя Google Calendar и на телефона. Промените в графика се синхронизират сами (Google проверява на няколко часа).</p>
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
      if (!await ask('Нов адрес', 'Всички, които са абонирани със стария адрес, ще трябва да добавят новия.', 'Смени', true)) return calendarSync();
      try { await API.calendarFeed(true); toast('Новият адрес е готов', 'ok'); calendarSync(); } catch (e) { err(e); }
    };
  }

  Object.assign(S, { sessionForm, sessionDetail, calendarSync, attButtons, paintAtt, bindAtt, kidRow, refreshAll });
})();

// Първото рисуване — след като се заредят всички скриптове (coach, parent, landing)
document.addEventListener('DOMContentLoaded', () => window.__SWS.render());
