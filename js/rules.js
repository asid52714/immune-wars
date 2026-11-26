'use strict';
/* =====================================================================
   規則層：純邏輯，不碰畫面、不碰 DOM。模擬與平衡測試直接呼叫這一層。
   戰場是直向的六角格（6 欄 × 8 列）：第 0 列貼著體表（皮膚／氣道），最後一列貼著血管。
   數值是娛樂性的抽象模型，不是真實生理數值。
   ===================================================================== */
(function (IW) {
  const COLS = 6, ROWS = 8;
  IW.GRID = { COLS, ROWS, N: COLS * ROWS };
  function buildTiles(extra) {
    const ts = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ts.push(Object.assign({ i: r * COLS + c, c, r, nb: [] }, extra()));
    for (const t of ts) {
      const d = t.r & 1 ? [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]] : [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
      for (const [dc, dr] of d) { const c = t.c + dc, r = t.r + dr; if (c >= 0 && c < COLS && r >= 0 && r < ROWS) t.nb.push(r * COLS + c); }
    }
    return ts;
  }
  function hexDist(a, b) {
    const ax = a.c - (a.r - (a.r & 1)) / 2, bx = b.c - (b.r - (b.r & 1)) / 2, dx = ax - bx, dz = a.r - b.r;
    return Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dx + dz));
  }
  IW.hexDist = hexDist;
  const unitAt = (S, i) => S.units.find(u => u.tile === i);
  const areaOf = (S, i) => [i, ...S.tiles[i].nb];
  function moveTargets(S, u) {                               // 1 點行動最多走 MOVE 格
    const prev = new Map(); if (S.ap < 1) return prev;
    const occ = new Set(S.units.filter(o => o !== u).map(o => o.tile));
    let fr = [u.tile]; const seen = new Set(fr);
    for (let d = 0; d < S.cfg.MOVE; d++) {
      const nx = [];
      for (const i of fr) for (const j of S.tiles[i].nb) if (!seen.has(j) && !occ.has(j)) { seen.add(j); prev.set(j, i); nx.push(j); }
      fr = nx;
    }
    return prev;
  }
  const cloneBase = S => Object.assign({}, S, { tiles: S.tiles.map(t => Object.assign({}, t)), units: S.units.map(u => Object.assign({}, u)), rng: () => .5, result: null, log: null });

  /* =====================================================================
     第 1 章｜皮膚：細菌、巨噬細胞、發炎、嗜中性球
     ===================================================================== */
  const SK = IW.skin = { unitAt, areaOf, moveTargets };
  SK.CFG = { AP: 5, TURNS: 12, CAP: 3, DIGEST: 2, MOVE: 2, CALM: 2, INFLUX: 5, INFLUX_N: 1, WOUND_BAC: 3, EXTRA: [2, 3], EXTRA2: .5,
    LOAD_MAX: 26, SAFE: 2, BUDGET: 30, MACS: 2, REINF: [3, 6], NEU_N: 2, CAPN: 3, NEU_LIFE: 3 };
  SK.load = S => S.tiles.reduce((n, t) => n + t.bac, 0);
  SK.health = S => Math.max(0, 1 - S.dmg / S.cfg.BUDGET);
  SK.cap = (S, u) => u.kind === 'neu' ? S.cfg.CAPN : S.cfg.CAP;
  const mkUnit = (S, kind, tile) => ({ id: S.nextId++, kind, tile, stomach: 0, age: 0 });
  // preset（練習關卡用）：{units:[[kind,tile]], bac:{tile:n}, inf:{tile:lv}, wounds:[tile], sealed:true}
  SK.setup = function (seed, cfg, preset) {
    cfg = Object.assign({}, SK.CFG, cfg || {});
    const rng = IW.rng(seed), tiles = buildTiles(() => ({ hp: 3, bac: 0, inf: 0, wound: false, spreadTo: -1 }));
    const S = { mode: 'skin', seed, cfg, rng, tiles, units: [], turn: 1, ap: cfg.AP, sel: -1, phase: 'player', wounds: [], influxLeft: cfg.INFLUX, sealed: false,
      dmg: 0, dmgBac: 0, dmgInf: 0, eaten: 0, nPro: 0, nCalm: 0, reinfMiss: 0, nextId: 1, result: null, reinfEv: null };
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    if (preset) {
      S.wounds = (preset.wounds || []).slice(); for (const i of S.wounds) tiles[i].wound = true;
      S.sealed = !!preset.sealed; if (S.sealed) S.influxLeft = 0;
      for (const i in preset.bac || {}) tiles[i].bac = preset.bac[i];
      for (const i in preset.inf || {}) tiles[i].inf = preset.inf[i];
      for (const [k, t] of preset.units) S.units.push(mkUnit(S, k, t));
    } else {
      if (rng() < .5) { const c = ri(1, COLS - 3); S.wounds = [c, c + 1]; } else S.wounds = [ri(0, 1), ri(COLS - 2, COLS - 1)];   // 一道寬傷口，或左右兩處小傷口
      for (const i of S.wounds) { tiles[i].wound = true; tiles[i].bac = cfg.WOUND_BAC; }
      const near = IW.shuffle(tiles.filter(t => !t.wound && S.wounds.some(w => hexDist(t, tiles[w]) <= 2)).map(t => t.i), rng);
      const extra = ri(cfg.EXTRA[0], cfg.EXTRA[1]); for (let k = 0; k < extra; k++) tiles[near[k]].bac = rng() < cfg.EXTRA2 ? 2 : 1;
      const infected = tiles.filter(t => t.bac > 0);                     // 組織常駐的巨噬細胞：離感染區有一段距離
      let cand = tiles.filter(t => t.r >= 2 && t.r <= 5 && infected.every(b => hexDist(t, b) >= 2));
      for (let k = 0; k < cfg.MACS; k++) {
        const pool = cand.length ? cand : tiles.filter(t => t.bac === 0 && !unitAt(S, t.i));
        const a = pool[Math.floor(rng() * pool.length)]; S.units.push(mkUnit(S, 'mac', a.i));
        cand = cand.filter(t => hexDist(t, a) >= 3);
      }
    }
    SK.plan(S); return S;
  };
  // 每回合開始先決定「滿載菌落下回合往哪擴散」，顯示給玩家
  SK.plan = function (S) {
    for (const t of S.tiles) {
      t.spreadTo = -1; if (!t.bac) continue;
      const c = t.nb.filter(j => S.tiles[j].bac < 3); if (!c.length) continue;
      const w = c.map(j => { const n = S.tiles[j]; return (n.bac === 0 ? 3 : 1) * (n.hp > 0 ? 2 : 1); });
      let x = S.rng() * w.reduce((p, q) => p + q, 0);
      for (let k = 0; k < c.length; k++) { x -= w[k]; if (x <= 0) { t.spreadTo = c[k]; break; } }
      if (t.spreadTo < 0) t.spreadTo = c[c.length - 1];
    }
  };
  SK.engulfTargets = (S, u) => (S.ap < 1 || u.stomach >= SK.cap(S, u)) ? [] : areaOf(S, u.tile).filter(i => S.tiles[i].bac > 0);
  SK.engulfCount = (S, u, i) => { const t = S.tiles[i]; return t.inf > 0 ? Math.min(t.bac, SK.cap(S, u) - u.stomach) : 1; };   // 發炎區：一口吞到容量上限
  SK.actMove = (S, u, i) => { u.tile = i; S.ap--; };
  SK.actEngulf = (S, u, i) => { const t = S.tiles[i], n = SK.engulfCount(S, u, i); t.bac -= n; u.stomach += n; S.eaten += n; S.ap--; return n; };
  SK.actPromote = (S, u) => { for (const i of areaOf(S, u.tile)) { const t = S.tiles[i]; t.inf = Math.min(3, t.inf + 1); } S.ap--; S.nPro++; };
  SK.actCalm = (S, u) => { for (const i of areaOf(S, u.tile)) { const t = S.tiles[i]; t.inf = Math.max(0, t.inf - S.cfg.CALM); } S.ap--; S.nCalm++; };
  SK.canCalm = (S, u) => areaOf(S, u.tile).some(i => S.tiles[i].inf > 0);
  // ---- 細菌階段：每個函式改動狀態並回傳事件，畫面層照事件播放 ----
  SK.phaseDigest = function (S) {
    const ev = { digest: [], leave: [] };
    for (const u of S.units.slice()) {
      if (u.kind === 'neu') {                                 // 嗜中性球壽命短：吃飽或時間到就功成身退，不會消化後再戰
        u.age++; if (u.stomach >= S.cfg.CAPN || u.age > S.cfg.NEU_LIFE) { S.units.splice(S.units.indexOf(u), 1); ev.leave.push(u); }
      } else if (u.stomach > 0) { const n = Math.min(S.cfg.DIGEST, u.stomach); u.stomach -= n; ev.digest.push({ id: u.id, n }); }
    }
    return ev;
  };
  SK.fullList = S => S.tiles.filter(t => t.bac === 3).map(t => t.i);
  SK.growList = S => S.tiles.filter(t => t.bac > 0 && t.bac < 3).map(t => t.i);
  SK.phaseSpread = function (S) {
    const ev = [];
    for (const t of S.tiles.filter(t => t.bac === 3)) {
      if (t.inf > 0) { ev.push({ from: t.i, blocked: true }); continue; }                  // 發炎圍堵（遊戲設定）
      if (t.spreadTo < 0) continue;
      const to = S.tiles[t.spreadTo], u = unitAt(S, to.i);
      if (u && u.stomach < SK.cap(S, u)) { u.stomach++; S.eaten++; ev.push({ from: t.i, to: to.i, unit: u.id }); }   // 守在路上的吞噬細胞直接吞掉
      else if (to.bac < 3) ev.push({ from: t.i, to: to.i });
    }
    for (const e of ev) if (e.to !== undefined && e.unit === undefined) { const to = S.tiles[e.to]; if (to.bac < 3) to.bac++; else e.fail = true; }
    return ev;
  };
  SK.phaseGrow = (S, list) => { const ev = []; for (const i of list) { const t = S.tiles[i]; if (t.bac < 3) { t.bac++; ev.push(i); } } return ev; };
  SK.phaseInflux = function (S) {
    const ev = { list: [] };
    for (let k = 0; k < S.cfg.INFLUX_N; k++) {
      const w = S.tiles[S.wounds[(S.cfg.INFLUX - S.influxLeft + k) % S.wounds.length]], u = unitAt(S, w.i), e = { from: w.i, to: -1 };
      if (u && u.stomach < SK.cap(S, u)) { u.stomach++; S.eaten++; e.unit = u.id; }
      else { const tg = [w, ...w.nb.map(j => S.tiles[j])].find(t => t.bac < 3); if (tg) { tg.bac++; e.to = tg.i; } }
      ev.list.push(e);
    }
    S.influxLeft--; if (S.influxLeft <= 0) { S.sealed = true; ev.sealed = true; }
    return ev;
  };
  SK.phaseInflame = function (S) {                            // 還有細菌的發炎區會持續升級；清乾淨的會消退
    const ev = [];
    for (const t of S.tiles) if (t.inf > 0) {
      if (t.bac > 0) { if (t.inf < 3) { t.inf++; ev.push({ i: t.i, up: true }); } }
      else { t.inf--; ev.push({ i: t.i, up: false }); }
    }
    return ev;
  };
  SK.phaseDamage = function (S, full) {
    const ev = [], hit = (t, cause) => { if (t.hp > 0) { t.hp--; S.dmg++; S[cause === 'bac' ? 'dmgBac' : 'dmgInf']++; ev.push({ i: t.i, cause }); } };
    for (const i of full) if (S.tiles[i].bac === 3) hit(S.tiles[i], 'bac');                // 滿載菌落損傷所在組織
    for (const t of S.tiles) if (t.inf === 3) { hit(t, 'inf'); for (const j of t.nb) hit(S.tiles[j], 'inf'); }   // 過度發炎波及周圍
    return ev;
  };
  SK.runEnemy = function (S) {
    const ev = {}; ev.digest = SK.phaseDigest(S); const g = SK.growList(S), full = SK.fullList(S);
    ev.spread = SK.phaseSpread(S); ev.grow = SK.phaseGrow(S, g); ev.influx = S.influxLeft > 0 ? SK.phaseInflux(S) : null;
    ev.inflame = SK.phaseInflame(S); ev.damage = SK.phaseDamage(S, full); return ev;
  };
  SK.advance = function (S) {                                 // 勝敗判定、進入下一回合、援軍
    const L = SK.load(S), c = S.cfg;
    if (SK.health(S) <= 0) return S.result = { win: false, why: 'tissue' };
    if (L >= c.LOAD_MAX) return S.result = { win: false, why: 'overrun' };
    if (S.sealed && L <= c.SAFE) return S.result = { win: true };
    if (S.turn >= c.TURNS) return S.result = { win: false, why: 'timeout' };
    S.turn++; S.ap = c.AP; S.reinfEv = null;
    if (c.REINF.includes(S.turn)) {
      // 嗜中性球循著發炎訊號從血管趕來：落在發炎最強（其次細菌最多）的空格；場上完全沒有發炎就不會來
      // 發炎的格子被佔住時，落在它旁邊
      const sig = t => Math.max(t.inf * 2, ...t.nb.map(j => S.tiles[j].inf));
      const sc = t => sig(t) * 100 + t.bac * 10 + t.nb.reduce((n, j) => n + S.tiles[j].bac, 0);
      const spots = S.tiles.filter(t => sig(t) > 0 && !unitAt(S, t.i)).sort((a, b) => sc(b) - sc(a) || a.i - b.i).slice(0, c.NEU_N);
      S.reinfEv = { ids: [], tiles: [] };
      for (const t of spots) { const u = mkUnit(S, 'neu', t.i); S.units.push(u); S.reinfEv.ids.push(u.id); S.reinfEv.tiles.push(t.i); }
      if (!spots.length) S.reinfMiss++;
    }
    SK.plan(S); return null;
  };
  SK.clone = cloneBase;
  SK.forecast = function (S) {
    const C = SK.clone(S), ev = SK.runEnemy(C), dmg = {}, infT = {}; let dB = 0, dI = 0;
    for (const d of ev.damage) { dmg[d.i] = (dmg[d.i] || 0) + 1; if (d.cause === 'inf') { infT[d.i] = 1; dI++; } else dB++; }
    const res = SK.advance(C);
    return { dmg, infT, dB, dI, load: SK.load(C), res, reinf: C.reinfEv ? C.reinfEv.tiles.length : null, leave: ev.digest.leave.map(u => u.id) };
  };

  /* =====================================================================
     第 2、3 章｜呼吸道：病毒、樹突細胞、淋巴結、毒殺 T 細胞、抗體
     上皮細胞 st：0 健康、1 受感染（病毒工廠）、2 死亡。vir＝停在細胞表面、還沒進去的病毒。
     ===================================================================== */
  const AW = IW.airway = { unitAt, areaOf, moveTargets };
  AW.CFG = { AP: 5, TURNS: 14, CAP: 3, DIGEST: 1, MOVE: 2, MACS: 2, START_INF: 3, START_VIR: 4, REL_N: 2, REL_TURNS: 3, VMAX: 3, BUDGET: 26, CTL_N: 2, AB_MAX: 3 };
  AW.nInf = S => S.tiles.reduce((n, t) => n + (t.st === 1), 0);
  AW.nVir = S => S.tiles.reduce((n, t) => n + t.vir, 0);
  AW.health = S => Math.max(0, 1 - S.dead / S.cfg.BUDGET);
  AW.relLeft = (S, t) => S.cfg.REL_TURNS - t.age + 1;
  // preset：{units:[[kind,tile]], inf:{tile:age}, vir:{tile:n}, ready:{t:回合,ab:回合}}
  AW.setup = function (seed, cfg, preset) {
    cfg = Object.assign({}, AW.CFG, cfg || {});
    const rng = IW.rng(seed), tiles = buildTiles(() => ({ st: 0, age: 0, vir: 0, rel: [], by: '' }));
    const S = { mode: 'airway', seed, cfg, rng, tiles, units: [], turn: 1, ap: cfg.AP, sel: -1, phase: 'player', ag: 0, tAt: 0, abAt: 0, delay: 0, ctl: 0, ab: 0,
      dead: 0, deadVir: 0, deadCtl: 0, eaten: 0, neut: 0, infTotal: 0, nextId: 1, result: null };
    const pick = a => a[Math.floor(rng() * a.length)];
    if (preset) {
      for (const i in preset.inf || {}) { tiles[i].st = 1; tiles[i].age = preset.inf[i]; S.infTotal++; }
      for (const i in preset.vir || {}) tiles[i].vir = preset.vir[i];
      for (const [k, t] of preset.units) S.units.push(mkUnit(S, k, t));
      if (preset.ready) { S.ag = 1; S.tAt = preset.ready.t; S.abAt = preset.ready.ab; AW.refill(S); }
    } else {
      const inf = [pick(tiles.filter(t => t.r <= 2 && t.c >= 1 && t.c <= COLS - 2))];      // 起始感染灶：靠近氣道的一小群細胞
      while (inf.length < cfg.START_INF) inf.push(pick(tiles.filter(t => !inf.includes(t) && inf.every(o => hexDist(t, o) >= 2) && inf.some(o => hexDist(t, o) === 2))));
      for (const t of inf) { t.st = 1; t.age = 1; } S.infTotal = inf.length;
      const near = IW.shuffle(tiles.filter(t => t.st === 0 && inf.some(o => hexDist(t, o) === 1)), rng);
      for (let k = 0; k < cfg.START_VIR; k++) near[k].vir = 1;
      const hot = tiles.filter(t => t.st === 1 || t.vir > 0), free = t => !unitAt(S, t.i), dmin = t => Math.min(...hot.map(b => hexDist(t, b)));
      for (let k = 0; k < cfg.MACS; k++) {
        const c = tiles.filter(t => free(t) && dmin(t) === 2 && S.units.every(u => hexDist(t, tiles[u.tile]) >= 3));
        S.units.push(mkUnit(S, 'mac', pick(c.length ? c : tiles.filter(t => free(t) && dmin(t) >= 2)).i));
      }
      const c = tiles.filter(t => free(t) && dmin(t) === 3);
      S.units.push(mkUnit(S, 'dc', pick(c.length ? c : tiles.filter(t => free(t) && dmin(t) >= 2)).i));
    }
    AW.plan(S); return S;
  };
  // 每回合開始先決定「每個工廠下次把病毒釋放到哪些鄰近健康細胞」，顯示給玩家
  AW.plan = function (S) {
    for (const t of S.tiles) { t.rel = []; if (t.st !== 1) continue; t.rel = IW.shuffle(t.nb.filter(j => S.tiles[j].st === 0 && S.tiles[j].vir === 0), S.rng).slice(0, S.cfg.REL_N); }
  };
  AW.eatTargets = (S, u) => (S.ap < 1 || u.kind !== 'mac' || u.stomach >= S.cfg.CAP) ? [] : areaOf(S, u.tile).filter(i => S.tiles[i].vir > 0);
  AW.eatCount = (S, u, i) => Math.min(S.tiles[i].vir, S.cfg.CAP - u.stomach);
  AW.agTargets = (S, u) => (S.ap < 1 || u.kind !== 'dc') ? [] : areaOf(S, u.tile).filter(i => S.tiles[i].vir > 0 || S.tiles[i].st === 1);
  AW.abCount = (S, i) => areaOf(S, i).reduce((n, j) => n + S.tiles[j].vir, 0);
  AW.canAb = S => S.ap > 0 && S.ab > 0; AW.canCtl = S => S.ap > 0 && S.ctl > 0;
  AW.actMove = (S, u, i) => { u.tile = i; S.ap--; };
  AW.actEat = (S, u, i) => { const n = AW.eatCount(S, u, i); S.tiles[i].vir -= n; u.stomach += n; S.eaten += n; S.ap--; return n; };
  AW.actAntigen = (S, u) => { S.ag = S.turn; S.units.splice(S.units.indexOf(u), 1); S.ap--; };      // 樹突細胞帶著情報離開戰場，前往淋巴結
  // 淋巴結的結果決定後援多久到：delay＝幾回合後；有記憶細胞時抗體與 T 細胞同時到
  AW.setDelay = (S, delay, mem) => { S.delay = delay; S.mem = !!mem; S.tAt = S.ag + delay; S.abAt = S.ag + delay + (mem ? 0 : 1); };
  AW.refill = S => { S.ctl = S.tAt && S.turn >= S.tAt ? S.cfg.CTL_N : 0; S.ab = S.abAt && S.turn >= S.abAt ? Math.min(S.cfg.AB_MAX, S.turn - S.abAt + 1) : 0; };
  AW.actAb = (S, i) => { let n = 0; for (const j of areaOf(S, i)) { n += S.tiles[j].vir; S.tiles[j].vir = 0; } S.neut += n; S.ab--; S.ap--; return n; };
  AW.actCtl = (S, i) => { const t = S.tiles[i]; t.st = 2; t.by = 'ctl'; t.rel = []; S.dead++; S.deadCtl++; S.ctl--; S.ap--; };
  // ---- 病毒階段 ----
  AW.phaseDigest = S => { const ev = []; for (const u of S.units) if (u.stomach > 0) { const n = Math.min(S.cfg.DIGEST, u.stomach); u.stomach -= n; ev.push({ id: u.id, n }); } return ev; };
  AW.phaseInfect = S => { const ev = []; for (const t of S.tiles) if (t.st === 0 && t.vir > 0) { t.st = 1; t.age = 0; t.vir = 0; S.infTotal++; ev.push(t.i); } return ev; };   // 細胞外病毒進入所在的健康細胞
  AW.phaseRelease = function (S) {                            // 工廠把新病毒釋放到預定的鄰近細胞；這回合才被感染的還在複製，不釋放
    const ev = [];
    for (const t of S.tiles) if (t.st === 1 && t.age >= 1) for (const j of t.rel) {
      const to = S.tiles[j], u = unitAt(S, j);
      if (u && u.kind === 'mac' && u.stomach < S.cfg.CAP) { u.stomach++; S.eaten++; ev.push({ from: t.i, to: j, unit: u.id }); }   // 守在落點的巨噬細胞直接吞掉
      else if (to.st === 0 && to.vir < S.cfg.VMAX) { to.vir++; ev.push({ from: t.i, to: j }); }
    }
    return ev;
  };
  AW.phaseAge = function (S) {                                // 釋放次數用完的工廠細胞死亡
    const ev = [];
    for (const t of S.tiles) if (t.st === 1) { if (t.age >= 1 && t.age >= S.cfg.REL_TURNS) { t.st = 2; t.by = 'vir'; t.rel = []; S.dead++; S.deadVir++; ev.push(t.i); } else t.age++; }
    return ev;
  };
  AW.runEnemy = S => { const ev = {}; ev.digest = AW.phaseDigest(S); ev.infect = AW.phaseInfect(S); ev.release = AW.phaseRelease(S); ev.die = AW.phaseAge(S); return ev; };
  AW.verdict = S => AW.health(S) <= 0 ? { win: false, why: 'tissue' } : (AW.nInf(S) === 0 && AW.nVir(S) === 0) ? { win: true } : null;
  AW.advance = function (S) {
    const v = AW.verdict(S); if (v) return S.result = v;
    if (S.turn >= S.cfg.TURNS) return S.result = { win: false, why: 'timeout' };
    S.turn++; S.ap = S.cfg.AP; AW.refill(S); AW.plan(S); return null;
  };
  AW.clone = cloneBase;
  AW.forecast = function (S) {
    const C = AW.clone(S); C.tiles.forEach((t, k) => { t.rel = S.tiles[k].rel.slice(); });
    const ev = AW.runEnemy(C), res = AW.advance(C);
    return { infect: ev.infect, release: ev.release.length, die: ev.die, nInf: AW.nInf(C), nVir: AW.nVir(C), dead: C.dead, res };
  };
})(window.IW);
