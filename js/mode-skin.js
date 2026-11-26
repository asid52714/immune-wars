'use strict';
/* =====================================================================
   第 1 章｜皮膚：傷口、細菌、巨噬細胞、發炎、嗜中性球
   三個練習各帶一個概念（吞噬 → 發炎求援 → 發炎的代價），再接正式戰鬥。
   ===================================================================== */
(function (IW) {
  const { tx, pick, art: A, battle: B, skin: SK } = IW, P = A.P, W = B.W, H = B.H, R = B.R;
  const M = IW.modeSkin = { banner: ['細菌行動中', 'Bacteria are acting'] };
  const selU = G => G.units.find(u => u.id === G.sel);
  const canAct = G => G.phase === 'player' && !G.result && G.ap > 0 && !B.busy;
  const nm = u => u.kind === 'neu' ? tx('嗜中性球', 'Neutrophil') : tx('巨噬細胞', 'Macrophage');
  let tut = { acts: 0, last: '' }, pv = null;

  M.setup = (seed, st) => SK.setup(seed, st.cfg, st.preset);
  M.enter = G => { tut = { acts: 0, last: '' }; pv = null; for (const t of G.tiles) B.syncSprites(t, t.bac, { x: t.x, y: t.y }); };
  M.forecast = SK.forecast;
  M.check = G => (G.sealed && SK.load(G) === 0) ? { win: true } : null;
  M.beat = G => IW.clamp(Math.max(SK.load(G) / G.cfg.LOAD_MAX, 1 - SK.health(G)) * 1.25 - .15, 0, 1);
  M.sample = G => { const s = { turn: G.turn, load: SK.load(G), inf: G.tiles.reduce((n, t) => n + t.inf, 0), bad: !!G._bad }; G._bad = 0; return s; };

  /* ---------------- 操作 ---------------- */
  function rodItems(t, n) { return t.sp.splice(Math.max(0, t.sp.length - n), n).map(s => ({ x: s.x, y: s.y, draw: (x, y, k) => A.rod(x, y, s.rot, k, 'worry', s.ph) })); }
  function doEngulf(G, u, i) {
    const t = G.tiles[i], n = SK.actEngulf(G, u, i); B.gulp(u, rodItems(t, n), tx('吞噬 ×', 'Engulfed ×') + n); tut.acts++; tut.last = 'eat';
    B.hint('engulf', [`吞噬作用：把細菌包進體內分解。巨噬細胞一次最多裝 ${G.cfg.CAP} 隻，回合結束消化 ${G.cfg.DIGEST} 隻。`, `Phagocytosis: the cell wraps bacteria up and breaks them down inside. A macrophage holds up to ${G.cfg.CAP} and digests ${G.cfg.DIGEST} at the end of the turn.`]);
    if (n > 1) B.hint('activated', ['遊戲設定：發炎區裡的吞噬細胞被活化，一口可以吞到容量上限。', 'Game rule: phagocytes in an inflamed area are activated and can engulf up to their capacity in one bite.']);
    B.afterAction();
  }
  function doMove(G, u, i, prev) {
    const path = []; for (let j = i; j !== u.tile; j = prev.get(j)) path.unshift({ x: G.tiles[j].x, y: G.tiles[j].y });
    u.path.push(...path); SK.actMove(G, u, i); IW.sfx('move'); tut.acts++; tut.last = 'move'; B.afterAction();
  }
  M.tap = function (G, i) {
    if (i < 0) { G.sel = -1; return B.hud(); }
    const sel = selU(G), u = SK.unitAt(G, i);
    if (u && u !== sel) { G.sel = u.id; IW.sfx('select'); return B.hud(); }
    if (!sel) { if (G.tiles[i].bac) B.hint('needsel', ['先點選一個免疫細胞，再下達指令。', 'Select an immune cell first, then give the order.'], true); return; }
    if (SK.engulfTargets(G, sel).includes(i)) return doEngulf(G, sel, i);
    if (u === sel) { if (G.tiles[i].bac && sel.stomach >= SK.cap(G, sel)) full(sel); return; }
    const prev = SK.moveTargets(G, sel); if (prev.has(i)) return doMove(G, sel, i, prev);
    IW.sfx('deny');
    if (G.ap < 1) B.hint('ap0', ['行動點數用完了。按「結束回合」，換細菌行動。', 'Out of action points. Press “End turn” to let the bacteria act.'], true);
    else if (G.tiles[i].bac && sel.stomach >= SK.cap(G, sel)) full(sel);
  };
  function full(u) { IW.sfx('deny'); B.hint('full', u.kind === 'neu' ? ['這個嗜中性球吃飽了。它不會消化後再戰，回合結束就功成身退。', 'This neutrophil is full. It does not digest and fight again; it leaves at the end of the turn.'] : ['這個巨噬細胞吃飽了，要等回合結束消化後才能再吞。', 'This macrophage is full; it must digest at the end of the turn before engulfing again.'], true); }
  M.needArm = G => { const u = selU(G); return !!u && u.kind === 'mac' && canAct(G); };
  M.act = function (G, id) {
    const u = selU(G); if (!canAct(G)) return;
    if (!u) { IW.sfx('deny'); return B.hint('needsel', ['先點選一個巨噬細胞，再下達指令。', 'Select a macrophage first, then give the order.'], true); }
    if (u.kind !== 'mac') { IW.sfx('deny'); return B.hint('neuno', ['發炎的指令要由巨噬細胞下達。嗜中性球只負責吞。', 'Inflammation orders come from macrophages. Neutrophils only engulf.'], true); }
    if (id === 'pro') {
      SK.actPromote(G, u); B.mark('pro'); tut.acts++; tut.last = 'pro'; IW.sfx('flare'); B.ring(u.x, u.y, '232,85,46', R * 2.1, .7);
      for (const i of SK.areaOf(G, u.tile)) B.burst(G.tiles[i].x, G.tiles[i].y, 4, '232,85,46', 50, 2);
      B.hint('promote', ['發炎啟動：區內的細菌被圍堵、吞噬更強，也是援軍的路標。但細菌沒清掉，發炎每回合升 1 級，到 3 級就會傷到組織。', 'Inflammation on: bacteria in the area are contained, engulfing is stronger, and reinforcements get a signpost. But while bacteria remain it rises 1 level each turn, and at level 3 it damages tissue.']);
    } else {
      if (!SK.canCalm(G, u)) { IW.sfx('deny'); return B.hint('nocalm', ['這個巨噬細胞周圍沒有發炎可以調節。', 'There is no inflammation around this macrophage to calm.'], true); }
      SK.actCalm(G, u); B.mark('calm'); tut.acts++; tut.last = 'calm'; IW.sfx('calm'); B.ring(u.x, u.y, '60,150,200', R * 2.1, .8);
      B.hint('calm', [`調節發炎：周圍發炎降 ${G.cfg.CALM} 級。降到 0 級的格子，細菌又能擴散了。`, `Calm inflammation: nearby inflammation drops ${G.cfg.CALM} levels. On tiles that fall to level 0, bacteria can spread again.`]);
    }
    B.afterAction();
  };
  // 操作前預覽：在複本上先做一次，用同一套回合結算比較前後
  M.preview = function (G, id) {
    pv = null; const pro = id === 'pro', name = pro ? tx('促進發炎', 'Boost inflammation') : tx('調節發炎', 'Calm inflammation'), u = selU(G);
    if (!G.fc) return null;
    if (!u || u.kind !== 'mac') return tx(`<b>${name}</b>：先點選一個巨噬細胞。作用在它所在與相鄰的格子。`, `<b>${name}</b>: select a macrophage first. It affects that cell’s tile and the adjacent tiles.`);
    if (G.ap < 1) return tx(`<b>${name}</b>：行動點數不足。`, `<b>${name}</b>: not enough action points.`);
    const area = SK.areaOf(G, u.tile), C = SK.clone(G); (pro ? SK.actPromote : SK.actCalm)(C, C.units.find(o => o.id === u.id));
    const f = SK.forecast(C), b = G.fc, T0 = i => G.tiles[i], out = []; pv = { area, lv: {} };
    for (const i of area) pv.lv[i] = [T0(i).inf, C.tiles[i].inf];
    out.push(tx(`<b>${name}</b>：周圍 ${area.length} 格${pro ? '各 +1 級' : `各 −${G.cfg.CALM} 級`}。`, `<b>${name}</b>: ${area.length} tiles ${pro ? '+1 level' : `−${G.cfg.CALM} levels`}.`));
    if (pro) {
      if (!area.some(i => T0(i).bac > 0)) out.push(tx('範圍內沒有細菌。', 'No bacteria in range.'));
      if (b.reinf === 0 && f.reinf > 0) out.push(tx('援軍下回合會來。', 'Reinforcements come next turn.'));
    } else {
      const rel = area.filter(i => T0(i).bac === 3 && T0(i).inf > 0 && C.tiles[i].inf === 0).length;
      if (rel) out.push(`<span class="w">${tx(`${rel} 個滿載菌落會恢復擴散。`, `${rel} full ${rel > 1 ? 'colonies' : 'colony'} will start spreading again.`)}</span>`);
      if (b.reinf > 0 && f.reinf === 0) out.push(`<span class="w">${tx('援軍會失去路標。', 'Reinforcements will lose their signpost.')}</span>`);
    }
    out.push(tx(`回合結束損傷 ${b.dB + b.dI} → <b>${f.dB + f.dI}</b>`, `End-of-turn damage ${b.dB + b.dI} → <b>${f.dB + f.dI}</b>`) + (f.dI > b.dI ? ` <span class="w">${tx('（過度發炎）', '(excessive inflammation)')}</span>` : ''));
    return out.join(' ');
  };
  M.cancel = () => { pv = null; };
  M.info = function (G, i) {
    const t = G.tiles[i], u = SK.unitAt(G, i), sel = selU(G), L = [];
    if (sel && G.phase === 'player' && !(u && u !== sel)) {
      if (SK.engulfTargets(G, sel).includes(i)) { const n = SK.engulfCount(G, sel, i); L.push(tx(`<b>點一下：吞噬 ${n} 隻</b>（1 點）`, `<b>Tap: engulf ${n}</b> (1 AP)`) + (t.inf > 0 && n > 1 ? tx('，發炎區加成', ', inflamed-area bonus') : '')); }
      else if (SK.moveTargets(G, sel).has(i)) L.push(tx('<b>點一下：移動到這裡</b>（1 點）', '<b>Tap: move here</b> (1 AP)'));
    }
    if (u) L.push(u.kind === 'neu' ? tx(`<b>嗜中性球</b>　體內 ${u.stomach}/${G.cfg.CAPN}。壽命短：吃飽或再過 ${Math.max(0, G.cfg.NEU_LIFE - u.age)} 回合就離場。`, `<b>Neutrophil</b>  holding ${u.stomach}/${G.cfg.CAPN}. Short-lived: it leaves when full or after ${Math.max(0, G.cfg.NEU_LIFE - u.age)} more turn(s).`)
      : tx(`<b>巨噬細胞</b>　體內 ${u.stomach}/${G.cfg.CAP}${u.stomach >= G.cfg.CAP ? '（飽了）' : ''}，回合結束消化 ${G.cfg.DIGEST} 隻。`, `<b>Macrophage</b>  holding ${u.stomach}/${G.cfg.CAP}${u.stomach >= G.cfg.CAP ? ' (full)' : ''}; digests ${G.cfg.DIGEST} at end of turn.`));
    if (t.bac) L.push(tx(`<b>細菌 ×${t.bac}</b>　`, `<b>Bacteria ×${t.bac}</b>  `) + (t.bac === 3 ? (t.inf > 0 ? tx('被發炎圍堵，但仍在損傷這格組織。', 'contained by inflammation, but still damaging this tile.') : tx('回合結束會擴散，並損傷這格組織。', 'will spread at end of turn and damage this tile.')) : tx('回合結束會分裂成 ' + (t.bac + 1) + ' 隻。', `will divide to ${t.bac + 1} at end of turn.`)));
    if (t.inf) L.push(tx(`<b>發炎 ${t.inf} 級</b>　`, `<b>Inflammation level ${t.inf}</b>  `) + (t.inf === 3 ? tx('過度：每回合損傷這格與周圍。', 'excessive: damages this tile and its neighbors every turn.') : t.bac > 0 ? tx(`細菌還在，回合結束升到 ${t.inf + 1} 級${t.inf === 2 ? '並開始傷組織' : ''}。`, `bacteria remain, so it rises to ${t.inf + 1} at end of turn${t.inf === 2 ? ' and starts damaging tissue' : ''}.`) : tx('沒有細菌，回合結束消退 1 級。', 'no bacteria, so it drops 1 level at end of turn.')));
    if (t.hp < 3) L.push(tx(['組織已壞死', '組織嚴重受損', '組織受損'], ['Tissue dead', 'Tissue badly damaged', 'Tissue damaged'])[t.hp]);
    if (t.wound) L.push(G.sealed ? tx('已結痂的傷口', 'Scabbed-over wound') : tx('傷口：細菌的入口', 'Wound: where bacteria get in'));
    if (!L.length) L.push(tx('健康的組織細胞', 'Healthy tissue cell'));
    return L.join('<br>');
  };
  M.guide = function (G, st) {
    const sel = selU(G), first = st.kind === 'practice' ? B.stage === 0 : (!(IW.save.ch.skin || {}).done && G.turn <= 3);
    if (G.ap === 0) return tx('行動點數用完了：按「結束回合」，換細菌行動。', 'Out of action points: press “End turn” to let the bacteria act.');
    if (!first) return '';
    if (st.kind !== 'practice') {
      if (!G.nPro && G.cfg.REINF.includes(G.turn + 1)) return tx('下回合援軍可以來，但要有發炎訊號指路。選一個靠近細菌的巨噬細胞，試試「促進發炎」。', 'Reinforcements can come next turn, but they need an inflammation signal. Select a macrophage near the bacteria and try “Boost inflammation”.');
      if (G.turn === 1 && !tut.acts) return tx('正式戰鬥：傷口還開著，每回合都有細菌湧入。綠色箭頭是細菌下一步的方向。', 'The real battle: the wound is still open and bacteria enter every turn. Green arrows show where they will go next.');
      return '';
    }
    if (!sel) return tut.acts ? tx('再點一個免疫細胞繼續，或按「結束回合」。', 'Select an immune cell to keep going, or press “End turn”.') : tx('點選巨噬細胞（奶油色的大細胞）。', 'Select the macrophage (the large cream-colored cell).');
    if (SK.engulfTargets(G, sel).length) return tx('標著「吞」的細菌可以吞噬：點它（1 點）。', 'Bacteria marked “Eat” can be engulfed: tap one (1 AP).');
    if (sel.stomach >= SK.cap(G, sel)) return tx('這個細胞吃飽了。按「結束回合」讓它消化。', 'This cell is full. Press “End turn” so it can digest.');
    return tx(`青綠色外框是可以走到的格子（1 點最多 ${G.cfg.MOVE} 格）。往細菌靠近。`, `Teal outlines show where it can move (1 AP moves up to ${G.cfg.MOVE} tiles). Move toward the bacteria.`);
  };

  /* ---------------- 細菌回合：照規則層回傳的事件播放 ---------------- */
  M.enemy = async function (G, api) {
    const dg = SK.phaseDigest(G);
    for (const e of dg.digest) { const u = G.units.find(u => u.id === e.id); B.burst(u.x, u.y, 5, '120,190,140', 40, 1.8); }
    for (const u of dg.leave) { B.ring(u.x, u.y, '125,106,134', R, .6); B.ftext(u.x, u.y - 30, tx('功成身退', 'Job done'), P.dim); api.hint('neuleave', ['嗜中性球壽命很短，吞完細菌後自己也會死去。傷口的膿，主要就是它們和被分解的細菌。', 'Neutrophils are short-lived and die after engulfing bacteria. Pus in a wound is largely made of them and the remains of bacteria.']); }
    await api.wait(dg.digest.length || dg.leave.length ? 360 : 60); if (!api.alive()) return;
    const g = SK.growList(G), full = SK.fullList(G), sp = SK.phaseSpread(G); let any = false;
    for (const e of sp) {
      const s = G.tiles[e.from];
      if (e.blocked) { B.ring(s.x, s.y, '232,85,46', R * .95, .5); api.hint('blocked', ['遊戲設定：發炎區的細菌無法向外擴散。（真實的發炎是「有助限制」感染，不保證完全擋住。）', 'Game rule: bacteria in an inflamed area cannot spread outward. (Real inflammation helps limit infection; it does not guarantee a complete block.)']); continue; }
      any = true;
      if (e.unit !== undefined) { const u = G.units.find(u => u.id === e.unit); B.gulp(u, [{ x: s.x, y: s.y, draw: (x, y, k) => A.rod(x, y, 0, k, 'worry', 0) }], tx('攔截 ×1', 'Blocked ×1')); api.hint('sentinel', ['守在擴散路線上的吞噬細胞，會直接吞掉闖進來的細菌。', 'A phagocyte standing in the path of the spread engulfs the bacteria that move in.']); }
      else if (!e.fail) { B.syncSprites(G.tiles[e.to], G.tiles[e.to].sp.length + 1, { x: s.x, y: s.y }); B.ring(G.tiles[e.to].x, G.tiles[e.to].y, '63,167,124', R * .8, .6); }
    }
    if (any) { IW.sfx('spread'); api.hint('spread', ['滿 3 隻的菌落會向鄰近組織擴散，並損傷它所在的組織。', 'A colony of 3 spreads to nearby tissue and damages the tissue it sits on.']); }
    B.hud(); await api.wait(sp.length ? 560 : 50); if (!api.alive()) return;
    const gr = SK.phaseGrow(G, g); gr.forEach((i, k) => { B.syncSprites(G.tiles[i], G.tiles[i].bac); if (k < 4) IW.sfx('pop'); });
    if (gr.length) api.hint('divide', ['細菌在條件合適的組織裡，一分為二不斷增殖。', 'Where conditions are right, bacteria keep multiplying by dividing in two.']);
    B.hud(); await api.wait(gr.length ? 500 : 50); if (!api.alive()) return;
    if (G.influxLeft > 0) {
      const iv = SK.phaseInflux(G);
      for (const e of iv.list) {
        const w = G.tiles[e.from], from = { x: w.x, y: 30 };
        if (e.unit !== undefined) B.gulp(G.units.find(u => u.id === e.unit), [{ x: from.x, y: from.y, draw: (x, y, k) => A.rod(x, y, 1.57, k, 'worry', 0) }]);
        else if (e.to >= 0) B.syncSprites(G.tiles[e.to], G.tiles[e.to].bac, from);
      }
      if (iv.sealed) { B.mark('seal'); for (const wi of G.wounds) B.ftext(G.tiles[wi].x, 70, tx('傷口結痂', 'Wound scabbed over'), '#8a5a3c'); IW.sfx('seal'); api.hint('seal', ['血塊封住了傷口，新的細菌進不來了。把剩下的清乾淨！', 'A clot has sealed the wound, so no new bacteria can enter. Clear out the rest!']); }
      B.hud(); await api.wait(460); if (!api.alive()) return;
    }
    const inf = SK.phaseInflame(G); for (const e of inf) if (e.up) { const t = G.tiles[e.i]; B.ring(t.x, t.y, '232,85,46', R * .9, .5); }
    B.hud(); await api.wait(inf.length ? 380 : 40); if (!api.alive()) return;
    const dm = SK.phaseDamage(G, full), acc = {};
    for (const e of dm) { acc[e.i] = (acc[e.i] || 0) + 1; if (e.cause === 'inf') { acc['c' + e.i] = 1; G._bad = 1; } }
    for (const k in acc) { if (k[0] === 'c') continue; const t = G.tiles[k]; t.flash = 1; B.burst(t.x, t.y, 7, acc['c' + k] ? '232,85,46' : '192,48,79', 70, 2.6); B.ftext(t.x, t.y - 18, '−' + acc[k], P.danger); }
    if (dm.length) {
      IW.sfx('hurt');
      if (dm.some(e => e.cause === 'inf')) api.hint('over', ['過度發炎！反應太強，連周圍的正常組織也被波及。用「調節發炎」降溫，或趕快把細菌清掉。', 'Excessive inflammation! The response is too strong and is hitting healthy tissue around it. Cool it with “Calm inflammation”, or clear the bacteria quickly.'], true);
      else api.hint('toxin', ['組織受損：滿載的菌落正在損傷它所在的組織。', 'Tissue damage: a full colony is damaging the tissue it sits on.']);
    }
    for (const t of G.tiles) B.syncSprites(t, t.bac);
    B.hud(); await api.wait(dm.length ? 600 : 100); if (!api.alive()) return;
    SK.advance(G);
  };
  M.newTurn = function (G, api) {
    tut.last = '';
    if (!G.reinfEv) return;
    if (G.reinfEv.ids.length) {
      B.mark('reinf'); IW.sfx('arrive');
      for (const id of G.reinfEv.ids) { const u = G.units.find(u => u.id === id), t = G.tiles[u.tile]; B.placeUnit(u, { x: t.x, y: H + 10 }); B.ftext(t.x, t.y - 46, tx('援軍', 'Reinforcements'), P.hema); }
      B.hint('reinf', ['援軍抵達！嗜中性球循著發炎訊號，從血管鑽進組織。它們來得快、吞得多，但壽命很短。', 'Reinforcements! Neutrophils follow the inflammation signal out of the blood vessel and into the tissue. They arrive fast and engulf a lot, but do not live long.'], true);
    } else { IW.sfx('deny'); B.hint('noreinf', ['沒有發炎訊號，援軍不知道該往哪裡去，這次沒有來。', 'With no inflammation signal, the reinforcements did not know where to go. None came this time.'], true); }
  };

  /* ---------------- HUD ---------------- */
  M.hud = function (G) {
    const c = G.cfg, L = SK.load(G), hp = SK.health(G), I = G.tiles.reduce((n, t) => n + t.inf, 0), over = G.tiles.some(t => t.inf === 3), pl = G.phase === 'player', fl = pl && G.fc ? G.fc.load : L, u = selU(G), f = []; let bad = '';
    if (pl && G.fc) {
      if (!G.sealed) f.push(tx(`傷口開放中：每回合結束湧入 ${c.INFLUX_N} 隻（${G.influxLeft} 回合後結痂）。`, `Wound open: +${c.INFLUX_N} at the end of each turn (scabs over in ${G.influxLeft}).`));
      if (G.fc.reinf !== null) f.push(G.fc.reinf > 0 ? tx(`下回合 ${G.fc.reinf} 個嗜中性球會抵達發炎最強處。`, `Next turn ${G.fc.reinf} neutrophil(s) arrive where inflammation is strongest.`) : `<span class="w">${tx('下回合援軍可以來，但場上沒有發炎訊號。', 'Reinforcements could come next turn, but there is no inflammation signal.')}</span>`);
      const r = G.fc.res; if (r && !r.win) bad = { tissue: tx('組織會損傷殆盡', 'the tissue will be destroyed'), overrun: tx('感染會失控', 'the infection will be out of control'), timeout: tx('這是最後一回合', 'this is the last turn') }[r.why];
      if (bad) f.push(`<span class="w">${tx('就這樣結束回合：', 'If you end the turn now: ')}${bad}。</span>`);
      else if (G.fc.dI > 0) f.push(`<span class="w">${tx(`回合結束時，過度發炎會造成 ${G.fc.dI} 點損傷。`, `At end of turn, excessive inflammation will cause ${G.fc.dI} damage.`)}</span>`);
    }
    return {
      turn: tx(`回合 ${G.turn} / ${c.TURNS}`, `Turn ${G.turn} / ${c.TURNS}`),
      pips: Array.from({ length: c.TURNS }, (_, k) => { const n = k + 1; return { cls: n < G.turn ? 'done' : n === G.turn ? 'now' : '', m: c.REINF.includes(n) ? '+' : (n === c.INFLUX && !G.sealed ? '▾' : ''), title: c.REINF.includes(n) ? tx('援軍可在這回合抵達', 'Reinforcements can arrive this turn') : '' }; }),
      gauges: [
        { label: tx('組織健康', 'Tissue'), val: Math.round(hp * 100) + '%', frac: hp, color: P.teal, warn: hp < .35, title: tx('遊戲化的整體損傷預算，歸零即失敗。', 'A game-style damage budget; zero means defeat.') },
        { label: tx('細菌', 'Bacteria'), val: (fl !== L ? `${L} <small>→ ${fl}</small>` : L) + ` <small>/ ${c.LOAD_MAX}</small>`, frac: L / c.LOAD_MAX, next: fl / c.LOAD_MAX, color: P.bac, warn: fl >= c.LOAD_MAX * .75 },
        { label: tx('發炎', 'Inflammation'), val: over ? tx('過度！', 'Excessive!') : I === 0 ? tx('沒有', 'None') : tx('適度', 'Moderate'), frac: I / 18, color: P.flame, warn: over }],
      goal: f.join(' '),
      acts: [{ id: 'pro', label: tx('促進發炎', 'Boost'), sub: tx('1 點', 'inflammation'), color: P.flame, disabled: !(G.ap > 0) },
        { id: 'calm', label: tx('調節發炎', 'Calm'), sub: tx('1 點', 'inflammation'), color: '#5bb5e0', disabled: !(G.ap > 0 && (!u || u.kind !== 'mac' || SK.canCalm(G, u))) }],
      endDanger: !!bad
    };
  };

  /* ---------------- 畫面 ---------------- */
  M.drawBack = function (G, T) {
    const c = B.ctxOf();
    c.fillStyle = '#fdf3f1'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#f6efe7'; c.fillRect(0, 0, W, 34);                                       // 體外
    for (let i = 0; i < 5; i++) A.rod(40 + i * 98 + Math.sin(T * .5 + i) * 6, 15 + Math.sin(T * 1.3 + i * 2) * 3, Math.sin(T * .7 + i) * .3, .8, 'calm', T * 5 + i, .75);   // 皮膚外的細菌：中性表情，不是所有細菌都有害
    const gaps = G.wounds.map(i => [G.tiles[i].x - B.HW / 2 - 2, G.tiles[i].x + B.HW / 2 + 2]), inGap = x => gaps.some(g => x > g[0] && x < g[1]);
    for (let row = 0; row < 2; row++) for (let x = -24 + (row ? 21 : 0); x < W + 20; x += 42) {
      const cx = x + 20; if (inGap(cx)) continue; const edge = inGap(cx - 30) || inGap(cx + 30);
      c.fillStyle = edge ? '#d9a08c' : row ? P.skin : P.keratin; c.strokeStyle = P.skinDk; c.lineWidth = 1.2; c.beginPath(); c.roundRect(x, 30 + row * 14, 40, 12, 6); c.fill(); c.stroke();
    }
    for (const g of gaps) {
      if (G.sealed) { c.fillStyle = '#9a5a44'; c.strokeStyle = '#5e3324'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(g[0] + 3, 28, g[1] - g[0] - 6, 30, 7); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(g[0] + 12, 36); c.lineTo(g[1] - 14, 50); c.moveTo(g[1] - 12, 36); c.lineTo(g[0] + 14, 50); c.stroke(); }
      else { c.fillStyle = 'rgba(192,48,79,.22)'; c.fillRect(g[0], 26, g[1] - g[0], 34); }
    }
    c.font = A.font(11.5); c.textAlign = 'left'; c.fillStyle = P.dim; c.fillText(tx('皮膚外面', 'Outside the skin'), 6, 12);
    vessel(c, T, tx('血管：援軍從這裡來', 'Blood vessel: reinforcements come from here'));
  };
  function vessel(c, T, label) {
    const g = c.createLinearGradient(0, 566, 0, H); g.addColorStop(0, '#f6c3c3'); g.addColorStop(1, '#eba5a8'); c.fillStyle = g; c.fillRect(0, 568, W, H - 568);
    c.strokeStyle = P.bloodDk; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 568); c.lineTo(W, 568); c.stroke();
    for (let i = 0; i < 7; i++) { const x = ((T * 26 + i * 74) % (W + 40)) - 20; A.rbc(x, 584 + (i % 3) * 8, .95, i); }
    c.font = A.font(11.5, 600); c.textAlign = 'right'; c.lineWidth = 3; c.strokeStyle = 'rgba(253,240,240,.9)'; c.strokeText(label, W - 8, 604); c.fillStyle = '#8c3a44'; c.fillText(label, W - 8, 604);
  }
  M.vessel = vessel;
  M.drawTile = function (G, t, T) {
    A.cell(t.x, t.y, { hp: t.hp, seed: t.seed, t: T, flash: t.flash });
    A.inflame(t.x, t.y, t.inf, T);
    for (const s of t.sp) A.rod(s.x, s.y, s.rot + Math.sin(s.ph * .5) * .2, .92 * s.s, 'evil', s.ph);
  };
  M.drawOver = function (G, T) {
    const c = B.ctxOf(), pl = G.phase === 'player', sel = selU(G), fc = G.fc;
    if (pl && fc) {
      for (const t of G.tiles) {                                                            // 預告：擴散方向、湧入、將受損的組織
        if (t.bac === 3 && t.inf === 0 && t.spreadTo >= 0) { const to = G.tiles[t.spreadTo]; A.arrow(t.x, t.y, to.x, to.y, P.bacDk, T); }
        if (fc.dmg[t.i]) A.badge(t.x + 22, t.y - 26, '−' + fc.dmg[t.i], '#fff', fc.infT[t.i] ? P.flame : P.danger, 11.5);
      }
      if (G.influxLeft > 0) { const w = G.tiles[G.wounds[(G.cfg.INFLUX - G.influxLeft) % G.wounds.length]]; A.badge(w.x, 44 + Math.sin(T * 4) * 2, '▼ +' + G.cfg.INFLUX_N, '#fff', P.danger, 11.5); }
    }
    if (pl && sel && G.ap > 0 && !B.preview) {
      for (const [j] of SK.moveTargets(G, sel)) { const t = G.tiles[j]; if (t.bac && SK.engulfTargets(G, sel).includes(j)) continue; A.softHex(t.x, t.y, 33); c.strokeStyle = `rgba(31,157,143,${.55 + .25 * Math.sin(T * 4)})`; c.lineWidth = 2.6; c.setLineDash([7, 6]); c.stroke(); c.setLineDash([]); }
      for (const i of SK.engulfTargets(G, sel)) { const t = G.tiles[i], n = SK.engulfCount(G, sel, i); A.softHex(t.x, t.y, 35); c.strokeStyle = P.teal; c.lineWidth = 3.4; c.stroke(); A.badge(t.x, t.y + 30, tx('吞', 'Eat') + (n > 1 ? ' ×' + n : ''), '#fff', P.teal, 12.5); }
    }
    if (pl && B.preview && pv) {                                                            // 促進／調節發炎的範圍與等級變化
      for (const i of pv.area) { const t = G.tiles[i], lv = pv.lv[i]; A.softHex(t.x, t.y, 36.5); c.strokeStyle = B.preview === 'pro' ? P.flame : '#3c96c8'; c.lineWidth = 3.4; c.stroke(); if (lv[0] !== lv[1]) A.badge(t.x, t.y - 28, lv[0] + '→' + lv[1], '#fff', lv[1] === 3 ? P.danger : B.preview === 'pro' ? P.flame : '#3c96c8', 12); }
    }
  };
  M.drawUnit = function (G, u, T) {
    const c = B.ctxOf(), cap = SK.cap(G, u), sel = G.sel === u.id, s = 1 - u.born * .35, fl = u.stomach >= cap;
    if (sel) { c.strokeStyle = P.teal; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -T * 20; c.beginPath(); c.arc(u.x, u.y, 34, 0, 6.283); c.stroke(); c.setLineDash([]); }
    (u.kind === 'neu' ? A.neu : A.mac)(u.x, u.y, s, { ph: u.ph, seed: u.id, stomach: u.stomach, gulp: u.gulp, full: fl, mood: u.gulp > 0 ? 'eat' : fl ? 'sleep' : undefined });
    if (G.phase !== 'over') A.badge(u.x, u.y - (u.kind === 'neu' ? 30 : 36), (fl ? tx('飽 ', 'Full ') : '') + u.stomach + '/' + cap, fl ? '#fff' : P.ink, fl ? P.flame : '#fff', 11.5);
  };

  /* ---------------- 結算 ---------------- */
  M.summary = function (G) {
    const r = G.result, hp = Math.round(SK.health(G) * 100), st = hp >= 75 ? 3 : hp >= 50 ? 2 : 1;
    const why = { tissue: tx('組織損傷過重', 'Too much tissue damage'), overrun: tx('感染失控', 'Infection out of control'), timeout: tx('感染仍未受控', 'Infection still not under control') }[r.why];
    const insight = G.dmgInf >= 6 ? tx(`這一局有 ${G.dmgInf} 點組織損傷來自<b>過度發炎</b>，比細菌造成的 ${G.dmgBac} 點${G.dmgInf > G.dmgBac ? '還多' : '少一些'}。時間軸上的紅色區塊就是發炎傷到組織的回合：在那之前清掉細菌，或用「調節發炎」降溫。`, `${G.dmgInf} points of tissue damage this time came from <b>excessive inflammation</b>, ${G.dmgInf > G.dmgBac ? 'more' : 'a little less'} than the ${G.dmgBac} caused by bacteria. The red blocks on the timeline are the turns where inflammation hurt the tissue: clear the bacteria before then, or cool it with “Calm inflammation”.`)
      : !G.nPro ? tx('這一局沒有啟動發炎：細菌可以自由擴散，援軍也沒有訊號可循。發炎是幫手，只是有代價。', 'Inflammation was never switched on this time: bacteria spread freely and reinforcements had no signal to follow. Inflammation is a helper; it just has a cost.')
        : G.reinfMiss ? tx(`有 ${G.reinfMiss} 次援軍因為場上沒有發炎訊號而沒來。`, `${G.reinfMiss} time(s), reinforcements did not come because there was no inflammation signal on the field.`)
          : tx(`發炎拿捏得剛好：它幫你圍堵細菌、叫來援軍，過度發炎造成的損傷只有 ${G.dmgInf} 點。`, `You kept inflammation in balance: it contained the bacteria and brought reinforcements, with only ${G.dmgInf} point(s) of damage from excess.`);
    return { stars: st, hp, kicker: r.win ? tx(`第 ${G.turn} 回合守住`, `Held on turn ${G.turn}`) : tx('防線失守', 'The defense has fallen'), title: r.win ? tx('感染受到控制', 'Infection under control') : why,
      stats: [[hp + '%', tx('組織健康', 'Tissue health')], [G.eaten, tx('吞噬細菌', 'Bacteria engulfed')], [G.dmgBac, tx('細菌造成損傷', 'Damage from bacteria')], [G.dmgInf, tx('過度發炎損傷', 'Damage from inflammation')]],
      insight, series: [{ key: 'load', name: tx('細菌數量', 'Bacteria'), color: P.bacDk }, { key: 'inf', name: tx('發炎程度', 'Inflammation'), color: P.flame }],
      marks: { pro: [tx('發炎', 'Boost'), P.flame], calm: [tx('調節', 'Calm'), '#2f84b5'], reinf: [tx('援軍', 'Help'), P.hema], seal: [tx('結痂', 'Scab'), '#8a5a3c'] }, badLabel: tx('發炎傷到組織', 'Inflammation hurt tissue') };
  };
  M.rules = function (G) {
    const c = G.cfg, rows = [
      [tx('行動', 'Actions'), tx(`每回合 ${c.AP} 點，所有細胞共用。移動（最多 ${c.MOVE} 格）、吞噬、促進或調節發炎各 1 點。`, `${c.AP} AP per turn, shared by all cells. Moving (up to ${c.MOVE} tiles), engulfing, boosting or calming inflammation cost 1 AP each.`)],
      [tx('細菌', 'Bacteria'), tx('每回合結束，每個菌落 +1 隻（一格最多 3 隻）。滿 3 隻的菌落會往箭頭方向擴散，並損傷所在組織。', 'At the end of each turn every colony gains 1 (max 3 per tile). A colony of 3 spreads along its arrow and damages its tile.')],
      [tx('巨噬細胞', 'Macrophage'), tx(`吞噬身邊的細菌，1 點吞 1 隻；體內最多 ${c.CAP} 隻，回合結束消化 ${c.DIGEST} 隻。`, `Engulfs adjacent bacteria, 1 per AP; holds up to ${c.CAP} and digests ${c.DIGEST} at end of turn.`)],
      [tx('發炎', 'Inflammation'), tx('1 級以上：細菌無法擴散，吞噬時一口吞到容量上限。還有細菌的發炎格每回合 +1 級，沒有細菌 −1 級。3 級會損傷該格與相鄰格。', 'Level 1+: bacteria cannot spread, and one bite fills the cell to capacity. An inflamed tile with bacteria rises 1 per turn; without bacteria it drops 1. Level 3 damages that tile and its neighbors.')],
      [tx('嗜中性球', 'Neutrophils'), tx(`第 ${c.REINF.join('、')} 回合開始時，${c.NEU_N} 個援軍落在發炎最強的地方；沒有發炎就不會來。容量 ${c.CAPN}，不消化，吃飽或過 ${c.NEU_LIFE} 回合就離場。`, `At the start of turns ${c.REINF.join(' and ')}, ${c.NEU_N} arrive where inflammation is strongest; no inflammation, no reinforcements. Capacity ${c.CAPN}, no digestion; they leave when full or after ${c.NEU_LIFE} turns.`)],
      [tx('勝利', 'Win'), tx(`傷口結痂後，回合結束時細菌剩 ${c.SAFE} 隻以下。`, `After the wound scabs over, end a turn with ${c.SAFE} or fewer bacteria.`)],
      [tx('失敗', 'Lose'), tx(`組織健康歸零、細菌達 ${c.LOAD_MAX} 隻，或 ${c.TURNS} 回合用完。`, `Tissue health hits zero, bacteria reach ${c.LOAD_MAX}, or ${c.TURNS} turns run out.`)]];
    return `<div class="rules">${rows.map(r => `<b>${r[0]}</b><span>${r[1]}</span>`).join('')}</div>`;
  };

  /* ---------------- 章節定義 ---------------- */
  const PC = { TURNS: 4, INFLUX: 0, SAFE: 0, REINF: [] };
  IW.chapters = IW.chapters || {};
  IW.chapters.skin = {
    id: 'skin', mode: M, title: ['第 1 章｜皮膚防線', 'Chapter 1 | The Skin Barrier'], short: ['1｜皮膚防線', '1 | Skin Barrier'],
    stages: [
      { kind: 'practice', seed: 1, cfg: PC, hide: { pro: 1, calm: 1 }, preset: { wounds: [2], sealed: true, units: [['mac', 20]], bac: { 14: 1, 15: 1, 9: 1 } },
        goal: ['練習 1：讓巨噬細胞吞掉 3 隻細菌', 'Practice 1: have the macrophage engulf all 3 bacteria'], won: ['吞噬作用', 'Phagocytosis'],
        say: ['皮膚破了，細菌溜進來。平常就住在組織裡的「巨噬細胞」把它們包進體內分解。它一次最多裝 3 隻，每回合結束消化 2 隻。', 'The skin broke and bacteria slipped in. Macrophages, which already live in the tissue, wrap them up and break them down. One holds up to 3 at a time and digests 2 at the end of each turn.'],
        next: ['細菌變多了 ▸', 'Now there are more ▸'], lost: ['細菌分裂得比吞噬快。先點巨噬細胞，再點標著「吞」的細菌。', 'The bacteria divided faster than they were engulfed. Select the macrophage, then tap bacteria marked “Eat”.'] },
      { kind: 'practice', seed: 1, cfg: Object.assign({}, PC, { REINF: [2, 3] }), hide: { calm: 1 }, preset: { wounds: [2], sealed: true, units: [['mac', 20]], bac: { 14: 3, 15: 3, 21: 1 } },
        goal: ['練習 2：細菌太多，一個守衛吃不完', 'Practice 2: too many for one guard'], won: ['發炎是求援訊號', 'Inflammation is a call for help'],
        say: ['紅、腫、熱、痛的「發炎」，是身體啟動的防禦反應。它讓吞噬細胞一口吞下整個菌落，也讓血液裡的「嗜中性球」循著訊號趕來。', 'Inflammation (redness, swelling, heat and pain) is a defensive response the body switches on. It lets phagocytes engulf a whole colony in one bite, and guides neutrophils in from the blood.'],
        next: ['但發炎有代價 ▸', 'But inflammation has a cost ▸'], lostTitle: ['一個守衛吃不完', 'One guard is not enough'], lost: ['這次先點巨噬細胞，按「促進發炎」，再吞細菌。看看下一回合誰會來。', 'This time select the macrophage, press “Boost inflammation”, then engulf. See who shows up next turn.'],
        guide: G => { const u = selU(G); if (G.ap === 0) return ''; if (!u) return tx('點選巨噬細胞。', 'Select the macrophage.'); if (!G.nPro && G.turn === 1) return tx('細菌聚在一起：按「促進發炎」。' + (IW.touch ? '第一下先看範圍，再點一次才執行。' : '滑鼠移上去可以先看範圍。'), 'The bacteria are clustered: press “Boost inflammation”. ' + (IW.touch ? 'The first tap previews the area; tap again to do it.' : 'Hover first to preview the area.')); return ''; } },
      { kind: 'practice', seed: 1, cfg: Object.assign({}, PC, { TURNS: 5 }), preset: { wounds: [2], sealed: true, units: [['mac', 20], ['mac', 28]], bac: { 14: 1, 15: 1, 10: 2, 11: 2 }, inf: { 14: 2, 15: 2, 10: 2, 11: 2 } },
        goal: ['練習 3：這些格子已經發炎 2 級，別讓它升到 3 級', 'Practice 3: these tiles are at level 2. Do not let them reach level 3'], won: ['發炎太強會傷到自己', 'Too much inflammation hurts your own tissue'],
        say: G => G.dmgInf > 0 ? tx(`這次有 ${G.dmgInf} 點組織損傷來自過度發炎。發炎到 3 級，連周圍的正常組織都受損。細菌清掉它會自己消退，也可以用「調節發炎」先降溫。`, `${G.dmgInf} points of tissue damage came from excessive inflammation this time. At level 3 it damages the healthy tissue around it. It fades once the bacteria are gone, and “Calm inflammation” cools it down sooner.`)
          : tx('你在發炎升到 3 級之前就處理掉了，沒有組織因為過度發炎受損。同一個反應，適度時幫忙防禦，過強或拖太久就傷到自己。', 'You dealt with it before any tile reached level 3, so no tissue was lost to excess. The same response helps when moderate and harms when too strong or too long.'),
        next: ['開始正式戰鬥 ▸', 'Start the real battle ▸'], lost: ['清不完的發炎區，先用「調節發炎」降溫。', 'Where you cannot clear the bacteria in time, cool the area first with “Calm inflammation”.'],
        guide: G => { if (G.ap === 0 || !G.fc) return ''; if (G.fc.dI > 0) return tx(`紅色標記是回合結束會受損的組織：照現在這樣，過度發炎會造成 ${G.fc.dI} 點損傷。吞掉細菌，或走過去用「調節發炎」。`, `Red marks show tissue that will be damaged at end of turn: as things stand, excess inflammation will cause ${G.fc.dI} damage. Engulf the bacteria, or walk over and use “Calm inflammation”.`); return tx('現在沒有格子會升到 3 級了。把剩下的細菌清掉。', 'No tile will reach level 3 now. Clear the remaining bacteria.'); } },
      { kind: 'battle', cfg: {} }],
    onBattleEnd(G, s) { const c = IW.save.ch.skin = IW.save.ch.skin || {}; c.plays = (c.plays || 0) + 1; if (G.result.win) { c.done = true; c.stars = Math.max(c.stars || 0, s.stars); c.hp = Math.max(c.hp || 0, s.hp); } Object.assign(IW.save.codex, { mac: 1, bac: 1, tissue: 1, inflam: 1, neu: 1 }); IW.store(); },
    endButtons(G, s) {
      return G.result.win ? [{ label: tx('第 2 章：病毒來了 ▸', 'Chapter 2: A virus arrives ▸'), pri: 1, fn: () => { location.hash = '#airway'; } }, { label: tx('再玩一局', 'New battle'), sm: 1, fn: () => B.go(B.stage) }, { label: tx('重試同一戰場', 'Retry this battle'), sm: 1, fn: () => B.go(B.stage, G.seed) }, { label: tx('主選單', 'Menu'), sm: 1, fn: () => { location.hash = '#menu'; } }]
        : [{ label: tx('再試一次（同一戰場）', 'Try again (same battle)'), pri: 1, fn: () => B.go(B.stage, G.seed) }, { label: tx('換一個戰場', 'New battle'), sm: 1, fn: () => B.go(B.stage) }, { label: tx('重玩練習', 'Replay practice'), sm: 1, fn: () => B.go(0) }, { label: tx('主選單', 'Menu'), sm: 1, fn: () => { location.hash = '#menu'; } }];
    }
  };
})(window.IW);
