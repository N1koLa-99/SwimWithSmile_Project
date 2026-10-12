/* ============================================================
   SwimWithSmile — Родителски изглед (за родителя и детето)
   Без здравни данни и без вътрешните бележки на треньорите.
   ============================================================ */
(() => {
  const S = window.__SWS;
  const { app, route, navigate, toast, err, esc, $, $$, fmtDate, fmtShort, fmtTime, fmtDay, ageFrom, emptyState, avatar, I, MOOD_EMOJI, logoMark } = S;

  const KEY_DATA = 'sws.parent', KEY_CREDS = 'sws.parentCreds';
  const store = {
    get(k, persistent) { try { return JSON.parse((persistent ? localStorage : sessionStorage).getItem(k)); } catch { return null; } },
    set(k, v, persistent) { try { (persistent ? localStorage : sessionStorage).setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch {} },
  };
  // Извиква се от формата за вход
  S.parentLogin = async (code, birth, remember) => {
    const data = await API.parentDashboard(code, birth);
    store.set(KEY_DATA, data);
    store.set(KEY_CREDS, { code, birth }, false);
    if (remember) store.set(KEY_CREDS, { code, birth }, true); else { try { localStorage.removeItem(KEY_CREDS); } catch {} }
    navigate('/parent/view');
  };
  S.parentRemembered = () => store.get(KEY_CREDS, true);

  route(/^\/parent\/view$/, async () => {
    document.body.classList.remove('has-topbar');
    let data = store.get(KEY_DATA);
    const creds = store.get(KEY_CREDS) || store.get(KEY_CREDS, true);
    if (!data && !creds) return navigate('/login?parent');
    if (data) paint(data);
    else app.innerHTML = `<div class="aqua-bg"></div><div class="wrap wrap-parent"><div class="skel" style="height:220px;margin-top:30px"></div></div>`;
    // винаги дърпаме свежи данни във фона
    if (creds) {
      try { data = await API.parentDashboard(creds.code, creds.birth); store.set(KEY_DATA, data); paint(data); }
      catch (e) { if (!data) { err(e); store.del(KEY_CREDS); navigate('/login?parent'); } }
    }
  });

  function paint(d) {
    const c = d.child, st = d.stats || {}, lvl = st.level || {};
    const skills = d.skills || [];
    const doneSkills = skills.filter(s => s.done);
    const nextSkills = skills.filter(s => !s.done).slice(0, 3);
    const notes = (d.history || []).filter(h => h.parentNote || h.dailyProgress).slice(0, 6);
    const pr = d.progress, prev = d.previousProgress;

    const stages = {};
    skills.forEach(s => (stages[s.stage] ||= { name: s.stageName, items: [] }).items.push(s));

    const bar = (l, v, pv) => v == null ? '' : `<div class="prog-row"><div class="prog-top"><span>${l}${pv != null && v > pv ? ` <span class="up-arrow">${I.up}</span>` : ''}</span><span class="val">${v}%</span></div><div class="prog-track"><div class="prog-fill" data-w="${v}"></div></div></div>`;
    const medal = (p) => p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏁';

    app.innerHTML = `
      <div class="aqua-bg"></div>
      <div class="parent-top">
        <div class="brand">${logoMark()}<div><div class="brand-name">Swim<span>With</span>Smile</div>${d.teamName ? `<div class="brand-team light">${esc(d.teamName)}</div>` : ''}</div></div>
        <button class="btn btn-glass btn-sm" id="pOut" style="margin-left:auto">${I.logout}<span>Изход</span></button>
      </div>
      <div class="wrap wrap-parent">
        <section class="p-hero rise">
          <div class="p-hero-lvl"><span class="p-lvl-ico">${lvl.icon || '💧'}</span></div>
          <div class="p-hero-main">
            <h1>${esc(c.firstName)} ${esc(c.lastName || '')}</h1>
            <p>${c.ageYears ?? ageFrom(c.birthDate)} години${c.groupName ? ' · ' + esc(c.groupName) : ''}</p>
            <div class="p-lvl-name">Ниво ${lvl.no || 1}: <b>${esc(lvl.name || 'Капка')}</b></div>
            <div class="lvl-bar lvl-bar-lg light"><i style="width:${lvl.progress || 0}%"></i></div>
            <small>${st.points || 0} точки${lvl.next ? ` · още ${lvl.next.min - (st.points || 0)} до ${lvl.next.icon} ${esc(lvl.next.name)}` : ' · най-високото ниво! 🎉'}</small>
          </div>
        </section>

        <div class="p-stats rise">
          <div><b>${st.present || 0}</b><small>тренировки</small></div>
          <div><b>${st.pct30 != null ? st.pct30 + '%' : st.pct != null ? st.pct + '%' : '—'}</b><small>посещаемост</small></div>
          <div><b>${st.streak || 0}🔥</b><small>поредни идвания</small></div>
          <div><b>${doneSkills.length}</b><small>умения</small></div>
        </div>

        ${(d.upcoming || []).length ? `<h2 class="p-h">Следващи тренировки</h2>
          <div class="card card-pad rise p-up">${d.upcoming.map(u => `<div class="p-up-i"><b>${esc(fmtDay(u.sessionDate))}</b><span>${fmtTime(u.startTime)}${u.location ? ' · ' + esc(u.location) : ''}</span></div>`).join('')}</div>` : ''}

        ${notes.length ? `<h2 class="p-h">От треньора</h2>
          <div class="p-notes rise">${notes.map(n => `<div class="p-note"><small>${esc(fmtShort(n.sessionDate))} · ${esc(String(n.coachName).split(' ')[0])}${n.mood ? ' · ' + (MOOD_EMOJI[n.mood] || '') : ''}</small><p>${esc(n.parentNote || n.dailyProgress)}</p></div>`).join('')}</div>` : ''}

        <h2 class="p-h">Умения <span class="badge">${doneSkills.length}/${skills.length}</span></h2>
        <div class="card card-pad rise">
          ${nextSkills.length ? `<p class="subtle" style="margin-bottom:14px">Следва: ${nextSkills.map(s => `<b>${s.icon} ${esc(s.name)}</b>`).join(', ')}</p>` : ''}
          ${Object.keys(stages).sort().map(k => `<div class="sk-stage"><div class="sk-stage-h"><span class="sk-no">${k}</span><b>${esc(stages[k].name)}</b><small>${stages[k].items.filter(s => s.done).length}/${stages[k].items.length}</small></div>
            <div class="sk-grid">${stages[k].items.map(s => `<div class="sk ${s.done ? 'done' : 'locked'}"><span class="sk-ico">${s.icon}</span><span class="sk-n">${esc(s.name)}</span>${s.done ? `<span class="sk-sub">${I.check} ${fmtShort(s.achievedDate)}</span>` : ''}</div>`).join('')}</div></div>`).join('') || '<p class="subtle">Скоро.</p>'}
        </div>

        <h2 class="p-h">Награди 🏆</h2>
        ${(d.achievements || []).length ? `<div class="stagger" style="display:grid;gap:12px">${d.achievements.map(a => `
          <div class="ach"><div class="ach-ico">${a.icon || '🏅'}</div>
            <div class="ach-main"><div class="n">${esc(a.name)}</div>${a.reward ? `<div class="r">🎁 ${esc(a.reward)}</div>` : ''}${a.note ? `<div class="subtle small">„${esc(a.note)}"</div>` : ''}</div>
            <div class="ach-date">${fmtDate(a.awardedDate)}</div></div>`).join('')}</div>`
          : emptyState(I.trophy, 'Още няма награди', 'Скоро ще дойдат! 💪')}

        ${(d.competitions || []).length ? `<h2 class="p-h">Състезания</h2><div class="stagger" style="display:grid;gap:12px">${d.competitions.map(k => `
          <div class="comp"><div class="comp-medal">${k.place && k.place > 3 ? `<span>${k.place}</span>` : medal(k.place)}</div>
            <div class="comp-main"><b>${esc(k.eventName)}</b><small>${fmtDate(k.eventDate)}${k.location ? ' · ' + esc(k.location) : ''}</small>
              ${k.discipline ? `<div class="comp-res">${esc(k.discipline)}${k.timeText ? ` · <b>${esc(k.timeText)}</b>` : ''}${k.place ? ` · ${k.place} място` : ''}${k.isPB ? ' <span class="tag tag-pb">Личен рекорд</span>' : ''}</div>` : ''}
              ${k.results ? `<div class="subtle small">${esc(k.results)}</div>` : ''}</div></div>`).join('')}</div>` : ''}

        ${pr ? `<h2 class="p-h">Напредък</h2><div class="card card-pad rise">
          <div class="pc-head"><strong>${esc(pr.periodLabel || 'Оценка')}</strong><span class="subtle">${fmtDate(pr.assessmentDate)}</span></div>
          ${bar('Сила', pr.physStrength, prev?.physStrength)}${bar('Гъвкавост', pr.physFlexibility, prev?.physFlexibility)}${bar('Издръжливост', pr.physEndurance, prev?.physEndurance)}${bar('Координация', pr.physCoordination, prev?.physCoordination)}
          ${pr.nextGoals ? `<hr class="divider"><div class="info-item"><div class="k">Следваща цел</div><div class="v">${esc(pr.nextGoals)}</div></div>` : ''}
        </div>` : ''}

        ${c.goals ? `<div class="card card-pad rise" style="margin-top:20px"><div class="info-item"><div class="k">Цели</div><div class="v">${esc(c.goals)}</div></div></div>` : ''}

        <h2 class="p-h">Посещения</h2>
        <div class="card card-pad rise">
          ${(d.history || []).length ? `<div class="att-strip">${d.history.filter(h => h.attended !== null && h.status !== 'cancelled').slice(0, 30).reverse().map(h => `<i class="${h.attended ? 'y' : 'n'}" title="${fmtShort(h.sessionDate)}"></i>`).join('')}</div>
            <div class="p-hist">${d.history.slice(0, 12).map(h => `<div><span>${esc(fmtShort(h.sessionDate))}</span><span class="subtle">${esc(String(h.coachName).split(' ')[0])}</span><b class="${h.status === 'cancelled' ? '' : h.attended === true ? 'y' : h.attended === false ? 'n' : ''}">${h.status === 'cancelled' ? 'отменена' : h.attended === true ? 'беше там' : h.attended === false ? 'отсъства' : '—'}</b></div>`).join('')}</div>`
          : `<p class="subtle">Още няма тренировки.</p>`}
        </div>
        <p class="subtle small" style="text-align:center;margin-top:26px">Здравните данни и вътрешните бележки на треньорите не се показват тук.</p>
      </div>`;
    $('#pOut').onclick = () => { store.del(KEY_DATA); store.del(KEY_CREDS); navigate('/login?parent'); };
    requestAnimationFrame(() => setTimeout(() => $$('.prog-fill').forEach(f => f.style.width = f.dataset.w + '%'), 60));
  }
})();
