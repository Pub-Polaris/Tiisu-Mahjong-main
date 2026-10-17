# 麻将各流派「役/番种」体系对照（2026-10-18）

> **用途**：迁移到 C# 前，先把"役"这件事在不同规则体系里的形态对齐，避免把七子的口径当成通用口径。
> **来源**：见每节"来源"。**未取得的来源如实标注为待补，不凭记忆编造。**

## 0. 一句话结论

七子的「役」不是任何单一流派的子集：**赋数分级像国标（多档、可叠加计分）**，
**门清/副露区分像日麻**，**又有一批自创双役满（70 赋：纯正水中月 / 三七之花 / 美人七对 / 四明杠）**。
所以 C# 的役种建模必须**以七子自己的 `ike.json` 为准**，其余体系只作参照，不能拿来当规格。

## 1. 国标麻将（MCR，中国官方竞赛规则）

**来源（已读）**：官方规则 PDF `MCR201408e.pdf`（世界麻将组织 / mindmahjong.com）。
本机已下载 38 页、文本层可提取（95,635 字符）。

已从 PDF 正文核实的事实：

| 事实 | 内容 |
|---|---|
| 番种总数 | **81 个**（原文："There are 81 different scoring elements ("fan") altogether"） |
| 分组 | 九个系列：字牌系、数牌系、刻子系、七对系、牌型组合系、全带系、不靠系、和牌方式系、特殊系 |
| 分值档 | **12 档**：88 / 64 / 48 / 32 / 24 / 16 / 12 / 8 / 6 / 4 / 2 / 1 |
| 计分 | 一手牌可同时计多个番种（累加），与七子的"赋数累加"同构 |
| 起和 | 需要满足最低番数（MCR 为 8 番）；七子为 **7 赋** |

**已从 PDF 抽取到的番种（样例，按分值降序）**：

- 88 分：Big Four Winds（大四喜）、Big Three Dragons（大三元）、All Green（绿一色）、
  Nine Gates（九莲宝灯）、Four Kongs（四杠）、Seven Shifted Pairs（连七对）、Thirteen Orphans（十三幺）
- 64 分：All Terminals（清幺九）、Little Four Winds（小四喜）、Little Three Dragons（小三元）、All Honors（字一色）
- 24 分：Greater Honors and Knitted Tiles（全不靠？）、…
- 16 分：Pure Straight（清龙/一条龙）、Pure Shifted Chows（一色三步高）…
- 12 分：Lesser Honors and Knitted Tiles、Knitted Straight（组合龙）
- 8 分：Reversible Tiles（推不倒）、Last Tile Draw（海底捞月）、Robbing The Kong（抢杠和）…
- 6 分：All Types（五门齐）
- 4 分：Last Tile
- 2 分：Seat Wind（门风）
- 1 分：Edge Wait（边张）、Closed Wait（坎张）、Single Wait（单钓）、Flower Tiles（花牌）

> **待补**：81 个番种的**中文名与逐项分值**（PDF 文本层仅英文名，且换行截断；
> 需要更细的表格解析或中文版规则）。**当前不把英文名硬译成中文**，以免错译。

## 2. 日本麻将（立直麻将）

**来源（已读）**：开源实现 `MahjongRepository/mahjong`（MIT，Tenhou 役 ID 映射）。
经 jsDelivr 取得 `mahjong/hand_calculating/yaku_list/` 目录清单：**45 个役文件**。

它把役按"一个役一个文件"组织，文件名即役的罗马字 id，例如：

```
riichi  daburu_riichi  open_riichi  daburu_open_riichi  ippatsu  chankan  rinshan
haitei  houtei  pinfu  iipeiko  ryanpeiko  sanshoku  sanshoku_douko  ittsu
chantai  junchan  honroto  chiitoitsu  honitsu  chinitsu  shosangen  ...
```

**结构特征（与七子的关键差异）**：

| 维度 | 日麻 | 七子 |
|---|---|---|
| 起和门槛 | 有"役"才能和（无役不可和） | **7 赋**起和 |
| 立直 | 有（1 番，门清） | **无**（有意移除，见 `规则缺口清单`） |
| 副露影响 | 门清限定役（立直/平和/一盃口/二盃口）失效 | **食降**：副露后该役 −1 赋（`kaishoku`） |
| 役满 | 固定役满（累积/複合规则） | **28 / 70 两档**（单/双役满），另有特例加计 +7000 点 |
| 宝牌 | 赤宝牌、杠宝牌、里宝牌，**不计入起和** | **无赤宝牌**（规则书明确）；「马」为岭上牌补充 |
| 七对子 | 2 番（门清） | 7 赋 |
| 国士/九莲 | 役满 | 28 赋 |



### 2.1 日麻役种全表（来源：`MahjongRepository/mahjong`，MIT）

> 非官方规则书，是**开源实现**的役定义；用于核对"日麻有没有这个役、门清/副露各几番"。
> 抓取：2026-10-18，逐文件解析 `name` / `han_closed` / `han_open`。

| id | 名称 | 门清 | 副露 |
|---|---|---|---|
| `aka_dora` | Aka Dora | 1 | 1 |
| `chankan` | Chankan | 1 | 1 |
| `chantai` | Chantai | 2 | 1 |
| `chiitoitsu` | Chiitoitsu | 2 | — |
| `chinitsu` | Chinitsu | 6 | 5 |
| `chun` | Yakuhai (chun) | 1 | 1 |
| `daburu_open_riichi` | Double Open Riichi | 3 | — |
| `daburu_riichi` | Double Riichi | 2 | — |
| `dora` | Dora | 1 | 1 |
| `haitei` | Haitei Raoyue | 1 | 1 |
| `haku` | Yakuhai (haku) | 1 | 1 |
| `hatsu` | Yakuhai (hatsu) | 1 | 1 |
| `honitsu` | Honitsu | 3 | 2 |
| `honroto` | Honroutou | 2 | 2 |
| `houtei` | Houtei Raoyui | 1 | 1 |
| `iipeiko` | Iipeiko | 1 | — |
| `ippatsu` | Ippatsu | 1 | — |
| `ittsu` | Ittsu | 2 | 1 |
| `junchan` | Junchan | 3 | 2 |
| `nagashi_mangan` | Nagashi Mangan | 5 | 5 |
| `open_riichi` | Open Riichi | 2 | — |
| `pinfu` | Pinfu | 1 | — |
| `renhou` | Renhou | 5 | — |
| `riichi` | Riichi | 1 | — |
| `rinshan` | Rinshan Kaihou | 1 | 1 |
| `round_wind_east` | Yakuhai (round wind east) | 1 | 1 |
| `round_wind_north` | Yakuhai (round wind north) | 1 | 1 |
| `round_wind_south` | Yakuhai (round wind south) | 1 | 1 |
| `round_wind_west` | Yakuhai (round wind west) | 1 | 1 |
| `ryanpeiko` | Ryanpeikou | 3 | — |
| `sanankou` | San Ankou | 2 | 2 |
| `sankantsu` | San Kantsu | 2 | 2 |
| `sanshoku` | Sanshoku Doujun | 2 | 1 |
| `sanshoku_douko` | Sanshoku Doukou | 2 | 2 |
| `seat_wind_east` | Yakuhai (seat wind east) | 1 | 1 |
| `seat_wind_north` | Yakuhai (seat wind north) | 1 | 1 |
| `seat_wind_south` | Yakuhai (seat wind south) | 1 | 1 |
| `seat_wind_west` | Yakuhai (seat wind west) | 1 | 1 |
| `shosangen` | Shou Sangen | 2 | 2 |
| `tanyao` | Tanyao | 1 | 1 |
| `toitoi` | Toitoi | 2 | 2 |
| `tsumo` | Menzen Tsumo | 1 | — |
| `ura_dora` | Ura Dora | 1 | — |

**役满（yakuman）**：

| id | 名称 |
|---|---|
| `chiihou` | Chiihou |
| `chinroto` | Chinroutou |
| `chuuren_poutou` | Chuuren Poutou |
| `daburu_chuuren_poutou` | Daburu Chuuren Poutou |
| `daburu_kokushi` | Kokushi Musou Juusanmen Matchi |
| `daichisei` | Daichisei |
| `daisangen` | Daisangen |
| `daisharin` | Daisharin |
| `daisuushi` | Dai Suushii |
| `kokushi` | Kokushi Musou |
| `paarenchan` | Paarenchan |
| `renhou_yakuman` | Renhou (yakuman) |
| `ryuisou` | Ryuuiisou |
| `sashikomi` | Sashikomi |
| `shosuushi` | Shousuushii |
| `suuankou` | Suu Ankou |
| `suuankou_tanki` | ERR |
| `suukantsu` | ERR |
| `tenhou` | ERR |
| `tsuisou` | ERR |

> 注：`suuankou_tanki` / `suukantsu` / `tenhou` / `tsuisou` 四个文件抓取失败（返回异常），
> 已记录在 `sources.md`，下轮重试。

## 3. 中庸麻将（Zung Jung，关兆豪）

**来源（已读）**：Mahjong Wiki · Zung Jung Scoring（含 44 个番种与中文名）。
2004 年由 Alan Kwan（关兆豪）发布，官方站 <http://www.zj-mahjong.info/>。

### 3.1 中庸（Zung Jung）44 个番种（含点数）

> 来源：[Mahjong Wiki · Zung Jung Scoring](https://mahjong.wikidot.com/rules:zung-jung-scoring)（社区 Wiki，CC BY-SA 3.0；官方站 <http://www.zj-mahjong.info/zj33_rules_eng.html>）。抓取 2026-10-18。
> 计分：**累加制**（additive），一手指上限 320 点（compound limit）；超过 320 的"列明役"按其面值独计（listed limit）。
> **同系列不可重复计**（如四槓不与三槓/二槓同计），跨系列可叠加（四暗刻 125 + 對對和 30 + 門前清 5）。

| 编号 | 番种（中文） | 点数 |
|---|---|---|
| 1.1 | 平和 | 5 |
| 1.2 | 門前清 | 5 |
| 1.3 | 斷么九 | 5 |
| 2.1.1 | 混一色 | 40 |
| 2.1.2 | 清一色 | 80 |
| 2.2 | 九蓮寶燈 | 480 |
| 3.1 | 番牌 | 10 |
| 3.2.1 | 小三元 | 40 |
| 3.2.2 | 大三元 | 130 |
| 3.3.1 | 小三風 | 30 |
| 3.3.2 | 大三風 | 120 |
| 3.3.3 | 小四喜 | 320 |
| 3.3.4 | 大四喜 | 400 |
| 3.4 | 字一色 | 320 |
| 4.1 | 對對和 | 30 |
| 4.2.1 | 二暗刻 | 5 |
| 4.2.2 | 三暗刻 | 30 |
| 4.2.3 | 四暗刻 | 125 |
| 4.3.1 | 一槓 | 5 |
| 4.3.2 | 二槓 | 20 |
| 4.3.3 | 三槓 | 120 |
| 4.3.4 | 四槓 | 480 |
| 5.1.1 | 一般高（二同順） | 10 |
| 5.1.2 | 兩般高 | 60 |
| 5.1.3 | 一色三同順 | 120 |
| 5.1.4 | 一色四同順 | 480 |
| 6.1 | 三色同順 | 35 |
| 6.2.1 | 三色小同刻 | 30 |
| 6.2.2 | 三色同刻 | 120 |
| 7.1 | 一氣通貫 | 40 |
| 7.2.1 | 三連刻 | 100 |
| 7.2.2 | 四連刻 | 200 |
| 8.1.1 | 混全帶么 | 40 |
| 8.1.2 | 純全帶么 | 50 |
| 8.1.3 | 混么九 | 100 |
| 8.1.4 | 清么九 | 400 |
| 9.1.1 | 海底撈月 | 10 |
| 9.1.2 | 河底撈魚 | 10 |
| 9.2 | 嶺上開花 | 10 |
| 9.3 | 搶槓 | 10 |
| 9.4.1 | 地和 | 155 |
| 9.4.2 | 天和 | 155 |
| 10.1 | 十三么九 | 160 |
| 10.2 | 七對子 | 30 |

**关键机制**：无一门"起和门槛"（Minimum 0，有 5 点之选）；
自摸/放铳的赔付分摊不同（≤25 点三家各付；>25 点两家付 25、放铳者补差）；
**同巡免疫**：同一轮内若有人先打过同样的牌，责任归于先打者。


## 4. 古典麻将

### 4.1 古典麻将（Chinese Classical）—— 不是"役种表"，而是三张计分表

> 来源：[Mahjong Wiki · Chinese Classical Scoring](https://mahjong.wikidot.com/rules:chinese-classical-scoring)
> （社区 Wiki，CC BY-SA 3.0）。抓取 2026-10-18。

古典麻雀（20 世纪初，宁波/上海）**没有"番种列表"**，而是：

    总分 = 小点（Mini Points） × 2^(翻数 Doubles)

**第 1 张表：翻数（Doubles）**

| 条件 | 翻数 |
|---|---|
| 三元牌刻/杠 | +1 |
| 门风刻/杠 | +1 |
| 圈风刻/杠 | +1 |
| 同色花牌 2 张 | +1 |
| 混一色 | +1 |
| 清一色 | +3 |
| 字一色 | +3 |
| （特殊）地和 / 天和 / 大三龙 / 十三幺 / 大四喜 / 九莲 | 直接按 100 或 200 点档结算 |

**第 2 张表：小点（Mini Points，每刻/杠）**

| 牌 | 明刻 | 暗刻 | 明杠 | 暗杠 |
|---|---|---|---|---|
| 2–8 | 2 | 4 | 8 | 16 |
| 1 或 9 | 4 | 8 | 16 | 32 |
| 三元牌 | 4 | 8 | 16 | 32 |
| 门风/圈风 | 4 | 8 | 16 | 32 |
| 门风/圈风对子 | 2 | | | |
| 三元牌对子 | 2 | | | |

**第 3 张表：赏点（Bonus Mini Points，仅和牌者）**

| 项 | 小点 |
|---|---|
| 和牌（Mahjong） | 10 |
| 平和（Pinghu，全顺且无役牌对） | 4 |
| 全刻（All Pungs） | 4 |
| 杠上开花 | 4 |
| 海底捞月 | 4 |
| 自摸 | 2 |
| 单钓（对倒/坎张/边张） | 2 |
| 双碰 | 2 |

**第 4 张表：翻数→倍数**

| 翻数 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 倍数 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 |

**赔付**：**四家都算分**（与现代"只有和牌者得分"不同）；庄家得失加倍。

> 结论：古典体系里"役"= 翻数表里的条件 + 小点表里的结构，**不是一个可枚举的役种清单**。

## 5. 七子 vs 其他体系：按"存在性"对照（这是本项目真正要的）

> 只对照**有/无与机制**，数值以各体系原文为准（列在各自章节）。

| 役/机制 | 七子 | 国标 MCR | 日麻 | 中庸 ZJ |
|---|---|---|---|---|
| 立直 / 双立直 | ❌ 有意移除 | ❌ | ✅ | ❌ |
| 门清自摸 | ✅ 4 赋 | ✅ | ✅ 1 番 | ✅（平和/門前清 各 5） |
| 七对子 | ✅ 7 赋 | ✅ 24 番 | ✅ 2 番 | ✅ 30 点 |
| 连七对 | ❌ | ✅ 88 番 | ❌ | ❌ |
| 十三幺 / 国士 | ✅ 28 赋 | ✅ 88 番 | ✅ 役满 | ✅ 160 点 |
| 九莲宝灯 | ✅ 28 赋 | ✅ 88 番 | ✅ 役满 | ✅ 480 点 |
| 大三元 | ✅ 28 赋 | ✅ 88 番 | ✅ 役满 | ✅ 130 点 |
| 小三元 | ✅ 8 赋 | ✅ 64 番 | ✅ 2 番 | ✅ 40 点 |
| 大/小四喜 | ✅ 四喜和 28（合一） | ✅ 88/64 | ✅ 役满 | ✅ **400 / 320**（分列） |
| 大/小三风 | ❌ | ❌ | ❌ | ✅ **120 / 30**（七子无） |
| 字一色 | ✅ 28 赋 | ✅ 64 番 | ✅ 役满 | ✅ 320 点 |
| 清幺九 / 清老头 | ✅ 28 赋 | ✅ 64 番 | ✅ 役满 | ✅ 400 点 |
| 混幺九 / 混老头 | ✅ 5 赋 | ✅ 32 番 | ✅ 2 番 | ✅ 100 点 |
| 绿一色 | ✅ 28 赋 | ✅ 88 番 | ✅ 役满 | ❌（中庸无绿一色） |
| 四杠子 | ✅ 四明杠 70 | ✅ 88 番 | ✅ 役满 | ✅ 480 点 |
| 一/二/三杠 | ✅ 明根/两杠子/三杠子 | ❌ | ✅ 三杠子 | ✅ **5 / 20 / 120** |
| 清一色 / 混一色 | ✅ 14 / 5 赋 | ✅ 24 / 6 番 | ✅ 6/5、3/2 | ✅ **80 / 40** |
| 三色同顺 | ✅ 4 赋 | ✅ 8 番 | ✅ 2/1 | ✅ 35 |
| 三色同刻 | ✅ 5 赋 | ✅ 16 番 | ✅ 2/2 | ✅ 120 |
| 三色小同刻 | ❌ | ❌ | ❌ | ✅ **30**（七子无） |
| 一气通贯 | ✅ 4 赋 | ✅ 16 番 | ✅ 2/1 | ✅ 40 |
| 混全带幺 / 纯全带幺 | ✅ 5 / 7 赋 | ✅ 8 / 16 番 | ✅ 2/1、3/2 | ✅ 40 / 50 |
| 一色三节高（三连刻） | ✅ 3 赋 | ✅ | ❌ | ✅ **100**（三連刻） |
| 四连刻 | ❌ | ❌ | ❌ | ✅ **200**（七子无） |
| 一色三步高 | ✅ 4 赋 | ✅ 16 番 | ❌ | ❌ |
| 一色四同顺 | ❌（已定不设独立役） | ✅ 48 番 | ❌ | ✅ **480** |
| 两般高 / 一色三同顺 | ❌ | ✅ / ✅ | ✅ 一盃口/二盃口 | ✅ **60 / 120**（七子无） |
| 全带五 | ❌ | ✅ 16 番 | ❌ | ❌ |
| 五门齐 | ✅ 5 赋 | ✅ 6 番 | ❌ | ❌ |
| 缺一门 | ✅ 3 赋 | ❌ | ❌ | ❌ |
| 四归一 | ✅ 2 赋 | ❌ | ❌ | ❌ |
| 全带赤（14000 起） | ✅ | ❌ 无赤宝牌 | ❌ 赤宝牌不入番 | ❌ |
| 双役满组（70 赋，4 个） | ✅ | ❌ | ❌ | ❌ |
| 赤宝牌 / 花牌 | ❌ | 花牌 1 番 | 赤宝牌 | ❌ |
| 食降（副露该役 −1 赋） | ✅ **独有** | ❌ | ❌ | ❌ |
| 可选役（默认关） | ✅ 7 个 | ❌ | ❌ | ❌ |
| 起和门槛 | **7 赋** | 8 番 | 需有役 | **0（可选 5）** |
| 计分形态 | 赋数累加 → 点数表 | 番数累加 | 番数 → 点数表 | **点数直接累加，上限 320** |
| 赔付 | 放铳者付（+ 本场/立直棒等） | 放铳者付 | 放铳者付 | **四家分摊（按点数档位）** |

**结论（对本项目）**：
- 七子的「全带赤」「双役满 70 档」「食降」「可选役」在四个体系里都**没有对应物** → 必须自建。
- 七子**没有**中庸的 大/小三风、三色小同刻、四连刻、一色四同顺、两般高 —— 这些**不必补**，除非北极星要。
- 七子**没有**国标的 全带五、连七对、花牌 —— 同上。

## 6. 对本项目（C# 迁移）的直接影响

1. **役种数据只认 `ike.json`**；上表只用来判断"这个役是不是通用概念"，避免命名与语义混淆。
2. **"食降"是七子独有**，C# 的 `YakuSpec` 必须带 `Kaishoku` 字段（ike 里 12 个役有）。
3. **"可选役"“影子役”“双役满 70"** 也是七子独有，不要按日麻的"役满複合"去实现。
4. **国标的分值档（88…1）与七子的赋位表（70/28/14/8/7/5/4/3/2/1）不同构**，不可混用。

## 7. 还有哪些没拿到

| 项 | 状态 |
|---|---|
| 国标 81 番的**中文名 + 逐项分值** | ⚠️ 只有英文名（官方 PDF 文本层）；中文名需另找中文版规则或逐条对译 |
| 日麻 4 个役满文件（suuankou_tanki / suukantsu / tenhou / tsuisou） | ⚠️ 抓取失败，待重试 |
| 中庸 44 番 | ✅ 已取得（含中文名与点数） |
| 古典计分三表 | ✅ 已取得（Doubles / Mini Points / Bonus） |
| 美国麻将、台湾麻将、广东麻将等 | ⏸ 未取（与本项目关系较远） |

> **可用通道（实测）**：官方 PDF、GitHub API、jsDelivr CDN、**mahjong.wikidot.com**（社区 Wiki，CC BY-SA）。
> **不可用**：百度百科（403）、萌娘百科（WAF）、维基系（被本机反代解析为内网 IP）、wikiwand（超时）。

