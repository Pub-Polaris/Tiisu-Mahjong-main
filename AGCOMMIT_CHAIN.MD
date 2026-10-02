# AGCOMMIT_CHAIN · 七子麻将

> **摘要**：两个 coding agent（DeepSeek Harness / opencode）之间的**改动交换链条**——每次提交一条，用于查"这条改动是谁做的、那时怎么验证的、留了什么给谁"。
> **面向**：两个 agent + 北极星。
> **没有 git 也能看**：本文件是普通文本，直接在 `P:\Playground\AGCOMMIT_CHAIN.MD` 打开即可——链条内容不依赖 git 命令。
> **定位**：**按需查，不进"必读清单"**。它不参与每次开工的固定输入，避免会话成本随提交数增长。
> **基线**：代码 `P:\Playground`，仓库 `https://github.com/Pub-Polaris/Tiisu-Mahjong-main`。

## 近期破坏性变更（先读这段）

**如果你没有 git**：本文件与仓库里所有文件一样，直接用编辑器打开 `P:\Playground\...` 即可；下表是"你手上的旧认知可能已失效"的部分。

| 时间 | 变更 | 旧认知会怎么错 |
|---|---|---|
| 2026-09-27 | **`daxingqi` → `tiisuin`** | **仅标识符/方法名改名**：`daxingqi`→`tiisuin`（18 处）、`declareDaxingqi`→`declareTiisuin`。**展示名一律用中文「大七星」**，不要把 `tiisuin` 当玩家可见文案（2026-09-27 由 opencode 校正） |
| 2026-09-27 | **`settings.daxingqi` 键已删除** | 别再写它（`server.py` 默认值、`settings.json`、`portal.html`、`debug.html` 均已移除）；写了是无效键 |
| 2026-09-27 | **统计键迁移** | `stats.json`：`daxingqiCount` → `tiisuinCount`、`byPlayer[].daxingqi` → `.tiisuin`（**计数保留**） |
| 2026-09-27 | **大七星不再计分** | `winchecker` 里 `specialPoints = winCtx.daxingqi ? 70000 : null` 已删除 → 一律 `null`；行为 = 做成七种字牌七对子 → **无条件**结束本局 + 回门户 + 记统计 |
| 2026-09-27 | **CHANGELOG 已拆** | 主 `CHANGELOG.md` 只留最近若干条 + 待办区；`260926-06` 及更早 12 条在 **`CHANGELOG_ARCHIVE.md`**（按需查，别每次读） |
| 2026-09-27 | **用例数已变（再变）** | `yaku_test.html` **51 用例 / 133 断言**；`engine_test.html` **18 用例 / 73 断言**（`260927-11`：终局延长用例改为「只补一手」，并加南入/西入/北增标签断言） |
| 2026-09-27 | **备份清单已修** | `AGENTS.md` 2.1 改为「排除 `backup/`+`logs/` 后**整目录打包**」——旧清单是逐列文件名，漏过 `scripts`、也漏过 `AGENTS.md`/`CLAUDE.md`/`AGCOMMIT_CHAIN.MD` |
| 2026-09-27 | **回门户已实现** | 大七星 / 出岭 / 终局 → **5 秒**后跳回 `portal.html`（`index.html#onMatchOver`，engine 三处调用）；演示模式 `?auto=1` 不跳 |
| 2026-09-27 | **新约定** | 提交带 `Agent: <who>` + `Pair: dsh+opencode` 两行 trailer；推送后在**本文件**追加一行，并把上一行的 `（本条）` 回填成真实 hash（规则 8） |

### 命名口径（2026-09-27 由 `opencode` 校正）

- **标识符 / 键名 / 方法名**：一律用 `tiisuin` —— `tiisuinCount`、`byPlayer[].tiisuin`、`byPlayer[].witness`、`witnessCount`、`declareTiisuin`、`isSevenHonors`。
- **展示名（玩家可见文案）**：一律用中文 **「大七星」** —— **不要**把 `tiisuin` 当玩家可见文字（北极星 2026-09-27 裁决：展示名一律中文，不把 `tiisuin` 当玩家可见文字）。
- **已删除的键**：`settings.daxingqi` / `settings.tiisuin`、`winCtx.daxingqi` / `winCtx.tiisuin` —— 别再写。
- **历史文件不改**：`CHANGELOG_ARCHIVE.md`、规则书原文（`*_CN_260721_*.html`）、本文件已成型的历史行，保持当时写法（那就是当时的事实）。

## 当一方没有 git 时怎么协作

（截至 2026-09-27：**opencode 尚未开通 git**，只能读改磁盘文件；dsh 有 git 并可推送。）

| 情形 | 该怎么做 |
|---|---|
| 没 git 的一方要改文件 | 直接改磁盘即可（文件在 `P:\Playground\...`，两方共用同一份） |
| 改完之后 | **必须留一句话告知对方**（谁改的、动了哪些文件、为什么）。否则改动会**一直悬在工作区**，没人提交、没人知道 |
| 有 git 的一方收到告知 | 先 `git pull --rebase origin main`，再 `git status` 看清**哪些是对方改的**；确认后一起提交，并在本文件追加一行，写明"这批含 X 的改动" |
| **不要**做的事 | 不要 `git add -A` 就提交而不看 `git status`——会把对方的半成品、运行态文件（`stats.json` 等）一起带进去 |
| 危险信号 | 工作区长期挂着"已修改但未提交"的文件，却没人认领 → 先问清是谁改的再动 |

**为什么要有这条**：没有 git 的一方无法自己登记链条，改动会变成"孤儿"。
`stats.json` 就发生过一次——它一直显示为 modified（运行时统计被改），最后按"运行态不入库"处理并列进 `.gitignore`。

## 规则

1. **谁推送，谁补自己那条**。只**追加**，不回头改别人的行（避免变成第二个 `CHANGELOG` 式的冲突热点）。
2. **一行一条摘要**：时间 / Agent / commit / 改了什么 / 留给谁。**不贴 diff、不复制 CHANGELOG 内容**，控制它的增长速度。
3. 同一提交**不允许**两个 agent 署名；若要并行改同一文件，先约定次序（见 `AGENTS.md` 七）。
4. commit message 里带 **git trailer**：`Agent: dsh` 或 `Agent: opencode`。可用 `git log --grep='^Agent:'` 过滤。
5. **本行（当前头部提交）不写 hash**，写 `（本条）`——因为 amend 会改 hash，写进去就无法收敛；要看 hash 用 `git log -1`。
6. **推之前先 `git pull --rebase origin main`**。被拒时用 rebase（**不要** `--force`）——远程已有他人的提交时强推会抹掉对方的工作。
7. **trailer 取值**：`Agent: dsh` / `Agent: opencode` / `Agent: 北极星`（北极星在 GitHub 网页上直接提交时署名）。每个提交另带一行 `Pair: dsh+opencode`，表示本仓库由两方 agent 协同维护。
8. **别人提交后，把上一行的 `（本条）` 回填成真实 hash**（`git log --oneline -1` 查）。这样表里永远只有**最后一行**是占位符，历史行都有确切 hash。
## 链条

| 时间 | Agent | commit | 改了什么 | 留给谁 |
|---|---|---|---|---|
| 2026-09-26 18:33 | `dsh` | `8a3eb4d` | 初始化仓库：新增 `.gitignore`（排除 `backup/` `logs/` `state.json` `settings.json` `*.zip`），首推 78 文件 | — |
| 2026-09-26 18:37 | `北极星` (GitHub 网页) | `5320e4a` | 建仓时自动生成的 `Initial commit`（MIT `LICENSE`） | 由 `dsh` 合入，**未强推覆盖** |
| 2026-09-26 18:38 | `dsh` | `f29bffb` | 合并远端初始提交，保留 LICENSE（79 文件） | — |
| 2026-09-26 19:1x | `北极星` (GitHub 网页) | `4ec1b7e` | `Update README.md`：简略特色改写、去掉部分收尾句 | 由 `dsh` rebase 接续 |
| 2026-09-26 19:1x | `北极星` (GitHub 网页) | `8bc762f` | `Update README.md`：补语气与 `docs/README.md` 用词 | 由 `dsh` rebase 接续 |
| 2026-09-27 02:0x | `dsh` | `34d8b35` | `AGENTS.md`：2.6 git 与远程仓库、红线改双轨、7.7 交付含 push、2.1 备份补 `scripts`；`CHANGELOG` 新增 `260927-01` | — |
| 2026-09-27 03:1x | `dsh` | `a6f1a5f` | `stats.json` 加 `.gitignore` 并 `git rm --cached`；修 CHANGELOG 两条过期陈述；`工具调用说明.md` 补目录名与 git 现状；新增 `260927-02` | — |
| 2026-09-27 03:4x | `dsh` | `39a3680` | `已知坑.md` 新增 6.8 / 6.9（PS 5.1 按 GBK 读文件、行尾 CRLF/LF 不统一）；新增 `260927-03` | — |
| 2026-09-27 03:4x | `dsh` | `cdada80` | `CHANGELOG` 条目顺序修正（`260927-02` 应在 `-03` 之前） | — |

| 2026-09-27 04:1x | `dsh` | `b090de0` | 修 3 处文档错误（`AGENTS.md` 42→57、`工具调用说明.md` 日期、`docs/README.md` 改跑 `run_all.py`）；`AGENTS.md` 七.8 加 Agent trailer 约定；新建 `AGCOMMIT_CHAIN.MD`；新增 `260927-04` | 链条机制自本条起生效 |
| 2026-09-27 04:5x | `dsh` | `233dd87` | `AGCOMMIT_CHAIN.MD` 规则 6/7（推前 rebase、trailer 取值含北极星）；`AGENTS.md` 七.8 改双 trailer（`Agent` + `Pair`）；`CHANGELOG` 260927-04 同步 | 护栏已齐，等 opencode 接 |
| 2026-09-27 05:0x | `dsh` | `84215a0` | 补链条规则 8（别人提交后回填上一行 hash）与「没有 git 也能看」说明；`AGENTS.md` 七.8、`CHANGELOG` 同步 | opencode 可直读磁盘；本轮由 dsh 独做 |
| 2026-09-27 05:2x | `dsh` | `0582944` | `项目交接.md` 同步现状（无git→git双轨、无测试→有、42+6→50+20、役满→已完成、删失实的「水滴石破未实现」）；`docs/README.md` 登记链条文件；`CHANGELOG` 260927-05 | 交接文档已可用于 next agent |
| 2026-09-27 05:5x | `dsh` | `777f69f` | 新增 `CHANGELOG_ARCHIVE.md`（12 个历史条目移入）；主 CHANGELOG 降 49%；待办区重写 + 编号约定；修重复页脚 | 主 CHANGELOG 已瘦身，会话固定成本下降 |
| 2026-09-27 06:1x | `dsh` | `3d9c276` | `yaku_test.html` 补 2 条役满优先权反例（三七之花/美人七对被截走）；`CHANGELOG` 待办区更正 4 个役满"已有用例"的失实描述；补记驷马越岭条件 | 发现：交接文档把已有覆盖误列为待补 |
| 2026-09-27 06:5x | `dsh` | `8a9a909` | tiisuin：大七星去开关改为无条件直接获胜（不计分）；标识符 daxingqi→tiisuin（18）+ 展示名（79）；统计键 tiisuinCount 迁移；历史文件保留旧名 | 名称已切换，后续一律用 tiisuin |
| 2026-09-27 07:1x | `dsh` | `0dd7a5e` | `AGCOMMIT_CHAIN.MD` 顶部新增「近期破坏性变更」段（8 行表 + 无 git 说明），供无 git 的接手方快速发现改名/去开关 | 无 git 也能对齐认知 |
| 2026-09-27 07:3x | `dsh` | `a62397d` | `AGCOMMIT_CHAIN.MD` 新增「当一方没有 git 时怎么协作」节（没 git 的一方改完必须留话；有 git 的一方看 status 后再提交，别 add -A 盲提） | 无 git 期间的协作规则已定 |
| 2026-09-27 08:2x | `opencode` | `f0deea7` | **校正轮，见 `CHANGELOG` `260927-09` + `260927-10` + `260927-11`**（同一批未提交改动，请**一次提交**）：① 展示名回归「大七星」（engine 日志/overlay/记录步、`portal.html` 统计区与 `id`）；② 方法名 `declareDaxingqi`→`declareTiisuin`；③ **实现「回门户等 5 秒」**（新增 `onMatchOver` 钩子，engine 三处调用，演示模式 `?auto=1` 不跳）；④ 补「**见证 +1**」（`server.py` 此前忽略 `witness`，新增 `witnessCount` 与 `byPlayer[].witness`）；⑤ `stats.json` 旧键 `daxingqiCount`/`byPlayer[].daxingqi` **归一化**（`server.py#_normalize_stats` 幂等迁移 + 重写文件）；⑥ **终局延长：未达标只补「一手」（北极星拍板，两次口径，以 `260927-11` 为准）**：`engine.js#advanceRound` 用 `_inExtension` 标记收口 —— 东风→南入、半庄→西入、全庄→北增，**该手以和牌或流局结束即终局、各延长只 1 次**；安全上限由 `modeTarget × 6` 收小为 `modeTarget + 16`；`roundLabel()` 显示「南入/西入/北增N局」；⑦ **断言隔离扩到 `state.json`**：`index.html` 新增 `?nostart=1`（只装配不写运行态）供测试页挂载，两个断言页的网络桩同时拦 `/api/stats` 与 `/api/state`，`run_all.py` 逐字节复核**两个**文件（检查项 `run-state isolation`）；⑧ `smoke.ps1` 单实例检查改为「**占用 7777 的进程 ≤1**」（原全机 python 计数在本机恒 `FAIL 8/9`）→ 实测 **PASS 9/9**；⑨ `AGENTS.md` 2.1 备份改**整目录打包**（排除 `backup/ logs/ .git/ *.zip`）、2.2 只杀占用 7777 的 python；⑩ 修 5 处过期陈述/标题 + 全库计数同步（yaku **51 用例/133 断言**、engine **18 用例/72 断言**）；⑪ `docs/DSH/已知坑.md` 新增 6.10；`规则与实现_当前版本.md` 3.8 口径已定 | **【已提交】**dsh 已 `git status` 逐文件过目后**一次提交**（未用 `git add -A` 盲提）并推送；本格已回填真实 hash（规则 8） |
| 2026-09-27 08:5x | `dsh` | `e8a22dc` | 合并 opencode 本轮未提交改动（上一行）；同时按北极星 2026-09-27 裁决写定命名口径：**展示名一律「大七星」、代码标识符一律 `tiisuin`**（英文本地化时再上对照表）；本文件命名口径与页脚同步至 `260927` | 命名争议已定调，后续不再反复 |
| 2026-10-02 16:3x | `dsh` | `2a7760f` | **任务执行铁律**：`AGENTS.md` 新增第零章（零.1 先完整后测试 / 零.2 分区块串行 / 零.3 开工前先问优先度），置于目录之前并声明最高优先级；目录加第 0 项、1–9 重号为 2–10；基线与页脚版本 `260927`→`261002`；`CHANGELOG` 新增 `261002-01`（占号，见该条第四节说明） | 留给 opencode：这是**行为规则**，你后续开工同样受它约束（尤其零.3 要先问优先度） |
| 2026-10-02 16:3x | `北极星` (磁盘直改，由 `dsh` 代提交) | `5ceaeec` | `README.md` 改一句：把「没有自动化测试兜底」更新为「已有 `scripts/run_all.py` 自动断言兜底，但盖不满所有规则」 | 与上一条同一批提交 |
**历史提交的 trailer 未回填**（约定自 `260927-04` 起生效）；上表即为它们的归属登记。

> 页脚：文档版本 `261002`（2026-10-02） · 对应备份 `backup_20261002_162815.tar.gz`
