# -*- coding: utf-8 -*-
"""生成 AI 决策语料（C# AiPlayer 对照用）。

用法：
    python scripts/gen_ai_golden.py                  # 默认 5 局 × 2 手
    python scripts/gen_ai_golden.py -g 5 -n 2        # 同上，显式写法
    python scripts/gen_ai_golden.py --seed 20261018

产物：NET/tests/fixtures/ai-golden.json
同一 seed 重跑必须逐字节一致（页面里 fetch / Math.random / Date / setTimeout 全桩掉）。
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
    ap.add_argument("-g", "--games", type=int, default=5)
    ap.add_argument("-n", "--hands", type=int, default=2)
    ap.add_argument("--seed", type=int, default=20261018)
    ap.add_argument("-o", "--out", default=os.path.join(
        os.path.dirname(ROOT), "NET", "tests", "fixtures", "ai-golden.json"))
    ap.add_argument("--budget", type=int, default=240000)
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

    url = "%s/scripts/ai_golden.html?games=%d&hands=%d&seed=%d" % (
        BASE, args.games, args.hands, args.seed)
    tmp = tempfile.mkdtemp(prefix="aigold_")
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
    m = re.search(r"AIGOLD<(\{.*\})>AIGOLD", unesc, re.S)
    if not m:
        # DEBUG_BODY：打印页面实际内容，便于定位
        print("DEBUG_BODY len=%d" % len(body))
        print(body[:1500])
        raise SystemExit("没找到 AIGOLD 标记（见上面的 DEBUG_BODY）")
    data = json.loads(m.group(1))

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    dec = data["decisions"]
    kinds = {}
    for d in dec:
        kinds[d["kind"]] = kinds.get(d["kind"], 0) + 1
    print("decisions: %d  种类: %s" % (len(dec), kinds))

    # 覆盖率细则：副露/杠的细分类型
    def tally(items):
        c = {}
        for x in items:
            c[x] = c.get(x, 0) + 1
        return c
    meld_types = tally([d["out"].get("type", "pass") for d in dec if d["kind"] == "meld"])
    kan_types = tally([d["out"]["type"] if d["out"] else "none" for d in dec if d["kind"] == "kan"])
    ron_hits = sum(1 for d in dec if d["kind"] == "ron" and d["out"]["winners"])
    tsumo_hits = sum(1 for d in dec if d["kind"] == "tsumo" and d["out"]["win"])
    after_kan = sum(1 for d in dec if d["kind"] == "tsumo" and d.get("afterKan"))
    rnd_used = sum(1 for d in dec if d["rnd"])
    print("meld: %s" % meld_types)
    print("kan : %s" % kan_types)
    print("ron 命中 %d / tsumo 命中 %d / 杠后自摸判定 %d / 消耗随机值 %d"
          % (ron_hits, tsumo_hits, after_kan, rnd_used))
    print("引擎实际: %s" % data.get("stats"))
    print("written: %s (%.2f MB)" % (out, os.path.getsize(out) / 1024.0 / 1024.0))


if __name__ == "__main__":
    main()
