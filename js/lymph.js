'use strict';
/* =====================================================================
   淋巴結：株系選擇（clonal selection）的小玩法
   每個 T 細胞天生帶著一組形狀不同的受體；找出和情報卡三格都吻合的那一個，它就開始大量複製。
   找得越久，前線等後援的回合越多。打過（或接種過）的病毒會留下記憶細胞：數量多、一眼就找到。
   同一個存檔裡，這群細胞是固定的（由 bodySeed 決定）：它們「一直都在」，不是遇到病毒才出現。
   這是簡化模型：真實的比對不是有人在挑，而是 T 細胞在淋巴結裡一個接一個碰觸樹突細胞。
   ===================================================================== */
(function (IW) {
  const { tx, pick, art: A } = IW, P = A.P, W = 390, H = 500, DOCK = { x: 195, y: 432 }, ARMY = 16, DOUBLE = .7;
  const L = IW.lymph = {};
  const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const SLOTS = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) SLOTS.push({ x: 63 + c * 66, y: 150 + r * 62 });
  // 這個身體的 T 細胞庫與兩種病毒的情報卡
  L.body = function () {
    const rnd = IW.rng(IW.save.bodySeed), all = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) all.push([a, b, c]);
    IW.shuffle(all, rnd);
    const VA = all[0], VB = all.find(c => c.filter((v, i) => v !== VA[i]).length >= 2), rest = all.filter(c => c !== VA && c !== VB).slice(0, 18);
    const cells = [VA, VB, ...rest].map((code, id) => ({ id, code: code.slice(), mem: null }));
    const m = IW.save.mem;                                   // 記憶細胞：原本那一個，加上複製後留下來的三個
    if (m.A) { cells[0].mem = 'A'; for (const k of [2, 3, 4]) { cells[k].code = VA.slice(); cells[k].mem = 'A'; } }
    if (m.B) { cells[1].mem = 'B'; for (const k of [5, 6, 7]) { cells[k].code = VB.slice(); cells[k].mem = 'B'; } }
    return { virus: { A: VA, B: VB }, cells };
  };
  L.delayOf = (secs, mem) => IW.save.relax ? (mem ? 1 : 3) : mem ? (secs <= 6 ? 1 : 2) : (secs <= 7 ? 2 : secs <= 14 ? 3 : 4);
  const steps = mem => mem ? [[6, 1], [Infinity, 2]] : [[7, 2], [14, 3], [Infinity, 4]];

  let S = null, host = null, cv = null, ctx = null, raf = 0, last = 0, capNow = null, btnNow = [];
  /* opts：{virus:'A'|'B', pressure:布林（有沒有前線在等）, vaccine:布林}；回傳 Promise<{secs,wrong,n0,mem,delay}> */
  L.run = function (el, opts) {
    return new Promise(resolve => {
      host = el; const body = L.body(), target = body.virus[opts.virus], order = IW.shuffle(SLOTS.map((_, i) => i), Math.random);
      const cells = body.cells.map((c, i) => Object.assign(c, { slot: order[i], x: SLOTS[order[i]].x, y: SLOTS[order[i]].y, ph: Math.random() * 9, shake: 0, born: 0 }));
      const n0 = cells.filter(c => same(c.code, target)).length;
      S = { opts, target, cells, n0, mem: n0 > 1, phase: 'intro', time: 0, wrong: 0, check: null, clones: [], n: 0, dt: 0, t: 0, lastDelay: 0, resolve };
      el.innerHTML = `<h3><b>${tx('淋巴結', 'The lymph node')}</b><span id="lnSub"></span></h3><div class="lnw"><canvas id="lnCv" width="780" height="1000"></canvas></div><p id="lnCap" aria-live="polite"></p><div class="btns" id="lnBtns"></div>`;
      el.classList.add('on'); cv = IW.$('lnCv'); ctx = cv.getContext('2d');
      cv.onpointerdown = e => {
        if (S.phase !== 'search' || S.check) return; const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * H / b.height;
        let best = null, bd = 34; for (const c of S.cells) { const d = Math.hypot(c.x - x, c.y - 9 - y); if (d < bd) { bd = d; best = c; } } if (best) L.tap(best.id);
      };
      ui(); last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    });
  };
  L.tap = function (id) {
    if (!S || S.phase !== 'search' || S.check) return false; const c = S.cells.find(c => c.id === id); if (!c) return false;
    const ok = same(c.code, S.target); S.check = { c, ok, t: 0, bad: ok ? -1 : c.code.findIndex((v, i) => v !== S.target[i]) }; IW.sfx('select'); return ok;
  };
  Object.defineProperty(L, 'S', { get: () => S });
  function say(c) { capNow = c; IW.$('lnCap').innerHTML = pick(c); }
  function btns(b) { btnNow = b; IW.$('lnBtns').innerHTML = b.map((x, i) => `<button class="pill${x.pri ? ' pri' : ''}" data-i="${i}">${pick(x.t)}</button>`).join(''); IW.$('lnBtns').querySelectorAll('button').forEach(e => e.onclick = () => btnNow[+e.dataset.i].f()); }
  function ui() {
    if (!S) return; const o = S.opts, first = !IW.save.tips.ln;
    IW.$('lnSub').textContent = o.vaccine ? tx('接種疫苗', 'Vaccination') : S.mem ? tx('這種病毒以前見過', 'This virus has been seen before') : tx('第一次遇到這種病毒', 'First encounter with this virus');
    if (S.phase === 'intro') {
      say(o.vaccine ? ['疫苗只把<b>情報卡</b>送進來，沒有會複製的病毒，前線很平靜。慢慢找出受體三格都吻合的 T 細胞。', 'A vaccine delivers only the <b>intel card</b>, with no virus that can multiply. The front is calm. Take your time finding the T cell whose three receptor shapes all match.']
        : S.mem ? ['偵察兵帶回情報卡。看看淋巴結裡多了什麼：綁著緞帶的<b>記憶細胞</b>，上次留下來的。', 'The scout is back with the intel card. Look what the lymph node has now: <b>memory cells</b> wearing ribbons, left over from last time.']
          : first ? ['偵察兵（樹突細胞）帶回一張<b>情報卡</b>。每個 T 細胞天生帶著一組形狀不同的受體。找出<b>三格都吻合</b>的那一個。找得越久，前線等後援的回合越多。', 'The scout (a dendritic cell) has brought back an <b>intel card</b>. Every T cell is born with its own set of receptor shapes. Find the one where <b>all three match</b>. The longer it takes, the more turns the front waits for backup.']
            : ['新的情報卡。舊的記憶細胞認不得這個形狀，要從頭找出三格都吻合的 T 細胞。', 'A new intel card. The old memory cells do not recognize this shape, so find a T cell whose three shapes all match.']);
      btns([{ t: ['開始尋找', 'Start the search'], pri: 1, f: () => { S.phase = 'search'; IW.sfx('turn'); ui(); } }]);
    } else if (S.phase === 'search') { btns([]); say(['點一個 T 細胞，拿它的受體和情報卡比對。', 'Tap a T cell to check its receptor against the card.']); }
    else if (S.phase === 'expand') {
      btns([]); say(S.n0 > 1 ? [`吻合！這次有 <b>${S.n0} 個</b>記憶細胞同時開始複製，很快就湊滿一支部隊。`, `A match! This time <b>${S.n0}</b> memory cells start copying themselves at once, and the army fills up fast.`]
        : ['吻合！被選中的這一個開始大量複製自己。這叫<b>株系選擇</b>：受體不是看到病毒才做的，而是從現成的裡面挑出來。', 'A match! The chosen cell starts copying itself. This is <b>clonal selection</b>: the receptor was not made in response to the virus; it was picked from what already existed.']);
    } else if (S.phase === 'done') {
      const d = S.res.delay, sec = S.res.secs.toFixed(1);
      say(o.vaccine ? [`找到了（${sec} 秒）。前線沒有任何細胞受損。一部分複製出來的細胞留下來成為<b>記憶細胞</b>：下次真的病毒來，就不必從頭找。`, `Found it (${sec} s). Nothing at the front was harmed. Some of the copies stay behind as <b>memory cells</b>: when the real virus comes, the search will not start from scratch.`]
        : [`花了 <b>${sec} 秒</b>。毒殺 T 細胞 <b>${d} 回合後</b>抵達戰場${S.mem ? '，抗體也同時就緒' : '，抗體再晚 1 回合'}。${S.mem ? '' : '打贏之後，一部分複製出來的細胞會留下來成為記憶細胞。'}`, `It took <b>${sec} s</b>. Cytotoxic T cells reach the battle <b>in ${d} turn${d > 1 ? 's' : ''}</b>${S.mem ? ', and antibodies are ready at the same time' : ', with antibodies 1 turn later'}.${S.mem ? '' : ' After the infection is cleared, some of the copies will stay behind as memory cells.'}`]);
      btns([{ t: o.vaccine ? ['完成接種 ▸', 'Finish vaccination ▸'] : ['回到戰場 ▸', 'Back to the battle ▸'], pri: 1, f: finish }]);
    }
  }
  IW.onLang(() => { if (S && host && host.classList.contains('on')) { const c = capNow, p = S.phase; ui(); if (p === 'search' && S.time > 0 && c) say(c); } });
  function finish() { const r = S.res, res = S.resolve; cancelAnimationFrame(raf); host.classList.remove('on'); host.innerHTML = ''; S = null; IW.save.tips.ln = 1; IW.store(); res(r); }
  function matched() {
    S.phase = 'expand'; S.found = S.time; S.n = S.n0; S.dt = 0; IW.sfx('ok');
    S.res = { secs: S.found, wrong: S.wrong, n0: S.n0, mem: S.mem, delay: S.opts.pressure ? L.delayOf(S.found, S.mem) : 0 }; ui();
  }
  function step(dt) {
    S.t += dt;
    for (const c of S.cells) { const s = SLOTS[c.slot], k = Math.min(1, dt * 5); if (!(S.check && S.check.c === c)) { c.x += (s.x - c.x) * k; c.y += (s.y - c.y) * k; } c.shake = Math.max(0, c.shake - dt * 3); c.born = Math.max(0, c.born - dt * 1.1); }
    if (S.phase === 'search') {
      S.time += dt;
      if (S.opts.pressure && !IW.save.relax) { const d = L.delayOf(S.time, S.mem); if (S.lastDelay && d > S.lastDelay) IW.sfx('tick'); S.lastDelay = d; }
      if (S.check) {
        const k = S.check, c = k.c, s = SLOTS[c.slot]; k.t += dt;
        const u = k.t < .28 ? k.t / .28 : k.t < .75 ? 1 : Math.max(0, 1 - (k.t - .75) / .22), e = u * u * (3 - 2 * u);
        c.x = s.x + (DOCK.x - s.x) * e; c.y = s.y + (DOCK.y - 58 - s.y) * e;
        if (k.ok && k.t >= .55) { c.x = DOCK.x; c.y = DOCK.y - 58; S.check = null; matched(); }
        else if (!k.ok && k.t >= .3 && !k.said) {
          k.said = 1; S.wrong++; c.shake = 1; IW.sfx('no');
          say(c.mem ? ['這是記憶細胞，但它記得的是另一種病毒，對不上這張情報卡。', 'This is a memory cell, but it remembers a different virus. It does not fit this card.']
            : [`不吻合：第 ${k.bad + 1} 格的形狀對不上。換一個試試。`, `No fit: shape ${k.bad + 1} does not match. Try another cell.`]);
        } else if (!k.ok && k.t >= .97) S.check = null;
      }
    } else if (S.phase === 'expand') {
      S.dt += dt;
      while (S.dt >= DOUBLE && S.n < ARMY) { S.dt -= DOUBLE; S.n = Math.min(ARMY, S.n * 2); IW.sfx('pop'); }
      while (S.clones.length < S.n) { const k = S.clones.length, a = k * 2.4, r = 34 + Math.sqrt(k) * 17; S.clones.push({ x: DOCK.x + Math.cos(a) * r, y: 250 + Math.sin(a) * r * .8, s: 0 }); }
      for (const cl of S.clones) cl.s = Math.min(1, cl.s + dt * 5);
      if (S.n >= ARMY && S.dt >= .7) {
        S.phase = 'done';
        if (S.opts.vaccine && !S.mem) { const v = S.opts.virus, pool = S.cells.filter(c => !c.mem && !same(c.code, S.target)).slice(0, 3); S.cells.find(c => same(c.code, S.target)).mem = v; for (const c of pool) { c.code = S.target.slice(); c.mem = v; c.born = 1; } }
        ui();
      }
    }
  }
  function strip() {
    const o = S.opts; ctx.fillStyle = '#fdf0f3'; ctx.fillRect(0, 0, W, 86); ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 86); ctx.lineTo(W, 86); ctx.stroke();
    ctx.font = A.font(12.5, 600); ctx.textAlign = 'left'; ctx.fillStyle = P.ink;
    if (!o.pressure) {
      ctx.fillText(tx('前線平靜', 'The front is calm'), 12, 22); ctx.font = A.font(12); ctx.fillStyle = P.ok; ctx.textAlign = 'right'; ctx.fillText(tx('疫苗裡沒有會複製的病毒', 'A vaccine has no virus that multiplies'), W - 12, 22);
      for (let i = 0; i < 9; i++) { ctx.fillStyle = P.eosin; ctx.strokeStyle = P.eosinEdge; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(22 + i * 39, 36, 32, 38, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = P.nucleus; ctx.globalAlpha = .8; ctx.beginPath(); ctx.ellipse(38 + i * 39, 62, 6, 5, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
      return;
    }
    ctx.fillText(tx('前線在等後援', 'The front is waiting for backup'), 12, 22);
    const st = steps(S.mem), t = S.phase === 'intro' ? 0 : S.phase === 'search' ? S.time : S.found, cur = L.delayOf(t, S.mem);
    ctx.textAlign = 'right'; ctx.fillStyle = cur >= 3 ? P.danger : P.ink; ctx.fillText(IW.save.relax ? tx('放鬆模式：不計時', 'Relaxed mode: no timer') : tx(`後援 ${cur} 回合後到`, `Backup in ${cur} turn${cur > 1 ? 's' : ''}`), W - 12, 22);
    const x0 = 12, w = (W - 24 - (st.length - 1) * 6) / st.length; let prev = 0;
    st.forEach(([lim, d], i) => {
      const x = x0 + i * (w + 6), span = lim === Infinity ? 7 : lim - prev, f = IW.save.relax ? (d === cur ? 1 : 0) : IW.clamp((t - prev) / span, 0, 1), on = d === cur;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = P.ink; ctx.lineWidth = on ? 2.2 : 1.2; ctx.beginPath(); ctx.roundRect(x, 34, w, 40, 9); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, 34, w, 40, 9); ctx.clip(); ctx.fillStyle = d >= 4 ? 'rgba(192,48,79,.3)' : d === 3 ? 'rgba(226,160,44,.38)' : 'rgba(31,157,143,.3)'; ctx.fillRect(x, 34, w * f, 40); ctx.restore();
      ctx.font = A.font(13, on ? 700 : 400); ctx.textAlign = 'center'; ctx.fillStyle = P.ink; ctx.fillText(tx(`${d} 回合`, `${d} turn${d > 1 ? 's' : ''}`), x + w / 2, 52);
      ctx.font = A.font(10.5); ctx.fillStyle = P.dim; ctx.fillText(lim === Infinity ? tx(`超過 ${prev} 秒`, `over ${prev} s`) : tx(`${lim} 秒內`, `within ${lim} s`), x + w / 2, 67); prev = lim;
    });
  }
  function draw() {
    const k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H); A.use(ctx);
    ctx.fillStyle = '#ece2f6'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(111,79,163,.07)'; ctx.beginPath(); ctx.arc(50 + i * 78 + (i % 2) * 14, 240 + Math.sin(i * 2.3) * 70, 58, 0, 6.283); ctx.fill(); }   // 淋巴濾泡的暗示
    strip();
    ctx.font = A.font(12); ctx.textAlign = 'left'; ctx.fillStyle = P.dim; ctx.fillText(tx('T 細胞在這裡等待', 'T cells wait here'), 12, 104);
    ctx.globalAlpha = S.phase === 'expand' || S.phase === 'done' ? .25 : S.phase === 'intro' ? .8 : 1;
    for (const c of S.cells) { if (S.check && S.check.c === c) continue; if (c.born) { ctx.strokeStyle = `rgba(31,157,143,${c.born})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 23 + (1 - c.born) * 14, 0, 6.283); ctx.stroke(); } A.lymph(c.x, c.y + Math.sin(S.t * 1.6 + c.ph) * 1.6, 19, { code: c.code, mem: c.mem, t: S.t, shake: c.shake }); }
    ctx.globalAlpha = 1;
    A.card(DOCK.x, DOCK.y, 1, S.target);
    if (S.check && S.check.t > .28 && S.check.t < .8) for (let i = 0; i < 3; i++) { const ok = S.check.c.code[i] === S.target[i]; ctx.font = A.font(15, 700); ctx.textAlign = 'center'; ctx.fillStyle = ok ? P.ok : P.danger; ctx.fillText(ok ? '✓' : '✕', DOCK.x - 30 + i * 30, DOCK.y - 27); }
    ctx.font = A.font(12); ctx.textAlign = 'center'; ctx.fillStyle = P.dim; ctx.fillText(tx('情報卡（病毒的特徵）', 'Intel card (the virus’s features)'), DOCK.x, DOCK.y + 38);
    A.dc(DOCK.x - 96, DOCK.y, .95, { ph: S.t }); ctx.font = A.font(12); ctx.fillStyle = P.dim; ctx.fillText(tx('偵察兵', 'Scout'), DOCK.x - 96, DOCK.y + 42);
    if (!IW.save.relax && S.phase !== 'intro') { ctx.font = A.font(19, 600); ctx.fillStyle = P.ink; ctx.fillText((S.phase === 'search' ? S.time : S.found).toFixed(1), DOCK.x + 98, DOCK.y + 5); ctx.font = A.font(12); ctx.fillStyle = P.dim; ctx.fillText(tx('秒', 'seconds'), DOCK.x + 98, DOCK.y + 38); }
    if (S.check) A.lymph(S.check.c.x, S.check.c.y, 19, { code: S.check.c.code, mem: S.check.c.mem, t: S.t, shake: S.check.c.shake, mood: S.check.t > .3 ? (S.check.ok ? 'happy' : 'sad') : 'o', glow: S.check.ok && S.check.t > .3 });
    if (S.phase === 'expand' || S.phase === 'done') {
      ctx.fillStyle = 'rgba(251,244,239,.84)'; ctx.beginPath(); ctx.arc(DOCK.x, 250, 118, 0, 6.283); ctx.fill();
      for (const cl of S.clones) A.lymph(cl.x, cl.y, 11 * cl.s, { bare: 1, glow: 1, t: S.t, mood: 'happy' });
      ctx.font = A.font(17, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#8a5a12'; ctx.fillText('× ' + S.n, DOCK.x, 256);
    }
  }
  function loop(ts) { if (!S) return; const now = ts / 1000, dt = Math.min(.05, last ? now - last : 0); last = now; step(dt); if (S) { draw(); raf = requestAnimationFrame(loop); } }
})(window.IW);
