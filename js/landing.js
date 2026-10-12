/* ============================================================
   SwimWithSmile — Публичен сайт, регистрация, покани и „Отбор"
   ------------------------------------------------------------
   • Начална страница (/)          • Вход (/login)
   • Регистрация на отбор (/register)
   • Присъединяване с покана (/join/КОД)
   • Страница „Отбор" в приложението (/app/team)
   + малък двигател за анимации при скрол и 3D вода върху <canvas>
   ============================================================ */
(() => {
  const S = window.__SWS;
  const { app, route, navigate, toast, err, modal, closeModal, onLeave, logoMark, openConfig,
    shell, guard, I, esc, $, $$, initials } = S;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Цени (в евро). Годишно = 20% отстъпка. Плащанията още не са свързани.
  const PLANS = [
    { key: 'solo', name: 'Соло', month: 0, year: 0, seats: 1, kids: 15,
      tag: 'За треньор, който тепърва започва',
      feats: ['1 треньор', 'До 15 деца', 'График, картони и дневник', 'Карти за напредък и награди', 'Родителски достъп с код'] },
    { key: 'team', name: 'Отбор', month: 9, year: 7, seats: 3, kids: 60, featured: true,
      tag: 'За двама-трима треньори с общи деца',
      feats: ['До 3 треньори', 'До 60 деца', 'Покана за колега с линк', 'Цвят за всеки треньор в графика', 'Всичко от „Соло"'] },
    { key: 'club', name: 'Клуб', month: 19, year: 15, seats: 10, kids: 300,
      tag: 'За плувен клуб с няколко групи',
      feats: ['До 10 треньори', 'До 300 деца', 'Приоритетна поддръжка', 'Помощ при прехвърляне на данни', 'Всичко от „Отбор"'] },
  ];
  const planByKey = (k) => PLANS.find(p => p.key === k) || PLANS[0];

  /* ============================================================
     Типография: разделяне на заглавие на думи за поетапна поява.
     *дума* = акцентирана дума, \n = нов ред.
     ============================================================ */
  function split(text, start = 0) {
    let i = start;
    return text.split('\n').map(line => line.split(' ').filter(Boolean).map(w => {
      const m = w.match(/^\*(.+)\*([.,!?:;]*)$/);
      const inner = `<span class="sw-i${m ? ' hl' : ''}" style="--i:${i++}">${esc(m ? m[1] : w)}</span>${m && m[2] ? `<span class="sw-i" style="--i:${i - 1}">${esc(m[2])}</span>` : ''}`;
      return `<span class="sw">${inner}</span>`;
    }).join(' ')).join('<br>');
  }

  /* ============================================================
     Двигател за движение
     data-reveal       — поява при влизане в екрана (up | left | right | scale | fade)
     data-scroll       — задава --p (-1…1) според позицията спрямо центъра на екрана
     data-tilt         — 3D накланяне под мишката (само с мишка)
     ============================================================ */
  function mountMotion(root) {
    const offs = [];
    const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };

    // — поява —
    const revealEls = $$('[data-reveal]', root);
    if (REDUCED || !('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      revealEls.forEach(el => io.observe(el));
      offs.push(() => io.disconnect());
    }

    // — скрол: прогрес, навигация, 3D сцени —
    const scrollEls = $$('[data-scroll]', root);
    const docEl = document.documentElement;
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      const max = docEl.scrollHeight - vh;
      docEl.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);
      document.body.classList.toggle('is-scrolled', scrollY > 12);
      if (REDUCED) return;
      for (const el of scrollEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh * .5 || r.top > vh * 1.5) continue;
        const p = clamp(((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        el.style.setProperty('--p', p.toFixed(4));
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    on(window, 'scroll', onScroll, { passive: true });
    on(window, 'resize', onScroll);
    update();

    // — 3D накланяне —
    if (FINE_POINTER && !REDUCED) {
      $$('[data-tilt]', root).forEach(el => {
        const max = +el.dataset.tilt || 8;
        let raf = 0;
        on(el, 'pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            el.style.setProperty('--rx', ((.5 - y) * max).toFixed(2) + 'deg');
            el.style.setProperty('--ry', ((x - .5) * max).toFixed(2) + 'deg');
            el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
            el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
            el.classList.add('is-tilting');
          });
        });
        on(el, 'pointerleave', () => {
          cancelAnimationFrame(raf);
          el.classList.remove('is-tilting');
          el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
        });
      });
    }

    return () => { offs.forEach(f => f()); document.body.classList.remove('is-scrolled'); };
  }

  /* ============================================================
     3D вода — перспективна мрежа от точки върху <canvas>.
     Без библиотеки; спира, когато не се вижда.
     ============================================================ */
  function waterMesh(canvas, { horizon = .38, tint = [70, 214, 247], lines = true } = {}) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, t = Math.random() * 100;
    let cols = 56, rows = 26;
    const ZMIN = 1.4, ZMAX = 16, CAM = 1.15;
    const ripple = { x: 0, z: 6, a: 0 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = W < 720;
      cols = small ? 30 : 58; rows = small ? 18 : 26;
      if (REDUCED) draw();
    };

    const height = (x, z) =>
      .16 * Math.sin(x * 1.3 + t * .9) +
      .12 * Math.sin(z * .9 - t * 1.25) +
      .06 * Math.sin((x * .8 + z * 1.4) + t * 1.9) +
      ripple.a * Math.exp(-((x - ripple.x) ** 2 + (z - ripple.z) ** 2) * .6) * Math.cos(Math.hypot(x - ripple.x, z - ripple.z) * 4 - t * 6);

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const f = W * .55, cx = W / 2, hy = H * horizon;
      const [r, g, b] = tint;
      for (let j = 0; j < rows; j++) {
        const k = j / (rows - 1);
        const z = ZMAX - (ZMAX - ZMIN) * Math.pow(k, 1.35);      // далече → близо
        const depth = 1 - (z - ZMIN) / (ZMAX - ZMIN);             // 0 далече, 1 близо
        const halfX = (W / 2) / f * z * 1.12;
        const alpha = Math.pow(depth, 1.4) * .85 + .05;
        const dot = .6 + depth * 1.9;
        if (lines) { ctx.beginPath(); }
        for (let i = 0; i < cols; i++) {
          const u = i / (cols - 1) * 2 - 1;
          const x = u * halfX;
          const y = height(x, z);
          const sx = cx + (x / z) * f;
          const sy = hy + ((CAM - y) / z) * f * .62;
          if (lines) { i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }
          const crest = clamp((y + .25) / .5, 0, 1);
          ctx.fillStyle = `rgba(${r + (255 - r) * crest * .5 | 0},${g + (255 - g) * crest * .5 | 0},${b},${(alpha * (.55 + crest * .45)).toFixed(3)})`;
          ctx.fillRect(sx - dot / 2, sy - dot / 2, dot, dot);
        }
        if (lines) {
          ctx.strokeStyle = `rgba(${r},${g},${b},${(alpha * .16).toFixed(3)})`;
          ctx.lineWidth = .8;
          ctx.stroke();
        }
      }
    }

    const loop = () => {
      t += .016; ripple.a *= .975;
      draw();
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && !REDUCED) raf = requestAnimationFrame(loop); };

    // мишката/пръстът „чукат" по водата
    const poke = (e) => {
      const r = canvas.getBoundingClientRect();
      const sy = e.clientY - r.top, sx = e.clientX - r.left;
      const f = W * .55, hy = H * horizon;
      if (sy <= hy + 4) return;
      const z = clamp((CAM * f * .62) / (sy - hy), ZMIN, ZMAX);
      ripple.x = (sx - W / 2) / f * z; ripple.z = z; ripple.a = Math.max(ripple.a, .28);
    };
    const host = canvas.parentElement;
    let lastPoke = 0;
    const onMove = (e) => { const n = performance.now(); if (n - lastPoke > 120) { lastPoke = n; poke(e); } };
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', poke, { passive: true });

    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden) start(); };
    document.addEventListener('visibilitychange', onVis);
    resize(); REDUCED ? draw() : start();

    return () => {
      cancelAnimationFrame(raf); raf = 0; ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerdown', poke);
    };
  }

  // Мехурчета, които се издигат (чист CSS, различни размери/скорости)
  const bubbles = (n = 14) => `<div class="bubbles" aria-hidden="true">${Array.from({ length: n }, (_, i) => {
    const s = 4 + ((i * 37) % 14), x = (i * 61) % 100, d = 9 + ((i * 17) % 10), dl = -((i * 23) % 18);
    return `<span style="--s:${s}px;--x:${x}%;--d:${d}s;--dl:${dl}s"></span>`;
  }).join('')}</div>`;

  // Въже между коридорите — разделител с „мъниста"
  const laneRope = (cls = '') => `<div class="lane-rope ${cls}" aria-hidden="true"></div>`;

  const eyebrow = (no, text, dark) => `<div class="eyebrow ${dark ? 'eyebrow-dark' : ''}" data-reveal="up"><span class="lane-no">${no}</span><span>${text}</span></div>`;

  /* ============================================================
     Макети на приложението (за 3D сцените)
     ============================================================ */
  function phoneCoachUI() {
    const dots = { 2: ['a'], 4: ['b'], 7: ['a', 'b'], 9: ['a'], 11: ['b'], 14: ['a', 'b'], 16: ['a'], 18: ['b'], 21: ['a', 'b'], 23: ['a'], 25: ['b'], 28: ['a'] };
    let cal = '';
    for (let d = 1; d <= 35; d++) {
      const n = d - 2;
      const ok = n >= 1 && n <= 31;
      cal += `<i class="${n === 14 ? 'today' : ''}${ok ? '' : ' off'}">${ok ? n : ''}${ok && dots[n] ? `<b>${dots[n].map(c => `<u class="c-${c}"></u>`).join('')}</b>` : ''}</i>`;
    }
    return `
      <div class="ph-status"><span>17:02</span><span class="ph-isl"></span><span class="ph-sig"><i></i><i></i><i></i></span></div>
      <div class="ph-top"><div><small>График</small><strong>Октомври</strong></div><span class="ph-add">+</span></div>
      <div class="ph-dow"><i>пн</i><i>вт</i><i>ср</i><i>чт</i><i>пт</i><i>сб</i><i>нд</i></div>
      <div class="ph-cal">${cal}</div>
      <div class="ph-card">
        <div class="ph-card-h"><span class="ph-time">17:00</span><span class="ph-pill c-b">Доника</span></div>
        <div class="ph-card-t">Басейн · Група „Делфини“</div>
        <div class="ph-avs"><span>А</span><span>Б</span><span>К</span><span>М</span><em>+3</em></div>
      </div>
      <div class="ph-row"><span class="ph-ok">${I.check}</span><div><b>Ани</b><small>6×25 крака гръб · 😄</small></div></div>
      <div class="ph-row"><span class="ph-ok">${I.check}</span><div><b>Бобо</b><small>Скок от блок · 🙂</small></div></div>
      <div class="ph-tabbar"><i class="on">${I.cal}</i><i>${I.kids}</i><i>${I.trophy}</i><i>${I.team}</i></div>`;
  }

  function phoneParentUI() {
    return `
      <div class="ph-status"><span>19:30</span><span class="ph-isl"></span><span class="ph-sig"><i></i><i></i><i></i></span></div>
      <div class="pp-hero"><div class="pp-av">АП</div><div><strong>Ани Петрова</strong><small>8 години · Ниво 2</small></div></div>
      <div class="pp-sec">Напредък · Есен</div>
      <div class="pp-bar"><span>Издръжливост</span><em>72%</em><i style="--w:72%"></i></div>
      <div class="pp-bar"><span>Координация</span><em>64%</em><i style="--w:64%"></i></div>
      <div class="pp-bar"><span>Сила</span><em>58%</em><i style="--w:58%"></i></div>
      <div class="pp-sec">Постижения</div>
      <div class="pp-ach"><span>🏊</span><div><b>Първи 25 метра</b><small>🎁 стикер</small></div></div>
      <div class="pp-ach"><span>🚀</span><div><b>Скок от стартов блок</b><small>🎁 медал</small></div></div>
      <div class="pp-sec">Последни тренировки</div>
      <div class="pp-ach pp-hist"><span>${I.cal}</span><div><b>14 окт · 17:00</b><small>водена от Доника</small></div></div>`;
  }

  /* ============================================================
     Навигация на сайта
     ============================================================ */
  const NAV = [['how', 'Как работи'], ['features', 'Функции'], ['parents', 'Родители'], ['pricing', 'Цени'], ['faq', 'Въпроси']];

  function siteNav() {
    const authed = API.isAuthed();
    const cta = authed
      ? `<a class="btn btn-sun btn-sm" href="#/app/today">Към приложението ${I.arrowR}</a>`
      : `<a class="nav-login" href="#/login">Вход</a><a class="btn btn-sun btn-sm" href="#/register">Създай отбор</a>`;
    return `
      <div class="scroll-progress" aria-hidden="true"></div>
      <header class="site-nav">
        <div class="site-nav-in">
          <a class="brand" href="#/" data-go="top" aria-label="SwimWithSmile — начало">${logoMark(36)}<span class="brand-name">Swim<span>With</span>Smile</span></a>
          <nav class="site-links" aria-label="Секции">${NAV.map(([id, l]) => `<button type="button" data-go="${id}">${l}</button>`).join('')}</nav>
          <div class="site-cta">${cta}</div>
          <button class="burger" type="button" id="burger" aria-label="Меню" aria-expanded="false"><span></span><span></span></button>
        </div>
      </header>
      <div class="menu-sheet" id="menuSheet" aria-hidden="true">
        <nav>${NAV.map(([id, l], i) => `<button type="button" data-go="${id}" style="--i:${i}"><span class="lane-no">${{ how: '01', features: '02', parents: '04', pricing: '05', faq: '06' }[id]}</span>${l}</button>`).join('')}</nav>
        <div class="menu-cta">${authed
          ? `<a class="btn btn-sun btn-lg btn-block" href="#/app/today">Към приложението ${I.arrowR}</a>`
          : `<a class="btn btn-sun btn-lg btn-block" href="#/register">Създай отбор безплатно</a><a class="btn btn-glass btn-lg btn-block" href="#/login">Вход</a>`}</div>
      </div>`;
  }

  function bindSiteNav() {
    const burger = $('#burger'), sheet = $('#menuSheet');
    const setMenu = (open) => {
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open); sheet.setAttribute('aria-hidden', !open);
    };
    burger.onclick = () => setMenu(!document.body.classList.contains('menu-open'));
    $$('[data-go]').forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      setMenu(false);
      const id = b.dataset.go;
      if (id === 'top') return window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      const target = document.getElementById('sec-' + id);
      if (target) target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    }));
    // активна секция в навигацията
    const links = $$('.site-links [data-go]');
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id.replace('sec-', '');   // „hero" → нито една активна
      links.forEach(l => l.classList.toggle('active', l.dataset.go === id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['hero', ...NAV.map(n => n[0])].forEach(id => { const s = document.getElementById(id === 'hero' ? 'hero' : 'sec-' + id); if (s) io.observe(s); });
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', onKey);
    onLeave(() => { io.disconnect(); document.removeEventListener('keydown', onKey); setMenu(false); });
  }

  /* ============================================================
     НАЧАЛНА СТРАНИЦА
     ============================================================ */
  route(/^\/$/, () => {
    document.body.classList.remove('has-topbar');
    document.body.classList.add('is-site');
    onLeave(() => document.body.classList.remove('is-site'));

    const marquee = ['График + Google Calendar', 'Присъствие с едно докосване', 'Картони със спешни телефони', 'Умения и нива', 'Точки и награди', 'Състезания и лични рекорди', 'Родителски достъп', 'Имейл известия', 'Деца със СОП', 'Групи'];

    app.innerHTML = `
      ${siteNav()}
      <main class="site">

        <!-- ===================== HERO ===================== -->
        <section class="hero" id="hero">
          <div class="hero-bg" aria-hidden="true">
            <div class="rays"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="hero-glow"></div>
            <canvas class="hero-water" id="heroWater"></canvas>
            ${bubbles(16)}
          </div>
          <div class="hero-in">
            <div class="hero-copy">
              <div class="hero-badge" data-reveal="up"><span class="pulse"></span>Безплатно · за треньори и плувни клубове</div>
              <h1 class="hero-h" data-reveal="words">${split('Дневникът на\nтреньора\nпо *плуване.*')}</h1>
              <p class="hero-sub" data-reveal="up" style="--d:.35s"><b>График, присъствие, картони и награди</b> за всяко дете — на едно място, от телефона. Родителите виждат напредъка, а ти — кой изпуска тренировки.</p>
              <div class="hero-ctas" data-reveal="up" style="--d:.5s">
                <a class="btn btn-sun btn-xl" href="#/register">Създай отбор безплатно ${I.arrowR}</a>
                <button class="btn btn-glass btn-xl" type="button" data-go="how">Виж как работи</button>
              </div>
              <ul class="hero-proof" data-reveal="up" style="--d:.65s">
                <li>${I.check}Без банкова карта</li><li>${I.check}Свързва се с Google Calendar</li><li>${I.check}Работи на телефона</li>
              </ul>
            </div>

            <div class="hero-stage" data-scroll data-reveal="up" style="--d:.25s" aria-hidden="true">
              <div class="stage-3d" data-tilt="10">
                <div class="phone phone-hero">
                  <div class="phone-screen">${phoneCoachUI()}</div>
                  <div class="phone-glare"></div>
                </div>
                <div class="float-card fc-ach"><span class="fc-ico gold">🏅</span><div><small>Нова награда</small><b>Бобо · Първи 25 метра</b></div></div>
                <div class="float-card fc-note"><span class="fc-av c-b">Д</span><div><small>Доника · преди 2 мин</small><b>Ани доплува 25 м без дъска! 🎉</b></div></div>
                <div class="float-card fc-prog"><div class="fc-prog-h"><small>Издръжливост</small><span class="trend-chip">${I.up}8%</span></div><b>72%</b><div class="fc-track"><i></i></div></div>
              </div>
            </div>
          </div>
          <button class="scroll-cue" type="button" data-go="how" aria-label="Надолу"><span></span></button>
          <svg class="hero-wave" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
            <path class="w1" d="M0,70 C180,110 360,20 540,50 C720,80 900,130 1080,90 C1260,50 1350,40 1440,60 L1440,140 L0,140 Z"/>
            <path class="w2" d="M0,95 C200,60 380,120 600,100 C820,80 980,50 1180,85 C1300,105 1380,100 1440,92 L1440,140 L0,140 Z"/>
          </svg>
        </section>

        <!-- ===================== ЛЕНТА ===================== -->
        <div class="marquee" aria-label="Какво включва">
          <div class="marquee-track">${[0, 1].map(k => `<div class="marquee-row" ${k ? 'aria-hidden="true"' : ''}>${marquee.map(m => `<span>${m}</span><i>●</i>`).join('')}</div>`).join('')}</div>
        </div>

        <!-- ===================== КАК РАБОТИ ===================== -->
        <section class="sec" id="sec-how">
          <div class="container">
            ${eyebrow('01', 'Как работи')}
            <h2 class="sec-h" data-reveal="words">${split('От регистрация до първата\nтренировка — *за* *минути.*')}</h2>
            <div class="steps">
              ${laneRope('steps-rope')}
              ${[
                ['Създай отбор', 'Регистрираш се, кръщаваш отбора и добавяш децата и групите. Без инсталиране, направо от телефона.', I.user],
                ['Покани колега', 'Изпращаш един линк на втория треньор. Вече виждате едни и същи деца, графици и бележки.', I.share],
                ['Отбелязвай на ръба на басейна', 'Отваряш „Днес“ и чукаш ✓ до всяко дете. Умения, награди и бележки — с едно докосване. Родителите виждат всичко с код.', I.check],
              ].map(([t, d, ic], i) => `
                <article class="step" data-reveal="up" style="--d:${i * .12}s">
                  <div class="step-no"><span>${i + 1}</span></div>
                  <div class="step-ico">${ic}</div>
                  <h3>${t}</h3>
                  <p>${d}</p>
                </article>`).join('')}
            </div>
          </div>
        </section>

        <!-- ===================== ФУНКЦИИ ===================== -->
        <section class="sec sec-tint" id="sec-features">
          <div class="container">
            ${eyebrow('02', 'Функции')}
            <div class="sec-head-row">
              <h2 class="sec-h" data-reveal="words">${split('Всичко за басейна.\n*Нищо* излишно.')}</h2>
              <p class="sec-lead" data-reveal="up" style="--d:.2s">Направено от треньори, които пишеха бележки по тетрадки, чатове и листчета. Сега всичко е на едно място и се пише с палец между две серии.</p>
            </div>

            <div class="bento">
              <article class="tile tile-cal" data-reveal="up" data-tilt="5">
                <div class="tile-txt"><span class="tile-k">${I.cal} График</span><h3>Графикът е и в Google Calendar</h3><p>Повтарящи се тренировки за цяла група с един клик. Всичко се появява само в календара на телефона ти.</p></div>
                <div class="mini-cal" aria-hidden="true">
                  ${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'].map(d => `<b>${d}</b>`).join('')}
                  ${Array.from({ length: 14 }, (_, i) => {
                    const ev = { 0: [['a', '17:00 Никола']], 2: [['b', '16:30 Доника']], 3: [['a', '18:00 Никола'], ['b', '18:00 Доника']], 7: [['b', '17:00 Доника']], 9: [['a', '17:30 Никола']], 10: [['a', '17:00 Никола'], ['b', '19:00 Доника']], 12: [['b', '10:00 Доника']] }[i] || [];
                    return `<div class="${i === 9 ? 'today' : ''}"><span>${i + 6}</span>${ev.map(([c, t]) => `<em class="c-${c}">${t}</em>`).join('')}</div>`;
                  }).join('')}
                </div>
              </article>

              <article class="tile tile-log" data-reveal="up" style="--d:.08s" data-tilt="6">
                <div class="tile-txt"><span class="tile-k">${I.check} Присъствие</span><h3>Кой дойде — с едно докосване</h3><p>Сигнал, когато дете изпусне 2 поредни тренировки. За децата със СОП постоянството е всичко.</p></div>
                <div class="mini-log" aria-hidden="true">
                  <div class="ml-seg"><span class="on">${I.check} Присъства</span><span>Отсъства</span></div>
                  <div class="ml-field"><small>Какво плува</small><p>6×25 крака гръб, дишане настрани<span class="caret"></span></p></div>
                  <div class="ml-moods"><span>😄</span><span class="on">🙂</span><span>😐</span><span>😴</span></div>
                </div>
              </article>

              <article class="tile tile-prog" data-reveal="up" style="--d:.16s" data-tilt="6">
                <div class="tile-txt"><span class="tile-k">${I.up} Напредък</span><h3>Карти, които показват растеж</h3><p>Сила, гъвкавост, издръжливост и още. Стрелките показват промяната спрямо миналата оценка.</p></div>
                <div class="mini-prog" aria-hidden="true">
                  ${[['Сила', 58, 6], ['Гъвкавост', 81, 12], ['Издръжливост', 72, 8], ['Координация', 64, -3]].map(([l, v, d], i) => `
                    <div class="mp-row" style="--w:${v}%;--i:${i}"><div class="mp-top"><span>${l}</span><span>${v}% <em class="${d > 0 ? 'up' : 'down'}">${d > 0 ? I.up : I.down}${Math.abs(d)}</em></span></div><div class="mp-track"><i></i></div></div>`).join('')}
                </div>
              </article>

              <article class="tile tile-ach" data-reveal="up" style="--d:.08s" data-tilt="6">
                <div class="tile-txt"><span class="tile-k">${I.trophy} Нива и точки</span><h3>От „Капка“ до „Кит“</h3><p>Свалихме коланчето? Без плавници? Всяко умение носи точки и ново ниво. Децата го обожават.</p></div>
                <div class="medals" aria-hidden="true"><span>🏊</span><span>🥇</span><span>🚀</span><span>🐬</span><span>🔥</span></div>
              </article>

              <article class="tile tile-card" data-reveal="up" style="--d:.16s" data-tilt="6">
                <div class="tile-txt"><span class="tile-k">${I.kids} Картони</span><h3>Спешният телефон е на 1 докосване</h3><p>Родител, диагноза, алергии, предупреждения, медицинско до кога — всичко за детето на едно място.</p></div>
                <div class="mini-card" aria-hidden="true">
                  <div class="mc-av">АП</div>
                  <div class="mc-lines"><b>Ани Петрова</b><span><i>8 г.</i><i>Ниво 2</i><i class="code">4821 7730</i></span></div>
                </div>
              </article>

              <article class="tile tile-mobile" data-reveal="up" style="--d:.24s" data-tilt="6">
                <div class="tile-txt"><span class="tile-k">${I.star} Състезания</span><h3>Времена, места, лични рекорди</h3><p>Записваш резултата от Стара Загора — личният рекорд се отбелязва сам, а родителят получава имейл.</p></div>
                <div class="mini-tabbar" aria-hidden="true"><i class="on">${I.cal}</i><i>${I.kids}</i><i>${I.trophy}</i><i>${I.team}</i></div>
              </article>
            </div>
          </div>
        </section>

        <!-- ===================== ЗАЕДНО ===================== -->
        <section class="sec" id="sec-team">
          <div class="container split">
            <div class="split-txt">
              ${eyebrow('03', 'За целия отбор')}
              <h2 class="sec-h" data-reveal="words">${split('Няколко треньори.\n*Един* дневник.')}</h2>
              <p class="sec-lead" data-reveal="up">Когато и двамата водите едни и същи деца, всяка бележка е важна. Виждате какво е правил другият и продължавате оттам.</p>
              <ul class="ticks" data-reveal="up" style="--d:.15s">
                <li><span>${I.check}</span><div><b>Всеки със свой цвят</b>В графика и в историята личи кой е водил тренировката.</div></li>
                <li><span>${I.check}</span><div><b>Покана с един линк</b>Колегата отваря линка, прави си профил и е в отбора.</div></li>
                <li><span>${I.check}</span><div><b>Данните са само ваши</b>Всеки отбор вижда единствено своите деца и тренировки.</div></li>
              </ul>
            </div>
            <div class="chat" data-reveal="stagger" aria-hidden="true">
              <div class="chat-day">Днес · 17:45</div>
              <div class="msg msg-b" style="--i:0"><span class="fc-av c-b">Д</span><div><small>Доника · Тренировка 17:00</small><p>Ани доплува 25 м без дъска 🎉 Дишането настрани още е трудно.</p></div></div>
              <div class="msg msg-a" style="--i:1"><span class="fc-av c-a">Н</span><div><small>Никола</small><p>Супер! В четвъртък ще я пробваме на гръб с дъска под главата.</p></div></div>
              <div class="msg msg-sys" style="--i:2"><span>🏅</span><p><b>Ани</b> получи „Първи 25 метра“ · 🎁 стикер</p></div>
              <div class="msg msg-b" style="--i:3"><span class="fc-av c-b">Д</span><div><small>Доника</small><p>Бобо днес беше уморен 😴, пробвай по-леко в четвъртък.</p></div></div>
            </div>
          </div>
        </section>

        <!-- ===================== РОДИТЕЛИ ===================== -->
        <section class="sec sec-deep" id="sec-parents">
          <div class="deep-bg" aria-hidden="true"><div class="rays rays-soft"><i></i><i></i><i></i></div>${bubbles(10)}</div>
          <div class="container split split-rev">
            <div class="parent-stage" data-scroll data-reveal="up" aria-hidden="true">
              <div class="stage-3d stage-parent" data-tilt="10">
                <div class="phone phone-parent"><div class="phone-screen">${phoneParentUI()}</div><div class="phone-glare"></div></div>
                <div class="code-card"><small>Родителски код</small><b>4821 7730</b><span>+ дата на раждане</span></div>
              </div>
            </div>
            <div class="split-txt">
              ${eyebrow('04', 'За родителите', true)}
              <h2 class="sec-h sec-h-light" data-reveal="words">${split('Родителите виждат\n*усмивката*, не таблицата.')}</h2>
              <p class="sec-lead light" data-reveal="up">Всяко дете има 8-цифрен код. Родителят го въвежда с датата на раждане и вижда нивото, уменията, наградите, бележките ти и следващите тренировки. Без регистрация. По желание получава имейл при всяка награда.</p>
              <div class="parent-grid" data-reveal="up" style="--d:.15s">
                <div><span>${I.eye}</span><b>Виждат</b><p>Ниво и точки, умения, награди, състезания, бележки за тях и посещенията.</p></div>
                <div><span>${I.lock}</span><b>Не виждат</b><p>Здравните данни, вътрешните ви бележки и другите деца.</p></div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===================== СОП ===================== -->
        <section class="sec" id="sec-sop">
          <div class="container sop">
            <div class="sop-txt">
              ${eyebrow('★', 'За всяко дете')}
              <h2 class="sec-h" data-reveal="words">${split('Направено и за деца\n*със* *СОП.*')}</h2>
              <p class="sec-lead" data-reveal="up">Децата със специални образователни потребности имат нужда от постоянство, търпение и малки победи. SwimWithSmile помага да не изпуснеш нито едно от трите.</p>
            </div>
            <div class="sop-cards" data-reveal="up" style="--d:.1s">
              <div><span>🚩</span><b>Сигнал при пропуски</b><p>Две поредни отсъствия — и виждаш червен флаг в „Днес“. Обаждаш се навреме.</p></div>
              <div><span>⚠️</span><b>Предупреждение навсякъде</b><p>Епилепсия, алергия, страх от вода — вижда се до името на детето на всяка тренировка.</p></div>
              <div><span>🫧</span><b>Малки стъпки = победи</b><p>„Издишва под водата“ е умение с точки. Детето вижда, че расте.</p></div>
              <div><span>📞</span><b>Спешен телефон</b><p>Родителят е на едно докосване от картона — без търсене в тетрадки.</p></div>
            </div>
          </div>
        </section>

        <!-- ===================== ЦЕНИ ===================== -->
        <section class="sec" id="sec-pricing">
          <div class="container">
            ${eyebrow('05', 'Цени')}
            <div class="sec-head-row">
              <h2 class="sec-h" data-reveal="words">${split('Започни *безплатно.*\nРасти с отбора.')}</h2>
              <div class="bill-toggle" data-reveal="up" role="group" aria-label="Период на плащане">
                <button type="button" class="on" data-bill="month">Месечно</button>
                <button type="button" data-bill="year">Годишно <em>−20%</em></button>
                <i class="bill-thumb"></i>
              </div>
            </div>
            <div class="plans">
              ${PLANS.map((p, i) => `
                <article class="plan ${p.featured ? 'plan-featured' : ''}" data-reveal="up" style="--d:${i * .1}s" data-tilt="4">
                  ${p.featured ? '<div class="plan-flag">Препоръчан за двама</div>' : ''}
                  <h3>${p.name}</h3>
                  <p class="plan-tag">${p.tag}</p>
                  <div class="plan-price"><span class="amt" data-m="${p.month}" data-y="${p.year}">${p.month}</span><span class="cur">€</span><span class="per">${p.month ? '/ месец' : 'завинаги'}</span></div>
                  <p class="plan-bill" data-mt="${p.month ? 'плащане всеки месец' : 'без карта, без срок'}" data-yt="${p.year ? `${p.year * 12} € веднъж годишно` : 'без карта, без срок'}">${p.month ? 'плащане всеки месец' : 'без карта, без срок'}</p>
                  <a class="btn ${p.featured ? 'btn-sun' : 'btn-ink'} btn-lg btn-block" href="#/register?plan=${p.key}">${p.month ? 'Избери ' + p.name : 'Започни безплатно'}</a>
                  <ul>${p.feats.map(f => `<li>${I.check}${f}</li>`).join('')}</ul>
                </article>`).join('')}
            </div>
            <p class="plans-note" data-reveal="up">Цените са в евро. Можеш да смениш плана по всяко време от страница „Отбор“.</p>
          </div>
        </section>

        <!-- ===================== ВЪПРОСИ ===================== -->
        <section class="sec sec-tint" id="sec-faq">
          <div class="container faq-wrap">
            <div class="faq-side">
              ${eyebrow('06', 'Въпроси')}
              <h2 class="sec-h" data-reveal="words">${split('Често\n*питат*')}</h2>
              <p class="sec-lead" data-reveal="up">Това, което треньорите питат най-често, преди да започнат.</p>
            </div>
            <div class="faq" data-reveal="up">
              ${[
                ['Трябва ли родителите да си правят профил?', 'Не. Всяко дете има 8-цифрен код. Родителят въвежда кода и датата на раждане на детето и вижда неговата страница. Ако кодът изтече някъде, генерираш нов с един бутон.'],
                ['Как вторият треньор влиза в отбора?', 'От страница „Отбор“ копираш линка за покана и го пращаш. Колегата го отваря, въвежда име, имейл и парола и вече е вътре. Нужен е план „Отбор“ или „Клуб“.'],
                ['Кой вижда данните на децата?', 'Само треньорите от твоя отбор. Всеки отбор е напълно отделен, паролите се пазят хеширани, а родителите виждат само своето дете и без здравна информация.'],
                ['Работи ли на телефон?', 'Да. Сайтът е направен първо за телефон: таб лента долу, големи бутони и формуляри, които се отварят отдолу като в приложение. Можеш да го добавиш на началния екран.'],
                ['Мога ли да сменя или откажа плана?', 'По всяко време от страница „Отбор“. Ако треньорите в отбора станат повече, отколкото позволява по-малкият план, първо премахваш някого.'],
                ['Какво става, ако пропусна да попълня тренировка?', 'Нищо страшно. Можеш да попълниш по-късно, дори за минали дни. Всяко дете пази цялата си история.'],
                ['Как се свързва с Google Calendar?', 'От „График → Google Calendar“ натискаш „Добави“. Всички тренировки (или само твоите) се появяват в календара ти и се обновяват сами.'],
                ['Подходящо ли е за деца със СОП?', 'Да — направено е от треньори, които работят с такива деца. Има отделно поле за специални потребности, червено предупреждение, което се вижда на всяка тренировка, и сигнал при пропуснати тренировки.'],
                ['А личните данни (GDPR)?', 'Данните са само в твоя отбор. Родителите не виждат здравна информация. В картона отбелязваш датата, на която родителят е дал съгласие.'],
              ].map(([q, a], i) => `
                <div class="qa">
                  <button type="button" class="qa-q" aria-expanded="false" aria-controls="qa${i}"><span>${q}</span><i class="qa-ico"></i></button>
                  <div class="qa-a" id="qa${i}" role="region"><div><p>${a}</p></div></div>
                </div>`).join('')}
            </div>
          </div>
        </section>

        <!-- ===================== ФИНАЛ ===================== -->
        <section class="final" id="sec-final">
          <div class="final-card" data-reveal="scale">
            <canvas class="final-water" id="finalWater" aria-hidden="true"></canvas>
            ${bubbles(8)}
            <div class="final-in">
              <h2 data-reveal="words">${split('Скачай.\nВодата е *топла.*')}</h2>
              <p>Създай отбор за две минути и покани колегата още днес.</p>
              <div class="hero-ctas center">
                <a class="btn btn-sun btn-xl" href="#/register">Създай отбор безплатно ${I.arrowR}</a>
                <a class="btn btn-glass btn-xl" href="#/login">Имам профил</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="site-foot">
        ${laneRope()}
        <div class="container foot-in">
          <div class="foot-brand">
            <a class="brand" href="#/" data-go="top">${logoMark(34)}<span class="brand-name">Swim<span>With</span>Smile</span></a>
            <p>Направено с 💙 от треньори по плуване, за треньори по плуване.</p>
          </div>
          <div class="foot-cols">
            <div><b>Продукт</b>${NAV.slice(0, 4).map(([id, l]) => `<button type="button" data-go="${id}">${l}</button>`).join('')}</div>
            <div><b>Профил</b><a href="#/register">Създай отбор</a><a href="#/login">Вход за треньори</a><a href="#/login?parent">Родителски достъп</a></div>
          </div>
        </div>
        <div class="container foot-bottom"><span>© ${new Date().getFullYear()} SwimWithSmile</span><span>Плувай с усмивка 🌊</span></div>
      </footer>`;

    bindSiteNav();
    onLeave(mountMotion(app));
    onLeave(waterMesh($('#heroWater'), { horizon: .5 }));
    onLeave(waterMesh($('#finalWater'), { horizon: .34, tint: [120, 225, 255] }));

    // Светлина, която следва мишката в херото
    const hero = $('#hero');
    if (FINE_POINTER && !REDUCED) {
      const mv = (e) => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); };
      hero.addEventListener('pointermove', mv, { passive: true });
    }

    // Месечно / годишно
    $$('[data-bill]').forEach(b => b.onclick = () => {
      const y = b.dataset.bill === 'year';
      $$('[data-bill]').forEach(x => x.classList.toggle('on', x === b));
      $('.bill-toggle').classList.toggle('is-year', y);
      $$('.plan').forEach(pl => {
        const amt = $('.amt', pl), bill = $('.plan-bill', pl);
        const v = y ? amt.dataset.y : amt.dataset.m;
        if (amt.textContent === v) return;
        amt.classList.remove('flip'); void amt.offsetWidth; amt.classList.add('flip');
        setTimeout(() => { amt.textContent = v; }, 140);
        bill.textContent = y ? bill.dataset.yt : bill.dataset.mt;
      });
    });

    // Въпроси (акордеон с плавна височина)
    $$('.qa-q').forEach(q => q.onclick = () => {
      const open = q.getAttribute('aria-expanded') !== 'true';
      q.setAttribute('aria-expanded', open);
      q.parentElement.classList.toggle('open', open);
    });
  });

  /* ============================================================
     Обща рамка за вход / регистрация / покана
     ============================================================ */
  function authShell({ side, body, wide }) {
    document.body.classList.remove('has-topbar');
    app.innerHTML = `
      <div class="auth2">
        <aside class="auth2-side">
          <div class="rays rays-soft" aria-hidden="true"><i></i><i></i><i></i></div>
          <canvas class="auth2-water" id="authWater" aria-hidden="true"></canvas>
          ${bubbles(8)}
          <div class="auth2-side-in">
            <a class="brand brand-light" href="#/">${logoMark(38)}<span class="brand-name">Swim<span>With</span>Smile</span></a>
            <div class="auth2-side-body">${side}</div>
            <a class="auth2-back" href="#/">${I.chevL} Към началната страница</a>
          </div>
        </aside>
        <main class="auth2-main">
          <button class="gear-btn" id="cfgBtn" title="Настройки на връзката" aria-label="Настройки на връзката">${I.gear}</button>
          <div class="auth2-card ${wide ? 'wide' : ''}" data-reveal="up">${body}</div>
        </main>
      </div>`;
    $('#cfgBtn').onclick = openConfig;
    onLeave(mountMotion(app));
    onLeave(waterMesh($('#authWater'), { horizon: .62 }));
  }

  // Поле с икона + показване на паролата
  const inField = (label, name, { type = 'text', ph = '', icon = '', auto = '', extra = '', hint = '', value = '' } = {}) => `
    <div class="field">
      <label for="f_${name}">${label}</label>
      <div class="in-wrap ${icon ? 'has-ico' : ''}">
        ${icon ? `<span class="in-ico">${icon}</span>` : ''}
        <input class="input" id="f_${name}" name="${name}" type="${type}" placeholder="${esc(ph)}" ${auto ? `autocomplete="${auto}"` : ''} value="${esc(value)}" ${extra} required>
        ${type === 'password' ? `<button type="button" class="in-eye" data-eye aria-label="Покажи паролата">${I.eye}</button>` : ''}
      </div>
      ${hint ? `<span class="hint">${hint}</span>` : ''}
    </div>`;
  const bindEyes = (root = document) => $$('[data-eye]', root).forEach(b => b.onclick = () => {
    const inp = b.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    b.classList.toggle('on', inp.type === 'text');
  });

  const busy = (btn, on, label) => {
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${label}`; }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.label || label; }
  };

  const query = () => new URLSearchParams((location.hash.split('?')[1] || ''));

  /* ============================================================
     ВХОД
     ============================================================ */
  route(/^\/login(?:\?.*)?$/, () => {
    const parentFirst = query().has('parent');
    authShell({
      side: `
        <h1 class="auth2-h" data-reveal="words">${split('Добре дошъл\nобратно *в* *водата.*')}</h1>
        <p class="auth2-sub" data-reveal="up" style="--d:.3s">Графикът, картоните и бележките на отбора те чакат точно където ги остави.</p>`,
      body: `
        <div class="seg seg-slide" role="tablist">
          <button class="seg-btn ${parentFirst ? '' : 'active'}" data-tab="coach" role="tab">Треньор</button>
          <button class="seg-btn ${parentFirst ? 'active' : ''}" data-tab="parent" role="tab">Родител</button>
          <i class="seg-thumb"></i>
        </div>

        <form id="coachForm" class="auth-form" ${parentFirst ? 'hidden' : ''} novalidate>
          <h2>Вход за треньори</h2>
          <p class="auth-lead">Влез, за да управляваш тренировките на отбора.</p>
          ${inField('Имейл', 'email', { type: 'email', ph: 'ime@example.com', icon: I.mail, auto: 'email' })}
          ${inField('Парола', 'password', { type: 'password', ph: '••••••••', icon: I.lock, auto: 'current-password' })}
          <button class="btn btn-primary btn-block btn-lg" type="submit">Вход ${I.arrowR}</button>
          <p class="auth-alt">Нямаш отбор? <a href="#/register">Създай безплатно</a></p>
        </form>

        <form id="parentForm" class="auth-form" ${parentFirst ? '' : 'hidden'} novalidate>
          <h2>Родителски достъп</h2>
          <p class="auth-lead">Виж напредъка и наградите на детето си.</p>
          <div class="field"><label for="p_code">Код от треньора</label>
            <input class="input input-code" id="p_code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="• • • • • • • •" required></div>
          <div class="field"><label for="p_birth">Дата на раждане на детето</label><input class="input" id="p_birth" name="birth" type="date" required></div>
          <label class="switch"><input type="checkbox" id="p_rem" checked><span></span>Запомни ме на това устройство</label>
          <button class="btn btn-sky btn-block btn-lg" type="submit">Виж детето ${I.arrowR}</button>
          <p class="auth-alt">Кодът е в картона на детето. Поискай го от треньора.</p>
        </form>`
    });
    bindEyes();
    const seg = $('.seg-slide');
    if (parentFirst) seg.classList.add('right');
    $$('.seg-btn').forEach(b => b.onclick = () => {
      $$('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
      const coach = b.dataset.tab === 'coach';
      seg.classList.toggle('right', !coach);
      $('#coachForm').hidden = !coach; $('#parentForm').hidden = coach;
      (coach ? $('#f_email') : $('#p_code')).focus({ preventScroll: true });
    });
    $('#p_code').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); };
    const rem = S.parentRemembered && S.parentRemembered();
    if (rem) { $('#p_code').value = rem.code; $('#p_birth').value = rem.birth; }

    $('#coachForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('[type=submit]');
      if (!f.email.value.trim() || !f.password.value) return toast('Въведи имейл и парола', 'err');
      busy(btn, true, 'Влизане…');
      try {
        const r = await API.login(f.email.value.trim(), f.password.value);
        toast(`Здравей, ${(r.fullName || '').split(' ')[0] || 'треньоре'}!`, 'ok'); navigate('/app/today');
      } catch (ex) { err(ex); busy(btn, false); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }
    };
    $('#parentForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('[type=submit]');
      if (f.code.value.length !== 8 || !f.birth.value) return toast('Въведи 8-цифрения код и датата', 'err');
      busy(btn, true, 'Търсене…');
      try { await S.parentLogin(f.code.value.trim(), f.birth.value, $('#p_rem').checked); }
      catch (ex) { err(ex); busy(btn, false); }
    };
  });

  /* ============================================================
     РЕГИСТРАЦИЯ — 3 стъпки: ти → отбор → план
     ============================================================ */
  route(/^\/register(?:\?.*)?$/, () => {
    if (API.isAuthed()) return navigate('/app/team');
    const st = { step: 0, plan: planByKey(query().get('plan') || 'solo').key, data: {} };

    authShell({
      wide: true,
      side: `
        <h1 class="auth2-h" data-reveal="words">${split('Твоят отбор.\nТвоят *басейн.*')}</h1>
        <p class="auth2-sub" data-reveal="up" style="--d:.3s">Три кратки стъпки и си готов за първата тренировка.</p>
        <ol class="side-steps" data-reveal="up" style="--d:.45s">
          <li data-s="0"><span>1</span>Ти</li><li data-s="1"><span>2</span>Отборът</li><li data-s="2"><span>3</span>План</li>
        </ol>`,
      body: `<div class="stepper" id="stepper"></div><div id="regBody"></div>`
    });

    const paint = () => {
      $('#stepper').innerHTML = ['Ти', 'Отбор', 'План'].map((l, i) => `<div class="stp ${i < st.step ? 'done' : ''} ${i === st.step ? 'cur' : ''}"><span>${i < st.step ? I.check : i + 1}</span><b>${l}</b></div>`).join('<i class="stp-line"></i>');
      $$('.side-steps li').forEach(li => { li.classList.toggle('cur', +li.dataset.s === st.step); li.classList.toggle('done', +li.dataset.s < st.step); });
      const body = $('#regBody');
      const d = st.data;
      if (st.step === 0) body.innerHTML = `
        <form id="regForm" class="auth-form step-anim" novalidate>
          <h2>Да се запознаем</h2>
          <p class="auth-lead">Ти ще си собственикът на отбора.</p>
          ${inField('Име и фамилия', 'fullName', { ph: 'напр. Никола Климентов', icon: I.user, auto: 'name', value: d.fullName || '' })}
          ${inField('Имейл', 'email', { type: 'email', ph: 'ime@example.com', icon: I.mail, auto: 'email', value: d.email || '' })}
          ${inField('Парола', 'password', { type: 'password', ph: 'поне 8 символа', icon: I.lock, auto: 'new-password', value: d.password || '' })}
          <div class="pw-meter" id="pwMeter"><i></i><i></i><i></i><i></i><span></span></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">Напред ${I.arrowR}</button>
          <p class="auth-alt">Вече имаш профил? <a href="#/login">Вход</a></p>
        </form>`;
      else if (st.step === 1) body.innerHTML = `
        <form id="regForm" class="auth-form step-anim" novalidate>
          <h2>Кръсти отбора</h2>
          <p class="auth-lead">Така ще го виждат колегите, които поканиш.</p>
          ${inField('Име на отбора', 'teamName', { ph: 'напр. Делфините на Никола', icon: I.team, value: d.teamName || '', hint: 'Може да го смениш по-късно.' })}
          <div class="team-preview"><span class="tp-av">${esc(initials(...(d.teamName || 'Отбор').split(' ')))}</span><div><b id="tpName">${esc(d.teamName || 'Твоят отбор')}</b><small>${esc(d.fullName || '')} · собственик</small></div></div>
          <div class="form-row"><button class="btn btn-ghost btn-lg" type="button" data-back>${I.chevL} Назад</button><button class="btn btn-primary btn-lg" type="submit">Напред ${I.arrowR}</button></div>
        </form>`;
      else body.innerHTML = `
        <form id="regForm" class="auth-form step-anim" novalidate>
          <h2>Избери план</h2>
          <p class="auth-lead">Започни с „Соло“ и надгради, когато поканиш колега.</p>
          <div class="plan-pick" role="radiogroup">
            ${PLANS.map(p => `
              <label class="pp ${st.plan === p.key ? 'on' : ''}">
                <input type="radio" name="plan" value="${p.key}" ${st.plan === p.key ? 'checked' : ''}>
                <span class="pp-radio"></span>
                <span class="pp-main"><b>${p.name}${p.featured ? ' <em>за двама</em>' : ''}</b><small>${p.seats === 1 ? '1 треньор' : 'до ' + p.seats + ' треньори'} · до ${p.kids} деца</small></span>
                <span class="pp-price">${p.month ? `${p.month} €<small>/мес</small>` : 'Безплатно'}</span>
              </label>`).join('')}
          </div>
          <label class="agree"><input type="checkbox" id="agree"><span></span>Съгласен съм данните на децата да се пазят в този отбор и да ги виждат само треньорите от него.</label>
          <div class="form-row"><button class="btn btn-ghost btn-lg" type="button" data-back>${I.chevL} Назад</button><button class="btn btn-sun btn-lg" type="submit">Създай отбора ${I.arrowR}</button></div>
        </form>`;

      bindEyes(body);
      const form = $('#regForm');
      const back = $('[data-back]', form); if (back) back.onclick = () => { collect(); st.step--; paint(); };
      const first = $('input:not([type=radio]):not([type=checkbox])', form);
      if (first && FINE_POINTER) first.focus({ preventScroll: true });

      if (st.step === 0) {
        const pw = $('#f_password'), meter = $('#pwMeter');
        const rate = () => {
          const v = pw.value; let sc = 0;
          if (v.length >= 8) sc++; if (/[A-ZА-Я]/.test(v) && /[a-zа-я]/.test(v)) sc++; if (/\d/.test(v)) sc++; if (/[^\w\sА-Яа-я]/.test(v) || v.length >= 14) sc++;
          meter.dataset.s = v ? sc : ''; meter.querySelector('span').textContent = v ? ['Твърде кратка', 'Слаба', 'Добра', 'Силна', 'Отлична'][sc] : '';
        };
        pw.oninput = rate; rate();
      }
      if (st.step === 1) $('#f_teamName').oninput = (e) => { $('#tpName').textContent = e.target.value || 'Твоят отбор'; $('.tp-av').textContent = initials(...(e.target.value || 'Отбор').split(' ')) || 'О'; };
      if (st.step === 2) $$('.pp input', form).forEach(r => r.onchange = () => { st.plan = r.value; $$('.pp', form).forEach(l => l.classList.toggle('on', l.contains(r))); });

      form.onsubmit = async (e) => {
        e.preventDefault(); collect();
        if (st.step === 0) {
          if ((d.fullName || '').length < 2) return fieldErr('fullName', 'Въведи име и фамилия');
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) return fieldErr('email', 'Провери имейла');
          if ((d.password || '').length < 8) return fieldErr('password', 'Поне 8 символа');
          st.step = 1; return paint();
        }
        if (st.step === 1) {
          if ((d.teamName || '').length < 2) return fieldErr('teamName', 'Въведи име на отбора');
          st.step = 2; return paint();
        }
        if (!$('#agree').checked) { $('.agree').classList.remove('shake'); void $('.agree').offsetWidth; $('.agree').classList.add('shake'); return toast('Потвърди съгласието', 'err'); }
        const btn = $('[type=submit]', form); busy(btn, true, 'Създаване…');
        try {
          const r = await API.register({ ...d, plan: st.plan });
          welcome(r);
        } catch (ex) {
          busy(btn, false); err(ex);
          if (/имейл/i.test(ex.message)) { st.step = 0; paint(); fieldErr('email', ex.message); }
        }
      };
    };
    const collect = () => $$('#regForm input[name]').forEach(i => { if (i.type !== 'radio' && i.type !== 'checkbox') st.data[i.name] = i.value.trim ? (i.name === 'password' ? i.value : i.value.trim()) : i.value; });
    paint();
  });

  function fieldErr(name, msg) {
    const inp = $('#f_' + name); if (!inp) return toast(msg, 'err');
    const f = inp.closest('.field');
    f.classList.add('has-err');
    let h = $('.err-msg', f); if (!h) { h = document.createElement('span'); h.className = 'err-msg'; f.appendChild(h); }
    h.textContent = msg; inp.focus();
    inp.addEventListener('input', () => { f.classList.remove('has-err'); h.remove(); }, { once: true });
  }

  // След регистрация: празнуване + линк за покана
  function welcome(r) {
    const link = inviteLink(r.inviteCode);
    $('#regBody').innerHTML = `
      <div class="welcome step-anim">
        <div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--x:${(i * 47) % 100}%;--d:${(i % 7) * .08}s;--r:${(i * 53) % 360}deg;--c:${['#46D6F7', '#FFC53D', '#FF6B5B', '#1F73E0', '#2FBF71'][i % 5]}"></i>`).join('')}</div>
        <div class="welcome-ico">${logoMark(64)}</div>
        <h2>Отборът „${esc(r.teamName)}“ е готов!</h2>
        <p class="auth-lead">Покани колегата си с този линк. Може и по-късно от страница „Отбор“.</p>
        ${r.plan === 'solo' ? `<p class="note">${I.lock} В план „Соло“ има място за 1 треньор. За колега избери „Отбор“ от страница „Отбор“.</p>` : ''}
        <div class="invite-box"><input class="input" readonly value="${esc(link)}" id="invLink"><button class="btn btn-soft" id="copyInv" type="button">${I.copy} Копирай</button></div>
        <a class="btn btn-primary btn-lg btn-block" href="#/app/today">Към графика ${I.arrowR}</a>
      </div>`;
    $$('.stp').forEach(s => { s.classList.add('done'); s.classList.remove('cur'); $('span', s).innerHTML = I.check; });
    $('#copyInv').onclick = () => copyText(link);
  }

  const inviteLink = (code) => `${location.origin}${location.pathname}#/join/${code}`;
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); toast('Копирано', 'ok'); }
    catch { const i = document.createElement('textarea'); i.value = txt; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); toast('Копирано', 'ok'); }
  }

  /* ============================================================
     ПОКАНА — /join/КОД
     ============================================================ */
  route(/^\/join\/([A-Za-z0-9]+)$/, async (code) => {
    authShell({
      side: `
        <h1 class="auth2-h" data-reveal="words">${split('Поканен си\nв *отбор.*')}</h1>
        <p class="auth2-sub" data-reveal="up" style="--d:.3s">Направи си профил и веднага ще виждаш децата, графика и бележките на колегите.</p>`,
      body: `<div id="joinBody"><div class="skel" style="height:64px;margin-bottom:14px"></div><div class="skel" style="height:220px"></div></div>`
    });
    let info;
    try { info = await API.inviteInfo(code); }
    catch (ex) {
      $('#joinBody').innerHTML = `<div class="empty"><div class="ico">${I.x}</div><h3>Поканата не е валидна</h3><p class="subtle">Може да е сменена. Поискай нов линк от собственика на отбора.</p><a class="btn btn-primary" href="#/" style="margin-top:18px">Към началото</a></div>`;
      return;
    }
    const full = info.seatsLeft <= 0;
    $('#joinBody').innerHTML = `
      <div class="invite-head step-anim">
        <span class="tp-av lg">${esc(initials(...info.teamName.split(' ')))}</span>
        <div><small>${esc(info.ownerName || 'Треньор')} те кани в</small><h2>${esc(info.teamName)}</h2></div>
      </div>
      ${full ? `<p class="note warn">${I.lock} Отборът е пълен за текущия план. Помоли ${esc(info.ownerName || 'собственика')} да го надгради и опитай пак.</p>` : ''}
      <form id="joinForm" class="auth-form step-anim" novalidate ${full ? 'inert' : ''}>
        ${inField('Име и фамилия', 'fullName', { ph: 'напр. Доника Иванова', icon: I.user, auto: 'name' })}
        ${inField('Имейл', 'email', { type: 'email', ph: 'ime@example.com', icon: I.mail, auto: 'email' })}
        ${inField('Парола', 'password', { type: 'password', ph: 'поне 8 символа', icon: I.lock, auto: 'new-password' })}
        <button class="btn btn-sun btn-block btn-lg" type="submit" ${full ? 'disabled' : ''}>Влез в отбора ${I.arrowR}</button>
        <p class="auth-alt">Вече имаш профил? <a href="#/login">Вход</a></p>
      </form>`;
    bindEyes();
    $('#joinForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, btn = $('[type=submit]', f);
      const dto = { code, fullName: f.fullName.value.trim(), email: f.email.value.trim(), password: f.password.value };
      if (dto.fullName.length < 2) return fieldErr('fullName', 'Въведи име и фамилия');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) return fieldErr('email', 'Провери имейла');
      if (dto.password.length < 8) return fieldErr('password', 'Поне 8 символа');
      busy(btn, true, 'Присъединяване…');
      try { await API.joinTeam(dto); toast(`Добре дошъл в „${info.teamName}“!`, 'ok'); navigate('/app/today'); }
      catch (ex) { busy(btn, false); err(ex); }
    };
  });

  /* ============================================================
     ОТБОР — /app/team
     ============================================================ */
  route(/^\/app\/team$/, async () => {
    if (!guard()) return;
    shell('team', `
      <div class="page-head">
        <div><div class="page-eyebrow">Настройки</div><h1 class="pagettl">Отбор</h1></div>
      </div>
      <div id="teamView"><div class="skel" style="height:180px;margin-bottom:18px"></div><div class="skel" style="height:260px"></div></div>`);
    await drawTeam();
  });

  async function drawTeam() {
    let t;
    try { t = await API.team(); } catch (e) { return err(e); }
    const host = $('#teamView'); if (!host) return;
    API.patchUser({ teamName: t.name, plan: t.plan, role: t.isOwner ? 'owner' : 'coach' });
    const me = (API.getUser() || {}).id;
    const pct = (a, b) => Math.min(100, Math.round(a / b * 100));
    const cur = planByKey(t.plan);
    const COLORS = ['#1F73E0', '#12805a', '#F5883C', '#8B5CF6', '#EF5F6B', '#14B8A6', '#EAB308', '#EC4899'];

    host.innerHTML = `
      <section class="team-hero rise">
        <div class="team-hero-bg" aria-hidden="true">${bubbles(6)}</div>
        <span class="tp-av xl">${esc(initials(...t.name.split(' ')))}</span>
        <div class="team-hero-main">
          <div class="team-name-row"><h2 id="tName">${esc(t.name)}</h2>${t.isOwner ? `<button class="btn-icon btn-glass" id="renameBtn" aria-label="Преименувай">${I.edit}</button>` : ''}</div>
          <div class="team-badges"><span class="badge badge-plan">План „${esc(t.planName)}“</span><span class="badge badge-glass">${t.isOwner ? 'Ти си собственик' : 'Треньор'}</span></div>
        </div>
        <div class="meters">
          <div class="meter"><div class="meter-top"><span>Треньори</span><b>${t.members.length} / ${t.seats}</b></div><div class="meter-track"><i style="--w:${pct(t.members.length, t.seats)}%"></i></div></div>
          <div class="meter"><div class="meter-top"><span>Деца</span><b>${t.kids} / ${t.kidsLimit}</b></div><div class="meter-track"><i style="--w:${pct(t.kids, t.kidsLimit)}%"></i></div></div>
        </div>
      </section>

      <div class="team-grid">
        <section class="card card-pad rise" style="animation-delay:.05s">
          <div class="card-section-title"><span class="ico">${I.team}</span>Треньори в отбора</div>
          <div class="members stagger">
            ${t.members.map((m, i) => `
              <div class="member">
                <span class="m-av" style="--c:${COLORS[i % COLORS.length]}">${esc(initials(...(m.fullName || m.email).split(' ')))}</span>
                <div class="m-main"><b>${esc(m.fullName || 'Треньор')}${m.id === me ? ' <em>(ти)</em>' : ''}</b><small>${esc(m.email)}</small></div>
                <span class="role ${m.role === 'owner' ? 'owner' : ''}">${m.role === 'owner' ? 'Собственик' : 'Треньор'}</span>
                ${t.isOwner && m.id !== me ? `<button class="x-btn" data-rm="${m.id}" data-nm="${esc(m.fullName)}" title="Премахни" aria-label="Премахни ${esc(m.fullName)}">${I.trash}</button>` : ''}
              </div>`).join('')}
          </div>
        </section>

        <section class="card card-pad rise invite-card" style="animation-delay:.1s">
          <div class="card-section-title"><span class="ico">${I.share}</span>Покани колега</div>
          ${t.isOwner ? `
            <p class="subtle" style="margin-bottom:14px">Изпрати линка на треньора, когото искаш в отбора. Той си прави профил и влиза директно.</p>
            <div class="invite-box"><input class="input" readonly id="invLink" value="${esc(inviteLink(t.inviteCode))}" aria-label="Линк за покана"><button class="btn btn-soft" id="copyInv">${I.copy}<span class="hide-xs">Копирай</span></button></div>
            <div class="invite-actions">
              ${navigator.share ? `<button class="btn btn-sky btn-sm" id="shareInv">${I.share} Сподели</button>` : ''}
              <button class="btn btn-ghost btn-sm" id="regenInv">${I.refresh} Нов линк</button>
            </div>
            ${t.members.length >= t.seats ? `<p class="note warn">${I.lock} Всички места в „${esc(t.planName)}“ са заети. Надгради плана, за да поканиш още някого.</p>` : `<p class="note">Свободни места: <b>${t.seats - t.members.length}</b></p>`}`
          : `<p class="subtle">Само собственикът на отбора може да кани нови треньори.</p>`}
        </section>
      </div>

      <section class="rise" style="animation-delay:.15s">
        <div class="section-h"><h2>План</h2>${t.isOwner ? '' : '<span class="subtle">Само собственикът може да го смени.</span>'}</div>
        <div class="plan-cards">
          ${PLANS.map(p => `
            <article class="pc ${p.key === t.plan ? 'cur' : ''}">
              ${p.key === t.plan ? '<span class="pc-flag">Текущ</span>' : ''}
              <h3>${p.name}</h3>
              <div class="pc-price">${p.month ? `<b>${p.month} €</b><small>/ месец</small>` : '<b>0 €</b><small>завинаги</small>'}</div>
              <ul>${p.feats.slice(0, 3).map(f => `<li>${I.check}${f}</li>`).join('')}</ul>
              ${t.isOwner && p.key !== t.plan ? `<button class="btn ${p.month > cur.month ? 'btn-primary' : 'btn-ghost'} btn-block" data-plan="${p.key}">${p.month > cur.month ? 'Надгради' : 'Премини'}</button>` : ''}
            </article>`).join('')}
        </div>
        <p class="plans-note">Плащанията още не са включени. Смяната на плана е моментална.</p>
      </section>`;

    const rn = $('#renameBtn');
    if (rn) rn.onclick = () => {
      modal({ title: 'Име на отбора', body: `<div class="field"><label for="tn">Име</label><input class="input" id="tn" value="${esc(t.name)}" maxlength="60"></div>`,
        footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="tnSave">${I.check} Запази</button>` });
      $('#tn').focus();
      $('#tnSave').onclick = async () => {
        const name = $('#tn').value.trim(); if (name.length < 2) return toast('Твърде кратко име', 'err');
        try { await API.updateTeam({ name }); API.patchUser({ teamName: name }); closeModal(); toast('Запазено', 'ok'); S.render(); } catch (e) { err(e); }
      };
    };
    const ci = $('#copyInv'); if (ci) ci.onclick = () => copyText($('#invLink').value);
    const si = $('#shareInv'); if (si) si.onclick = () => navigator.share({ title: 'Покана за SwimWithSmile', text: `Ела в отбора „${t.name}“ в SwimWithSmile`, url: $('#invLink').value }).catch(() => {});
    const ri = $('#regenInv'); if (ri) ri.onclick = () => {
      modal({ title: 'Нов линк за покана', body: '<p>Старият линк ще спре да работи. Треньорите, които вече са в отбора, остават.</p>',
        footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-primary" id="riOk">${I.refresh} Смени линка</button>` });
      $('#riOk').onclick = async () => { try { await API.regenerateInvite(); closeModal(); toast('Нов линк е готов', 'ok'); drawTeam(); } catch (e) { err(e); } };
    };
    $$('[data-rm]').forEach(b => b.onclick = () => {
      modal({ title: 'Премахване от отбора', body: `<p>Да премахна <b>${esc(b.dataset.nm)}</b> от отбора? Записаните от него тренировки и бележки остават.</p>`,
        footer: `<button class="btn btn-ghost" data-close>Отказ</button><button class="btn btn-danger" id="rmOk">${I.trash} Премахни</button>` });
      $('#rmOk').onclick = async () => { try { await API.removeCoach(b.dataset.rm); closeModal(); toast('Премахнат', 'ok'); drawTeam(); } catch (e) { err(e); } };
    });
    $$('[data-plan]').forEach(b => b.onclick = async () => {
      const p = planByKey(b.dataset.plan);
      busy(b, true, '');
      try { await API.setPlan(p.key); toast(`Планът е „${p.name}“`, 'ok'); drawTeam(); } catch (e) { busy(b, false); err(e); }
    });
  }
})();
