# C# 的类型建模：record / 抽象 record / 模式匹配（2026-10-18）

## 结论（对本项目）

**C# 14（.NET 10）没有 union 类型**（.NET 10 官方 "What's new in C# 14" 特性清单里没有）。
所以「面子 = 顺子 | 刻子 | 杠」这类和类型，当前用 **`abstract record` + `sealed` 派生** 表达，
配合 `switch` 表达式做模式匹配。

```csharp
abstract record Meld;
sealed record Sequence(Suit Suit, int Low) : Meld;
sealed record Triplet(Suit Suit, int Num) : Meld;
sealed record Quad(Suit Suit, int Num) : Meld;

string Describe(Meld m) => m switch {
    Sequence s => $"顺子 {s.Suit}{s.Low}",
    Triplet t => $"刻子 {t.Suit}{t.Num}",
    Quad q => $"杠 {q.Suit}{q.Num}",
    _ => throw new ArgumentOutOfRangeException(nameof(m)),
};
```

**已知代价**：C# 不会为 `abstract record` 层级强制穷尽性；加一个派生类型时旧 `switch` 不会编译报错。
缓解：所有匹配集中在少数几处 + 用 `_ => throw` 兜底 + 用测试覆盖每个分支。

## 可用的建模手段（按适用面）

| 手段 | 用法 | 注意 |
|---|---|---|
| `record` / `record struct` | 值语义的牌、面子 | `record struct` 适合高频小对象（`Tile`） |
| `readonly record struct` | 不可变值类型 | 避免装箱 |
| 抽象 `record` 层级 | 和类型（union）替身 | 无编译期穷尽性检查 |
| 模式匹配：`is`、`switch` 表达式、属性模式、**列表模式** | 役种判定 | 列表模式（C# 11）可写 `[Sequence(_, 1), ..]` 之类 |
| `required` + `init` | 构造期校验 | 配合 `record` 减少无效状态 |
| `ImmutableArray<T>` / `FrozenSet<T>` | 手牌集合 | 判定时只读，避免防御性拷贝 |
| 泛型 + `where T : struct` | 牌/面子算法 | 少量 |

## 对本项目的建议

1. **牌**用 `readonly record struct Tile(Suit, int Num)`，天然可哈希、可比较、零分配。
2. **面子**用抽象 record 层级（union 的替身），**不要**用 `object` + 类型码。
3. **手牌**用 `HandShape`（拆好的结构）而不是"14 张牌数组"到处传 —— 拆牌只做一次。
4. **役**用 `IYaku` 接口 + 每役一个 `sealed class`，`Matches(HandView)` 内部用 `switch`/LINQ 表达模式。
5. 需要"多解拆牌"时，用 `IEnumerable<HandShape>` 返回全部解，而不是改全局状态。

## union 类型的当前状态（2026-10-18 核实）

**来源**：[C# 15 Unions — NDepend Blog](https://blog.ndepend.com/csharp-unions/)（2026-05-25，含 2026-04 更新）

| 事实 | 内容 |
|---|---|
| 归属版本 | **C# 15 / .NET 11**，GA 预计 **2026 年 11 月** |
| 预览状态 | 已在 **.NET 11 Preview 2（2026-04）** 落地 |
| 语法 | `public union Pet (Dog, Cat, Bird);` —— 组合已有类型，不需要公共基类/接口 |
| 匹配 | **穷尽性由编译器强制**（无 `default` 分支） |
| 底层 | `record struct` 持有一个 `object? Value`；**值类型会装箱** |
| 依赖 | `UnionAttribute` / `IUnion` 在 `System.Runtime.CompilerServices`，.NET 11 Preview 4 时**尚未进 BCL**，需自己声明 |
| 试用方式 | 仍可 `TargetFramework=net10.0` + `<LangVersion>preview</LangVersion>` |

### 对本项目的结论

- 我们固定 `net10.0`（**C# 14**），**union 不是可用特性** → 面子类型继续用 `abstract record` + `sealed` 派生。
- `union` 的**穷尽性检查**确实是我们最想要的东西（现在只能靠 `_ => throw` 兜底），
  但升级到 C# 15 意味着换 TFM 到 `net11.0`，会牵动整个解决方案 → **留到 M4 之后再评估**。
- 若将来只用它表达"面子"这一处，代价可控；不建议在全项目铺开（值类型装箱）。

