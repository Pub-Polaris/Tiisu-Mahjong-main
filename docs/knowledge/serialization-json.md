# System.Text.Json 与源生成（待补）

**状态**：未抓取。

- 用途：`golden.json` 的读写、将来 API 的请求/响应。
- 关键待查：
  - `JsonSerializerContext` + `[JsonSerializable]` 源生成（AOT 友好、启动快）
  - .NET 10 新增的严格序列化选项（重复属性处理等）
  - 中文用例名在 JSON 里的编码与可读性
- 官方入口：[System.Text.Json 源生成](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)
