# -*- coding: utf-8 -*-
"""把 Web/mj_tiles/*.svg 栅格化成一张透明底雪碧图（2x），供 C# WinForms 直接加载。

用法：
    python scripts/export_tiles.py                     # 默认输出到 NET/src/Tiisu.App/Assets
    python scripts/export_tiles.py -o <dir>

产物：
    tiles.png   9 列 × 4 行，每格 72×100（牌面 68 宽），透明背景
    tiles.json  { cellW, cellH, ids: [...] }（按行优先顺序，最后一格空）

为什么构建期栅格化：SkiaSharp 4.x 下 SkiaSharp.Svg 1.60 不兼容、Svg.Skia 版本绑定风险高；
用浏览器渲染 SVG 与 Web 版视觉 100% 一致，运行时只加载 PNG。
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORT = 7777
BASE = "http://127.0.0.1:%d" % PORT

CELL_W, CELL_H = 72, 100
COLS = 9


def ids_order():
    ids = []
    for s in ("m", "p", "s"):
        for n in range(1, 10):
            ids.append("%d%s" % (n, s))
    for n in range(1, 8):
        ids.append("%dz" % n)
    return ids


def server_alive():
    import urllib.request
    try:
        with urllib.request.urlopen(BASE + "/mj_tiles/1m.svg", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def find_python():
    from shutil import which
    for n in ("python", "py"):
        g = which(n)
        if g:
            return g
    return sys.executable


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default=os.path.join(
        os.path.dirname(ROOT), "NET", "src", "Tiisu.App", "Assets"))
    args = ap.parse_args()

    if not server_alive():
        subprocess.Popen([find_python(), os.path.join(ROOT, "server.py")], cwd=ROOT,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(40):
            time.sleep(0.25)
            if server_alive():
                break
        else:
            raise SystemExit("server 启动失败")

    ids = ids_order()
    rows = (len(ids) + COLS - 1) // COLS
    width, height = COLS * CELL_W, rows * CELL_H

    edge = None
    for p in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"):
        if os.path.exists(p):
            edge = p
            break
    if not edge:
        raise SystemExit("找不到 msedge.exe")

    os.makedirs(os.path.abspath(args.out), exist_ok=True)
    png = os.path.join(os.path.abspath(args.out), "tiles.png")
    tmp = tempfile.mkdtemp(prefix="tiles_")
    argv = [edge, "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=%d,%d" % (width, height),
            "--default-background-color=00000000",
            "--virtual-time-budget=8000",
            "--screenshot=" + png,
            "--user-data-dir=" + os.path.join(tmp, "u"),
            "--disk-cache-dir=" + os.path.join(tmp, "c"),
            BASE + "/scripts/tile_atlas.html"]
    t0 = time.time()
    subprocess.run(argv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)

    if not os.path.exists(png):
        raise SystemExit("截图失败：没有生成 " + png)

    manifest = {
        "cellW": CELL_W,
        "cellH": CELL_H,
        "cols": COLS,
        "rows": rows,
        "ids": ids,
        "source": "Web/mj_tiles/*.svg（2x 栅格化）",
    }
    with open(os.path.join(os.path.abspath(args.out), "tiles.json"), "w",
              encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print("atlas: %dx%d  %d tiles  (%.1fs)" % (width, height, len(ids), time.time() - t0))
    print("->", png, "(%.1f KB)" % (os.path.getsize(png) / 1024.0))


if __name__ == "__main__":
    main()
