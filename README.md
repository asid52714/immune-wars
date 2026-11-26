# 免疫系統大作戰｜Immune Wars

**帶領免疫細胞守住同一個身體。打過的仗，它會記得。**
*Lead the immune cells that defend one body. What it has fought, it remembers.*

免費、開源的醫學科普回合制策略遊戲。你指揮免疫細胞守住人體，在一場場防禦戰裡看懂免疫系統怎麼運作：它能做什麼、做不到什麼、又會付出什麼代價。

A free, open-source, turn-based strategy game for learning how the human immune system works.

> **這個分支是實驗性的改版候選版本（Redesign Candidate），不是目前公開的版本。**
> 公開版本仍是 [v0.9](https://github.com/asid52714/immune-wars/tree/v0.9)，線上遊玩網址 <https://asid52714.github.io/immune-wars/> 也還是 v0.9。這個分支尚未經過維護者驗收，也沒有合併授權。設計理由、測試證據與已知限制見 [docs/REDESIGN.md](docs/REDESIGN.md)。
>
> *This branch is an experimental redesign candidate, not the published version. The published game is still v0.9. See [docs/REDESIGN.md](docs/REDESIGN.md) for the design rationale, test evidence and known limitations.*

## 怎麼試玩這個候選版本｜How to play this candidate

候選版本沒有部署到線上。下載這個分支後，用瀏覽器打開 `index.html` 就能玩，不需要安裝任何東西，也不需要網路。

```bash
git clone -b experiment/autonomous-redesign https://github.com/asid52714/immune-wars.git
cd immune-wars
open index.html            # macOS；其他系統直接用瀏覽器開啟這個檔案
```

要用手機試玩，可以在同一個區域網路裡起一個臨時的靜態伺服器，再用手機瀏覽器開啟電腦的 IP：

```bash
python3 -m http.server 8080      # 然後在手機開 http://<電腦的 IP>:8080/
```

*The candidate is not deployed. Clone this branch and open `index.html` in a browser; nothing to install and no network needed. To try it on a phone, serve the folder on your local network with `python3 -m http.server 8080`.*

進度與記憶冊只存在這台裝置的瀏覽器（localStorage），不使用帳號、Cookie 或任何連線。主選單有「清除進度」。

## 內容｜What is in it

整個遊戲是同一個身體的三段經歷，大約 20 到 30 分鐘可以玩完一輪。每一章先用幾個半分鐘的小練習帶出規則，一次只多一條，然後才是正式戰鬥。沒有需要先看完的教學影片。

| | 你會遇到的事 | 玩完會帶走的概念 |
|---|---|---|
| **第 1 章｜皮膚防線** | 傷口讓細菌進來。巨噬細胞吞不完，於是用發炎求援，嗜中性球從血管趕來。發炎拖太久，連正常組織都受損。 | 吞噬作用；發炎是幫手也有代價；最先大量趕到的是嗜中性球 |
| **第 2 章｜病毒來了** | 病毒鑽進細胞，巨噬細胞碰不到。偵察兵把情報送到淋巴結，由你在一群 T 細胞裡找出受體吻合的那一個。找得越久，後援越晚到。 | 病毒要進細胞才能複製；株系選擇；毒殺 T 細胞與抗體各管一種任務 |
| **第 3 章｜捲土重來** | 同一種病毒又來了，這次淋巴結裡有你上次留下的記憶細胞。接著是另一種病毒，你要決定先不先接種疫苗。 | 免疫記憶是專一的；疫苗是在沒有損失的時候先準備 |

*One body, three episodes, about 20–30 minutes for a full run. Each chapter opens with a few half-minute practice stages that add one rule at a time, then the real battle. There is no tutorial video to sit through.*

**語言**：繁體中文與英文，隨時可以切換，切換不會影響進行中的戰局。英文尚未經英語母語人士審查。
**裝置**：電腦（滑鼠）與手機（觸控，直向為主，橫向也能玩）。戰場本身是直向的場景：體表在上、血管在下。

## 這個專案想做什麼｜Goals

用「玩」而不是用「讀」，讓沒有醫學背景的人記住幾個免疫學的核心概念。設計上的幾個原則：

- **規則自己教。** 概念盡量做成玩家會親手遇到的後果，而不是戰前的說明文字。想讀更多的人，可以打開主選單的細胞圖鑑。
- **娛樂性優先，但不犧牲基礎醫學正確。** 為了好玩而做的簡化，集中列在遊戲裡的「這款遊戲簡化了什麼」。
- **以台灣高中社會組學生也能理解為目標。** 比喻與正式名詞並列（「偵察兵＝樹突細胞」），語氣不幼兒化。
- **角色靠輪廓辨認，輪廓取自真實形態。** 配色來自病理切片的 H&E 染色。表情只是幫助辨認的比喻：正在造成感染的細菌與病毒才畫成反派，被感染或受損的細胞是受害者，抗體是蛋白質所以沒有表情。
- **零安裝、可離線、沒有追蹤。** 純 HTML／CSS／JavaScript，沒有框架、後端、外部函式庫、圖片或音檔；畫面與聲音都由程式即時產生。

## 專案結構｜Project layout

```
index.html            單一頁面：主選單與三章都在這裡
css/game.css          樣式與版面（手機直向／橫向／桌面）
js/core.js            語言、存檔、音效、小工具
js/art.js             所有角色與場景的畫法
js/rules.js           規則層：純邏輯，不碰畫面（平衡模擬直接呼叫這一層）
js/battle.js          戰鬥外殼：版面、輸入、回合流程、提示、結算時間軸
js/lymph.js           淋巴結小玩法
js/mode-skin.js       第 1 章的畫面、操作與練習關卡
js/mode-airway.js     第 2、3 章的畫面、操作、練習關卡與流程
js/app.js             主選單、記憶冊、圖鑑、說明頁與頁面切換
levels/*.html         舊版關卡網址的轉址頁
docs/REDESIGN.md      改版說明、測試結果、畫面與已知限制
```

全部用傳統 `<script>` 標籤載入，沒有建置步驟。

## 科學正確性與醫學聲明｜Scientific accuracy and medical disclaimer

**本遊戲僅供科學教育與娛樂用途，不提供醫療診斷、治療或個人健康建議。** 為了遊戲性，部分生物學機制、時間尺度及數值經過簡化，不代表真實人體中的固定生理反應。遊戲主選單的「這款遊戲簡化了什麼」把所有簡化集中列在一頁。

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

v0.7 新增的教學文字（發炎的紅腫熱痛、肥大細胞與組織胺、嗜中性球與單核球的到場先後、先天免疫辨認多種病原體共有的特徵、抗原呈現、輔助 T 細胞與漿細胞）對照的是上面已列出的 OpenStax *Microbiology* 17.4、17.5、18.1–18.4 與 *Anatomy and Physiology 2e* 21.2、21.3。

第三關（免疫記憶與疫苗）另外參考：

- World Health Organization. *How do vaccines work?* <https://www.who.int/news-room/feature-stories/detail/how-do-vaccines-work>
- U.S. Centers for Disease Control and Prevention. *Explaining How Vaccines Work.* <https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html>
- U.S. Centers for Disease Control and Prevention. *Epidemiology and Prevention of Vaccine-Preventable Diseases (Pink Book)* — Chapter 1: Principles of Vaccination. <https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-1-principles-of-vaccination.html>
- Janeway CA Jr, Travers P, Walport M, et al. *Immunobiology*, 5th ed. (2001) — Immunological memory <https://www.ncbi.nlm.nih.gov/books/NBK27158/>；Principles of innate and adaptive immunity <https://www.ncbi.nlm.nih.gov/books/NBK27090/>. 這是較早的版本，部分數據來自動物實驗；遊戲沒有引用其中的具體數字。
- OpenStax, *Microbiology* — 18.4 B Lymphocytes and Humoral Immunity；18.5 Vaccines。OpenStax, *Anatomy and Physiology 2e* — 21.3、21.4（T、B 淋巴球與初次／再次免疫反應）。
- Reinke JG, Schorr C, Lee KP. *Why are long-lived plasma cells long-lived?* Front Immunol. 2026;17:1785563. <https://doi.org/10.3389/fimmu.2026.1785563> — 用來支持進階選讀中「長壽命漿細胞可長期存活並持續分泌抗體，與記憶 B 細胞不同」。
- Hammarlund E, et al. *Plasma cell survival in the absence of B cell memory.* Nat Commun. 2017;8:1781. <https://doi.org/10.1038/s41467-017-01901-w> — 同上；這是獼猴的實驗研究，不能直接推論到所有人體免疫情境。

改版候選版本新增或改寫的敘述（嗜中性球與膿、白血球的細胞核形態、株系選擇、初始 T 細胞的稀有程度、T 細胞在淋巴結內掃描樹突細胞、先天免疫與訓練免疫的差別、疫苗與免疫記憶的專一性）另外對照：

- OpenStax, *Anatomy and Physiology 2e* — 18.4 Leukocytes and Platelets；21.2；21.3；21.4。OpenStax, *Microbiology* — 6.2；17.3；17.5；18.1；18.5。OpenStax, *Biology 2e* — 42.1；42.2。
- Netea MG, et al. *Defining trained immunity and its role in health and disease.* Nat Rev Immunol. 2020. PMCID: PMC7186935 — 用來支持「先天免疫不形成 T、B 細胞那種專一的長期記憶，但有較短、較不專一的訓練免疫」。
- Obst R. *The Timing of T Cell Priming and Cycling.* Front Immunol. 2015;6:563 — T 細胞在淋巴結內逐一碰觸樹突細胞；初始 CD8 T 細胞對單一抗原的頻率。這些數字多來自小鼠研究。
- Quiel J, et al. *Antigen-stimulated CD4 T-cell expansion is inversely and log-linearly related to precursor number.* PNAS. 2011. PMCID: PMC3044359 — 初始 CD4 T 細胞對單一抗原的頻率（小鼠）。
- H&E 染色的顏色（細胞核藍紫、細胞質粉紅）只查了維基百科條目 *H&E stain*，沒有找到教科書層級的公開來源。

這一批是由 AI 助手開啟原始頁面逐條比對的結果（16 條敘述：13 條有直接支持、3 條加註後採用），**不是醫學專業審查**。Janeway *Immunobiology* 的線上版本這次沒有讀到。

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

本專案由個人發起及維護，結合人類的產品設計、遊戲試玩、知識審查與 AI 輔助軟體開發。v0.9 以前的程式碼主要由 AI 協作工具（ChatGPT 與 Claude Code）依維護者的設計與回饋產出。這個改版候選版本則是維護者授權 Claude Code 自主設計與實作的實驗；維護者負責產品方向、遊戲體驗驗收及發布決策。

*A personal project combining human product design, playtesting, and content review with AI-assisted software development. Most of the code was produced with AI tools (ChatGPT and Claude Code) under the maintainer's direction; the maintainer is responsible for product direction, acceptance of the gameplay, and release decisions.*

遊戲內的圖像與音效皆由程式即時繪製、合成，沒有使用外部圖片、音檔、字型或第三方函式庫。

## 個人專案聲明｜Personal project

本專案為個人公益與科普教育計畫，不代表任職單位、其他機構或醫療專業組織的立場。

*This is a personal, non-profit science-education project. It does not represent the views of any employer, institution, or medical organization.*

## 授權｜License

Licensed under the [MIT License](LICENSE).

MIT 授權涵蓋本專案的原創程式碼、文件與素材。若日後納入第三方內容，該內容依其原有授權。
