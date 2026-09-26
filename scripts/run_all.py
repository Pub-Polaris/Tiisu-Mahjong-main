#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
run_all.py - Tiisu Mahjong: run every check in one command (robust version).

Why Python: the PowerShell runners are fine individually, but invoking them
nested / repeatedly from a network share can crash inside Windows AMSI
(System.AccessViolationException in AmsiScanBuffer). Python + a direct Edge
call sidesteps that entirely.

Usage:
    python scripts/run_all.py            # assertions + 2 full auto games
    python scripts/run_all.py --runs 5
    python scripts/run_all.py --no-start # do not auto-start server.py

Checks:
    1) scripts/yaku_test.html    -> yaku / fu / points assertions
    2) scripts/engine_test.html  -> engine-rule assertions
    3) index.html?auto=1&mode=4  -> N full auto games, no JS errors

Exit code: 0 = all passed, 1 = failures, 2 = environment problem.
Read-only on the repository; writes only under the system temp dir.
"""

from __future__ import print_function
import io, os, re, sys, time, socket, subprocess, tempfile, shutil

# 控制台可能是 GBK，测试名里含 "−"（U+2212）等字符会抛 UnicodeEncodeError；
# 统一切到 UTF-8 + replace，保证任何环境下都不会因编码中断。
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORT = 7777
BASE = "http://127.0.0.1:%d" % PORT

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
PY_CANDIDATES = [
    r"<PYTHON>",
    r"C:\Program Files\PyManager\python.exe",
    r"C:\Python313\python.exe",
]

FAILED = []
PASSED = []


def log(msg=""):
    sys.stdout.write(msg + "\n")
    sys.stdout.flush()


def read_bytes(path):
    """读取文件原始字节；不存在返回 None（用于逐字节比对）。"""
    try:
        with open(path, "rb") as f:
            return f.read()
    except Exception:
        return None


def find_edge():
    for p in EDGE_CANDIDATES:
        if os.path.isfile(p):
            return p
    return None


def port_open(port):
    s = socket.socket()
    s.settimeout(0.6)
    try:
        s.connect(("127.0.0.1", port))
        return True
    except Exception:
        return False
    finally:
        s.close()


def start_server():
    if port_open(PORT):
        return True
    exe = sys.executable
    for p in PY_CANDIDATES:
        if os.path.isfile(p):
            exe = p
            break
    subprocess.Popen([exe, os.path.join(ROOT, "server.py")],
                     cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(30):
        time.sleep(0.5)
        if port_open(PORT):
            return True
    return False


def dump_dom(edge, url, budget_ms, tag):
    """Headless Edge -> dumped DOM text (and stderr log)."""
    prof = os.path.join(tempfile.gettempdir(), "op_all_%s_prof" % tag)
    cache = os.path.join(tempfile.gettempdir(), "op_all_%s_cache" % tag)
    html = os.path.join(tempfile.gettempdir(), "op_all_%s.html" % tag)
    logf = os.path.join(tempfile.gettempdir(), "op_all_%s.log" % tag)
    for d in (prof, cache):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d, exist_ok=True)
    cmd = '"%s" --headless=new --disable-gpu --disable-cache --disk-cache-dir="%s" ' \
          '--enable-logging=stderr --v=0 --user-data-dir="%s" --dump-dom ' \
          '--virtual-time-budget=%d "%s" > "%s" 2> "%s"' % (edge, cache, prof, budget_ms, url, html, logf)
    subprocess.call(cmd, shell=True)
    dom = ""
    if os.path.isfile(html):
        dom = io.open(html, encoding="utf-8", errors="replace").read()
    errlog = ""
    if os.path.isfile(logf):
        errlog = io.open(logf, encoding="utf-8", errors="replace").read()
    return dom, errlog


def pre_text(dom, elem_id):
    m = re.search(r'<pre id="%s">(.*?)</pre>' % re.escape(elem_id), dom, re.S)
    if not m:
        return None
    return re.sub(r"<[^>]+>", "", m.group(1))


def js_errors(errlog):
    return re.findall(r".*(?:Uncaught|ReferenceError|TypeError|SyntaxError).*", errlog)


def run_assertion_page(edge, label, page, prefix):
    log("")
    log("=" * 62)
    log("  " + label)
    log("=" * 62)
    url = "%s/%s?ts=%d" % (BASE, page, int(time.time() * 1000))
    dom, errlog = dump_dom(edge, url, 60000, prefix.lower())
    out = pre_text(dom, "out")
    if not out or out.strip() == "running":
        errs = js_errors(errlog)
        log("  [FAIL] no result (page did not finish); html=%d bytes" % len(dom))
        for e in errs[:5]:
            log("    " + e.strip()[:160])
        FAILED.append(label)
        return
    lines = [l.rstrip("\r") for l in out.split("\n")]
    head = lines[0].strip() if lines else ""
    fails = [l for l in lines if re.match(r"^\s*(FAIL|ERROR)", l)]
    for l in lines:
        if l.startswith("# "):
            log("  " + l)
        elif re.match(r"^\s*(FAIL|ERROR)", l):
            log(l)
    log("  " + "-" * 40)
    log("  " + head)
    for f in fails:
        log("    " + f.strip())
    if head.startswith(prefix) and "PASS" in head:
        PASSED.append(label)
    else:
        FAILED.append(label)


def run_auto_games(edge, runs):
    log("")
    log("=" * 62)
    log("  smoke: %d full auto game(s) (index.html?auto=1&mode=4)" % runs)
    log("=" * 62)
    bad = 0
    for i in range(1, runs + 1):
        url = "%s/index.html?auto=1&mode=4&smoke=%d&ts=%d" % (BASE, i, int(time.time() * 1000))
        dom, errlog = dump_dom(edge, url, 120000, "auto%d" % i)
        errs = js_errors(errlog)
        body = re.sub(r"<script.*?</script>", "", dom, flags=re.S)
        m = re.search(r'id="roundDisplay"[^>]*>([^<]*)<', body)
        ok = (not errs) and bool(m)
        log("  run %d : errors=%d round=%s" % (i, len(errs), (m.group(1) if m else "?")))
        for e in errs[:3]:
            log("    " + e.strip()[:160])
        if not ok:
            bad += 1
    if bad == 0:
        log("  [PASS] auto games clean")
        PASSED.append("smoke")
    else:
        log("  [FAIL] %d run(s) had problems" % bad)
        FAILED.append("smoke")


def main():
    runs = 2
    no_start = False
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--runs" and i + 1 < len(args):
            runs = int(args[i + 1])
        if a == "--no-start":
            no_start = True

    edge = find_edge()
    if not edge:
        log("Edge not found; install Edge or edit EDGE_CANDIDATES.")
        return 2
    if not no_start and not start_server():
        log("server not ready on port %d; run run.cmd first." % PORT)
        return 2
    if not port_open(PORT):
        log("port %d not listening." % PORT)
        return 2

    log("Tiisu Mahjong: run_all.py")
    log("Root: %s" % ROOT)

    # 断言页会真实调用 engine 的统计上报 / 会话存档；测试页内已把
    # /api/stats 与 /api/state 换成内存桩。这里再从文件层复核一次：
    # 跑完所有断言后 stats.json 与 state.json 内容必须逐字节不变。
    watch = ["stats.json", "state.json"]
    before = {n: read_bytes(os.path.join(ROOT, n)) for n in watch}

    run_assertion_page(edge, "yaku / scoring assertions", "scripts/yaku_test.html", "YAKUTEST")
    run_assertion_page(edge, "engine-rule assertions", "scripts/engine_test.html", "ENGINETEST")

    after = {n: read_bytes(os.path.join(ROOT, n)) for n in watch}
    log("")
    log("=" * 62)
    log("  测试隔离：断言不得改动运行态文件（stats.json / state.json）")
    log("=" * 62)
    changed = [n for n in watch if before[n] != after[n]]
    if not changed:
        log("  [PASS] %s 逐字节不变" % " + ".join(watch))
        PASSED.append("run-state isolation")
    else:
        log("  [FAIL] 被断言改动：%s（测试隔离失效）" % ", ".join(changed))
        for n in changed:
            log("    %s: before=%d bytes  after=%d bytes"
                % (n, len(before[n] or b""), len(after[n] or b"")))
        FAILED.append("run-state isolation")

    run_auto_games(edge, runs)

    log("")
    log("=" * 62)
    for p in PASSED:
        log("  [PASS] " + p)
    for f in FAILED:
        log("  [FAIL] " + f)
    log("=" * 62)
    if FAILED:
        log("SOME CHECKS FAILED (%d)" % len(FAILED))
        return 1
    log("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
