# AGCOMMIT_CHAIN · 七子麻将

> **摘要**：两个 coding agent（DeepSeek Harness / opencode）之间的**改动交换链条**——每次提交一条，用于查"这条改动是谁做的、那时怎么验证的、留了什么给谁"。
> **面向**：两个 agent + 北极星。
> **没有 git 也能看**：本文件是普通文本，直接在 `P:\Playground\AGCOMMIT_CHAIN.MD` 打开即可——链条内容不依赖 git 命令。
> **定位**：**按需查，不进"必读清单"**。它不参与每次开工的固定输入，避免会话成本随提交数增长。
> **基线**：代码 `P:\Playground`，仓库 `https://github.com/Pub-Polaris/Tiisu-Mahjong-main`。

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
| 2026-09-27 05:2x | `dsh` | `（本条）` | `项目交接.md` 同步现状（无git→git双轨、无测试→有、42+6→50+20、役满→已完成、删失实的「水滴石破未实现」）；`docs/README.md` 登记链条文件；`CHANGELOG` 260927-05 | 交接文档已可用于 next agent |
**历史提交的 trailer 未回填**（约定自 `260927-04` 起生效）；上表即为它们的归属登记。

> 页脚：文档版本 `260927`（2026-09-27） · 对应备份 `backup_20260927_011140.tar.gz`
