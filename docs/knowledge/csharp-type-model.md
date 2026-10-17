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

## 待补

- 官方 union 提案的**当前阶段**（LDM 是否已采纳、目标语言版本）—— `sources.md` 里标了待读。
  在确认之前，**不要**在设计里假设 union 可用。
