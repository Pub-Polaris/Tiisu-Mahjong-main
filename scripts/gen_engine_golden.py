# -*- coding: utf-8 -*-
"""生成 engine golden 语料（回放式对照用）。

用法：
    python scripts/gen_engine_golden.py                    # 默认 3 局 × 1 手
    python scripts/gen_engine_golden.py -g 5 -n 2          # 5 局、每局 2 手

产物：NET/tests/fixtures/engine-golden.json
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

EDGE = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"]
PY = [r"C:\Program Files\PyManager\python.exe", r"C:\Python313\python.exe"]


def find(paths, name):
    for p in paths:
        if os.path.exists(p):
            return p
    from shutil import which
    g = which(name)
    if g:
        return g
    raise SystemExit("找不到 " + name)


def server_alive():
    import urllib.request
    try:
        with urllib.request.urlopen(BASE + "/ike.json", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-g", "--games", type=int, default=3)
    ap.add_argument("-n", "--hands", type=int, default=1)
    ap.add_argument("--seed", type=int, default=20261018)
    ap.add_argument("-o", "--out", default=os.path.join(
        os.path.dirname(ROOT), "NET", "tests", "fixtures", "engine-golden.json"))
    ap.add_argument("--budget", type=int, default=120000)
    args = ap.parse_args()

    if not server_alive():
        subprocess.Popen([find(PY, "python"), os.path.join(ROOT, "server.py")], cwd=ROOT,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(40):
            time.sleep(0.25)
            if server_alive():
                break
        else:
            raise SystemExit("server 启动失败")

    url = "%s/scripts/engine_golden.html?games=%d&hands=%d&seed=%d" % (
        BASE, args.games, args.hands, args.seed)
    tmp = tempfile.mkdtemp(prefix="enggold_")
    dom = os.path.join(tmp, "d.html")
    argv = [find(EDGE, "msedge.exe"), "--headless=new", "--disable-gpu", "--no-first-run",
            "--disable-extensions",
            "--disk-cache-dir=" + os.path.join(tmp, "c"),
            "--user-data-dir=" + os.path.join(tmp, "u"),
            "--virtual-time-budget=%d" % args.budget, "--enable-logging=stderr",
            "--dump-dom", url]
    t0 = time.time()
    with open(dom, "wb") as f:
        subprocess.run(argv, stdout=f, stderr=subprocess.DEVNULL, timeout=args.budget / 1000 + 180)
    html = open(dom, encoding="utf-8", errors="replace").read()
    print("headless %.1fs dom=%.1f KB" % (time.time() - t0, len(html) / 1024.0))

    mp = re.search(r'<pre id="o">(.*?)</pre>', html, re.S)
    body = mp.group(1) if mp else ""
    err = re.search(r"RERR&lt;(.*?)&gt;RERR", body, re.S) or re.search(r"RERR<(.*?)>RERR", body, re.S)
    if err:
        raise SystemExit("页面报错: " + err.group(1)[:300])

    unesc = body
    for a, b in (("&quot;", '"'), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">")):
        unesc = unesc.replace(a, b)
    m = re.search(r"ENGINE(\{.*\})>ENGINE", unesc, re.S)
    if not m:
        # DEBUG_BODY：打印页面实际内容，便于定位
        print("DEBUG_BODY len=%d" % len(body))
        print(body[:1500])
        raise SystemExit("没找到 ENGINE 标记（见上面的 DEBUG_BODY）")
    data = json.loads(m.group(1))

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    ev = data["events"]
    kinds = {}
    for e in ev:
        kinds[e["e"]] = kinds.get(e["e"], 0) + 1
    print("events: %d  种类: %s" % (len(ev), kinds))
    print("written: %s (%.2f MB)" % (out, os.path.getsize(out) / 1024.0 / 1024.0))


if __name__ == "__main__":
    main()
