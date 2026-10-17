# WebView2 桌面外壳（待补）

**状态**：未抓取。仅记录已知结论与待查项。

- 定位：把现有 HTML/CSS/JS 界面装进一个原生窗口，逻辑走后端 C#（或页面内桥接）。
- 关键待查（抓取后补）：
  - `Microsoft.Web.WebView2` 当前稳定版本与目标框架要求
  - 与 .NET 10 的兼容性、固定版本策略（Evergreen vs 固定运行时）
  - JS ↔ C# 通讯方式：`AddHostObjectToScript`、`postMessage`、`WebMessageReceived`
  - 打包体积、是否需要安装 WebView2 Runtime
- 官方入口：[WebView2 — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/webview2/)
