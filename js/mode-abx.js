'use strict';
/* =====================================================================
   第 4 章｜漏網之魚：抗生素與抗藥性
   第 2 章的淋巴結是「把認得病毒的 T 細胞挑出來複製」。這一章是同一個原理反過來：
   抗生素把怕它的細菌殺掉，剩下不怕它的繼續分裂——藥沒有改變細菌，只決定了誰留下來。
   皮膚上的那一排菌群（第 1 章畫在皮膚外面的細菌）在這裡變成這個身體的一部分，會存進存檔。
   三個練習（抗生素 → 漏網之魚 → 皮膚上的住戶），兩場戰鬥之間是一個選擇。
   ===================================================================== */
(function (IW) {
  const { tx, pick, art: A, battle: B, abx: AX } = IW, P = A.P, W = B.W, H = B.H, R = B.R, DRUG = '#2f7fc1', DRUGC = '47,127,193';
  const M = IW.modeAbx = { banner: ['細菌行動中', 'Bacteria are acting'] };
  const selU = G => G.units.find(u => u.id === G.sel);
  const canAct = G => G.phase === 'player' && !G.result && G.ap > 0 && !B.busy;
  const save = () => (IW.save.ch.abx = IW.save.ch.abx || {});
  const FX = i => 31.5 + i * 37, FY = 21;
  let acts = 0, FS = [];
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
  M.sample = G => ({ turn: G.turn, load: AX.load(G), r: AX.nR(G), bad: !!G.drug });
  M.cancel = () => { };

  /* ---------------- 操作 ---------------- */
  // 格子上的細菌圖：數量與條紋跟著規則層的 t.b 走
  function sync(t, from) {
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
  function doEat(G, u, i) {
    const t = G.tiles[i], e = AX.actEat(G, u, i); B.gulp(u, take(t, e.n, e.r), tx('吞噬 ×', 'Engulfed ×') + e.n); acts++;
    if (e.r) B.hint('eatR', ['巨噬細胞不管細菌怕不怕藥，照吞不誤。抗藥性指的是「藥對它沒用」，不是「什麼都對它沒用」。', 'A macrophage engulfs bacteria whether or not a drug works on them. Resistance means “this drug does not work on it”, not “nothing works on it”.']);
    else B.hint('eat1', [`巨噬細胞一口吞 ${G.cfg.BITE} 隻，體內最多 ${G.cfg.CAP} 隻。同一格裡有條紋的，會先吞條紋的（遊戲設定）。`, `A macrophage engulfs ${G.cfg.BITE} per bite and holds up to ${G.cfg.CAP}. If a tile has a striped one, it takes that first (a game rule).`]);
    B.afterAction();
  }
  function doMove(G, u, i, prev) {
    const path = []; for (let j = i; j !== u.tile; j = prev.get(j)) path.unshift({ x: G.tiles[j].x, y: G.tiles[j].y });
    u.path.push(...path); AX.actMove(G, u, i); IW.sfx('move'); acts++; B.afterAction();
  }
  function floraFx(G, e) {                                     // 皮膚上：一個怕藥的死掉，旁邊的條紋菌分裂補位
    if (!e) return; const s = FS[e.i], from = FS[e.i - 1] && FS[e.i - 1].k === 'R' ? FS[e.i - 1] : FS[e.i + 1];
    B.burst(s.x, FY, 7, e.was === 'C' ? '143,193,234' : '63,167,124', 55, 2.2); B.ring(s.x, FY, DRUGC, 20, .5);
    s.k = 'R'; s.s = .35; if (from) s.x = FX(FS.indexOf(from));
  }
  async function doDrug(G) {
    const nS = AX.drugKills(G), ev = AX.actDrug(G); B.mark('drug'); acts++; B.busy = true; G.sel = -1; B.refresh(); IW.sfx('calm');
    for (let k = 0; k < 18; k++) { const x = 16 + Math.random() * (W - 32), r0 = Math.random() * 6; B.fly({ x0: x, y0: H - 26, x1: x + (Math.random() - .5) * 50, y1: 76 + Math.random() * 90, dur: .5 + Math.random() * .4, draw: (px, py, q) => A.pill(px, py, r0 + q * 4, .95, 1 - q * .55) }); }
    await IW.wait(540); if (B.G !== G) return;
    ev.kill.forEach((e, k) => { const t = G.tiles[e.i]; for (const s of t.sp) if (!s.r) B.burst(s.x, s.y, 6, DRUGC, 65, 2.2); sync(t); B.ftext(t.x, t.y - 22, '−' + e.n, DRUG); if (k < 4) IW.sfx('pop'); });
    floraFx(G, ev.flora);
    const nR = AX.nR(G);
    B.hint('drug1', ['抗生素隨著血液送到全身。它攻擊的是細菌才有的構造（例如細胞壁），你自己的細胞沒有細胞壁，受到的影響小得多。', 'The antibiotic travels through the blood to the whole body. It attacks structures that bacteria have (the cell wall, for example). Your own cells have no cell wall, so they are affected far less.']);
    if (nR) B.hint('surv', [`有條紋的 ${nR} 隻沒有死。它們帶著讓這種藥失效的基因——不是藥把它們變成這樣，是它們本來就不一樣。剩下的交給巨噬細胞。`, `The ${nR} striped one${nR > 1 ? 's' : ''} did not die. They carry a gene that makes this drug useless against them. The drug did not make them that way; they were already different. The rest is up to the macrophages.`], true);
    if (nS < nR) B.hint('weak', [`這次只有 ${nS} 隻死掉。闖進來的細菌大多數不怕這種藥了。`, `Only ${nS} died this time. Most of the bacteria that got in are no longer affected by this drug.`], true);
    if (ev.flora) B.hint('dose', ['看皮膚上那一排：抗生素分不出誰是無害的住戶。每用藥一回合，緊鄰條紋菌的一個怕藥細菌會死掉，空出來的位子由條紋菌補上。', 'Watch the row on the skin: the antibiotic cannot tell harmless residents apart. Each turn on the drug, one drug-sensitive bacterium next to a striped one dies, and a striped one takes its place.']);
    await IW.wait(460); if (B.G !== G) return;
    B.busy = false; B.afterAction();
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
  M.needArm = G => AX.canDrug(G) && G.phase === 'player' && !B.busy;
  M.act = function (G, id) {
    if (G.phase !== 'player' || G.result || B.busy) return;
    if (!AX.canDrug(G)) { IW.sfx('deny'); return B.hint('nodrug', G.drug ? ['已經在用藥了。抗生素開始後會持續到這一場結束（遊戲設定）。', 'The antibiotic is already running. Once started it continues until this battle ends (a game rule).'] : G.turn < G.cfg.DRUG_FROM ? ['抗生素下一回合才會送到。', 'The antibiotic will not be here until next turn.'] : ['行動點數用完了。', 'Out of action points.'], true); }
    doDrug(G);
  };
  M.preview = function (G) {
    if (!AX.canDrug(G)) return null; const nS = AX.drugKills(G), nR = AX.nR(G);
    return tx(`<b>抗生素</b>（1 點）：殺死組織裡 <b>${nS}</b> 隻怕藥的細菌${nR ? `；<b>${nR}</b> 隻條紋菌不受影響` : ''}。開始後持續到這一場結束。`, `<b>Antibiotic</b> (1 AP): kills the <b>${nS}</b> drug-sensitive bacteria in the tissue${nR ? `; the <b>${nR}</b> striped one${nR > 1 ? 's are' : ' is'} unaffected` : ''}. Once started, it runs until this battle ends.`)
      + (AX.nextDose(G.flora).length ? ` <span class="w">${tx('每用藥一回合，皮膚上圈起來的位子會有一個換成條紋菌。', 'Each turn on the drug, one of the circled spots on the skin turns striped.')}</span>` : '');
  };
  M.info = function (G, i) {
    const t = G.tiles[i], u = AX.unitAt(G, i), sel = selU(G), L = [], nr = t.b.filter(x => x).length;
    if (sel && G.phase === 'player' && !(u && u !== sel)) {
      if (AX.eatTargets(G, sel).includes(i)) L.push(tx(`<b>點一下：吞噬 1 隻</b>（1 點）${nr ? '，先吞條紋的' : ''}`, `<b>Tap: engulf 1</b> (1 AP)${nr ? ', striped first' : ''}`));
      else if (AX.moveTargets(G, sel).has(i)) L.push(tx('<b>點一下：移動到這裡</b>（1 點）', '<b>Tap: move here</b> (1 AP)'));
    }
    if (u) L.push(tx(`<b>巨噬細胞</b>　體內 ${u.stomach}/${G.cfg.CAP}${u.stomach >= G.cfg.CAP ? '（飽了）' : ''}，回合結束消化 ${G.cfg.DIGEST} 隻。怕藥、不怕藥的細菌它都吞。`, `<b>Macrophage</b>  holding ${u.stomach}/${G.cfg.CAP}${u.stomach >= G.cfg.CAP ? ' (full)' : ''}; digests ${G.cfg.DIGEST} at end of turn. It engulfs bacteria whether or not the drug works on them.`));
    if (t.b.length) L.push(tx(`<b>細菌 ×${t.b.length}</b>${nr ? `（條紋 ${nr}：不怕這種抗生素）` : ''}　`, `<b>Bacteria ×${t.b.length}</b>${nr ? ` (${nr} striped: this antibiotic does not work on them)` : ''}  `) + (t.b.length === 3 ? tx('回合結束會擴散，並損傷這格組織。', 'will spread at end of turn and damage this tile.') : tx('回合結束會分裂成 ' + (t.b.length + 1) + ' 隻。', `will divide to ${t.b.length + 1} at end of turn.`)));
    if (t.hp < 3) L.push(tx(['組織已壞死', '組織嚴重受損', '組織受損'], ['Tissue dead', 'Tissue badly damaged', 'Tissue damaged'])[t.hp]);
    if (t.scab) L.push(tx('已經結痂的傷口：細菌是結痂之前闖進來的', 'A scabbed-over wound: the bacteria got in before it closed'));
    if (!L.length) L.push(tx('健康的組織細胞', 'Healthy tissue cell'));
    return L.join('<br>');
  };
  M.guide = function (G, st) {
    if (G.ap === 0) return tx('行動點數用完了：按「結束回合」，換細菌行動。', 'Out of action points: press “End turn” to let the bacteria act.');
    if (st.kind === 'practice') return '';
    const first = !(IW.save.ch.abx || {}).done;
    if (first && G.turn === 1 && !acts) return G.key === 'b1' ? tx('正式戰鬥。條紋菌不怕這種抗生素，只有巨噬細胞能處理。抗生素開始後會持續到結束：越快清乾淨，皮膚上的住戶損失越少。', 'The real battle. This antibiotic does not work on the striped bacteria; only macrophages can deal with them. Once started, the antibiotic runs to the end: the faster you finish, the fewer residents the skin loses.')
      : tx(`這次闖進來的 ${G.load0} 隻細菌裡，有 ${G.nR0} 隻是條紋的。`, `Of the ${G.load0} bacteria that got in this time, ${G.nR0} ${G.nR0 === 1 ? 'is' : 'are'} striped.`);
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
      api.hint('mut', [(G.drug ? '' : '<b>現在並沒有在用藥。</b>') + '細菌分裂時要抄一份自己的 DNA，偶爾會抄錯，這叫<b>突變</b>。極少數抄錯剛好讓它不怕某一種藥。', (G.drug ? '' : '<b>No drug is in use right now.</b> ') + 'A dividing bacterium copies its DNA and now and then makes a mistake: a <b>mutation</b>. A very few mistakes happen to make it unaffected by some drug.'], true);
    }
    if (G.drug && gr.some(e => e.r)) api.hint('release', ['怕藥的細菌都不在了，條紋菌有了空間與養分，繼續分裂。子代和親代帶著一樣的基因。', 'With the drug-sensitive bacteria gone, the striped ones have room and nutrients and keep dividing. Offspring carry the same gene as the parent.']);
    else if (gr.length) api.hint('divide', ['細菌在條件合適的組織裡，一分為二不斷增殖。', 'Where conditions are right, bacteria keep multiplying by dividing in two.']);
    B.hud(); await api.wait(mu.length ? 900 : gr.length ? 480 : 50); if (!api.alive()) return;
    const dm = AX.phaseDamage(G, fl);
    for (const i of dm) { const t = G.tiles[i]; t.flash = 1; B.burst(t.x, t.y, 7, '192,48,79', 70, 2.6); B.ftext(t.x, t.y - 18, '−1', P.danger); }
    if (dm.length) { IW.sfx('hurt'); api.hint('toxin', ['組織受損：滿載的菌落正在損傷它所在的組織。', 'Tissue damage: a full colony is damaging the tissue it sits on.']); }
    for (const t of G.tiles) sync(t);
    B.hud(); await api.wait(dm.length ? 520 : 80); if (!api.alive()) return;
    if (G.drug) {
      const e = AX.dose(G);
      if (e) { floraFx(G, e); IW.sfx('pop'); api.hint('dose2', [e.was === 'C' ? '又過了一回合：皮膚上一個無害的住戶被抗生素殺死，位子被條紋菌補上。' : '又過了一回合：皮膚上一個怕藥的伺機菌被殺死，位子被它不怕藥的同類補上。', e.was === 'C' ? 'Another turn on the drug: a harmless resident on the skin is killed, and a striped one takes its place.' : 'Another turn on the drug: a drug-sensitive opportunist on the skin is killed, and its resistant relative takes its place.']); B.hud(); await api.wait(520); if (!api.alive()) return; }
    }
    G.rMax = Math.max(G.rMax, AX.nR(G));
    AX.advance(G);
  };

  /* ---------------- HUD ---------------- */
  M.hud = function (G) {
    const c = G.cfg, L = AX.load(G), nR = AX.nR(G), hp = AX.health(G), pl = G.phase === 'player', fc = pl ? G.fc : null, n = cen(G.flora), f = []; let bad = '';
    if (fc) {
      if (fc.nDmg) f.push(tx(`回合結束：${fc.nDmg} 格組織受損。`, `End of turn: ${fc.nDmg} tile${fc.nDmg > 1 ? 's' : ''} damaged.`));
      const r = fc.res; if (r && !r.win) bad = { tissue: tx('組織會損傷殆盡', 'the tissue will be destroyed'), overrun: tx('感染會失控', 'the infection will be out of control'), timeout: tx('這是最後一回合', 'this is the last turn') }[r.why];
      if (bad) f.push(`<span class="w">${tx('就這樣結束回合：', 'If you end the turn now: ')}${bad}。</span>`);
      if (G.drug && AX.nextDose(G.flora).length) f.push(`<span class="w">${tx(`用藥第 ${G.expo} 回合：回合結束時，皮膚上再一個位子換成條紋菌。`, `Turn ${G.expo} on the drug: at end of turn one more spot on the skin turns striped.`)}</span>`);
      else if (!G.drug && G.turn < c.DRUG_FROM) f.push(tx('抗生素下一回合送到。', 'The antibiotic arrives next turn.'));
    }
    return {
      turn: tx(`回合 ${G.turn} / ${c.TURNS}`, `Turn ${G.turn} / ${c.TURNS}`),
      pips: Array.from({ length: c.TURNS }, (_, k) => { const t = k + 1; return { cls: t < G.turn ? 'done' : t === G.turn ? 'now' : '', m: G.drugAt === t ? tx('藥', 'Rx') : '' }; }),
      gauges: [
        { label: tx('組織健康', 'Tissue'), val: Math.round(hp * 100) + '%', frac: hp, color: P.teal, warn: hp < .35, title: tx('遊戲化的整體損傷預算，歸零即失敗。', 'A game-style damage budget; zero means defeat.') },
        { label: tx('細菌', 'Bacteria'), val: (fc && fc.load !== L ? `${L} <small>→ ${fc.load}</small>` : L) + (nR ? ` <small>${tx('條紋', 'striped')} ${nR}</small>` : ''), frac: L / c.LOAD_MAX, next: fc ? fc.load / c.LOAD_MAX : undefined, color: P.bac, warn: (fc ? fc.load : L) >= c.LOAD_MAX * .75 },
        { label: tx('皮膚上條紋菌', 'Striped on skin'), val: `${n.R} <small>/ ${G.flora.length}</small>`, frac: n.R / G.flora.length, color: P.gold, warn: n.R > cen(G.flora0).R, title: tx('皮膚上不怕這種抗生素的細菌。下一次闖進傷口的細菌從這裡來。', 'Bacteria on the skin that this antibiotic does not work on. The next bacteria to enter a wound come from here.') }],
      goal: f.join(' '),
      acts: [{ id: 'drug', label: tx('抗生素', 'Antibiotic'), sub: G.drug ? tx(`用藥中・第 ${G.expo} 回合`, `running, turn ${G.expo}`) : G.turn < c.DRUG_FROM ? tx('下一回合送到', 'arrives next turn') : tx('殺死怕藥的細菌', 'kills sensitive bacteria'), color: DRUG, on: !!G.drug, disabled: !AX.canDrug(G) }],
      endDanger: !!bad
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
    const mark = G.phase === 'player' && (G.drug || B.preview === 'drug') ? AX.nextDose(G.flora) : [];
    FS.forEach((s, i) => {
      s.x += (FX(i) - s.x) * .12; s.s += (1 - s.s) * .1; const bob = Math.sin(T * 1.4 + s.ph) * 1.5;
      if (mark.includes(i)) { c.strokeStyle = `rgba(${DRUGC},${.6 + .35 * Math.sin(T * 5)})`; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.arc(s.x, FY, 15, 0, 6.283); c.stroke(); c.setLineDash([]); }
      if (s.k === 'C') A.coccus(s.x, FY + bob, .92 * s.s, T * 2 + s.ph); else A.rod(s.x, FY + bob, Math.sin(T * .7 + s.ph) * .25, .82 * s.s, 'calm', T * 5 + s.ph, 1, s.k === 'R');
    });
    c.font = A.font(10.5); c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = 'rgba(246,239,231,.9)'; c.strokeText(tx('皮膚上的細菌', 'Bacteria on the skin'), 5, 9); c.fillStyle = P.dim; c.fillText(tx('皮膚上的細菌', 'Bacteria on the skin'), 5, 9);
    IW.modeSkin.vessel(c, T, G.drug ? tx('抗生素隨血液送到全身', 'The antibiotic reaches the whole body through the blood') : tx('血管', 'Blood vessel'));
    if (G.drug) for (let k = 0; k < 9; k++) A.pill((k * 53 + 20 + Math.sin(T + k) * 14) % W, H - 50 - ((T * 34 + k * 67) % 470), T * .8 + k, .62, .3);
  };
  M.drawTile = function (G, t, T) {
    A.cell(t.x, t.y, { hp: t.hp, seed: t.seed, t: T, flash: t.flash });
    for (const s of t.sp) A.rod(s.x, s.y, s.rot + Math.sin(s.ph * .5) * .2, .92 * s.s, 'evil', s.ph, 1, s.r);
  };
  M.drawOver = function (G, T) {
    const c = B.ctxOf(), pl = G.phase === 'player', sel = selU(G), fc = G.fc;
    if (pl && fc) for (const t of G.tiles) {
      if (t.b.length === 3 && t.spreadTo >= 0) { const to = G.tiles[t.spreadTo]; A.arrow(t.x, t.y, to.x, to.y, P.bacDk, T); }
      if (fc.dmg[t.i]) A.badge(t.x + 22, t.y - 26, '−1', '#fff', P.danger, 11.5);
    }
    if (pl && B.preview === 'drug' && AX.canDrug(G)) {                                       // 抗生素的預覽：誰會死、誰會留下
      for (const t of G.tiles) { const nS = t.b.filter(x => !x).length, nR = t.b.length - nS; if (!t.b.length) continue; A.softHex(t.x, t.y, 36.5); c.strokeStyle = nR ? P.gold : DRUG; c.lineWidth = 3.2; c.stroke(); if (nS) A.badge(t.x - (nR ? 16 : 0), t.y - 28, '−' + nS, '#fff', DRUG, 12); if (nR) A.badge(t.x + (nS ? 18 : 0), t.y - 28, tx('留下 ', 'stays ') + nR, P.ink, '#fbe3a6', 11.5); }
    } else if (pl && sel && G.ap > 0) {
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
    const LW = bare ? 2 : 78, SW = 25, RH = 30; let out = `<svg viewBox="0 0 ${LW + SW * 12 + 4} ${rows.length * RH}" role="img" aria-label="${tx('皮膚上的菌群', 'Bacteria on the skin')}" style="width:100%;height:auto;display:block">`;
    rows.forEach(([label, f], k) => {
      const y = k * RH + RH / 2; out += `<text x="0" y="${y + 4}" font-size="11.5" fill="#7d6a86">${label}</text><rect x="${LW - 2}" y="${y - 12}" width="${SW * 12 + 4}" height="24" rx="12" fill="#f6efe7"/>`;
      f.forEach((t, i) => {
        const x = LW + SW * i + SW / 2, diff = k > 0 && rows[k - 1][1][i] !== t;
        if (t === 'C') out += `<circle cx="${x - 3.6}" cy="${y}" r="4.8" fill="#8fc1ea" stroke="#2c5c8c" stroke-width="1.2"/><circle cx="${x + 3.6}" cy="${y}" r="4.8" fill="#8fc1ea" stroke="#2c5c8c" stroke-width="1.2"/>`;
        else { out += `<rect x="${x - 9}" y="${y - 4.6}" width="18" height="9.2" rx="4.6" fill="#3fa77c" stroke="${t === 'R' ? '#e2a02c' : '#1d5f45'}" stroke-width="${t === 'R' ? 2 : 1.3}"/>`; if (t === 'R') for (const bx of [-6, -2.4, 1.2, 4.8]) out += `<rect x="${x + bx}" y="${y - 3.6}" width="1.6" height="7.2" fill="#3a2947"/>`; }
        if (diff) out += `<rect x="${x - 9}" y="${y + 9.5}" width="18" height="2.4" rx="1.2" fill="#c0304f"/>`;
      });
    });
    return out + '</svg>';
  };
  M.floraText = f => { const n = cen(f); return tx(`住戶 ${n.C}・怕藥的伺機菌 ${n.S}・條紋菌 ${n.R}`, `residents ${n.C} · drug-sensitive opportunists ${n.S} · striped ${n.R}`); };
  const legend = () => `<p class="note">${tx('藍色成對的是無害的<b>住戶</b>；綠色是平常無害、闖進傷口才造成感染的<b>伺機菌</b>；有條紋的是不怕這種抗生素的伺機菌。', 'The blue pairs are harmless <b>residents</b>. The green ones are <b>opportunists</b>: harmless on the skin, a cause of infection once inside a wound. The striped ones are opportunists this antibiotic does not work on.')}</p>`;

  /* ---------------- 結算 ---------------- */
  const rec = G => ({ turn: G.turn, hp: Math.round(AX.health(G) * 100), win: !!(G.result && G.result.win), expo: G.expo, n0: G.load0, r0: G.nR0, kill: G.killed, f0: cen(G.flora0).R, f1: cen(G.flora).R });
  M.summary = function (G, st) {
    const r = G.result, hp = Math.round(AX.health(G) * 100), stars = hp >= 80 ? 3 : hp >= 55 ? 2 : 1, a = cen(G.flora0).R, b = cen(G.flora).R, h = IW.save.hist, c = IW.save.ch.abx || {};
    const why = { tissue: tx('組織損傷過重', 'Too much tissue damage'), overrun: tx('感染失控', 'Infection out of control'), timeout: tx('感染仍未受控', 'Infection still not under control') }[r.why];
    let insight;
    if (!G.drug) insight = r.win ? tx('這一場你沒有用抗生素，靠巨噬細胞就清乾淨了。皮膚上的菌群沒有任何變動。', 'You cleared this one with macrophages alone and never used the antibiotic. Nothing changed on the skin.') : tx(`這一場沒有用抗生素。${G.load0} 隻細菌對兩個巨噬細胞來說太多了：需要它的時候，抗生素是救命的工具。`, `The antibiotic was never used this time. ${G.load0} bacteria were too many for two macrophages: when it is needed, an antibiotic is a life-saving tool.`);
    else {
      const few = G.killed < G.load0 * .5;
      insight = tx(`第 ${G.drugAt} 回合開始用藥：抗生素${G.killed ? `殺死 <b>${G.killed}</b> 隻${few ? '，不到一半' : ''}` : '<b>一隻也沒殺死</b>'}。巨噬細胞吞掉 ${G.eaten} 隻（其中條紋 ${G.eatenR} 隻）。`, `The antibiotic started on turn ${G.drugAt} and killed ${G.killed ? `<b>${G.killed}</b>${few ? ', fewer than half' : ''}` : '<b>none at all</b>'}. Macrophages engulfed ${G.eaten} (${G.eatenR} of them striped).`)
        + (r.win ? tx(`用藥 <b>${G.expo}</b> 回合，皮膚上的條紋菌 <b>${a} → ${b}</b>。`, ` <b>${G.expo}</b> turn${G.expo > 1 ? 's' : ''} on the drug; striped bacteria on the skin went <b>${a} → ${b}</b>.`) + (G.expo <= 2 ? tx('藥處理多數，免疫細胞處理漏網的，很快就結束了。', ' The drug handled the many, the immune cells handled the ones that slipped through, and it was over quickly.') : tx('漏網的條紋菌清得越慢，用藥的回合越多，皮膚上被換掉的位子也越多。', ' The slower the striped survivors are cleared, the more turns on the drug, and the more spots on the skin are replaced.'))
          : few ? tx('闖進來的細菌大多數本來就不怕這種藥，所以藥幫不上什麼忙，只能靠巨噬細胞一隻一隻吞。', ' Most of the bacteria that got in were already unaffected by this drug, so it could do little, and the macrophages had to engulf them one by one.')
            : tx('時間軸上的虛線是條紋菌：藥開始之後，它們沒有對手，越長越多。', ' The dashed line on the timeline is the striped bacteria: once the drug started they had no competition and kept growing.'));
    }
    if (G.mut) insight += tx(` 第 ${G.mutAt} 回合有細菌在分裂時抄錯，生出條紋的後代——那時並沒有在用藥。`, ` On turn ${G.mutAt} a bacterium made a copying error as it divided and produced a striped offspring, at a time when no drug was in use.`);
    let extra = G.key === 'p' ? '' : M.floraSvg([[tx('開戰時', 'At the start'), G.flora0], [tx(r.win ? '現在' : '這一場結束時', r.win ? 'Now' : 'At the end of this attempt'), G.flora]]) + (!r.win ? `<p class="note">${tx('這一場沒有守住，重打時皮膚上的細菌會回到開戰時的樣子。', 'This attempt was lost; when you replay it, the skin goes back to how it was at the start.')}</p>` : b > a ? `<p class="note">${tx('畫紅線的位子，原本住著怕藥的細菌，現在是條紋菌。闖進傷口的細菌來自皮膚：這會影響下一次。', 'Spots underlined in red used to hold drug-sensitive bacteria and now hold striped ones. Bacteria that enter a wound come from the skin, so this affects next time.')}</p>` : '');
    if (G.key === 'b2') {
      const rows = [['abx1', tx('第一道傷口', 'First wound')], ['abx2n', tx('第二道傷口（感冒時沒吃）', 'Second wound (no pills for the cold)')], ['abx2p', tx('第二道傷口（感冒時吃了）', 'Second wound (took pills for the cold)')]].filter(x => h[x[0]]);
      if (rows.length > 1) extra += `<table><tr><th>${tx('你的紀錄', 'Your record')}</th><th>${tx('闖入／條紋', 'In / striped')}</th><th>${tx('藥殺死', 'Drug killed')}</th><th>${tx('用藥回合', 'Drug turns')}</th><th>${tx('組織', 'Tissue')}</th></tr>${rows.map(([k, n]) => { const x = h[k]; return `<tr><td>${n}</td><td>${x.n0}／${x.r0}</td><td>${x.kill}</td><td>${x.expo || '—'}</td><td>${x.win ? x.hp + '%' : tx('失守', 'lost')}</td></tr>`; }).join('')}</table>
        <p class="note">${tx('這是你自己打出來的數字。同一種抗生素、同一個身體，差別在於這段時間裡皮膚上的細菌被篩選過幾次。戰場不同、你也更熟練了，所以差別不全來自這裡。', 'These are your own numbers. Same antibiotic, same body: the difference is how many times the bacteria on your skin were selected in between. The battlefields differ and you have had more practice, so not all of the difference comes from that.')}</p>`;
      if (r.win) extra += `<p class="note">${tx('<b>同一個原理，兩個方向。</b>第 2 章的淋巴結裡，病毒的特徵把認得它的 T 細胞挑出來複製，那是對你有利的篩選。這一章，抗生素把不怕它的細菌留下來複製。兩邊都不是誰「學會了」什麼：差異事先就在，被留下來的才變多。', '<b>One principle, two directions.</b> In the lymph node of Chapter 2, a virus’s features picked out the T cell that recognized it, and that cell multiplied: selection working for you. In this chapter the antibiotic left behind the bacteria it does not work on, and they multiplied. Neither side “learned” anything: the differences were there beforehand, and whatever was left behind became common.')}</p>`;
      else if (c.pill || a >= 5) extra += `<p class="note">${tx('這一場很難：皮膚上的條紋菌已經很多，抗生素能幫的有限。可以回到感冒那天重新選擇，或從第一道傷口重來，比較看看。', 'This one is hard: with so many striped bacteria on the skin, the antibiotic can only do so much. You can go back to the day of the cold and choose again, or start over from the first wound, and compare.')}</p>`;
    }
    return { stars, hp, kicker: r.win ? tx(`第 ${G.turn} 回合清除`, `Cleared on turn ${G.turn}`) : tx('防線失守', 'The defense has fallen'), title: r.win ? tx('感染清除', 'Infection cleared') : why,
      stats: [[hp + '%', tx('組織健康', 'Tissue health')], [G.killed, tx('抗生素殺死', 'Killed by the drug')], [G.eaten, tx('巨噬細胞吞噬', 'Engulfed')], [G.expo || '—', tx('用藥回合', 'Turns on the drug')], [a + ' → ' + b, tx('皮膚上條紋菌', 'Striped on skin')]],
      insight, extra, series: [{ key: 'load', name: tx('細菌總數', 'All bacteria'), color: P.bacDk }, { key: 'r', name: tx('條紋菌', 'Striped'), color: '#b77a12' }],
      marks: { drug: [tx('用藥', 'Drug'), DRUG], mut: [tx('突變', 'Mutation'), '#8a5a12'] }, badLabel: tx('用藥中', 'On the drug') };
  };
  M.rules = function (G, st) {
    const c = st && st.kind === 'practice' ? AX.CFG : G.cfg, rows = [
      [tx('行動', 'Actions'), tx(`每回合 ${c.AP} 點。移動（最多 ${c.MOVE} 格）、吞噬、開始用抗生素各 1 點。`, `${c.AP} AP per turn. Moving (up to ${c.MOVE} tiles), engulfing and starting the antibiotic cost 1 AP each.`)],
      [tx('細菌', 'Bacteria'), tx('每回合結束，每個菌落 +1 隻（一格最多 3 隻）。滿 3 隻的菌落會往箭頭方向擴散，並損傷所在組織。子代和親代一樣：條紋的生條紋的。', 'At the end of each turn every colony gains 1 (max 3 per tile). A colony of 3 spreads along its arrow and damages its tile. Offspring match the parent: striped ones produce striped ones.')],
      [tx('突變', 'Mutation'), tx(`怕藥的細菌分裂時，有很小的機會（遊戲裡約 ${Math.round(c.MU * 100)}%）抄錯，生出條紋的子代。突變是偶然的，不是因為用了藥才「對準」出現。`, `When a drug-sensitive bacterium divides there is a small chance (about ${Math.round(c.MU * 100)}% in the game) of a copying error that produces a striped offspring. Mutations happen by chance; a drug cannot call up the one that defeats it.`)],
      [tx('巨噬細胞', 'Macrophage'), tx(`吞噬身邊的細菌，1 點吞 ${c.BITE} 隻，同格先吞條紋的；體內最多 ${c.CAP} 隻，回合結束消化 ${c.DIGEST} 隻。細菌怕不怕藥，對它沒有差別。`, `Engulfs adjacent bacteria, ${c.BITE} per AP, striped first; holds up to ${c.CAP} and digests ${c.DIGEST} at end of turn. Whether a drug works on a bacterium makes no difference to it.`)],
      [tx('抗生素', 'Antibiotic'), tx('殺死組織裡所有怕藥的細菌；條紋菌不受影響。開始後持續到這一場結束，不能中途停（遊戲設定）。', 'Kills every drug-sensitive bacterium in the tissue; striped ones are unaffected. Once started it runs until the battle ends and cannot be stopped midway (a game rule).')],
      [tx('皮膚上', 'On the skin'), tx('用藥的每一回合（包含開始的那一回合），皮膚上緊鄰條紋菌的一個怕藥細菌會死掉，由條紋菌補位。闖進傷口的細菌來自皮膚：條紋菌佔伺機菌的比例越高，下一次闖進來的條紋菌越多。', 'On every turn on the drug (including the turn it starts), one drug-sensitive bacterium next to a striped one on the skin dies and a striped one takes its place. Bacteria that enter a wound come from the skin: the larger the striped share of the opportunists, the more striped bacteria get in next time.')],
      [tx('勝敗', 'Win / lose'), tx(`把組織裡的細菌清光就贏。組織健康歸零、細菌達 ${c.LOAD_MAX} 隻，或 ${c.TURNS} 回合用完就輸。`, `Clear every bacterium from the tissue to win. Lose if tissue health hits zero, bacteria reach ${c.LOAD_MAX}, or ${c.TURNS} turns run out.`)]];
    return `<div class="rules">${rows.map(r => `<b>${r[0]}</b><span>${r[1]}</span>`).join('')}</div>
      <p class="note">${tx('<b>這不是用藥建議。</b>遊戲裡什麼時候按下抗生素由你決定，是為了讓你看見後果。真實世界裡，要不要用、用哪一種、用多久，由醫療人員判斷；請照指示使用，不要自己停藥、加藥，也不要吃別人的或上次剩下的藥。', '<b>This is not advice about taking medicine.</b> In the game you decide when to press the antibiotic so that you can see the consequences. In real life, whether to use one, which one and for how long are decisions for a health professional. Take them as directed; do not stop or extend treatment on your own, and do not use someone else’s or leftover antibiotics.')}</p>`;
  };

  /* ---------------- 章節定義 ---------------- */
  const unlock = () => Object.assign(IW.save.codex, { mac: 1, bac: 1, tissue: 1, abx: 1, resist: 1, flora: 1, select: 1 });
  const menuBtn = () => ({ label: tx('主選單', 'Menu'), sm: 1, fn: () => { location.hash = '#menu'; } });
  const toCold = () => ({ label: tx('回到感冒那天，重新選擇', 'Go back to the day of the cold and choose again'), sm: 1, fn: () => { const c = save(); delete c.pill; delete c.f2; IW.save.flora = c.f1 ? c.f1.slice() : undefined; IW.store(); B.go(4); } });
  const toStart = () => ({ label: tx('從第一道傷口重來', 'Start over from the first wound'), sm: 1, fn: () => { const c = save(); delete c.b1; delete c.f1; delete c.pill; delete c.f2; delete IW.save.flora; IW.store(); B.go(3); } });
  const PC = { MU: 0, TURNS: 5 };
  // 感冒那天：一個選擇。吃了，病毒一個也不會少；皮膚上的細菌卻被篩選了一次
  async function cold(B, G) {
    const c = save(), f1 = c.f1 || M.base();
    const pill = await B.ask(() => ({ html: `<h2>${tx('幾個月後', 'Months later')}</h2><h1>${tx('你感冒了', 'You have a cold')}</h1>
      <p>${tx('喉嚨痛、流鼻水。這是病毒引起的，你的免疫系統已經在處理了：偵察兵把情報送到淋巴結，T 細胞和抗體幾天後就會到。', 'A sore throat and a runny nose. A virus is causing it, and your immune system is already on the case: the scout has taken the intel to the lymph node, and T cells and antibodies will be along in a few days.')}</p>
      <p>${tx('室友遞來半盒抗生素：「我上次看病剩的。吃這個好得比較快。」', 'Your flatmate hands you half a box of antibiotics: “Left over from last time I was ill. You’ll get better faster with these.”')}</p>
      <div class="btns"><button class="pill" id="yes">${tx('吃', 'Take them')}</button><button class="pill" id="no">${tx('不吃', 'Don’t take them')}</button></div>`, on: { yes: () => 1, no: () => 0 } }));
    const f2 = f1.slice(); if (pill) { const rng = IW.rng((IW.save.bodySeed + 77) | 0); for (let k = 0; k < G.cfg.PILLS; k++) AX.floraTick(f2, rng); }
    c.pill = !!pill; c.f2 = f2; IW.save.flora = f2.slice(); IW.store(); IW.sfx(pill ? 'no' : 'ok');
    await B.ask(() => ({ html: `<h2>${tx('一個星期後', 'A week later')}</h2><h1>${pill ? tx('感冒照樣拖了一個星期', 'The cold still took a week') : tx('感冒好了', 'The cold is gone')}</h1>
      <p>${tx('清掉病毒的是你的 T 細胞和抗體。抗生素攻擊的是細菌才有的構造；病毒沒有細胞壁，也沒有自己的生產設備（它借用你的細胞），藥找不到可以下手的地方。', 'It was your T cells and antibodies that cleared the virus. Antibiotics attack structures only bacteria have. A virus has no cell wall and no machinery of its own (it borrows your cells’), so the drug has nothing to act on.')}${pill ? '' : tx('吃了也不會好得比較快。', ' Taking them would not have made you better any sooner.')}</p>
      <p>${pill ? tx(`但藥還是流遍了全身。這幾天，皮膚上有 ${cen(f2).R - cen(f1).R} 個怕藥的細菌死掉，位子被條紋菌補上：`, `But the drug still went everywhere in your body. Over those days, ${cen(f2).R - cen(f1).R} drug-sensitive bacteria on your skin died and striped ones took their places:`) : tx('皮膚上的菌群沒有變：', 'Nothing changed on your skin:')}</p>
      ${M.floraSvg(pill ? [[tx('感冒前', 'Before'), f1], [tx('吃藥後', 'After'), f2]] : [[tx('現在', 'Now'), f2]])}${legend()}
      <div class="btns"><button class="pill pri" id="go">${tx('繼續 ▸', 'Continue ▸')}</button></div>`, on: { go: () => 1 } }));
  }
  IW.chapters = IW.chapters || {};
  IW.chapters.abx = {
    id: 'abx', mode: M, title: ['第 4 章｜漏網之魚：抗生素與抗藥性', 'Chapter 4 | The Ones That Slip Through: Antibiotics and Resistance'], short: ['4｜漏網之魚', '4 | Slip Through'],
    resume: () => { const c = IW.save.ch.abx || {}; return c.b1 ? 4 : (c.prac || 0) >= 3 ? 3 : (c.prac || 0); },
    stages: [
      { kind: 'practice', seed: 11, cfg: Object.assign({}, PC, { TURNS: 3 }), flora: 'CCSCCSCCCSCS', preset: { scabs: [2], units: [['mac', 26]], bac: { 7: 'SSS', 8: 'SSS', 13: 'SS', 14: 'SS' } },
        goal: ['練習 1：細菌太多，守衛一口只能吞一隻', 'Practice 1: too many, and a guard engulfs one at a time'], won: ['抗生素：體外來的幫手', 'Antibiotics: help from outside the body'],
        say: G => tx(`${G.killed ? `一次殺死 ${G.killed} 隻。` : ''}抗生素不是免疫系統的一部分，是從體外來的藥。它攻擊細菌才有的構造（例如細胞壁，或細菌自己的蛋白質工廠），所以能殺細菌，又不太傷到你自己的細胞。很多抗生素原本就是微生物製造的：青黴素來自一種黴菌。`, `${G.killed ? `${G.killed} killed at once. ` : ''}An antibiotic is not part of the immune system; it is a drug from outside the body. It attacks structures that bacteria have (the cell wall, for example, or the bacterium’s own protein factories), which is why it can kill bacteria while doing little harm to your own cells. Many antibiotics were first made by microbes: penicillin comes from a mould.`),
        next: ['但不是每一隻都會死 ▸', 'But not every one dies ▸'], lost: ['點下方的「抗生素」。' + '它會殺死所有怕藥的細菌。', 'Press “Antibiotic” below. It kills every drug-sensitive bacterium.'],
        guide: G => G.ap === 0 ? '' : !G.drug ? tx('10 隻細菌，一個守衛來不及吞。醫師開了抗生素：按下方的「抗生素」。' + (IW.touch ? '第一下先看效果，再點一次才執行。' : '滑鼠移上去可以先看效果。'), 'Ten bacteria are too many for one guard. A doctor has prescribed an antibiotic: press “Antibiotic” below. ' + (IW.touch ? 'The first tap previews it; tap again to do it.' : 'Hover first to preview it.')) : '' },
      { kind: 'practice', seed: 12, cfg: Object.assign({}, PC, { TURNS: 6, DRUG_FROM: 2 }), flora: 'CCSCCSCCCSCS', preset: { scabs: [3], units: [['mac', 25]], bac: { 8: 'SSS', 9: 'SS', 14: 'SS', 16: 'S' }, mutate: { turn: 1, tile: 16 } },
        goal: ['練習 2：抗生素下一回合才送到。留意細菌分裂時發生的事', 'Practice 2: the antibiotic arrives next turn. Watch what happens when the bacteria divide'], won: ['藥沒有改變細菌，只決定誰留下來', 'The drug did not change the bacteria; it decided which ones were left'],
        say: G => tx('那隻條紋菌是第 1 回合分裂時抄錯才出現的，那時你還沒用藥。抗生素沒有製造它，也沒有「教會」它什麼：藥把怕它的都殺掉，不怕的那一隻被留了下來。', 'The striped bacterium appeared from a copying error on turn 1, before you used any drug. The antibiotic did not create it or “teach” it anything: the drug killed everything it works on, and the one it does not work on was left behind.')
          + (G.rMax >= 3 ? tx(`你也看到了：對手消失之後，它一路長到 ${G.rMax} 隻，每一隻都帶著同樣的基因。`, ` And you saw what came next: with its competitors gone it grew to ${G.rMax}, every one of them carrying the same gene.`) : tx('你在它還只有一兩隻的時候就讓巨噬細胞吞掉了。要是放著不管，對手都消失的場地會被它的後代佔滿。', ' You had a macrophage engulf it while there were only one or two. Left alone, its offspring would have filled the space its competitors left empty.')),
        next: ['抗生素還會殺到誰？ ▸', 'What else does the antibiotic kill? ▸'], lostTitle: ['條紋菌佔滿了', 'The striped ones took over'], lost: ['藥殺光了怕它的細菌，剩下那一隻的後代沒有對手，越長越多。這次用藥之後，馬上讓巨噬細胞去吞有條紋的。', 'The drug killed every bacterium it works on, and the offspring of the one that was left had no competition. This time, send the macrophage after the striped ones as soon as the drug is in.'],
        guide: G => { const u = selU(G); if (G.ap === 0) return ''; if (G.turn === 1) return acts ? '' : tx('抗生素下一回合才送到。先讓巨噬細胞靠近細菌，然後按「結束回合」。', 'The antibiotic arrives next turn. Move the macrophage toward the bacteria, then press “End turn”.'); if (!G.drug) return tx('有一隻長出了條紋。現在按「抗生素」，看看誰會留下來。', 'One of them now has stripes. Press “Antibiotic” and see which ones are left.'); if (AX.nR(G) && !u) return tx('只剩條紋菌了。點選巨噬細胞去吞它，別讓它長滿。', 'Only striped ones are left. Select the macrophage and engulf them before they fill the space.'); return ''; } },
      { kind: 'practice', seed: 13, cfg: Object.assign({}, PC, { TURNS: 6 }), flora: 'CCSCRCSCCSCS', preset: { scabs: [1, 4], units: [['mac', 19], ['mac', 22]], bac: { 7: 'SSR', 10: 'SSR', 13: 'SS', 16: 'SS' } },
        goal: ['練習 3：留意最上面那一排，皮膚上的細菌', 'Practice 3: watch the top row, the bacteria on the skin'], won: ['抗生素分不出誰是住戶', 'An antibiotic cannot tell who the residents are'],
        say: G => tx(`這次用藥 ${G.expo} 回合，皮膚上的條紋菌從 ${cen(G.flora0).R} 個變成 ${cen(G.flora).R} 個。皮膚上本來就住著很多細菌，大多數是無害的住戶，它們佔著位子，別的細菌就不容易擴張。抗生素流遍全身，連它們一起殺；空出來的位子，被不怕藥的補上。${G.expo <= 1 ? '你一回合就清乾淨了，損失降到最小。' : '越快把漏網的條紋菌清掉，用藥的回合越少，皮膚上被換掉的位子也越少。'}`, `You were on the drug for ${G.expo} turn${G.expo > 1 ? 's' : ''}, and striped bacteria on the skin went from ${cen(G.flora0).R} to ${cen(G.flora).R}. Many bacteria live on the skin all the time. Most are harmless residents, and because they hold the space, others cannot easily expand. An antibiotic goes everywhere and kills them too; the spots they leave are taken by the ones the drug does not work on. ${G.expo <= 1 ? 'You finished in a single turn, which kept the loss to a minimum.' : 'The sooner the striped survivors are cleared, the fewer turns on the drug and the fewer spots on the skin are replaced.'}`),
        next: ['開始正式戰鬥 ▸', 'Start the real battle ▸'], lost: ['先讓兩個巨噬細胞各自靠近一隻條紋菌並吞掉，再按「抗生素」。', 'Move each macrophage next to a striped bacterium and engulf it, then press “Antibiotic”.'],
        guide: G => { if (G.ap === 0) return ''; if (!acts) return tx('最上面那一排是住在皮膚上的細菌。藍色成對的是無害的住戶；綠色的伺機菌闖進傷口才造成感染；其中一隻有條紋。這次試著讓用藥的回合越少越好。', 'The top row shows the bacteria living on the skin. The blue pairs are harmless residents; the green opportunists cause infection only once they are inside a wound; one of them is striped. This time, try to spend as few turns on the drug as you can.'); if (!G.drug && AX.nR(G) === 0) return tx('條紋菌都吞掉了。現在按「抗生素」。', 'The striped ones are gone. Now press “Antibiotic”.'); return ''; } },
      { kind: 'battle', key: 'b1', cfg: {},
        pre: B => B.ask(() => ({ html: `<h2>${tx('一年後', 'A year later')}</h2><h1>${tx('這次的傷口比較深', 'A deeper wound this time')}</h1>
          <p>${tx('還記得第 1 章嗎？皮膚上本來就住著很多細菌，平常相安無事。這次傷口深，結痂之前已經有一大批闖了進去，數量多到巨噬細胞忙不過來。', 'Remember Chapter 1? Plenty of bacteria live on the skin all the time, usually without any trouble. This wound was deep, and before it scabbed over a large number got in, too many for the macrophages to keep up with.')}</p>
          ${M.floraSvg([[tx('你的皮膚', 'Your skin'), M.base()]])}${legend()}
          <p class="note">${tx('醫師看過之後開了抗生素。在遊戲裡，什麼時候按下去由你決定；真實世界裡，要不要用、用哪一種、用多久，是醫療人員的判斷。', 'A doctor has seen it and prescribed an antibiotic. In the game, you decide when to press it; in real life, whether to use one, which one and for how long are decisions for a health professional.')}</p>
          <div class="btns"><button class="pill pri" id="go">${tx('開始 ▸', 'Begin ▸')}</button></div>`, on: { go: () => 1 } })) },
      { kind: 'battle', key: 'b2', cfg: { START: 12, MIN_R: 1 },
        pre: async (B, G) => {
          const c = save();
          if (c.pill === undefined) { await cold(B, G); if (B.G === G) B.go(4); return; }      // 選完之後，用新的皮膚菌群重新佈置這一場
          await B.ask(() => ({ html: `<h2>${tx('又過了幾個月', 'A few more months on')}</h2><h1>${tx('又一道傷口', 'Another wound')}</h1>
            <p>${tx('闖進傷口的細菌來自你的皮膚。伺機菌裡條紋的佔多少，進來的大約就佔多少。', 'The bacteria that enter a wound come from your skin. Whatever share of the opportunists is striped, about that share of the invaders will be too.')}</p>
            ${M.floraSvg([[tx('一年前', 'A year ago'), M.base()], [tx('現在', 'Now'), G.flora]])}
            <p>${tx(`現在皮膚上的伺機菌，有 <b>${pct(G.flora)}%</b> 不怕這種抗生素（一年前是 ${pct(M.base())}%）。這次闖進來 ${G.load0} 隻，其中 <b>${G.nR0}</b> 隻有條紋。`, `Of the opportunists on your skin now, <b>${pct(G.flora)}%</b> are unaffected by this antibiotic (a year ago it was ${pct(M.base())}%). This time ${G.load0} got in, <b>${G.nR0}</b> of them striped.`)}</p>
            <div class="btns"><button class="pill pri" id="go">${tx('開始 ▸', 'Begin ▸')}</button></div>`, on: { go: () => 1 } }));
        } }],
    onBattleEnd(G, s) {
      const c = save(), h = IW.save.hist; c.plays = (c.plays || 0) + 1; unlock();
      if (G.key === 'b1') { if (G.result.win) { c.b1 = true; c.f1 = G.flora.slice(); delete c.pill; delete c.f2; IW.save.flora = G.flora.slice(); h.abx1 = rec(G); delete h.abx2n; delete h.abx2p; } }
      else { const k = c.pill ? 'abx2p' : 'abx2n'; if (G.result.win || !(h[k] && h[k].win)) h[k] = rec(G); if (G.result.win) { c.done = true; c.stars = Math.max(c.stars || 0, s.stars); IW.save.flora = G.flora.slice(); IW.sfx('card'); } }
      IW.store();
    },
    endButtons(G) {
      const win = G.result.win, retry = { label: tx('再試一次（同一戰場）', 'Try again (same battle)'), pri: !win, sm: win, fn: () => B.go(B.stage, G.seed) }, fresh = { label: tx('換一個戰場', 'New battle'), sm: 1, fn: () => B.go(B.stage) };
      if (G.key === 'b1') return win ? [{ label: tx('繼續：幾個月後 ▸', 'Continue: months later ▸'), pri: 1, fn: () => B.go(4) }, { label: tx('重打這一場', 'Replay this battle'), sm: 1, fn: () => B.go(3) }, menuBtn()] : [retry, fresh, { label: tx('重玩練習', 'Replay practice'), sm: 1, fn: () => B.go(0) }, menuBtn()];
      return win ? [{ label: tx('回主選單看這個身體 ▸', 'Back to the menu to see this body ▸'), pri: 1, fn: () => { location.hash = '#menu'; } }, toCold(), toStart()] : [retry, fresh, toCold(), toStart(), menuBtn()];
    }
  };
})(window.IW);
