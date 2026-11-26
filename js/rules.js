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
    LOAD_MAX: 26, SAFE: 2, BUDGET: 30, INF_MAX: 3, MACS: 2, REINF: [3, 6], NEU_N: 2, CAPN: 3, NEU_LIFE: 3 };
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
      if (t.bac > 0) { if (t.inf < S.cfg.INF_MAX) { t.inf++; ev.push({ i: t.i, up: true }); } }
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

  /* =====================================================================
     第 4 章｜漏網之魚：抗生素與抗藥性
     組織裡的細菌一隻一隻記錄：b 是陣列，0＝怕藥、1＝帶抗藥基因（畫成條紋）。
     皮膚表面另有一排菌群 flora（12 個位子）：C＝無害的住戶、S＝怕藥的伺機菌、R＝不怕藥的伺機菌。
     抗生素不是玩家的按鈕：它是醫師開的藥，在第 DRUG_AT 回合開始時自動送到，療程長度固定（COURSE 回合）。
     玩家不能提早、延後、縮短、延長或中途停止（刻意的設計：遊戲不讓「何時用藥、用多久」變成可以最佳化的操作）：
       開始的當下殺死組織裡所有怕藥的細菌；療程的每一回合，皮膚上緊鄰條紋菌的一個怕藥細菌死掉，由條紋菌補位。
       提早打贏，剩下的療程也照樣吃完（settle）。所以一個療程對皮膚的代價是固定的，和打得快慢、何時開始無關；
       玩家唯一能改變的，是要不要多一個不必要的療程。沒有用藥的幾個月裡，皮膚會恢復一格（recover）。
     抗藥性不是藥「教」出來的：突變在分裂時隨機發生（MU），有沒有用藥都一樣；藥只決定誰留下來。
     ===================================================================== */
  const AX = IW.abx = { unitAt, areaOf, moveTargets };
  AX.CFG = { AP: 5, TURNS: 10, CAP: 3, DIGEST: 2, MOVE: 2, MACS: 2, BUDGET: 20, LOAD_MAX: 30, START: 16, MIN_R: 4, MU: .03, BITE: 1, DRUG_AT: 2, COURSE: 2 };
  AX.flora0 = seed => IW.shuffle('CCCCCCSSSSSR'.split(''), IW.rng((seed ^ 0x5bd1e995) | 0));       // 這個身體皮膚上的菌群：由 bodySeed 決定，條紋菌從一開始就在
  AX.census = f => { const n = { C: 0, S: 0, R: 0 }; for (const k of f) n[k]++; return n; };
  AX.share = f => { const n = AX.census(f); return n.R + n.S ? n.R / (n.R + n.S) : 0; };            // 伺機菌裡不怕藥的比例：決定闖進傷口的細菌組成
  AX.nextDose = f => f.map((k, i) => i).filter(i => f[i] !== 'R' && (f[i - 1] === 'R' || f[i + 1] === 'R'));   // 下一個會被補位的位子（緊鄰條紋菌的怕藥細菌）
  AX.floraTick = function (f, rng) { const c = AX.nextDose(f); if (!c.length) return null; const i = c[Math.floor(rng() * c.length)], was = f[i]; f[i] = 'R'; return { i, was }; };
  // 幾個月沒有用藥：最晚被條紋菌佔走的位子之一，由原本怕藥的細菌長回來（抗藥性有代價；真實的恢復通常很慢）
  AX.recover = function (f, f0) { const c = f.map((k, i) => i).filter(i => f[i] === 'R' && f0[i] !== 'R' && (f[i - 1] !== 'R' || f[i + 1] !== 'R')); if (!c.length) return null; const i = c[c.length - 1]; f[i] = f0[i]; return { i }; };
  AX.load = S => S.tiles.reduce((n, t) => n + t.b.length, 0);
  AX.nR = S => S.tiles.reduce((n, t) => n + t.b.filter(x => x).length, 0);
  AX.health = S => Math.max(0, 1 - S.dmg / S.cfg.BUDGET);
  // preset：{units:[[kind,tile]], bac:{tile:'SSR'}, scabs:[tile], mutate:{turn,tile}}
  AX.setup = function (seed, cfg, preset, flora) {
    cfg = Object.assign({}, AX.CFG, cfg || {});
    const rng = IW.rng(seed), tiles = buildTiles(() => ({ hp: 3, b: [], scab: false, spreadTo: -1 }));
    const S = { mode: 'abx', seed, cfg, rng, tiles, units: [], turn: 1, ap: cfg.AP, sel: -1, phase: 'player', flora: (flora || AX.flora0(1)).slice(), drug: 0, drugAt: 0, doses: 0,
      dmg: 0, eaten: 0, eatenR: 0, killed: 0, mut: 0, mutAt: 0, rMax: 0, nextId: 1, result: null, drugEv: null, script: (preset && preset.mutate) || null };
    S.flora0 = S.flora.slice();
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    if (preset) {
      for (const i of preset.scabs || []) tiles[i].scab = true;
      for (const i in preset.bac || {}) tiles[i].b = preset.bac[i].split('').map(k => k === 'R' ? 1 : 0);
      for (const [k, t] of preset.units) S.units.push(mkUnit(S, k, t));
    } else {
      let scabs; if (rng() < .5) { const c = ri(1, COLS - 3); scabs = [c, c + 1]; } else scabs = [ri(0, 1), ri(COLS - 2, COLS - 1)];   // 已經結痂的傷口：細菌是結痂前進來的
      for (const i of scabs) tiles[i].scab = true;
      const order = scabs.concat(IW.shuffle(tiles.filter(t => !t.scab && scabs.some(w => hexDist(t, tiles[w]) <= 2)).map(t => t.i), rng)), all = [];
      for (let k = 0, left = cfg.START; left > 0 && k < order.length; k++) { const n = Math.min(left, k < 2 ? 3 : k < 5 ? 2 : 1), t = tiles[order[k]]; for (let j = 0; j < n; j++) { t.b.push(0); all.push(t); } left -= n; }
      const used = IW.shuffle(tiles.filter(t => t.b.length), rng), nr = Math.min(all.length, Math.max(cfg.MIN_R, Math.round(AX.share(S.flora) * all.length)));   // 來源是皮膚：伺機菌裡條紋的佔多少，進來的就佔多少
      for (let k = 0, j = 0; k < nr && j < 99; j++) { const t = used[j % used.length], x = t.b.indexOf(0); if (x >= 0) { t.b[x] = 1; k++; } }                    // 條紋菌盡量分散在不同格
      const infected = tiles.filter(t => t.b.length > 0);
      let cand = tiles.filter(t => t.r >= 2 && t.r <= 5 && infected.every(b => hexDist(t, b) >= 2));
      for (let k = 0; k < cfg.MACS; k++) {
        const pool = cand.length ? cand : tiles.filter(t => !t.b.length && !unitAt(S, t.i));
        const a = pool[Math.floor(rng() * pool.length)]; S.units.push(mkUnit(S, 'mac', a.i));
        cand = cand.filter(t => hexDist(t, a) >= 3);
      }
    }
    S.rMax = AX.nR(S); AX.plan(S); return S;
  };
  AX.plan = function (S) {                                    // 滿載菌落下回合往哪擴散：回合開始就決定，顯示給玩家
    for (const t of S.tiles) {
      t.spreadTo = -1; if (!t.b.length) continue;
      const c = t.nb.filter(j => S.tiles[j].b.length < 3); if (!c.length) continue;
      const w = c.map(j => { const n = S.tiles[j]; return (n.b.length === 0 ? 3 : 1) * (n.hp > 0 ? 2 : 1); });
      let x = S.rng() * w.reduce((p, q) => p + q, 0);
      for (let k = 0; k < c.length; k++) { x -= w[k]; if (x <= 0) { t.spreadTo = c[k]; break; } }
      if (t.spreadTo < 0) t.spreadTo = c[c.length - 1];
    }
  };
  AX.eatTargets = (S, u) => (S.ap < 1 || u.stomach >= S.cfg.CAP) ? [] : areaOf(S, u.tile).filter(i => S.tiles[i].b.length > 0);
  AX.eatCount = (S, u, i) => Math.min(S.tiles[i].b.length, S.cfg.CAP - u.stomach, S.cfg.BITE);
  AX.actMove = (S, u, i) => { u.tile = i; S.ap--; };
  AX.actEat = function (S, u, i) {                            // 吞噬細胞不分怕不怕藥，照吞；同一格裡先吞條紋的（對玩家友善的遊戲設定）
    const t = S.tiles[i], n = AX.eatCount(S, u, i); t.b.sort((a, b) => b - a);
    const r = t.b.splice(0, n).filter(x => x).length; u.stomach += n; S.eaten += n; S.eatenR += r; S.ap--; return { n, r };
  };
  AX.drugKills = S => AX.load(S) - AX.nR(S);
  AX.onCourse = S => !!S.drug && S.doses < S.cfg.COURSE;
  AX.dose = S => { S.doses++; return AX.floraTick(S.flora, S.rng); };
  AX.settle = S => { const ev = []; while (AX.onCourse(S)) ev.push(AX.dose(S)); return ev; };   // 提早打贏：剩下的療程照樣吃完
  AX.actDrug = function (S) {
    const ev = { kill: [] };
    for (const t of S.tiles) { const n = t.b.filter(x => !x).length; if (n) { t.b = t.b.filter(x => x); ev.kill.push({ i: t.i, n }); S.killed += n; } }
    S.drug = 1; S.drugAt = S.turn; return ev;
  };
  // ---- 細菌階段 ----
  AX.phaseDigest = S => { const ev = []; for (const u of S.units) if (u.stomach > 0) { const n = Math.min(S.cfg.DIGEST, u.stomach); u.stomach -= n; ev.push({ id: u.id, n }); } return ev; };
  AX.fullList = S => S.tiles.filter(t => t.b.length === 3).map(t => t.i);
  AX.growList = S => S.tiles.filter(t => t.b.length > 0 && t.b.length < 3).map(t => t.i);
  AX.phaseSpread = function (S) {
    const ev = [];
    for (const t of S.tiles.filter(t => t.b.length === 3)) {
      if (t.spreadTo < 0) continue;
      const to = S.tiles[t.spreadTo], u = unitAt(S, to.i), r = t.b[Math.floor(S.rng() * 3)];
      if (u && u.stomach < S.cfg.CAP) { u.stomach++; S.eaten++; if (r) S.eatenR++; ev.push({ from: t.i, to: to.i, unit: u.id, r }); }
      else if (to.b.length < 3) ev.push({ from: t.i, to: to.i, r });
    }
    for (const e of ev) if (e.unit === undefined) { const to = S.tiles[e.to]; if (to.b.length < 3) to.b.push(e.r); else e.fail = true; }
    return ev;
  };
  AX.phaseGrow = function (S, list) {                         // 分裂：子代和親代一樣。怕藥的親代偶爾抄錯（突變），生出帶抗藥基因的子代——和有沒有用藥無關
    const ev = [], sc = S.script; let mt = -1;                /* 練習關卡的示範：指定回合一定出現一次突變（優先在指定的格子） */
    if (sc && sc.turn === S.turn) { const ok = list.filter(i => { const b = S.tiles[i].b; return b.length > 0 && b.length < 3 && !b.includes(1); }); mt = ok.includes(sc.tile) ? sc.tile : ok.length ? ok[ok.length - 1] : -1; }
    for (const i of list) {
      const t = S.tiles[i]; if (!t.b.length || t.b.length >= 3) continue;
      let r = t.b[Math.floor(S.rng() * t.b.length)], mut = false;
      if (i === mt) { r = 0; mut = true; S.script = null; } else if (!r && S.rng() < S.cfg.MU) mut = true;
      if (mut) { r = 1; S.mut++; if (!S.mutAt) S.mutAt = S.turn; }
      t.b.push(r); ev.push({ i, r, mut });
    }
    return ev;
  };
  AX.phaseDamage = function (S, full) { const ev = []; for (const i of full) { const t = S.tiles[i]; if (t.b.length === 3 && t.hp > 0) { t.hp--; S.dmg++; ev.push(i); } } return ev; };
  AX.runEnemy = function (S) {
    const ev = {}; ev.digest = AX.phaseDigest(S); const g = AX.growList(S), full = AX.fullList(S);
    ev.spread = AX.phaseSpread(S); ev.grow = AX.phaseGrow(S, g); ev.damage = AX.phaseDamage(S, full);
    ev.flora = AX.onCourse(S) ? AX.dose(S) : null; S.rMax = Math.max(S.rMax, AX.nR(S)); return ev;
  };
  AX.verdict = S => AX.load(S) === 0 ? { win: true } : null;
  AX.advance = function (S) {
    if (AX.health(S) <= 0) return S.result = { win: false, why: 'tissue' };
    const L = AX.load(S); if (L === 0) return S.result = { win: true };
    if (L >= S.cfg.LOAD_MAX) return S.result = { win: false, why: 'overrun' };
    if (S.turn >= S.cfg.TURNS) return S.result = { win: false, why: 'timeout' };
    S.turn++; S.ap = S.cfg.AP; S.drugEv = null;
    if (!S.drug && S.turn === S.cfg.DRUG_AT) { S.drugEv = AX.actDrug(S); if (AX.load(S) === 0) return S.result = { win: true }; }   // 醫師開的抗生素送到：不花行動點數，也不由玩家決定時機
    AX.plan(S); return null;
  };
  AX.clone = S => Object.assign({}, S, { tiles: S.tiles.map(t => Object.assign({}, t, { b: t.b.slice() })), units: S.units.map(u => Object.assign({}, u)), flora: S.flora.slice(), rng: () => .5, result: null });
  AX.forecast = function (S) {
    const C = AX.clone(S), ev = AX.runEnemy(C), dmg = {}; for (const i of ev.damage) dmg[i] = 1;
    const res = AX.advance(C); return { dmg, nDmg: ev.damage.length, load: AX.load(C), nR: AX.nR(C), res };
  };
})(window.IW);
