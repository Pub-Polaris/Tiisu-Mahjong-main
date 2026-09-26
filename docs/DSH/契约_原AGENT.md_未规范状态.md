# AGENTS.md · 七子麻将项目（面向 Deepseek Harness）

> **摘要**：给自动化编码 agent（Deepseek Harness / DSH）的项目契约：环境、地图、命令、"何谓通过"、以及不可越界的红线。
> **面向**：DSH、其他接手本项目的 coding agent。
> **基线**：代码 `P:\Playground`，文档版本 `260926`（2026-09-26），对应备份 `backup_20260926_044655.tar.gz`。

## 目录

1. [先读什么](#一先读什么顺序很重要)
2. [项目地图](#二项目地图)
3. [环境事实](#三环境事实)
4. [标准命令](#四标准命令)
5. [何谓通过](#五何谓通过验收标准)
6. [红线（不得违反）](#六红线不得违反)
7. [改动契约](#七改动契约改完必须做的事)
8. [常见失败与排查](#八常见失败与排查)
9. [交接检查单](#九交接检查单)

---

## 一、先读什么（顺序很重要）

1. `docs/OpencodeAgent/CHANGELOG.md` —— **唯一事实源**。先知道现在是什么版本、改过什么。
2. `docs/DSH/项目交接.md` —— 当前状态、未完成项、下一步建议。
3. `docs/DSH/已知坑.md` —— 已踩过的坑，避免重复。
4. `docs/北极星/个人指南_北极星.md` —— 代码结构与"改哪"。
5. `docs/北极星/规则缺口清单.md` —— 未实现的规则（若你的任务涉及规则，必读）。
6. 规则书 `docs/北极星/七子麻将指北极星_CN_260721_050000_0.07af.html` —— 规则权威文本（附录一为当前实现对照）。

> 不要跳过第 1 步。本项目早期没有 git 历史，CHANGELOG 补上了这段记忆。

---

## 二、项目地图

```
P:\Playground\
├── run.cmd            启动脚本（探测 Python → 开浏览器 → 起服务器）
├── server.py          HTTP 服务（静态 + /api/* + 日志 + 归档），端口 7777
├── portal.html        门户（模式/设置/统计/文档入口）
├── index.html         游戏主页面（UI + 装配；逻辑在 src/）
├── debug.html         调试台（运行时命令 + 持久化设置）
├── ike.json           规则数据（baseFu / points / yaku / highYaku / bonus）
├── settings.json      设置（server 读写）
├── state.json         会话存档 + game_cmd（server 读写）
├── stats.json         累计统计
├── src/               逻辑（见下）
├── mj_tiles/          牌面 SVG
├── docs/              文档（README / 北极星 / DSH / OpencodeAgent）
├── logs/              output.txt + 会话目录 + 归档
└── backup/            backup_*.tar.gz
```

`src/` 职责：

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

加载顺序（`index.html`）：`handAnalyzer → tiles → uuid → notation → tenpai → aiPlayer → winchecker → engine → 内联`。**新增 JS 必须排在依赖之后。**

---

## 三、环境事实

| 项 | 值 |
|---|---|
| 主机 | Windows；Shell = **PowerShell 5.1**（不支持 `&&`；用 `;` 或 `if ($?)`） |
| 项目路径 | `P:\Playground`（实际为网络路径 `<NAS>\Playground`） |
| 端口 | `7777`（**只能有一个 server 实例**） |
| Edge | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| Python | 优先 `py` / `python`；本机可用 `<PYTHON>` 或 `C:\Program Files\PyManager\python.exe` |
| Node.js | **本机没有**；不要依赖 `node --check`（用第四节的浏览器语法探针替代） |
| 无头浏览器 | 用 `--headless=new`；旧 `--headless` 在本机不稳定 |

---

## 四、标准命令

### 4.1 备份（改动前必做）

```powershell
cd P:\Playground
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
tar -czf "backup\backup_$ts.tar.gz" server.py run.cmd portal.html debug.html index.html ike.json settings.json state.json stats.json src mj_tiles docs
```

### 4.2 启动服务器（先确保只有一个实例）

```powershell
Get-CimInstance Win32_Process -Filter "Name='python.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 2
Start-Process -FilePath "<PYTHON>" -ArgumentList "<NAS>\Playground\server.py" -WindowStyle Hidden
Start-Sleep -Seconds 3
netstat -ano | Select-String ":7777" | Select-String "LISTENING"
```

### 4.3 无头抓取页面（看渲染结果 / 抓 JS 报错）

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ud = "$env:TEMP\op_x"; $cache = "$env:TEMP\op_xc"
New-Item -ItemType Directory -Force -Path $ud, $cache | Out-Null
cmd /c "`"$edge`" --headless=new --disable-gpu --disable-cache --disk-cache-dir=`"$cache`" --enable-logging=stderr --v=0 --user-data-dir=`"$ud`" --dump-dom --virtual-time-budget=30000 `"http://127.0.0.1:7777/index.html?mode=4`" > `"$env:TEMP\x.html`" 2> `"$env:TEMP\x.log`""

# 看 JS 错误
Select-String -Path "$env:TEMP\x.log" -Pattern "Uncaught|ReferenceError|TypeError|SyntaxError"
# 看渲染（例：是否出现可点击手牌）
Select-String -Path "$env:TEMP\x.html" -Pattern 'class="tile clickable"' | Measure-Object
```

`--virtual-time-budget`：普通页面 20000–30000；全自动对局（`?auto=1`）90000–180000。

### 4.4 语法探针（无 Node 时的替代）

在 `P:\Playground` 放一个临时 `probe_syntax.html`：

```html
<!DOCTYPE html><body><pre id="out"></pre><script>
(async function(){
  const files=['src/tiles.js','src/uuid.js','src/notation.js','src/tenpai.js',
               'src/aiPlayer.js','src/winchecker.js','src/engine.js','src/handAnalyzer.js'];
  const out=document.getElementById('out');
  for (const f of files){
    try{ const t=await (await fetch(f+'?ts='+Date.now())).text(); new Function(t); out.textContent+=f+' OK\n'; }
    catch(e){ out.textContent+=f+' ERROR: '+e.message+'\n'; }
  }
})();
</script></body>
```

用 4.3 的方法抓 `http://127.0.0.1:7777/probe_syntax.html`，读 `<pre id="out">`。**用完删除该探针文件，不要留在仓库。**

### 4.5 端到端验证（无头，多跑几次防抖）

对 `index.html?auto=1&mode=4` 连跑 5–8 次，断言：无 `Uncaught/ReferenceError/TypeError/SyntaxError`，且页面里 `id="roundDisplay"` 有值。历史上曾出现"偶发脚本加载失败"，故必须多跑几次。

---

## 五、何谓通过（验收标准）

一个改动"通过"，必须同时满足：

| # | 标准 | 如何验 |
|---|---|---|
| 1 | 无 JS 报错 | 4.3 抓 `--enable-logging=stderr`，无 `Uncaught/ReferenceError/TypeError/SyntaxError` |
| 2 | 人工模式能发牌 | `index.html?mode=4` 页面出现 14 个 `class="tile clickable"` |
| 3 | 全自动不卡局 | `index.html?auto=1&mode=4` 能跑到和牌或流局（`#msg` 出现结果/`round` 推进） |
| 4 | 语法探针全 OK | 4.4 全部 `OK` |
| 5 | 多跑不翻车 | 4.5 连跑 ≥5 次全绿 |
| 6 | 文档同步 | `CHANGELOG.md` 追加一条；相关文档页脚版本更新 |

**不允许**只凭"代码看起来对"就宣布通过。

---

## 六、红线（不得违反）

1. **不得擅自改游戏语义**。役种判定、点数、流局/连庄、赐马规则等属产品决策；有歧义时**先问**，不要自己拍板。
2. **不得引入 Node/构建链/框架**。项目是"浏览器直跑 + Python 静态服务"，保持零构建。
3. **不得改 `index.html` 的脚本加载顺序**（除非同步更新本文档与个人指南）。
4. **不得移除 `docs/`、`backup/`**；不得把 `settings.json` / `state.json` / `stats.json` 的语义搞混（设置 / 存档 / 统计三者独立）。
5. **不得同时运行两个 server**（会导致脚本偶发加载失败）。
6. **不得在仓库留下临时探针**（`probe_*.html` 用完即删）。
7. **不得提交/写入任何密钥**；本项目无需密钥。
8. 改动前必须备份（4.1）。

---

## 七、改动契约（改完必须做的事）

1. `docs/OpencodeAgent/CHANGELOG.md` 追加一条（版本/日期/改了什么/为什么）。
2. 受影响文档更新内容与**页脚版本+备份名**。
3. 若改了 `docs/` 文件路径，同步更新：
   - `portal.html` 的文档链接区
   - `docs/README.md`
   - `docs/北极星/导航.md`
   - 其他文档中对该文件的引用
4. 若改了设置键：同步 `server.py` 的 `DEFAULT_SETTINGS` + `portal.html` + `debug.html`。
5. 若改了役种：`ike.json`（数据）与 `winchecker.js` 的 `conditionFn`（判定）**必须配套**。

---

## 八、常见失败与排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `WinChecker is not defined` / `TiisuMahjong is not defined` | 脚本未加载完 / 两个 server 争 7777 / 网络抖动 | 只留一个 python 进程；确认 4.3 抓到的是完整页面；初始化已用 `window.load` + 依赖就绪等待 |
| 牌山张数不随骰子变 | 旧模型残留 | 当前为跳墩模型：活牌山 = `136 − 2S`（见个人指南第五节、CHANGELOG 260822） |
| 和牌后 `#msg` 空白 | `showMsg` 用 `innerHTML`（支持 HTML 表格），检查传参是否为字符串 | 见 `engine.js` 的 `buildWinOverlay` |
| 多家荣和重复记账 | 统计口径 | 「局数」只在 `advanceRound()` 记一次；「和牌/tiisuin」按胜者记 |
| 吃牌按钮消失 | 曾因整体重建容器导致 | 现由 `renderActionArea()` 生成，勿再 `outerHTML` 整体替换 |
| 调试台命令不生效 | 游戏页未开 / `game_cmd` 未清除 | 游戏页每秒轮询 `/api/state`，执行后回写 `game_cmd:null` |

更全的坑见 `docs/DSH/已知坑.md`。

---

## 九、交接检查单

接手时：

- [ ] 读完"先读什么"的 6 项
- [ ] 确认只有一个 python 进程、7777 在监听
- [ ] 跑 4.5 端到端验证，确认当前基线健康
- [ ] 做一次 4.1 备份

交付时：

- [ ] 4.5 全绿通过
- [ ] CHANGELOG 已追加
- [ ] 相关文档与页脚已更新
- [ ] 无临时文件残留（`probe_*.html` 等）
- [ ] 已在回复中说明：改了什么、如何验证、遗留风险

---

> 页脚：文档版本 `260926`（2026-09-26） · 对应备份 `backup_20260926_044655.tar.gz`
