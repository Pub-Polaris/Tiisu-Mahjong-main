# xUnit v3（2026-10-18 抓取）

**来源**：[What's New in xUnit.net v3](https://xunit.net/docs/getting-started/v3/whats-new)（页面日期 2025-08-14）

## 为什么选 v3

- 每个测试项目是**独立可执行文件**（不再依赖 VSTest 宿主），`dotnet test` 与直接运行都行。
- 内建支持 **Microsoft Testing Platform (MTP)**。
- 报告格式：**CTRF**（`-ctrf`）、**TRX**（`-trx`）；`-list` 可导出机器可读的测试清单。

## 对我们最有用的能力

| 能力 | 用途 |
|---|---|
| **数据驱动**：`[Theory]` 的数据行可为 `object[]` / 元组 / `ITheoryDataRow`，`MemberData` 可 **async** | 把 `golden.json` 直接喂给一个测试方法（200+ 条断言只写 1 个方法） |
| `ITheoryDataRow` 可带 `Skip` / `Explicit` / 超时 / traits / 自定义显示名 | 单条 golden 失败时定位到具体牌型 |
| `TheoryDataRow<>` / `MatrixTheoryData` | 组合边界条件（花色 × 数字 × 和牌张） |
| **动态跳过**：`Assert.Skip` / `SkipUnless` / `SkipWhen`，`[Fact(SkipUnless=…)]` | 标记"当前 JS 与 C# 已知差异"而不让 CI 红 |
| `-filter` 查询过滤语言 | 只跑某个役的用例 |
| `[assembly: CaptureConsole]` / `CaptureTrace` | 打开引擎日志时把输出并入测试报告 |
| `TestContext.Current` | 取当前测试上下文、加附件（把失败牌型写成附件） |
| 超时可用于**非 async** 测试 | 防止某个牌型死循环拖死全跑 |

## 模板

```bash
dotnet new install xunit.v3.templates
dotnet new xunit3          # 或 xunit3-extension
```

> 本项目当前用的是 SDK 内置 `dotnet new xunit`（v2 模板）。若要用 v3 特性
> （`Assert.Skip`、`ITheoryDataRow`、`-filter`、CTRF），需改成 v3 模板或显式引用 `xunit.v3` 包。

## 对本项目的落法

1. 一个 `[Theory]` + `MemberData` 读 `golden.json` → 覆盖全部牌型用例。
2. 用 `ITheoryDataRow.DisplayName` 写中文用例名（与现有 `yaku_test.html` 对齐，便于对照）。
3. 失败时把 `hand/winTile/期望/实际` 写进 `TestContext` 附件，方便贴回给北极星。
