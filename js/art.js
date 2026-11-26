'use strict';
/* =====================================================================
   美術：全部用 Canvas 程式繪製，沒有圖檔。
   方向：病理切片的 H&E 染色（組織是伊紅的粉、細胞核是蘇木的紫）＋繪本線條。
   角色靠輪廓辨認，輪廓取自真實形態：嗜中性球的細胞核分葉、淋巴球的細胞核又大又圓、
   巨噬細胞的細胞核像腰果、樹突細胞有突起。健康的組織細胞不畫表情，出事的才畫。
   單位：設計座標，六角格半徑 R=40。
   ===================================================================== */
(function (IW) {
  const A = IW.art = {}; let c = null;
  const P = A.P = {
    paper: '#fbf4ef', ink: '#3a2947', dim: '#7d6a86', hema: '#6f4fa3', ok: '#1c7f73',
    eosin: '#f7cdd6', eosinHi: '#fde6ea', eosinEdge: '#e9a3b6', nucleus: '#7b5aa6', nucleusDk: '#553a82',
    hurt: '#f1d9d3', ghost: '#e9e1e4', sick: '#cdbde0', sickEdge: '#8b6fb0',
    mac: '#fff0cc', neu: '#fbe4ec', dc: '#f6c66f', lymph: '#f8dfe8', tcell: '#7d5fb0', mem: '#4f8fb8', bcell: '#b0629a',
    bac: '#3fa77c', bacDk: '#1d5f45', vir: '#3a4aa6', spike: '#e0457b', gold: '#e2a02c', teal: '#1f9d8f', danger: '#c0304f', flame: '#e8552e',
    blood: '#e98a8a', bloodDk: '#c9545f', skin: '#eab9a0', skinDk: '#c98f77', keratin: '#f3d9c4', lumen: '#eef6fb', mucus: '#cfe6ee'
  };
  const GC = A.GC = ['#e07a2f', '#1f9d8f', '#6b55c9'];        // 受體三種形狀的顏色：形狀為主、顏色為輔
  const TAU = Math.PI * 2;
  A.use = ctx => { c = ctx; };
  A.font = (px, w) => `${w || 400} ${px}px "PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif`;

  /* ---------------- 基本形狀 ---------------- */
  function blob(x, y, r, seed, t, amp, n) {                 // 有機的閉合曲線
    n = n || 9; amp = amp === undefined ? .08 : amp; const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, k = 1 + amp * Math.sin(seed * 1.7 + i * 2.3 + t * 1.3) + amp * .6 * Math.sin(seed + i * 1.1 - t * .9);
      pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
    }
    c.beginPath();
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (!i) c.moveTo(mx, my); else c.quadraticCurveTo(p[0], p[1], mx, my); }
    const p = pts[0], q = pts[1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); c.closePath();
  }
  A.blob = blob;
  function softHex(x, y, r, k) {                             // 圓角六角形：細胞彼此緊貼的樣子
    k = k === undefined ? .34 : k; c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a0 = -Math.PI / 2 + i * Math.PI / 3, a1 = a0 + Math.PI / 3, x0 = x + Math.cos(a0) * r, y0 = y + Math.sin(a0) * r, x1 = x + Math.cos(a1) * r, y1 = y + Math.sin(a1) * r;
      const sx = x0 + (x1 - x0) * k, sy = y0 + (y1 - y0) * k, ex = x0 + (x1 - x0) * (1 - k), ey = y0 + (y1 - y0) * (1 - k);
      if (!i) c.moveTo(sx, sy); else c.quadraticCurveTo(x0, y0, sx, sy);
      c.lineTo(ex, ey);
    }
    const a0 = -Math.PI / 2, x0 = x + Math.cos(a0) * r, y0 = y + Math.sin(a0) * r, a1 = a0 + Math.PI / 3, x1 = x + Math.cos(a1) * r, y1 = y + Math.sin(a1) * r;
    c.quadraticCurveTo(x0, y0, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); c.closePath();
  }
  A.softHex = softHex;
  A.hexPath = (x, y, r) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); };

  /* ---------------- 表情（比喻：細胞沒有情緒） ----------------
     mood：''微笑、happy、worry、sad、hurt、dead、evil、focus、eat、sleep、o、calm */
  A.face = function (x, y, s, mood, ink, ph) {
    ink = ink || P.ink; s = s || 1; const ex = 5.2 * s, lw = 1.5 * s;
    c.save(); c.translate(x, y); c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    const blink = ph !== undefined && (ph % 4.2) < .12;
    for (const d of [-1, 1]) {
      c.save(); c.scale(d, 1);
      if (mood === 'dead') { c.beginPath(); c.moveTo(ex - 2 * s, -2 * s); c.lineTo(ex + 2 * s, 2 * s); c.moveTo(ex + 2 * s, -2 * s); c.lineTo(ex - 2 * s, 2 * s); c.stroke(); }
      else if (mood === 'sleep' || mood === 'calm' || blink) { c.beginPath(); c.arc(ex, -.6 * s, 2 * s, .25, Math.PI - .25); c.stroke(); }
      else if (mood === 'happy') { c.beginPath(); c.arc(ex, .8 * s, 2.1 * s, Math.PI + .3, TAU - .3); c.stroke(); }
      else if (mood === 'evil') {
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ex - 3.1 * s, -1.6 * s); c.lineTo(ex + 3 * s, .5 * s); c.arc(ex, .2 * s, 3 * s, .1, Math.PI + .5); c.closePath(); c.fill(); c.lineWidth = lw * .7; c.stroke();
        c.fillStyle = ink; c.beginPath(); c.arc(ex + .3 * s, 1 * s, 1.2 * s, 0, TAU); c.fill();
      } else {
        c.beginPath(); c.arc(ex, 0, (mood === 'o' || mood === 'eat' ? 2.1 : 1.8) * s, 0, TAU); c.fill();
        if (mood === 'worry' || mood === 'sad' || mood === 'hurt') { c.beginPath(); c.moveTo(ex - 3 * s, -5.6 * s); c.lineTo(ex + 2.4 * s, -3.6 * s); c.stroke(); }
        if (mood === 'focus') { c.beginPath(); c.moveTo(ex - 3 * s, -3.4 * s); c.lineTo(ex + 2.6 * s, -5 * s); c.stroke(); }
      }
      c.restore();
    }
    c.lineWidth = lw; c.beginPath();
    if (mood === 'eat') { c.ellipse(0, 6.4 * s, 3.4 * s, 3.8 * s, 0, 0, TAU); c.fill(); }
    else if (mood === 'o') { c.arc(0, 6.2 * s, 1.7 * s, 0, TAU); c.stroke(); }
    else if (mood === 'worry' || mood === 'sad' || mood === 'dead') { c.arc(0, 8.6 * s, 3 * s, Math.PI + .5, TAU - .5); c.stroke(); }
    else if (mood === 'hurt') { c.moveTo(-3.4 * s, 6.6 * s); c.quadraticCurveTo(-1.7 * s, 4.8 * s, 0, 6.6 * s); c.quadraticCurveTo(1.7 * s, 8.4 * s, 3.4 * s, 6.6 * s); c.stroke(); }
    else if (mood === 'focus' || mood === 'sleep') { c.moveTo(-2.2 * s, 6.4 * s); c.lineTo(2.2 * s, 6.4 * s); c.stroke(); }
    else if (mood === 'evil') { c.moveTo(-3.2 * s, 5.2 * s); c.quadraticCurveTo(.6 * s, 8.2 * s, 3.8 * s, 4.4 * s); c.stroke(); }
    else { c.arc(0, 4.2 * s, 3.2 * s, .35, Math.PI - .35); c.stroke(); }
    c.restore();
  };

  /* ---------------- 組織細胞（戰場的格子） ----------------
     o：{hp 3..0（皮膚關）、st 0 健康/1 受感染/2 死亡（呼吸道關）、seed、t、flash、rel（工廠還會釋放幾回合）} */
  A.cell = function (x, y, o) {
    const sd = o.seed || 0, t = o.t || 0, hp = o.hp === undefined ? 3 : o.hp, st = o.st || 0, r = 36.5;
    const gone = hp <= 0 || st === 2, sick = st === 1, hurt = !gone && !sick && hp < 3;
    c.save(); c.translate(x, y);
    if (gone) {
      softHex(0, 0, r); c.fillStyle = P.ghost; c.globalAlpha = .7; c.fill(); c.globalAlpha = 1;
      c.setLineDash([5, 5]); c.strokeStyle = 'rgba(58,41,71,.38)'; c.lineWidth = 1.6; c.stroke(); c.setLineDash([]);
      c.globalAlpha = .45; A.face(0, -2, 1.05, 'dead', P.ink); c.globalAlpha = 1; c.restore(); return;
    }
    softHex(0, 0, r);
    const g = c.createRadialGradient(-6, -8, 4, 0, 0, r);
    if (sick) { g.addColorStop(0, '#dccfec'); g.addColorStop(1, P.sick); }
    else if (hurt) { g.addColorStop(0, '#f7e8e3'); g.addColorStop(1, hp === 1 ? '#e6c9c3' : P.hurt); }
    else { g.addColorStop(0, P.eosinHi); g.addColorStop(1, P.eosin); }
    c.fillStyle = g; c.fill();
    c.strokeStyle = sick ? P.sickEdge : hurt ? '#b98a86' : P.eosinEdge; c.lineWidth = sick || hurt ? 2 : 1.4; c.stroke();
    // 細胞核
    const nx = Math.sin(sd * 3.1) * 9, ny = 13 + Math.cos(sd * 2.3) * 4;
    c.fillStyle = sick ? P.nucleusDk : P.nucleus; c.globalAlpha = hurt ? .55 : sick ? .75 : .8;
    c.beginPath(); c.ellipse(nx, ny, 9.5, 7.2, Math.sin(sd) * .8, 0, TAU); c.fill(); c.globalAlpha = 1;
    if (hurt) {                                               // 裂痕：辨識不只靠顏色
      c.strokeStyle = 'rgba(120,60,60,.75)'; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath();
      c.moveTo(-22, -20); c.lineTo(-13, -11); c.lineTo(-17, -3);
      if (hp === 1) { c.moveTo(20, -18); c.lineTo(12, -8); c.lineTo(18, 2); c.moveTo(-6, 24); c.lineTo(2, 17); }
      c.stroke(); A.face(0, -5, 1.02, hp === 1 ? 'hurt' : 'worry', '#6b3d48', t + sd);
    }
    if (sick) A.face(0, -6, 1.02, 'sad', '#3d2a66', t + sd);
    if (o.flash > 0) { softHex(0, 0, r); c.fillStyle = `rgba(192,48,79,${o.flash * .5})`; c.fill(); }
    c.restore();
  };
  // 發炎：泛紅、腫（外圈）、下方火苗數＝等級。火苗是遊戲記號，不是組織在燃燒。
  A.inflame = function (x, y, lv, t, ghost) {
    if (lv <= 0) return; c.save(); c.translate(x, y);
    softHex(0, 0, 36.5); c.fillStyle = `rgba(232,70,46,${[0, .16, .28, .42][lv] * (ghost ? .5 : 1)})`; c.fill();
    c.strokeStyle = `rgba(214,60,40,${lv === 3 ? .75 + .25 * Math.sin(t * 6) : .5})`; c.lineWidth = lv === 3 ? 3.2 : 2; c.setLineDash(lv === 3 ? [] : [6, 5]); softHex(0, 0, 38.5); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < lv; i++) A.flame((i - (lv - 1) / 2) * 11, 27, .9 + .12 * Math.sin(t * 7 + i), lv === 3);
    c.restore();
  };
  A.flame = function (x, y, s, hot) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, -8); c.quadraticCurveTo(6, -1, 4, 4); c.quadraticCurveTo(0, 8, -4, 4); c.quadraticCurveTo(-6, -1, 0, -8); c.closePath();
    c.fillStyle = hot ? '#d8331d' : P.flame; c.fill(); c.strokeStyle = '#7a1d10'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(2.6, 2, 0, 4.6); c.quadraticCurveTo(-2.6, 2, 0, -2); c.fillStyle = '#ffd27a'; c.fill();
    c.restore();
  };

  /* ---------------- 病原體 ---------------- */
  A.rod = function (x, y, rot, s, mood, ph, alpha, res) {      // 桿菌。mood 預設 evil：戰場上的都是正在造成感染的細菌。res＝帶抗藥基因（第 4 章，畫成條紋）
    s = s || 1; ph = ph || 0; c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s); c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.strokeStyle = P.bacDk; c.lineWidth = 1.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-11, 0);
    for (let i = 1; i <= 6; i++) c.lineTo(-11 - i * 2.4, Math.sin(ph + i * 1.3) * 2.6); c.stroke();          // 鞭毛
    c.beginPath(); c.roundRect(-11, -5.6, 22, 11.2, 5.6); c.fillStyle = P.bac; c.fill(); c.strokeStyle = P.bacDk; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(-7, -4, 12, 3, 1.5); c.fill();
    if (res) {                                                /* 條紋與金色外圈：辨識不只靠顏色。真實的抗藥細菌外觀看不出差別 */
      c.save(); c.beginPath(); c.roundRect(-11, -5.6, 22, 11.2, 5.6); c.clip(); c.fillStyle = P.ink;
      for (const bx of [-9.6, -6.4, 4.6, 7.8]) c.fillRect(bx, -6, 1.9, 12); c.restore();
      c.beginPath(); c.roundRect(-12.6, -7.2, 25.2, 14.4, 7.2); c.strokeStyle = P.gold; c.lineWidth = 1.7; c.stroke();
    }
    c.rotate(-(rot || 0)); A.face(0, -.6, .58, mood || 'evil', '#0f3325');
    c.restore();
  };
  A.virion = function (x, y, s, ph, alpha, mood) {
    s = s || 1; ph = ph || 0; c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = alpha === undefined ? 1 : alpha;
    const p = 1 + Math.sin(ph) * .06;
    c.strokeStyle = P.spike; c.lineWidth = 1.6; c.lineCap = 'round'; c.fillStyle = P.spike;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + ph * .15; c.beginPath(); c.moveTo(Math.cos(a) * 6.5 * p, Math.sin(a) * 6.5 * p); c.lineTo(Math.cos(a) * 10.5 * p, Math.sin(a) * 10.5 * p); c.stroke(); c.beginPath(); c.arc(Math.cos(a) * 11 * p, Math.sin(a) * 11 * p, 1.5, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(0, 0, 7.4 * p, 0, TAU); c.fillStyle = P.vir; c.fill(); c.strokeStyle = '#1c2460'; c.lineWidth = 1.4; c.stroke();
    A.face(0, -1, .56, mood || 'evil', '#101746');
    c.restore();
  };

  // 住戶菌（常在菌）：成對的球菌，平靜的表情。牠們不是敵人
  A.coccus = function (x, y, s, ph, alpha) {
    s = s || 1; c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = alpha === undefined ? 1 : alpha;
    const w = Math.sin(ph || 0) * .5; c.fillStyle = '#8fc1ea'; c.strokeStyle = '#2c5c8c'; c.lineWidth = 1.4;
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 4.6, w * d, 6, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(-6, -2.4, 1.8, 0, TAU); c.fill();
    A.face(0, -.4, .52, 'calm', '#173a5e'); c.restore();
  };
  // 抗生素：膠囊只是記號。真實的抗生素是溶在血液與組織液裡的小分子
  A.pill = function (x, y, rot, s, alpha) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s || 1, s || 1); c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.beginPath(); c.roundRect(-8, -3.8, 16, 7.6, 3.8); c.fillStyle = '#fff'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#2f7fc1'; c.fillRect(0, -4, 8, 8); c.restore();
    c.strokeStyle = P.ink; c.lineWidth = 1.2; c.stroke(); c.restore();
  };

  /* ---------------- 免疫細胞 ---------------- */
  function contents(n, kind, ph) {                           // 吞進體內、還沒分解完的東西
    for (let i = 0; i < n; i++) {
      const a = 2.2 + i * 1.05, px = Math.cos(a) * 12, py = 11 + Math.sin(a) * 5;
      c.beginPath(); c.arc(px, py, 6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill(); c.strokeStyle = 'rgba(58,41,71,.5)'; c.lineWidth = 1; c.stroke();
      if (kind === 'vir') { c.beginPath(); c.arc(px, py, 3, 0, TAU); c.fillStyle = P.vir; c.fill(); }
      else { c.save(); c.translate(px, py); c.rotate(i + ph * .2); c.beginPath(); c.roundRect(-4, -1.8, 8, 3.6, 1.8); c.fillStyle = P.bac; c.fill(); c.restore(); }
    }
  }
  // 巨噬細胞（守衛）：變形蟲一樣的大細胞，細胞核像腰果
  A.mac = function (x, y, s, o) {
    o = o || {}; const ph = o.ph || 0, sq = o.gulp ? 1 + .16 * Math.sin(o.gulp * Math.PI) : 1;
    c.save(); c.translate(x, y); c.scale(s * sq, s / sq);
    blob(0, 0, 27, o.seed || 1, ph, .09, 10); c.fillStyle = P.mac; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    c.strokeStyle = P.nucleus; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.arc(-3, -9, 9, Math.PI * 1.02, Math.PI * 1.9); c.stroke();
    contents(o.stomach || 0, o.food, ph);
    A.face(1, 0, 1.12, o.mood || (o.full ? 'sleep' : ''), P.ink, ph);
    c.restore();
  };
  // 嗜中性球（援軍）：細胞核分成幾葉，細胞質裡有顆粒
  A.neu = function (x, y, s, o) {
    o = o || {}; const ph = o.ph || 0, sq = o.gulp ? 1 + .16 * Math.sin(o.gulp * Math.PI) : 1;
    c.save(); c.translate(x, y); c.scale(s * sq, s / sq);
    blob(0, 0, 21, o.seed || 2, ph, .05, 9); c.fillStyle = P.neu; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(214,120,150,.55)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(Math.cos(i * 2.4) * (8 + (i % 3) * 4), 6 + Math.sin(i * 2.4) * 8, 1.1, 0, TAU); c.fill(); }
    c.strokeStyle = P.nucleusDk; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-9, -8); c.quadraticCurveTo(0, -14, 9, -8); c.stroke();
    c.fillStyle = P.nucleusDk; for (const [nx, ny, nr] of [[-9, -8, 5.2], [0, -12, 5], [9, -8, 5.2]]) { c.beginPath(); c.arc(nx, ny, nr, 0, TAU); c.fill(); }
    contents(o.stomach || 0, o.food, ph);
    A.face(0, 2, .95, o.mood || 'focus', P.ink, ph);
    c.restore();
  };
  // 樹突細胞（偵察兵）：有許多突起
  A.dc = function (x, y, s, o) {
    o = o || {}; const ph = o.ph || 0;
    c.save(); c.translate(x, y); c.scale(s, s); c.beginPath();
    for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8 + Math.sin(ph * .7) * .05, r = a % 2 ? 13.5 : 27 + Math.sin(ph * 2 + a) * 2; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    c.closePath(); c.lineJoin = 'round'; c.fillStyle = P.dc; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 2; c.stroke();
    A.face(0, -1, 1, o.mood || 'focus', P.ink, ph);
    if (o.card) A.card(15, 12, .42, o.card);
    c.restore();
  };
  // 淋巴球（T／B 細胞）：細胞核大到只剩薄薄一圈細胞質。o：{kind:'T'|'B', mem, code, glow, mood, bare, shake, t}
  A.lymph = function (x, y, r, o) {
    o = o || {}; const t = o.t || 0; x += o.shake ? Math.sin(t * 46) * 4 * o.shake : 0;
    if (o.glow) { c.fillStyle = 'rgba(226,160,44,.34)'; c.beginPath(); c.arc(x, y, r + 7 + Math.sin(t * 6) * 1.5, 0, TAU); c.fill(); }
    c.fillStyle = P.lymph; c.strokeStyle = P.ink; c.lineWidth = Math.max(1.3, r / 10.5); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = o.mem ? P.mem : o.kind === 'B' ? P.bcell : P.tcell; c.beginPath(); c.arc(x, y + .5, r * .74, 0, TAU); c.fill();
    A.face(x, y - 1, r / 19, o.mood || '', '#fff', o.ph);
    if (o.mem) {                                              // 記憶細胞的緞帶（比喻）
      c.fillStyle = P.teal; c.strokeStyle = P.ink; c.lineWidth = 1.2; c.beginPath();
      c.moveTo(x + r * .5, y + r * .55); c.lineTo(x + r * 1.02, y + r * .5); c.lineTo(x + r, y + r * 1.28); c.lineTo(x + r * .76, y + r * 1.02); c.lineTo(x + r * .52, y + r * 1.28); c.closePath(); c.fill(); c.stroke();
    }
    if (o.code && !o.bare) {
      const py = y - r - 10; c.fillStyle = '#fff'; c.strokeStyle = P.ink; c.lineWidth = 1.4; c.beginPath(); c.roundRect(x - 21, py - 8.5, 42, 17, 8.5); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x, py + 8.5); c.lineTo(x, y - r); c.stroke();
      for (let i = 0; i < 3; i++) A.glyph(o.code[i], x - 13 + i * 13, py, 4.7, false);
    }
  };
  A.glyph = function (t, x, y, s, fill) {
    c.beginPath();
    if (t === 0) { c.moveTo(x, y - s); c.lineTo(x + s * .95, y + s * .75); c.lineTo(x - s * .95, y + s * .75); c.closePath(); }
    else if (t === 1) c.arc(x, y, s * .88, 0, TAU);
    else c.rect(x - s * .78, y - s * .78, s * 1.56, s * 1.56);
    c.lineJoin = 'round';
    if (fill) { c.fillStyle = GC[t]; c.fill(); c.strokeStyle = P.ink; c.lineWidth = Math.max(1, s * .13); c.stroke(); }
    else { c.fillStyle = '#fff'; c.fill(); c.strokeStyle = GC[t]; c.lineWidth = Math.max(1.6, s * .42); c.stroke(); }
  };
  // 情報卡（抗原＝病原體的特徵樣本）：不是會行動的角色
  A.card = function (x, y, s, code) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#fff'; c.strokeStyle = P.ink; c.lineWidth = 2; c.beginPath(); c.roundRect(-52, -21, 104, 42, 10); c.fill(); c.stroke();
    for (let i = 0; i < 3; i++) A.glyph(code[i], -30 + i * 30, 0, 10.5, true);
    c.restore();
  };
  A.antibody = function (x, y, rot, s, a) {                    // 抗體：Y 字形的蛋白質，不是細胞，所以不畫表情
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s || 1, s || 1); c.globalAlpha = a === undefined ? 1 : a;
    c.strokeStyle = '#8a5a12'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0, 10); c.lineTo(0, 0); c.lineTo(-7, -8); c.moveTo(0, 0); c.lineTo(7, -8); c.stroke();
    c.strokeStyle = P.gold; c.lineWidth = 2.8; c.stroke(); c.restore();
  };
  A.rbc = function (x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    c.beginPath(); c.ellipse(0, 0, 9, 6, 0, 0, TAU); c.fillStyle = P.blood; c.fill(); c.strokeStyle = P.bloodDk; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.ellipse(0, 0, 4, 2.4, 0, 0, TAU); c.fillStyle = 'rgba(201,84,95,.45)'; c.fill(); c.restore();
  };
  A.badge = function (x, y, str, fg, bg, px) {
    c.font = A.font(px || 12, 700); const w = c.measureText(str).width + 12;
    c.fillStyle = bg || '#fff'; c.strokeStyle = P.ink; c.lineWidth = 1.3; c.beginPath(); c.roundRect(x - w / 2, y - 9, w, 18, 9); c.fill(); c.stroke();
    c.fillStyle = fg || P.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, x, y + .5); c.textBaseline = 'alphabetic';
  };
  A.arrow = function (x0, y0, x1, y1, col, t) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, a = 20, b = d - 22;
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3; c.lineCap = 'round'; c.setLineDash([7, 6]); c.lineDashOffset = -(t || 0) * 22;
    c.beginPath(); c.moveTo(x0 + ux * a, y0 + uy * a); c.lineTo(x0 + ux * b, y0 + uy * b); c.stroke(); c.setLineDash([]);
    const hx = x0 + ux * (b + 9), hy = y0 + uy * (b + 9); c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - ux * 11 - uy * 6.5, hy - uy * 11 + ux * 6.5); c.lineTo(hx - ux * 11 + uy * 6.5, hy - uy * 11 - ux * 6.5); c.closePath(); c.fill();
    c.restore();
  };
})(window.IW);
