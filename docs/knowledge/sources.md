# 来源清单

> 只登记**实际读过**并据以写条目的来源。状态：`已读` / `不可得（原因）`。

## 一、.NET / 工具链

| 抓取日期 | 来源 | 级别 | 状态 | 用于 |
|---|---|---|---|---|
| 2026-10-18 | [What's new in .NET 10 — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview) | 官方 | 已读 | `dotnet10-csharp14.md` |
| 2026-10-18 | [What's New in xUnit.net v3](https://xunit.net/docs/getting-started/v3/whats-new) | 官方 | 已读 | `testing-xunit-v3.md` |
| 2026-10-18 | [System.Text.Json 源生成](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation) | 官方 | 已读 | `serialization-json.md` |
| 2026-10-18 | [Introduction to WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/) | 官方 | 已读 | `hosting-webview2.md` |
| 2026-10-18 | [C# 15 Unions — NDepend Blog](https://blog.ndepend.com/csharp-unions/) | 一手社区 | 已读 | `csharp-type-model.md` 的 union 状态 |

## 二、麻将规则体系

| 抓取日期 | 来源 | 级别 | 状态 | 用于 |
|---|---|---|---|---|
| 2026-10-18 | [MCR 官方规则 PDF（英文）](http://www.mindmahjong.com/adobe/MCR201408e.pdf) | 官方 | 已读（38 页） | `mahjong-yaku-systems.md` 国标 |
| 2026-10-18 | [MCR 官方规则 PDF（中文）](http://www.mindmahjong.com/adobe/MCR2021.pdf) | 官方 | 已读（112 页，中文文本层） | 国标 **81 番中文名 + 分值** |
| 2026-10-18 | [MahjongRepository/mahjong](https://github.com/MahjongRepository/mahjong)（MIT） | 一手开源 | 已读（43 役 + 24 役满） | 日麻役种全表 |
| 2026-10-18 | [Mahjong Wiki · Zung Jung Scoring](https://mahjong.wikidot.com/rules:zung-jung-scoring) | 社区 Wiki（CC BY-SA） | 已读 | 中庸 44 番种 |
| 2026-10-18 | [Mahjong Wiki · Chinese Classical Scoring](https://mahjong.wikidot.com/rules:chinese-classical-scoring) | 社区 Wiki（CC BY-SA） | 已读 | 古典四张计分表 |
| 2026-10-18 | [Mahjong Wiki 首页](https://mahjong.wikidot.com/) | 社区 Wiki（CC BY-SA） | 已读 | 规则集索引与 pattern 页 |
| 2026-10-18 | [国标 81 番（中文表）](http://www.mindmahjong.com/adobe/MCR2021.pdf) | 官方 | 已读 | `mahjong-basics.md` 术语（3.4 节） |

## 三、不可得（附原因，供后续绕行）

| 源 | 结果 |
|---|---|
| 百度百科（中庸麻雀 / 世界麻将大赛规则） | HTTP 403 安全验证 |
| 萌娘百科「麻将/番种」 | WAF（`action=raw` 也返回未授权） |
| 中文维基 / 日文维基 | 域名被本机**本地反向代理**解析为内网 IP |
| wikiwand 镜像 | 连接超时 |

> **可用通道**（实测）：官方 PDF、GitHub API、jsDelivr CDN、`mahjong.wikidot.com`、少数直连站点。
> **本机网络事实**：跑着本地反向代理，部分域名（如 `raw.githubusercontent.com`）解析到内网 IP，
> `web_fetch` 报 `resolves to a non-public IP address`。这不是故障，改用 `github.com` 网页版或官方站点，别反复重试。
