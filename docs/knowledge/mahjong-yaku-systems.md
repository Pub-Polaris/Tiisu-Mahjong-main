# 麻将各流派「役/番种」体系对照（2026-10-18）

> **用途**：迁移到 C# 前，先把"役"这件事在不同规则体系里的形态对齐，避免把七子的口径当成通用口径。
> **来源**：见每节"来源"。**未取得的来源如实标注为待补，不凭记忆编造。**

## 0. 一句话结论

七子的「役」不是任何单一流派的子集：**赋数分级像国标（多档、可叠加计分）**，
**门清/副露区分像日麻**，**又有一批自创役（星星总表：纯正水中月 70 / 三七之花 70 等）**。
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

## 3. 中庸麻将（关兆豪）

**来源：待补。** 尝试过的源与结果：

| 尝试 | 结果 |
|---|---|
| 百度百科「中庸麻雀」 | HTTP **403**（安全验证） |
| 快懂百科 baike.com | 返回壳页，正文由 JS 渲染，纯文本仅 311 字符 |
| 中文维基（zh.wikipedia.org） | 域名被本机**本地反向代理**解析为内网 IP，被拒 |
| wikiwand 镜像 | 连接超时 |
| 萌娘百科 | **WAF**，`action=raw` 也返回"未授权操作" |

**已知（但未取得可引来源，仅作线索，不作结论）**：中庸麻将是香港学者关兆豪提出的
"中庸"型赛制，强调减小运气成分、含"花牌"与特殊计分。**在拿到可引来源前，不写入任何具体役种表。**

## 4. 古典麻将

**来源：待补。** 同上被 WAF/反代拦截（百度百科、维基、萌百均不可用）。

**线索（未核实）**：古典/老式麻将的"番"体系与国标不同源，常见"番数少、吃碰限制多"的特征。
**同样不写入具体役种表。**

## 5. 七子 vs 其他体系：按"存在性"对照（这是本项目真正要的）

> 只对照**有/无与机制**，不搬数值（数值以七子 `ike.json` 为准）。

| 役/机制 | 七子 | 国标 MCR | 日麻 |
|---|---|---|---|
| 立直 / 双立直 | ❌（有意移除） | ❌ | ✅ |
| 门清自摸 | ✅ 门前自摸 4 赋 | ✅（自摸番种） | ✅（门清自摸 1 番） |
| 七对子 | ✅ 7 赋 | ✅（七对 24 番） | ✅ 2 番 |
| 连七对 | ❌ | ✅（88 番） | ❌ |
| 十三幺 / 国士 | ✅ 国士无双 28 赋 | ✅（88 番） | ✅ 役满 |
| 九莲宝灯 | ✅ 28 赋 | ✅（88 番） | ✅ 役满 |
| 大三元 | ✅ 28 赋 | ✅（88 番） | ✅ 役满 |
| 小三元 | ✅ 8 赋 | ✅（64 番） | ✅ 2 番 |
| 大四喜 / 小四喜 | ✅ 四喜和 28 赋（合一） | ✅ 分大小（88/64） | ✅ 分大小（役满） |
| 字一色 | ✅ 28 赋 | ✅（64 番） | ✅ 役满 |
| 清幺九 / 清老头 | ✅ 28 赋 | ✅（64 番） | ✅ 役满 |
| 绿一色 | ✅ 28 赋 | ✅（88 番） | ✅ 役满 |
| 四杠子 | ✅ 四明杠 70 赋 | ✅（88 番） | ✅ 役满 |
| 清一色 / 混一色 | ✅ 14 / 5 赋 | ✅（24 / 6 番） | ✅（6/5、3/2） |
| 三色同顺 / 三色同刻 | ✅ 4 / 5 赋 | ✅（8 / 16 番） | ✅ 2 / 2 番 |
| 一气通贯 | ✅ 4 赋 | ✅（16 番） | ✅ 2 番（门清 2、副露 1） |
| 混全带幺 / 纯全带幺 | ✅ 5 / 7 赋 | ✅（8 / 16 番） | ✅（2/1、3/2） |
| 一色三节高 / 一色三步高 | ✅ 3 / 4 赋 | ✅（两者都有） | ❌ |
| 全带五 | ❌ | ✅（16 番） | ❌ |
| 五门齐 | ✅ 5 赋 | ✅（6 番） | ❌ |
| 缺一门 | ✅ 3 赋 | ❌ | ❌ |
| 四归一 | ✅ 2 赋 | ❌ | ❌ |
| 全带赤（七子特判 14000 起） | ✅ | ❌（无赤宝牌） | ❌（赤宝牌另计，不入番） |
| 星星总表（纯正水中月/三七之花/美人七对…） | ✅ 70/28/14 赋 | ❌ | ❌ |
| 赤宝牌 / 花牌 | ❌（规则书明确无） | 花牌有（1 番） | 赤宝牌有 |
| 「食降」（副露该役 −1 赋） | ✅ 独特机制 | ❌ | ❌（只失效门清限定役） |
| 可选役（默认关，验证台开） | ✅ 7 个 | ❌ | ❌ |
| 影子役（被更高优先权截走） | ✅ 存在（如 字一色←四暗刻） | 一般靠"不重复计"规则 | 靠"複合/不複合"表 |

## 6. 对本项目（C# 迁移）的直接影响

1. **役种数据只认 `ike.json`**；上表只用来判断"这个役是不是通用概念"，避免命名与语义混淆。
2. **"食降"是七子独有**，C# 的 `YakuSpec` 必须带 `Kaishoku` 字段（ike 里 12 个役有）。
3. **"可选役"“影子役”“双役满 70"** 也是七子独有，不要按日麻的"役满複合"去实现。
4. **国标的分值档（88…1）与七子的赋位表（70/28/14/8/7/5/4/3/2/1）不同构**，不可混用。

## 7. 待补清单（下一轮资料）

| 项 | 需要的源 | 阻塞原因 |
|---|---|---|
| 国标 81 番的中文名 + 逐项分值 | 中文版《麻将竞赛规则》或可靠中文表 | 百科站 WAF / 维基被反代拦 |
| 日麻 45 役的中文名 + 番数 | `yaku_list/*.py` 逐文件（jsDelivr 可达） | 未批量抓取（可行，约 45 次请求） |
| 中庸麻将役种表 | 关兆豪原书/论文或可靠中文页 | 同上（WAF/反代） |
| 古典麻将役种表 | 同上 | 同上 |

> **经验**：本机大部分中文百科（萌百、百度百科、维基）不可用；**可用通道**是
> 官方 PDF（如 MCR）、GitHub API + jsDelivr CDN、以及少数直连站点。
