# AGENTS.md · 七子麻将（Tiisu Mahjong）

## Summary (English)

Four-player Mahjong variant with its own yaku set and "Fu-based" scoring. Pure front-end (HTML/CSS/JS) plus a single Python static server (port 7777) for logs, settings, save state and stats. **No build step, no Node.js, no database, no network dependency.** Follow the rules below before changing anything; the single source of truth for history is `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md`. Run `scripts\smoke.ps1` before declaring any change done.

---

> **摘要**：本项目是自创规则的四人麻将实现。本文件是给自动化编码 agent 的项目契约：环境、地图、命令、验收标准与红线。
> **面向**：所有在本仓库工作的 agent（opencode、Deepseek Harness / DSH）。
> **基线**：代码 `P:\Playground`，文档版本 `260926`（2026-09-26），对应备份 `backup_20260927_053053.tar.gz`。

## 目录

1. [项目概览](#一项目概览)
2. [运行与构建命令](#二运行与构建命令)
3. [仓库结构](#三仓库结构)
4. [代码风格与文档约定](#四代码风格与文档约定)
5. [测试与验收](#五测试与验收)
6. [安全与红线](#六安全与红线)
7. [变更与提交约定](#七变更与提交约定)
8. [Agent 阅读顺序](#八agent-阅读顺序)
9. [参考文献](#九参考文献)

---

## 一、项目概览

- **是什么**：四人麻将，自创役种体系与"赋本位"点数表，含赐马、跳墩、门风等非标准机制。
- **技术栈**：静态 HTML/CSS/JS（浏览器直跑）+ `server.py`（Python 标准库 `http.server`，端口 7777）。
- **关键约束**：**零构建链**。不要引入 Node.js、打包器、框架或依赖安装步骤。
- **入口**：`run.cmd`（探测 Python → 打开门户 → 启动服务器）。

---

## 二、运行与构建命令

Shell 为 **PowerShell 5.1**（不支持 `&&`，用 `;` 或 `cmd1; if ($?) { cmd2 }`）。本机**没有 Node.js**。

### 2.1 备份（改动前必做）

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
tar -czf "P:\Playground\backup\backup_$ts.tar.gz" --exclude=backup --exclude=logs --exclude=.git --exclude="*.zip" -C "P:\Playground" .
```

- 用「排除 `backup/` `logs/` `.git/` `*.zip` 后**整目录打包**」，而不是逐个列文件名——**新增文件不会被漏掉**（历史教训：曾因清单过时而漏备 `AGENTS.md` / `CLAUDE.md` / `AGCOMMIT_CHAIN.MD`）。
- 排除 `.git/` 是为了不让备份体积翻倍（git 对象已压缩、且可从远端重建）。
- 把新备份名写进本次改动的文档页脚，并追加一条 `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md`。

### 2.2 启动服务器（先确保只有一个实例）

```powershell
# ⚠ 只结束【占用 7777】的那个 python。
#    不要 `Get-Process python | Stop-Process` —— 本机可能还有别的项目在跑 python
#    （例如 unsloth_studio），全杀会误伤。
$pids = @(Get-NetTCPConnection -LocalPort 7777 -State Listen -ErrorAction SilentlyContinue).OwningProcess
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Start-Process -FilePath "<PYTHON>" -ArgumentList "<NAS>\Playground\server.py" -WindowStyle Hidden
Start-Sleep -Seconds 3
netstat -ano | Select-String ":7777" | Select-String "LISTENING"
# 自检：只有 1 个 python 在监听 7777
@(Get-NetTCPConnection -LocalPort 7777 -State Listen -ErrorAction SilentlyContinue).Count
```

或直接双击 `run.cmd`。根路径 `/` 会 302 到 `/portal.html`。

### 2.3 一键校验（改完必跑）

```powershell
cmd /c P:\Playground\scripts\run_all.cmd
```

或直接用 Python 版（推荐，避免 Windows AMSI 在 PowerShell 读网络盘脚本时崩溃）：

```powershell
python P:\Playground\scripts\run_all.py --runs 2
```

它依次跑三件事并打印汇总（`ALL CHECKS PASSED` / `SOME CHECKS FAILED`，退出码 0/1）：

| 步骤 | 页面/脚本 | 内容 |
|---|---|---|
| 1 | `scripts/yaku_test.html` | 役种 / 赋 / 点数断言（51 用例 · 133 断言） |
| 2 | `scripts/engine_test.html` | 引擎规则断言（18 用例 · 73 断言：牌山 / 场次 / 流局 / 十三不靠 / 多和 / 出岭 / 拔厄 / 赐马 / 统一流局按钮渲染 / 终局「只补一手」延长） |
| 3 | `index.html?auto=1&mode=4` | N 局全自动，断言无 JS 报错且回合已渲染 |

单项运行：`scripts/run_yaku_test.ps1`、`scripts/run_engine_test.ps1`、`scripts/smoke.ps1 -Runs N`。

### 2.4 无头抓取页面（手工排查用）

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ud = "$env:TEMP\op_x"; $cache = "$env:TEMP\op_xc"
New-Item -ItemType Directory -Force -Path $ud, $cache | Out-Null
cmd /c "`"$edge`" --headless=new --disable-gpu --disable-cache --disk-cache-dir=`"$cache`" --enable-logging=stderr --v=0 --user-data-dir=`"$ud`" --dump-dom --virtual-time-budget=30000 `"http://127.0.0.1:7777/index.html?mode=4`" > `"$env:TEMP\x.html`" 2> `"$env:TEMP\x.log`""

Select-String -Path "$env:TEMP\x.log" -Pattern "Uncaught|ReferenceError|TypeError|SyntaxError"
Select-String -Path "$env:TEMP\x.html" -Pattern 'class="tile clickable"' | Measure-Object
```

`--virtual-time-budget`：普通页面 20000–30000；全自动对局（`?auto=1`）90000–180000。
### 2.5 页面与参数

| 页面 | 用途 |
|---|---|
| `portal.html` | 门户：模式选择、设置、统计、文档入口 |
| `index.html` | 游戏主页面；参数 `?mode=N`、`&test=1`、`?auto=1&mode=N`、`?scoretest=1`、**`?nostart=1`**（只装配+渲染，不开局、不读写 `state.json`、不起命令轮询 —— 供测试页挂载用） |
| `debug.html` | 调试台：运行时命令 + 持久化设置 |


### 2.6 git 与远程仓库

本仓库**已上 GitHub**（2026-09-26 起），版本载体为 **git 提交 + `backup/*.tar.gz` 双轨**：

| 项 | 值 |
|---|---|
| 远程仓库 | `https://github.com/Pub-Polaris/Tiisu-Mahjong-main`（公开，MIT） |
| 默认分支 | `main` |
| 本地仓库 | `P:\Playground\.git`（实际落在 `<NAS>\Playground\.git`） |
| 提交身份 | 仓库级 `Pub-Polaris` / `Pub-Polaris@users.noreply.github.com` |
| 提交历史 | `8a3eb4d` 初始化；`f29bffb` 合并远端 `Initial commit`（保留 LICENSE） |

**`.gitignore` 排除项**（不入库）：`backup/`、`logs/`、`state.json`、`settings.json`、`*.zip`。入库体积约 0.54 MB。

> 本机前置：仓库在网络路径上，git 会报 `dubious ownership`，需先执行
> `git config --global --add safe.directory "%(prefix)///<NAS>/Vol3/Playground"`。
> 推送走 HTTPS（凭据已存于凭据管理器）；**SSH 22 端口在本网络被拒，不要用 SSH**。

**每次改动后**：

```powershell
cd P:\Playground
git add -A
git commit -m "简述改了什么"
git push origin main
```

---

## 三、仓库结构

```
P:\Playground\
├── AGENTS.md          本文件（根目录，agent 契约）
├── CLAUDE.md          指向 AGENTS.md 的兼容入口
├── run.cmd            启动脚本（探测 Python → 开浏览器 → 起服务器）
├── server.py          HTTP 服务（静态 + /api/* + 日志 + 归档），端口 7777
├── portal.html        门户（模式/设置/统计/文档入口）
├── index.html         游戏主页面（UI + 装配；逻辑在 src/）
├── debug.html         调试台（运行时命令 + 持久化设置）
├── ike.json           规则数据（baseFu / points / yaku / highYaku / bonus）
├── settings.json      设置（server 读写）
├── state.json         会话存档 + game_cmd（server 读写）
├── stats.json         累计统计（server 读写）
├── scripts/           一键校验与探针
│   ├── run_all.py      一键跑全部（yaku + engine + 全自动冒烟）· 推荐
│   ├── run_all.cmd     同上（批处理包装）
│   ├── yaku_test.html      役种/赋/点数断言页
│   ├── run_yaku_test.ps1   跑 yaku_test.html
│   ├── engine_test.html    引擎规则断言页
│   ├── run_engine_test.ps1 跑 engine_test.html
│   ├── smoke.ps1           项目健康冒烟（启动/渲染/N 局全自动）
│   └── syntax_probe.html   语法探针（逐一 new Function 判定）
├── src/               逻辑（见下）
├── mj_tiles/          牌面 SVG
├── docs/              文档（README + 北极星/ + DSH/ + OpencodeAgent/）
├── logs/              output.txt + 会话目录 + 归档 tar.gz
└── backup/            backup_*.tar.gz
```

`src/` 职责与关键入口：

| 文件 | 职责 | 关键入口 |
|---|---|---|
| `tiles.js` | 牌工具（造/洗/排/解析/显示） | `createDeck` `parseTileString` `tileSvg` |
| `winchecker.js` | 判役引擎 | `WinChecker.checkWin(...)` `conditionFn(id)` |
| `engine.js` | 对局状态机 | `TiisuPlayer` `TiisuMahjong.*` |
| `aiPlayer.js` | AI 出牌 | `getAIDiscardIndex(hand, game)` |
| `tenpai.js` | 听牌判定 | `listTenpai(...)` |
| `notation.js` | 牌记号 | `handToStr` `meldsToStr` |
| `uuid.js` | 玩家身份 | `getPlayerUUID` `generateAIUUID` |
| `handAnalyzer.js` | 手牌提示（纯展示） | `analyzeHand` |

`index.html` 脚本加载顺序固定：`handAnalyzer → tiles → uuid → notation → tenpai → aiPlayer → winchecker → engine → 内联`。**新增 JS 必须排在依赖之后。**

### 状态文件（三者独立，勿混用）

| 文件 | 写入方 | 内容 |
|---|---|---|
| `settings.json` | `portal.html` / `debug.html` | `thinkSeconds` / `optionalYaku` / `showMa` / `showDebug` / `showWallViewer` / `recordTiles`（`daxingqi` 已于 2026-09-27 删除） |
| `state.json` | `engine.js` | 会话存档（`playerUUID`/`modeTarget`/`handsPlayed`/`handNumber`/`scores`/`dealerIndex`/`honba`/`roundWindIdx`/`dealerCount`/`inProgress`）+ `game_cmd` |
| `stats.json` | `engine.js` | `tiisuinCount` / `wins` / `rounds` / `byPlayer` |

---

## 四、代码风格与文档约定

- **零构建**：ESM/CJS 之外的语法保持浏览器可直跑；不引入编译或打包。
- **纯函数层不碰 DOM**：`tiles.js` / `notation.js` / `tenpai.js` / `uuid.js` 不得访问 `document`；UI 只在 `index.html` / `portal.html` / `debug.html`。
- **引擎依赖注入**：`engine.js` 不自行 `fetch`/`new WinChecker`，由 `index.html` 装配后传入。
- **注释用白话导读**：文件顶部写"这个文件干什么、关键流程"，关键函数上方一行白话解释；不逐行注释，不复述代码。
- **术语统一**：赋（不是番）、点、岭上(马)、赐马、跳墩、王堆、门风、场风、役牌、门清、副露、食降、可选役。
- **牌记号**：`123m456p789s1122z`（`m`万 `p`饼 `s`索 `z`字；字牌 1z东 2z南 3z西 4z北 5z白 6z发 7z中）。
- **路径统一**：`P:\Playground\...`。
- **文档格式**：遵循 `docs/北极星_(人类)/文档模板.md`（标题+摘要+面向+基线+目录+状态表+编号章节+页脚）。
- **状态用词**：已实现 / 部分 / 未实现 / 已修复 / 有意不补（不使用 emoji）。
- **文件格式**：末尾恰好一个换行；不使用 BOM。
- **文风**：陈述完整契约与上下文，不写推理过程，不使用隐喻，用直接具体术语。

---

## 五、测试与验收

### 5.1 一键校验（首选）

```powershell
python P:\Playground\scripts\run_all.py --runs 2      # 或 cmd /c P:\Playground\scripts\run_all.cmd
```

| 步骤 | 断言内容 |
|---|---|
| yaku | `scripts/yaku_test.html`：51 用例 / 133 断言（役种、赋、点数、赐马、全带赤、南北通 +7000、水滴石破、国士两特例、大七星、美人七对、驷马越岭、四明杠、连庄奖励、段位点、测试隔离） |
| engine | `scripts/engine_test.html`：18 用例 / 73 断言（牌山模型 C、场次初始点数与终局场风、门风轮转、四风连打、三家和流局、十三不靠、双和子跳庄、出岭、大七星直接获胜+回门户钩子+统计不落盘、拔厄、未听返杠、连庄奖励、赐马口径、统一流局按钮渲染、终局「只补一手」延长） |
| smoke | `index.html?auto=1&mode=4` 连跑 N 局：无 JS 报错 + 回合已渲染 |

单项：`scripts/run_yaku_test.ps1 -Quiet` / `scripts/run_engine_test.ps1 -Quiet` / `scripts/smoke.ps1 -Runs N`。

### 5.2 何谓通过（验收标准）

一个改动"通过"必须同时满足：

| # | 标准 | 依据 |
|---|---|---|
| 1 | 断言页全绿 | `run_all.py` 的 yaku（129/129）+ engine（57/57） |
| 2 | 无 JS 报错 | 无 `Uncaught/ReferenceError/TypeError/SyntaxError` |
| 3 | 人工模式能发牌 | 14 个可点击手牌 + `#wallCount` 有值 |
| 4 | 全自动不卡局 | 能到和牌或流局（`--runs N` 全部干净） |
| 5 | 多跑不翻车 | 全自动连跑 ≥5 次全绿 |
| 6 | 文档同步 | CHANGELOG 已追加；相关文档页脚版本已更新 |

**不允许**只凭"代码看起来对"宣布通过。本机无 Node.js，不要用 `node --check`。

### 5.3 无头排查注意事项

- **先剥离 `<script>` 再数 DOM**：`--dump-dom` 会输出内联脚本源码，里面的模板字符串（如 `class="tile clickable"`）会被误当成已渲染 DOM（虚假通过）。`smoke.ps1` 的 `Get-DomText` 已处理。
- **`setTimeout` 在虚拟时钟下不可靠**：`--virtual-time-budget` 会把定时器瞬间推进；页面内初始化请用 `window.load` + 依赖检查，不要靠 `setTimeout` 轮询。
- **不要嵌套 PowerShell 跑断言**：从网络盘反复加载 `.ps1` 可能触发 Windows AMSI 崩溃（`AccessViolationException in AmsiScanBuffer`）。一键校验用 `run_all.py`（Python）。
- **`class` 声明不挂 window**：跨 iframe 拿不到 `w.TiisuPlayer` / `w.TiisuMahjong`（词法全局）。测试里用 `Object.getPrototypeOf(instance)` 反查原型。

### 5.4 游戏内验证

| 目的 | 方式 |
|---|---|
| 判役 / 点数 | `debug.html` 手牌调试，输入 14 张串观察结果 |
| 计分自测 | `index.html?scoretest=1` |
| 每步牌型 | 勾「记录牌型」→ 打完一局 → 看 `logs/` |
| 直接调 API | F12：`__game.checker.checkWin(...)`、`__game.calcPoints(fu)`、`__game.resolveMa(...)` |

---

## 六、安全与红线

1. **不得擅自改游戏语义**。役种判定、点数、流局/连庄、赐马规则等属产品决策；有歧义时先问，不要自己拍板。
2. **不得引入 Node.js / 构建链 / 框架**。保持"浏览器直跑 + Python 静态服务"。
3. **不得改 `index.html` 的脚本加载顺序**（除非同步更新本文件与 `docs/北极星_(人类)/个人指南_北极星.md`）。
4. **不得移除 `docs/` 与 `backup/`**；不得混淆 `settings.json` / `state.json` / `stats.json` 的语义。
5. **不得同时运行两个 server**（会导致脚本偶发加载失败）。
6. **不得在仓库留下临时探针**（`probe_*.html` 等用完即删）。
7. **不得写入任何密钥或凭据**。本项目无需密钥。
8. **改动前必须备份**（见 2.1）。

---

## 七、变更与提交约定

1. **`docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md` 是唯一事实源**。任何改动先追加一条（版本/日期/改了什么/为什么），再动手。
2. 受影响文档同步更新内容与**页脚版本+备份名**。
3. 若改 `docs/` 路径：同步更新 `portal.html` 文档区、`docs/README.md`、`docs/北极星_(人类)/导航.md`、以及引用该文件的文档。
4. 若改设置键：同步 `server.py` 的 `DEFAULT_SETTINGS` + `portal.html` + `debug.html`。
5. 若改役种：`ike.json`（数据）与 `src/winchecker.js` 的 `conditionFn`（判定）**必须配套**。
6. **不得对仓库重新 `git init` 或强推覆盖历史**。远程为 `Pub-Polaris/Tiisu-Mahjong-main`（`main` 分支），其 `Initial commit`（MIT LICENSE）必须保留；与远端不一致时用 fetch + merge 解决。版本载体为 **git 提交 + `backup/*.tar.gz` 双轨**，两者都不得移除。
7. **提交与交付**：一次改动的"交付"= 跑完 `run_all.py` 全绿 → 追加 CHANGELOG → 同步受影响文档与页脚 → 落一份 `backup_*.tar.gz` → **`git commit` 并 `git push origin main`**。只提交不推送（或只备份不提交）都算未交付。

8. **每个提交带双 trailer + 链条登记**：commit message 末尾加两行 —— `Agent: <who>`（`dsh` / `opencode` / `北极星`）与 `Pair: dsh+opencode`；`git log --grep='^Agent:'` 可筛选任一方。同时在根目录 `AGCOMMIT_CHAIN.MD` **追加一行摘要**（时间 / Agent / commit / 改了什么 / 留给谁）；该文件**只追加、不回改别人的行**，且**不进"必读清单"**（按需查，避免会话成本随提交数增长）。**推之前先 `git pull --rebase origin main`**：远程已有他人提交时用 rebase，**不要** `--force`。 别人提交后，把链条里上一行的 `（本条）` 回填成真实 hash（规则 8）。


---

## 八、Agent 阅读顺序

1. `AGENTS.md`（本文件）
2. `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md`（唯一事实源）
3. `docs/DSH/项目交接.md`（当前状态、不变量、未完成）
4. `docs/DSH/已知坑.md`（已踩过的坑）
5. `docs/北极星_(人类)/个人指南_北极星.md`（代码结构与"改哪"）
6. `docs/北极星_(人类)/规则缺口清单.md`（涉及规则时必读）
7. 规则书 `docs/北极星_(人类)/七子麻将指北极星_CN_260721_050000_0.07af.html`（附录一为当前实现对照）

---

## 九、参考文献

- AGENTS.md 规范：https://agents.md
- DeepSeek Harness 仓库：https://github.com/deepseek-ai/deepseek-harness
- DeepSeek Harness 文档：https://deepseek-harness.github.io/deepseek-harness/

> 页脚：文档版本 `260927`（2026-09-27） · 对应备份 `backup_20260927_053053.tar.gz`
