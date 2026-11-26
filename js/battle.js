'use strict';
/* =====================================================================
   戰鬥外殼：版面、輸入、回合流程、提示、特效、卡片、結算時間軸。
   每一章的規則與畫法由「模式」物件（mode-skin.js／mode-airway.js）提供，這裡不含任何關卡知識。
   一章＝幾個小練習（每個只多一條規則）＋一場正式戰鬥。
   ===================================================================== */
(function (IW) {
  const { $, tx, pick, art: A } = IW, P = A.P;
  const W = 470, H = 610, R = 40, HW = Math.sqrt(3) * R, OX = (W - HW * 6.5) / 2 + HW / 2, OY = 102, ROWH = 60;
  const B = IW.battle = { W, H, R, HW, OY, ROWH };
  let root = null, cv = null, ctx = null, G = null, M = null, DEF = null, ST = null, stageK = 0, T = 0, raf = 0, last = 0;
  let infoUntil = 0, hoverMute = false, fx = [], parts = [], hover = -1, armed = null, hoverAct = null, hq = [], hCur = null, hMin = 0, hEnd = 0, hShown = null, cardView = null, lastInfo = -2;
  const seen = new Set();
  Object.defineProperties(B, { G: { get: () => G }, T: { get: () => T }, ST: { get: () => ST }, DEF: { get: () => DEF }, stage: { get: () => stageK },
    hover: { get: () => hover }, preview: { get: () => armed || hoverAct }, armed: { get: () => armed }, root: { get: () => root } });

  /* ---------------- 開啟／關閉 ---------------- */
  B.open = function (def, k) {
    B.close(); DEF = def; M = def.mode; seen.clear();
    root = document.createElement('div'); root.className = 'bt';
    root.innerHTML = `<div class="side sideL"><div class="top"><button class="ic" id="bBack" aria-label="menu">◂</button><div class="ttl"><b id="bTitle"></b><span class="tl"><span id="bTurn"></span></span></div>
        <button class="ic" id="bHelp">?</button><button class="ic" id="bSpeed"></button><button class="ic" id="bMute"></button><button class="ic" id="bLang"></button></div>
      <div class="prow"><div id="ap"></div><div id="pips"></div></div><div id="gauges"></div><div id="goal"></div></div>
      <div class="field" id="field"><canvas id="cv"></canvas><div id="banner"></div></div>
      <div class="side sideR"><div id="hint" aria-live="polite"></div><div id="info"></div>
        <div class="bar2"><div id="acts"></div><button id="bEnd"></button></div></div>
      <div class="ov" id="ov"><div class="card" id="card"></div></div><div class="ln" id="ln"></div>`;
    $('app').innerHTML = ''; document.body.appendChild(root);
    cv = $('cv'); ctx = cv.getContext('2d');
    $('bBack').onclick = e => {                                // 戰鬥進行中：要再按一次才離開（這一場不會保存）
      const b = e.currentTarget, mid = G && G.phase !== 'over' && (G.turn > 1 || G.ap < G.cfg.AP);
      if (!mid || b.dataset.sure) { location.hash = '#menu'; return; }
      b.dataset.sure = 1; b.style.width = 'auto'; b.style.padding = '0 10px'; b.textContent = tx('離開？', 'Leave?'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.style.width = ''; b.style.padding = ''; b.textContent = '◂'; } }, 3000);
    };
    $('bHelp').onclick = () => { if (!B.busy) B.showRules(); };
    $('bSpeed').onclick = () => { IW.save.speed = IW.save.speed > 1 ? 1 : 2; IW.store(); chrome(); };
    $('bMute').onclick = () => { IW.setMute(!IW.save.mute); chrome(); };
    $('bLang').onclick = () => IW.setLang(IW.lang() === 'en' ? 'zh' : 'en');
    $('bEnd').onclick = () => B.endTurn();
    $('acts').addEventListener('click', e => { const b = e.target.closest('.act'); if (b && !b.disabled) tapAct(b.dataset.id); });
    $('acts').addEventListener('mouseover', e => { const b = e.target.closest('.act'); if (b && !IW.touch && !hoverMute) { hoverAct = b.dataset.id; } });
    $('acts').addEventListener('mouseleave', () => { hoverAct = null; hoverMute = false; });
    cv.addEventListener('mousemove', e => { if (!IW.touch) { hover = tileAt(e); showInfo(); } });
    cv.addEventListener('mouseleave', () => { hover = -1; showInfo(); });
    cv.addEventListener('click', e => {
      const i = tileAt(e); if (IW.touch) hover = i;
      if (G && G.phase === 'player' && !G.result && !B.busy && !$('ov').classList.contains('on')) M.tap(G, i);
      lastInfo = -2; showInfo(); if (IW.touch) infoUntil = performance.now() + 4500;
    });
    addEventListener('resize', fit); addEventListener('keydown', onKey); addEventListener('pointerdown', onDown, true);
    if (window.ResizeObserver) (B._ro = new ResizeObserver(fit)).observe($('field'));
    chrome(); fit(); B.go(k || 0);
    last = 0; raf = requestAnimationFrame(loop);
  };
  B.close = function () {
    if (!root) return; cancelAnimationFrame(raf); if (IW.lymph) IW.lymph.abort(); removeEventListener('resize', fit); removeEventListener('keydown', onKey); removeEventListener('pointerdown', onDown, true);
    if (B._ro) B._ro.disconnect(); root.remove(); root = null; G = null; cardView = null; IW.setBeat(0); B.busy = false;
  };
  function onKey(e) {
    if (!root || $('ov').classList.contains('on') || $('ln').classList.contains('on')) return;
    if (e.code === 'Space') { e.preventDefault(); B.endTurn(); }
    if (e.key === 'Escape') { disarm(); if (M.cancel) M.cancel(G); hud(); }
  }
  function onDown(e) { if (armed && !e.target.closest('.act')) disarm(); }
  function chrome() {
    if (!root) return;
    $('bSpeed').textContent = IW.save.speed > 1 ? '▶▶' : '▶'; $('bSpeed').title = tx('敵方回合速度', 'Enemy turn speed');
    $('bMute').textContent = IW.save.mute ? '×' : '♪'; $('bLang').textContent = IW.lang() === 'en' ? '中文' : 'EN';
    $('bHelp').title = tx('規則', 'Rules'); $('bBack').title = tx('主選單', 'Menu');
  }
  IW.onLang(() => { if (!root) return; chrome(); hShown = null; lastInfo = -2; if (G) hud(); if (cardView) cardView(); if (B.onLang) B.onLang(); });
  function fit() {
    if (!root) return; const f = $('field').getBoundingClientRect(); if (!f.width || !f.height) return;
    const k = Math.min(f.width / W, f.height / H), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.style.width = Math.floor(W * k) + 'px'; cv.style.height = Math.floor(H * k) + 'px';
    cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr); narrowV = getComputedStyle($('info')).display === 'none';
  }
  function tileAt(e) {
    if (!G) return -1; const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * H / b.height;
    let best = -1, bd = R * .98; for (const t of G.tiles) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t.i; } }
    return best;
  }

  /* ---------------- 關卡流程 ---------------- */
  B.go = async function (k, seed) {
    stageK = k; ST = DEF.stages[k]; disarm(); hq = []; hCur = null; fx = []; parts = []; hover = -1; B.busy = false;
    $('ov').classList.remove('on'); cardView = null; $('ln').classList.remove('on');
    if (seed === undefined) seed = ST.seed !== undefined ? ST.seed : (Math.random() * 2 ** 31) | 0;
    G = M.setup(seed, ST); G.marks = []; G.hist = [];
    for (const t of G.tiles) { t.x = OX + t.c * HW + (t.r & 1 ? HW / 2 : 0); t.y = OY + t.r * ROWH; t.seed = (Math.sin(t.i * 12.9898 + 4.1) * 43758.5453) % 6.283; t.flash = 0; t.sp = []; }
    for (const u of G.units) placeUnit(u);
    if (M.enter) M.enter(G);
    B.refresh(); G.hist.push(M.sample(G)); IW.sfx('turn');
    if (ST.pre) { B.busy = true; const my = G; await ST.pre(B, G); if (G !== my) return; B.busy = false; B.refresh(); }
  };
  function placeUnit(u, from) { const t = G.tiles[u.tile]; u.x = from ? from.x : t.x; u.y = from ? from.y : t.y; u.path = from ? [{ x: t.x, y: t.y }] : []; u.ph = Math.random() * 10; u.gulp = 0; u.born = 1; }
  B.placeUnit = placeUnit;
  B.refresh = function () { G.fc = M.forecast(G); hud(); };
  B.afterAction = function () {
    const r = M.check(G); if (r) { G.result = r; return finish(); }
    B.refresh();
  };
  B.mark = type => { G.marks.push({ turn: G.turn, type }); };
  B.endTurn = async function () {
    if (!G || G.phase !== 'player' || G.result || B.busy || $('ov').classList.contains('on')) return;
    const my = G; G.phase = 'enemy'; G.sel = -1; disarm(); if (M.cancel) M.cancel(G); hud(); IW.sfx('turn');
    let taught = false;
    const api = { alive: () => G === my && !!root, hint: (...a) => { if (B.hint(...a)) taught = true; }, wait: ms => { const x = taught ? 1500 : 0; taught = false; return IW.wait(ms + x); } };
    await M.enemy(G, api); if (!api.alive()) return;
    if (G.result) return finish();
    G.phase = 'player'; G.hist.push(M.sample(G));
    if (M.newTurn) M.newTurn(G, api);
    B.refresh();
  };
  function finish() {
    G.phase = 'over'; G.sel = -1; disarm(); G.hist.push(M.sample(G)); hud(); IW.setBeat(0);
    const r = G.result, my = G; IW.sfx(r.win ? 'win' : 'lose');
    setTimeout(() => { if (G === my && root) showEnd(); }, r.win ? 1300 : 1600);
  }

  /* ---------------- HUD ---------------- */
  function hud() {
    if (!G || !root) return; const h = M.hud(G, ST), pl = G.phase === 'player' && !B.busy;
    $('bTitle').textContent = pick(DEF.short || DEF.title); $('bTurn').textContent = h.turn;
    $('pips').innerHTML = h.pips.map(p => `<i class="${p.cls || ''}"${p.m ? ` data-m="${p.m}"` : ''} title="${IW.esc(p.title || '')}"></i>`).join('');
    $('gauges').innerHTML = h.gauges.map(g => `<div class="g${g.warn ? ' warn' : ''}" title="${IW.esc(g.title || '')}"><div class="row"><span>${g.label}</span><em>${g.val}</em></div>
      <div class="bar">${g.next !== undefined ? `<u style="width:${IW.clamp(g.next, 0, 1) * 100}%;background:${g.color}"></u>` : ''}<s style="width:${IW.clamp(g.frac, 0, 1) * 100}%;background:${g.color}"></s></div></div>`).join('');
    const pg = ST.goal ? '<b>' + pick(ST.goal) + '</b>' : '', warn = /class="w"/.test(h.goal || '');   // 有警告時警告排前面（手機只顯示一兩行）
    $('goal').innerHTML = warn ? h.goal + (pg ? ' ' + pg : '') : pg + (pg && h.goal ? '<br>' : '') + (h.goal || '');
    const hide = ST.hide || {};
    $('acts').innerHTML = h.acts.filter(a => !hide[a.id]).map(a => `<button class="act${a.on ? ' on' : ''}${armed === a.id ? ' armed' : ''}" data-id="${a.id}"${a.disabled || !pl ? ' disabled' : ''}>
      ${a.color ? `<span class="dot" style="background:${a.color}"></span>` : ''}<span>${a.label}${a.sub ? `<br><small>${a.sub}</small>` : ''}</span></button>`).join('');
    $('ap').title = tx('行動點數', 'Action points'); $('ap').innerHTML = Array.from({ length: G.cfg.AP }, (_, k) => `<i class="${k < G.ap ? 'on' : ''}"></i>`).join('');
    const be = $('bEnd'); be.disabled = !pl; be.innerHTML = tx('結束回合', 'End turn') + (IW.touch ? '' : `<small>${tx('空白鍵', 'Space')}</small>`);
    be.classList.toggle('pulse', pl && (G.ap === 0 || !!h.endPulse)); be.classList.toggle('danger', !!h.endDanger);
    $('banner').textContent = G.phase === 'enemy' ? pick(M.banner) : '';
    IW.setBeat(G.phase === 'over' ? 0 : M.beat(G));
  }
  B.hud = hud;
  function showInfo() {
    if (!root || !G) return; const key = hover + ':' + G.sel + ':' + G.ap + ':' + G.turn; if (key === lastInfo) return; lastInfo = key;
    $('info').innerHTML = (hover >= 0 && G.phase !== 'over' ? M.info(G, hover) : '') || (IW.touch ? tx('點戰場上的格子，這裡會顯示它的說明。', 'Tap a tile on the field to see what is there.') : tx('把滑鼠移到格子上，這裡會顯示它的說明。', 'Hover over a tile to see what is there.'));
  }
  // 行動按鈕：滑鼠＝懸停預覽、單擊執行；觸控＝第一下只預覽（不扣點），再點同一顆才執行，點別處取消
  function disarm() { armed = null; if (root && G) $('acts').querySelectorAll('.armed').forEach(e => e.classList.remove('armed')); }
  function tapAct(id) {
    if (!G || G.phase !== 'player' || B.busy) return;
    if (IW.touch && M.needArm && M.needArm(G, id) && armed !== id) { armed = id; hoverAct = null; hud(); return; }
    disarm(); hoverAct = null; hoverMute = true; M.act(G, id);   // 按下去之後不再顯示「再按一次」的預覽，滑鼠移開再回來才恢復
  }
  /* ---------------- 提示：每句至少停留一段時間，不會被下一句立刻蓋掉 ---------------- */
  B.hint = function (key, text, force) {
    if (!force) { if (seen.has(key)) return false; seen.add(key); }
    if ((hCur && hCur.key === key) || hq.some(h => h.key === key)) return false;
    if (force) hq.unshift({ key, text }); else hq.push({ key, text });
    if (hq.length > 4) hq.length = 4; return true;
  };
  let narrowV = false; const narrow = () => narrowV;   // 手機直向：格子說明併入提示框
  function hintTick() {
    if (!G) return; const now = performance.now();
    if (hCur && (now > hEnd || (hq.length && now > hMin))) hCur = null;
    if (!hCur && hq.length) { hCur = hq.shift(); hMin = now + 2600; hEnd = now + 7000; infoUntil = 0; }
    const pv = (armed || hoverAct) && G.phase === 'player' && M.preview ? M.preview(G, armed || hoverAct) : null;
    const txt = pv ? pv + (armed ? tx(' <b>再點一次執行</b>，點別處取消。', ' <b>Tap again to do it</b>, elsewhere to cancel.') : '')
      : hCur ? pick(hCur.text) : (G.phase === 'player' && !G.result && !B.busy ? ((ST.guide && ST.guide(G)) || M.guide(G, ST) || '') : '');
    let out = txt;                                            // 手機直向：格子說明接在提示後面（提示優先，不被蓋掉）
    if (!pv && narrow() && now < infoUntil && hover >= 0 && G.phase === 'player') { const inf = M.info(G, hover) || ''; out = txt ? txt + '<span class="inf">' + inf.split('<br>')[0] + '</span>' : inf; }
    if (out !== hShown) { hShown = out; $('hint').innerHTML = out; $('hint').scrollTop = 0; }
  }

  /* ---------------- 卡片 ---------------- */
  B.card = function (render) {                                // render() → {cls, html, on:{id:fn}}；切換語言時重畫
    cardView = () => { const c = render(); $('card').className = 'card ' + (c.cls || ''); $('card').innerHTML = c.html; for (const id in c.on || {}) { const e = $(id); if (e) e.onclick = c.on[id]; } };
    cardView(); $('ov').classList.add('on'); $('ov').scrollTop = 0;
  };
  B.closeCard = () => { cardView = null; if (root) $('ov').classList.remove('on'); };
  B.ask = render => new Promise(res => B.card(() => { const c = render(); const on = {}; for (const id in c.on) on[id] = () => { B.closeCard(); res(c.on[id]()); }; return { cls: c.cls, html: c.html, on }; }));
  B.showRules = function () {
    B.card(() => ({ html: `<h2>${pick(DEF.title)}</h2><h1>${tx('規則', 'Rules')}</h1>
      <div class="btns"><button class="pill pri" id="rBack">${tx('回到戰場', 'Back to the battle')}</button>${DEF.stages.length > 1 ? `<button class="pill sm" id="rPrac">${tx('重玩練習', 'Replay the practice')}</button>` : ''}</div>
      ${ST.kind === 'practice' ? `<p class="note">${tx('下面是正式戰鬥的完整規則。練習關卡只用到其中一部分。', 'These are the full rules of the real battle. The practice stages use only part of them.')}</p>` : ''}${M.rules(G, ST)}
      <p class="note">${tx('這些回合與數值是為了好玩而做的簡化。', 'These turns and numbers are simplifications made for play.')} ${tx('主選單的「這款遊戲簡化了什麼」有完整說明。', 'See “What this game simplifies” on the menu for the full list.')}</p>`,
      on: { rBack: B.closeCard, rPrac: () => B.go(0) } }));
  };
  const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>';
  B.stars = stars;
  function showEnd() {
    const r = G.result, n = DEF.stages.length, lastK = stageK === n - 1;
    if (ST.kind === 'practice') {
      if (r.win) { const c = IW.save.ch[DEF.id] = IW.save.ch[DEF.id] || {}; c.prac = Math.max(c.prac || 0, stageK + 1); IW.store(); }
      return B.card(() => ({ cls: r.win ? 'win' : 'lose', html: r.win
        ? `<h2>${tx('學會了', 'Learned')}　${stageK + 1} / ${DEF.stages.filter(s => s.kind === 'practice').length}</h2><h1>${pick(ST.won)}</h1><p>${typeof ST.say === 'function' ? ST.say(G) : pick(ST.say)}</p>
           <div class="btns"><button class="pill pri" id="eNext">${pick(ST.next)}</button></div>`
        : `<h2>${tx('再試一次', 'Try again')}</h2><h1>${pick(ST.lostTitle || ['這樣擋不住', 'That will not hold'])}</h1><p>${pick(ST.lost)}</p>
           <div class="btns"><button class="pill pri" id="eRetry">${tx('再試一次', 'Try again')}</button><button class="pill sm" id="eSkip">${tx('跳過練習', 'Skip the practice')}</button></div>`,
        on: { eNext: () => B.go(stageK + 1), eRetry: () => B.go(stageK), eSkip: () => B.go(DEF.stages.findIndex(s => s.kind !== 'practice')) } }));
    }
    const sum = M.summary(G, ST); if (DEF.onBattleEnd) DEF.onBattleEnd(G, sum, ST);
    B.card(() => {
      const s = M.summary(G, ST), btn = DEF.endButtons(G, s, ST, lastK);
      return { cls: r.win ? 'win' : 'lose', html: (r.win ? `<div class="stars">${stars(s.stars)}</div>` : '') + `<h2>${s.kicker}</h2><h1>${s.title}</h1>
        <div class="stats">${s.stats.map(x => `<div><b>${x[0]}</b>${x[1]}</div>`).join('')}</div>
        ${B.timeline(s)}<p>${s.insight}</p>${s.extra || ''}
        <div class="btns">${btn.map((b, i) => `<button class="pill${b.pri ? ' pri' : ''}${b.sm ? ' sm' : ''}" id="eb${i}">${b.label}</button>`).join('')}</div>`,
        on: Object.fromEntries(btn.map((b, i) => ['eb' + i, b.fn])) };
    });
  }
  // 這一局的時間軸：兩條線各自對自己的最大值正規化；玩家做過的關鍵操作標在回合下方
  B.timeline = function (s) {
    const hist = G.hist, n = hist.length; if (n < 2) return '';
    const X = k => 44 + k * (500 - 60) / Math.max(1, n - 1), Y = v => 104 - v * 80, col = [P.hema || '#6f4fa3', '#e8552e'];
    let out = `<svg viewBox="0 0 500 150" role="img" aria-label="${tx('這一局的時間軸', 'Timeline of this battle')}"><rect x="0" y="0" width="500" height="150" rx="12" fill="#fbf4ef"/>`;
    hist.forEach((h, k) => { if (h.bad) out += `<rect x="${X(k) - (X(1) - X(0)) / 2}" y="20" width="${X(1) - X(0)}" height="88" fill="rgba(192,48,79,.13)"/>`; });
    out += `<line x1="38" y1="104" x2="490" y2="104" stroke="rgba(58,41,71,.3)"/>`;
    s.series.forEach((se, i) => {
      const mx = Math.max(1, ...hist.map(h => h[se.key]));
      out += `<polyline fill="none" stroke="${se.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"${i ? ' stroke-dasharray="7 5"' : ''} points="${hist.map((h, k) => X(k).toFixed(1) + ',' + Y(h[se.key] / mx).toFixed(1)).join(' ')}"/>`;
      out += `<text x="${46 + i * 150}" y="14" font-size="12" fill="${se.color}" font-weight="600">${i ? '┅' : '━'} ${se.name}</text>`;
    });
    hist.forEach((h, k) => { if (!k || h.turn !== hist[k - 1].turn) out += `<text x="${X(k)}" y="119" font-size="10.5" text-anchor="middle" fill="#7d6a86">${h.turn}</text>`; });
    const byTurn = {}; for (const m of G.marks) (byTurn[m.turn] = byTurn[m.turn] || []).push(m.type);
    for (const t in byTurn) { const k = hist.findIndex(h => h.turn === +t); if (k < 0) continue; [...new Set(byTurn[t])].slice(0, 2).forEach((ty, j) => { const mk = s.marks[ty]; if (mk) out += `<text x="${X(k)}" y="${134 + j * 12}" font-size="11" text-anchor="middle" fill="${mk[1]}" font-weight="600">${mk[0]}</text>`; }); }
    if (s.badLabel && hist.some(h => h.bad)) out += `<text x="490" y="14" font-size="11.5" text-anchor="end" fill="#c0304f">▮ ${s.badLabel}</text>`;
    return out + `<text x="8" y="119" font-size="10.5" fill="#7d6a86">${tx('回合', 'Turn')}</text></svg>`;
  };

  /* ---------------- 特效 ---------------- */
  B.burst = function (x, y, n, col, sp, r) { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, v = (sp || 90) * (.4 + Math.random() * .8); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: .45 + Math.random() * .4, col, r: (r || 2.4) * (.6 + Math.random() * .8) }); } };
  B.ring = (x, y, col, r1, dur) => fx.push({ type: 'ring', x, y, col, r0: 12, r1: r1 || R, t: 0, dur: dur || .55 });
  B.ftext = (x, y, str, col) => fx.push({ type: 'text', x, y, str, col: col || P.ink, t: 0, dur: 1.25 });
  B.fly = o => fx.push(Object.assign({ type: 'fly', t: 0, dur: .6 }, o));                    // {x0,y0,x1,y1,dur,draw(x,y,u),done()}
  B.gulp = (u, items, label) => fx.push({ type: 'gulp', u, items, label, t: 0, dur: .5 });   // items:[{x,y,draw(x,y,s)}]
  // 格子上的小東西（細菌、病毒）：數量跟著規則層的數字走，位置慢慢滑到定位
  B.syncSprites = function (t, n, from) {
    while (t.sp.length > n) t.sp.pop();
    while (t.sp.length < n) { const s = from || t.sp[t.sp.length - 1] || t; t.sp.push({ x: s.x, y: s.y, rot: Math.random() * 6.28, ph: Math.random() * 10, s: from ? 1 : .4 }); }
  };
  function update(dt) {
    if (!G) return;
    for (const t of G.tiles) {
      t.flash = Math.max(0, t.flash - dt * 2.2); const n = t.sp.length, occ = G.units.some(u => u.tile === t.i);
      t.sp.forEach((s, k) => { const rad = occ ? 26 : (n === 1 ? 0 : 14), a = -Math.PI / 2 + k * (6.283 / n) + t.seed, tx_ = t.x + Math.cos(a) * rad, ty = t.y - 2 + Math.sin(a) * rad * .9, q = Math.min(1, dt * 6); s.x += (tx_ - s.x) * q; s.y += (ty - s.y) * q; s.s += (1 - s.s) * Math.min(1, dt * 5); s.ph += dt * 6; });
    }
    for (const u of G.units) {
      if (u.x === undefined) placeUnit(u);
      u.ph += dt; u.born = Math.max(0, u.born - dt * 1.6); u.gulp = Math.max(0, u.gulp - dt * 2.2);
      if (u.path.length) { const p = u.path[0], dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy), stp = 330 * dt * (IW.save.speed > 1 && G.phase === 'enemy' ? 1.8 : 1); if (d <= stp) { u.x = p.x; u.y = p.y; u.path.shift(); } else { u.x += dx / d * stp; u.y += dy / d * stp; } }
      else { const t = G.tiles[u.tile]; u.x += (t.x - u.x) * Math.min(1, dt * 10); u.y += (t.y - u.y) * Math.min(1, dt * 10); }
    }
    for (const p of parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy *= .94; }
    parts = parts.filter(p => p.life < p.max);
    for (const f of fx) {
      f.t += dt * (G.phase === 'enemy' ? (IW.save.speed || 1) : 1);
      if (f.type === 'gulp') { f.u.gulp = Math.max(f.u.gulp, 1 - f.t / f.dur); if (f.t >= f.dur && !f.done) { f.done = 1; IW.sfx('gulp'); B.burst(f.u.x, f.u.y, 6, '255,220,150', 50, 2); if (f.label) B.ftext(f.u.x, f.u.y - 44, f.label, P.ok || '#1c7f73'); } }
      if (f.type === 'fly' && f.t >= f.dur && !f.fin) { f.fin = 1; if (f.done) f.done(); }
    }
    fx = fx.filter(f => f.t < f.dur + (f.type === 'fly' ? (f.hold || 0) : 0));
  }
  function drawFx() {
    for (const f of fx) {
      const u = IW.clamp(f.t / f.dur, 0, 1);
      if (f.type === 'ring') { ctx.strokeStyle = `rgba(${f.col},${1 - u})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * IW.ease(u), 0, 6.283); ctx.stroke(); }
      else if (f.type === 'text') { ctx.font = A.font(15, 700); ctx.textAlign = 'center'; ctx.globalAlpha = u < .75 ? 1 : (1 - u) * 4; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(f.str, f.x, f.y - u * 22); ctx.fillStyle = f.col; ctx.fillText(f.str, f.x, f.y - u * 22); ctx.globalAlpha = 1; }
      else if (f.type === 'gulp') { for (const it of f.items) it.draw(IW.lerp(it.x, f.u.x, IW.ease(u)), IW.lerp(it.y, f.u.y, IW.ease(u)), 1 - .5 * u); }
      else if (f.type === 'fly') { const e = IW.ease(u); f.draw(IW.lerp(f.x0, f.x1, e), IW.lerp(f.y0, f.y1, e), u); }
    }
    for (const p of parts) { ctx.fillStyle = `rgba(${p.col},${1 - p.life / p.max})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  }
  function draw() {
    if (!G || !cv.width) return; const k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H); A.use(ctx);
    M.drawBack(G, T);
    for (const t of G.tiles) M.drawTile(G, t, T);
    M.drawOver(G, T);
    for (const u of G.units.slice().sort((a, b) => a.y - b.y)) M.drawUnit(G, u, T);
    drawFx(); if (M.drawTop) M.drawTop(G, T);
  }
  function loop(ts) {
    const now = ts / 1000, dt = Math.min(.05, last ? now - last : 0); last = now; T += dt;
    if (root) { update(dt); draw(); hintTick(); IW.tickBeat(dt); if (B.tick) B.tick(dt); raf = requestAnimationFrame(loop); }
  }
  B.ctxOf = () => ctx;
  // 測試與模擬用：不進入正式流程
  B.debug = { finish, showEnd, get fx() { return fx; } };
})(window.IW);
