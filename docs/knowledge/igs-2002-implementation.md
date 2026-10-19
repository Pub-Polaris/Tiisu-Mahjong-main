# 参考：明星三缺一 2002（IGS）实现分析

> **来源**：对 `G:\IGJMJ02`（IGS《明星三缺一 2002》）的只读逆向分析，2026-10-20（含当日两轮补正）。
> **完整产物**（未入库，体积大）：`E:\工程文件\TiisuMahjong\analysis\igs\`
> —— `evidence/`（帧还原 PNG/GIF、hexdump、反汇编、FPU 普查）、`scripts/`（30 个可复现脚本）。
> **只做技术分析，不重分发游戏素材。**

> 目标目录：`G:\IGJMJ02`（只读分析，未修改任何文件）
> 产物目录：`E:\工程文件\TiisuMahjong\analysis\igs\`
> 日期：2026-10-20
>
> ⚠️ 说明：分析期间该目录里的 `IGSMJ_P.SAV`（10,376 B）在 2026-10-20 00:27 被写过一次 —— 那是**当时正在运行的 `igsmj2.exe`（PID 8736，00:13 启动）自己写的存档/配置**，不是本分析所为。本次分析对 `G:\` 全程只读，所有写入都在 `E:\工程文件\TiisuMahjong\analysis\igs\`。

---

## 0. 一句话结论

**这不是 3D 游戏。** 整个游戏是 **DirectDraw 8bit 调色板 2D 精灵引擎**：所有看起来像 3D 的东西（片头旋转 logo、人物介绍里旋转的白牌、牌桌上的立体牌、水池/书房背景）都是**离线用 3D 软件渲染好的位图/帧序列**，运行时只做「按坐标 Blit + 调色板 + 颜色键」。

| 问题 | 结论 | 证据强度 |
|---|---|---|
| `ace.dll` 是不是主代码？ | **不是。** 它是 **ACE（ADAPTIVE Communication Environment）网络库**，被 `igsmj2.exe` 用于联机大厅（MMGS）。游戏代码全在 `igsmj2.exe`（638 KB）里 | 强（5556 个导出全是 `ACE_*`；内部字符串含 `D:\tcchou\works\ACE_wrappers\ace\*.cpp` 源路径；无任何图形导入） |
| 片头旋转的 logo 是实时 3D 吗？ | **不是。** `demo\sw_logo.rom` 是**完整的 FLI 动画文件**（`0xAF11`），**272 帧 800×600 8bpp**；`demo\igslogo.rom` 是 **FLC**（`0xAF12`）**55 帧**。逐帧还原成功，见 `evidence/png/` 与 `evidence/sw_logo_intro.gif` | 极强（文件头=标准 FLIC 头，帧链逐帧走到文件末尾分毫不差，Blt 帧已解码成 PNG） |
| 人物介绍旋转的麻将牌是实时 3D 吗？ | **不是。** `play\mj.rom` 里是 **4 组 × 17 帧的预渲染旋转序列**（每帧是独立位图，宽度 68→48→67 循环），外加 42 张牌面在 **9 个离散尺寸**上的预渲染小图 | 极强（533 张图全部 LZSS 解出，图集清单可精确对上 533） |
| 牌是整张烘焙 vs 体块+贴图？ | **整张烘焙。** 每张牌是**一张已经是 3/4 透视的位图**（牌面花纹 + 蓝侧面 + 高光都烘进像素了）；桌面视角变化靠**预先渲染的两套镜像朝向**（69×47，各 42 张），牌越远靠**9 级离散尺寸**的牌面图，不是运行时缩放/投影 | 强（图集分组、朝向镜像、LOD 梯形全部可见，见 `evidence/png/mj_*.png`） |
| 牌桌背景是 3D 吗？ | **不是。** 14 张 `map\mapNN.bmp` 各 800×600×16bpp（RGB555，未压缩 960,000 字节）= 14 张**离线渲染的整屏背景图** | 强（BMP 头 + 已还原成 PNG） |

---

## 1. 结论速查：技术栈

```
igsmj2.exe (2002-02-01, PE32 GUI, 638 KB)
 ├─ DDRAW.dll  → DirectDrawCreate              ← 唯一的"图形 API"（2D Blitter）
 ├─ DSOUND.dll → DirectSoundCreate (ord#1)     ← 音效
 ├─ WINMM.dll  → mciSendCommandA               ← 背景音乐
 ├─ GDI32.dll  → SetDIBitsToDevice, GetPixel, TextOutA, PatBlt ...  ← 文字/取色/位图
 ├─ WSOCK32/WS2_32 → 联机
 ├─ ace.dll    → 130 个 ACE_* 符号（网络框架，见结论 1）
 └─ MSVCRT/MSVCP60
```
**没有** `d3d8.dll` / `d3dx` / `glide` / `opengl32`。`sin/cos/sqrt` 也没有从 CRT 导入，但这**不能**当作「没做三角函数」的证据（可内联成 `FSIN/FSQRT` 或自建表）—— 实测见 §3.5：全 exe 只有 274 条 x87、一张 360 项角度表 + 一个画圆例程，没有 3D 数学量级。

---

## 2. 方法与可复现性

所有脚本在 `scripts/`，产物在 `evidence/`：

| 脚本 | 作用 |
|---|---|
| `scripts/pe_report.py` | PE 头/节区/导入/导出/字符串导出（`evidence/pe_report.txt`、`strings_*.txt`） |
| `scripts/rom_scan.py` | 全盘扫 `.rom` 的 magic（`evidence/rom_magic_scan.txt`） |
| `scripts/pcdata_walk.py` | PCDATA01 容器 chunk 遍历（`evidence/pcdata_chunks.txt`） |
| `scripts/exe_xrefs.py` / `exe_lzss.py` / `exe_pk0.py` / `exe_dispatcher.py` | **反汇编还原 LZSS 与 7 个图片加载器**（capstone） |
| `scripts/igs_lzss.py` | 我逆出来的 IGS LZSS 解码器（逐字节照抄 0x412D30 的逻辑） |
| `scripts/flc_validate.py` / `flc_chain.py` / `flc_decode.py` / `flc_export.py` | FLI/FLC 结构验证与帧还原 |
| `scripts/pcdata_export.py` / `mj_detail.py` / `mj_groups.py` / `mj_families.py` | PCDATA01 图集解码、分组、拼图导出 |
| `scripts/final_checks.py` / `export_evidence.py` | 数学导入检查、map BMP 解码、GIF/拼图导出 |
| `scripts/fpu_check.py` / `fpu_check2.py` | **FPU 初始化调用者追踪 + 全 exe x87 指令普查 + 三角函数点定位**（`evidence/fpu_check*.txt`） |

复现：`python scripts\<脚本>.py`（需要 `pefile pillow capstone`）。

---

## 3. 结论 1：`ace.dll` 的定位 —— **它是 ACE 网络库，不是游戏代码**

### 3.1 PE 基本盘

```
ace.dll  1,187,897 bytes   PE32, 5 sections, Subsystem=GUI
TimeDateStamp = 0x3C2301B8 = 2001-12-21 09:32:40
.text  VA 0x1000  VSize 0xB1784   RawSize 0xB2000   (代码 ~726 KB)
.rdata VA 0xB3000 VSize 0x5AB22
.data  VA 0x10E000
.rsrc  VA 0x115000 (只有 0x300 字节，几乎是空的 —— 没有游戏资源)
.reloc VA 0x116000
```
`numSections=5`、`.rsrc` 只有 768 字节 —— 一个游戏 DLL 不会这样；这是**纯代码库**的特征。

### 3.2 导入表：**一个图形 API 都没有**

| DLL | 导入数量 | 内容 |
|---|---|---|
| `KERNEL32.dll` | 98 | 线程/锁/文件/内存/管道（`CreateNamedPipeA`、`CreateIoCompletionPort`、`TlsAlloc`…） |
| `WS2_32.dll` | 44 | socket/select/WSA*（**网络**） |
| `MSWSOCK.dll` | 2 | `TransmitFile`、`AcceptEx`（IOCP 高性能网络） |
| `ADVAPI32.dll` | 31 | 注册表 + **服务控制**（`CreateServiceA`、`StartServiceA`、`ControlService`） |
| `USER32.dll` | 6 | 仅 `MsgWaitForMultipleObjectsEx`/`PeekMessageA`/`PostQuitMessage`（消息循环） |
| `MSVCP60.dll` / `MSVCRT.dll` | 29 / 130 | C++ 与 C 运行库（`malloc/fread/qsort/_beginthreadex`） |
| **GDI32 / DDRAW / D3D / GLIDE / OPENGL** | **0** | **完全没有** |

对照 `igsmj2.exe`：`DDRAW.dll → DirectDrawCreate`、`DSOUND.dll → ord#1`、`GDI32.dll` 11 个函数。**图形全在主 exe 里**。

### 3.3 导出表：5556 个符号，5535 个是 `ACE_*`

```
DLL name: ace.dll   #exports = 5556
ord 1  ??0?$ACE_Guard@V?$ACE_Select_Reactor_Token_T@VACE_Noop_Token@@@@@@QAE@...
ord 2  ??0ACE_ARGV@@QAE@ABV0@@Z
ord 20 ??0ACE_Activation_Queue@@QAE@PAV?$ACE_Message_Queue@...
...
```
全是 C++ 修饰名（MSVC），主体是 `ACE_Reactor`、`ACE_SOCK_Stream`、`ACE_INET_Addr`、`ACE_Message_Block`、`ACE_Thread_Mutex`、`ACE_Task_Base`、`ACE_Asynch_*`。这正是 [ACE](https://www.dre.vanderbilt.edu/~schmidt/ACE.html)（Douglas Schmidt 的跨平台网络框架）的类名谱系。

### 3.4 决定性证据：内部字符串里有 **ACE 源码树路径**

`evidence/strings_ace.txt`（UTF-8 无 BOM，偏移即文件偏移）：

```
0010EF6C  D:\tcchou\works\ACE_wrappers\ace\Activation_Queue.cpp
0010F098  D:\tcchou\works\ACE_wrappers\ace\Addr.cpp
0010F0F0  D:\tcchou\works\ACE_wrappers\ace\ARGV.cpp
0010F1E0  D:\tcchou\works\ACE_wrappers\ace\Asynch_IO.cpp
0010F214  D:\tcchou\works\ACE_wrappers\ace\ATM_Addr.cpp
0010F2C8  D:\tcchou\works\ACE_wrappers\ace\Basic_Stats.cpp
...
```
`ACE_wrappers` 是 ACE 的官方目录名，`tcchou` 是 IGS 那位编译者的 Windows 用户名。**这 DLL 就是 ACE 5.x 用 MSVC 编出来的私有构建**。

### 3.5 有没有 3D 数学痕迹？（**含 2026-10-20 补正**）

> 补正说明：本节初版写的是「没导入 sin/cos/sqrt/pow → 引擎没有三角函数 → 不可能跑 3D」。**这个推理过强**：编译器可以把 `sqrt` 内联成 `FSQRT`，三角函数也可以自己建表或用内联汇编，**都不会在导入表里留下痕迹**。以下是重做的实测（`scripts/fpu_check.py`、`fpu_check2.py`，结果在 `evidence/fpu_check.txt`、`evidence/fpu_check2.txt`）。

**(a) `ace.dll`**：无 `sin/cos/matrix/quaternion/texture` 相关字符串，无任何图形导入 → 与渲染无关。

**(b) `igsmj2.exe` 的浮点总量**：整个 `.text`（约 540 KB 代码）里 x87 指令**总共只有 274 条**：

```
fld 61   fmul 57   fild 47   fstp 39   fnstsw 16   fcomp 13   fst 8
fsub 8   fadd 6    fdiv 4    fcom 3    fiadd 2     fdivr 2    fxch 2
fchs 1   fsqrt 1   fsin 2    fcos 2
fptan/fpatan/f2xm1/fyl2x/fprem/fscale = 0
```

**(c) 这 5 条 `fsin/fcos/fsqrt` 全部集中在 2 处，且都是 2D 用途**：

1. **启动时建 360 项 sin/cos 表**（0x40B5ED，见 `evidence/fpu_check2.txt`）：
   ```asm
   ; for (esi = 0; esi < 0x168 (=360); esi++)
   fild  [esp+8]              ; i
   fmul  qword [0x485668]     ; × 0.0174532922222 = π/180  ← 角度→弧度
   fld   st(0)
   fsin                       ; sin(θ)
   fmul  qword [0x485660]     ; × 65535.0             ← 16.16 定点
   call  0x47DDB0             ; _ftol
   mov   [esi*4 + 0x6379E0], eax        ; sinTable[360]
   fcos                       ; cos(θ)
   fmul  qword [0x485660]
   call  0x47DDB0             ; _ftol
   mov   [esi*4 + 0x637440], eax        ; cosTable[360]
   ```
   常量已读出：`0x485660 = 65535.0`、`0x485668 = 0.0174532922222 (=π/180)`、`0x485680 = 0.0021816615 (=2π/2880)`。
   → **一张 360 项、16.16 定点的角度表**，典型 1990s 2D 做法。

2. **2D 定点旋转 / 圆周计算**：
   - `0x40D081`：`fild(dx²+dy²) → fsqrt → _ftol`，随后用 `2π/2880` 步进 `fcos/fsin` 求圆周点 → **圆/椭圆光栅化**（圆形高亮、圆环一类）。
   - `0x410422` / `0x410DB3`：`cos = cosTable[angle]; sin = sinTable[angle];` 取图片结构里的 `w=[eax+2]`、`h=[eax+4]`，再 `imul … sar 16` → **把一个矩形四角按角度旋转（16.16 定点）**。这就是 `~(DisplayRotary)` 的实现：**平面内任意角度旋转一张精灵**（2D，不是 3D）。

**结论**：引擎确实有三角函数，但只有「**一张 360 项角度表 + 2D 旋转 + 画圆**」这一点点；**没有矩阵/四元数/相机/透视投影所需的数学量级**。对比：真 3D 管线光「每顶点变换 + 光照」就是每顶点几十条 FP 指令、成千上万条 FP 代码，而这里全 exe 只有 274 条 x87。

**(d) 因此判断「不是 3D」靠的是正面证据，不是导入表**：

| 证据类型 | 具体 |
|---|---|
| 图形 API | 只有 `DDRAW!DirectDrawCreate`（2D Blitter）；无 D3D/Glide/OpenGL |
| 素材本体 | 片头=FLI 帧序列（272/55 帧）；旋转牌=17 张预渲染帧；牌=整张烘焙位图 ×2 朝向 ×9 LOD；桌面=16bpp 整屏图（全部已解码，见 §4/§5/§6） |
| 数据 | 资源包里没有顶点/索引/纹理坐标/材质；只有调色板 + 压缩位图 + 帧表 |
| 代码量 | FP 指令 274 条、触发函数 2 处（角度表 + 画圆） |

### 3.5b `_controlfp` / `_adjust_fdiv` 是什么（FPU 初始化的意义）

这三/四个符号**不是游戏代码，是 MSVC 6.0 静态 CRT 的启动样板**：

```
0x47DFB6  push 0x30000        ; _MCW_PC   = 精度控制字段
0x47DFBB  push 0x10000        ; _PC_53    = 53-bit 尾数
0x47DFC0  call 0x47DFD2       ; → jmp [_controlfp]
```
即 `_controlfp(_PC_53, _MCW_PC)` —— CRT 的 `_setdefaultprecision`，由 `_cinit` / `mainCRTStartup`（0x47DE40：`__set_app_type` → … → `_initterm` → main）调用一次。作用：把 x87 控制字的精度字段设成 **53-bit**（并默认屏蔽所有 FP 异常），使 C 的 `double` 运算、`_ftol`、后续 `_fpreset`/`_controlfp` 行为符合 MSVC 预期。`_adjust_fdiv` 是 MSVC 5/6 针对 Pentium FDIV 精度问题的除法补偿初始化（随 float 支持 obj 链进来；实测**没有任何 `call/jmp [IAT]` 引用点**，纯链接产物）。`_ftol` 通过 0x47DDB0 的 thunk 暴露，游戏代码在 `(int)(sin*65535)` 这类地方显式调用。

**意义评估**：这类符号在**任何** MSVC 6 程序里都有（哪怕全程序零浮点算法、只要静态链接 CRT 就会带），**对「是否用 3D」没有任何判别力**。所以初版拿「没有数学导入」当证据是错的；正确表述是「有 274 条 x87、只有角度表和画圆」。

### 3.6 结论

| 项 | 判定 |
|---|---|
| `ace.dll` 是主代码吗 | **否** |
| 它是什么 | IGS 私有编译的 **ACE 5.x 网络中间件**（Reactor/ACE_SOCK/Asynch_IO/IOCP） |
| 谁用它 | `igsmj2.exe`（130 个 `ACE_*` 导入）→ 联机大厅。exe 里有 `MMGSClient`、`SESSION.KICK`、`LOBBY.CHAT`、`GAME.CHAT` 等字符串 |
| `server.exe` | 20 KB 纯 TCP 转发服务器（只有 WSOCK32 + printf），字符串是 `Send Command To Clients Error!`、`Create New Group, GroupID : %d` —— 朋友局用的**中继服**，与渲染无关 |
| 游戏本体在哪里 | `igsmj2.exe`（自带引擎 + 7 种图片加载器 + FLI 播放器，见 §3、§4） |

---

## 4. 结论 2：片头「旋转的 logo」= **FLI/FLC 预渲染动画**，不是实时 3D

### 4.1 三个「像视频」的 .rom 其实是标准 Autodesk FLIC 文件

`demo\sw_logo.rom` / `demo\igslogo.rom` / `menu\effect.rom` **没有** `PCDATA01` 之类的 IGS 包头，**文件第 0 字节起就是 FLI/FLC 头**（只有 .rom 后缀）。

```
demo\sw_logo.rom  (15,858,881 B)
00000000  C1 FC F1 00 11 AF 0F 01 20 03 58 02 08 00 00 00
          └─size────┘ └magic┘ └帧数┘ └宽=800┘ └高=600┘ └8bpp┘
```
按 FLIC 规范解析：

| 偏移 | 字段 | sw_logo | igslogo | menu\effect |
|---|---|---|---|---|
| 0x00 | u32 size | 15,858,881 = **文件大小** | 7,903,268 = **文件大小** | 1,469,832 = **文件大小** |
| 0x04 | u16 magic | **0xAF11 = FLI** | **0xAF12 = FLC** | **0xAF12 = FLC** |
| 0x06 | u16 frames | **271** | **54** | **40** |
| 0x08 | u16 width | 800 | 800 | 605 |
| 0x0A | u16 height | 600 | 600 | 328 |
| 0x0C | u16 depth | 8 | 8 | 8 |
| 0x0E | u16 flags | 0 | 3 | 3 |
| 0x10 | u16 speed | 2 | 45 | 20 |
| 0x50/0x54 | oframe1/2 | 0 / 0（FLI 头留空） | 0x80 / 0x26C8 | 0x80 / 0x198C8 |

### 4.2 帧链验证：**逐帧走到文件末尾，误差 0 字节**

帧 = `u32 size` + `u16 magic(0xF1FA)` + `u16 chunks` + 8 字节保留，**size 含 16 字节帧头**。
从 0x80 开始按 size 前进：

```
sw_logo.rom : 272 帧, end=0xF1FCC1 == filesize  ✅
igslogo.rom :  55 帧, end=0x789824 == filesize  ✅
effect.rom  :  41 帧, end=0x166D88 == filesize  ✅
```
（头里的 frames 字段比实际少 1，是 IGS 导出器的 off-by-one；`evidence/flc_chain.txt`）

### 4.3 帧内 chunk 类型（真·视频压缩）

| 帧 | chunk | 含义 |
|---|---|---|
| 0（关键帧） | `type 4` (COLOR_256) + `type 15` (BRUN) | 768 字节调色板 + 全帧 RLE |
| 后续帧 | `type 12` (LC，sw_logo) / `type 7` (SS2 delta，igslogo) | **只编码变化区域** |

第一帧 `type 4` 长度 = 778 = 6(块头)+2(包数)+768(调色板)+2(对齐)，`data = 01 00 | 00 | 00 | F8 F8 F8 ...`（1 个包，skip=0，count=0→256 色）。

第一帧 `type 15` BRUN 长度 9006 编码 800×600=480,000 像素：
```
每行: [包数] 然后 [count][value]...
第 1 行: 07 | 7f 2a | 7f 2a | 7f 2a | 7f 2a | 7f 2a | 7f 2a | 26 2a
          7 个包    127+127+127+127+127+127+38 = 800 像素 ✅
```
（`count>0` = 重复 count 次 value；`count<0` = 复制 `-count` 个字节）

`type 12` LC 同样验证过：每行恰好 800 像素（`evidence/flc_decode_log.txt`）。
例：`07 7f 2a ...` 上面；LC 例：`0f | 00 81 c7 | 00 f1 c7 | ...` 15 个包 = 127+15+127+127+93+1+17+2+127+12+4+5+2+127+14 = **800** ✅

### 4.4 还原出的画面（这是决定性证据）

| 文件 | 说明 |
|---|---|
| `evidence/png/sw_logo_f032.png` | 片头第 32 帧：金色背景上「SOFT WORLD」圆形金属牌徽标（有 3D 高光/金属环） |
| `evidence/png/sw_logo_f100.png` | 第 100 帧：徽标缩到左上，中文「軟體世界」压入 |
| `evidence/png/sw_logo_montage.png` | 12 帧拼图：黑场 → 金光背景 → 徽标缩放进入 → 中文标题 → 公司全名 |
| `evidence/sw_logo_intro.gif` | **完整 272 帧动画**（400×300 缩放，11.8 MB）—— 一看就是逐帧动画 |
| `evidence/png/igslogo_f000.png` | IGS logo FLC 的第 0 帧（黑场；后续帧是 SS2 delta，未解码，见 §9） |
| `evidence/png/effect_f000.png` | 菜单特效 FLC 关键帧 |

看 `sw_logo_f032.png` 会以为「这是个 3D 徽标」——**它是**，但只在**制作期**：模型/材质/高光在 3D 软件里渲染成 272 张 8bpp 图，游戏只是按 1/35 秒翻页。

### 4.5 交叉验证：`igsmj2.exe` 里就是 FLI 播放器

`strings_exe.txt`：
```
00092FCC  (FlcUse)
00092FDE  Oflc/fli
0009300F  ~(FlcInitFile)
00093029  l(FlcActive)
00093044  (FlcActive)
0009305B  ~(FlcStop)
00093073  ~(FlcGetStatus)
00092AD0  %sdemo\sw_logo.rom
00092AF8  %sdemo\igslogo.rom
00092ABC  %sdemo\sw_snd.rom
00092AE4  %sdemo\snd_logo.rom
```
名字里明写着 **`oflc/fli`**；配套音频 `demo\sw_snd.rom` 是**裸 RIFF WAV**（`52 49 46 46 = "RIFF"`），`snd_logo.rom` 是 `IGSROM01`+`WAVEDATA` 的 WAVE 包。

> 结论：片头是 **2002 年的「预渲染 3D 动画 → FLIC 电影文件 → 逐帧 Blit」**，与今天放 MP4 等价。

---

## 5. 结论 3：人物介绍里「旋转的麻将牌」= **预渲染帧序列**

### 5.1 IGS 图像包格式 `PCDATA01`（已完整逆向）

`play\mj.rom`（527,187 B）头部：

```
00000000  50 43 44 41 54 41 30 31 00 00 00 00 42 41 53 45   PCDATA01....BASE
00000010  44 41 54 41 0C 00 00 00 1F 00 00 00 15 02 00 00   DATA............
00000020  10 00 00 00 41 43 54 49 4E 44 45 58 02 00 00 00   ....ACTINDEX....
00000030  0B 00 50 41 4C 45 54 54 45 31 00 03 00 00 FE FE   ..PALETTE1......
```
容器 = `"PCDATA01"`(8) + u32(0) + 一串 **chunk = 8 字节名字 + u32 长度 + 数据**：

| chunk 名 | 长度 | 内容 |
|---|---|---|
| `BASEDATA` | 12 | 3×u32 = **(调色板数, 图片数, 动作数)** ← mj.rom = (31, 533, 16) |
| `ACTINDEX` | 2 | u16（本文件里始终很小，语义未确定） |
| `PALETTE1` | 768 | 256×RGB；**每个调色板 index 255 = (255,0,255) 洋红 = 透明色键** |
| `PCX_LZSS` / `PK0_LZSS` / `TGA_LZSS` / `BMP_LZSS` | 变长 | **一张图**：u16 w + u16 h + LZSS 流 |
| `PCX_DATA` / `TGA_DATA` / `BMP_DATA` | 变长 | 未压缩的 PCX/TGA/BMP 数据 |
| `ACT_DATA` | 44 | 动作头：`{u32 flag, u32 x, u32 y, u32 nStep, u32 nPool, ...}` |
| `ACT_STEP` | 10/20 | 逐步（帧间）指令 |
| `ACT_POOL` | 10 | 一次贴图：`{u16 x, u16 y, u16 ?, u16 图片号, u16 ?}` |
| `ACTBLOCK` | 0 | 块结束标记 |
| `FILE_END` | — | 文件结束 |

### 5.2 LZSS 算法（从 `igsmj2.exe` 反汇编 0x412D30 得到，不是猜的）

```asm
00412D30  push ecx/ebx/ebp/esi/edi
00412D39  mov ecx,0x3FB ; eax='    ' (0x20202020) ; edi=0x638CF8(ring)
00412D4E  rep stosd                    ; ring[0..4075] = 0x20
00412D59  stosw                        ; +2 → 4078 字节 ' ' （4096-18 标准 LZSS 预填）
00412D54  mov edx,0xFEE               ; 写指针 = 4078
00412D6C  test ah,1                   ; 0x100 哨兵位：第 9 次循环才取下一字节 flags
00412D86  test byte [1c],1            ; bit=1 → 字面量
00412DB1  取 b0 ; 取 b1
00412DC8  and eax,0x0F ; add eax,2     ; 长度 = (b1 & 0x0F) + 3（循环 <= 多拷 1 字节）
00412DDA  ... and ecx,0xF000 ; shl ecx,4 ; or edi,ecx   ; 偏移 = b0 | ((b1 & 0xF0) << 4)
00412DE9  从 ring[(offset+i)&0xFFF] 复制到输出 + ring
```
→ **规则**：flags 字节按 **LSB 优先**，`1`=字面量，`0`=匹配；匹配 2 字节 `b0,b1`：
`offset = b0 | ((b1 & 0xF0) << 4)`，`length = (b1 & 0x0F) + 3`；ring=4096、初值空格、写指针 4078。

**验证**：`mj.rom` 的 533 张图 + `common.rom` 255 张图，按 `w*h` 断言解压长度，**全部精确命中**（`scripts/igs_lzss.py` 自检输出）。

### 5.3 各加载器（exe 里的 7 个函数）

| chunk 类型 | 加载函数 | 头 | 像素格式 |
|---|---|---|---|
| `PCX_DATA` | 0x412AE0 | 128 字节 PCX 头 | 8bpp + PCX RLE |
| `PCX_LZSS` | 0x412E30 | u16 w + u16 h（4B） | **w×h 字节** 8bpp 索引 |
| `PK0_LZSS` | 0x412EB0 | u16 w + u16 h + **u32 解压后字节数**（8B） | 见 §9（未完全解） |
| `TGA_LZSS` | 0x412FC0 | u16 w + u16 h | **w×h×2 = 16bpp RGB555** |
| `BMP_LZSS` | 0x412F40 | u16 w + u16 h | **w×h×2 = 16bpp RGB555** |
| `TGA_DATA` / `BMP_DATA` | 0x412CB0 / 0x412C30 | 原生 TGA/BMP | 16bpp |

### 5.4 `mj.rom` 的图集排布（533 张，可精确对账）

> **不是 m×n 网格图集** —— 每张图是独立 chunk，自带 w/h。

| 图片号 | 数量 | 尺寸 | 内容 |
|---|---|---|---|
| **0–16** | **17** | 68×75,65,62,60,57,55,53,50,49,48,51,54,55,58,61,63,67 | **旋转/摇摆的白牌（整张预渲染）** ← 见 `evidence/png/mj_rotation_17frames_zoom.png` |
| 17–58 | 42 | 33×42 | 42 张**纯牌面**（1–9 萬/筒/索 + 東南西北中發白 + 8 花） |
| 59–75 | 17 | 73×71 … 49×71 … 73 | 旋转组 #2（**牌平躺、看背面**）`mj_shell_59_75.png` |
| 76–92 | 17 | 73×71 … | 旋转组 #3（同上，另一相位/朝向） |
| 93–109 | 17 | 69×75 … 49×75 | 旋转组 #4 |
| 110 | 1 | 53×65 | 杂项 |
| 111–112 | 2 | 63×46 | 杂项 |
| **113–154** | **42** | **69×47** | 42 张牌**已带 3D 侧面/顶面的透视整图**（朝向 A）`mj_113_154_69x47.png` |
| **155–196** | **42** | 69×47 | 同上，**镜像朝向 B** `mj_155_196_69x47.png` |
| 197–238 | 42 | 33×34 | 牌面 LOD 2 |
| 239–280 | 42 | 27×26 | LOD 3 |
| 281–322 | 42 | 25×24 | LOD 4 |
| 323–364 | 42 | 23×22 | LOD 5 |
| 365–406 | 42 | 21×20 | LOD 6 |
| 407–448 | 42 | 19×18 | LOD 7 |
| 449–490 | 42 | 19×16 | LOD 8 |
| 491–532 | 42 | 17×14 | LOD 9（最小） |

对账：`17×4 + 42×11 + 3 = 68 + 462 + 3 = 533` ✅ 与 `BASEDATA(31, 533, 16)` 完全一致。
（`evidence/mj_groups.txt`、`evidence/png/mj_lod_ladder_img17.png`）

### 5.5 旋转牌：是不是实时 3D？

**不是。** 证据链：

1. **17 张独立位图**，宽高逐帧变化（68→48→67），只有这种「每帧一张完整图」才需要 17 个不同的 w —— 实时 3D 会渲染到固定大小的 surface 上。
2. **每帧是完整烘焙的**：牌正面（奶白）、顶面（蓝）、右侧面（深蓝）、黑描边、高光都在像素里；`mj_rotation_17frames_zoom.png` 放大 4 倍可直接数出侧面梯形边缘的像素阶梯。
3. **看不出任何三角/四边形/纹理坐标数据**：`mj.rom` 里除 palette 与压缩图之外没有任何 float 数组（全文件无 4 字节 float 结构，且 exe 无 sin/cos 导入）。
4. 引擎的「旋转」是显示层的一个**属性/状态**而已：exe 字符串里有
   ```
   00092EC7  ~(DisplayRotary)
   00092EE3  ~(DisplayRotaryStop)
   ```
   这是 `Display` 对象的接口名（同族有 `~(DisplayImage)`、`~(DisplayPalette)`、`~(DisplayBlink)`、`~(DisplayHyaline)`），实现就是**换图号**。
5. `ACT` 数据把动画写死：`ACT_DATA{..., nStep=9, nPool=17}` + **17 个 `ACT_POOL`** 逐个指向图片 0…16：
   ```
   act0 pools: (34,75,0,0,0xF400) (32,75,0,1,...) (31,75,0,2,...) ... 17 个
   ```
   → 一次「旋转一圈」= 17 张图按表播。**16/32/64 帧一圈？这里是 17 帧**（且是「摇摆/半圈往复」：宽度 68→48→67 再回来）。

### 5.6 所以人物介绍页的那张「旋转白牌」

- 资源就是 `play\mj.rom` 的 0–16（`mj_rotation_17frames_zoom.png`：奶白正面 + 蓝顶面 + 蓝侧面 + 黑边的白板牌，17 个视角）。
- 这是**全游戏共用**的牌动画资源（`play\mj.rom` 由 `%splay\mj.rom` 加载），人物介绍页与牌桌共用同一套。
- **不建议**再称它「3D 牌」；准确说法：**17 帧预渲染的 3/4 视角摇摆序列**。

### 5.7 补：`role\STAR_*.rom` 里其实**没有**旋转牌 —— 是「台词气泡 + 语音」

任务原本指向 `role\STAR_*.rom`，实测结论要更正：

| 文件族 | 容器 | 内容 |
|---|---|---|
| `role\STAR_C00..C13`（13 个，87–171 KB） | **PCDATA01 + PCX_LZSS**（可解） | **漫画式台词气泡图**，28 张/人：`吃一集` / `又吃了` / `我再吃` / `槓！` / `暗槓！` / `胡了！` / `自摸！` / `再碰！` / `聽牌了！` / `摸一把` / `拼自摸啦` / `大哥！` / `小心！`… 见 `evidence/png/starc00_pal0_montage.png` |
| `role\STAR_A00..A14` / `STAR_B00..B14`（30 个，90 KB–2 MB） | **PCDATA01 + PK0_LZSS**（未解，见 §9） | 同族资源的**大尺寸版本 / 另一套气泡**（33 张/人，单张 ~190×250） |
| `role\STAR_D00..D13` / `E*` / `F*`（30 个，1.2–4.8 MB） | **IGSROM01 + WAVEDATA** | **纯语音**（每文件 130–250 段 RIFF WAVE，8bit mono 22050 Hz） |
| `role\STAR_G00` | PCDATA01 + PCX_LZSS | 1 张图（杂项） |

→ `role\*` 是**角色语音 + 吐槽气泡**；**旋转牌不在这里**，而在 `play\mj.rom`（所有屏幕共用）。

---

## 6. 结论 4：牌桌与麻将牌的渲染管线

### 6.1 牌桌背景 = 14 张整屏 16bpp 位图

```
map\map01.bmp  960,054 B
BM | fileSize=960054 | offBits=54
DIB header=40 | 800x600 | planes=1 | bpp=16 | compression=0
像素数据 = 800*600*2 = 960,000  (RGB555, 无压缩)
```
14 张 map01..map14 全部同规格（`evidence/png/map_montage_01_04_08_14.png`）：书房 + 书柜 + 海景窗 + 紫红桌布 + 中心漩涡图案。**整张是离线渲染图**，运行时一次 `Blt`，没有任何「场景/模型/光照」代码。

> 注：截图里的「水池式蓝绿背景」在这套 14 张图里，对应不同 map（有的是紫色绒布 + 漩涡，有的是蓝绿桌布）。**14 张里挑 1 张整屏贴**，不是程序化绘制。

### 6.2 牌 = 「整张预渲染」而不是「体块 + 贴图」

这是本次分析最反直觉、也最关键的发现。看 `mj.rom` 的图集构成：

| 用途 | 资源 | 形态 |
|---|---|---|
| 桌上的牌（牌河/手牌，正视 3/4 视角） | **113–196（2×42 张，69×47）** | **每张牌一张完整位图**：牌面花纹 + 奶白斜面 + 深蓝侧面 + 高光，全部烘进像素 |
| 牌面「纯平面」小图 | 17–58（42 张，33×42） | 只有正面花纹 + 白底，无立体 |
| 远处/缩小的牌 | 197–532（42×8 = 336 张，17×14 … 33×34） | **9 级离散尺寸**的预渲染小图，逐级重画，不是运行时缩放 |
| 平躺的牌（背面/洗牌） | 59–109（3×17 张，71/75 高） | 17 帧预渲染旋转 |

**「同一张牌有几张变体」的准确答案：11 张**

| 变体 | 位置 | 张数/牌 |
|---|---|---|
| 纯牌面（正视、无立体） | 17–58 | 1 |
| 3/4 透视整图 · 朝向 A | 113–154 | 1 |
| 3/4 透视整图 · 朝向 B（**镜像**） | 155–196 | 1 |
| LOD 2–9（9 级尺寸里的后 8 级） | 197–532 | 8 |
| **合计** | | **11** |

**判定依据：**

1. **两套镜像朝向**：113–154 与 155–196 画的是同样 42 张牌，但**左右镜像**。实测（灰度 L1 差，`evidence/mj_orientation_check.txt`）：同向差 ≈ 64，镜像差 ≈ 7；42/42 张都是镜像更接近。实时 3D 只需要一套 + 变相机；用两套镜像图 = **固定视角，按座位选贴图**。
2. **LOD 是 9 张独立小图**，不是同一张 `w*h` 的 `StretchBlt`：`mj_lod_ladder_img17.png` 里 9 个「一萬」的像素画法逐级不同（细笔画在 27×26 时已经重画成 1px 线），这是美术重新描的。
3. **没有侧面三角/纹理数据**：整包只有调色板 + 压缩位图 + 动作表。
4. **牌面高光是烘焙的**：113–196 每张左上有一道斜向亮线（洋红 index 255 = 透明键区域，见 §6.3），方向与牌角度绑定 → 说明光照是渲染期算好的。
5. 引擎侧接口是 `DisplayImage`（贴图号）+ `DisplayXY` + `DisplayHyaline`（半透明）… 只有 2D 操作。

### 6.3 颜色键 / 透明

- 所有 `PALETTE1` 的第 255 项固定 **`(255,0,255)` 洋红**；`mj.rom` 31 个调色板全部如此（`evidence/mj_detail.txt` 里 `magenta-entries=1`）。
- 即 DirectDraw 的 **ColorKey = 洋红**。这也解释了为什么解码出的牌图里有一道洋红细线：那是画在牌面上的高光像素（很可能是美术把高光留成键色，运行时透出背景形成「亮边」效果）。
- 调色板有 31 个且**逐帧渐变**（pal0 索引 0 = `(254,254,254)`，pal30 = `(201,201,201)`）→ 这是**调色板淡入淡出**（`DisplayHyalineFade` / `FlowPalette` 一类接口），2002 年用调色板做闪白/变暗。

### 6.4 立直/摸牌/打出的动画

- **逐帧序列**（ACT_POOL 指向不同图片号），不是位移/缩放插值。
- 例：`act0` = 17 个 pool（图片 0–16）；`act1` = 42 个 pool（图片 17–58）；`act4` 的 17 个 step 全部相同 → 那是一个「停住不动」的 hold 动画。
- 每个动作头 `ACT_DATA{flag, x, y, nStep, nPool, ...}`（例 `(0, 660, 85, 9, 17, ...)`）—— **动作是数据表驱动的**，和今天的「SpriteAtlas + 帧动画表」是同一套思想。

---

## 7. 证据文件清单

```
evidence/
├─ pe_report.txt            三份 PE 的完整头/节/导入/导出
├─ strings_ace.txt          ace.dll 的 5556 导出名 + D:\tcchou\works\ACE_wrappers\... 路径
├─ strings_exe.txt          igsmj2.exe 全部字符串（格式名/错误信息/flc/rom 路径）
├─ strings_server.txt       server.exe 字符串（纯 TCP 聊天）
├─ rom_magic_scan.txt       全盘 magic 分布（PCDATA01 / IGSROM01 / RIFF / FLI / BMP）
├─ pcdata_chunks.txt        chunk 遍历（BASEDATA/ACT*/PALETTE1/*_LZSS）
├─ pcdata_meta.txt          BASEDATA 三元组、ACT_STEP/POOL 原始字节
├─ exe_xrefs.txt            exe 里对格式名的引用点（哪段代码识别 "PCDATA01"）
├─ exe_lzss_disasm.txt      ★ LZSS 解压器 0x412D30 的反汇编（算法来源）
├─ exe_loader_disasm.txt    PCX_LZSS / PCX_DATA 加载器反汇编
├─ exe_pk0_loader.txt       PK0 / TGA / BMP_LZSS 加载器反汇编
├─ exe_dispatcher.txt       chunk 名字 → 加载函数 的 switch 分派
├─ flc_chain.txt            FLI/FLC 帧链验证（误差 0 字节）
├─ flc_chunks.txt           每帧 chunk 类型/长度
├─ flc_decode_log.txt       每帧解出的 chunk 列表
├─ mj_detail.txt            mj.rom 调色板/图集/动作表
├─ mj_groups.txt            ★ mj.rom 533 张图按尺寸分组（对账）
├─ mj_families.txt          各图族的拼图索引
├─ final_checks.txt         数学函数导入检查、map BMP 头、mainmenu 背景解码
├─ fpu_check.txt            ★ FPU 初始化导入的引用点 + x87 指令普查（274 条）
├─ fpu_check2.txt           ★ fsin/fcos/fsqrt 全部位置与上下文（360 项角度表、画圆）
├─ export_stats.txt         GIF/拼图/导出统计
├─ pk0_probe.txt            PK0 的已知/未知（诚实记录）
└─ png/
   ├─ sw_logo_f000/f004/f008/f016/f032/f064/f100/f150/f200/f240/f270.png
   ├─ sw_logo_montage.png     ★ 片头 12 帧拼图
   ├─ igslogo_f000.png, igslogo_montage.png
   ├─ effect_f000.png, effect_montage.png
   ├─ mj_rotation_17frames_zoom.png   ★ 17 帧旋转白牌（4× 放大）
   ├─ mj_shell_h75_f0_16.png, mj_shell_59_75.png, mj_shell_76_92.png, mj_shell_93_109.png
   ├─ mj_faces_33x42_all42.png        ★ 42 张牌面
   ├─ mj_113_154_69x47.png            ★ 42 张 3/4 透视整图（朝向 A）
   ├─ mj_155_196_69x47.png            ★ 同上镜像（朝向 B）
   ├─ mj_lod_ladder_img17.png         ★ 9 级 LOD 梯形
   ├─ map01_555.png, map01_565.png, map02/04/08/14_rgb555.png, map_montage_01_04_08_14.png
   └─ mainmenu_bg_800x600.png         16bpp 全屏背景
evidence/sw_logo_intro.gif   ★ 片头 272 帧完整动画（11.8 MB）
```

---

## 8. 对七子的启示（WebView2 + C# 路线）

### 8.1 片头 Logo

老游戏：**预渲染 FLIC 逐帧 Blit**。今天等价物 = **MP4/WebM 视频**。

| 方案 | 成本 | 画质/体积 | 建议 |
|---|---|---|---|
| **`<video>` + H.264/VP9**（推荐） | 极低（渲染层几行代码；素材用 Blender/AE 出片） | 1080p 60fps 的 5 秒 logo ≈ 1–2 MB | ✅ **片头就用它**。WebView2 = Chromium，硬解稳。可加 poster 与 `playsinline` |
| 雪碧图序列帧 + CSS `steps()` | 低 | 800×600×272 帧 PNG 序列 = 几百 MB，不可接受；除非降到 480p/30fps 并用 WebP/AVIF | 只在「十几帧的小动效」用 |
| Canvas/WebGL 逐帧画 | 中 | 与雪碧图同量级 | 不划算 |

**结论：片头/大段过场 = `<video>`；只有小尺寸循环动效才用 CSS `steps()` 雪碧图。**

### 8.2 旋转的麻将牌（17 帧）

- **雪碧图 + CSS `steps()`** 完全够：17 帧、单帧 ~68×75，`background-position` 步进，`animation-timing-function: steps(17)`，零 JS。
- 若要更省：**17 帧 WebP**（约 20–40 KB）做成单文件雪碧图；或用 `<img>` + JS 换 `src`（会有解码抖动，不推荐）。
- **别上 3D**：老游戏的 17 帧看起来"够 3D"，因为视角固定、幅度小（摇摆 ±20°，不是整圈）。用 3D 反而要承担光照/材质/性能/美术风格一致性的成本。

### 8.3 牌面本身：**SVG 现画 vs 预渲染雪碧图**（这是最重要的取舍）

先看老游戏怎么做的：**整张烘焙**（42 张透视整图 × 2 朝向 + 9 级 LOD + 42 张纯牌面 = 533 张）。

| 维度 | **A. SVG 现画牌面 + CSS 伪 3D 侧面** | **B. 预渲染雪碧图（学老游戏）** |
|---|---|---|
| 首次成本 | 中：要写「牌面生成器」（数字/萬/筒/索/字牌/花牌 42 种），再加 CSS 立体（`border` 斜切 / `transform: rotateX` + 两层伪元素做侧面） | 中高：美术在 Blender 里搭一张牌 → 42 面 × 2 朝向 × 9 尺寸 = **756 张**导出；或写脚本从一张高清渲染图批量出 LOD |
| 运行性能 | 极好（矢量，任意缩放；42 个 DOM 节点） | 好（雪碧图 + `background-position`，零重绘；但 756 张图要预载） |
| 缩放/DPR | **完美**（矢量，4K/Retina 都锐） | 9 级 LOD 已经是"够用"的水平，但 DPR 2 的屏上会略糊；要么加 2× 资源 |
| **可换肤/主题** | **极好**：改 CSS 变量就能换牌背、换桌布、换高光；甚至节日皮肤/暗色模式 | **差**：换肤 = 重新渲染整套图（756 张） |
| 换牌型/加牌 | 好：数据驱动（`{suit:'wan', rank:5}` → 生成 SVG） | 差：加一种牌 = 美术重新出 18 张（9 LOD × 2 朝向） |
| 立体感真实度 | 中：CSS 伪 3D 侧面是"画"出来的斜面，光照一致性要手调；倾斜角度受限于伪元素几何 | **高**：离线渲染真 3D 的斜面/高光/阴影，和老游戏观感一致 |
| 国际化/换语言 | 好（文字可换） | 差（花纹已烘进像素） |
| 工程风险 | 低（纯前端，无资源管线） | 中（要有渲染+切图+打包管线） |

**推荐（给七子）：**

1. **牌面用 SVG/Canvas 程序化生成**（方案 A），**侧面立体用「一张预渲染的牌体壳 + 牌面贴在正面」**的混合做法：
   - 牌体（厚度、蓝背面、圆角、阴影）= **1 张 SVG 或 1 张 PNG 壳**，所有牌共用；
   - 牌面花纹 = **SVG 现画**，按 `transform` 贴到壳的正面四边形上（`matrix3d` / `preserve-3d`，配合 `rotateX/rotateY`）；
   - 这样：换肤只改 CSS 变量；42 种牌只有一个生成器；DPR 无关；而且**比纯 CSS 伪 3D 更像老游戏**（因为壳是真渲染的）。
2. **不要为牌做 9 级 LOD**：那是 2002 年 `StretchBlt` 质量差 + 显存小的妥协。Web 里直接 `transform: scale()` 矢量牌面，清晰得多。
3. **不要为「左右座位」做两套镜像图**：CSS `scaleX(-1)` 一行搞定（老游戏是因为 Blit 不支持镜像变换才烘两套）。
4. **只有「洗牌/翻牌/旋转」这类小幅帧动画**才用雪碧图；且用 WebP/AVIF 压缩，单帧尺寸控制在 200px 内。
5. 片头/剧情过场：**`<video>`**（老游戏的 FLIC ≈ 今天的 MP4），资源与代码都最省。

**四条候选路线横向对比（整块牌桌：背景 + 牌）**

| 路线 | 换肤 | 画质 | 性能 | 工时 | 结论 |
|---|---|---|---|---|---|
| ① 全预渲染雪碧图（完全照抄老游戏：756 张） | 差 | 已烘焙，DPR 2 略糊 | 最好 | 高（需要渲染管线 + 切图 + 打包） | 只适合"一次性定死、永不再改"的项目 |
| ② CSS 3D + 伪元素画侧面 | 好 | 中（斜面是 CSS 画的，光照要手调） | 好 | 中 | 快速原型可以，正式版侧面会"发假" |
| ③ **SVG 牌面 + 预渲染牌壳 + `matrix3d`** | **最好** | **高（壳是真渲染，面是矢量）** | 好 | 中 | ✅ **推荐** |
| ④ Canvas/WebGL（Three.js 一个 plane + 贴图） | 中（换图要重出资源） | 高 | 好（但多一个 3D 运行时） | 中高 + 引入依赖 | 若将来真要「翻牌 3D 转场」再考虑；牌桌是固定视角，上 WebGL 属于杀鸡用牛刀 |

> 一句话：**老游戏是「全部烘死」的极致（因为 2002 年只能 Blit）；七子应该反过来 —— 牌面和桌面元素矢量/程序化，只有「离线渲染才做得出的东西」（片头、光影、洗牌动画）才预渲染成图/视频。**

---

## 9. 不确定 / 未完成项（诚实边界）

| 项 | 状态 |
|---|---|
| `PK0_LZSS` 内部像素格式 | **未解开**。已确认：头 = `u16 w + u16 h + u32 解压字节数`，LZSS 流（算法同 5.2，解码长度与头里的 u32 完全吻合）。但解压结果是 `w*h` 的 0.42–0.77 倍，不是直接 raw 索引；试过 PCX 行 RLE、4bpp 假设均不成立。影响：`role\STAR_A*.rom` / `role\STAR_B*.rom` / `demo\title.rom` 的人物立绘与标题图**没解出来**。**不影响**三条主结论（牌与片头都不用它）。 |
| `igslogo.rom` / `effect.rom` 的 delta 帧 | 结构已确认是 FLC `type 7`(SS2) delta，但 IGS 的 SS2 chunk 变体与标准规范不完全一致（chunk 首字 = 141/23 行数，随后字 `0xFF24`/`0xFF56` 按标准解出非法 opcode），**未解出像素**。已解出关键帧 0（黑场）。`sw_logo.rom` 用 `type 12`(LC) 已全部解出（272 帧）。 |
| `ACT_STEP` 10 字节的确切字段含义 | 未定。已知 `ACT_DATA{nStep,nPool}` 与 `ACT_POOL{u16 x,u16 y,u16 ?,u16 图号,u16 ?}` 可用；`ACT_STEP` 里能看出「图片序列/时序」但逐字段未对齐（`00 00 ff 00 1f 00 ...` 这种）。 |
| 「人物介绍页」用哪组帧 | 依资源加载路径与坐标推断是 `play\mj.rom` 的 0–16（第 5.6 节），但**未跑游戏逐屏核对**。 |
| 音量/音频格式 | `IGSROM01`+`WAVEDATA` 内含标准 RIFF WAVE（8bit 单声道 22050Hz，见 `STAR_D01.rom` 头 `22 56 00 00`=22050、`01 00 08 00`=mono 8bit）；`.hk`/`.tw` 是同内容的粤语/台语版本。未做逐段解析。 |
| 字体 | `system\font_a24.rom` = 12,288 B = **256 个 16×24 1bpp 点阵**（48 B/字形）；`font_e24` = 612 字形；`font_l24` = 19,641 字形（大字库）。已按尺寸推断，未逐字形确认。 |
| `story\help*.tga` | 原生 32bpp TGA 424×275（与 5.2 节的 _LZSS 无关，直接 Blit）；已核对文件长度 466,418 = 18 + 424×275×4。 |

> 以上所有「不确定」都是**已验证到某一步**的记录，没有用猜测补齐。
