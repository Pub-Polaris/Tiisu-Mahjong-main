# CHANGELOG · 七子麻将（Tiisu Mahjong）

> 本文件按版本记录项目全部历史改动，是后续所有变更的基准。
> **说明**：项目早期未使用 git 逐步提交，本 CHANGELOG 由代码现状 + 既有文档/决策在 2026-09-26 事后整理而成；日期为版本日期，非提交日期。
> 维护规则见 `docs/北极星_(人类)/文档模板.md`。
> **历史条目**：`260926-06` 及更早的版本已移入 `CHANGELOG_ARCHIVE.md`（**按需查，不进必读清单**）。本文件只保留最近若干条 + 待办区。新增改动请在本文件"最新版本"处追加，并同步更新页脚版本戳。

---

## 版本索引

| 版本 | 日期 | 主题 | 一句话 |
|---|---|---|---|
| 260806 | 2026-08-06 | 解耦与判役修复 | 逻辑拆出 `src/`；修 P07/P08/P09 |
| 260807 | 2026-08-07 | 记录系统 / UUID / UI | 牌型日志、玩家身份、中央牌桌改版 |
| 260808 | 2026-08-08 | 测试台移除 / 立直移除 / 役种修正 | 去测试目录；修混全带幺、七对子、偶发役 |
| 260809 | 2026-08-09 | 服务端 API / 门户 / 调试台 | 设置/存档/统计；会话恢复；运行时命令 |
| 260811 | 2026-08-11 | UI 改版与赐马 | 行动区、14 张手牌、赐马机制 |
| 260822 | 2026-08-22 | 稳定化 | 门风轮转、终局防重、牌山跳墩、初始化兜底 |
| 260926 | 2026-09-26 | 文档工程重整 + 启动兜底 + 冒烟 | docs 三分区；根 `AGENTS.md`；`scripts/smoke.ps1`；修依赖兜底 bug |
| 260926-06 | 2026-09-26 晚 | 外部审查：规则对照 + 三国将修正 + 工程卫生 | 新增规则对照报告；修 A1；BOM/日志/坏链/重复键；断言 97/97 |
| 260926-07 | 2026-09-26 深夜 | 规则书全量对齐 + 引擎级测试 | 牌山模型C、流局/连庄全套、双和子跳庄、出岭、段位点、水滴石破等；新增 engine_test + run_all.py |
| 260926-08 | 2026-09-27 凌晨 | 十三不靠 + 统一流局按钮 | 新增 `isThirteenUnrelated`/`flowOptions`；九种九牌与十三不靠共用一个「流局」按钮；engine 断言 57/57 |
| 260927-01 | 2026-09-27 | 仓库上 GitHub + 契约同步 git 双轨 | 建 `Pub-Polaris/Tiisu-Mahjong-main`（79 文件）；AGENTS.md 加 2.6 节、红线改写、交付含 push |
| 260927-02 | 2026-09-27 | docs 落差清理 + stats.json 出库 | stats.json 加 .gitignore 并取消跟踪；修 CHANGELOG 两条过期陈述；工具调用说明补全目录名与 git 现状 |
| 260927-03 | 2026-09-27 | 已知坑补两条工具坑 | 新增 6.8（Get-Content -Encoding UTF8 按 GBK 读、写回毁全文）与 6.9（行尾 CRLF/LF 不统一）；工具与环境 7→9 条 |
| 260927-04 | 2026-09-27 | 修正 3 处文档错误 + 建立 agent 改动链条 | AGENTS.md 42->57、工具调用说明日期、docs/README.md 改跑 run_all.py；双 trailer（Agent/Pair，含北极星）+ pull --rebase 约定 + 根目录 AGCOMMIT_CHAIN.MD |
| 260927-05 | 2026-09-27 | 项目交接同步现状 | 交接文档「无 git / 无测试 / 役满未实现」等过时陈述对齐；修正水滴石破与tiisuin两处失实；docs/README.md 登记链条文件 |
| 260927-06 | 2026-09-27 | CHANGELOG 拆归档 + 待办区重写 | 新增 `CHANGELOG_ARCHIVE.md`（12 个历史条目）；主文件降约 49%；待办区重写并补编号约定 |
| 260927-07 | 2026-09-27 | 役满优先权反例 + 待办区更正 | 新增 2 条「被更高优先权截走」反例；更正待办区对 4 个役满用例覆盖的失实描述；补记驷马越岭条件 |
| 260927-08 | 2026-09-27 | tiisuin：去开关 + 改名 | 大七星改为无条件直接获胜（不计分）；标识符 daxingqi->tiisuin、展示名改为 tiisuin；统计键迁移保留计数 |
| 260927-09 | 2026-09-27 | **opencode 校正轮**：展示名回归 + 回门户 + 统计隔离 | 展示名回归「大七星」（玩家只看中文）；实现「回门户等 5 秒」；补「见证 +1」；stats 旧键归一化；测试加 stats 内存桩；修 5 处过期陈述/标题；备份清单改整目录打包 |
| 260927-10 | 2026-09-27 | **终局延长改「只补一圈」**+ 隔离扩到 state.json + smoke 口径修正 | 全庄/东风/半庄未达标只补一圈即终局；断言页加 `?nostart=1` 彻底不碰 state.json；`run_all.py` 同时复核两个运行态文件；`smoke.ps1` 单实例检查改为看 7777 |
| 260927-11 | 2026-09-27 | **终局延长改「只补一手」**（推翻 260927-10 的「补一圈」）+ 安全上限收小 | 未达标只打一手（南入/西入/北增），和牌或流局即终局；各延长只 1 次；安全上限 `modeTarget+16`；`roundLabel` 显示延长标签 |
| 261002-01 | 2026-10-02 | **任务执行铁律**（AGENTS.md 新增第零章） | 先完整后测试 / 分区块串行 / 开工前先问优先度；回填基线与页脚版本至 `261002` |
| 261002-02 | 2026-10-02 | 工具坑 6.11 + 验收证据要求 + 链条引用校准 | 新增「Python 读写模式把行尾翻倍」一条；`AGENTS.md` 加 5.2.1（验收必须附命令+原始输出）；修链条里的失效 hash 与时间戳 |
| 261002-03 | 2026-10-02 | 更正 `opencode` 的能力陈述（无 git，但有命令执行能力） | 区分「无 git」与「无工具」；5.2.1 加「无工具方豁免」；链条标题与协作表同步 |
| 261002-04 | 2026-10-02 | 目录/交接同步 + **新增实验界面 `new.html`**（现代极简皮肤 + 游戏内切换） | `项目交接`+`规则缺口清单` 过时陈述对齐；`index.html` 拆出 `css/game.css`/`js/game.js`；新增 `css/theme-modern.css` 与 `new.html`；运行时工具条加「界面」切换（不跳转、不丢对局）；门户加界面选择 |
| 261002-05 | 2026-10-02 | **修现代皮肤不生效**（`261002-04` 的缺陷）+ 断言补「皮肤接线」 | 切换器误禁用 `game.css`（含全部结构）→ 布局塌陷；现代皮肤改为 `html[data-ui="modern"]` 作用域覆盖层；`run_all.py` 新增 `skin wiring` 检查 |

版本号规则：`YYMMDD`（例：`260926` = 2026-09-26）。
---

## 261002-05 — 修现代皮肤不生效（261002-04 的缺陷）+ 断言补「皮肤接线」（2026-10-02）

**主题**：北极星截图发现 `new.html` 现代版**布局塌成一行行文字**。查证后确认是 `261002-04` 的两个实现缺陷，
本条修掉，并把这类"看不出来"的失效纳入 `run_all.py` 断言。

### 一、缺陷 A：切换器把 `css/game.css` 也禁用掉了（致命）

- **现象**：现代版整页丢布局 —— 无桌面、无座位定位、无牌面尺寸，只剩裸 DOM 文字。
- **根因**：`261002-04` 把两套皮肤做成"两个 `<link>`，按版本 toggle `disabled`"。但
  `css/game.css` 里装着**全部结构规则**（`.table{width:1460px;height:900px}`、`.seat-*` 定位、
  `.tile` 尺寸与 `background-image`），它**不是皮肤，是骨架**；禁用它等于把骨架抽掉。
- **修法**：`game.css` **任何时候都启用、绝不 disable**。现代皮肤改为**作用域覆盖层** ——
  全部规则收在 `html[data-ui="modern"]` 之下，classic 时自然不生效。
  切换只改 `data-ui` 属性，不再触碰任何 `<link>`。

### 二、缺陷 B：作用域改写时逗号选择器只给第一项加了前缀

- **现象**：即使属性正确，现代皮肤仍**毫无颜色**。
- **根因**：把皮肤规则批量改写成 `html[data-ui="modern"] <选择器>` 时：
  1. `:root` 被改成了 `html[data-ui="modern"] html[data-ui="modern"]`（自嵌套，永不匹配）→
     **CSS 变量全部未定义**；而皮肤的颜色全靠 `var(--bg)` 一类变量，于是整页无色。
  2. `.a, .b` 只给第一项加前缀 → `.b` 仍是裸选择器，又被 `game.css` 的同名规则盖住，
     在 modern 下**回退成经典样式**（`.tli-item` / `.btn-*` / `.dealer-badge` 等）。
- **修法**：`:root` 直接改写为 `html[data-ui="modern"]`；逗号列表**逐项**加前缀；
  并加断言"改写后不允许存在未加作用域的顶层规则"。

### 三、断言补强：`run_all.py` 新增 `skin wiring`

原检查只核对 `data-ui` 属性值，所以**在布局已经塌掉的情况下照样报 PASS** —— 这正是本条要堵的洞。
新检查对 4 个组合（`new.html` / `new.html?ui=classic` / `index.html` / `index.html?ui=modern`）同时核对：

1. `data-ui` 是否为期望值；
2. **`css/game.css` 未被禁用**（关键回归项）；
3. 牌面已渲染（`class="tile`）；
4. `#uiVersionSel` 已注入；
5. 无 JS 报错。

### 四、验收（5.2.1：命令 + 原始输出）

命令：`python P:\Playground\scripts\run_all.py --runs 2`

    YAKUTEST: PASS 133/133 断言 · 51 用例
    ENGINETEST: PASS 73/73 断言 · 18 用例
    [PASS] stats.json + state.json 逐字节不变
    [PASS] auto games clean
    界面版本接线（new.html / index.html）
      [PASS] new.html               want=modern   got=modern   game.css-disabled=False jserr=0
      [PASS] new.html?ui=classic    want=classic  got=classic  game.css-disabled=False jserr=0
      [PASS] index.html             want=classic  got=classic  game.css-disabled=False jserr=0
      [PASS] index.html?ui=modern   want=modern   got=modern   game.css-disabled=False jserr=0
    ALL CHECKS PASSED

另用无头 Edge 实测计算样式，确认现代皮肤真的生效：

    --bg on html      = #07171c
    body background   = rgb(7, 23, 28)
    table background  = radial-gradient(120% 120% at 50% 0%, rgb(18,56,64) 0%, rgb(14,42,49) 45%, rgb(7,23,28) 100%)
    table width/height= 1460px / 900px      ← 结构仍在

### 五、教训（已写入本节，供后续参考）

"检查属性对不对"**不等于**"检查东西长什么样"。凡是**视觉/布局**类改动，
断言至少要覆盖一项**结构性事实**（尺寸、是否被禁用、关键类是否生效），
否则会出现"断言全绿、界面全烂"。

---

## 261002-04 — 新增实验界面 new.html（现代极简皮肤 + 游戏内切换）（2026-10-02）

**主题**：北极星要求"拿一份美术"并做一个 `new.html`，按按键可进新版验证。方向定为
**现代极简：深青底 + 金线 + 大圆角**；定位为**平行实验版**（可改 DOM/JS）；入口为**游戏内切换开关**。

### 一、结构重构（为让两版共用逻辑）

原 `index.html` 是"单页内联一切"（45KB：内联 `<style>` 8.2KB + 内联装配层 30KB）。
若直接复制成 `new.html`，会立刻产生两份 30KB 的重复装配层，**引擎一改就两边失步**。
故先做等价重构，再叠皮肤：

| 新文件 | 来源 | 说明 |
|---|---|---|
| `css/game.css` | 原 `index.html` 的 `<style>` 内容 | 经典皮肤，**内容一字未改** |
| `js/game.js` | 原 `index.html` 的内联装配层 | 逻辑一字未改，末尾追加 UI 版本切换模块 |
| `index.html` | 重新拼装 | 改为外链 `css`/`js`，DOM 一字未改 |

重构过程用"拆开再拼回、断言与原文件**逐字节相同**"来保证等价，不是靠肉眼比对。

### 二、新增界面

- `css/theme-modern.css`：现代极简皮肤。与 `game.css` **同时 <link>**，靠 `disabled` 切换，
  故切换**不跳转页面、不丢对局状态**。仅覆盖视觉（色/圆角/阴影/描边），**不改任何 `display`** ——
  页面显隐由内联 `style.display`（`''` = 显示）控制，设了会与逻辑打架。
- `new.html`：与 `index.html` **同一份 DOM 与同一份 `js/game.js`**，只把默认皮肤改为 `modern`。
- 运行时工具条新增「界面」下拉：`经典` / `现代（实验）`；选择记入 `localStorage`（键 `oc_ui_version`）。
- `portal.html` 设置区新增「界面」选择，`openGame()` 会带 `?ui=` 打开对应皮肤。
- URL 参数 `?ui=classic|modern` 可强制覆盖（便于对比与自动化）。

### 三、验收（5.2.1：命令 + 原始输出）

命令一：`python P:\Playground\scripts\run_all.py --runs 2`

    YAKUTEST:  PASS 133/133 断言 · 51 用例
    ENGINETEST: PASS 73/73 断言 · 18 用例
    [PASS] stats.json + state.json 逐字节不变
    [PASS] auto games clean
    ALL CHECKS PASSED

命令二：`python check_skin.py`（无头 Edge 逐页核对皮肤接线）

    new.html            default=modern   want=modern   got=modern   tiles=True switcher=True jserr=0 OK
    new.html?ui=classic default=modern   want=classic  got=classic  tiles=True switcher=True jserr=0 OK
    index.html          default=classic  want=classic  got=classic  tiles=True switcher=True jserr=0 OK
    index.html?ui=modern default=classic want=modern   got=modern   tiles=True switcher=True jserr=0 OK
    RESULT: PASS

自动对局在 `new.html` 下同样跑到「对局结束」（含终局判定），无 JS 报错。

### 四、留给下方

- 现代皮肤为**第一版**，只做了视觉层；牌背/骰子仍是 CSS 色块与 emoji（美术可后续替换，见 `design_design_guide.md`）。
- `design_design_guide.md` 的色值表仍描述经典皮肤；若要长期维护两套皮肤，需补"变量化"一节。

---

## 261002-03 — 更正 `opencode` 能力陈述（2026-10-02）

**主题**：北极星指出 `opencode` **没有被安装 git**，只能做本地文件修改；`dsh` 才有 git。
据此更正文档与链条里的能力陈述，并给验收条款补上「无工具方」的豁免。

### 一、更正内容

- `AGCOMMIT_CHAIN.MD`「当一方没有 git 时怎么协作」开头的陈述，原文只写「`opencode` 尚未开通 git，只能读改磁盘文件」——**容易被读成"他什么工具都没有"**。现改为明确区分：
  - `opencode`：**没有 git**，不能 `commit` / `push`；**但能执行命令**（Python 等可用）。
  - `dsh`：有 git，可 `commit` / `push`。
- 同节协作表新增一行「**没 git 的一方要不要跑校验**」→ **要**。校验只用 Python（`scripts/run_all.py`），与 git 无关。

### 二、`AGENTS.md` 5.2.1 新增第 5 条「无工具方的豁免」

- 只豁免「**缺失的工具**」，不豁免「**跑得动却不跑**」。
- **验证不需要 git**：`run_all.py` 由 Python 执行，"没有 git"**不构成**免于验证的理由。
- 真正可豁免的只有一种：该方**确实无法执行任何命令**——此时须写明「**无法自验**」并**点名缺哪个工具**，由**有工具的一方代验**并登记链条。
- 设计意图：堵「无来源结论」，不是要求做不到的事。

### 三、说明（自我更正）

`dsh` 上一轮曾说 `opencode`「能本地 commit、只是不能 push」——**这是错的**，该说法来自 `dsh` 在自己机器上执行 `Get-Command git` 的结果，那是 `dsh` 的环境，不是 `opencode` 的。本条即对该错误的更正。

### 四、验收

- 纯文档修改，未动代码；按零.1 统一跑一次 `scripts/run_all.py`。
- 两个被改文件（`AGENTS.md`、`AGCOMMIT_CHAIN.MD`）行尾均为 LF、无 BOM。

---

## 261002-02 — 工具坑 6.11 + 验收证据要求 + 链条引用校准（2026-10-02）

**主题**：把本轮实际踩到的一个工具坑写进清单，并补上「验收必须给证据」的契约条款；同时校准 `AGCOMMIT_CHAIN.MD` 里已失效的引用。
**仅动文档与链条，未动任何代码。**

### 一、`已知坑` 新增 6.11（行尾被脚本改坏）

- **坑本身**：Python 脚本「读用 `newline=""`、写用默认文本模式」时，Windows 上会把每个 `\n` 再翻译成 `\r\n`，甚至产生 `\r\r\n`，每行凭空 +1 字节。
- **症状极具迷惑性**：`git status` 显示已修改，`git diff --stat` 显示**全文每一行都改了**，但 `git hash-object` 与 `git ls-files -s` 的 blob hash **完全一致**。
- **实例**：2026-10-02 给 `AGENTS.md` 加第零章时，一次踩中 `AGENTS.md` / `CHANGELOG.md` / `AGCOMMIT_CHAIN.MD` 等 4 个文件，已全部按二进制方式还原为 LF，并用 `git diff` 核验为纯内容差异。
- 同时在 6.9 加了指向 6.11 的交叉引用；「工具与环境」条数 10 → 11。

### 二、`AGENTS.md` 新增 5.2.1「验收必须附证据」

针对「只给结论、不给来源」的汇报方式，明确要求宣布通过时必须同时给出：
1. **完整命令**（如 `python P:\Playground\scripts\run_all.py --runs 2`）；
2. **原始输出**（断言页的 `PASS n/n 断言 · m 用例` 与末行 `ALL CHECKS PASSED`）；
3. **禁止**只写「全绿」「yaku 133/133」这类无来源结论；
4. 没跑就**明说未验证**并给原因，不得默认「应该没问题」。

七.7（提交与交付）同步补一句：交付说明里必须附 5.2.1 的证据。
依据：零.1 与 `已知坑` 6.5（网络盘反复加载 `.ps1` 可能触发 AMSI 崩溃），故优先用 `run_all.py`。

### 三、链条引用校准

- `北极星` 那行的 hash 原为 `5ceaeec`（已被后续 amend 顶掉），按规则 5 改为 `（本条）`。
- 两行时间戳 `16:3x` → `16:32`。

### 四、验收

- 纯文档修改；按零.1，改完统一跑一次 `scripts/run_all.py`（结果见下）。
- 三个被改文件行尾均为 LF、无 BOM：`已知坑.md`、`AGENTS.md`、`AGCOMMIT_CHAIN.MD`。

---

## 261002-01 — 任务执行铁律（AGENTS.md 第零章）（2026-10-02）

**主题**：北极星定下**针对 agent 行为本身**的三条铁律，写入根目录 `AGENTS.md`，置于最前（目录之前），声明为**最高执行优先级**。
**本次仅动契约文件，未动任何代码、役种、计分公式。**

### 一、新增内容

`AGENTS.md` 新增第零章「任务执行铁律」（含 `零.1` / `零.2` / `零.3` 三节）：

| 条 | 要求 |
|---|---|
| 零.1 | **先完整，后测试**：功能开发阶段禁止穿插运行测试；模块保持可解耦（独立接口 + 清晰依赖边界）；全部完成后统一跑全量测试 |
| 零.2 | **分区块串行，禁止并行**：不同区块不得同时开工；区块 A 全部功能与测试完成后才启动 B；每次切换必须声明 `进行中 → 已完成 → 下一区块启动` |
| 零.3 | **开工前必须询问优先度**：接收任务列表后、实质性工作开始前，必须弹**多选提问框**（`ask_user_question` + `multi_select`）让用户选优先度；确认前不得启动任务 |

同步更新：目录新增第 `0` 项并将原 1–9 重号为 2–10；文件页脚与基线版本至 `261002`。

### 二、适用范围

适用于**所有任务**（开发 / 修复 / 文档 / 重构），与本仓库其他章节冲突时以第零章为准。
与旧约定的关系：旧 `2.3`（改完必跑一键校验）与 `5.1`（一键校验首选）**仍然有效**，但"何时跑"改由零.1 约束——**功能未完成前不跑，全部完成后统一跑**。

### 三、验收

- 本次为**纯文档修改**，未动代码；按零.1，改完后统一跑一次全量校验（`scripts/run_all.py`）。
- `AGENTS.md`：新增 30 行、改 2 行；行尾保持 LF（无 CRLF）、无 BOM。

### 四、关于编号

本条改动的是**契约正文**，不属于「纯协同类」（后者只动链条文件/约定/索引），故占用版本号 `261002-01`。
若北极星认为应归入纯协同、只登链条不占号，可改。

---

## 260927-11 — 终局延长改「只补一手」+ 安全上限收小（2026-09-27）

**主题**：北极星对 3.8（场风轮转与终局）追加裁定，**直接修正 `260927-10` 的延长口径**。
**仅改终局判定一处逻辑与相关测试/文档，未动任何役种、计分公式。**

### 一、口径（北极星原文）

> 西入、南入、北增都只 1 次，打一轮直到有人和牌/进行流局就停
> 不需要太大，如果它操作连庄的话，连庄本身就不需要这么大（有七日终战约束）
> 默认 16 圈（东风、南风、西风、北风）下来够了

落成三条规则：

1. **各延长只发生 1 次**（南入 / 西入 / 北增）。
2. **延长只打「一手」**：这一手以**和牌或流局**结束即终局；不再打满一圈（4 手）。
3. **安全上限不需要大**：连庄已由「七日终战」（本场达 7 → 强制过庄进 ALL LAST）约束；
   默认全庄 16 手（东南西北各 4 手）就够。

### 二、实现（`src/engine.js`）

`advanceRound()` 的终局条件重写：

```js
if (this.modeTarget === 1) {
    over = true;                                   // 一局制：一手即终
} else if (this._inExtension) {
    over = true;                                   // 延长的那一手已打完 → 立即终局
} else if (this.roundWindIdx > this.finalWindIdx) {
    if (top >= this.initialPoints) over = true;    // 最后一场达标 → 终局
    else this._inExtension = true;                 // 未达标 → 只补一手（各延长只 1 次）
}
if (this.handsPlayed >= this.modeTarget + 16) over = true;   // 防跑飞兜底（原 ×6 过大）
```

- 新增实例标记 **`this._inExtension`**（构造 / `setMode` / `resetAll` 均重置为 `false`）；
  进入延长的那一手打完，`advanceRound` 立即 `over = true`。
- **安全上限**由 `modeTarget × 6`（全庄 96 手）**收小为 `modeTarget + 16`**（全庄 16+16=32 手）—— 仍留足连庄余量（实测全庄正常收口约 20–26 手），同时不再是 ×6 那种夸张值。
- `roundLabel()` 增加延长标签：<code>南入N局</code> / <code>西入N局</code> / <code>北增N局</code>
  （全庄战北场之后的延长用「北增」）。
- 删除了旧的 `roundWindIdx > finalWindIdx + 1`（补满一圈）分支 —— 只补一手后不可能走到。

### 二·二、连带修出的两个 bug（旧「打满 modeTarget 手」假设的残留）

改成「按场风收口」后，两处仍假设「打满 `modeTarget` 手 = 对局结束」的代码会误判，一并修掉：

1. **`saveSessionState()` 的 `inProgress`**：原为 `this.handsPlayed < this.modeTarget` —— 连庄多打时会**在 16 手后误标为「对局已结束」**，导致刷新后不再提示恢复。改为 **`!this.matchOver`**（以真正的终局标记为准）。
2. **`advanceRound()` 开头的防重守卫**：原为 `if (this.gameOver && this.handsPlayed >= this.modeTarget) return false;` —— `gameOver` 每局和牌都会置 true，于是**第 16 手一打完就彻底冻结、再也开不了新局**（全庄战根本打不到北场结束）。改为只认 **`if (this.matchOver) return false;`**。

> 实测（`?auto=1&mode=16`）：修前跑到「北1局 / 16局」即冻结；修后能继续到北场收口 / 延长。

### 三、测试

`scripts/engine_test.html` 的终局用例重写，新增/替换断言（**18 用例 / 73 断言**）：

- 全庄未达标 → **不终局**，`_inExtension === true`，标签为「北增1局」；
- 延长一手打完 → **立即终局**（不再看分数，也不会出现第二个延长）；
- 全庄已达标 → **不延长**，直接终局；
- 半庄未达标 → 标签「西入…」；东风未达标 → 标签「南入…」；
- 安全上限 = `modeTarget + 16`。

### 四、验收

```
python scripts/run_all.py --runs 1
```

| 检查 | 结果 |
|---|---|
| YAKUTEST | **PASS 133/133 断言 · 51 用例** |
| ENGINETEST | **PASS 73/73 断言 · 18 用例** |
| 测试隔离 | `stats.json` + `state.json` 逐字节不变 |
| 全自动冒烟 | 零 JS 报错、回合已渲染 |
| `smoke.ps1` | **PASS 9/9** |

### 五、文档同步

规则书附录 **J-C**、`规则缺口清单.md`、`规则与实现_当前版本.md` 3.8、`个人指南_北极星.md`、
`AGENTS.md`、`docs/README.md`、`项目交接.md`、`工具调用说明.md`、`文档自检_260926.md`、
`AGCOMMIT_CHAIN.MD`（用例数行）—— 全部由「只补一圈」改为「只补一手」。

### 六、留给 `dsh`（提交）

- 本条与 `260927-09` / `260927-10` **同属一批未提交改动**，请**一次提交**；
  提交时按 `AGCOMMIT_CHAIN.MD` 里 `opencode` 那一行的留话操作（回填 hash + 双 trailer）。

---

## 260927-10 — 终局延长改「只补一圈」+ 隔离扩到 state.json + smoke 口径修正（2026-09-27）

> **本条「只补一圈」的延长口径已被 `260927-11` 修正为「只补一手」**（北极星 2026-09-27 再定）。下文其他内容仍然有效。

**主题**：北极星拍板 3 项口径后的落地。**仅改口径与测试基础设施，未动任何役种判定。**

### 一、终局延长：未达标「只补一圈就结束」（已确认口径）

`src/engine.js#advanceRound()` 的终局条件由「循环延长直到 1 位达标」改为：

```js
} else if (this.roundWindIdx > this.finalWindIdx + 1) {
    over = true;                                  // 补满一圈 → 无论分数都终局
} else if (this.roundWindIdx > this.finalWindIdx && top >= this.initialPoints) {
    over = true;                                  // 圈内已达标 → 提前终局
}
```

- **东风战**：东场完未达 49000 → **南入一圈**，该圈完即终局。
- **半庄战**：东南场完未达 49000 → **西入一圈**，该圈完即终局。
- **全庄战**：北场完未达 77000 → **再打一圈**，该圈完即终局（不再无限延长）。
- 安全上限 `handsPlayed >= modeTarget × 6` 保留为兜底（正常不再触发）。
- 同步文档：规则书附录 **J-C**、`规则缺口清单.md`、`规则与实现_当前版本.md` 3.8（并把该行待办由「口径待确认」改为「已定」）。

### 二、断言隔离扩到 `state.json`（此前只拦了 `stats.json`）

- **实情**：断言页挂载的 `index.html` 在加载时会 `POST /api/state {inProgress:false}`（`startFresh`），
  且 `engine_test` 的断言会真实调用 `saveSessionState()` / `declareTiisuin()` / `advanceRound()`，
  于是**跑一次断言就改写 `state.json`**（`run_all.py` 只查 `stats.json`，漏掉了它）。
- **修法（双保险）**：
  1. `index.html` 支持 **`?nostart=1`**：只装配 + 渲染，**不开局、不写 state.json、不起命令轮询**；
     两个断言页改为挂载 `../index.html?nostart=1`。
  2. 两个断言页的网络桩由「只拦 `/api/stats`」扩为「**同时拦 `/api/stats` 与 `/api/state`**」。
  3. `scripts/run_all.py`：跑断言前后**逐字节比对 `stats.json` 与 `state.json`**，检查项更名为 `run-state isolation`。
  4. 顺带修掉 `run_all.py` 里残留的重复失败标签（曾同时打 `run-state isolation` 与 `stats isolation`）。
- 另修一处测试自身的坑：`yaku_test` 的隔离用例直接 `saveSessionState()`，
  但 `gameFactory()` 没初始化 `scores`，`this.scores.slice()` 抛错后被 engine 内部 `try/catch` 静默吞掉
  → 断言永远拿不到请求。已补齐 `scores/modeTarget/handsPlayed/...` 再调用。

### 三、`smoke.ps1` 单实例检查改为「只看 7777」

- 原第 1 项要求**全机** `python.exe` 进程 ≤ 1，本机常驻 `unsloth_studio` → **恒 `FAIL 8/9`**。
- 改为：`Get-NetTCPConnection -LocalPort 7777 -State Listen` 取 `OwningProcess | -Unique`，判「**占用 7777 的进程 ≤ 1**」。
- 保持文件**纯 ASCII**（避免 PS 5.1 编码坑）；`docs/DSH/已知坑.md` 6.10 同步为「已修复」。
- 实测：**`RESULT: PASS 9/9`**（此前 8/9）。

### 四、验收

```
python scripts/run_all.py --runs 1
```

| 检查 | 结果 |
|---|---|
| YAKUTEST | **PASS 133/133 断言 · 51 用例** |
| ENGINETEST | **PASS 66/66 断言 · 18 用例** |
| 测试隔离 | `stats.json` + `state.json` **逐字节不变** |
| 全自动冒烟 | 零 JS 报错、回合已渲染 |
| `smoke.ps1 -Runs 1` | **PASS 9/9** |

### 五、留给 `dsh`（提交）

- 本轮由 `opencode` 完成、**仍未提交**；与本条一起提交即可（见 `AGCOMMIT_CHAIN.MD` 中 opencode 那一行的留话）。
- 计数已变：yaku **51 用例 / 133 断言**、engine **18 用例 / 66 断言** —— 相关文档已同步。

---

## 260927-09 — opencode 校正轮：展示名回归 + 回门户 + 统计隔离（2026-09-27）

**主题**：`260927-08` 由 `dsh` 做了「大七星 → tiisuin」的全局改名与去开关。本轮由 `opencode`（**尚无 git**）核对后做**口径校正与补齐**：区分「标识符」与「展示名」、把只声明未实现的部分落地、给断言加数据隔离。
**说明**：本轮由 opencode 单独完成，未在 git 中提交（见 `AGCOMMIT_CHAIN.MD` 的协作约定）。

### 一、命名口径校正（展示名回归「大七星」）

`260927-08` 把**展示名也改成了 `tiisuin`**（79 处），导致玩家/文档里出现「tiisuin 直接获胜」「tiisuin 算赋」等英文串。本轮确立并落地口径：

| 维度 | 口径 |
|---|---|
| 标识符 / 键名 / 方法名 | 用 `tiisuin`（`tiisuinCount`、`byPlayer[].tiisuin`、`declareTiisuin`、`isSevenHonors`） |
| **展示名（玩家可见文案）** | 一律用中文 **「大七星」**——不要拿 `tiisuin` 当玩家可见文字 |

- `src/engine.js`：`declareDaxingqi()` → **`declareTiisuin()`**（定义 + 调用点，与 `dsh` 的口径一致）；日志/overlay/记录步文案全部改为「大七星」。
- `portal.html`：统计区标题与标签改回「大七星（做出）/（见证）」；`id="stDaxingqi"` → `id="stTiisuin"`。
- `scripts/yaku_test.html` / `scripts/engine_test.html`：用例标题/注释改用「大七星（tiisuin）」。

### 二、实现「回门户等 5 秒」（此前只有注释、没有代码）

`260927-08` 的文档反复写「回门户」，但**代码里没有任何跳转**。本轮实现：

- `index.html` 新增顶层 `onMatchOver(reason)`：显示「（原因）N 秒后返回门户…」，倒计时 **5 秒**，到点 `location.href = 'portal.html'`。
- `src/engine.js` 在 **三处整场结束**调用该钩子（UI 由 index.html 实现，引擎不依赖 DOM）：
  - `declareTiisuin()`（大七星直接获胜）
  - `checkDeungnyeong()`（出岭击飞）
  - `advanceRound()` 终局分支
- 例外：**演示模式（`?auto=1`，`_demoMode`）不跳转**，否则自动演示会被打断。因此 `declareTiisuin()` 在把 `_demoMode` 置 false **之前**先记下 `wasDemo`。
- `startMode()` 会清掉进行中的跳转定时器，避免上一局的倒计时把新开的一局跳走。

### 三、补齐「见证 +1」（此前只发送、服务端忽略）

`engine.js` 早就上报 `witness: [三家名字]`，但 `server.py` **从未处理该字段**，文档却写「其余三家见证 +1」。本轮补齐：

- `server.py` `DEFAULT_STATS` 增 `witnessCount`；`_handle_stats` 对 `witness` 数组逐名累加 `byPlayer[].witness`，并累加 `witnessCount`。
- `portal.html` 增一个统计格「大七星（见证）」，明细行按需显示 `大七星(见证) N`。

### 四、`stats.json` 旧键归一化（消除混合态）

`260927-08` 改了键名，但磁盘上的 `stats.json` 仍同时存在 `daxingqiCount` 与 `tiisuinCount`、`byPlayer[].daxingqi` 与 `.tiisuin`。

- `server.py` 新增 `_normalize_stats()`（幂等）：读入时把 `daxingqiCount` 折进 `tiisuinCount`、`byPlayer[].daxingqi` 折进 `.tiisuin`，然后**删除旧键**；GET/POST 都走这条规范化。
- `stats.json` 由「混合态」重写为规范结构（计数保留：`tiisuinCount: 1`、`wins: 23`、`rounds: 19`）。

### 五、断言数据隔离（测试不再改累计统计）

断言页会真实调用 `reportStats*()`，此前每跑一次测试就把 `wins`/`rounds` 写进 `stats.json`（属"运行态被测试改"）。

- `scripts/yaku_test.html`（`window.fetch`）与 `scripts/engine_test.html`（iframe 的 `w.fetch`）：把 **`/api/stats` 换成内存桩**，只记录调用、不落盘；其余端点（`/api/log` 等）照常。
- `scripts/run_all.py`：跑断言**前后逐字节比对 `stats.json`**，新增独立检查 `测试隔离：stats.json 未被断言改动`（PASS/FAIL）。
- `scripts/engine_test.html` 的「大七星」用例同步加断言：拦截到 2 次上报、其中 1 次带 `witness` 且长度为 3。

### 六、修 5 处过期陈述 / 标题

| 位置 | 过期内容 | 现状 |
|---|---|---|
| `scripts/engine_test.html` 用例标题 | 「tiisuin：**开启算赋时 → 双役满 70000** + 立即结束整场」 | 大七星·**无条件**：不计分 + 立即结束整场 + 回门户钩子 + 统计不落盘 |
| `src/winchecker.js` 注释（4 处） | 「默认不计分（由 `winCtx.tiisuin` 决定是否计赋）」「仅在开启时计分」 | 已改：**本身不计分**，由 engine 直接结束整局 |
| `src/engine.js` 注释（3 处） | 「tiisuin直接获胜」 | 「大七星」 |
| `docs/北极星_(人类)/规则与实现_当前版本.md`、`规则对照_审查_260926.md`、`规则缺口清单.md`、`代码地图.md`、`个人指南_北极星.md`、`工具调用说明.md`、`项目交接.md`、`已知坑.md`、`AGENTS.md`、`design_ui_plan.md` | 残留「开启算赋 = 70000 / 默认不计分（可开启）/ `settings.tiisuin` / `winCtx.tiisuin` / 待裁定」 | 统一改为：**不计分、无条件直接结束整场、无开关**；`settings` 与 `winCtx` 里已无该键 |

### 七、`AGENTS.md` 2.1 备份清单改为整目录打包

原清单**逐列文件名**，已两次漏备（先漏 `scripts`，后漏 `AGENTS.md` / `CLAUDE.md` / `AGCOMMIT_CHAIN.MD`）。改为：

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
tar -czf "P:\Playground\backup\backup_$ts.tar.gz" --exclude=backup --exclude=logs -C "P:\Playground" .
```

### 八、启动前置的安全修正（避免误伤别的项目）

- **`AGENTS.md` 2.2**：原写「先杀掉所有 `python.exe`」——本机常驻 `unsloth_studio` 等 python 进程，**照做会误杀与本项目无关的任务**。改为**只结束占用 7777 的那一个**（`Get-NetTCPConnection -LocalPort 7777`），并追加自检输出。
- **`docs/DSH/已知坑.md` 新增 6.10**：登记该风险 + 附带说明「`smoke.ps1` 第 1 项用全机 python 计数，故在本机恒 `FAIL 8/9`，属脚本口径而非项目故障」；工具与环境 9 → 10 条。
- **`规则与实现_当前版本.md` 3.8**：由「待确认」更新为**已实现**的终局条件（场风走完 + 1 位 ≥ 初始点数；否则南入/西入/再打一圈；安全上限 `modeTarget × 6`），并把待办改成「口径确认」。

### 验收

`python scripts/run_all.py --runs 1` → **ALL CHECKS PASSED**：

| 检查 | 结果 |
|---|---|
| YAKUTEST | **PASS 133/133 断言 · 51 用例** |
| ENGINETEST | **PASS 66/66 断言 · 18 用例** |
| 测试隔离 | `stats.json` + `state.json` 逐字节不变 |
| 全自动冒烟 | 1 局零 JS 报错、回合已渲染 |

### 待 `dsh` 接手

- 本轮改动**未提交**（opencode 无 git）→ 请 `git status` 确认后一并提交（**别 `git add -A` 盲提**），并：
  1. 把 `AGCOMMIT_CHAIN.MD` 中本轮的 `（待 dsh 提交）` 回填成真实 hash（规则 8）；
  2. 按 `AGENTS.md` 七.8 带 `Agent: dsh` + `Pair: dsh+opencode` trailer。
- `260927-08` 里「展示名（79 处）改为 tiisuin」的表述已被本轮校正，**后续一律：标识符 `tiisuin` / 展示名「大七星」**。

---

## 260927-01 — 仓库上 GitHub + 契约同步 git 双轨（2026-09-27）

**主题**：项目从"只有 tar 备份、未使用 git"转为 **git 提交 + `backup/*.tar.gz` 双轨**；`AGENTS.md` 契约随之更正。

### 一、仓库

- 初始化 git 仓库并推送到 **`https://github.com/Pub-Polaris/Tiisu-Mahjong-main`**（公开，MIT）。
  - 首次提交 `8a3eb4d`（78 文件）；合并远端 `Initial commit`（保留其 LICENSE）后为 `f29bffb`。
  - 入库 **79 个文件 / 约 0.54 MB**；顶层：`docs/`(18) `mj_tiles/`(33) `scripts/`(8) `src/`(8) + 根文件。
  - 远端 `main` 已有 `Initial commit`（`LICENSE`，MIT，版权 `2026 公民北极星_Offiicial`）→ 用 **fetch + merge --allow-unrelated-histories** 合入，**未强推覆盖**。
- 新增 `.gitignore`（本仓库首次入库）：排除 `backup/`、`logs/`、`state.json`、`settings.json`、`*.zip`。
  - `settings.json` / `state.json` 属本机运行态；`TiisuMJ_Public_Test_20260911.zip` 为对外发包（内含一次性探针），均不入库。
- 仓库在网络路径（`\\SakuraNAS\Vol3`）上，git 报 `dubious ownership` → 已加全局 `safe.directory`（`%(prefix)///SakuraNAS/Vol3/Playground` 与 `P:/Playground`）。
- 提交身份用**仓库级**配置（不动全局）：`Pub-Polaris` / `Pub-Polaris@users.noreply.github.com`。
- 本机 **SSH 22 端口被拒**（`Connection refused`），推送走 HTTPS（凭据存于凭据管理器）。

### 二、README

- 新建仓库根 `README.md`：正文取规则书 **`一、规则概述`** 整章（按 `id="sec2"` 精确定位，HTML→Markdown，段落与全角标点保留原样），
  顶部加 `# 七子麻将 · Tiisu Mahjong`，把原章末的【简略特色】整理为项目符号列表。
- 其后追加 **AI 声明**（口语化）：规则为 Pub-Polaris 原创，代码由 AI 协作实现（opencode / DeepSeek Harness）；
  要点为「规则书是权威」「AI 会犯错」「缺口清单在 `docs/`」「规则的最终解释权在作者」。
- 已验证 GitHub 仓库页正确渲染 README（含该声明）。

### 三、`AGENTS.md` 修正

| # | 位置 | 改动 |
|---|---|---|
| 1 | 2.1 备份清单 | tar 清单末尾补 **`scripts`**（原清单漏了它，导致验收工具本身不入备份） |
| 2 | 新增 **2.6 git 与远程仓库** | 仓库地址 / 分支 / 提交身份 / `.gitignore` 排除项 / `safe.directory` 前置 / SSH 不可用 / 提交推送命令 |
| 3 | 六、红线 6 | 原为「本项目**未使用 git**……不要执行 `git init`」→ 改为「**不得重新 `git init` 或强推覆盖历史**；版本载体为 git 提交 + tar 备份**双轨**」 |
| 4 | 七、新增 7.7 | **提交与交付**：跑全绿 → 追加 CHANGELOG → 同步文档与页脚 → 落 tar 备份 → **`git commit` 并 `git push origin main`**；只提交不推送或只备份不提交都算未交付 |
| 5 | 页脚 | 文档版本 `260926` → `260927`（备份名不变） |

### 四、已知未做 / 与文档的落差

- `docs/` 内旧条目仍称"未使用 git"→ **有意保留**（历史事实，已在 `工具调用说明.md` 增补「git 现状」提示并说明 opencode-lcm 旧问题）。
- ~~`docs/README.md`、`docs/北极星_(人类)/导航.md` 的文档分区表仍写旧路径~~ → **该判断有误，已在 `260927-02` 更正**：实测这些文件早已是新路径，旧写法只在历史记录与归档里。

### 五、验收

- `AGENTS.md` 结构与中文完好（298 行、UTF-8 无 BOM、行尾 CRLF、小节顺序 2.1→2.6 连续）；旧陈述「本项目未使用 git」已从正文清除；页脚版本戳已更新。


## 260927-02 — docs 落差清理 + stats.json 出库（2026-09-27）

**主题**：清理 `260927-01` 里登记的"已知未做"落差；把本机运行计数器移出版本库。

### 一、`.gitignore`：本机可变文件全部出库

- 新增排除 **`stats.json`**（累计统计：`tiisuinCount`/`wins`/`rounds`/`byPlayer`）——属本机运行态，不进公开仓库。
  - 它此前**已被 git 跟踪**（`260927-01` 的首次提交带入），故仅加 `.gitignore` 无效，必须 **`git rm --cached stats.json`** 取消跟踪（磁盘文件保留）。
  - 验证：`git check-ignore -v stats.json` → `.gitignore:10:stats.json`。
- `.gitignore` 顺手统一为 **LF 行尾**（原为 3 处 CRLF + 14 处 LF 的混合）。
- 现有排除项：`backup/`、`logs/`、`state.json`、`settings.json`、`stats.json`、`*.zip`、`*.tmp`、`*.log`、`Thumbs.db`、`.DS_Store`。

### 二、CHANGELOG「待办」区的过期陈述已修正

该区原写着两条与现状不符的陈述（均在 260926-07 段末），现就地更新并标注：

| 原陈述 | 现状 |
|---|---|
| tiisuin：已实现判定，默认不计分（可开启） | **已改为本身不计分**，触发时直接结束本局回主菜单 + 记统计（做出者 +1 做出数、其余三家 +1 见证数） |
| 双役满 70000 点数档：未实现（上限 35000） | **已实现**：`doubleYakuman: true` → `specialPoints = 70000`，绕过赋位表与 35000 封顶；庄家 ×1.5 |

### 三、路径引用：全仓库精确扫描的结论

对 `docs/北极星/`、`docs/OpencodeAgent/`（后面**不接** `_(人类)` / `_老Agent想说的话`）做精确扫描，命中 5 个文件，**逐条判定**：

| 文件 | 命中性质 | 处理 |
|---|---|---|
| `docs/OpencodeAgent_老Agent想说的话/工具调用说明.md` | 目录树里的分区简写 | **已改为完整目录名**（唯一真实的过时引用） |
| `docs/DSH/契约_原AGENT.md_未规范状态.md` | 历史归档（作者已改名存档，内容不维护） | **有意不动** |
| `CHANGELOG.md` | 记录"已修复 70 处坏链"的历史文本 | **不动**（历史事实） |
| `规则与实现_当前版本.md` | 记录"已全量扫描并替换" | **不动** |
| `规则对照_审查_260926.md` | 记录 B3 坏链修复 | **不动** |

> **更正 `260927-01` 的一条错误陈述**：该条目曾写"`docs/README.md`、`导航.md` 仍写旧路径"。
> 实测**不成立**——`docs/README.md` 已有 `北极星_(人类)/` ×10、`portal.html` ×9、`导航.md` 已是新路径；
> 旧写法只存在于历史记录与归档里。原判断有误，此处更正。

### 四、git 历史注解（不改历史条目）

- 在 `工具调用说明.md` 增补「git 现状」提示：本仓库自 2026-09-27 起**已可使用 git**。
- 历史条目里"未使用 git"的记录**保持原样**——它描述的是当时的事实。原因（北极星 2026-09-27 说明）：
  早期 **opencode-lcm 与 git 共存时曾出现 git 破坏 lcm 数据库文件**的罕见问题，故当时禁用 git；该问题现已有工具可修复。
- 提示中保留一条安全建议：为保 lcm 数据库安全，仍勿对 `logs/` 做批量版本操作。

### 五、页脚版本戳

按"页脚描述该文档自身版本"的约定，**只升本次真正改过的文档**：`工具调用说明.md`、`CHANGELOG.md` → `260927`。
其余 15 份文档内容未变，页脚保持 `260926`。

### 六、验收

- `git check-ignore -v stats.json` 生效；`git status` 中 `stats.json` 不再出现。
- CHANGELOG 两条过期陈述已就地更新；`工具调用说明.md` 目录树为完整目录名、并含 git 现状提示。
- 各改动文件行尾与其原状一致（`.gitignore` 统一 LF；`CHANGELOG.md` 保持 CRLF；`工具调用说明.md` 保持 LF）。

## 260927-03 — 已知坑补两条工具坑（2026-09-27）

**主题**：把本轮踩到的两个 PowerShell / git 工具坑写进 `docs/DSH/已知坑.md` 第六节。

### 一、新增 6.8 · `Get-Content -Encoding UTF8` 按 GBK 读文件

- **现象**：`Get-Content -Raw -Encoding UTF8` 读 UTF-8 文件、替换后 `Set-Content` 写回，中文全部变成 `涓€銆侀」銮` 类乱码，体积异常涨大。
- **原因**：Windows PowerShell 5.1 的 `-Encoding UTF8` 只作用于**写出**；**读取**时按系统 ANSI 代码页（936/GBK）解码。
- **要点**：乱码在终端里常显示"正常"，极易被误判为没事 → 改完必须用 `[System.IO.File]::ReadAllText(..., UTF8)` 抽查中文标题。
- **处理**：一律走 .NET API（`ReadAllText`/`WriteAllText` + `UTF8Encoding $false`），不用 `Get-Content`/`Set-Content`；已毁则 `git checkout -- <file>` 还原。

### 二、新增 6.9 · 行尾 CRLF/LF 不统一

- **现象**：`$lines -join "`r`n"` 写回后 `git diff` 显示全文每一行都改了，体积每行 +1 字节。
- **原因**：仓库启用 `core.autocrlf` → git 库内存 LF、checkout 到磁盘转 CRLF；但**并非所有文件都如此**（`工具调用说明.md`/`导航.md`/`portal.html`/`.gitignore` 磁盘上就是 LF）。
- **处理**：优先做**纯字符串替换**（`$raw.Replace`），完全不碰行尾；必须按行操作时，先量出该文件实际行尾（`ReadAllBytes` 数 `0A`）再沿用，改完复查。

### 三、状态表与页脚

- `已知坑.md` 状态一览："工具与环境" 7 → **9** 条。
- 页脚文档版本 `260926` → `260927`（备份名不变）。
- 行尾：该文件磁盘为 **LF**（227 行），本次写入后仍为 LF；`git diff` 仅 `+32 / -3` 行，无整文件噪音。

## 260927-04 — 修正 3 处文档错误 + 建立 agent 改动链条（2026-09-27）

**主题**：修正 opencode 报出的 3 处文档错误；建立两个 coding agent 之间的改动交换机制（git trailer + 根目录链条文件）。

### 一、修正 3 处文档错误（均由 opencode 报出，dsh 复核成立）

| # | 位置 | 原 | 改为 |
|---|---|---|---|
| 1 | `AGENTS.md` 五.2 验收标准表 | `engine（42/42）`（与同文件 2.3 / 5.1 的"57 断言"自相矛盾） | `engine（57/57）` |
| 2 | `工具调用说明.md` 基线行与页脚 | `文档版本 260927（2026-09-26）`——版本号升了、**日期没升**（`260927-02` 只替换了版本号那半句） | `（2026-09-27）` |
| 3 | `docs/README.md` 先读路径第 7 条 | "改完跑 `scripts/smoke.ps1`"（旧指引；smoke 会因 AMSI / 全机 python 进程数误报，且现首选 `run_all.py`） | "改完跑 `scripts/run_all.py`（一键校验，见 `AGENTS.md` 第五节）" |

> 第 2 处的成因是 dsh 用"只替换版本号"的窄匹配，未覆盖紧随其后的日期；已记入经验。

### 二、建立 agent 改动交换机制

**(1) git trailer**：每个提交的 message 末尾带**两行**

```
Agent: dsh        (取值：dsh / opencode / 北极星)
Pair: dsh+opencode
```

- 可用 `git log --grep='^Agent:'` 筛出任一方的全部提交；`--grep='^Agent: 北极星'` 可查出北极星在 GitHub 网页上直接提交的条目。
- **历史提交不回填 trailer**（约定自本条目起生效）；历史归属登记见下方链条文件。
- **推之前先 `git pull --rebase origin main`**：远程已有他人提交时用 rebase，**不要** `--force`（强推会抹掉对方工作）。
- 链条表里**头部那条写 `（本条）`**（amend 会改 hash，写进去无法收敛）；**别人提交后把上一行回填成真实 hash**——表里永远只有最后一行是占位符。
**（2）根目录链条文件 `AGCOMMIT_CHAIN.MD`**（新建）：

- 每次提交**追加一行摘要**：`时间 | Agent | commit | 改了什么 | 留给谁`。
- 三条硬规则：**谁推送谁补自己那条** / **只追加，不回改别人的行** / **不贴 diff、不复制 CHANGELOG 内容**（控制体积增速）。
- **定位：按需查，不进"必读清单"**——避免它随提交数增长而抬高每个会话的固定输入成本（北极星 2026-09-27 关注点：opencode 侧缓存/费用）。
- 该文件已登记 `8a3eb4d` 起的历史提交归属（含北极星在 GitHub 网页上的两次 README 提交）。

**（3）`AGENTS.md` 七新增第 8 条**：提交须带双 trailer（`Agent:` + `Pair:`），并在 `AGCOMMIT_CHAIN.MD` 追加一行摘要；推送前先 `git pull --rebase origin main`。

### 三、验收

- `AGENTS.md` 七的第 7、8 条就位；`42/42` 已无残留；行尾 CRLF（300 行）。
- `工具调用说明.md` 基线行与页脚日期均为 `2026-09-27`；行尾 LF。
- `docs/README.md` 第 26 行为 `run_all.py`；行尾 CRLF。
- `AGCOMMIT_CHAIN.MD` 31 行、LF、含表头与历史归属。
- 本次提交为本仓库**第一个带 `Agent: dsh` trailer 的提交**。

## 260927-05 — 项目交接同步现状（2026-09-27）

**主题**：`docs/DSH/项目交接.md` 的多处陈述已被后续改动推翻（"无 git""无自动化测试""役满未实现"），一次性对齐现状。

### 一、`docs/DSH/项目交接.md` 更新

| 位置 | 原 | 改为 |
|---|---|---|
| 二、当前状态 · 自动化测试 | **无**（2026-08-08 移除） | **有**：`run_all.py` 一键校验（yaku 49 用例/129 断言 + engine 17 用例/57 断言）+ 全自动冒烟 |
| 二、当前状态 · 版本控制 | **无 git**；`backup/*.tar.gz` 为版本载体 | **git**：`Pub-Polaris/Tiisu-Mahjong-main`（`main`）+ tar 备份**双轨**；链条见 `AGCOMMIT_CHAIN.MD` |
| 二、当前状态 · 判役 | 42 普通役 + 6 高得点役 | **50 普通役 + 20 高得点役**（计数自 `ike.json`） |
| 五、已完成 | 缺役满/验证台/协同 | 补：役满全量（10 项）、双役满 70000（4 项）、水中月/镜中花重写、特例加计 7000、全食顺/全碰刻/水滴石破/全带赤/十三不靠、引擎级断言、tiisuin改口径、验证台、git 与协同 |
| 六、未实现 | 列了 6 类"未实现" | 仅余 `一色二同高`/`一色四同刻`（**有意不补**）；流局五件事已实现；余下为"场风终局待确认"与"断言覆盖待补" |
| 六、有意不补 · tiisuin | "默认不计分（可开启）" | **触发即结束本局并记统计**（不再"可开启计赋"） |
| 七、下一步 1 | "最小自动化回归（最高）" | **补断言覆盖**（三七之花/南北自通/驷马越岭/美人七对/四明杠） |
| 八、如何继续工作 4 | 跑 `smoke.ps1` | 跑 `python scripts/run_all.py --runs 2`，并补"双 trailer + 链条登记" |
| 页脚 | `260926` | `260927` |

**核实过、原先写错的**：交接文档称 `水滴石破` 未实现——实测 `ike.json` 与 `winchecker.js` 均有该役，测试页有 3 处断言，**已实现**。`tiisuin默认不计分（可开启）` 也已被 `260927-01` 起的改动推翻。

### 二、`docs/README.md` 登记新文件

- 根目录文档清单新增一行：`AGCOMMIT_CHAIN.MD`（改动链条；**按需查，不进必读清单**）。

### 三、过程记录（dsh 的失误与修正）

- 首版替换用 `###ROW` 承载"新行"却当作"查找行"去匹配，**FROM/TO 写反**；
- 同时 `###PART` 用"文件里第一个连续 `- ` 段"定位，**改错位置**（把「一、项目是什么」的正文替换掉了）。
- 结果：`项目交接.md` 被改坏 → `git checkout --` 还原后重做。
- 第二版改用**显式行区间（`###S 起 止`）+ 从后往前替换**，避免行号漂移与匹配歧义；再统一行尾为 LF。
- 教训：批量替换前应先明确"查找什么、替换成什么"，并优先用**能被机器唯一定位**的锚点（行号或唯一字符串），不要用"第一个匹配"这类顺序假设。

### 四、验收

- `项目交接.md`：125 行、LF、旧陈述（`自动化测试 | **无**`、`**无 git**`）零残留；三处表行与新块内容就位。
- `docs/README.md`：含 `AGCOMMIT_CHAIN.MD` 行；行尾 CRLF 保持。
- 未改动任何游戏代码。

## 260927-07 — 役满优先权反例 + 待办区更正（2026-09-27）

**主题**：补役满用例时发现——交接文档与 CHANGELOG 待办区把 4 个**已有用例**的役满列为"待补"；本轮更正，并补 2 条真正缺的「优先权截走」反例。

### 一、先纠正一个误判

- 交接文档「七、下一步」原把 `三七之花 / 南北自通 / 驷马越岭 / 美人七对 / 四明杠` 列为"待补用例"。
  实测**这些覆盖早已存在**：`260926-07` 条目自己就写明「yaku_test 增至 49 用例/129 断言，新增…美人七对（有杠不成立）、驷马越岭（自摸/荣和）、四明杠」。
- 教训：**补测试前应先读 CHANGELOG 与现有测试页**，而不是只信交接文档的"待办"表述。

### 二、新增 2 条反例（真正缺的那一类）

`scripts/yaku_test.html` 新增（129 → **131 断言 / 49 → 50 用例**）：

| 用例 | 验证内容 |
|---|---|
| 三七之花 · 反例 | 缺一个花色的 7 刻时不含三七之花，**改由四暗刻命中** → 锁定"优先权链取第一个"的行为 |
| 美人七对 · 反例 | 三元牌不足 4 张时不含美人七对（既有用例只测了"有杠不成立"） |

### 三、待办区更正

- 原："`三七之花`/`南北自通`/`驷马越岭`/`美人七对`/`四明杠` 等待补用例" → 更正为"**均已有用例**；真正仍缺的是**优先权链影子役满的记录**"。
- 新增一条：**可被更高优先权截走**——`驷马越岭` 需 **3 暗杠 + 1 明杠**；四杠若全为暗杠则先命中 `四暗刻`。

### 四、验收

- `scripts/run_yaku_test.ps1` → **PASS 131/131 断言 · 50 用例**。
- 全程未改游戏代码；临时探针已删除（`scripts/` 只剩 8 个正式文件）。

## 260927-08 — 大七星去除开关 + 改名为 tiisuin（2026-09-27）

**主题**：按北极星口径，把「大七星」从"可选计分役"改为**无条件触发的直接获胜**，并把该特殊牌形统一改名为 **tiisuin**。

### 一、去除 `daxingqi` 开关（无条件触发）

原先该牌形受 `settings.daxingqi` 开关控制（关 = 完全不触发，按普通七对子结算）。现改为**只要做成七种字牌七对子就触发**：

| 文件 | 改动 |
|---|---|
| `src/engine.js` | 结算入口 `if (result.sevenHonors && settings.daxingqi)` → `if (result.sevenHonors)`；`declareTiisuin()` 直接结束整局 + 回门户 + 记统计；删除另一处 gate |
| `src/winchecker.js` | 删除 `winCtx.tiisuin ? 70000 : null` 的计分分支 → 一律 `specialPoints = null`（**不再计分**） |
| `server.py` | `DEFAULT_SETTINGS` 删 `daxingqi` 键 |
| `portal.html` / `debug.html` | 删除「大七星算赋」勾选框及相关读写 |
| `settings.json` | 删除 `daxingqi` 键 |

- **行为**：触发即**结束本局 + 回门户 + 记统计（做出者 +1、其余三家见证 +1）**，**不参与点数**。
- 注意：`declareTiisuin()` 里确实没有点数增减；此前那个 70000 只写在 `winchecker` 里、且引擎在结算前就 `return`，**从未真正生效**。

### 二、改名为 tiisuin

**标识符**（18 处）：`daxingqi` → `tiisuin`（含 `daxingqiCount` → `tiisuinCount`、`declareDaxingqi` → `declareTiisuin`）。

**展示名**（79 处）：中文名 → `tiisuin`，覆盖 `src/`、`portal.html`、`server.py`、`scripts/`、`AGENTS.md` 与现行文档。

**统计键迁移**：`stats.json` 的 `daxingqiCount` → `tiisuinCount`、`byPlayer[].daxingqi` → `byPlayer[].tiisuin`，**计数保留**（迁移时 `tiisuinCount = 1`）。

**有意保留旧名的历史文件**（25 处）：
- `CHANGELOG_ARCHIVE.md`（11 处）
- 规则书原文 `七子麻将指北极星_*.html`（8 处）
- `规则对照_审查_260926.md`（6 处）

> 因此：**本文件（含归档）中 `260927-08` 之前的条目仍写「大七星」**，那是当时的名称；`260927-08` 起统一用 `tiisuin`。

### 三、测试同步

- `scripts/yaku_test.html`：原「大七星 · 开关控制（开=双役满70000；关=不计分）」→ 改为「**tiisuin · 不计分、只标记**」（断言 `sevenHonors === true` 与 `specialPoints === null`）。
- `scripts/engine_test.html`：去掉 `g.settings.daxingqi` 的设置行。

### 四、验收

- 语法探针 8/8 OK。
- `python scripts/run_all.py --runs 1` → **ALL CHECKS PASSED**（yaku **130/130** · 50 用例；engine **57/57** · 17 用例；全自动零 JS 报错）。
- 全仓库 `daxingqi` 残留 0；中文旧名残留 25 处且均为有意保留的历史文件。

### 五、`AGCOMMIT_CHAIN.MD` 新增「近期破坏性变更」段

为让**没有 git 的接手方**也能立刻发现本次改名与开关移除，在链条文件（本仓库约定的改动交换入口）顶部新增一节：

- 一句话说明"没有 git 也能直接打开 `P:\Playground\...` 读文件"；
- 一张 8 行的破坏性变更表（改名 / `settings.daxingqi` 删除 / 统计键迁移 / 不再计分 / CHANGELOG 已拆 / 用例数 / 备份清单已修 / 新 trailer 约定）；
- 明确"旧名只保留在历史文件中"及其范围。
- 另新增一节**「当一方没有 git 时怎么协作」**：没 git 的一方改完必须留话告知（否则改动悬在工作区变成孤儿）；有 git 的一方先 `git status` 看清谁改了什么再提交，禁止 `git add -A` 盲提。

## 260927-06 — CHANGELOG 拆归档 + 待办区重写（2026-09-27）

**主题**：CHANGELOG 是"必读"文件，体积会随每次提交增长，抬高每个会话的固定输入成本。把历史条目移出主文件。

### 一、拆出 `CHANGELOG_ARCHIVE.md`

- 主文件 `CHANGELOG.md` **61732 → 31403 字节（降约 49%）**：只保留最近 7 个条目（`260927-01`…`260927-05`、`260926-08`、`260926-07`）+ 版本索引 + 待办区。
- 归档 `CHANGELOG_ARCHIVE.md`（**31910 字节**）：`260926-06` 及更早共 12 个条目。
- 主文件头加指针："历史条目已移入 `CHANGELOG_ARCHIVE.md`（**按需查，不进必读清单**）"。
- 归档文件头写明维护规则：**主文件条目超过约 15 条时，把最老的整段移入归档末尾；归档只追加、不改写已有条目**。

### 二、待办区重写（原内容已严重过时）

原待办区把一堆**已实现**的功能仍列为缺口（三家和、双和跳庄、四风连打、未听返杠、四明杠、南北自通、三七之花、纯正水中月、美人七对、水滴石破、全带赤…）。重写后：

- **规则缺口**只留三项：役种仅余 `一色二同高`/`一色四同刻`（有意不补）；场风终局待确认；断言覆盖待补（5 个役满）。
- 新增一条**"已实现但实际不可达"**：`字一色`——全字牌必然是刻子，必先命中四暗刻（优先权更高）。
- 新增**编号约定**说明（见下）。
- 顺手修掉上一条提交留下的**重复页脚**。

### 三、编号约定（明确）

> **纯协同类提交不占 CHANGELOG 版本号**，只登记在根目录 `AGCOMMIT_CHAIN.MD`。
> 例：链条里的 `260927-06` / `260927-07`（补规则 8、双 trailer、pull 约定等）本 CHANGELOG 无对应条目。

本条目自身仍占号，因为它改动了仓库文件（新增归档、重写待办）。

### 四、验收

- `CHANGELOG.md` 31403 字节、CRLF、页脚仅 1 处、待办区为新版。
- `CHANGELOG_ARCHIVE.md` 31910 字节、CRLF、含 12 个历史条目。
- `docs/README.md` 已登记归档文件并改写 CHANGELOG 一行说明。

## 260926-08 — 十三不靠 + 统一流局按钮（2026-09-27 凌晨）

**主题**：补上规则书 4.3 / 10.3 的「十三不靠」推牌流局，并把「九种九牌」与它合并成一个流局按钮。

### 一、牌形（北极星 2026-09-27 给定）

`十三不靠：147m 258p 369s 1234567z`

- `1234567z` = 七种字牌（东南西北白发中）。
- 手牌 13 张 → 形态为 **9 张不靠顺 + 4 张字牌**：
  - 万 / 饼 / 索 **各恰好 3 张**，构成 **147 / 258 / 369** 之一（三种进度**互不重复**地分配给三花色，6 种排列均可）；
  - **4 张字牌，两两不同**（字牌不得成对）；
  - 合计 9 + 4 = 13。
- 例：`147m 258p 369s + 1z2z3z4z`；`258m 369p 147s + 5z6z7z1z`（排列亦可）。

### 二、性质（规则书 4.3 / 10.3）

> 十三不靠 / 九种九牌：符合条件可**直接推牌流局**，不受摸牌顺序影响，**继续连庄不加本场数**。

- 它是**推牌流局**，不是和牌役；触发后**庄家连庄、本场不增加、不转移点数**。

### 三、实现

- `src/engine.js`：
  - 新增 `isThirteenUnrelated(hand)`（严格 13 张、字牌恰 4 张各不相同、三花色各 3 张且为 147/258/369 且三进度互异）；
  - 新增 `flowOptions(hand)` → 返回可用推牌条件名数组（`['九种九牌']` / `['十三不靠']`）；
  - `humanFlow(reason)` 改为**统一入口**：按 `flowOptions` 选择条件；不传则取第一个；
  - 新增 `declarePushFlow(reason, playerIdx)`（九种九牌 / 十三不靠共用；`declareNineOrphans` 保留为兼容包装）；
  - 顺带删除死代码 `checkNineOrphansAtInit()`。
- `index.html`：行动区的流局按钮改为**统一一个**，文案按实际条件动态生成 —— `流局(九种九牌)` 或 `流局(十三不靠)`。

### 四、测试

`scripts/engine_test.html` 增 4 个用例 / 15 条断言：

- 十三不靠正例（147/258/369 + 4 不同字牌）、进度可任意排列、字牌成对不成立、字牌不足 4 张不成立、14 张不成立、非 147/258/369 进度不成立、三花色同进度不成立；
- `flowOptions` 条件汇总（十三不靠 / 九种九牌 / 普通手牌）；
- 推牌流局行为（庄家连庄、本场不变、分数不变、进入结束态）；
- **UI 渲染**：十三不靠手牌时行动区确实渲染出「流局(十三不靠)」按钮。

### 验收

`python scripts/run_all.py --runs 1` → **ALL CHECKS PASSED**（YAKUTEST 129/129 · 49 用例；**ENGINETEST 57/57 · 17 用例**；全自动零 JS 报错）。

---

## 260926-07 — 规则书全量对齐 + 引擎级测试（2026-09-26 深夜）

**主题**：以规则书 4.2 / 4.3 / 4.4 / 6.x / 7 / 8.2 / 8.3 / 10.1 为基准，逐条把引擎与判役对齐；补上引擎级自动测试。
**起点备份**：`backup_20260926_224511.tar.gz`。

### 一、牌山模型（规则书 3.3 / 4.2 / 10.1，口径 C）

`setupWallAndCut()` 重写：

- 摸牌顺序 = **活牌山 → 王堆 → 岭上**；平时只摸「活牌山 + 王堆」，**王堆耗尽才荒牌**（活牌山 + 王堆都空）。
- **岭上 4 张平时不参与普通摸牌**，只用于开杠摸取 / 和牌后赐马；摸取顺序改为「从靠近庄家侧开始」。
- `this.wall` = 活牌山 + 王堆（可摸，配牌前 132、配牌后恒 79）；`this.rinshan` = 4 张岭上（独立）。
- 显示口径：`#wallCount` = 可摸总数（配牌后恒 79，不再随骰子变化）；`cutInfo` 增 `skipTiles/maCount/wangCount`，提示行显示跳墩构成。

### 二、判役（6.1 / 6.2 / 6.2.1 / 七）

| 项 | 改动 |
|---|---|
| 龙七对 | 复核：`isSevenPairs` 用 `c/2`，**同种 4 张已算 2 对**，无需改动（此前报告 C1 结论有误，已更正） |
| 全带赤 | 补校验「其余 5 张必须是红牌」：红牌集合 = 红中 z7、索 1/5/7/9、饼 1/3/5/6/7/9（万 1-9 各一张已单独校验） |
| 南北通 | 新增 `pointsBonus: 7000`（倍满 14 赋 + 追加 7000 点），由 `calcFinalPoints` 统一相加 |
| 水滴石破 | **新实现**（`ike.json` 普通役 14 赋 + `menzen`）；触发条件因立直已移除而改用等价条件：**第一巡即听牌 + 海底自摸 / 河底荣和**（`winCtx.waterDrop`，由 `player._firstTurnTenpai` 驱动） |
| 国士无双 | 补两条特例：**13 面听 +7000**（`_isKokushi13Wait`，去掉和牌张后 13 种各 1）、**数牌 1/9 自摸「高寿中举」+7000**；「多个特例不重复」→ 命中第一个即止 |
| 驷马越岭 | 补「大单钓」校验：四杠 + 暗手恰为一对 + 自摸 |
| 美人七对 | 补「三元牌不得开杠」：有任意杠即不成立 |
| 南北自通 | 触发条件由「仅自摸」放宽为 `自摸 或 和牌张为 1/5/7/9`（规则书 6.2 原文） |
| tiisuin | `specialPoints = 70000`（双役满），仅在「tiisuin算赋」开关开启时生效 |
| 全数筋和 | 复核：`ike.json` 中**本来就是 `optional: true`**，无需改动 |

### 三、计分（8.1 / 8.2 / 8.3）

- **特例加计 bug 修复**：规则书特例是 **+7000 点**，原实现把它当「赋」加进 `totalFu` 并在 `specialPoints` 里再 ×700（驷马越岭曾算出 4,935,000 点）。改为 `pointsBonus` 点数加项，由 `calcFinalPoints` 统一相加。
- **`pointsBonus` 双重计**修复：南北通本体与「倍满加计」展示行曾各带 7000（→ 重复 14000），现只挂在役本体。
- **连庄奖励（8.1）**：新增 `honbaBonus()` = 700 × 本场，结算时扁平加到最终点数（不论庄家）。
- **场次初始点数（8.2）**：东风 / 半庄 49000；**全庄 77000**（`setMode` 按模式设定）。
- **出岭（击飞，8.2）**：任一家分数跌破 0 → 该家记 **−7000** 点并立即终局（`checkDeungnyeong`）。
- **段位点（8.3）**：`settleRankPoints()` —— 每 700 点 = 0.1 分（余数 ≥350 进位），次位赏 1位+14 / 2位+7 / 3位0 / 4位−7；终局摘要同时显示段位点。

### 四、流局与连庄（4.2 / 4.3 / 4.4）

`flow()` 重写，新增 `checkSpecialFlow()` / `declareSpecialFlow()` 与三个罚则/特殊方法：

| 规则 | 实现 |
|---|---|
| 听牌流局（4.2/4.3） | 三家听牌 → **本场 +1**（无论庄家是否听牌） |
| 荒牌连庄 | 庄家听牌 → 连庄（本场 +1）；否则过庄（本场归零） |
| 四风连打（4.3） | 四家同一巡打出 4 张相同风牌 → 当场流局并连庄，**不增加本场数**（`checkSpecialFlow`，优先于荣和/副露） |
| 拔厄（4.3） | 四家打出西风 → 最后打西风者向其他家各付 700 点；四家分数一致则本场 +1 |
| 三家和牌（4.2） | 三家同时荣和 → **自动流局**（`declareMultiRon` 前置判断） |
| 双和子跳庄（10.3） | 子家与庄家同时荣和且子家手牌较大 → 庄家放弃和牌，庄家向该子家付 3500 点 |
| 未听返杠（4.4） | 杠最多且流局未听者按 700 点/杠向各家返还；子家额外向庄家付 700 |
| 鸣牌后无役听牌（4.4） | 已鸣牌且所有和牌张均 no_yaku → 子家罚 1400（350×其他子家 + 庄家 700）；庄家罚 2100（三子家各 700） |
| 七日终战（4.3） | 东风 / 半庄战本场数达 7 且流局 → 强制过庄进入 ALL LAST；结束时庄家若为 1 位须向最低点付 2100 点 |

### 五、终局判定（8.2）

`advanceRound()` 由「打满 modeTarget 手」改为「**场风走完 + 1 位 ≥ 初始点数**」：

- 一局制：一手即终。
- 东风战：东场打完且 1 位 ≥ 49000 → 终局，否则**南入延长**。
- 半庄战：东南场打完且 1 位 ≥ 49000 → 终局，否则**西入延长**。
- 全庄战：北场打完且 1 位 ≥ 77000 → 终局，否则再打一圈（本场 +1）延长。
- 安全上限：`handsPlayed >= modeTarget × 6` 强制终局（防无限延长）。

### 六、抢杠（3.4）

新增 `checkRobKan()` / `isKokushiShape()`，在 `doKan()` 开头判定：

- **加杠 / 明杠**：任意家可抢杠荣和；
- **暗杠**：仅「国士无双」型玩家可抢（`isKokushiShape`：全幺九/字且种类 ≥12）。
- 被抢时同张多家可和，走 `declareMultiRon`；三家则自动流局。
- 顺带修复：暗杠 / 加杠生成的牌对象此前 `num` 为字符串（数牌也是），改为 `tileFromId()` 生成正确类型。

### 七、tiisuin（6.2.1）

新增 `declareDaxingqi()`：开启「tiisuin算赋」时命中 → **双役满 70000 点 + 比赛场做出直接获胜**（立即结束整场、写 `state.json inProgress:false`、统计上报）；关闭时按普通七对子正常结算。

### 八、测试（新增）

- **`scripts/engine_test.html`** + **`scripts/run_engine_test.ps1`**：引擎级断言，**13 用例 / 42 断言**（牌山模型、场次初始点数与终局场风、门风轮转、roundLabel、四风连打、三家和流局、双和子跳庄、出岭、tiisuin、拔厄、未听返杠、连庄奖励、赐马口径）。
- **`scripts/run_all.py`** + **`scripts/run_all.cmd`**：一键跑「yaku 断言 + engine 断言 + N 局全自动冒烟」。用 Python 而非 PowerShell 串联，原因是嵌套 / 反复从网络盘加载 .ps1 会触发 Windows **AMSI** 崩溃（`System.AccessViolationException in AmsiScanBuffer`）。
- `scripts/yaku_test.html` 由 36 用例增至 **49 用例 / 129 断言**，新增：龙七对、全带赤（红牌 / 非红）、南北通 +7000、水滴石破、国士两特例、tiisuin开关、美人七对（有杠不成立）、驷马越岭（自摸 / 荣和）、四明杠、连庄奖励、段位点。
- `scripts/smoke.ps1` 的**人工模式渲染断言**此前误把内联 `<script>` 源码里的模板字符串当作已渲染 DOM（虚假通过）；已加 `Get-DomText` 先剥离 script/style 再计数。

### 验收

- `scripts/run_all.py` → **ALL CHECKS PASSED**（YAKUTEST 129/129 · ENGINETEST 42/42 · 全自动 2 局零 JS 报错）。
- 页面核对：`index.html?mode=4` → 14 张可点击手牌、`#wallCount` 随进度递减（配牌后起 79）、岭上 4、跳墩提示「岭上4 + 王堆N」、初始分 49000。

### 未做（有意）

- **立直 / 双立直**：规则书 5.1 有，但按 2026-08-08 决策**保持移除**（仅在报告里注明）；水滴石破因此改用等价触发条件。
- **一色二同高 / 一色四同刻**（6.1，「一种花色 4 个相同顺子」）：**不实现**（由既有下位累进同高/二同高结算）。
- **P02 南北通判定偏松 / P03 水中月定义**：保持现状（有意不补）。
- **9.1 严重违规 / 9.2 诈和与误报点数**：未实现（需新增"报点/报听"交互，未在本轮范围）。
- **4.4「鸣牌后无役听牌」**：已实现罚则；「未听返杠」已实现。

---

## 待办 / 未完成（跟踪中）

- **规则缺口**（详见 `docs/北极星_(人类)/规则缺口清单.md`／`规则与实现_当前版本.md`）：
  - **役种**：仅余 `一色二同高` / `一色四同刻` → **已决策有意不补**（由既有下位累进覆盖）。
  - **场风终局**：已定（2026-09-27）——未达标**只补一手就结束、各延长只 1 次**（见 `260927-11`）；安全上限已收小为 `modeTarget + 16`。
  - **断言覆盖**：`三七之花` / `美人七对` / `驷马越岭`（四杠）/ `四明杠` **均已有用例**（2026-09-27 复核 `yaku_test.html`）；
    真正仍缺的是**优先权链"影子役满"**的记录——同一牌型会被更靠前的役满截走的那些。
- **已知归属**（有意保留现状）：P02 南北通判定偏松；P03 水中月定义与指南不一致。
- **已实现、但实际不可达**：`字一色`——全字牌的 4 组面子必然是刻子 → 必然先命中四暗刻（优先权更高），故按现优先级链不可达。
- **可被更高优先权截走**（同牌型换一种副露就会改判）：`驷马越岭` 需 **3 暗杠 + 1 明杠**；若四杠全为暗杠则先命中 `四暗刻`。
- **已落地、此前列为待办**（2026-09-27 复核）：三家和 / 双和跳庄 / 四风连打 / 未听返杠 / 四明杠 / 南北自通 / 三七之花 / 纯正水中月 / 美人七对 / 水滴石破 / 全带赤 / 十三不靠 / 双役满 70000 均已实现。

> **编号约定**：纯协同类提交（只动链条文件、约定、索引）**不占 CHANGELOG 版本号**，只登记在根目录 `AGCOMMIT_CHAIN.MD`。
> 例：`260927-06` / `260927-07` 仅见于链条，本 CHANGELOG 无对应条目。

---

> 页脚：文档版本 `261002`（2026-10-02） · 对应备份 `backup_20261002_162815.tar.gz`