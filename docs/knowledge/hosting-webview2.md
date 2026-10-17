# WebView2 桌面外壳（2026-10-18 抓取）

**来源**：[Introduction to Microsoft Edge WebView2 — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/webview2/)（页面标注 last updated 2026-10-02）

## 是什么

用 **Microsoft Edge（Chromium）作渲染引擎**，把 HTML/CSS/JS 嵌进原生应用。
不是 Electron（不带自己的 Chromium），也不强制某个 UI 框架。

## 对本项目有用的能力

| 能力 | 说明 |
|---|---|
| 开发环境 | **.NET 5 或更新**（我们 `net10.0` 满足）；也支持 Win32 C/C++、.NET Framework 4.6.2+、WinUI 2/3 |
| 支持系统 | Windows 10 SAC 1709+、Windows 11、Windows Server 2016+ |
| 分发方式 | **Evergreen**（跟随系统 Edge 更新）或 **Fixed Version**（打包固定 Chromium） |
| 渐进接入 | 可只把部分界面换成 WebView2，其余保持原生 |
| 原生能力 | 可从页面调用宿主（C#）暴露的对象，宿主可调页面 JS |

## 与本项目路线的关系

- 目标形态：**WebView2 窗口 + C# 核心**（UI 仍是现有 HTML/CSS/JS，不重写）。
- 通讯方式（待细读）：`AddHostObjectToScript` / `WebMessageReceived` / `postMessage`。
- **当前阶段不引入**：先在 `net10.0` 把判役与 engine 做成纯库，WebView2 属 M4 以后。

## 待查（下一轮）

- `Microsoft.Web.WebView2` NuGet 的**当前稳定版本**与 .NET 10 兼容性
- 官方 Getting Started（.NET 版）的完整样例
- 分发：是否需要用户预装 WebView2 Runtime、Fixed Version 的体积
