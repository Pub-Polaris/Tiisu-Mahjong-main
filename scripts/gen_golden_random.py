# -*- coding: utf-8 -*-
"""生成构造式随机语料（合法手），供 C# 逐字段对比。

用法：
    python scripts/gen_golden_random.py                 # 默认 5000 手，seed 20261018
    python scripts/gen_golden_random.py -n 10000 --seed 42
    python scripts/gen_golden_random.py -o path\\to.json

产物结构同 `gen_golden.py`，另存 meta（条数/成功数/seed/尝试次数）。
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
    from shutil import which
    for n in ("py", "python"):
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
    subprocess.Popen([find_python(), os.path.join(ROOT, "server.py")], cwd=ROOT,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        time.sleep(0.25)
        if server_alive():
            return True
    return False


def unescape(s):
    for a, b in (("&quot;", '"'), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">")):
        s = s.replace(a, b)
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--count", type=int, default=5000)
    ap.add_argument("--seed", type=int, default=20261018)
    ap.add_argument("-o", "--out", default=os.path.join(
        os.path.dirname(ROOT), "NET", "tests", "fixtures", "yaku-golden-random.json"))
    ap.add_argument("--no-start", action="store_true")
    ap.add_argument("--budget", type=int, default=180000, help="页面虚拟时间预算 ms")
    args = ap.parse_args()

    if not server_alive():
        if args.no_start:
            raise SystemExit("server 未运行且指定了 --no-start")
        if not start_server():
            raise SystemExit("server 启动失败")

    url = "%s/scripts/gen_golden_random.html?n=%d&seed=%d" % (BASE, args.count, args.seed)
    edge = find_edge()
    tmp = tempfile.mkdtemp(prefix="goldenrand_")
    dom = os.path.join(tmp, "d.html")
    argv = [edge, "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
            "--disk-cache-dir=" + os.path.join(tmp, "c"),
            "--user-data-dir=" + os.path.join(tmp, "u"),
            "--virtual-time-budget=%d" % args.budget, "--dump-dom", url]
    t0 = time.time()
    with open(dom, "wb") as f:
        subprocess.run(argv, stdout=f, stderr=subprocess.DEVNULL, timeout=args.budget / 1000 + 120)
    html = open(dom, encoding="utf-8", errors="replace").read()
    # 只取 <pre id="o"> 内容，否则会匹配到脚本源码里的同名字符串
    mp = re.search(r'<pre id="o">(.*?)</pre>', html, re.S)
    body = mp.group(1) if mp else ""
    print("headless: %.1fs, dom=%.1f KB" % (time.time() - t0, len(html) / 1024.0))

    err = re.search(r"RERR&lt;(.*?)&gt;RERR", body, re.S) or re.search(r"RERR<(.*?)>RERR", body, re.S)
    if err:
        raise SystemExit("页面报错: " + unescape(err.group(1))[:300])

    m = re.search(r"RANDOM&lt;(.*?)&gt;RANDOM", body, re.S) or re.search(r"RANDOM<(.*?)>RANDOM", body, re.S)
    if not m:
        raise SystemExit("没找到 RANDOM 标记 —— 可能生成超时（调大 --budget）")
    data = json.loads(unescape(m.group(1)))

    meta_m = re.search(r"RMETA&lt;(.*?)&gt;RMETA", body, re.S) or re.search(r"RMETA<(.*?)>RMETA", body, re.S)
    meta = json.loads(unescape(meta_m.group(1))) if meta_m else {}

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    ok = sum(1 for d in data if d.get("result", {}).get("success"))
    print("random entries: %d (success %d / fail %d)  meta=%s" % (len(data), ok, len(data) - ok, meta))
    print("written: %s (%.2f MB)" % (out, os.path.getsize(out) / 1024.0 / 1024.0))


if __name__ == "__main__":
    main()
