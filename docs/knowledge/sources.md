# 来源清单

> 只登记实际读过、并据以写条目的来源。状态：`已读` / `待读`。

| 抓取日期 | 来源 | 级别 | 状态 | 用于 |
|---|---|---|---|---|
| 2026-10-18 | [What's new in .NET 10 — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/overview) | 官方 | 已读 | `dotnet10-csharp14.md` |
| 2026-10-18 | [What's New in xUnit.net v3 — xunit.net](https://xunit.net/docs/getting-started/v3/whats-new) | 官方 | 已读 | `testing-xunit-v3.md` |
| — | [WebView2 — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/webview2/) | 官方 | 待读 | `hosting-webview2.md` |
| — | [System.Text.Json 源生成 — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation) | 官方 | 待读 | `serialization-json.md` |
| — | [C# 语言提案仓库（csharplang）](https://github.com/dotnet/csharplang/tree/main/proposals) | 官方 | 待读 | `csharp-type-model.md` 的 union 状态 |

> **本机网络事实**：本机跑着**本地反向代理**，部分域名（如 `raw.githubusercontent.com`）解析到内网 IP，`web_fetch` 会报 `resolves to a non-public IP address`。这不是故障；抓 GitHub 原始文件请改用 `github.com` 网页版或官方站点，且**不要反复重试同一 URL**。

## 麻将规则体系（2026-10-18）

| 抓取日期 | 来源 | 级别 | 状态 | 用于 |
|---|---|---|---|---|
| 2026-10-18 | [MCR 官方规则 PDF（mindmahjong.com）](http://www.mindmahjong.com/adobe/MCR201408e.pdf) | 官方 | **已读**（38 页，文本层可提取） | `mahjong-yaku-systems.md` 国标部分 |
| 2026-10-18 | [MahjongRepository/mahjong（MIT）](https://github.com/MahjongRepository/mahjong) | 一手开源 | **已读**（役列表目录 45 项） | 同上，日麻部分 |
| — | 百度百科「中庸麻雀」 | 百科 | ❌ HTTP 403 | 中庸部分被阻塞 |
| — | 萌娘百科「麻将/番种」 | 百科 | ❌ WAF（`action=raw` 也 403） | — |
| — | 中文维基 / 日文维基 | 百科 | ❌ 域名被本机反代解析为内网 IP | — |
| — | wikiwand 镜像 | 镜像 | ❌ 超时 | — |

> **可用通道**（实测）：官方 PDF、GitHub API、jsDelivr CDN（`cdn.jsdelivr.net`）、少数直连站点。
> **不可用**：百度百科、萌娘百科、维基系、wikiwand。
| 2026-10-18 | 同上（`yaku_list/*.py` 逐文件） | 一手开源 | **已读 43 役 + 20 役满**（4 个文件抓取失败：suuankou_tanki / suukantsu / tenhou / tsuisou） | 日麻役种全表 |
