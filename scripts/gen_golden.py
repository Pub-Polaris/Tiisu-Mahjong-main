# -*- coding: utf-8 -*-
"""从现有的 yaku_test.html 生成 golden corpus（行为冻结用）。

原理：`scripts/yaku_test.html?golden=1` 会给 `checkWin` 包一层，记录每次调用的
输入与结果；本脚本用无头 Edge 打开该页，取出 JSON 并写入目标文件。

用法：
    python scripts/gen_golden.py                     # 默认写到 NET/tests/fixtures/yaku-golden.json
    python scripts/gen_golden.py -o path\\to.json
    python scripts/gen_golden.py --no-start          # 复用已运行的 server

产物结构（每条）：
    { hand[], melds[], selfDraw, hasCalled, ankan, minkan, firstTurn,
      winTile, ctx, result{success, reason, totalFu, handType, yaku[], specialPoints, sevenHonors} }
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORT = 7777
BASE = "http://127.0.0.1:%d" % PORT
URL = BASE + "/scripts/yaku_test.html?golden=1"

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
PY_CANDIDATES = [
    r"C:\Program Files\PyManager\python.exe",
    r"C:\Python313\python.exe",
]


def find_edge():
    for p in EDGE_CANDIDATES:
        if os.path.exists(p):
            return p
    raise SystemExit("找不到 msedge.exe")


def find_python():
    for p in PY_CANDIDATES:
        if os.path.exists(p):
            return p
    for n in ("py", "python"):
        from shutil import which
        g = which(n)
        if g:
            return g
    return sys.executable


def server_alive():
    import urllib.request
    try:
        with urllib.request.urlopen(BASE + "/ike.json", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def start_server():
    exe = find_python()
    subprocess.Popen([exe, os.path.join(ROOT, "server.py")], cwd=ROOT,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        time.sleep(0.25)
        if server_alive():
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default=os.path.join(
        os.path.dirname(ROOT), "NET", "tests", "fixtures", "yaku-golden.json"))
    ap.add_argument("--no-start", action="store_true")
    args = ap.parse_args()

    if not server_alive():
        if args.no_start:
            raise SystemExit("server 未运行且指定了 --no-start")
        print("starting server ...")
        if not start_server():
            raise SystemExit("server 启动失败（端口 %d）" % PORT)

    edge = find_edge()
    tmp = tempfile.mkdtemp(prefix="golden_")
    dom = os.path.join(tmp, "d.html")
    argv = [edge, "--headless=new", "--disable-gpu", "--no-first-run",
            "--disable-extensions",
            "--disk-cache-dir=" + os.path.join(tmp, "c"),
            "--user-data-dir=" + os.path.join(tmp, "u"),
            "--virtual-time-budget=30000", "--dump-dom", URL]
    with open(dom, "wb") as f:
        subprocess.run(argv, stdout=f, stderr=subprocess.DEVNULL, timeout=180)

    html = open(dom, encoding="utf-8", errors="replace").read()
    m = re.search(r"GOLDEN&lt;(.*?)&gt;GOLDEN", html, re.S)
    if not m:
        m = re.search(r"GOLDEN<(.*?)>GOLDEN", html, re.S)
    if not m:
        raise SystemExit("没找到 GOLDEN 标记 —— 页面可能报错")

    payload = m.group(1)
    for a, b in (("&quot;", '"'), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">")):
        payload = payload.replace(a, b)
    data = json.loads(payload)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=False)
        f.write("\n")

    ok = sum(1 for d in data if d.get("result", {}).get("success"))
    print("golden entries: %d  (success %d / fail %d)" % (len(data), ok, len(data) - ok))
    print("written:", out, "(%.1f KB)" % (os.path.getsize(out) / 1024.0))


if __name__ == "__main__":
    main()
