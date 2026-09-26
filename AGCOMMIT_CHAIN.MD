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
| 2026-09-27 | **`daxingqi` → `tiisuin`** | 标识符（18 处）、展示名（79 处）、方法 `declareDaxingqi` → `declareTiisuin` 全部改名 |
| 2026-09-27 | **`settings.daxingqi` 键已删除** | 别再写它（`server.py` 默认值、`settings.json`、`portal.html`、`debug.html` 均已移除）；写了是无效键 |
| 2026-09-27 | **统计键迁移** | `stats.json`：`daxingqiCount` → `tiisuinCount`、`byPlayer[].daxingqi` → `.tiisuin`（**计数保留**） |
| 2026-09-27 | **大七星不再计分** | `winchecker` 里 `specialPoints = winCtx.daxingqi ? 70000 : null` 已删除 → 一律 `null`；行为 = 做成七种字牌七对子 → **无条件**结束本局 + 回门户 + 记统计 |
| 2026-09-27 | **CHANGELOG 已拆** | 主 `CHANGELOG.md` 只留最近若干条 + 待办区；`260926-06` 及更早 12 条在 **`CHANGELOG_ARCHIVE.md`**（按需查，别每次读） |
| 2026-09-27 | **用例数已变** | `yaku_test.html` **50 用例 / 130 断言**；`engine_test.html` 17 用例 / 57 断言 |
| 2026-09-27 | **备份清单已修** | `AGENTS.md` 2.1 的 tar 清单原先漏了 `scripts`，现补上——别按旧清单打包 |
| 2026-09-27 | **新约定** | 提交带 `Agent: <who>` + `Pair: dsh+opencode` 两行 trailer；推送后在**本文件**追加一行，并把上一行的 `（本条）` 回填成真实 hash（规则 8） |

### 有意保留旧名的位置

历史事实不改：`CHANGELOG_ARCHIVE.md`、规则书原文（`*_CN_260721_*.html`）、`规则对照_审查_260926.md` 里仍写旧名「大七星」。
**因此 `260927-08` 之前的条目都写旧名，之后才用 `tiisuin`。**

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
| 2026-09-27 07:1x | `dsh` | `（本条）` | `AGCOMMIT_CHAIN.MD` 顶部新增「近期破坏性变更」段（8 行表 + 无 git 说明），供无 git 的接手方快速发现改名/去开关 | 无 git 也能对齐认知 |
**历史提交的 trailer 未回填**（约定自 `260927-04` 起生效）；上表即为它们的归属登记。

> 页脚：文档版本 `260927`（2026-09-27） · 对应备份 `backup_20260927_011140.tar.gz`
