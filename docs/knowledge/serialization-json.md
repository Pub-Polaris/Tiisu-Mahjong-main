# System.Text.Json 与源生成（2026-10-18 抓取）

**来源**：[How to use source generation in System.Text.Json — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)（页面标注 last updated 2025-11-15）

## 三种用法

```csharp
[JsonSourceGenerationOptions(WriteIndented = true)]
[JsonSerializable(typeof(WeatherForecast))]
internal partial class SourceGenerationContext : JsonSerializerContext { }
```

1. 传 `JsonTypeInfo<T>`：`JsonSerializer.Serialize(obj, Ctx.Default.WeatherForecast)`
2. 传 `JsonSerializerContext`：`JsonSerializer.Serialize(obj, typeof(T), Ctx.Default)`
3. 传 `JsonSerializerOptions { TypeInfoResolver = Ctx.Default }`

## 两种生成模式

| 模式 | 适用 |
|---|---|
| **Metadata-based** | 序列化 + 反序列化（默认两者都开） |
| **Serialization（fast path）** | 只序列化，性能更高；**不支持异步序列化** |

## 对我们（golden 语料 + 将来 API）的意义

- `golden.json` 有 10000 条、6.9 MB：**用源生成 + `JsonSerializerContext`** 反序列化最快，也避免反射在 Native AOT 下崩。
- 若将来做 Native AOT 单文件 exe：设 `<JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>`，让「用到反射」在运行时立刻抛错而不是偶发失败。
- 枚举默认序列化成数字；要字符串名用 `[JsonStringEnumConverter<T>]` 或全局 `UseStringEnumConverter = true`。
- .NET 9 起可用 `[JsonStringEnumMemberName]` 自定义枚举成员名。

## 待办

- 用 `JsonSerializerContext` 写第一版 fixture 读取器（阶段 D 实现时落地）。
