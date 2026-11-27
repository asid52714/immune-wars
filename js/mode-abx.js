'use strict';
/* =====================================================================
   第 4 章｜漏網之魚：抗生素與抗藥性
   第 2 章的淋巴結是「把認得病毒的 T 細胞挑出來複製」。這一章是同一個原理反過來：
   抗生素把怕它的細菌殺掉，剩下不怕它的繼續分裂——藥沒有改變細菌，只決定了誰留下來。
   皮膚上的那一排菌群（第 1 章畫在皮膚外面的細菌）在這裡變成這個身體的一部分，會存進存檔。

   刻意的設計：這一章沒有「抗生素」按鈕。藥是醫師開的，固定在第 DRUG_AT 回合送到、療程長度固定。
   玩家在戰場上能做的是帶巨噬細胞處理漏網的細菌；整章唯一的用藥決定，是感冒那天要不要吃別人給的抗生素。
   這樣「什麼時候用、用多久」就不會變成可以最佳化的操作，也不會被對應成真實世界的用藥決定。
   三個練習（抗生素 → 漏網之魚 → 皮膚上的住戶），兩場戰鬥之間是一個選擇。
   ===================================================================== */
(function (IW) {
  const { tx, art: A, battle: B, abx: AX } = IW, P = A.P, W = B.W, H = B.H, R = B.R, DRUG = '#2f7fc1', DRUGC = '47,127,193';
  const M = IW.modeAbx = { banner: ['細菌行動中', 'Bacteria are acting'] };
  const selU = G => G.units.find(u => u.id === G.sel);
  const save = () => (IW.save.ch.abx = IW.save.ch.abx || {});
  const FX = i => 31.5 + i * 37, FY = 21;
  let acts = 0, FS = [], skipPre = false;
  M.base = () => AX.flora0(IW.save.bodySeed);                 // 這個身體原本的皮膚菌群
  M.flora = () => IW.save.flora ? IW.save.flora.slice() : M.base();
  const cen = f => AX.census(f), pct = f => Math.round(AX.share(f) * 100);

  M.setup = function (seed, st) {
    const c = IW.save.ch.abx || {}, f = st.flora ? st.flora.split('') : st.key === 'b2' ? (c.f2 || c.f1 || M.base()) : M.base();
    const G = AX.setup(seed, st.cfg, st.preset, f); G.key = st.key || 'p'; G.load0 = AX.load(G); G.nR0 = AX.nR(G); return G;
  };
  M.enter = function (G) { acts = 0; FS = G.flora.map((k, i) => ({ k, x: FX(i), s: 1, ph: i * 1.7 })); for (const t of G.tiles) sync(t, { x: t.x, y: t.y }); };
  M.forecast = AX.forecast;
  M.check = AX.verdict;
  M.beat = G => IW.clamp(Math.max(AX.load(G) / G.cfg.LOAD_MAX, 1 - AX.health(G)) * 1.25 - .15, 0, 1);
  M.sample = G => ({ turn: G.turn, load: AX.load(G), r: AX.nR(G), bad: AX.onCourse(G) });
  M.cancel = () => { };

  /* ---------------- 操作 ---------------- */
  function sync(t, from) {                                     // 格子上的細菌圖：數量與條紋跟著規則層的 t.b 走
    for (const r of [0, 1]) {
      const want = t.b.filter(x => !!x === !!r).length; let have = t.sp.filter(s => s.r === r).length;
      while (have > want) { t.sp.splice(t.sp.findIndex(s => s.r === r), 1); have--; }
      while (have < want) { const s = from || t.sp[t.sp.length - 1] || t; t.sp.push({ x: s.x, y: s.y, rot: Math.random() * 6.28, ph: Math.random() * 10, s: from ? 1 : .4, r }); have++; }
    }
  }
  function take(t, n, r) {                                     // 從畫面上拿走 n 隻（其中 r 隻條紋），交給吞噬動畫
    const out = []; for (let k = 0; k < n; k++) { const want = k < r ? 1 : 0, j = t.sp.findIndex(s => s.r === want), s = t.sp.splice(j >= 0 ? j : 0, 1)[0]; if (s) out.push({ x: s.x, y: s.y, draw: (x, y, q) => A.rod(x, y, s.rot, q, 'worry', s.ph, 1, s.r) }); }
    return out;
  }
  async function doEat(G, u, i) {
    const t = G.tiles[i], e = AX.actEat(G, u, i); B.gulp(u, take(t, e.n, e.r), tx('吞噬 ×', 'Engulfed ×') + e.n); acts++;
    if (e.r) B.hint('eatR', ['巨噬細胞不管藥對細菌有沒有效，照吞。抗藥性是「這種藥對它沒用」，不是「什麼都對它沒用」。', 'Macrophages engulf bacteria whether or not a drug works on them. Resistance means this drug fails, not that everything does.']);
    else B.hint('eat1', [`巨噬細胞一口吞 ${G.cfg.BITE} 隻，體內最多 ${G.cfg.CAP} 隻。同一格先吞有條紋的（遊戲設定）。`, `A macrophage engulfs ${G.cfg.BITE} per bite and holds ${G.cfg.CAP}. On a tile it takes a striped one first (a game rule).`]);
    if (AX.verdict(G) && AX.onCourse(G)) { B.busy = true; B.hud(); await IW.wait(500); if (B.G !== G) return; await settleFx(G); if (B.G !== G) return; B.busy = false; }
    B.afterAction();
  }
  function doMove(G, u, i, prev) {
    const path = []; for (let j = i; j !== u.tile; j = prev.get(j)) path.unshift({ x: G.tiles[j].x, y: G.tiles[j].y });
    u.path.push(...path); AX.actMove(G, u, i); IW.sfx('move'); acts++; B.afterAction();
  }
  function floraFx(G, e) {                                     // 皮膚上：一個怕藥的死掉，旁邊的條紋菌分裂補位
    if (!e) return; const s = FS[e.i], from = FS[e.i - 1] && FS[e.i - 1].k === 'R' ? FS[e.i - 1] : FS[e.i + 1];
    B.burst(s.x, FY, 7, e.was === 'C' ? '143,193,234' : '63,167,124', 55, 2.2); B.ring(s.x, FY, DRUGC, 20, .5); IW.sfx('pop');
    s.k = 'R'; s.s = .35; if (from) s.x = FX(FS.indexOf(from));
  }
  // 感染已經清乾淨，但療程還沒吃完：剩下的照樣吃完，皮膚上的代價不會因為打得快而變少
  async function settleFx(G) {
    while (AX.onCourse(G)) {
      const e = AX.dose(G); floraFx(G, e); B.hud();
      if (e) B.hint('settle', ['戰場上看得到細菌清光了，真實世界裡看不到，所以療程多長由開藥的人決定。這裡照樣吃完。', 'Here you can see the bacteria are gone. In real life you cannot, so the prescriber sets the length. The course is finished as prescribed.']);
      await IW.wait(750); if (B.G !== G) return;
    }
  }
  // 醫師開的抗生素：不是玩家的按鈕。第一劑殺一半、讓怕藥的細菌停止分裂；下一回合第二劑清完
  async function drugFx(G) {
    const ev = G.drugEv, nS = ev.kill.reduce((n, e) => n + e.n, 0), nR = AX.nR(G), left = AX.load(G) - nR; G.drugEv = null; IW.sfx('calm');
    if (!ev.last) { B.mark('drug'); G.rAtDrug = nR; } else G.dose2 = 1;
    B.ftext(W / 2, H - 70, ev.last ? tx('第二劑', 'Second dose') : tx('抗生素送到', 'The antibiotic arrives'), DRUG);
    for (let k = 0; k < 18; k++) { const x = 16 + Math.random() * (W - 32), r0 = Math.random() * 6; B.fly({ x0: x, y0: H - 26, x1: x + (Math.random() - .5) * 50, y1: 76 + Math.random() * 90, dur: .5 + Math.random() * .4, draw: (px, py, q) => A.pill(px, py, r0 + q * 4, .95, 1 - q * .55) }); }
    await IW.wait(560); if (B.G !== G) return;
    ev.kill.forEach((e, k) => { const t = G.tiles[e.i], dead = t.sp.filter(s => !s.r).slice(0, e.n); for (const s of dead) B.burst(s.x, s.y, 6, DRUGC, 65, 2.2); sync(t); B.ftext(t.x, t.y - 22, '−' + e.n, DRUG); if (k < 4) IW.sfx('pop'); });
    if (!ev.last) {
      B.hint('drug1', ['抗生素隨血液送到全身，攻擊細菌才有的構造（例如細胞壁）。你的細胞沒有細胞壁，受到的影響小得多。', 'Carried by the blood, the antibiotic attacks things only bacteria have, like a cell wall. Your cells have none.'], true);
      if (left) B.hint('half', [`藥需要時間：第一劑殺掉 ${nS} 隻，剩下 ${left} 隻怕藥的不再分裂，下一回合的第二劑會清完。`, `The drug takes time: the first dose killed ${nS}; the ${left} sensitive left have stopped dividing, and the next dose finishes them.`], true);
      if (nR > nS + left) B.hint('weak', ['這次闖進來的細菌，多數是這種藥對付不了的那一型。', 'Most of the bacteria that got in this time are the kind this drug does not work on.'], true);
    } else if (nR) B.hint('surv', [`藥殺得死的都死了，有條紋的 ${nR} 隻還在。不是藥把它們變成這樣，它們本來就不一樣。交給巨噬細胞。`, nR > 1 ? `Everything the drug can kill is dead; ${nR} striped ones remain. The drug did not make them so; they already were. Over to the macrophages.` : 'Everything the drug can kill is dead; the striped one remains. The drug did not make it so; it already was. Over to the macrophages.'], true);
    B.hud(); await IW.wait(650); if (B.G !== G) return;
    if (G.result && G.result.win) await settleFx(G);
  }
  M.tap = function (G, i) {
    if (i < 0) { G.sel = -1; return B.hud(); }
    const sel = selU(G), u = AX.unitAt(G, i), t = G.tiles[i];
    if (u && u !== sel) { G.sel = u.id; IW.sfx('select'); return B.hud(); }
    if (!sel) { if (t.b.length) B.hint('needsel', ['先點選一個巨噬細胞，再下達指令。', 'Select a macrophage first, then give the order.'], true); return; }
    if (AX.eatTargets(G, sel).includes(i)) return doEat(G, sel, i);
    if (t.b.length && sel.stomach >= G.cfg.CAP && AX.areaOf(G, sel.tile).includes(i)) return full();
    if (u === sel) return;
    const prev = AX.moveTargets(G, sel); if (prev.has(i)) return doMove(G, sel, i, prev);
    IW.sfx('deny');
    if (G.ap < 1) B.hint('ap0', ['行動點數用完了。按「結束回合」，換細菌行動。', 'Out of action points. Press “End turn” to let the bacteria act.'], true);
  };
  function full() { IW.sfx('deny'); B.hint('full', ['這個巨噬細胞吃飽了，要等回合結束消化後才能再吞。', 'This macrophage is full; it must digest at the end of the turn before engulfing again.'], true); }
  M.act = () => { };
  M.info = function (G, i) {
    const t = G.tiles[i], u = AX.unitAt(G, i), sel = selU(G), L = [], nr = t.b.filter(x => x).length;
    if (sel && G.phase === 'player' && !(u && u !== sel)) {
      if (AX.eatTargets(G, sel).includes(i)) L.push(tx(`<b>點一下：吞噬 1 隻</b>（1 點）${nr ? '，先吞條紋的' : ''}`, `<b>Tap: engulf 1</b> (1 AP)${nr ? ', striped first' : ''}`));
      else if (AX.moveTargets(G, sel).has(i)) L.push(tx('<b>點一下：移動到這裡</b>（1 點）', '<b>Tap: move here</b> (1 AP)'));
    }
    if (u) L.push(tx(`<b>巨噬細胞</b>　體內 ${u.stomach}/${G.cfg.CAP}${u.stomach >= G.cfg.CAP ? '（飽了）' : ''}，回合結束消化 ${G.cfg.DIGEST} 隻。藥對細菌有沒有效，對它沒有差別。`, `<b>Macrophage</b>  holding ${u.stomach}/${G.cfg.CAP}${u.stomach >= G.cfg.CAP ? ' (full)' : ''}; digests ${G.cfg.DIGEST} at end of turn. Whether a drug works on a bacterium makes no difference to it.`));
    if (t.b.length) {
      const n = t.b.length, ns = n - nr, on = AX.drugOn(G), next = !G.drug && G.turn === G.cfg.DRUG_AT - 1;      /* on：這回合的細菌階段藥還在，怕藥的不分裂、不擴散 */
      let w = tx(`<b>細菌 ×${n}</b>${nr ? `（條紋 ${nr}：這種抗生素對它無效）` : ''}　`, `<b>Bacteria ×${n}</b>${nr ? ` (${nr} striped: this antibiotic does not work on them)` : ''}  `);
      if (on && !nr) w += tx('療程中：不再分裂、擴散。下一劑會把它清掉。', 'On the course: no dividing or spreading. The next dose clears it.');
      else if (n === 3) w += (on ? tx('回合結束會損傷這格組織，並有一隻條紋菌往箭頭擴散。', 'will damage this tile at end of turn, and one striped bacterium spreads along the arrow.') : tx('回合結束會擴散，並損傷這格組織。', 'will spread at end of turn and damage this tile.'));
      else if (on) w += tx(`回合結束條紋菌分裂，變成 ${n + 1} 隻；怕藥的不再分裂，下一劑清掉。`, `the striped divide to make ${n + 1} at end of turn; the sensitive do not divide and the next dose clears them.`);
      else w += tx('回合結束會分裂成 ' + (n + 1) + ' 隻。', `will grow to ${n + 1} at end of turn.`) + (nr && ns ? tx('新的一隻有沒有條紋，看是哪一隻分裂（隨機）。', ' Whether the new one is striped depends on which one divides (random).') : '');
      if (next && ns) w += tx(`下回合第一劑：這格怕藥的死掉一半（無條件進位）。`, ' Next turn’s first dose kills half the sensitive ones here (rounded up).');
      L.push(w);
    }
    if (t.hp < 3) L.push(tx(['組織已壞死', '組織嚴重受損', '組織受損'], ['Tissue dead', 'Tissue badly damaged', 'Tissue damaged'])[t.hp]);
    if (t.scab) L.push(tx('已經結痂的傷口：細菌是結痂之前闖進來的', 'A scabbed-over wound: the bacteria got in before it closed'));
    if (!L.length) L.push(tx('健康的組織細胞', 'Healthy tissue cell'));
    return L.join('<br>');
  };
  M.guide = function (G, st) {
    if (G.ap === 0) return tx('行動點數用完了：按「結束回合」，換細菌行動。', 'Out of action points: press “End turn” to let the bacteria act.');
    if (st.kind === 'practice') return '';
    const first = !(IW.save.ch.abx || {}).done;
    if (first && G.turn === 1 && !acts) return G.key === 'b1' ? tx('抗生素下一回合送到，但它對條紋菌沒用。先讓巨噬細胞靠近有條紋的。', 'The drug arrives next turn but does not work on striped ones. Move your macrophages toward them.')
      : tx(`這次闖進來 ${G.load0} 隻，其中 ${G.nR0} 隻有條紋。`, `${G.load0} got in this time, ${G.nR0} of them striped.`);
    if (first && G.drug && AX.nR(G) && !selU(G)) return tx('抗生素對條紋菌沒有用。點選巨噬細胞去吞它們。', 'The antibiotic does nothing to the striped ones. Select a macrophage and engulf them.');
    return '';
  };

  /* ---------------- 細菌回合 ---------------- */
  M.enemy = async function (G, api) {
    const dg = AX.phaseDigest(G); for (const e of dg) { const u = G.units.find(u => u.id === e.id); B.burst(u.x, u.y, 5, '120,190,140', 40, 1.8); }
    await api.wait(dg.length ? 320 : 60); if (!api.alive()) return;
    const g = AX.growList(G), fl = AX.fullList(G), sp = AX.phaseSpread(G); let any = false;
    for (const e of sp) {
      const s = G.tiles[e.from]; any = true;
      if (e.unit !== undefined) { const u = G.units.find(u => u.id === e.unit); B.gulp(u, [{ x: s.x, y: s.y, draw: (x, y, k) => A.rod(x, y, 0, k, 'worry', 0, 1, e.r) }], tx('攔截 ×1', 'Blocked ×1')); api.hint('sentinel', ['守在擴散路線上的巨噬細胞，會直接吞掉闖進來的細菌。', 'A macrophage standing in the path of the spread engulfs the bacteria that move in.']); }
      else if (!e.fail) { sync(G.tiles[e.to], { x: s.x, y: s.y }); B.ring(G.tiles[e.to].x, G.tiles[e.to].y, '63,167,124', R * .8, .6); }
    }
    if (any) { IW.sfx('spread'); api.hint('spread', ['滿 3 隻的菌落會向鄰近組織擴散，並損傷它所在的組織。', 'A colony of 3 spreads to nearby tissue and damages the tissue it sits on.']); }
    B.hud(); await api.wait(sp.length ? 540 : 50); if (!api.alive()) return;
    const gr = AX.phaseGrow(G, g), mu = gr.filter(e => e.mut);
    gr.forEach((e, k) => { sync(G.tiles[e.i]); if (k < 4) IW.sfx('pop'); });
    for (const e of mu) {
      const t = G.tiles[e.i]; B.mark('mut'); B.ring(t.x, t.y, '226,160,44', R * 1.2, .9); B.burst(t.x, t.y, 12, '226,160,44', 80, 2.4); B.ftext(t.x, t.y - 30, tx('複製出錯！', 'Copying error!'), '#8a5a12');
      IW.tone(880, 440, .18, 'triangle', .07); IW.tone(1320, 1760, .22, 'sine', .05, .16);
      api.hint('mut', [(G.drug ? '' : '<b>現在並沒有在用藥。</b>') + '細菌分裂時要抄一份 DNA，偶爾會抄錯，這叫<b>突變</b>。極少數抄錯，剛好讓某種藥對它失效。', (G.drug ? '' : '<b>No drug is in use right now.</b> ') + 'Copying its DNA, a bacterium sometimes slips: a <b>mutation</b>. Very rarely a slip makes a drug useless against it.'], true);
    }
    const nSens = AX.load(G) - AX.nR(G);
    if (G.drug && gr.some(e => e.r)) { if (!nSens) api.hint('release', ['怕藥的細菌都不在了，條紋菌有了空間與養分，繼續分裂。子代帶著和親代一樣的基因。', 'With the others gone, the striped ones have room and nutrients and keep dividing. Offspring carry the parent’s gene.']); else api.hint('release1', ['療程中，怕藥的細菌停止分裂，條紋菌照常分裂。子代帶著和親代一樣的基因。', 'During the course the sensitive bacteria stop dividing; the striped ones divide as usual. Offspring carry the parent’s gene.']); }
    else if (gr.length) api.hint('divide', ['細菌在條件合適的組織裡，一分為二不斷增殖。', 'Where conditions are right, bacteria keep multiplying by dividing in two.']);
    B.hud(); await api.wait(mu.length ? 900 : gr.length ? 480 : 50); if (!api.alive()) return;
    const dm = AX.phaseDamage(G, fl);
    for (const i of dm) { const t = G.tiles[i]; t.flash = 1; B.burst(t.x, t.y, 7, '192,48,79', 70, 2.6); B.ftext(t.x, t.y - 18, '−1', P.danger); }
    if (dm.length) { IW.sfx('hurt'); api.hint('toxin', ['組織受損：滿載的菌落正在損傷它所在的組織。', 'Tissue damage: a full colony is damaging the tissue it sits on.']); }
    for (const t of G.tiles) sync(t);
    B.hud(); await api.wait(dm.length ? 520 : 80); if (!api.alive()) return;
    if (AX.onCourse(G)) {
      const e = AX.dose(G);
      if (e) { floraFx(G, e); api.hint('dose', ['看最上面那一排：抗生素分不出誰是無害的住戶。療程的每一回合，緊鄰條紋菌的一個細菌死掉，由條紋菌補位。', 'Top row: the drug cannot tell residents apart. Each course turn, one next to a striped one dies and a striped one takes its place.']); B.hud(); await api.wait(560); if (!api.alive()) return; }
    }
    G.rMax = Math.max(G.rMax, AX.nR(G));
    AX.advance(G);
    if (G.drugEv) { B.hud(); await drugFx(G); }
  };

  /* ---------------- HUD ---------------- */
  M.hud = function (G, st) {
    const c = G.cfg, L = AX.load(G), nR = AX.nR(G), hp = AX.health(G), pl = G.phase === 'player', fc = pl ? G.fc : null, n = cen(G.flora), f = []; let bad = '';
    if (fc) {
      if (!G.drug && G.turn === c.DRUG_AT - 1) f.push(`<b>${st && st.kind === 'practice' ? tx('下回合藥送到。', 'The drug arrives next turn.') : tx(`下回合藥送到。它對條紋菌無效（到時約 ${fc.nR} 隻）。`, `Drug next turn. It will not work on the striped (about ${fc.nR} by then).`)}</b>`);
      else if (!G.drug && G.turn < c.DRUG_AT) f.push(tx(`藥第 ${c.DRUG_AT} 回合送到。`, `Drug arrives on turn ${c.DRUG_AT}.`));
      if (AX.onCourse(G) && AX.nextDose(G.flora).length) f.push(`<span class="w">${tx(`療程 ${G.doses + 1}／${c.COURSE}：皮膚上圈起來的位子，有一個會換成條紋菌。`, `Course ${G.doses + 1}/${c.COURSE}: one circled spot on the skin turns striped.`)}</span>`);
      if (fc.nDmg && !(st && st.kind === 'practice')) f.push(tx(`${fc.nDmg} 格組織會受損。`, `${fc.nDmg} tile${fc.nDmg > 1 ? 's' : ''} will be damaged.`));
      const r = fc.res; if (r && !r.win) bad = { tissue: tx('組織會損傷殆盡', 'the tissue will be destroyed'), overrun: tx('感染會失控', 'the infection will be out of control'), timeout: tx('這是最後一回合', 'this is the last turn') }[r.why];
      if (bad) f.unshift(`<span class="w">${tx('就這樣結束回合：', 'If you end the turn now: ')}${bad}。</span>`);
    }
    return {
      turn: tx(`回合 ${G.turn} / ${c.TURNS}`, `Turn ${G.turn} / ${c.TURNS}`),
      pips: Array.from({ length: c.TURNS }, (_, k) => { const t = k + 1; return { cls: t < G.turn ? 'done' : t === G.turn ? 'now' : '', m: t >= c.DRUG_AT && t < c.DRUG_AT + c.COURSE ? tx('藥', 'Rx') : '', title: t === c.DRUG_AT ? tx('抗生素在這一回合送到', 'The antibiotic arrives on this turn') : '' }; }),
      gauges: [
        { label: tx('組織健康', 'Tissue'), val: Math.round(hp * 100) + '%', frac: hp, color: P.teal, warn: hp < .35, title: tx('遊戲化的整體損傷預算，歸零即失敗。', 'A game-style damage budget; zero means defeat.') },
        { label: tx('細菌', 'Bacteria'), val: (fc && fc.load !== L ? `${L} <small>→ ${!G.drug && G.turn === c.DRUG_AT - 1 ? tx('約 ', '~') : ''}${fc.load}</small>` : L), frac: L / c.LOAD_MAX, next: fc ? fc.load / c.LOAD_MAX : undefined, color: P.bac, warn: (fc ? fc.load : L) >= c.LOAD_MAX * .75 },
        { label: tx('條紋菌', 'Striped'), val: `${nR} <small>${tx('皮膚', 'skin')} ${n.R}/${G.flora.length}</small>`, frac: nR / Math.max(1, L), color: P.gold, title: tx('這種抗生素對條紋菌無效。後面的數字是皮膚上的條紋菌：下一次闖進傷口的細菌從那裡來。', 'This antibiotic does not work on striped bacteria. The second number is the striped ones on the skin, where the next wound’s bacteria will come from.') }],
      goal: f.join(' '), acts: [], endDanger: !!bad
    };
  };

  /* ---------------- 畫面 ---------------- */
  M.drawBack = function (G, T) {
    const c = B.ctxOf();
    c.fillStyle = '#fdf3f1'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#f6efe7'; c.fillRect(0, 0, W, 34);                                       // 皮膚表面：住戶與伺機菌都住在這裡
    const gaps = G.tiles.filter(t => t.scab).map(t => [t.x - B.HW / 2 - 2, t.x + B.HW / 2 + 2]), inGap = x => gaps.some(g => x > g[0] && x < g[1]);
    for (let row = 0; row < 2; row++) for (let x = -24 + (row ? 21 : 0); x < W + 20; x += 42) {
      const cx = x + 20; if (inGap(cx)) continue; const edge = inGap(cx - 30) || inGap(cx + 30);
      c.fillStyle = edge ? '#d9a08c' : row ? P.skin : P.keratin; c.strokeStyle = P.skinDk; c.lineWidth = 1.2; c.beginPath(); c.roundRect(x, 30 + row * 14, 40, 12, 6); c.fill(); c.stroke();
    }
    for (const g of gaps) { c.fillStyle = '#9a5a44'; c.strokeStyle = '#5e3324'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(g[0] + 3, 28, g[1] - g[0] - 6, 30, 7); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(g[0] + 12, 36); c.lineTo(g[1] - 14, 50); c.moveTo(g[1] - 12, 36); c.lineTo(g[0] + 14, 50); c.stroke(); }
    const mark = G.phase === 'player' && (AX.onCourse(G) || (!G.drug && G.turn === G.cfg.DRUG_AT - 1)) ? AX.nextDose(G.flora) : [];
    FS.forEach((s, i) => {
      s.x += (FX(i) - s.x) * .12; s.s += (1 - s.s) * .1; const bob = Math.sin(T * 1.4 + s.ph) * 1.5;
      if (mark.includes(i)) { c.strokeStyle = `rgba(${DRUGC},${.6 + .35 * Math.sin(T * 5)})`; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.arc(s.x, FY, 15, 0, 6.283); c.stroke(); c.setLineDash([]); }
      if (s.k === 'C') A.coccus(s.x, FY + bob, .92 * s.s, T * 2 + s.ph); else A.rod(s.x, FY + bob, Math.sin(T * .7 + s.ph) * .25, .82 * s.s, 'calm', T * 5 + s.ph, 1, s.k === 'R');
    });
    c.font = A.font(10.5); c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = 'rgba(246,239,231,.9)'; c.strokeText(tx('皮膚上的細菌', 'Bacteria on the skin'), 5, 9); c.fillStyle = P.dim; c.fillText(tx('皮膚上的細菌', 'Bacteria on the skin'), 5, 9);
    IW.modeSkin.vessel(c, T, AX.onCourse(G) ? tx('抗生素隨血液送到全身', 'The antibiotic reaches the whole body through the blood') : tx('血管', 'Blood vessel'));
    if (AX.onCourse(G)) for (let k = 0; k < 9; k++) A.pill((k * 53 + 20 + Math.sin(T + k) * 14) % W, H - 50 - ((T * 34 + k * 67) % 470), T * .8 + k, .62, .3);
  };
  M.drawTile = function (G, t, T) {
    A.cell(t.x, t.y, { hp: t.hp, seed: t.seed, t: T, flash: t.flash });
    for (const s of t.sp) A.rod(s.x, s.y, s.rot + Math.sin(s.ph * .5) * .2, .92 * s.s, 'evil', s.ph, 1, s.r);
  };
  M.drawOver = function (G, T) {
    const c = B.ctxOf(), pl = G.phase === 'player', sel = selU(G), fc = G.fc;
    if (pl && fc) for (const t of G.tiles) {
      if (t.b.length === 3 && t.spreadTo >= 0 && !(AX.drugOn(G) && !t.b.includes(1))) { const to = G.tiles[t.spreadTo]; A.arrow(t.x, t.y, to.x, to.y, P.bacDk, T); }
      if (fc.dmg[t.i]) A.badge(t.x + 22, t.y - 26, '−1', '#fff', P.danger, 11.5);
    }
    if (pl && sel && G.ap > 0) {
      const eat = AX.eatTargets(G, sel);
      for (const [j] of AX.moveTargets(G, sel)) { if (eat.includes(j)) continue; const t = G.tiles[j]; A.softHex(t.x, t.y, 33); c.strokeStyle = `rgba(31,157,143,${.55 + .25 * Math.sin(T * 4)})`; c.lineWidth = 2.6; c.setLineDash([7, 6]); c.stroke(); c.setLineDash([]); }
      for (const i of eat) { const t = G.tiles[i]; A.softHex(t.x, t.y, 35); c.strokeStyle = P.teal; c.lineWidth = 3.4; c.stroke(); A.badge(t.x, t.y + 30, tx('吞', 'Eat'), '#fff', P.teal, 12.5); }
    }
  };
  M.drawUnit = function (G, u, T) {
    const c = B.ctxOf(), cap = G.cfg.CAP, sel = G.sel === u.id, s = 1 - u.born * .35, fl = u.stomach >= cap;
    if (sel) { c.strokeStyle = P.teal; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -T * 20; c.beginPath(); c.arc(u.x, u.y, 34, 0, 6.283); c.stroke(); c.setLineDash([]); }
    A.mac(u.x, u.y, s, { ph: u.ph, seed: u.id, stomach: u.stomach, gulp: u.gulp, full: fl, mood: u.gulp > 0 ? 'eat' : fl ? 'sleep' : undefined });
    if (G.phase !== 'over') A.badge(u.x, u.y - 36, (fl ? tx('飽 ', 'Full ') : '') + u.stomach + '/' + cap, fl ? '#fff' : P.ink, fl ? P.flame : '#fff', 11.5);
  };

  /* ---------------- 皮膚菌群的小圖（卡片、結算、主選單共用） ---------------- */
  // rows：[[標籤, flora陣列], ...]；和上一列不同的位子畫底線
  M.floraSvg = function (rows, bare) {
    const LW = bare ? 2 : 92, SW = 25, RH = 30; let out = `<svg viewBox="0 0 ${LW + SW * 12 + 4} ${rows.length * RH}" role="img" aria-label="${tx('皮膚上的菌群', 'Bacteria on the skin')}" style="width:100%;height:auto;display:block">`;
    rows.forEach(([label, f], k) => {
      const y = k * RH + RH / 2; out += `<text x="0" y="${y + 4}" font-size="11" fill="#7d6a86">${label}</text><rect x="${LW - 2}" y="${y - 12}" width="${SW * 12 + 4}" height="24" rx="12" fill="#f6efe7"/>`;
      f.forEach((t, i) => {
        const x = LW + SW * i + SW / 2, diff = k > 0 && rows[k - 1][1][i] !== t;
        if (t === 'C') out += `<circle cx="${x - 3.6}" cy="${y}" r="4.8" fill="#8fc1ea" stroke="#2c5c8c" stroke-width="1.2"/><circle cx="${x + 3.6}" cy="${y}" r="4.8" fill="#8fc1ea" stroke="#2c5c8c" stroke-width="1.2"/>`;
        else { out += `<rect x="${x - 9}" y="${y - 4.6}" width="18" height="9.2" rx="4.6" fill="#3fa77c" stroke="${t === 'R' ? '#e2a02c' : '#1d5f45'}" stroke-width="${t === 'R' ? 2 : 1.3}"/>`; if (t === 'R') for (const bx of [-6, -2.4, 1.2, 4.8]) out += `<rect x="${x + bx}" y="${y - 3.6}" width="1.6" height="7.2" fill="#3a2947"/>`; }
        if (diff) out += `<rect x="${x - 9}" y="${y + 9.5}" width="18" height="2.4" rx="1.2" fill="${t === 'R' ? '#c0304f' : '#1c7f73'}"/>`;
      });
    });
    return out + '</svg>';
  };
  const legend = () => `<p class="note">${tx('藍色成對的是無害的<b>住戶</b>；綠色是平常無害、闖進傷口才造成感染的<b>伺機菌</b>；有條紋的，是這種抗生素對它無效的伺機菌。', 'Blue pairs are harmless <b>residents</b>. Green ones are <b>opportunists</b>: harmless on the skin, a cause of infection once inside a wound. Striped ones are opportunists this antibiotic does not work on.')}</p>`;
  const realLife = () => `<p class="note">${tx('真實世界裡，抗藥細菌造成的感染比較難治：醫師要檢驗、改用別種抗生素，能用的藥越來越少，有時沒有一種效果好。免疫細胞不一定清得掉。', 'In real life an infection with resistant bacteria is harder to treat: doctors have to test and switch to another antibiotic, the options keep shrinking, and sometimes none works well. Immune cells cannot be counted on to clear it.')}</p>`;

  /* ---------------- 結算 ---------------- */
  const rec = G => ({ turn: G.turn, hp: Math.round(AX.health(G) * 100), win: !!(G.result && G.result.win), n0: G.load0, r0: G.nR0, kill: G.killed, f0: cen(G.flora0).R, f1: cen(G.flora).R });
  M.summary = function (G, st) {
    if (!G.settled) { G.settled = 1; if (G.result && G.result.win) AX.settle(G); FS.forEach((s, i) => { s.k = G.flora[i]; }); }      // 贏了：療程一定吃完
    const r = G.result, c = G.cfg, hp = Math.round(AX.health(G) * 100), stars = hp >= 95 ? 3 : hp >= 80 ? 2 : 1, a = cen(G.flora0).R, b = cen(G.flora).R, h = IW.save.hist, sv = IW.save.ch.abx || {};
    const why = { tissue: tx('組織損傷過重', 'Too much tissue damage'), overrun: tx('感染失控', 'Infection out of control'), timeout: tx('感染仍未受控', 'Infection still not under control') }[r.why];
    const few = G.drug && G.killed < G.rAtDrug;
    let insight = !G.drug ? tx('抗生素還沒送到，這一場就結束了。', 'This one ended before the antibiotic arrived.')
      : tx(`抗生素第 ${G.drugAt} 回合送到，${G.killed ? `${G.dose2 ? '兩劑共' : ''}殺死 <b>${G.killed}</b> 隻` : '<b>一隻也沒殺死</b>'}；它對 <b>${G.rAtDrug}</b> 隻條紋菌無效。巨噬細胞一共吞掉 ${G.eaten} 隻（其中條紋 ${G.eatenR} 隻）。`, `The antibiotic arrived on turn ${G.drugAt} and killed ${G.killed ? `<b>${G.killed}</b>${G.dose2 ? ' over its two doses' : ''}` : '<b>none</b>'}; it did nothing to the <b>${G.rAtDrug}</b> striped. Macrophages engulfed ${G.eaten} in all (${G.eatenR} striped).`)
      + (few ? tx('這次闖進來的細菌，多數是這種藥對付不了的那一型，所以藥能幫的有限。', ' Most of the bacteria that got in this time were the kind this drug does not work on, so it could only do so much.') : r.win ? tx('藥處理多數，巨噬細胞處理漏網的。', ' The drug handled the many; the macrophages handled the ones that got away.') : G.dose2 ? tx('時間軸上的虛線是條紋菌：怕藥的細菌消失之後，它們沒有對手，越長越多。', ' The dashed line on the timeline is the striped bacteria: once the others were gone they had no competition and kept growing.') : tx('時間軸上的虛線是條紋菌：藥傷不到它們。', ' The dashed line on the timeline is the striped bacteria: the drug could not touch them.'));
    if (r.win && G.drug) insight += tx(`這個療程（${c.COURSE} 回合）讓皮膚上的條紋菌 <b>${a} → ${b}</b>。這個代價是固定的，和你打得快慢無關。`, ` This course (${c.COURSE} turns) took the striped bacteria on the skin from <b>${a} to ${b}</b>. That cost is fixed; it does not depend on how fast you were.`);
    if (G.mut) insight += tx(` 第 ${G.mutAt} 回合有細菌在分裂時抄錯，生出條紋的子代${G.mutAt < G.drugAt || !G.drug ? '——那時還沒有用藥' : ''}。`, ` On turn ${G.mutAt} a dividing bacterium made a copying error and produced a striped offspring${G.mutAt < G.drugAt || !G.drug ? ', before any drug was in use' : ''}.`);
    let extra = G.key === 'p' ? '' : M.floraSvg([[tx('開戰時', 'At the start'), G.flora0], [tx(r.win ? '現在' : '結束時', r.win ? 'Now' : 'At the end'), G.flora]]) + (!r.win ? `<p class="note">${tx('這一場沒有守住，重打時皮膚上的細菌會回到開戰時的樣子。', 'This attempt was lost; when you replay it, the skin goes back to how it was at the start.')}</p>` : `<p class="note">${tx('畫紅線的位子原本住著怕藥的細菌，現在是條紋菌。闖進傷口的細菌來自皮膚，所以這會影響下一次。', 'Spots underlined in red used to hold drug-sensitive bacteria and now hold striped ones. Bacteria that enter a wound come from the skin, so this affects next time.')}${few ? tx('這一次藥能幫的已經有限；真實世界裡，醫師會改用別種抗生素。', ' This time the drug could only do so much; in real life a doctor would switch to a different antibiotic.') : tx('這一次的感染需要抗生素，這個代價是值得的。', ' This infection needed the antibiotic, and the cost was worth paying.')}</p>`);
    if (G.key === 'b2') {
      const rows = [['abx1', tx('第一道傷口', 'First wound')], ['abx2n', tx('第二道（感冒時沒吃）', 'Second (no pills)')], ['abx2p', tx('第二道（感冒時吃了）', 'Second (took pills)')]].filter(x => h[x[0]]);
      if (rows.length > 1) extra += `<table><tr><th>${tx('你的紀錄', 'Your record')}</th><th>${tx('闖入／條紋', 'Entered / striped')}</th><th>${tx('藥殺死', 'Drug killed')}</th><th>${tx('回合', 'Turns')}</th><th>${tx('組織', 'Tissue')}</th></tr>${rows.map(([k, n]) => { const x = h[k]; return `<tr><td>${n}</td><td>${x.n0}／<b>${x.r0}</b></td><td>${x.kill}</td><td>${x.turn}</td><td>${x.win ? x.hp + '%' : tx('失守', 'lost')}</td></tr>`; }).join('')}</table>
        <p class="note">${tx('這是你自己打出來的數字。同一種抗生素、同一個身體，差別在皮膚上的細菌被篩選過幾次。戰場不同、你也更熟練了，所以差別不全來自這裡。', 'These are your own numbers. Same antibiotic, same body: the difference is how many times the bacteria on your skin were selected. The battlefields differ and you have had more practice, so not all of the difference comes from that.')}</p>`;
      extra += realLife();
      if (r.win) extra += `<p class="note">${tx('<b>同一個原理，兩個方向。</b>第 2 章的淋巴結裡，病毒的特徵把認得它的 T 細胞挑出來複製，那是對你有利的篩選。這一章，抗生素把它殺不死的細菌留下來複製。兩邊都沒有誰「學會」什麼：差異事先就在，被留下來的才變多。', '<b>One principle, two directions.</b> In the lymph node of Chapter 2, a virus’s features singled out the T cell that recognized it, and that cell multiplied: selection working for you. In this chapter the antibiotic spared the bacteria it cannot kill, and they multiplied. Neither side “learned” anything: the differences were there beforehand, and what was spared became common.')}</p>`;
      else if (sv.pill) extra += `<p class="note">${tx('感冒時多吃的那個療程，讓這一場多了好幾隻條紋菌。可以回到感冒那天重新選擇，比較看看。', 'The extra course taken for the cold put several more striped bacteria into this battle. You can go back to the day of the cold, choose again, and compare.')}</p>`;
    }
    return { stars, hp, kicker: r.win ? tx(`第 ${G.turn} 回合清除`, `Cleared on turn ${G.turn}`) : tx('防線失守', 'The defense has fallen'), title: r.win ? tx('感染清除', 'Infection cleared') : why,
      stats: [[hp + '%', tx('組織健康', 'Tissue health')], [G.killed, tx('抗生素殺死', 'Killed by the drug')], [G.eaten, tx('巨噬細胞吞噬', 'Engulfed')], [a + ' → ' + b, tx('皮膚上條紋菌', 'Striped on skin')]],
      insight, extra, sameScale: true, series: [{ key: 'load', name: tx('細菌總數', 'All bacteria'), color: P.bacDk }, { key: 'r', name: tx('條紋菌', 'Striped'), color: '#b77a12' }],
      marks: { drug: [tx('藥送到', 'Drug'), DRUG], mut: [tx('突變', 'Mutation'), '#8a5a12'] }, badLabel: tx('療程中', 'During the course') };
  };
  M.rules = function (G, st) {
    const c = st && st.kind === 'practice' ? AX.CFG : G.cfg, rows = [
      [tx('行動', 'Actions'), tx(`每回合 ${c.AP} 點。移動（最多 ${c.MOVE} 格）、吞噬各 1 點。`, `${c.AP} AP per turn. Moving (up to ${c.MOVE} tiles) and engulfing cost 1 AP each.`)],
      [tx('細菌', 'Bacteria'), tx('每回合結束，每個菌落 +1 隻（一格最多 3 隻）。滿 3 隻的菌落會往箭頭方向擴散，並損傷所在組織。子代和親代一樣：條紋的生條紋的。', 'At the end of each turn every colony gains 1 (max 3 per tile). A colony of 3 spreads along its arrow and damages its tile. Offspring match the parent: striped ones produce striped ones.')],
      [tx('突變', 'Mutation'), tx(`沒有條紋的細菌分裂時，有很小的機會（遊戲裡約 ${Math.round(c.MU * 100)}%）抄錯，生出條紋的子代。突變是偶然的，藥不能「指定」它出現。`, `When an unstriped bacterium divides there is a small chance (about ${Math.round(c.MU * 100)}% in the game) of a copying error that produces a striped offspring. Mutations happen by chance; a drug cannot call one up.`)],
      [tx('巨噬細胞', 'Macrophage'), tx(`吞噬身邊的細菌，1 點吞 ${c.BITE} 隻，同格先吞條紋的；體內最多 ${c.CAP} 隻，回合結束消化 ${c.DIGEST} 隻。站在箭頭落點可以攔截擴散過來的細菌。藥對細菌有沒有效，對它沒有差別。`, `Engulfs adjacent bacteria, ${c.BITE} per AP, striped first; holds up to ${c.CAP} and digests ${c.DIGEST} at end of turn. Standing where an arrow lands intercepts the bacterium that spreads there. Whether a drug works on a bacterium makes no difference to it.`)],
      [tx('抗生素', 'Antibiotic'), tx(`醫師開的藥，第 ${c.DRUG_AT} 回合自動送到，療程固定 ${c.COURSE} 回合：你不能提早、延後、縮短或停藥。第一劑讓每一格沒有條紋的細菌死掉一半，剩下的不再分裂；第二劑清完。條紋菌不受影響。`, `Prescribed by a doctor. It arrives by itself on turn ${c.DRUG_AT} and the course is a fixed ${c.COURSE} turns: you cannot bring it forward, delay it, shorten it or stop it. The first dose kills half the unstriped bacteria on each tile and the rest stop dividing; the second dose finishes them. Striped ones are unaffected.`)],
      [tx('皮膚上', 'On the skin'), tx(`療程的每一回合，皮膚上緊鄰條紋菌的一個細菌會死掉，由條紋菌補位。提早打贏，療程也照樣吃完，所以一個療程固定換掉 ${c.COURSE} 個位子。闖進傷口的細菌來自皮膚：伺機菌裡條紋的比例越高，下一次闖進來的條紋菌越多。`, `On each turn of the course, one bacterium next to a striped one on the skin dies and a striped one takes its place. If you win early the course is still finished, so one course always replaces ${c.COURSE} spots. Bacteria that enter a wound come from the skin: the larger the striped share of the opportunists, the more striped bacteria get in next time.`)],
      [tx('勝敗', 'Win / lose'), tx(`把組織裡的細菌清光就贏。組織健康歸零、細菌達 ${c.LOAD_MAX} 隻，或 ${c.TURNS} 回合用完就輸。`, `Clear every bacterium from the tissue to win. Lose if tissue health hits zero, bacteria reach ${c.LOAD_MAX}, or ${c.TURNS} turns run out.`)]];
    return `<div class="rules">${rows.map(r => `<b>${r[0]}</b><span>${r[1]}</span>`).join('')}</div>
      <p class="note">${tx('<b>這不是用藥建議。</b>真實的療程長度由開藥的醫療人員決定，不是固定幾天。請照指示使用抗生素，不要自己停藥、延長或加藥，也不要吃別人的或上次剩下的藥。', '<b>This is not advice about taking medicine.</b> The length of a real course is set by the health professional who prescribes it; it is not a fixed number of days. Take antibiotics exactly as directed, do not stop, extend or add to treatment on your own, and do not use someone else’s or leftover antibiotics.')}</p>`;
  };

  /* ---------------- 章節定義 ---------------- */
  const unlock = () => Object.assign(IW.save.codex, { mac: 1, bac: 1, tissue: 1, abx: 1, resist: 1, flora: 1, select: 1 });
  const menuBtn = () => ({ label: tx('主選單', 'Menu'), sm: 1, fn: () => { location.hash = '#menu'; } });
  const toCold = () => ({ label: tx('回到感冒那天，重新選擇', 'Go back to the day of the cold and choose again'), sm: 1, fn: () => { const c = save(); delete c.pill; delete c.f2; IW.save.flora = c.f1 ? c.f1.slice() : undefined; IW.store(); B.go(4); } });
  const toStart = () => ({ label: tx('從第一道傷口重來', 'Start over from the first wound'), sm: 1, fn: () => { const c = save(), h = IW.save.hist; delete c.b1; delete c.f1; delete c.pill; delete c.f2; delete IW.save.flora; delete h.abx1; delete h.abx2n; delete h.abx2p; IW.store(); B.go(3); } });
  const PC = { MU: 0, TURNS: 6 };
  // 感冒那天：整章唯一由玩家決定的用藥。吃了，病毒一個也不會少；皮膚上的細菌卻被多篩選了一次
  async function cold(B, G) {
    const c = save(), f0 = M.base(), f1 = c.f1 || f0, fr = f1.slice(); AX.recover(fr, f0);
    const pill = await B.ask(() => ({ html: `<h2>${tx('幾個月後', 'Months later')}</h2><h1>${tx('你感冒了', 'You have a cold')}</h1>
      <p>${tx('喉嚨痛、流鼻水。這是病毒引起的，你的免疫系統已經在處理了：T 細胞和抗體幾天後就會到。', 'A sore throat and a runny nose. A virus is causing it, and your immune system is already on it: T cells and antibodies will arrive in a few days.')}</p>
      <p>${tx('室友遞來半盒抗生素：「我上次看病剩的。吃這個好得比較快。」', 'Your roommate hands you half a box of antibiotics: “Left over from last time I was sick. You’ll get better faster with these.”')}</p>
      <div class="btns"><button class="pill" id="yes">${tx('吃', 'Take them')}</button><button class="pill" id="no">${tx('不吃', 'Don’t take them')}</button></div>`, on: { yes: () => 1, no: () => 0 } }));
    const f2 = fr.slice(); if (pill) { const rng = IW.rng((IW.save.bodySeed + 77) | 0); for (let k = 0; k < G.cfg.COURSE; k++) AX.floraTick(f2, rng); }
    IW.sfx(pill ? 'no' : 'ok');
    await B.ask(() => ({ html: `<h2>${tx('一個星期後', 'A week later')}</h2><h1>${pill ? tx('感冒照樣拖了一個星期', 'The cold still took a week') : tx('感冒好了', 'The cold is gone')}</h1>
      <p>${tx('清掉病毒的是你的 T 細胞和抗體。抗生素攻擊的是細菌才有的構造；病毒沒有細胞壁，也沒有自己的生產設備（它借用你的細胞），藥找不到可以下手的地方。', 'It was your T cells and antibodies that cleared the virus. Antibiotics attack structures only bacteria have. A virus has no cell wall and no machinery of its own (it borrows your cells’), so the drug has nothing to act on.')}${pill ? '' : tx('吃了也不會好得比較快。', ' Taking them would not have made you better any sooner.')}</p>
      <p>${pill ? tx(`但藥還是流遍了全身。皮膚上又有 ${G.cfg.COURSE} 個細菌死掉，位子被條紋菌補上：`, `But the drug still went everywhere in your body. Another ${G.cfg.COURSE} bacteria on your skin died, and striped ones took their places:`) : tx('皮膚上沒有再被篩選一次：', 'The bacteria on your skin were not selected a second time:')}</p>
      ${M.floraSvg(pill ? [[tx('傷口好了之後', 'After the wound'), f1], [tx('幾個月後', 'Months later'), fr], [tx('吃了這盒藥', 'After the pills'), f2]] : [[tx('傷口好了之後', 'After the wound'), f1], [tx('幾個月後', 'Months later'), fr]])}
      <p class="note">${tx('畫綠線的位子：幾個月沒有用藥，怕藥的細菌長回來了一些（帶著抗藥基因通常有代價）。', 'The spot underlined in green: after months without the drug, some drug-sensitive bacteria grew back (carrying a resistance gene usually has a cost).')}${pill ? tx('紅線是這次被條紋菌補上的。', ' Red marks the spots striped bacteria took this time.') : ''}</p>
      <div class="btns"><button class="pill pri" id="go">${tx('繼續 ▸', 'Continue ▸')}</button></div>`, on: { go: () => 1 } }));
    c.pill = !!pill; c.f2 = f2; IW.save.flora = f2.slice(); IW.store();
  }
  const retryBtn = (G, win) => ({ label: tx('再試一次（同一戰場）', 'Try again (same battle)'), pri: !win, sm: win, fn: () => { skipPre = true; B.go(B.stage, G.seed); } });
  IW.chapters = IW.chapters || {};
  IW.chapters.abx = {
    id: 'abx', mode: M, title: ['第 4 章｜漏網之魚：抗生素與抗藥性', 'Chapter 4 | The Ones That Got Away: Antibiotics and Resistance'], short: ['4｜漏網之魚', '4 | Got Away'],
    resume: () => { const c = IW.save.ch.abx || {}; return c.b1 ? 4 : (c.prac || 0) >= 3 ? 3 : (c.prac || 0); },
    stages: [
      { kind: 'practice', seed: 11, cfg: Object.assign({}, PC, { TURNS: 4 }), flora: 'CCSCCSCCCSCS', preset: { scabs: [2], units: [['mac', 20]], bac: { 7: 'SSS', 8: 'SSS', 13: 'SS', 14: 'SS' } },
        goal: ['練習 1：細菌太多了', 'Practice 1: too many bacteria'], won: ['抗生素：體外來的幫手', 'Antibiotics: help from outside the body'],
        say: G => tx(`抗生素殺死 ${G.killed} 隻${G.eaten ? `，巨噬細胞吞掉 ${G.eaten} 隻` : ''}。抗生素不是免疫系統的一部分，是從體外來的藥。它攻擊細菌才有的構造（例如細胞壁，或細菌自己的蛋白質工廠），所以能殺細菌，又不太傷到你的細胞。很多抗生素原本就是微生物製造的：青黴素來自一種黴菌。`, `The antibiotic killed ${G.killed}${G.eaten ? ` and the macrophage engulfed ${G.eaten}` : ''}. An antibiotic is not part of the immune system; it is a drug from outside the body. It attacks structures that bacteria have (the cell wall, for example, or the bacterium’s own protein factories), which is why it can kill bacteria while doing little harm to your cells. Many antibiotics were first made by microbes: penicillin comes from a mold.`),
        next: ['但不是每一隻都會死 ▸', 'But not every one dies ▸'], lost: ['抗生素第 2 回合就會送到，兩劑清完。先吞幾隻，再按「結束回合」。', 'The antibiotic arrives on turn 2 and takes two doses. Engulf a few, then press “End turn”.'],
        guide: G => G.ap === 0 ? '' : G.turn > 1 ? (G.drug && !selU(G) ? tx('剩下的不再分裂了。繼續吞，或按「結束回合」等第二劑。', 'The rest have stopped dividing. Keep engulfing, or press “End turn” for the second dose.') : '') : !selU(G) && !acts ? tx('點選巨噬細胞，吞掉身邊的細菌。它一口只能吞一隻。', 'Select the macrophage and engulf the bacteria next to it. It takes one per bite.') : acts >= 2 ? tx('來不及的。醫師開了抗生素，下一回合送到：按「結束回合」。', 'It cannot keep up. The antibiotic a doctor prescribed arrives next turn: press “End turn”.') : '' },
      { kind: 'practice', seed: 12, cfg: Object.assign({}, PC, { TURNS: 7, DRUG_AT: 3 }), flora: 'CCSCCSCCCSCS', preset: { scabs: [3], units: [['mac', 25]], bac: { 8: 'SSS', 9: 'SS', 14: 'SS', 16: 'S' }, mutate: { turn: 1, tile: 16 } },
        goal: ['練習 2：留意細菌分裂', 'Practice 2: watch them divide'], won: ['藥沒有改變細菌，只決定誰留下來', 'The drug did not change the bacteria; it decided which were left'],
        say: G => tx('那隻條紋菌是第 1 回合分裂時抄錯才出現的，那時還沒有用藥。抗生素沒有製造它，也沒有「教會」它什麼。', 'The striped bacterium appeared from a copying error on turn 1, before any drug was in use. The antibiotic did not create it or “teach” it anything.')
          + (!G.rAtDrug ? tx('你在藥送到之前就讓巨噬細胞把它吞掉了。要是沒吞掉，藥會殺光其他細菌，只留下它。', ' You had the macrophage engulf it before the drug arrived. Had it been left, the drug would have killed all the others and spared only that one.') : (G.dose2 ? tx('兩劑下來，藥把別的都殺掉，只有它被留了下來。', ' Over two doses the drug killed all the others, and that one was left.') : tx('藥殺掉了別的細菌，卻始終傷不到它。', ' The drug killed the others but never touched that one.')) + (G.rMax >= 3 ? tx(`對手消失之後，它一路長到 ${G.rMax} 隻，每一隻都帶著同樣的基因。`, ` With its competitors gone it grew to ${G.rMax}, every one carrying the same gene.`) : tx('你趁它還只有一兩隻就吞掉了；放著不管，它的後代會佔滿對手留下的空間。', ' You engulfed it while there were only one or two; left alone, its offspring would have filled the space its competitors left.'))),
        next: ['抗生素還會殺到誰？ ▸', 'What else does the antibiotic kill? ▸'], lostTitle: ['細菌佔滿了', 'The bacteria took over'],
        lost: ['藥殺光了它殺得死的細菌之後，剩下的條紋菌沒有對手，越長越多。藥一送到，就讓巨噬細胞去吞有條紋的。', 'Once the drug had killed everything it could, the striped bacteria that were left had no competition and kept growing. As soon as the drug arrives, send the macrophage after the striped ones.'],
        guide: G => { if (G.ap === 0) return ''; if (G.turn === 1) return acts ? '' : tx('抗生素第 3 回合才到。先讓巨噬細胞靠近細菌，再按「結束回合」。', 'The drug arrives on turn 3. Move the macrophage closer, then press “End turn”.'); if (!G.drug && AX.nR(G)) return tx('有一隻長出了條紋。猜猜看：下一回合藥送到，誰會留下來？', 'One now has stripes. Guess: when the drug arrives next turn, which will be left?'); if (G.drug && AX.nR(G) && !selU(G)) return AX.load(G) > AX.nR(G) ? tx('第一劑殺掉一半，條紋菌一隻也沒少。趁它還少，點選巨噬細胞去吞它。', 'The first dose killed half, and not one striped. Engulf the striped while there are few.') : tx('只剩條紋菌了。點選巨噬細胞去吞它，別讓它長滿。', 'Only striped ones are left. Engulf them before they fill the space.'); return ''; } },
      { kind: 'practice', seed: 13, cfg: Object.assign({}, PC, { TURNS: 7 }), flora: 'CCSCRCSCCSCS', preset: { scabs: [1, 4], units: [['mac', 19], ['mac', 22]], bac: { 7: 'SSR', 10: 'SSR', 13: 'SS', 16: 'SS' } },
        goal: ['練習 3：留意最上面那一排', 'Practice 3: watch the top row'], won: ['抗生素分不出誰是住戶', 'An antibiotic cannot tell who the residents are'],
        say: G => tx(`一個療程下來，皮膚上的條紋菌從 ${cen(G.flora0).R} 個變成 ${cen(G.flora).R} 個。皮膚上本來就住著很多細菌，大多數是無害的住戶；它們佔著位子，別的細菌就不容易擴張。抗生素流遍全身，連它們一起殺，空出來的位子被條紋菌補上。這個代價每個療程都一樣，所以抗生素要留給真正需要它的感染，像這一次。`, `Over one course, striped bacteria on the skin went from ${cen(G.flora0).R} to ${cen(G.flora).R}. Many bacteria live on the skin all the time, most of them harmless residents; because they hold the space, others cannot easily expand. An antibiotic goes everywhere and kills them too, and striped bacteria take the spots they leave. Every course costs this much, which is why antibiotics are kept for infections that really need them, like this one.`),
        next: ['開始正式戰鬥 ▸', 'Start the real battle ▸'], lost: ['藥只殺沒有條紋的。讓兩個巨噬細胞各自去吞一邊的條紋菌。', 'The drug only kills the unstriped ones. Send each macrophage after the striped bacteria on its side.'],
        guide: G => { if (G.ap === 0) return ''; if (G.turn === 1 && !acts) return tx('最上面那一排是皮膚上的細菌：藍色成對的是無害的住戶，綠色裡有一隻有條紋。藥送到之後，留意那一排。', 'Top row: bacteria living on the skin. Blue pairs are harmless residents; one green one is striped. Watch it when the drug arrives.'); return ''; } },
      { kind: 'battle', key: 'b1', cfg: {},
        pre: B => { if (skipPre) { skipPre = false; return; } return B.ask(() => ({ html: `<h2>${tx('一年後', 'A year later')}</h2><h1>${tx('這次的傷口比較深', 'A deeper wound this time')}</h1>
          <p>${tx('皮膚上本來就住著很多細菌，平常相安無事（第 1 章皮膚外面那幾隻就是）。這次傷口深，結痂之前已經有一大批闖了進去，多到巨噬細胞忙不過來。', 'Plenty of bacteria live on the skin all the time without any trouble (the ones drawn outside the skin in Chapter 1). This wound was deep, and before it scabbed over a large number got in, too many for the macrophages.')}</p>
          ${M.floraSvg([[tx('你的皮膚', 'Your skin'), M.base()]])}${legend()}
          <p class="note">${tx('醫師看過之後開了抗生素，第 2 回合送到。要不要用、用哪一種、用多久，是醫療人員的判斷，所以這裡沒有按鈕：你的工作是帶巨噬細胞處理藥殺不死的那幾隻。', 'A doctor has seen it and prescribed an antibiotic, which arrives on turn 2. Whether to use one, which one and for how long are a health professional’s call, so there is no button for it here: your job is to lead the macrophages against the ones the drug cannot kill.')}</p>
          <div class="btns"><button class="pill pri" id="go">${tx('開始 ▸', 'Begin ▸')}</button></div>`, on: { go: () => 1 } })); } },
      { kind: 'battle', key: 'b2', cfg: { START: 14, TURNS: 12 },
        pre: async (B, G) => {
          const c = save();
          if (c.pill === undefined) { skipPre = false; await cold(B, G); if (B.G === G) B.go(4); return; }      // 選完之後，用新的皮膚菌群重新佈置這一場
          if (skipPre) { skipPre = false; return; }
          await B.ask(() => ({ html: `<h2>${tx('又過了一陣子', 'Some time later')}</h2><h1>${tx('又一道傷口', 'Another wound')}</h1>
            <p>${tx('闖進傷口的細菌來自你的皮膚：伺機菌裡條紋的比例越高，進來的條紋菌越多。醫師看過之後，開了和上次同一種抗生素。', 'The bacteria that enter a wound come from your skin: the larger the striped share of the opportunists, the more striped ones get in. A doctor has seen it and prescribed the same antibiotic as last time.')}</p>
            ${M.floraSvg([[tx('第一道傷口前', 'Before wound 1'), M.base()], [c.done ? tx('這一場開戰前', 'Before this one') : tx('現在', 'Now'), G.flora]])}
            ${c.done ? `<p class="note">${tx('<b>重玩。</b>你已經打完這一章；這裡回到第二道傷口開戰之前的皮膚，不是主選單上現在的樣子。重玩不會讓皮膚上的條紋菌越疊越多。', '<b>Replay.</b> You have finished this chapter; this goes back to the skin as it was before the second wound, not as the menu shows it now. Replaying does not pile up more striped bacteria on the skin.')}</p>` : ''}
            <p>${tx(`${c.done ? '那時' : '現在'}皮膚上的伺機菌，有 <b>${pct(G.flora)}%</b> 是這種抗生素對付不了的（第一道傷口之前是 ${pct(M.base())}%）。這次闖進來 ${G.load0} 隻，其中 <b>${G.nR0}</b> 隻有條紋。`, `Of the opportunists on your skin ${c.done ? 'at that point' : 'now'}, <b>${pct(G.flora)}%</b> are ones this antibiotic does not work on (before the first wound it was ${pct(M.base())}%). This time ${G.load0} got in, <b>${G.nR0}</b> of them striped.`)}</p>
            <div class="btns"><button class="pill pri" id="go">${tx('開始 ▸', 'Begin ▸')}</button></div>`, on: { go: () => 1 } }));
        } }],
    onBattleEnd(G, s) {
      const c = save(), h = IW.save.hist; c.plays = (c.plays || 0) + 1; unlock();
      if (G.key === 'b1') { if (G.result.win) { c.b1 = true; c.f1 = G.flora.slice(); delete c.pill; delete c.f2; IW.save.flora = G.flora.slice(); h.abx1 = rec(G); delete h.abx2n; delete h.abx2p; } }
      else { const k = c.pill ? 'abx2p' : 'abx2n'; if (G.result.win || !(h[k] && h[k].win)) h[k] = rec(G); if (G.result.win) { c.done = true; c.stars = Math.max(c.stars || 0, s.stars); IW.save.flora = G.flora.slice(); IW.sfx('card'); } }
      IW.store();
    },
    endButtons(G) {
      const win = G.result.win, fresh = { label: tx('換一個戰場', 'New battle'), sm: 1, fn: () => { skipPre = true; B.go(B.stage); } };
      if (G.key === 'b1') return win ? [{ label: tx('繼續：幾個月後 ▸', 'Continue: months later ▸'), pri: 1, fn: () => B.go(4) }, { label: tx('重打這一場', 'Replay this battle'), sm: 1, fn: () => { skipPre = true; B.go(3); } }, menuBtn()] : [retryBtn(G, win), fresh, { label: tx('重玩練習', 'Replay practice'), sm: 1, fn: () => B.go(0) }, menuBtn()];
      return win ? [{ label: tx('回主選單看這個身體 ▸', 'Back to the menu to see your body ▸'), pri: 1, fn: () => { location.hash = '#menu'; } }, toCold(), toStart()] : [retryBtn(G, win), fresh, toCold(), toStart(), menuBtn()];
    }
  };
})(window.IW);
