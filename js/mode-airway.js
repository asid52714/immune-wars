'use strict';
/* =====================================================================
   第 2 章｜呼吸道：病毒、巨噬細胞、樹突細胞、淋巴結、毒殺 T 細胞、抗體
   第 3 章｜捲土重來：同一種病毒再來（免疫記憶）、新的變種與疫苗的選擇
   兩章共用同一套規則；差別只在「這個身體記得什麼」——記憶存在存檔裡，是玩家自己留下的。
   ===================================================================== */
(function (IW) {
  const { $, tx, pick, art: A, battle: B, airway: AW } = IW, P = A.P, W = B.W, H = B.H, R = B.R;
  const M = IW.modeAirway = { banner: ['病毒行動中', 'Viruses are acting'] };
  const selU = G => G.units.find(u => u.id === G.sel);
  const canAct = G => G.phase === 'player' && !G.result && G.ap > 0 && !B.busy;
  const VN = k => k === 'B' ? tx('病毒 乙', 'Virus B') : tx('病毒 甲', 'Virus A');
  let aim = null, pend = -1, acts = 0;
  M.aim = () => aim;

  M.setup = (seed, st) => { const G = AW.setup(seed, st.cfg, st.preset); G.scn = st.scn || { virus: 'A', key: 'first' }; return G; };
  M.enter = G => { aim = null; pend = -1; acts = 0; for (const t of G.tiles) B.syncSprites(t, t.vir, { x: t.x, y: t.y }); };
  M.forecast = AW.forecast;
  M.check = AW.verdict;
  M.beat = G => IW.clamp(Math.max(AW.nInf(G) / 9, 1 - AW.health(G)) * 1.2 - .15, 0, 1);
  M.sample = G => ({ turn: G.turn, inf: AW.nInf(G), vir: AW.nVir(G), bad: false });
  M.cancel = () => { aim = null; pend = -1; };

  /* ---------------- 操作 ---------------- */
  const virItems = (t, n) => t.sp.splice(Math.max(0, t.sp.length - n), n).map(s => ({ x: s.x, y: s.y, draw: (x, y, k) => A.virion(x, y, .8 * k, s.ph, 1, 'worry') }));
  function doEat(G, u, i) {
    const t = G.tiles[i], n = AW.actEat(G, u, i); B.gulp(u, virItems(t, n), tx('吞噬 ×', 'Engulfed ×') + n); acts++;
    B.hint('eatv', ['巨噬細胞可以吞掉還在細胞外面的病毒。但病毒一旦鑽進細胞，它就碰不到了。', 'A macrophage can engulf viruses that are still outside cells. Once a virus gets inside a cell, it is out of reach.']);
    B.afterAction();
  }
  function doMove(G, u, i, prev) {
    const path = []; for (let j = i; j !== u.tile; j = prev.get(j)) path.unshift({ x: G.tiles[j].x, y: G.tiles[j].y });
    u.path.push(...path); AW.actMove(G, u, i); IW.sfx('move'); acts++; B.afterAction();
  }
  async function doAntigen(G, u) {
    const from = { x: u.x, y: u.y }, code = IW.lymph.body().virus[G.scn.virus];
    AW.actAntigen(G, u); G.sel = -1; B.mark('antigen'); acts++; IW.sfx('antigen'); B.ring(from.x, from.y, '246,198,111', R * 1.5, .7);
    B.fly({ x0: from.x, y0: from.y, x1: W - 30, y1: H + 30, dur: .9, draw: (x, y) => A.dc(x, y, 1, { ph: B.T, card: code }) });
    B.ftext(from.x, from.y - 44, tx('帶著情報前往淋巴結', 'Taking the intel to the lymph node'), '#8a5a12');
    B.busy = true; B.hud(); await IW.wait(950); if (B.G !== G) return;
    const res = await IW.lymph.run($('ln'), { virus: G.scn.virus, pressure: true }); if (B.G !== G) return;
    AW.setDelay(G, res.delay, res.mem); G.ln = res; B.busy = false; IW.sfx('ok');
    B.hint('agdone', [`毒殺 T 細胞第 ${G.tAt} 回合抵達，抗體第 ${G.abAt} 回合就緒。在那之前，靠巨噬細胞守住。`, `Cytotoxic T cells arrive on turn ${G.tAt}; antibodies are ready on turn ${G.abAt}. Until then, hold the line with macrophages.`], true);
    B.afterAction();
  }
  function doAb(G, i) {
    const hit = AW.areaOf(G, i).filter(j => G.tiles[j].vir > 0), n = AW.actAb(G, i); B.mark('ab'); acts++;
    for (const j of AW.areaOf(G, i)) { const t = G.tiles[j]; B.fly({ x0: t.x, y0: t.y - 26, x1: t.x, y1: t.y - 4, dur: .5, draw: (x, y, u) => A.antibody(x, y, Math.sin(t.seed) * .6, 1.25, 1 - u * .5) }); }
    for (const j of hit) { const t = G.tiles[j]; for (const s of t.sp) B.burst(s.x, s.y, 6, '226,160,44', 60, 2); t.sp.length = 0; }
    IW.sfx('ab'); B.ftext(G.tiles[i].x, G.tiles[i].y - 40, tx('中和 ×', 'Neutralized ×') + n, '#8a5a12');
    B.hint('ab', ['抗體黏在病毒表面，讓它無法附著、進入細胞。但抗體進不了細胞：已經被感染的細胞，要靠毒殺 T 細胞。', 'Antibodies stick to the surface of a virus so it cannot attach to or enter a cell. But antibodies cannot get inside cells: infected cells are a job for cytotoxic T cells.']);
    if (!AW.canAb(G)) { aim = null; } pend = -1; B.afterAction();
  }
  function doCtl(G, i) {
    const t = G.tiles[i]; AW.actCtl(G, i); B.mark('tcell'); acts++; IW.sfx('ctl');
    B.fly({ x0: t.x, y0: H - 20, x1: t.x + 20, y1: t.y - 14, dur: .38, hold: .35, draw: (x, y) => A.lymph(x, y, 13, { bare: 1, t: B.T, mood: 'focus' }) });
    setTimeout(() => { if (B.G !== G) return; t.flash = 1; B.burst(t.x, t.y, 14, '111,79,163', 110, 2.6); B.ftext(t.x, t.y - 30, tx('關掉病毒工廠', 'Factory shut down'), P.hema); }, 380 / (IW.save.speed || 1));
    B.hint('ctl', ['毒殺 T 細胞認出受感染的細胞，讓它啟動自我了斷（細胞凋亡），裡面的病毒工廠跟著關閉。代價是失去這個細胞，所以越早清，省下的組織越多。', 'A cytotoxic T cell recognizes the infected cell and makes it self-destruct (apoptosis), shutting down the virus factory inside. The cost is losing that cell, so the sooner you clear it, the more tissue you save.']);
    if (!AW.canCtl(G)) { aim = null; } pend = -1; B.afterAction();
  }
  M.tap = function (G, i) {
    if (i < 0) { G.sel = -1; pend = -1; return B.hud(); }
    const t = G.tiles[i];
    if (aim === 'ab') {
      if (!AW.canAb(G)) { IW.sfx('deny'); return; }
      if (!AW.abCount(G, i)) { IW.sfx('deny'); return B.hint('noab', ['這個範圍沒有細胞外的病毒。抗體只能中和還沒進入細胞的病毒。', 'No free viruses in this area. Antibodies can only neutralize viruses that have not entered a cell yet.'], true); }
      if (IW.touch && pend !== i) { pend = i; return; } return doAb(G, i);
    }
    if (aim === 'ctl') {
      if (!AW.canCtl(G)) { IW.sfx('deny'); return; }
      if (t.st !== 1) { IW.sfx('deny'); return B.hint('noctl', ['毒殺 T 細胞只對付受感染的細胞（灰紫色）。細胞外的病毒要靠巨噬細胞或抗體。', 'Cytotoxic T cells only deal with infected cells (grey-violet). Free viruses are a job for macrophages or antibodies.'], true); }
      if (IW.touch && pend !== i) { pend = i; return; } return doCtl(G, i);
    }
    const sel = selU(G), u = AW.unitAt(G, i);
    if (u && u !== sel) { G.sel = u.id; pend = -1; IW.sfx('select'); return B.hud(); }
    if (!sel) { if (t.vir || t.st === 1) B.hint('needsel', ['先點選一個免疫細胞，再下達指令。', 'Select an immune cell first, then give the order.'], true); return; }
    if (sel.kind === 'dc' && AW.agTargets(G, sel).includes(i) && i !== sel.tile) { if (IW.touch && pend !== i) { pend = i; return; } return doAntigen(G, sel); }
    if (sel.kind === 'mac' && AW.eatTargets(G, sel).includes(i)) return doEat(G, sel, i);
    if (u === sel) { if (sel.kind === 'dc' && AW.agTargets(G, sel).length) { if (IW.touch && pend !== i) { pend = i; return; } return doAntigen(G, sel); } return; }
    const prev = AW.moveTargets(G, sel); if (prev.has(i)) { pend = -1; return doMove(G, sel, i, prev); }
    IW.sfx('deny');
    if (G.ap < 1) B.hint('ap0', ['行動點數用完了。按「結束回合」，換病毒行動。', 'Out of action points. Press “End turn” to let the viruses act.'], true);
    else if (sel.kind === 'mac' && t.st === 1) B.hint('macno', ['巨噬細胞碰不到躲在細胞裡的病毒。受感染的細胞要靠毒殺 T 細胞。', 'A macrophage cannot reach viruses hiding inside a cell. Infected cells are a job for cytotoxic T cells.'], true);
  };
  M.act = function (G, id) {
    if (G.phase !== 'player' || G.result || B.busy) return;
    const ok = id === 'ab' ? AW.canAb(G) : AW.canCtl(G);
    if (!ok) { IW.sfx('deny'); return B.hint('notready', !G.ag ? ['後援還沒啟動：要先讓偵察兵（樹突細胞）取得情報，送到淋巴結。', 'Backup has not started: first have the scout (dendritic cell) collect intel and take it to the lymph node.'] : G.ap < 1 ? ['行動點數用完了。', 'Out of action points.'] : ['後援還在路上，或這回合的次數用完了。', 'Backup is still on the way, or this turn’s uses are spent.'], true); }
    IW.sfx('select'); aim = aim === id ? null : id; pend = -1; if (aim) G.sel = -1; B.hud();
  };
  M.info = function (G, i) {
    const t = G.tiles[i], u = AW.unitAt(G, i), sel = selU(G), L = [];
    if (aim === 'ab') { const n = AW.abCount(G, i); L.push(n ? tx(`<b>${IW.touch && pend === i ? '再點一次：' : ''}抗體中和 ${n} 個病毒</b>（這格與相鄰格，1 點）`, `<b>${IW.touch && pend === i ? 'Tap again: ' : ''}antibodies neutralize ${n} virus${n > 1 ? 'es' : ''}</b> (this tile and its neighbors, 1 AP)`) : tx('這個範圍沒有細胞外的病毒。', 'No free viruses in this area.')); }
    else if (aim === 'ctl') L.push(t.st === 1 ? tx(`<b>${IW.touch && pend === i ? '再點一次：' : ''}清除這個受感染的細胞</b>（1 點，組織 −1）`, `<b>${IW.touch && pend === i ? 'Tap again: ' : ''}clear this infected cell</b> (1 AP, tissue −1)`) : tx('毒殺 T 細胞只對付受感染的細胞。', 'Cytotoxic T cells only deal with infected cells.'));
    else if (sel && G.phase === 'player' && !(u && u !== sel)) {
      if (sel.kind === 'dc' && AW.agTargets(G, sel).includes(i)) L.push(tx(`<b>${IW.touch && pend === i ? '再點一次' : '點一下'}：取得情報，前往淋巴結</b>（1 點，偵察兵會離開戰場）`, `<b>${IW.touch && pend === i ? 'Tap again' : 'Tap'}: collect intel and go to the lymph node</b> (1 AP; the scout leaves the field)`));
      else if (sel.kind === 'mac' && AW.eatTargets(G, sel).includes(i)) L.push(tx(`<b>點一下：吞噬 ${AW.eatCount(G, sel, i)} 個病毒</b>（1 點）`, `<b>Tap: engulf ${AW.eatCount(G, sel, i)}</b> (1 AP)`));
      else if (AW.moveTargets(G, sel).has(i)) L.push(tx('<b>點一下：移動到這裡</b>（1 點）', '<b>Tap: move here</b> (1 AP)'));
    }
    if (u) L.push(u.kind === 'dc' ? tx('<b>樹突細胞（偵察兵）</b>　不戰鬥。走到病毒或受感染細胞旁邊取樣，把情報送到淋巴結。', '<b>Dendritic cell (scout)</b>  Does not fight. Move next to a virus or an infected cell to sample it, then carry the intel to the lymph node.')
      : tx(`<b>巨噬細胞</b>　體內 ${u.stomach}/${G.cfg.CAP}，回合結束消化 ${G.cfg.DIGEST} 個。只能吞細胞外的病毒。`, `<b>Macrophage</b>  holding ${u.stomach}/${G.cfg.CAP}; digests ${G.cfg.DIGEST} at end of turn. Can only engulf viruses outside cells.`));
    if (t.st === 1) L.push(t.age === 0 ? tx('<b>剛被感染的細胞</b>　病毒正在裡面複製，下回合開始釋放。', '<b>Newly infected cell</b>  The virus is copying itself inside; release starts next turn.') : tx(`<b>受感染的細胞（病毒工廠）</b>　還會釋放 ${AW.relLeft(G, t)} 回合，每回合 ${G.cfg.REL_N} 個，然後耗盡死亡。`, `<b>Infected cell (virus factory)</b>  Releases ${G.cfg.REL_N} per turn for ${AW.relLeft(G, t)} more turn(s), then dies.`));
    else if (t.st === 2) L.push(t.by === 'ctl' ? tx('被毒殺 T 細胞清除的細胞', 'A cell cleared by a cytotoxic T cell') : tx('被病毒耗盡而死亡的細胞', 'A cell used up and killed by the virus'));
    else if (t.vir) L.push(tx(`<b>細胞外的病毒 ×${t.vir}</b>　回合結束會鑽進這個細胞。`, `<b>Free virus ×${t.vir}</b>  Will enter this cell at the end of the turn.`));
    else if (!L.length) L.push(tx('健康的上皮細胞', 'Healthy epithelial cell'));
    return L.join('<br>');
  };
  M.guide = function (G, st) {
    const sel = selU(G), c = IW.save.ch.airway || {};
    if (aim === 'ab') return tx('抗體：點一片有細胞外病毒的區域（金色外框）。', 'Antibodies: tap an area with free viruses (gold outlines).') + (IW.touch ? tx('點一下預覽，再點一次執行。', ' Tap once to preview, again to do it.') : '');
    if (aim === 'ctl') return tx('毒殺 T 細胞：點一個受感染的細胞。', 'Cytotoxic T cell: tap an infected cell.') + (IW.touch ? tx('點一下預覽，再點一次執行。', ' Tap once to preview, again to do it.') : '');
    if (G.ap === 0) return tx('行動點數用完了：按「結束回合」。', 'Out of action points: press “End turn”.');
    if (st.kind !== 'practice' && (c.done || G.scn.key !== 'first')) return '';
    if (st.kind !== 'practice') {
      if (!G.ag && G.turn <= 2 && G.units.some(u => u.kind === 'dc') && !(sel && sel.kind === 'dc')) return tx('正式戰鬥。後援要等偵察兵把情報送到淋巴結才會啟動，越早越好。', 'The real battle. Backup only starts once the scout delivers intel to the lymph node, so the sooner the better.');
      return '';
    }
    if (!sel) return acts ? tx('再點一個免疫細胞繼續，或按「結束回合」。', 'Select an immune cell to keep going, or press “End turn”.') : '';
    if (sel.kind === 'dc') return AW.agTargets(G, sel).length ? tx('標著「取樣」的格子：點它，偵察兵就帶著情報前往淋巴結。', 'Tiles marked “Sample”: tap one and the scout takes the intel to the lymph node.') : tx('讓偵察兵走到病毒或受感染細胞的旁邊。', 'Move the scout next to a virus or an infected cell.');
    if (AW.eatTargets(G, sel).length) return tx('標著「吞」的病毒可以吞噬（1 點）。', 'Viruses marked “Eat” can be engulfed (1 AP).');
    return '';
  };

  /* ---------------- 病毒回合 ---------------- */
  M.enemy = async function (G, api) {
    const dg = AW.phaseDigest(G); for (const e of dg) { const u = G.units.find(u => u.id === e.id); B.burst(u.x, u.y, 5, '120,190,140', 40, 1.8); }
    await api.wait(dg.length ? 300 : 60); if (!api.alive()) return;
    const inf = AW.phaseInfect(G);
    for (const i of inf) { const t = G.tiles[i]; t.flash = 1; t.sp.length = 0; B.ring(t.x, t.y, '192,48,79', R * .9, .5); }
    if (inf.length) { IW.sfx('infect'); api.hint('infect', ['病毒鑽進細胞了。它自己不會複製，要借用細胞的設備來製造新病毒：這個細胞變成了病毒工廠。', 'The virus has entered a cell. It cannot copy itself; it borrows the cell’s machinery to make new viruses. This cell is now a virus factory.']); }
    B.hud(); await api.wait(inf.length ? 620 : 60); if (!api.alive()) return;
    const rel = AW.phaseRelease(G);
    for (const e of rel) {
      const s = G.tiles[e.from];
      if (e.unit !== undefined) { const u = G.units.find(u => u.id === e.unit); B.gulp(u, [{ x: s.x, y: s.y, draw: (x, y, k) => A.virion(x, y, .8 * k, 0, 1, 'worry') }], tx('攔截 ×1', 'Blocked ×1')); api.hint('sentinel', ['守在箭頭落點的巨噬細胞，會直接吞掉剛釋放出來的病毒。', 'A macrophage standing where an arrow lands engulfs the newly released virus.']); }
      else B.syncSprites(G.tiles[e.to], G.tiles[e.to].vir, { x: s.x, y: s.y });
    }
    if (rel.length) { IW.sfx('spread'); api.hint('release', ['工廠細胞釋放出新的病毒，落在鄰近的細胞上。', 'Factory cells release new viruses onto neighboring cells.']); }
    B.hud(); await api.wait(rel.length ? 620 : 60); if (!api.alive()) return;
    const die = AW.phaseAge(G);
    for (const i of die) { const t = G.tiles[i]; t.flash = 1; B.burst(t.x, t.y, 9, '125,106,134', 70, 2.4); B.ftext(t.x, t.y - 20, '−1', P.danger); }
    if (die.length) { IW.sfx('hurt'); api.hint('die', ['被感染的細胞耗盡後死亡。不管是被病毒耗盡，還是被 T 細胞清除，組織都少了一個細胞。', 'An infected cell dies once it is used up. Whether the virus used it up or a T cell cleared it, the tissue is one cell short.']); }
    for (const t of G.tiles) B.syncSprites(t, t.vir);
    B.hud(); await api.wait(die.length ? 560 : 100); if (!api.alive()) return;
    AW.advance(G);
  };
  M.newTurn = function (G) {
    pend = -1;
    if (G.tAt && G.turn === G.tAt) { IW.sfx('arrive'); B.ftext(110, H - 54, tx('毒殺 T 細胞抵達', 'Cytotoxic T cells arrive'), P.hema); B.hint('tarrive', [`毒殺 T 細胞抵達！按下方的「毒殺 T 細胞」，再點受感染的細胞。每回合 ${G.cfg.CTL_N} 次。`, `Cytotoxic T cells have arrived! Press “Cytotoxic T” below, then tap an infected cell. ${G.cfg.CTL_N} uses per turn.`], true); }
    if (G.abAt && G.turn === G.abAt) { if (G.turn !== G.tAt) IW.sfx('arrive'); B.ftext(W - 120, H - 54, tx('抗體就緒', 'Antibodies ready'), '#8a5a12'); B.hint('abarrive', ['漿細胞開始分泌抗體！按「抗體」，再點有細胞外病毒的區域。濃度會逐回合上升。', 'Plasma cells have started making antibodies! Press “Antibodies”, then tap an area with free viruses. The supply rises turn by turn.'], G.turn !== G.tAt); }
  };

  /* ---------------- HUD ---------------- */
  M.hud = function (G) {
    const c = G.cfg, hp = AW.health(G), nI = AW.nInf(G), nV = AW.nVir(G), pl = G.phase === 'player', fc = pl ? G.fc : null, f = []; let bad = '';
    if (fc) {
      const p = []; if (fc.infect.length) p.push(tx(`${fc.infect.length} 個細胞會被感染`, `${fc.infect.length} cell(s) will be infected`)); if (fc.release) p.push(tx(`工廠釋放 ${fc.release} 個病毒`, `factories release ${fc.release}`)); if (fc.die.length) p.push(tx(`${fc.die.length} 個工廠耗盡死亡`, `${fc.die.length} factory cell(s) die`));
      if (p.length) f.push(tx('回合結束：', 'End of turn: ') + p.join(tx('、', ', ')) + tx('。', '.'));
      if (fc.res && !fc.res.win) bad = fc.res.why === 'tissue' ? tx('組織會損傷殆盡', 'the tissue will be destroyed') : tx('這是最後一回合', 'this is the last turn');
      if (bad) f.push(`<span class="w">${tx('就這樣結束回合：', 'If you end the turn now: ')}${bad}。</span>`);
    }
    f.push(!G.ag ? (G.units.some(u => u.kind === 'dc') ? `<span class="w">${tx('後援還沒啟動：偵察兵還沒取得情報。', 'Backup not started: the scout has no intel yet.')}</span>` : '')
      : G.turn < G.tAt ? tx(`後援在路上：T 細胞第 ${G.tAt} 回合、抗體第 ${G.abAt} 回合。`, `Backup on the way: T cells on turn ${G.tAt}, antibodies on turn ${G.abAt}.`)
        : G.turn < G.abAt ? tx(`T 細胞已抵達；抗體第 ${G.abAt} 回合就緒。`, `T cells are here; antibodies ready on turn ${G.abAt}.`) : '');
    const wait = at => !G.ag ? tx('還沒有情報', 'no intel yet') : G.turn < at ? tx(`第 ${at} 回合`, `turn ${at}`) : tx('這回合用完了', 'used up this turn');
    return {
      turn: tx(`回合 ${G.turn} / ${c.TURNS}`, `Turn ${G.turn} / ${c.TURNS}`),
      pips: Array.from({ length: c.TURNS }, (_, k) => { const n = k + 1; return { cls: n < G.turn ? 'done' : n === G.turn ? 'now' : '', m: n === G.tAt && n === G.abAt ? 'T·Y' : n === G.tAt ? 'T' : n === G.abAt ? 'Y' : '' }; }),
      gauges: [
        { label: tx('組織健康', 'Tissue'), val: Math.round(hp * 100) + '%', frac: hp, color: P.teal, warn: hp < .35, title: tx('遊戲化的整體損傷預算，歸零即失敗。', 'A game-style damage budget; zero means defeat.') },
        { label: tx('受感染細胞', 'Infected'), val: fc && fc.nInf !== nI ? `${nI} <small>→ ${fc.nInf}</small>` : nI, frac: nI / 12, next: fc ? fc.nInf / 12 : undefined, color: P.sickEdge, warn: nI >= 8 },
        { label: tx('細胞外病毒', 'Free virus'), val: fc && fc.nVir !== nV ? `${nV} <small>→ ${fc.nVir}</small>` : nV, frac: nV / 14, next: fc ? fc.nVir / 14 : undefined, color: P.vir }],
      goal: f.filter(Boolean).join(' '),
      acts: [{ id: 'ab', label: tx('抗體', 'Antibodies') + (G.ab ? ' ×' + G.ab : ''), sub: G.ab ? tx('中和一片細胞外病毒', 'neutralize free virus in an area') : wait(G.abAt), color: P.gold, on: aim === 'ab', disabled: !AW.canAb(G) },
        { id: 'ctl', label: tx('毒殺 T 細胞', 'Cytotoxic T') + (G.ctl ? ' ×' + G.ctl : ''), sub: G.ctl ? tx('清除一個受感染的細胞', 'clear one infected cell') : wait(G.tAt), color: P.tcell, on: aim === 'ctl', disabled: !AW.canCtl(G) }],
      endDanger: !!bad
    };
  };

  /* ---------------- 畫面 ---------------- */
  M.drawBack = function (G, T) {
    const c = B.ctxOf();
    c.fillStyle = '#fdf3f1'; c.fillRect(0, 0, W, H);
    c.fillStyle = P.lumen; c.fillRect(0, 0, W, 58);                                        // 氣道內腔（空氣這一側）
    c.fillStyle = P.mucus; c.beginPath(); c.moveTo(0, 58); for (let x = 0; x <= W; x += 20) c.lineTo(x, 46 + Math.sin(x * .05 + T * .8) * 3); c.lineTo(W, 58); c.closePath(); c.fill();
    for (let i = 0; i < 4; i++) A.virion(((T * 14 + i * 130) % (W + 60)) - 30, 20 + Math.sin(T * 1.1 + i * 2) * 6, .7, T * 2 + i, .55, 'calm');
    c.font = A.font(11.5); c.textAlign = 'left'; c.fillStyle = '#5f7f8c'; c.fillText(tx('氣道（空氣這一側）', 'Airway (the air side)'), 6, 12);
    IW.modeSkin.vessel(c, T, !G.ag ? tx('血管與淋巴管：後援從這裡來', 'Blood and lymph vessels: backup comes from here') : '');
    for (let k = 0; k < G.ctl; k++) A.lymph(30 + k * 34, H - 22, 12, { bare: 1, t: T, mood: 'focus' });   // 待命的後援
    for (let k = 0; k < G.ab; k++) A.antibody(W - 30 - k * 24, H - 22, Math.sin(T * 2 + k) * .25, 1.3);
  };
  M.drawTile = function (G, t, T) {
    const c = B.ctxOf();
    if (t.r === 0 && t.st !== 2) { c.strokeStyle = 'rgba(58,41,71,.5)'; c.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { const x = t.x + k * 7; c.beginPath(); c.moveTo(x, t.y - 34 + Math.abs(k) * 2.4); c.quadraticCurveTo(x + Math.sin(T * 3 + k + t.i) * 3, t.y - 42, x + Math.sin(T * 3 + k + t.i) * 5, t.y - 46 + Math.abs(k)); c.stroke(); } }   // 纖毛
    A.cell(t.x, t.y, { st: t.st, seed: t.seed, t: T, flash: t.flash });
    if (t.st === 1) {
      if (t.age >= 1) { A.virion(t.x - 17, t.y + 13, .5, T * 3 + t.i, .95); A.virion(t.x + 18, t.y + 9, .5, T * 3 + t.i + 2, .95); }
      const n = t.age === 0 ? 0 : AW.relLeft(G, t); for (let k = 0; k < n; k++) { const x = t.x + (k - (n - 1) / 2) * 9, y = t.y + 28; c.fillStyle = P.spike; c.strokeStyle = P.ink; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 3.6, y); c.lineTo(x, y + 4); c.lineTo(x - 3.6, y); c.closePath(); c.fill(); c.stroke(); }
      if (t.age === 0) A.badge(t.x, t.y + 28, tx('複製中', 'copying'), P.ink, '#fff', 10.5);
    }
    for (const s of t.sp) A.virion(s.x, s.y, .82 * s.s, s.ph * .5);
  };
  M.drawOver = function (G, T) {
    const c = B.ctxOf(), pl = G.phase === 'player', sel = selU(G), fc = G.fc, hov = IW.touch ? pend : B.hover;
    if (pl) {
      for (const t of G.tiles) if (t.st === 1 && t.age >= 1) for (const j of t.rel) { const to = G.tiles[j]; A.arrow(t.x, t.y, to.x, to.y, P.spike, T); }   // 預告：工廠會把病毒釋放到哪裡
      if (fc) { for (const i of fc.infect) { const t = G.tiles[i]; A.softHex(t.x, t.y, 37.5); c.strokeStyle = P.danger; c.lineWidth = 2.4; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]); A.badge(t.x + 22, t.y - 26, '!', '#fff', P.danger, 12); }
        for (const i of fc.die) { const t = G.tiles[i]; A.badge(t.x + 22, t.y - 26, '−1', '#fff', P.dim, 11.5); } }
    }
    if (pl && aim === 'ab') {
      for (const t of G.tiles) if (t.vir > 0) { A.softHex(t.x, t.y, 35); c.strokeStyle = `rgba(226,160,44,${.6 + .3 * Math.sin(T * 5)})`; c.lineWidth = 2.6; c.stroke(); }
      if (hov >= 0 && AW.abCount(G, hov)) { for (const j of AW.areaOf(G, hov)) { const t = G.tiles[j]; A.softHex(t.x, t.y, 37); c.fillStyle = 'rgba(226,160,44,.22)'; c.fill(); c.strokeStyle = '#8a5a12'; c.lineWidth = 3; c.stroke(); } A.badge(G.tiles[hov].x, G.tiles[hov].y - 30, tx('中和 ×', 'Neutralize ×') + AW.abCount(G, hov), '#fff', '#8a5a12', 12.5); }
    } else if (pl && aim === 'ctl') {
      for (const t of G.tiles) if (t.st === 1) { const hot = t.i === hov; A.softHex(t.x, t.y, 38); c.strokeStyle = hot ? P.hema : `rgba(111,79,163,${.55 + .3 * Math.sin(T * 5)})`; c.lineWidth = hot ? 4 : 2.6; c.setLineDash(hot ? [] : [7, 5]); c.stroke(); c.setLineDash([]); if (hot) A.badge(t.x, t.y - 30, tx('清除', 'Clear'), '#fff', P.hema, 12.5); }
    } else if (pl && sel && G.ap > 0) {
      const eat = sel.kind === 'mac' ? AW.eatTargets(G, sel) : [], ag = sel.kind === 'dc' ? AW.agTargets(G, sel) : [];
      for (const [j] of AW.moveTargets(G, sel)) { if (eat.includes(j) || ag.includes(j)) continue; const t = G.tiles[j]; A.softHex(t.x, t.y, 33); c.strokeStyle = `rgba(31,157,143,${.55 + .25 * Math.sin(T * 4)})`; c.lineWidth = 2.6; c.setLineDash([7, 6]); c.stroke(); c.setLineDash([]); }
      for (const i of eat) { const t = G.tiles[i], n = AW.eatCount(G, sel, i); A.softHex(t.x, t.y, 35); c.strokeStyle = P.teal; c.lineWidth = 3.4; c.stroke(); A.badge(t.x, t.y + 30, tx('吞', 'Eat') + (n > 1 ? ' ×' + n : ''), '#fff', P.teal, 12.5); }
      for (const i of ag) { if (i === sel.tile) continue; const t = G.tiles[i]; A.softHex(t.x, t.y, 35); c.strokeStyle = '#b77a12'; c.lineWidth = 3.4; c.stroke(); A.badge(t.x, t.y + 30, tx('取樣', 'Sample'), '#fff', '#b77a12', 12.5); }
    }
  };
  M.drawUnit = function (G, u, T) {
    const c = B.ctxOf(), sel = G.sel === u.id, s = 1 - u.born * .35;
    if (sel) { c.strokeStyle = P.teal; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -T * 20; c.beginPath(); c.arc(u.x, u.y, 34, 0, 6.283); c.stroke(); c.setLineDash([]); }
    if (u.kind === 'dc') { A.dc(u.x, u.y, s, { ph: u.ph, mood: '' }); if (G.phase !== 'over') A.badge(u.x, u.y - 36, tx('偵察兵', 'Scout'), P.ink, '#fff', 11); return; }
    const fl = u.stomach >= G.cfg.CAP;
    A.mac(u.x, u.y, s, { ph: u.ph, seed: u.id, stomach: u.stomach, food: 'vir', gulp: u.gulp, full: fl, mood: u.gulp > 0 ? 'eat' : fl ? 'sleep' : undefined });
    if (G.phase !== 'over') A.badge(u.x, u.y - 36, (fl ? tx('飽 ', 'Full ') : '') + u.stomach + '/' + G.cfg.CAP, fl ? '#fff' : P.ink, fl ? P.flame : '#fff', 11.5);
  };

  /* ---------------- 結算 ---------------- */
  const rec = G => ({ turn: G.turn, hp: Math.round(AW.health(G) * 100), delay: G.delay || 0, secs: G.ln ? +G.ln.secs.toFixed(1) : null, mem: !!G.mem, ag: G.ag, win: !!(G.result && G.result.win) });
  M.summary = function (G, st) {
    const r = G.result, hp = Math.round(AW.health(G) * 100), stars = hp >= 60 ? 3 : hp >= 35 ? 2 : 1, key = G.scn.key, h = IW.save.hist;
    let insight = !G.ag ? tx('這一局偵察兵沒有把情報送到淋巴結，後援始終沒有啟動。巨噬細胞只能吞細胞外的病毒，碰不到躲在細胞裡的。', 'The scout never delivered intel to the lymph node this time, so backup never started. Macrophages can only engulf viruses outside cells; they cannot reach the ones hiding inside.')
      : tx(`第 ${G.ag} 回合取得情報。淋巴結花了 <b>${G.ln.secs.toFixed(1)} 秒</b>找到吻合的 T 細胞，後援 <b>${G.delay} 回合後</b>抵達。`, `Intel collected on turn ${G.ag}. The lymph node took <b>${G.ln.secs.toFixed(1)} s</b> to find the matching T cell, and backup arrived <b>${G.delay} turn${G.delay > 1 ? 's' : ''} later</b>.`)
      + (G.mem ? tx('這次有記憶細胞，所以幾乎不用找。', ' With memory cells present, there was hardly any searching to do.') : tx('第一次遇到這種病毒，要從一大群 T 細胞裡把認得它的那一個找出來，所以慢。', ' On a first encounter the one T cell that recognizes the virus has to be found among many, which is why it is slow.'));
    let extra = '';
    if (r.win && key === 'first') extra = `<p class="note">${tx('記憶冊新增：<b>病毒 甲</b>。一部分複製出來的 T、B 細胞留了下來，成為記憶細胞。下次它再來，淋巴結不必從頭找。', 'Added to your memory album: <b>Virus A</b>. Some of the copied T and B cells stayed behind as memory cells. Next time it comes, the lymph node will not have to search from scratch.')}</p>`;
    if (key !== 'first') {
      const rows = [['first', tx('第 2 章：第一次遇到 甲', 'Ch. 2: first time, Virus A')], ['again', tx('甲 再來（有記憶）', 'Virus A again (memory)')], ['variant', h.variant && h.variant.vax ? tx('乙（已接種疫苗）', 'Virus B (vaccinated)') : tx('乙（沒有接種）', 'Virus B (not vaccinated)')]].filter(x => h[x[0]]);
      if (rows.length > 1) extra = `<table><tr><th>${tx('你的紀錄', 'Your record')}</th><th>${tx('找到 T 細胞', 'Time to match')}</th><th>${tx('後援', 'Backup')}</th><th>${tx('組織健康', 'Tissue')}</th></tr>${rows.map(([k, n]) => { const x = h[k]; return `<tr><td>${n}</td><td>${x.secs === null ? '—' : x.secs + tx(' 秒', ' s')}</td><td>${x.delay ? x.delay + tx(' 回合', x.delay > 1 ? ' turns' : ' turn') : '—'}</td><td>${x.win ? x.hp + '%' : tx('失守', 'lost')}</td></tr>`; }).join('')}</table>
        <p class="note">${tx('這是你自己打出來的數字，不是預設的結果。差別不全來自免疫記憶：戰場不同、你也更熟練了。', 'These are your own numbers, not preset results. Not all of the difference comes from immune memory: the battlefields differ, and you have had more practice.')}</p>`;
      if (r.win && key === 'variant') extra += `<p class="note">${h.variant && h.variant.vax ? tx('疫苗讓身體在前線沒有損失的時候，先把「找出認得它的細胞」這件事做完。', 'A vaccine lets the body finish finding the cells that recognize a virus in advance, while nothing at the front is being lost.') : tx('你沒有接種就打贏了。可以回到選擇點，改成先接種，比較看看差多少。', 'You won without the vaccine. You can go back to the choice and vaccinate first to see how much it changes.')}</p>`;
    }
    return { stars, hp, kicker: r.win ? tx(`${VN(G.scn.virus)}｜第 ${G.turn} 回合清除`, `${VN(G.scn.virus)} | cleared on turn ${G.turn}`) : tx('防線失守', 'The defense has fallen'),
      title: r.win ? tx('病毒清除', 'Virus cleared') : r.why === 'tissue' ? tx('組織損傷過重', 'Too much tissue damage') : tx('感染仍未清除', 'Infection still not cleared'),
      stats: [[hp + '%', tx('組織健康', 'Tissue health')], [G.infTotal, tx('累計感染細胞', 'Cells infected')], [G.eaten, tx('巨噬細胞吞噬', 'Engulfed')], [G.neut, tx('抗體中和', 'Neutralized')], [G.deadCtl, tx('T 細胞清除', 'Cleared by T cells')]],
      insight, extra, series: [{ key: 'inf', name: tx('受感染細胞', 'Infected cells'), color: P.sickEdge }, { key: 'vir', name: tx('細胞外病毒', 'Free virus'), color: P.vir }],
      marks: { antigen: [tx('情報', 'Intel'), '#b77a12'], tcell: ['T', P.hema], ab: [tx('抗體', 'Ab'), '#8a5a12'] } };
  };
  M.rules = function (G) {
    const c = G.cfg, rows = [
      [tx('病毒', 'Virus'), tx(`細胞外的病毒，回合結束會鑽進所在的細胞，把它變成工廠。工廠每回合往箭頭方向釋放 ${c.REL_N} 個，共 ${c.REL_TURNS} 回合，然後死亡。`, `A free virus enters the cell it sits on at end of turn, turning it into a factory. A factory releases ${c.REL_N} per turn along its arrows for ${c.REL_TURNS} turns, then dies.`)],
      [tx('巨噬細胞', 'Macrophage'), tx(`吞掉身邊細胞外的病毒（1 點吞到容量上限 ${c.CAP}，回合結束消化 ${c.DIGEST} 個）。站在箭頭落點可以攔截。碰不到細胞裡的病毒。`, `Engulfs adjacent free viruses (1 AP fills it up to ${c.CAP}; digests ${c.DIGEST} at end of turn). Standing where an arrow lands intercepts. Cannot reach viruses inside cells.`)],
      [tx('偵察兵', 'Scout'), tx('樹突細胞走到病毒或受感染細胞旁邊取樣（1 點），然後離開戰場，把情報送到淋巴結。', 'The dendritic cell samples next to a virus or infected cell (1 AP), then leaves to deliver the intel to the lymph node.')],
      [tx('淋巴結', 'Lymph node'), tx('找出受體和情報卡吻合的 T 細胞。找得越快，後援越早到（第一次 2～4 回合；有記憶細胞 1～2 回合）。', 'Find the T cell whose receptor matches the intel card. The faster you find it, the sooner backup arrives (2–4 turns on a first encounter; 1–2 with memory cells).')],
      [tx('毒殺 T 細胞', 'Cytotoxic T'), tx(`抵達後每回合 ${c.CTL_N} 次：清除一個受感染的細胞（組織 −1）。`, `Once here, ${c.CTL_N} uses per turn: clear one infected cell (tissue −1).`)],
      [tx('抗體', 'Antibodies'), tx(`就緒後每回合次數逐步增加（最多 ${c.AB_MAX}）：中和一格與相鄰格的細胞外病毒。`, `Once ready, uses per turn build up (max ${c.AB_MAX}): neutralize free viruses on one tile and its neighbors.`)],
      [tx('勝敗', 'Win / lose'), tx(`清光受感染的細胞與病毒就贏。死亡的細胞達 ${c.BUDGET} 個，或 ${c.TURNS} 回合用完就輸。`, `Clear every infected cell and virus to win. Lose at ${c.BUDGET} dead cells or after ${c.TURNS} turns.`)]];
    return `<div class="rules">${rows.map(r => `<b>${r[0]}</b><span>${r[1]}</span>`).join('')}</div>`;
  };

  /* ---------------- 章節定義 ---------------- */
  const unlock = () => Object.assign(IW.save.codex, { virus: 1, infected: 1, dc: 1, tcell: 1, ab: 1, lymph: 1, memory: 1, mac: 1 });
  const menuBtn = () => ({ label: tx('主選單', 'Menu'), sm: 1, fn: () => { location.hash = '#menu'; } });
  IW.chapters = IW.chapters || {};
  IW.chapters.airway = {
    id: 'airway', mode: M, title: ['第 2 章｜呼吸道：病毒來了', 'Chapter 2 | The Airway: A Virus Arrives'], short: ['2｜病毒來了', '2 | A Virus Arrives'],
    stages: [
      { kind: 'practice', seed: 3, cfg: { TURNS: 6, BUDGET: 6 }, hide: { ab: 1, ctl: 1 }, preset: { units: [['mac', 19], ['mac', 21]], inf: { 8: 2 }, vir: { 9: 1, 14: 1 } },
        goal: ['練習 1：別讓新的細胞被感染', 'Practice 1: keep new cells from being infected'], won: ['病毒要進細胞才能複製', 'A virus must get inside a cell to copy itself'],
        say: ['病毒不像細菌，自己不會分裂。它鑽進細胞，借用細胞的設備製造新病毒，再放出去感染鄰居。巨噬細胞能吞掉細胞外的病毒，但碰不到已經躲進細胞裡的。', 'Unlike bacteria, a virus cannot divide on its own. It gets into a cell, borrows the cell’s machinery to make new viruses, and releases them to infect the neighbors. Macrophages can engulf viruses outside cells, but cannot reach the ones already inside.'],
        next: ['那細胞裡的怎麼辦？ ▸', 'So what about the ones inside? ▸'], lost: ['紅色虛線框是回合結束會被感染的細胞。吞掉上面的病毒，或讓巨噬細胞站到箭頭的落點攔截。', 'Red dashed outlines mark cells that will be infected at end of turn. Engulf the viruses on them, or stand a macrophage where an arrow lands to intercept.'],
        guide: G => { if (G.ap === 0 || acts) return ''; return tx('灰紫色的是被感染的細胞，箭頭是它接下來釋放病毒的落點。先點一個巨噬細胞，吞掉細胞外的病毒。', 'The grey-violet cell is infected; arrows show where it will release viruses next. Select a macrophage and engulf the viruses outside cells.'); } },
      { kind: 'practice', seed: 5, cfg: { TURNS: 10, BUDGET: 14 }, preset: { units: [['mac', 20], ['dc', 22]], inf: { 8: 1, 10: 1 }, vir: { 9: 1, 14: 1 } },
        goal: ['練習 2：讓偵察兵把情報送到淋巴結', 'Practice 2: get the scout’s intel to the lymph node'], won: ['專門對付它的後援', 'Backup made for this one virus'],
        say: ['偵察兵（樹突細胞）帶著病毒的特徵到淋巴結，從一大群 T 細胞裡找出認得它的那一個。被選中的細胞大量複製，成為「毒殺 T 細胞」，回到戰場讓受感染的細胞自我了斷。這一套叫適應性免疫：慢，但是專一。', 'The scout (a dendritic cell) carries the virus’s features to the lymph node, where the one T cell that recognizes them is found among many. That cell multiplies into cytotoxic T cells, which return to the field and make infected cells self-destruct. This is adaptive immunity: slow, but specific.'],
        next: ['還有一種工具 ▸', 'There is one more tool ▸'], lost: ['先點偵察兵（琥珀色、有突起的細胞），讓它走到受感染的細胞旁邊，點標著「取樣」的格子。越早越好。', 'Select the scout (the amber cell with arms), move it next to an infected cell, and tap a tile marked “Sample”. The sooner the better.'],
        guide: G => { const u = selU(G); if (G.ap === 0) return ''; if (!G.ag && !(u && u.kind === 'dc')) return tx('巨噬細胞碰不到細胞裡的病毒。點選偵察兵（琥珀色、有突起的細胞）。', 'Macrophages cannot reach viruses inside cells. Select the scout (the amber cell with arms).'); if (G.ag && G.turn < G.tAt && !acts) return tx('後援在路上。先用巨噬細胞吞掉細胞外的病毒，撐到 T 細胞抵達。', 'Backup is on the way. Use the macrophage to engulf free viruses and hold on until the T cells arrive.'); return ''; } },
      { kind: 'practice', seed: 7, cfg: { TURNS: 5, BUDGET: 10 }, preset: { units: [['mac', 26]], inf: { 8: 2, 10: 3 }, vir: { 13: 2, 14: 1, 19: 2, 16: 1, 17: 2, 22: 1 }, ready: { t: 1, ab: -1 } },
        goal: ['練習 3：後援都到了。抗體對付細胞外的，T 細胞對付細胞裡的', 'Practice 3: backup is here. Antibodies for viruses outside cells, T cells for the ones inside'], won: ['兩種工具，兩種任務', 'Two tools, two jobs'],
        say: ['B 細胞被選出來之後變成「漿細胞」，分泌大量「抗體」。抗體是蛋白質，不是細胞：它黏住細胞外的病毒，讓病毒進不了細胞，但它自己也進不了細胞。細胞裡的病毒工廠，仍然要靠毒殺 T 細胞。', 'Once selected, B cells become plasma cells and secrete large amounts of antibodies. Antibodies are proteins, not cells: they stick to viruses outside cells so the viruses cannot get in, but they cannot get inside cells either. Virus factories inside cells still need cytotoxic T cells.'],
        next: ['開始正式戰鬥 ▸', 'Start the real battle ▸'], lost: ['按「抗體」再點病毒聚集的地方；按「毒殺 T 細胞」再點灰紫色的細胞。', 'Press “Antibodies” and tap where viruses cluster; press “Cytotoxic T” and tap a grey-violet cell.'],
        guide: G => { if (G.ap === 0 || aim) return ''; return AW.nVir(G) && G.ab ? tx('按下方的「抗體」，再點病毒最密的地方：一次中和一整片。', 'Press “Antibodies” below, then tap where the viruses are densest: one use clears a whole area.') : AW.nInf(G) && G.ctl ? tx('按「毒殺 T 細胞」，再點受感染的細胞。', 'Press “Cytotoxic T”, then tap an infected cell.') : ''; } },
      { kind: 'battle', cfg: {}, scn: { virus: 'A', key: 'first' } }],
    onBattleEnd(G, s) { const c = IW.save.ch.airway = IW.save.ch.airway || {}; c.plays = (c.plays || 0) + 1; unlock(); if (G.result.win) { c.done = true; c.stars = Math.max(c.stars || 0, s.stars); if (!IW.save.mem.A || IW.save.mem.A.from === 'borrowed') IW.save.mem.A = { from: 'infection' }; if (!IW.save.hist.first || !IW.save.hist.first.win) IW.save.hist.first = rec(G); IW.sfx('card'); } IW.store(); },
    endButtons(G) {
      return G.result.win ? [{ label: tx('第 3 章：它又來了 ▸', 'Chapter 3: It comes back ▸'), pri: 1, fn: () => { location.hash = '#return'; } }, { label: tx('再玩一局', 'New battle'), sm: 1, fn: () => B.go(B.stage) }, menuBtn()]
        : [{ label: tx('再試一次（同一戰場）', 'Try again (same battle)'), pri: 1, fn: () => B.go(B.stage, G.seed) }, { label: tx('換一個戰場', 'New battle'), sm: 1, fn: () => B.go(B.stage) }, { label: tx('重玩練習', 'Replay practice'), sm: 1, fn: () => B.go(0) }, menuBtn()];
    }
  };
  // 第 3 章沒有練習：兩場戰鬥之間是一個真正的選擇
  IW.chapters.return = {
    id: 'return', mode: M, title: ['第 3 章｜捲土重來：記憶與疫苗', 'Chapter 3 | The Comeback: Memory and Vaccines'], short: ['3｜捲土重來', '3 | The Comeback'],
    resume: () => (IW.save.ch.return || {}).again ? 1 : 0,
    stages: [
      { kind: 'battle', cfg: {}, scn: { virus: 'A', key: 'again' },
        pre: B => { const borrowed = !IW.save.mem.A; if (borrowed) { IW.save.mem.A = { from: 'borrowed' }; IW.store(); }
          return B.ask(() => ({ html: `<h2>${tx('幾個月後', 'Months later')}</h2><h1>${tx('同一種病毒又來了', 'The same virus is back')}</h1>
            <p>${IW.save.mem.A.from === 'borrowed' ? tx('你還沒打過第 2 章，所以這裡先假設這個身體以前得過「病毒 甲」，淋巴結裡留有記憶細胞。之後回去打第 2 章，可以親自比較第一次有多辛苦。', 'You have not played Chapter 2 yet, so let us assume this body has had Virus A before and still keeps memory cells in the lymph node. Play Chapter 2 later to feel how hard the first time is.') : tx('上次打贏「病毒 甲」之後，一部分 T 細胞和 B 細胞留了下來，成為記憶細胞。戰場的規則和上次完全一樣，不同的只有你的身體。', 'After you beat Virus A, some T and B cells stayed behind as memory cells. The rules of the battle are exactly the same as last time. The only thing that changed is your body.')}</p>
            <div class="btns"><button class="pill pri" id="go">${tx('開始 ▸', 'Begin ▸')}</button></div>`, on: { go: () => 1 } })); } },
      { kind: 'battle', cfg: {}, scn: { virus: 'B', key: 'variant' },
        pre: async (B, G) => {
          if (IW.save.mem.B) { const keep = await B.ask(() => ({ html: `<h2>${tx('病毒 乙', 'Virus B')}</h2><h1>${tx('你的身體已經記得它', 'Your body already remembers it')}</h1><p>${tx('記憶冊裡已經有「病毒 乙」。要沿用這份記憶，還是回到還沒遇過它的時候重新選擇？', 'Virus B is already in your memory album. Keep that memory, or go back to before you met it and choose again?')}</p>
            <div class="btns"><button class="pill pri" id="re">${tx('回到選擇點', 'Go back to the choice')}</button><button class="pill" id="keep">${tx('沿用記憶', 'Keep the memory')}</button></div>`, on: { re: () => 0, keep: () => 1 } })); if (keep) { G.scn = { virus: 'B', key: 'variant', vax: IW.save.mem.B.from === 'vaccine' }; return; } delete IW.save.mem.B; IW.store(); }
          const vax = await B.ask(() => ({ html: `<h2>${tx('新的消息', 'News')}</h2><h1>${tx('另一種病毒正在流行', 'A different virus is going around')}</h1>
            <p>${tx('「病毒 乙」的情報卡形狀不一樣。你為「甲」留下的記憶細胞認不得它：記憶只對同一種形狀有效。', 'Virus B has a different intel card. The memory cells you kept for Virus A do not recognize it: memory only fits the same shape.')}</p>
            <p>${tx('在它來之前，你可以先接種疫苗。疫苗只送情報卡進來，沒有會複製的病毒。', 'Before it arrives, you can get vaccinated. A vaccine delivers only the intel card, with no virus that can multiply.')}</p>
            <div class="btns"><button class="pill pri" id="vax">${tx('先接種疫苗', 'Get vaccinated first')}</button><button class="pill" id="no">${tx('不接種，直接面對', 'Skip it and face the virus')}</button></div>`, on: { vax: () => 1, no: () => 0 } }));
          G.scn = { virus: 'B', key: 'variant', vax: !!vax };
          if (vax) { await IW.lymph.run($('ln'), { virus: 'B', pressure: false, vaccine: true }); IW.save.mem.B = { from: 'vaccine' }; IW.save.codex.vaccine = 1; IW.store(); IW.sfx('card');
            await B.ask(() => ({ html: `<h2>${tx('幾週後', 'Weeks later')}</h2><h1>${tx('真的病毒來了', 'The real virus arrives')}</h1><p>${tx('接種時留下的記憶細胞已經在淋巴結裡等著。', 'The memory cells left by the vaccine are already waiting in the lymph node.')}</p><div class="btns"><button class="pill pri" id="go">${tx('開始 ▸', 'Begin ▸')}</button></div>`, on: { go: () => 1 } })); }
        } }],
    onBattleEnd(G, s, st) {
      const c = IW.save.ch.return = IW.save.ch.return || {}, k = G.scn.key; unlock(); IW.save.codex.vaccine = 1;
      IW.save.hist[k] = Object.assign(rec(G), { vax: !!G.scn.vax });
      if (G.result.win) { if (k === 'again') c.again = true; else { c.done = true; c.stars = Math.max(c.stars || 0, s.stars); if (!IW.save.mem.B) IW.save.mem.B = { from: 'infection' }; } }
      IW.store();
    },
    endButtons(G) {
      const k = G.scn.key;
      if (!G.result.win) return [{ label: tx('再試一次（同一戰場）', 'Try again (same battle)'), pri: 1, fn: () => { if (k === 'variant' && !G.scn.vax) { /* 沒接種：保持沒有記憶 */ } B.go(B.stage, G.seed); } }, { label: tx('換一個戰場', 'New battle'), sm: 1, fn: () => B.go(B.stage) }, menuBtn()];
      if (k === 'again') return [{ label: tx('繼續：新的消息 ▸', 'Continue: news ▸'), pri: 1, fn: () => B.go(1) }, menuBtn()];
      return [{ label: tx('回主選單看記憶冊', 'Back to the menu and your album'), pri: 1, fn: () => { location.hash = '#menu'; } }, { label: tx('回到選擇點再打一次', 'Go back to the choice and replay'), sm: 1, fn: () => { delete IW.save.mem.B; IW.store(); B.go(1); } }];
    }
  };
})(window.IW);
