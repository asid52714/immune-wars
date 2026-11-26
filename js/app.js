'use strict';
/* =====================================================================
   主選單、記憶冊、圖鑑、「這款遊戲簡化了什麼」，以及頁面切換（#menu／#skin／#airway／#return／#codex／#notes）。
   整個遊戲是單一頁面：章節之間不重新載入，進度與記憶冊存在這台裝置上。
   ===================================================================== */
(function (IW) {
  const { $, tx, pick, art: A, battle: B } = IW, P = A.P, S = IW.save;
  const CH = ['skin', 'airway', 'return', 'abx'];
  const INFO = {
    skin: { n: ['第 1 章', 'Chapter 1'], t: ['皮膚防線', 'The Skin Barrier'], d: ['皮膚破了洞，細菌溜進來。帶領巨噬細胞吞掉它們，並拿捏發炎的力道：太弱擋不住，太強會傷到自己。', 'The skin is broken and bacteria slip in. Lead your macrophages to engulf them, and keep inflammation in balance: too weak and it cannot hold them, too strong and it hurts your own tissue.'] },
    airway: { n: ['第 2 章', 'Chapter 2'], t: ['病毒來了', 'A Virus Arrives'], d: ['病毒會鑽進細胞，把它變成工廠。守衛先頂住，偵察兵把情報送到淋巴結，由你親手找出認得它的 T 細胞。', 'Viruses get inside cells and turn them into factories. Guards hold the line while a scout takes intel to the lymph node, where you find the T cell that recognizes it.'] },
    return: { n: ['第 3 章', 'Chapter 3'], t: ['捲土重來', 'The Comeback'], d: ['同一種病毒又來了，這次你的身體記得它。接著是一種新的病毒，以及一個選擇：要不要先接種疫苗。', 'The same virus returns, and this time your body remembers. Then comes a new virus, and a choice: get vaccinated first, or not.'] },
    abx: { n: ['第 4 章', 'Chapter 4'], t: ['漏網之魚', 'The Ones That Slip Through'], d: ['傷口太深，細菌多到守衛忙不過來，這次有抗生素幫忙。但總有幾隻不怕它。藥沒有改變細菌，只決定了誰留下來。', 'A deep wound, more bacteria than the guards can handle, and this time an antibiotic to help. But a few are never affected by it. The drug does not change the bacteria; it only decides which ones are left.'] }
  };
  function mini(cv, w, h, fn) { const d = Math.min(2.5, devicePixelRatio || 1); cv.width = w * d; cv.height = h * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); A.use(c); fn(c); }
  const THUMB = {
    skin(c) { c.fillStyle = '#fdf3f1'; c.fillRect(0, 0, 320, 130); for (let i = 0; i < 6; i++) A.cell(26 + i * 60, 96 + (i % 2) * 14, { seed: i, hp: i === 3 ? 2 : 3 }); A.inflame(146, 96, 2, 1); A.rod(140, 84, .5, 1, 'evil', 1); A.rod(160, 100, 2.2, 1, 'evil', 2); A.mac(84, 62, 1, { ph: 1, stomach: 1 }); A.neu(232, 58, 1, { ph: 2 }); for (let x = -10; x < 330; x += 42) { c.fillStyle = P.skin; c.strokeStyle = P.skinDk; c.lineWidth = 1.2; if (x > 110 && x < 180) continue; c.beginPath(); c.roundRect(x, 6, 40, 12, 6); c.fill(); c.stroke(); } },
    airway(c) { c.fillStyle = P.lumen; c.fillRect(0, 0, 320, 130); c.fillStyle = '#fdf3f1'; c.fillRect(0, 44, 320, 86); for (let i = 0; i < 6; i++) A.cell(26 + i * 60, 96 + (i % 2) * 14, { seed: i + 3, st: i === 2 ? 1 : 0 }); A.virion(60, 26, 1.1, 1); A.virion(150, 20, .9, 2); A.virion(206, 84, .8, 3); A.mac(262, 70, .95, { ph: 1, food: 'vir', stomach: 1 }); A.dc(94, 78, .9, { ph: 1, mood: '' }); },
    return(c) { c.fillStyle = '#ece2f6'; c.fillRect(0, 0, 320, 130); const code = IW.lymph.body().virus.A; [[52, 80, 0], [112, 84, 1], [172, 80, 1], [232, 84, 0]].forEach(([x, y, m], i) => A.lymph(x, y, 19, { code: m ? code : [(i + 1) % 3, i % 3, (i + 2) % 3], mem: m ? 'A' : null, t: 1 })); A.antibody(282, 70, .2, 1.8); A.antibody(296, 100, -.4, 1.3); },
    abx(c) { c.fillStyle = '#fdf3f1'; c.fillRect(0, 0, 320, 130); c.fillStyle = '#f6efe7'; c.fillRect(0, 0, 320, 30); for (let x = -10; x < 330; x += 42) { c.fillStyle = P.skin; c.strokeStyle = P.skinDk; c.lineWidth = 1.2; c.beginPath(); c.roundRect(x, 26, 40, 12, 6); c.fill(); c.stroke(); }
      for (let i = 0; i < 6; i++) A.cell(26 + i * 60, 100 + (i % 2) * 14, { seed: i + 5, hp: i === 2 ? 2 : 3 });
      [0, 1, 2, 3, 4, 5, 6].forEach(i => i % 3 === 1 ? A.rod(26 + i * 45, 14, .2, .8, 'calm', i, 1, i === 4) : A.coccus(26 + i * 45, 14, .9, i));
      A.rod(70, 78, .4, 1, 'worry', 1, .35); A.rod(120, 92, 2.2, 1, 'worry', 2, .35); A.rod(214, 74, 1.2, 1, 'worry', 3, .35); A.rod(168, 84, -.3, 1.25, 'evil', 2, 1, true);
      A.pill(96, 62, .6, 1.3); A.pill(150, 56, -.5, 1.3); A.pill(236, 100, 1.1, 1.3); A.mac(276, 74, .95, { ph: 1 }); }
  };

  /* ---------------- 主選單 ---------------- */
  function menu() {
    B.close(); const next = CH.find(k => !(S.ch[k] || {}).done), started = CH.some(k => S.ch[k]), body = IW.lymph.body();
    const stat = k => { const c = S.ch[k]; return !c ? '' : c.done ? `<em><i>${'★'.repeat(c.stars || 1)}</i> ${tx('已完成', 'Completed')}</em>` : `<em>${tx('進行中', 'In progress')}</em>`; };
    const memCard = v => { const m = S.mem[v]; return m ? `<div><canvas data-code="${v}"></canvas><b>${v === 'A' ? tx('病毒 甲', 'Virus A') : tx('病毒 乙', 'Virus B')}</b><em>${m.from === 'vaccine' ? tx('已接種疫苗', 'Vaccinated') : tx('得過，已經記得', 'Had it; remembered')}</em><span>${tx('淋巴結裡有 4 個認得它的記憶細胞。', 'Four memory cells in the lymph node recognize it.')}</span></div>`
      : `<div class="q"><b>？？？</b><span>${tx('還沒遇過。第一次會比較辛苦。', 'Not met yet. The first time is the hard one.')}</span></div>`; };
    const floraCard = () => {                                 /* 第 4 章：皮膚上的菌群也是這個身體的一部分 */
      const X = IW.modeAbx, c = S.ch.abx; if (!c || !(c.b1 || c.done)) return `<div class="q" style="grid-column:span 2"><b>${tx('皮膚上的細菌', 'Bacteria on the skin')}</b><span>${tx('它們一直都在。第 4 章會認識它們。', 'They have been there all along. You will meet them in Chapter 4.')}</span></div>`;
      const f = X.flora(), n = IW.abx.census(f), n0 = IW.abx.census(X.base());
      return `<div style="grid-column:span 2">${X.floraSvg([['', f]], true)}<b>${tx('皮膚上的細菌', 'Bacteria on the skin')}</b><em style="color:${n.R > n0.R ? '#a8651a' : ''}">${tx(`12 個位子裡，${n.R} 個不怕那種抗生素（原本 ${n0.R} 個）`, `${n.R} of 12 spots unaffected by that antibiotic (originally ${n0.R})`)}</em><span>${tx('變得有抗藥性的是細菌，不是你的身體。每用一次抗生素，怕藥的少一些，不怕的補上來。', 'It is the bacteria that become resistant, not your body. Each time an antibiotic is used, fewer of the sensitive ones remain and the unaffected ones fill in.')}</span></div>`; };
    $('app').innerHTML = `<div class="menu"><header><div><h1>${tx('免疫系統大作戰', 'Immune Wars')}</h1>
        <p class="sub">${tx('帶領免疫細胞守住同一個身體。打過的仗，它會記得。', 'Lead the immune cells that defend one body. What it has fought, it remembers.')}</p></div>
        <button class="ic" id="mMute">${S.mute ? '×' : '♪'}</button><button class="ic" id="mLang" style="width:auto;padding:0 14px">${IW.lang() === 'en' ? '中文' : 'English'}</button></header>
      <div class="hero"><button class="pill pri" id="mGo">${next ? (started ? tx('繼續：', 'Continue: ') : tx('開始：', 'Start: ')) + pick(INFO[next].n) + ' ' + pick(INFO[next].t) + ' ▸' : tx('四章都完成了。再玩一次第 1 章 ▸', 'All four chapters done. Replay Chapter 1 ▸')}</button></div>
      <div class="chs">${CH.map(k => `<button class="ch" data-ch="${k}"><canvas data-th="${k}"></canvas><div><small>${pick(INFO[k].n)}</small><b>${pick(INFO[k].t)}</b><span>${pick(INFO[k].d)}</span>${stat(k)}</div></button>`).join('')}</div>
      <h2>${tx('記憶冊', 'Memory album')}</h2>
      <div class="album">${memCard('A')}${memCard('B')}<div class="q"><b>${tx('傷口的細菌', 'Wound bacteria')}</b><span>${tx('先天防線每次的反應方式大致相同，不會像 T、B 細胞那樣留下專門認得某一種敵人的長期記憶。', 'The innate defenses respond in much the same way each time; they do not keep the kind of specific, long-term memory that T and B cells do.')}</span></div>${floraCard()}</div>
      <div class="links"><a class="pill" href="#codex" style="text-decoration:none;display:inline-flex;align-items:center">${tx('細胞圖鑑', 'Cell guide')}</a><a class="pill" href="#notes" style="text-decoration:none;display:inline-flex;align-items:center">${tx('這款遊戲簡化了什麼', 'What this game simplifies')}</a>
        <button class="pill" id="mRelax">${tx('淋巴結計時：', 'Lymph node timer: ')}${S.relax ? tx('關（放鬆模式）', 'off (relaxed)') : tx('開', 'on')}</button><button class="pill" id="mReset">${tx('清除進度', 'Reset progress')}</button></div>
      <footer>${tx('Prototype v0.11 候選版｜免費、開源（MIT）的醫學科普遊戲。離線可玩，進度只存在這台裝置。這不是醫療建議；回合與數值是為了好玩而做的簡化。', 'Prototype v0.11 candidate | A free, open-source (MIT) science-education game. Plays offline; progress is stored only on this device. This is not medical advice; turns and numbers are simplified for play.')}
        <br>${tx('如果你喜歡這款遊戲，歡迎在 GitHub 給予 Star，或提供改善建議。', 'Enjoyed the game? Give us a star on GitHub or share your feedback.')} <a href="https://github.com/asid52714/immune-wars" target="_blank" rel="noopener">${tx('在 GitHub 給予 Star', 'Star on GitHub')}</a> · <a href="https://github.com/asid52714/immune-wars/issues" target="_blank" rel="noopener">${tx('意見回饋', 'Share Feedback')}</a></footer></div>`;
    document.querySelectorAll('[data-th]').forEach(cv => mini(cv, 320, 130, THUMB[cv.dataset.th]));
    document.querySelectorAll('[data-code]').forEach(cv => mini(cv, 104, 42, () => A.card(52, 21, .95, body.virus[cv.dataset.code])));
    document.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { location.hash = '#' + b.dataset.ch; });
    $('mGo').onclick = () => { location.hash = '#' + (next || 'skin'); };
    $('mLang').onclick = () => IW.setLang(IW.lang() === 'en' ? 'zh' : 'en');
    $('mMute').onclick = () => { IW.setMute(!S.mute); menu(); };
    $('mRelax').onclick = () => { S.relax = !S.relax; IW.store(); menu(); };
    $('mReset').onclick = e => { const b = e.currentTarget; if (b.dataset.sure) { IW.resetSave(); menu(); } else { b.dataset.sure = 1; b.textContent = tx('確定清除？再按一次', 'Sure? Press again'); b.style.borderColor = P.danger; b.style.color = P.danger; } };
    scrollTo(0, 0);
  }

  /* ---------------- 圖鑑：遇過才解鎖；動畫教學的內容改放在這裡，想看的人再看 ---------------- */
  const CX = [
    { id: 'tissue', n: ['組織細胞', 'Tissue cell'], a: ['居民', 'the residents'], d: c => { A.cell(38, 38, { seed: 2 }); }, s: .78,
      t: ['構成身體的一般細胞。細菌、病毒或過強的發炎都會讓它受損。遊戲裡健康的細胞沒有表情，出事了才有。', 'The ordinary cells that make up the body. Bacteria, viruses, or inflammation that is too strong can all damage them. In the game, healthy cells have no face; only troubled ones do.'],
      m: ['畫面的粉色與紫色來自病理切片常用的 H&E 染色：蘇木素把細胞核染成藍紫色，伊紅把細胞質染成粉紅色。', 'The pinks and purples come from H&E staining, common in pathology slides: hematoxylin stains nuclei blue-purple and eosin stains cytoplasm pink.'] },
    { id: 'bac', n: ['細菌', 'Bacteria'], a: ['入侵者', 'the invaders'], d: c => { A.rod(30, 30, .5, 1.3, 'evil', 1); A.rod(48, 50, 2.4, 1.1, 'calm', 2); },
      t: ['細菌自己就是一個完整的細胞，環境適合時一個分裂成兩個。皮膚完整時它們進不來；傷口是入口。', 'A bacterium is a complete cell on its own, and divides in two when conditions suit it. Intact skin keeps them out; a wound is a way in.'],
      m: ['不是所有細菌都有害。皮膚上住著許多無害、甚至有益的細菌。遊戲裡只有正在造成感染的才畫成反派。', 'Not all bacteria are harmful. Many harmless or even helpful ones live on the skin. Only the ones causing an infection are drawn as villains.'] },
    { id: 'mac', n: ['巨噬細胞', 'Macrophage'], a: ['守衛', 'the guard'], d: c => { A.mac(38, 40, 1.15, { ph: 1, stomach: 1 }); },
      t: ['平常就住在組織裡的大細胞。它把細菌或病毒包進體內分解，這叫吞噬作用。一次裝不了太多，要消化後才能再吞。', 'A large cell that already lives in the tissue. It wraps up bacteria or viruses and breaks them down inside: phagocytosis. It cannot hold many at once and must digest before engulfing more.'],
      m: ['血液裡的單核球，細胞核常是凹陷的馬蹄形。它離開血管進入組織後，可以成熟為巨噬細胞。', 'Monocytes in the blood often have an indented, horseshoe-shaped nucleus. After leaving the bloodstream for the tissue, they can mature into macrophages.'] },
    { id: 'inflam', n: ['發炎', 'Inflammation'], a: ['求援訊號', 'the call for help'], d: c => { A.cell(38, 38, { seed: 1 }); A.inflame(38, 38, 2, 1); }, s: .78,
      t: ['受傷或感染的地方變得紅、腫、熱、痛。這是身體啟動的防禦反應，也是召集更多免疫細胞的訊號。過強或拖太久，會連正常組織一起傷到。', 'An injured or infected area turns red, swollen, warm and painful. It is a defensive response the body switches on, and a signal that recruits more immune cells. Too strong or too long, and it damages healthy tissue too.'],
      m: ['組織胺等化學訊號讓附近的血管擴張、變得比較容易通透，更多液體與白血球因此進入組織。', 'Chemical signals such as histamine widen nearby blood vessels and make them leakier, letting more fluid and white blood cells into the tissue.'] },
    { id: 'neu', n: ['嗜中性球', 'Neutrophil'], a: ['援軍', 'the reinforcements'], d: c => { A.neu(38, 40, 1.3, { ph: 1 }); },
      t: ['血液裡數量最多的白血球，通常是最先大量趕到感染現場的援軍。吞得快，但壽命很短，吞完細菌後自己也會死去。', 'The most numerous white blood cells in the blood, and usually the first to arrive in large numbers at an infection. They engulf quickly but are short-lived, dying after they have done so.'],
      m: ['細胞核分成 2 到 5 葉是它的特徵。傷口的膿，主要就是死去的嗜中性球、細胞殘骸與組織液。', 'A nucleus with two to five lobes is its hallmark. Pus in a wound is mostly dead neutrophils, cell debris and tissue fluid.'] },
    { id: 'virus', n: ['病毒', 'Virus'], a: ['入侵者', 'the invaders'], d: c => { A.virion(38, 38, 2, 1); },
      t: ['比細菌小得多，自己不會複製。它必須進入細胞，借用細胞的設備製造新的病毒，再釋放出去感染別的細胞。', 'Far smaller than bacteria, and unable to copy itself. It has to enter a cell and use the cell’s machinery to make new viruses, which are then released to infect other cells.'], m: null },
    { id: 'infected', n: ['受感染的細胞', 'Infected cell'], a: ['受害者，不是反派', 'a victim, not a villain'], d: c => { A.cell(38, 38, { st: 1, seed: 2, t: 1 }); A.virion(24, 50, .5, 1); A.virion(54, 46, .5, 2); }, s: .78,
      t: ['被病毒佔用、變成病毒工廠的細胞。它是受害者。但只要它還在，就會不斷放出新病毒，所以免疫系統會讓它提早結束。', 'A cell taken over by a virus and turned into a virus factory. It is a victim. But as long as it lasts it keeps releasing new viruses, so the immune system ends it early.'], m: null },
    { id: 'dc', n: ['樹突細胞', 'Dendritic cell'], a: ['偵察兵', 'the scout'], d: c => { A.dc(38, 38, 1.1, { ph: 1, mood: '' }); },
      t: ['它在組織裡收集入侵者的特徵（抗原），帶到淋巴結給 T 細胞看，適應性免疫才因此啟動。遊戲裡把這份特徵畫成一張情報卡。', 'It collects the invader’s features (antigens) in the tissue and carries them to a lymph node to show T cells, which is what starts the adaptive response. The game draws those features as an intel card.'],
      m: ['真實的 T 細胞看的是樹突細胞表面「呈現」出來的抗原片段。遊戲把這一步簡化成直接比對卡片。', 'Real T cells look at antigen fragments “presented” on the dendritic cell’s surface. The game simplifies this to checking a card directly.'] },
    { id: 'lymph', n: ['淋巴結', 'Lymph node'], a: ['集合點', 'the meeting point'], d: c => { c.fillStyle = '#ece2f6'; c.beginPath(); c.arc(38, 38, 34, 0, 6.283); c.fill(); A.lymph(26, 44, 13, { code: [0, 1, 2], t: 1 }); A.lymph(52, 46, 13, { bare: 1, t: 1 }); },
      t: ['T 細胞和 B 細胞聚集、等待的地方。每個 T 細胞天生帶著一種受體，種類極多。抗原進來時，只有受體吻合的少數細胞被選中、開始大量複製。這叫株系選擇。', 'Where T and B cells gather and wait. Each T cell is born with one kind of receptor, and there is an enormous variety. When an antigen arrives, only the few cells whose receptors fit are selected and start multiplying. This is clonal selection.'],
      m: ['沒有人在「挑」：T 細胞在淋巴結裡爬行，一個接一個碰觸樹突細胞。能認得某一種抗原的初始 T 細胞非常稀少，小鼠研究的估計大約是十萬到百萬分之一，遠比遊戲裡的 20 選 1 少。', 'Nobody “picks”: T cells crawl through the lymph node, touching one dendritic cell after another. Naive T cells that recognize any one antigen are very rare, roughly one in 100,000 to one in a million by estimates from mouse studies, far rarer than the game’s 1 in 20.'] },
    { id: 'tcell', n: ['毒殺 T 細胞', 'Cytotoxic T cell'], a: ['特勤隊員', 'the specialist'], d: c => { A.lymph(38, 40, 24, { bare: 1, t: 1, mood: 'focus' }); },
      t: ['被選中、複製出來的 T 細胞。它能認出受感染的細胞，讓那個細胞啟動自我了斷（細胞凋亡），裡面的病毒工廠跟著關閉。', 'The T cells produced after selection. They recognize infected cells and make them self-destruct (apoptosis), shutting down the virus factory inside.'],
      m: ['淋巴球的特徵是細胞核又大又圓，幾乎佔滿整個細胞。另一類「輔助 T 細胞」負責協調其他免疫細胞，遊戲裡沒有呈現。', 'A lymphocyte’s hallmark is a large round nucleus that nearly fills the cell. Another kind, helper T cells, coordinates other immune cells and is not shown in the game.'] },
    { id: 'ab', n: ['抗體', 'Antibody'], a: ['不是細胞，是蛋白質', 'a protein, not a cell'], d: c => { A.antibody(28, 40, -.2, 2.6); A.antibody(54, 36, .5, 1.8); },
      t: ['B 細胞被選中後變成漿細胞，分泌大量 Y 字形的抗體。抗體黏在細胞外的病毒上，讓它無法進入細胞。抗體自己也進不了細胞。', 'Selected B cells become plasma cells, which secrete large amounts of Y-shaped antibodies. Antibodies stick to viruses outside cells so they cannot get in. Antibodies cannot get inside cells either.'],
      m: ['B 細胞和 T 細胞一樣，也是靠株系選擇被挑出來的。遊戲只讓你親手找 T 細胞，B 細胞的部分濃縮成「抗體晚一回合就緒」。', 'B cells are picked by clonal selection just as T cells are. The game only has you search for the T cell; the B-cell side is condensed into “antibodies are ready one turn later”.'] },
    { id: 'memory', n: ['記憶細胞', 'Memory cell'], a: ['上次留下來的', 'left over from last time'], d: c => { A.lymph(38, 42, 22, { mem: 'A', bare: 1, t: 1 }); },
      t: ['感染結束後，一部分複製出來的 T、B 細胞留下來。同一種病原體再來時，它們數量多、反應快，所以第二次通常比較快好、也比較輕微。', 'After an infection, some of the copied T and B cells stay behind. When the same pathogen returns, there are more of them and they respond faster, so the second time is usually shorter and milder.'],
      m: ['記憶是專一的：一般只對同一種（或非常相似的）抗原有效。緞帶只是遊戲裡的記號。', 'Memory is specific: it generally works only against the same (or a very similar) antigen. The ribbon is just a marker in the game.'] },
    { id: 'vaccine', n: ['疫苗', 'Vaccine'], a: ['事先演習', 'a rehearsal'], d: c => { A.card(38, 38, .62, [0, 1, 2]); },
      t: ['疫苗讓免疫系統在沒有真正生病的情況下，先見過病原體的特徵（或製造這個特徵的指令），因此留下記憶細胞。之後真的遇到，就不必從頭找。', 'A vaccine lets the immune system meet a pathogen’s features (or instructions for making them) without the actual disease, leaving memory cells behind. When the real thing arrives, the search does not start from scratch.'],
      m: ['真實的疫苗各有不同的保護力、劑次與適用對象，請依照醫療專業人員與公共衛生單位的建議。遊戲不是醫療建議。', 'Real vaccines differ in protection, dosing and who they are for; follow the advice of health professionals and public-health authorities. This game is not medical advice.'] },
    { id: 'abx', n: ['抗生素', 'Antibiotic'], a: ['體外來的幫手', 'help from outside the body'], d: c => { A.pill(26, 30, .5, 2.1); A.pill(50, 50, -.6, 1.7); },
      t: ['能殺死細菌、或讓細菌停止生長的藥。它攻擊細菌才有的構造，所以對病毒沒有用：感冒和流感是病毒引起的，吃抗生素不會好得比較快。', 'A drug that kills bacteria or stops them growing. It attacks structures that bacteria have, so it does nothing to viruses: colds and flu are caused by viruses, and antibiotics will not make them clear up any sooner.'],
      m: ['很多抗生素原本是微生物製造的，例如青黴素（盤尼西林）來自一種黴菌。不同的抗生素對付的細菌不一樣，遊戲裡只有一種。要不要用、用哪一種、用多久，由醫療人員判斷；請照指示使用，不要吃別人的或上次剩下的藥。膠囊只是遊戲的記號。', 'Many antibiotics were first made by microbes; penicillin, for example, comes from a mould. Different antibiotics act on different bacteria, and the game has only one. Whether to use one, which one and for how long are decisions for a health professional; take them as directed, and do not use someone else’s or leftover antibiotics. The capsule is just a marker in the game.'] },
    { id: 'resist', n: ['抗藥性細菌', 'Resistant bacteria'], a: ['漏網之魚', 'the ones that slip through'], d: c => { A.rod(38, 38, .4, 2, 'evil', 1, 1, true); },
      t: ['有些細菌帶著讓某一種藥失效的基因。變得有抗藥性的是細菌，不是你的身體。藥殺死怕它的，不怕的留下來繼續分裂，比例就越來越高。', 'Some bacteria carry a gene that makes a particular drug useless against them. It is the bacteria that become resistant, not your body. The drug kills the ones it works on; the ones it does not work on are left to keep dividing, and their share grows.'],
      m: ['抗藥基因有兩種來源：分裂時偶然抄錯（突變），或從別的細菌拿到現成的基因。後者遊戲沒有呈現。真實的抗藥細菌外觀和一般細菌沒有差別，要靠檢驗才分得出來；條紋只是遊戲的記號。真實的突變也比遊戲裡罕見得多。', 'Resistance genes come from two sources: a chance copying error during division (a mutation), or a ready-made gene picked up from another bacterium. The game does not show the second. Real resistant bacteria look no different from ordinary ones and can only be told apart by testing; the stripes are just a marker in the game. Real mutations are also far rarer than in the game.'] },
    { id: 'flora', n: ['皮膚上的住戶', 'Residents on the skin'], a: ['常在菌', 'the normal flora'], d: c => { A.coccus(26, 30, 1.7, 1); A.coccus(50, 52, 1.4, 3); },
      t: ['身體表面和腸道裡住著大量細菌，大多數無害，有些還幫得上忙。它們佔著位子、用掉養分，別的細菌就不容易擴張。抗生素分不出誰是住戶，會連它們一起殺。', 'Huge numbers of bacteria live on the body’s surfaces and in the gut. Most are harmless and some are helpful. Because they hold the space and use up the nutrients, other bacteria cannot easily expand. An antibiotic cannot tell who the residents are and kills them too.'],
      m: ['有些細菌平常相安無事，進到不該去的地方才造成感染，例如從傷口進入組織。遊戲把這一類叫作「伺機菌」。平常無害的住戶，在少數情況下（例如體內有導管或植入物、免疫力較弱時）也可能造成感染。', 'Some bacteria cause no trouble where they normally live and only cause infection when they get somewhere they should not be, such as into tissue through a wound. The game calls these “opportunists”. Even normally harmless residents can cause infection in some situations, for example around catheters or implants, or when immune defences are weak.'] },
    { id: 'select', n: ['篩選', 'Selection'], a: ['同一個原理，兩個方向', 'one principle, two directions'], d: c => { A.lymph(24, 44, 15, { bare: 1, t: 1 }); A.rod(54, 30, .5, 1.25, 'evil', 1, 1, true); },
      t: ['事先就有差異；環境留下其中一些；留下來的複製、變多。淋巴結裡，病毒的特徵留下了認得它的 T 細胞。用藥時，抗生素留下了不怕它的細菌。兩邊都沒有誰「學會」什麼。', 'Differences exist beforehand; the environment leaves some of them standing; what is left copies itself and becomes common. In the lymph node, a virus’s features left standing the T cell that recognized it. Under a drug, the antibiotic leaves standing the bacteria it does not work on. Neither side “learns” anything.'],
      m: ['生物學把這個過程叫作天擇（自然選擇）。每一次使用抗生素都是一次篩選，所以原則是：需要的時候才用。真的需要時，它的好處遠大於這個代價。', 'Biology calls this process natural selection. Every use of an antibiotic is a round of selection, which is why the principle is to use them only when they are needed. When one really is needed, its benefit far outweighs that cost.'] }
  ];
  function codex() {
    B.close();
    $('app').innerHTML = `<div class="page" style="max-width:980px"><p><a href="#menu">◂ ${tx('主選單', 'Menu')}</a></p><h1>${tx('細胞圖鑑', 'Cell guide')}</h1>
      <p class="note">${tx('在遊戲裡遇過的才會解鎖。表情、緞帶、「守衛」「偵察兵」這些稱呼都只是幫助辨認的比喻：細胞沒有情緒，也沒有指揮中心。', 'Entries unlock as you meet them in the game. Faces, ribbons and nicknames like “guard” and “scout” are only aids to recognition: cells have no emotions and no command center.')}</p>
      <div class="codex">${CX.map((e, i) => S.codex[e.id] ? `<div class="cx"><canvas data-cx="${i}"></canvas><b>${pick(e.n)}<small>${pick(e.a)}</small></b><p>${pick(e.t)}</p>${e.m ? `<details><summary>${tx('想多知道一點', 'A little more')}</summary>${pick(e.m)}</details>` : ''}</div>`
        : `<div class="cx q"><span></span><b>？？？<small>${tx('還沒遇過', 'Not met yet')}</small></b></div>`).join('')}</div></div>`;
    document.querySelectorAll('[data-cx]').forEach(cv => { const e = CX[+cv.dataset.cx]; mini(cv, 76, 76, c => { if (e.s) { c.translate(38, 38); c.scale(e.s, e.s); c.translate(-38, -38); } e.d(c); }); });
    scrollTo(0, 0);
  }
  function notes() {
    B.close(); const L = (zh, en) => `<li>${tx(zh, en)}</li>`;
    $('app').innerHTML = `<div class="page"><p><a href="#menu">◂ ${tx('主選單', 'Menu')}</a></p><h1>${tx('這款遊戲簡化了什麼', 'What this game simplifies')}</h1>
      <p>${tx('《免疫系統大作戰》想用「玩」讓人記住幾個免疫學的核心概念。為了好玩，很多地方做了簡化。這一頁把它們集中講清楚。', 'Immune Wars uses play to make a few core ideas of immunology stick. To be playable, it simplifies a lot. This page lists those simplifications in one place.')}</p>
      <p><b>${tx('這不是醫療建議。', 'This is not medical advice.')}</b> ${tx('身體不舒服、要不要接種疫苗，請詢問醫療專業人員。', 'If you are unwell, or deciding about a vaccine, ask a health professional.')}</p>
      <h2>${tx('整體', 'Overall')}</h2><ul>
        ${L('回合、行動點數、容量、發炎等級、「幾回合後抵達」都是遊戲數值，不是人體的固定數字。', 'Turns, action points, capacities, inflammation levels and “arrives in N turns” are game numbers, not fixed values of the human body.')}
        ${L('細胞沒有意識或情緒，也沒有人下令。「帶領」「下達指令」「守衛」「偵察兵」都是比喻。', 'Cells have no awareness or emotions, and nobody gives orders. “Lead”, “order”, “guard” and “scout” are metaphors.')}
        ${L('「組織健康」是遊戲化的整體損傷預算，不代表實際存活的細胞比例。', '“Tissue health” is a game-style overall damage budget, not the real share of surviving cells.')}
        ${L('真實的免疫反應有更多成員（補體、自然殺手細胞、輔助 T 細胞、干擾素……），遊戲只呈現一小部分。', 'Real immune responses involve many more players (complement, natural killer cells, helper T cells, interferons…). The game shows only a few.')}</ul>
      <h2>${tx('第 1 章：皮膚與發炎', 'Chapter 1: skin and inflammation')}</h2><ul>
        ${L('發炎分成 0～3 級、由玩家促進或調節，是遊戲規則。真實的發炎由許多化學訊號共同調控。', 'Inflammation in levels 0–3 that the player boosts or calms is a game rule. Real inflammation is regulated by many chemical signals together.')}
        ${L('「發炎區的細菌完全不擴散」是遊戲設定。真實的發炎有助於限制感染，但不保證完全擋住。', '“Bacteria in an inflamed area do not spread at all” is a game rule. Real inflammation helps limit infection but does not guarantee a complete block.')}
        ${L('火苗是發炎等級的記號，不是組織在燃燒。', 'Flames mark the inflammation level; the tissue is not burning.')}
        ${L('嗜中性球「吃飽就離場」是把它壽命短、吞噬後死亡的特性簡化。真實情況中單核球也會陸續趕到並成熟為巨噬細胞，遊戲沒有呈現。', 'Neutrophils “leaving when full” simplifies their short life and death after phagocytosis. In reality monocytes also arrive over time and mature into macrophages; the game does not show this.')}
        ${L('先天免疫不會形成 T、B 細胞那種專一的長期記憶。近年研究發現先天免疫細胞也有較短、較不專一的「訓練免疫」，遊戲沒有呈現。', 'Innate immunity does not form the specific, long-term memory that T and B cells do. Recent research describes a shorter, less specific “trained immunity” in innate cells, which the game does not show.')}</ul>
      <h2>${tx('第 2、3 章：病毒、淋巴結、記憶與疫苗', 'Chapters 2 and 3: viruses, the lymph node, memory and vaccines')}</h2><ul>
        ${L('淋巴結裡「找出吻合的 T 細胞」是株系選擇的比喻。真實情況沒有人在挑：T 細胞一個接一個碰觸樹突細胞，認得的才被活化。', 'Finding the matching T cell in the lymph node is a metaphor for clonal selection. In reality nobody picks: T cells touch one dendritic cell after another, and only those that recognize the antigen are activated.')}
        ${L('遊戲是 20 個細胞裡找 1 個。真實比例低得多（小鼠研究估計約十萬到百萬分之一）。', 'The game hides 1 match among 20 cells. The real proportion is far lower (roughly one in 100,000 to one in a million by estimates from mouse studies).')}
        ${L('三格形狀的「情報卡」代表抗原。真實的 T 細胞辨認的是樹突細胞表面呈現的抗原片段；B 細胞則直接辨認抗原。', 'The three-shape “intel card” stands for an antigen. Real T cells recognize antigen fragments presented on a dendritic cell’s surface; B cells recognize antigens directly.')}
        ${L('初次反應真實需要數天到數週才建立，遊戲壓縮成 2～4 回合。有記憶時較快，遊戲是 1～2 回合。', 'A real primary response takes days to weeks to build; the game compresses it to 2–4 turns. With memory it is faster; in the game, 1–2 turns.')}
        ${L('「4 個記憶細胞」「複製到 16 個」是為了手感定的數字。', '“Four memory cells” and “multiply to 16” are numbers chosen for feel.')}
        ${L('被感染的細胞不一定都會死，部分可能在病毒清除後存活。遊戲把它們都算成損失。', 'Infected cells do not always die; some may survive after the virus is cleared. The game counts them all as lost.')}
        ${L('記憶細胞被再次活化的途徑不只「樹突細胞送抗原」這一種；既有的抗體也能在再次感染時立刻發揮作用。遊戲為了單純沒有呈現。', 'Memory cells can be reactivated in more ways than a dendritic cell delivering antigen, and antibodies already present can act at once on reinfection. The game leaves these out for simplicity.')}
        ${L('疫苗有很多種：有的含減毒但仍會複製的病原體，有的只含病原體的一部分，或製造這個部分的指令。遊戲把它們都畫成「一張情報卡」。', 'There are many kinds of vaccine: some contain a weakened pathogen that can still multiply, others only a part of the pathogen or instructions for making that part. The game draws all of them as “an intel card”.')}
        ${L('「抗體比 T 細胞晚 1 回合、有記憶時同時就緒」是遊戲設定，不是真實的時間差。', '“Antibodies are ready 1 turn after T cells, or at the same time with memory” is a game rule, not a real timing difference.')}
        ${L('疫苗的保護力因疫苗與病原體而異，也可能隨時間下降。遊戲裡「接種＝有 4 個記憶細胞」只是示意。', 'How well a vaccine protects varies by vaccine and pathogen, and can wane over time. “Vaccinated = four memory cells” in the game is only an illustration.')}</ul>
      <h2>${tx('第 4 章：抗生素與抗藥性', 'Chapter 4: antibiotics and resistance')}</h2><ul>
        ${L('<b>遊戲裡的用藥不是用藥建議。</b>什麼時候按下抗生素由玩家決定，是為了讓後果看得見。真實世界裡，要不要用、用哪一種、用多久，由醫療人員判斷。請照指示使用，不要自己停藥或加藥，也不要吃別人的或上次剩下的藥。', '<b>Using the drug in the game is not advice about taking medicine.</b> The player decides when to press the antibiotic so that the consequences can be seen. In real life, whether to use one, which one and for how long are decisions for a health professional. Take antibiotics as directed, do not stop or extend treatment on your own, and do not use someone else’s or leftover ones.')}
        ${L('遊戲裡不用抗生素也可能打贏。真實的嚴重細菌感染需要及時治療；不要因為這款遊戲而拒絕或拖延醫師開的抗生素。', 'In the game it is possible to win without the antibiotic. A serious bacterial infection in real life needs timely treatment; do not refuse or delay an antibiotic a doctor has prescribed because of this game.')}
        ${L('「抗生素開始後持續到這一場結束，每回合換掉皮膚上一個位子」是遊戲設定，不代表真實療程的長度或效果。', '“Once started, the antibiotic runs to the end of the battle and replaces one spot on the skin per turn” is a game rule; it does not represent the length or effect of a real course of treatment.')}
        ${L('遊戲裡只有一種抗生素、一種抗藥性。真實的抗生素有很多種，抗藥的方式也很多，同一種細菌可能同時對好幾種藥有抗藥性。', 'The game has one antibiotic and one kind of resistance. In reality there are many antibiotics and many ways to resist them, and one bacterium can be resistant to several drugs at once.')}
        ${L('條紋是遊戲的記號。真實的抗藥細菌外觀看不出差別，要靠檢驗（例如培養與藥物敏感性試驗）才知道。', 'The stripes are a marker in the game. Real resistant bacteria look no different; it takes testing (such as culture and susceptibility testing) to know.')}
        ${L('「一按下去，怕藥的細菌全部死掉」是簡化。真實的抗生素需要時間，效果和藥物濃度有關；有些是殺死細菌，有些是讓細菌停止生長。', '“One press and every sensitive bacterium dies” is a simplification. Real antibiotics take time and depend on drug concentration; some kill bacteria and others stop them growing.')}
        ${L('遊戲裡的突變機率（每次分裂約 3%）比真實高出許多個數量級，為的是讓你在一場戰鬥裡有機會看到。', 'The game’s mutation chance (about 3% per division) is many orders of magnitude higher than in reality, so that you have a chance of seeing one within a battle.')}
        ${L('抗藥基因也能在細菌之間直接傳遞（水平基因轉移），甚至在不同種的細菌之間。遊戲沒有呈現。', 'Resistance genes can also pass directly between bacteria (horizontal gene transfer), even between different species. The game does not show this.')}
        ${L('帶著抗藥基因常常有代價，所以停止用藥後抗藥細菌有可能減少；但研究顯示這種逆轉通常很慢，抗藥細菌可能長期留著。遊戲裡皮膚上的條紋菌不會自己減少。', 'Carrying a resistance gene often has a cost, so resistant bacteria may decline once the drug is no longer used; but studies suggest this reversal is usually slow, and they can persist for a long time. In the game, striped bacteria on the skin never decline on their own.')}
        ${L('突變是偶然發生的，藥不能「指定」細菌變成不怕它的樣子。更精確地說：有些抗生素造成的壓力會讓細菌抄錯的頻率變高，但抄錯的方向仍然是隨機的。遊戲沒有呈現這一點。', 'Mutations happen by chance; a drug cannot “order” a bacterium to become unaffected by it. More precisely: stress from some antibiotics can make copying errors more frequent, but which errors occur is still random. The game does not show this.')}
        ${L('「巨噬細胞把漏網的抗藥細菌清掉」是遊戲的簡化。抗藥性本身不會讓細菌躲過免疫細胞，但有些細菌另有躲避免疫的本事。抗藥細菌造成的感染可能很嚴重，甚至致命，對免疫力較弱的人尤其如此；不能期待它自己好。', '“Macrophages clear the resistant bacteria that slip through” is a simplification. Resistance to a drug does not by itself shield a bacterium from immune cells, but some bacteria have separate ways of evading immunity. Infections caused by resistant bacteria can be serious, even fatal, especially for people with weaker immune defences; they cannot be expected to clear up on their own.')}
        ${L('抗生素主要攻擊細菌才有的構造，但不是對人體完全沒有影響：它可能有副作用。', 'Antibiotics mainly attack structures that bacteria have, but they are not without effect on the body: they can have side effects.')}
        ${L('皮膚上「12 個位子、三種細菌」是示意。真實的皮膚、鼻腔與腸道住著非常多種細菌；抗生素對各處菌群的影響，遊戲只用皮膚這一排代表。', '“Twelve spots and three kinds of bacteria” on the skin is a sketch. Real skin, noses and guts are home to a great many kinds of bacteria; the game uses the one row on the skin to stand for the effect of antibiotics on all of them.')}
        ${L('「同一格先吞有條紋的」是對玩家友善的遊戲設定，真實的吞噬細胞不會挑。', '“Striped ones are engulfed first on a tile” is a player-friendly game rule; real phagocytes do not choose.')}
        ${L('這一章只呈現一個身體。真實的抗藥細菌還會在人與人之間、在環境中傳播，所以抗藥性是整個社會的問題。', 'This chapter shows a single body. Real resistant bacteria also spread between people and through the environment, which is why resistance is a problem for whole societies.')}
        ${L('看起來像感冒的症狀，有時是需要治療的細菌感染。分辨它們是醫療人員的工作。', 'Symptoms that look like a cold are sometimes a bacterial infection that needs treatment. Telling them apart is a job for a health professional.')}</ul>
      <h2>${tx('這個版本還沒做到的', 'What this version has not done')}</h2><ul>
        ${L('沒有經過專業醫學審查，也沒有做過教育成效研究。文字敘述依據下列公開教材查證。', 'It has not had a professional medical review or any study of learning outcomes. The text was checked against the open textbooks below.')}
        ${L('英文沒有經過母語人士審查。', 'The English has not been reviewed by a native speaker.')}</ul>
      <h2>${tx('主要參考資料', 'Main references')}</h2><ul>
        <li>OpenStax, <i>Anatomy and Physiology 2e</i>, §18.4, §21.2–21.4 — <a href="https://openstax.org/details/books/anatomy-and-physiology-2e" target="_blank" rel="noopener">openstax.org</a></li>
        <li>OpenStax, <i>Microbiology</i>, §6.2, §17.3, §17.5, §18.1, §18.5 — <a href="https://openstax.org/details/books/microbiology" target="_blank" rel="noopener">openstax.org</a></li>
        <li>OpenStax, <i>Biology 2e</i>, §42.1–42.2 — <a href="https://openstax.org/details/books/biology-2e" target="_blank" rel="noopener">openstax.org</a></li>
        <li>WHO, “How do vaccines work?” — <a href="https://www.who.int/news-room/feature-stories/detail/how-do-vaccines-work" target="_blank" rel="noopener">who.int</a></li>
        <li>OpenStax, <i>Microbiology</i>, §11.5, §14.1–14.3, §14.5, §21.1 ${tx('（突變、抗生素的作用方式與選擇性、抗藥性、皮膚的正常菌群）', '(mutations, how antibacterial drugs work and why they are selective, drug resistance, normal microbiota of the skin)')}</li>
        <li>CDC, “About Antimicrobial Resistance”, “Antibiotic Do’s and Don’ts”, “About Microbial Ecology” — <a href="https://www.cdc.gov/antimicrobial-resistance/about/index.html" target="_blank" rel="noopener">cdc.gov</a>; WHO, “Antimicrobial resistance” — <a href="https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance" target="_blank" rel="noopener">who.int</a></li>
        <li>Buffie &amp; Pamer, <i>Nat Rev Immunol</i> 2013; Ankomah &amp; Levin, <i>PNAS</i> 2014 ${tx('（數學模型）', '(a mathematical model)')}; Andersson &amp; Hughes, <i>Nat Rev Microbiol</i> 2010; Kohanski et al., <i>Mol Cell</i> 2010 ${tx('（第 4 章）', '(Chapter 4)')}</li>
        <li>Netea et al., “Defining trained immunity and its role in health and disease”, <i>Nat Rev Immunol</i> 2020</li>
        <li>Obst, “The Timing of T Cell Priming and Cycling”, <i>Front Immunol</i> 2015; Quiel et al., <i>PNAS</i> 2011 ${tx('（初始 T 細胞的稀有程度與在淋巴結內的掃描）', '(rarity of naive T cells and their scanning in lymph nodes)')}</li></ul>
      <p class="note">${tx('完整的來源清單與查證範圍見專案 README。', 'See the project README for the full source list and what was checked.')}</p></div>`;
    scrollTo(0, 0);
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    const h = (location.hash || '#menu').slice(1), ch = IW.chapters[h];
    document.title = tx('免疫系統大作戰 Immune Wars', 'Immune Wars');
    if (ch) { const c = S.ch[h] || {}, n = ch.stages.filter(s => s.kind === 'practice').length; return B.open(ch, ch.resume ? ch.resume() : (c.prac || 0) >= n ? ch.stages.findIndex(s => s.kind !== 'practice') : (c.prac || 0)); }
    if (h === 'codex') return codex(); if (h === 'notes') return notes(); menu();
  }
  IW.onLang(() => { const h = (location.hash || '#menu').slice(1); if (!IW.chapters[h]) route(); });
  addEventListener('hashchange', route); route();
  IW.app = { route, CX };
})(window.IW);
