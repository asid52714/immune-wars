# 免疫系統大作戰｜Immune Wars

**在遊戲中探索人體看不見的防禦戰爭。**
*Discover the invisible battles inside the human body.*

免費、開源的醫學科普回合制策略遊戲。你指揮免疫細胞守住人體，在一場場防禦戰裡看懂免疫系統怎麼運作——它能做什麼、做不到什麼、又會付出什麼代價。

A free, open-source, turn-based strategy game for learning how the human immune system works. Command immune cells, defend the body, and see for yourself what immunity can do, what it cannot, and what it costs.

這是個人發起的公益科普專案，目前是**早期原型**（Prototype v0.4，兩個關卡）。歡迎試玩，也歡迎指正醫學內容。
*A personal, non-profit science-education project. This is an **early prototype** (v0.4, two levels). Playtesting and corrections are welcome.*

## 線上遊玩｜Play online

**[免費開始遊玩｜Play for free](https://asid52714.github.io/immune-wars/)**

不需要安裝任何軟體，也不需要註冊帳號。使用電腦瀏覽器及滑鼠即可開始遊戲。
*No installation or account required. Open the game in a desktop browser and start playing.*

目前遊戲介面為繁體中文，尚未提供手機版。
*The game text is currently in Traditional Chinese only; there is no mobile version yet.*

## 這個專案想做什麼｜Goals

- 透過遊戲學習人體免疫系統，認識細菌、病毒等病原體。
- 用戰術決策的「行為與後果」理解免疫反應的作用與限制，而不是背名詞。
- 降低醫學與生命科學知識的學習門檻。
- 鼓勵科學交流與社群協作。

*Learn immunology by playing: understand pathogens and immune responses through decisions and their consequences, lower the barrier to medical and life-science knowledge, and invite open scientific discussion.*

### 設計理念｜Design approach

**Animated Learning → Strategic Gameplay → Reflective Learning**

1. **動畫建立概念**：開戰前用簡短的動畫與圖文，先把這一關的醫學概念講清楚。
2. **策略運用知識**：在回合制戰鬥裡，用剛學到的概念做決定、承擔後果。
3. **戰後回顧**：結算畫面回顧這一局的決策與結果，並整理重點知識。

*Short animated briefings introduce the concepts, turn-based battles put them to use, and a post-battle review connects your decisions to what happened.*

這是本專案採用的設計方法，尚未做過教育成效研究，不代表已證實的學習效果。
*This is a design approach, not a claim of proven educational effectiveness.*

## 關卡｜Levels

### Level 01｜皮膚防線——傷口入侵 *(Skin barrier: wound infection)*

細菌從傷口闖進組織。指揮巨噬細胞吞噬細菌，並拿捏發炎的力道：太弱擋不住，太強會傷到自己。

- 皮膚是物理屏障，傷口是破口
- 細菌的增殖與擴散
- 巨噬細胞的吞噬作用
- 發炎反應的兩面：協助防禦，也可能損傷組織

### Level 02｜呼吸道防線——病毒危機 *(Airway defense: viral infection)*

流感病毒把呼吸道上皮細胞變成病毒工廠。用先天免疫爭取時間，等適應性免疫到場：抗體處理細胞外的病毒，毒殺 T 細胞處理受感染的細胞。

- 病毒必須依賴宿主細胞才能複製（和細菌的根本差異）
- 先天免疫與適應性免疫的分工
- 樹突細胞攝取抗原、前往淋巴結；適應性免疫為什麼需要準備時間
- B 細胞、漿細胞與抗體中和
- 細胞毒殺 T 細胞（CD8+）清除受感染細胞，以及隨之而來的組織損失

開戰前有三段動畫教學（合計約兩分鐘，可暫停、重播、跳過）：病毒與細菌有什麼不同、先天免疫如何啟動適應性免疫、抗體與毒殺 T 細胞的分工。

兩個關卡都已由專案維護者親自試玩驗收；尚未做過大規模的外部試玩。
*Both levels have been playtested and accepted by the maintainer; no large-scale external playtesting has been done yet.*

## 未來可能的主題｜Possible future topics

以下是可能的發展方向，**不是發布承諾**：
*Ideas under consideration — not commitments:*

- 免疫記憶與疫苗 *(immune memory and vaccines)*
- 抗生素與抗藥性 *(antibiotics and resistance)*
- 腸道菌叢 *(gut microbiota)*
- 過敏與自體免疫疾病 *(allergy and autoimmunity)*
- 癌細胞與腫瘤免疫 *(cancer and tumor immunity)*

## 本機執行｜Run locally

遊戲是純靜態的 HTML、CSS、JavaScript，可以完全離線執行。

1. 下載本專案：按頁面上方的 **Code → Download ZIP** 並解壓縮，或
   ```
   git clone https://github.com/asid52714/immune-wars.git
   ```
2. 用瀏覽器開啟資料夾裡的 `index.html`，選擇關卡即可開始。

不需要後端伺服器、資料庫、API Key，也不需要安裝任何框架或執行建置步驟。

*Plain static HTML/CSS/JavaScript. Download or clone, then open `index.html` in a browser. No server, database, API key, framework, or build step is required.*

```
index.html                    主選單｜main menu
levels/
  01-skin-barrier.html        第一關（單檔、自包含）
  02-viral-infection.html     第二關（單檔、自包含）
```

基本操作：點選免疫細胞 → 點亮起的格子移動或行動 → 按「結束回合」（空白鍵）。每一關開始前都有簡報（第二關為動畫）與規則說明，遊戲中按右上角 `?` 可以重看。

## 科學正確性與醫學聲明｜Scientific accuracy and medical disclaimer

**本遊戲僅供科學教育與娛樂用途，不提供醫療診斷、治療或個人健康建議。** 為了遊戲性，部分生物學機制、時間尺度及數值經過簡化，不代表真實人體中的固定生理反應。遊戲內的簡報與結算畫面會標明哪些是醫學知識、哪些是遊戲化的抽象。

**This game is for science education and entertainment only. It does not provide medical diagnosis, treatment, or personal health advice.** Some mechanisms, time scales, and numbers are simplified for gameplay and do not represent fixed physiological responses.

醫學內容目前由專案維護者對照公開教材自行查核，**尚未經過正式的醫學專業審查，也沒有做過教育成效研究**，仍在持續改善。歡迎醫師、醫學生、免疫學研究人員、生命科學教師及其他專業人士指正。

*The medical content has been checked by the maintainer against open educational sources. It has **not** undergone formal expert review or any study of educational effectiveness. Corrections are very welcome.*

### 查核時參考的資料｜Sources consulted

- OpenStax, *Microbiology* — 6.1 Viruses；6.2 The Viral Life Cycle；9.1 How Microbes Grow；17.2 Chemical Defenses；17.3 Cellular Defenses；17.4 Pathogen Recognition and Phagocytosis；17.5 Inflammation and Fever；18.1–18.4（適應性免疫、抗原呈現、T 細胞、B 細胞與抗體）；21.1 Anatomy and Normal Microbiota of the Skin and Eyes；22.3 Viral Infections of the Respiratory Tract. <https://openstax.org/details/books/microbiology>
- OpenStax, *Anatomy and Physiology 2e* — Chapter 21（21.2 先天免疫；21.3–21.5 適應性免疫與對抗病原體的免疫反應）. <https://openstax.org/details/books/anatomy-and-physiology-2e>
- OpenStax, *Biology 2e* — 21.2 Virus Infections and Hosts；42.1–42.3（先天免疫、適應性免疫、抗體）. <https://openstax.org/details/books/biology-2e>
- MedlinePlus (U.S. National Library of Medicine) — *How wounds heal*；*Immune response*. <https://medlineplus.gov/>
- Bouvier NM, Palese P. *The biology of influenza viruses.* Vaccine. 2008. PMCID: PMC3074182.
- Duan S, Thomas PG. *Balancing Immune Protection and Immune Pathology by CD8+ T-Cell Responses to Influenza Infection.* Front Immunol. 2016. PMCID: PMC4742794.
- Dumm RE, Fiege JK, Waring BM, Kuo CT, Langlois RA, Heaton NS. *Non-lytic clearance of influenza B virus from infected cells preserves epithelial barrier function.* Nat Commun. 2019;10:779. <https://doi.org/10.1038/s41467-019-08617-z> — 用來支持「真實情況中，部分受感染細胞可能在病毒清除後存活」；這是實驗研究的結果，不能推論到所有人體感染情境。遊戲為了簡化，設定受感染細胞最終都會死亡。

若遊戲內容與上述資料或現行醫學共識不一致，以專業資料為準，並請[告訴我們](https://github.com/asid52714/immune-wars/issues)。

## 歡迎回饋與貢獻｜Feedback and contributions

歡迎任何形式的批評指教：

- 醫學知識指正 *(medical accuracy)*
- 遊戲體驗回饋 *(gameplay feedback)*
- Bug 回報 *(bug reports)*
- 新醫學主題建議 *(new topics)*
- 教學內容改善 *(teaching content)*
- 美術與音效改善 *(art and sound)*
- 翻譯 *(translations)*
- 程式碼貢獻 *(code)*

請使用 **[GitHub Issues](https://github.com/asid52714/immune-wars/issues)** 或 Pull Request。指正醫學內容時若能附上資料來源會很有幫助。

請不要在 Issue 裡提供真實姓名、病歷或其他個人資訊——這些都不需要。這是個人維護的專案，每一則建議都會閱讀，但無法保證全部採用，回覆也可能需要一些時間。

*Please open an [issue](https://github.com/asid52714/immune-wars/issues) or a pull request. No personal or health information is needed or wanted. Every suggestion is read, though not all can be adopted.*

## 關於開發方式｜How this project is built

本專案由個人發起及維護，結合人類的產品設計、遊戲試玩、知識審查與 AI 輔助軟體開發。程式碼主要由 AI 協作工具（ChatGPT 與 Claude Code）依維護者的設計與回饋產出；維護者負責產品方向、遊戲體驗驗收及發布決策。

*A personal project combining human product design, playtesting, and content review with AI-assisted software development. Most of the code was produced with AI tools (ChatGPT and Claude Code) under the maintainer's direction; the maintainer is responsible for product direction, acceptance of the gameplay, and release decisions.*

遊戲內的圖像與音效皆由程式即時繪製、合成，沒有使用外部圖片、音檔、字型或第三方函式庫。

## 個人專案聲明｜Personal project

本專案為個人公益與科普教育計畫，不代表任職單位、其他機構或醫療專業組織的立場。

*This is a personal, non-profit science-education project. It does not represent the views of any employer, institution, or medical organization.*

## 授權｜License

Licensed under the [MIT License](LICENSE).

MIT 授權涵蓋本專案的原創程式碼、文件與素材。若日後納入第三方內容，該內容依其原有授權。
