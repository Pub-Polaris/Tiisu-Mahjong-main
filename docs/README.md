# 七子麻将 · 文档总索引

> **摘要**：本项目全部文档的入口与"先读哪份"路径。
> **面向**：通用（北极星 / opencode / DSH / 美术）。
> **基线**：代码 `P:\Playground`，文档版本 `260926`（2026-09-26），对应备份 `backup_20260927_053053.tar.gz`。

## 目录

1. [先读路径（按身份）](#一先读路径按身份)
2. [文档分区](#二文档分区)
3. [全部文档清单](#三全部文档清单)
4. [我该改哪份](#四我该改哪份)
5. [文档约定](#五文档约定)

---

## 一、先读路径（按身份）

**如果你是 opencode / 其他 coding agent（要动代码）**
1. `AGENTS.md`（**仓库根目录，主契约**）
2. `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md`（唯一事实源）
3. `docs/DSH/项目交接.md`（当前状态、不变量、未完成）
4. `docs/DSH/已知坑.md`（已踩过的坑）
5. `docs/北极星_(人类)/个人指南_北极星.md`（代码结构与"改哪"）
6. 涉及规则时：`docs/北极星_(人类)/规则缺口清单.md` + 规则书附录
7. 改完跑 `scripts/run_all.py`（一键校验，见 `AGENTS.md` 第五节）

**如果你是 Deepseek Harness（DSH）**
1. `AGENTS.md`（**主契约**）
2. `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md`
3. `docs/DSH/项目交接.md` / `docs/DSH/已知坑.md`

**如果你是北极星本人**
1. `docs/北极星_(人类)/代码地图.md`（零基础总览）
2. `docs/北极星_(人类)/给北极星的信.md`
3. `docs/北极星_(人类)/规则缺口清单.md`
4. `docs/北极星_(人类)/七子麻将指北极星_*.html`（规则书）

**如果你是在搞美术的北极星**
1. `docs/北极星_(人类)/design_design_guide.md`

---

## 二、文档分区

| 分区 | 面向 | 内容 |
|---|---|---|
| 仓库根目录 | 所有 agent | `AGENTS.md`（主契约）、`CLAUDE.md`（兼容入口）、`scripts/`（一键校验与探针） |
| `docs/北极星_(人类)/` | 项目与作者本人 | 规则书、代码地图、个人指南、规则缺口、规则对照、口径账本、设计、模板、自检、信、导航 |
| `docs/DSH/` | Deepseek Harness | 项目交接、已知坑、历史归档 |
| `docs/OpencodeAgent_老Agent想说的话/` | opencode agent | 工具调用说明、CHANGELOG |
| `docs/README.md` | 通用 | 本文件（总索引） |

---

## 三、全部文档清单

### 仓库根目录

| 文档 | 一句话 |
|---|---|
| `AGENTS.md` | **主契约**：概览、运行/校验命令、仓库结构、风格约定、测试与验收、安全红线、变更约定 |
| `AGCOMMIT_CHAIN.MD` | 两个 coding agent（dsh / opencode）的**改动链条**：每次提交一行摘要 + trailer 约定。**按需查，不进必读清单** |
| `CLAUDE.md` | 兼容入口（内容为一行 `AGENTS.md`），供读取 `CLAUDE.md` 的工具使用 |
| `scripts/run_all.py` / `run_all.cmd` | **一键校验**：yaku 断言 + engine 断言 + N 局全自动冒烟（推荐用 `.py`，避免 AMSI 崩溃） |
| `scripts/yaku_test.html` / `run_yaku_test.ps1` | 役种 / 赋 / 点数断言（56 用例 · 150 断言） |
| `scripts/engine_test.html` / `run_engine_test.ps1` | 引擎规则断言（18 用例 · 73 断言） |
| `scripts/smoke.ps1` | 项目健康冒烟（启动、渲染、N 局全自动） |
| `scripts/syntax_probe.html` | 语法探针（`new Function` 判定 `src/*.js` 可解析） |

### docs/北极星_(人类)/

| 文档 | 一句话 |
|---|---|
| `七子麻将指北极星_CN_260721_050000_0.07af.html` | **规则权威文本**（含目录锚点与重写后的实现对照附录） |
| `代码地图.md` | 零基础总览：文件干嘛、一张牌怎么走 |
| `个人指南_北极星.md` | 代码结构与"想改什么改哪" |
| `规则缺口清单.md` | 未实现的规则（含"有意不补"） |
| `规则与实现_当前版本.md` | **口径账本**：经北极星拍板的规则口径 ↔ 代码行为对照（顶部有权威状态横幅） |
| `规则对照_审查_260926.md` | **规则书 ↔ 代码逐条对照**：一致/偏差/未实现/待裁定 清单 |
| `design_design_guide.md` | 美术换肤对接（CSS/类/id 清单） |
| `design_ui_plan.md` | 2026-08-09 UI 调整计划与落地结果 |
| `文档模板.md` | 本项目统一文档格式 |
| `文档自检_260926.md` | 本次文档自检结论与遗留问题 |
| `给北极星的信.md` | 一封写给作者的信（我是谁/理解/建议） |
| `导航.md` | 北极星区速查入口 |

### docs/DSH/

| 文档 | 一句话 |
|---|---|
| `项目交接.md` | 当前状态、不变量、未完成、下一步 |
| `已知坑.md` | 已踩过的坑（现象→原因→处理） |
| `契约_原AGENT.md_未规范状态.md` | **历史归档**：本项目早期（2026-09 上旬）的 DSH 契约原稿，因未按仓库结构描述被作者改名存档。**内容不再维护**，现行契约以根目录 `AGENTS.md` 为准。 |

### docs/OpencodeAgent_老Agent想说的话/

| 文档 | 一句话 |
|---|---|
| `CHANGELOG.md` | 最近若干条 + 待办区（唯一事实源的主体） |
| `CHANGELOG_ARCHIVE.md` | 历史条目归档（`260926-06` 及更早）；**按需查** |
| `工具调用说明.md` | 启动、API、内部调用、验证 |

---

## 四、我该改哪份

| 你改了… | 必须同步更新 |
|---|---|
| 任何代码 | `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md`（追加一条） |
| 役种 / 点数 | `ike.json` + `src/winchecker.js` + 规则书附录 + CHANGELOG |
| 设置键 | `server.py`（`DEFAULT_SETTINGS`）+ `portal.html` + `debug.html` + `工具调用说明.md` |
| 文档路径 / 文件名 | `portal.html` 文档链接 + 本 README + `导航.md` + 引用它的文档 |
| 界面结构 / 类名 / id | `design_design_guide.md` + CHANGELOG |
| 启动装配 / 依赖加载 | `AGENTS.md`（阅读顺序、验收）+ `已知坑.md` + CHANGELOG |
| 冒烟检查项 | `scripts/smoke.ps1` + `AGENTS.md` 第五节 |
| 任何文档 | 该文档**页脚版本/日期/备份名** |

---

## 五、文档约定

- 格式：见 `docs/北极星_(人类)/文档模板.md`（标题 / 摘要 / 面向 / 基线 / 目录 / 状态表 / 编号章节 / 页脚）。
- 状态用词：**已实现 / 部分 / 未实现 / 已修复 / 有意不补**（不使用 emoji）。
- 版本号：`YYMMDD`；页脚须写对应 `backup_*.tar.gz` 名。
- 语言：中文；代码标识符/路径保留原文；路径统一 `P:\Playground`。
- 变更记录：以 `docs/OpencodeAgent_老Agent想说的话/CHANGELOG.md` 为准，其它文档不得各写一份历史。

---

> 页脚：文档版本 `260926`（2026-09-26） · 对应备份 `backup_20260927_053053.tar.gz`
