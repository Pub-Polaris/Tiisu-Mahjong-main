# 知识库（Knowledge Base）

> **目的**：把「查过的外部权威资料」沉淀成可复用的条目，避免每次都重新搜索、也避免记错版本。
> **位置**：`Web/docs/knowledge/`（随仓库版本化）。C# 代码在 `E:\工程文件\TiisuMahjong\NET\`。
> **适用者**：任何接手本项目的 agent（dsh / opencode）与人。

## 怎么用

1. 动手前先**搜这里**（`grep` 关键词），别先上网。
2. 条目里每条事实都带**来源 URL + 抓取日期**；引用时以 `sources.md` 为准。
3. 版本敏感的事实（API、语言特性）**必须写清适用版本**（如「.NET 10 / C# 14」）。

## 怎么加

- 主题页写在 `docs/knowledge/<topic>.md`，一页一个主题。
- 每个新来源登记进 `sources.md`（URL、抓取日期、状态）。
- 只写**能落地到本项目**的结论；不要把文档原文整段抄进来。
- 结论与来源冲突时，以**官方文档**为准，并在条目里注明冲突。

## 现有条目

| 文件 | 内容 |
|---|---|
| `dotnet10-csharp14.md` | .NET 10（LTS）与 C# 14 的可用特性、SDK 变化 |
| `csharp-type-model.md` | C# 的类型建模手段（record / 抽象 record 层级 / 模式匹配）；**union 类型尚未进 C# 14** |
| `testing-xunit-v3.md` | xUnit v3 的能力清单（数据驱动、动态跳过、MTP 等） |
| `hosting-webview2.md` | 桌面外壳方案（WebView2）— 待补 |
| `serialization-json.md` | System.Text.Json（含源生成）— 待补 |
| `domain-mahjong.md` | 本项目领域知识（役种数量、两套机制、踩过的口径） |
| `mahjong-yaku-systems.md` | **国标/日麻/中庸/古典 的役种体系**，以及与七子的差异对照（中庸/古典待补） |

## 维护规则

- 抓取日期用 `YYYY-MM-DD`。
- 来源分三级：**官方**（Microsoft Learn / 语言提案 / 框架官网）> **一手社区**（框架作者博客）> **二手**（教程站）。正文只采信前两级。
- 若某条结论之后被证伪，**不要删除**，加「~~旧结论~~ → 更正」并注明日期与原因（本项目已多次因旧结论返工）。
