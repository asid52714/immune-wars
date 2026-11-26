'use strict';
/* =====================================================================
   免疫系統大作戰 Immune Wars — 共用核心（語言、存檔、音效、工具）
   傳統 <script> 載入，不用模組：直接雙擊 index.html 離線開檔也能玩。
   ===================================================================== */
window.IW = window.IW || {};
(function (IW) {
  /* ---------------- 存檔：只放在這台裝置的 localStorage，不連網 ---------------- */
  const KEY = 'iw_body_v1';
  const fresh = () => ({ v: 1, lang: null, mute: false, speed: 1, relax: false, bodySeed: (Math.random() * 2 ** 31) | 0,
    ch: {}, mem: {}, hist: {}, codex: {}, tips: {} });
  let save = fresh();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) save = Object.assign(fresh(), s); } catch (e) { /* 讀不到就用新的 */ }
  IW.save = save;
  IW.store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 存不進去也照樣玩 */ } };
  IW.resetSave = () => { const l = save.lang, m = save.mute; for (const k in save) delete save[k]; Object.assign(save, fresh(), { lang: l, mute: m }); IW.store(); };

  /* ---------------- 語言：tx('中文','English') 就地成對；晚一點才顯示的存成 [中文,English] 再 pick() ---------------- */
  const norm = v => /^en/i.test(v || '') ? 'en' : /^zh/i.test(v || '') ? 'zh' : null;
  let LANG = null;
  try { LANG = norm(new URLSearchParams(location.search).get('lang')); } catch (e) { /* ignore */ }
  if (!LANG) LANG = norm(save.lang);
  if (!LANG) LANG = /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  const langSubs = [];
  IW.lang = () => LANG;
  IW.tx = (zh, en) => LANG === 'en' ? en : zh;
  IW.pick = a => Array.isArray(a) ? a[LANG === 'en' ? 1 : 0] : a;
  IW.onLang = f => langSubs.push(f);
  IW.setLang = l => {
    l = norm(l); if (!l || l === LANG) return; LANG = l; save.lang = l; IW.store();
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-Hant-TW';
    for (const f of langSubs) try { f(); } catch (e) { console.error(e); }
  };
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-Hant-TW';

  /* ---------------- 小工具 ---------------- */
  IW.$ = id => document.getElementById(id);
  IW.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  IW.lerp = (a, b, u) => a + (b - a) * u;
  IW.ease = u => { u = IW.clamp(u, 0, 1); return u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };
  IW.rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  IW.shuffle = (a, r) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  IW.wait = ms => new Promise(r => setTimeout(r, ms / (save.speed || 1)));   // 動畫等待：快轉時縮短
  IW.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  IW.touch = matchMedia('(pointer:coarse)').matches;
  addEventListener('pointerdown', e => { IW.touch = e.pointerType !== 'mouse'; IW.audio(); }, true);
  IW.reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------------- 音效：全部用 WebAudio 即時合成，沒有音檔 ---------------- */
  let AC = null;
  IW.audio = () => {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 沒有音效也能玩 */ } }
    if (AC && AC.state === 'suspended') AC.resume().catch(() => { });
    return AC;
  };
  function tone(f0, f1, dur, type, vol, delay) {
    if (!AC || save.mute) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .08, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .03);
  }
  IW.tone = tone;
  const S = {
    select: () => tone(520, 760, .08, 'triangle', .06), move: () => tone(200, 130, .18, 'sine', .1),
    gulp: () => { tone(320, 90, .16, 'sine', .18); tone(140, 340, .12, 'sine', .1, .15); },
    pop: d => tone(700 + Math.random() * 300, 1250, .06, 'triangle', .045, d), spread: () => tone(240, 430, .22, 'sawtooth', .025),
    hurt: () => tone(110, 52, .32, 'triangle', .16), flare: () => { tone(180, 520, .35, 'sawtooth', .04); tone(90, 140, .35, 'sine', .09); },
    calm: () => { tone(700, 350, .45, 'sine', .08); tone(1050, 525, .45, 'sine', .035); }, deny: () => tone(150, 130, .1, 'square', .03),
    turn: () => tone(440, 660, .12, 'triangle', .055), arrive: () => { tone(392, 392, .18, 'triangle', .09); tone(587, 587, .3, 'triangle', .09, .12); },
    seal: () => tone(260, 180, .4, 'triangle', .09), infect: () => tone(160, 90, .22, 'sine', .09),
    antigen: () => { tone(500, 900, .2, 'triangle', .07); tone(900, 1300, .2, 'triangle', .05, .15); },
    ab: () => [880, 1040, 1320].forEach((f, i) => tone(f, f * 1.02, .22, 'triangle', .05, i * .06)),
    ctl: () => { tone(300, 120, .12, 'square', .05); tone(900, 500, .2, 'triangle', .06, .1); },
    ok: () => { tone(523, 523, .14, 'triangle', .09); tone(784, 784, .25, 'triangle', .09, .1); },
    no: () => tone(190, 140, .16, 'square', .03), tick: () => tone(90, 60, .25, 'sine', .14),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .55, 'triangle', .1, i * .11)),
    lose: () => [330, 277, 220, 156].forEach((f, i) => tone(f, f * .96, .75, 'sine', .12, i * .3)),
    card: () => [659, 880, 1175].forEach((f, i) => tone(f, f, .3, 'sine', .07, i * .09))
  };
  IW.sfx = k => { if (S[k]) S[k](); };
  IW.setMute = v => { save.mute = !!v; IW.store(); };
  // 環境心跳：局勢越緊繃跳得越快、越清楚。level 0 完全安靜。
  let beat = 0, beatT = 0;
  IW.setBeat = v => { beat = IW.clamp(v, 0, 1); };
  IW.tickBeat = dt => {
    if (!AC || save.mute || beat <= .02) { beatT = 0; return; }
    beatT -= dt;
    if (beatT <= 0) { beatT = 60 / (58 + beat * 62); const v = .03 + beat * .09; tone(62, 44, .13, 'sine', v); tone(54, 40, .11, 'sine', v * .7, .17); }
  };
})(window.IW);
