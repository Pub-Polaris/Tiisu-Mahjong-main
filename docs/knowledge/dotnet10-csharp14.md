# .NET 10 与 C# 14（2026-10-18 抓取）

**来源**：[What's new in .NET 10 — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview)（页面标注 last updated 2025-11-07）

## 版本定位

- .NET 10 是 **LTS**，支持 **3 年**。
- 本机实测：SDK `10.0.402`（稳定）与 `11.0.100-rc.2`（预览）并存；运行时 `10.0.13`、`11.0.0-rc.2`。
  → 本项目 `global.json` 固定 `10.0.402` + `rollForward: latestFeature`，避免误用 RC。

## C# 14 新特性（与本项目相关的）

| 特性 | 对本项目 |
|---|---|
| `field` 关键字（field-backed 属性） | 可用于 `Tile`/`Meld` 的只读封装，减少样板 |
| `nameof` 支持未绑定泛型（`List<>`） | 少量 |
| `Span<T>`/`ReadOnlySpan<T>` 隐式转换 | 手牌计算走栈上切片时省事 |
| lambda 参数可带 `ref/in/out`（不写类型） | 性能敏感的热路径可用 |
| `extension` 块（静态扩展方法/属性） | 给 `HandShape` 加扩展而不污染类型 |
| `?.` 空条件赋值 | 少量 |

> **注意**：以上列表中**没有** union / discriminated union 类型。见 `csharp-type-model.md`。

## SDK 变化（会影响我们的脚本）

- `dotnet test` 支持 **Microsoft.Testing.Platform (MTP)**。
- 新增 `dotnet tool exec`、`dnx`、`--cli-schema`、原生 TAB 补全。
- 新版解决方案格式 **`.slnx`**（本项目 `dotnet new sln` 已生成 `Tiisu.slnx`）。
  → 旧版 Visual Studio 可能不认 `.slnx`；如需兼容可另存 `.sln`。
