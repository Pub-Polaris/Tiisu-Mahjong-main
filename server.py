import socket
import http.server
import json
import os
import time
import threading
import re
import sys
import shutil
import tarfile

PORT = 7777
DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(DIR, 'logs')
SETTINGS_PATH = os.path.join(DIR, 'settings.json')
STATE_PATH = os.path.join(DIR, 'state.json')
STATS_PATH = os.path.join(DIR, 'stats.json')

DEFAULT_SETTINGS = {
    "thinkSeconds": 30,
    "optionalYaku": [],      # 已启用的可选役 id 列表
    "showMa": False,         # 马牌(岭上)显示

    "showDebug": False,      # 游戏页调试面板默认显示
    "showWallViewer": False, # 牌山查看器（调试选项，默认关 → 下方区域空出）
    "recordTiles": False     # 默认记录牌型
}
DEFAULT_STATS = {"tiisuinCount": 0, "witnessCount": 0, "wins": 0, "rounds": 0, "byPlayer": {}}

# 旧键 → 新键（2026-09-27 由 daxingqi 统一改名为 tiisuin）：
# 统计文件是累计计数，读入时自动折算，避免新旧键并存出现混合态。
_LEGACY_STAT_KEYS = {"daxingqiCount": "tiisuinCount"}

def _normalize_stats(cur):
    """把旧命名的统计键并入新命名，并删除旧键。幂等。"""
    if not isinstance(cur, dict):
        return json.loads(json.dumps(DEFAULT_STATS))
    for old, new in _LEGACY_STAT_KEYS.items():
        if old in cur:
            cur[new] = int(cur.get(new, 0)) + int(cur.get(old, 0) or 0)
            del cur[old]
    bp = cur.get("byPlayer")
    if isinstance(bp, dict):
        for name, e in bp.items():
            if not isinstance(e, dict):
                continue
            if "daxingqi" in e:
                e["tiisuin"] = int(e.get("tiisuin", 0)) + int(e.get("daxingqi", 0) or 0)
                del e["daxingqi"]
    return cur

def _read_json(path, default):
    if not os.path.isfile(path):
        return json.loads(json.dumps(default))
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return json.loads(json.dumps(default))

def _write_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print('[json] 写入失败 %s: %s' % (path, e))
        return False

def archive_session(session):
    """把 logs/<session> 目录压缩为 archive_<session>_<ts>.tar.gz 后删除原目录。"""
    if not session:
        return
    src = os.path.join(LOG_DIR, session)
    if not os.path.isdir(src):
        return
    ts = time.strftime('%Y%m%d_%H%M%S')
    dest = os.path.join(LOG_DIR, 'archive_%s_%s.tar.gz' % (session, ts))
    try:
        with tarfile.open(dest, 'w:gz') as tf:
            tf.add(src, arcname=session)
        shutil.rmtree(src)
        return dest
    except Exception as e:
        print('[archive] 归档失败 %s: %s' % (session, e))
        return None

def archive_previous_sessions():
    """启动时把 logs 下所有会话目录（非归档文件）压缩为 tar.gz 后删除原目录。
    归档名：archive_<session>.tar.gz；archive 与 chr 日志文件保留在 logs/。"""
    if not os.path.isdir(LOG_DIR):
        return
    archived = []
    for name in os.listdir(LOG_DIR):
        src = os.path.join(LOG_DIR, name)
        if not os.path.isdir(src):
            continue
        # 会话目录形如 YYYYMMDD_...（含 '-')
        if not re.match(r'^\d{8}_', name):
            continue
        if archive_session(name):
            archived.append(name)
    if archived:
        print('[archive] 已归档会话: %s' % ', '.join(archived))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')

    def do_GET(self):
        if self.path == '/':
            self.send_response(302)
            self.send_header('Location', '/portal.html')
            self.end_headers()
            return
        if self.path == '/api/settings':
            self._handle_settings(None)
            return
        if self.path == '/api/state':
            self._handle_state(None)
            return
        if self.path == '/api/stats':
            self._handle_stats(None)
            return
        super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except:
            data = {}

        if self.path == '/api/log':
            os.makedirs(LOG_DIR, exist_ok=True)
            path = os.path.join(LOG_DIR, 'output.txt')
            with open(path, 'a', encoding='utf-8') as f:
                f.write(data.get('message', '') + '\n')
            self.send_response(200)
            self._cors()
            self.end_headers()
            self.wfile.write(b'ok')
        elif self.path == '/api/settings':
            self._handle_settings(data)
        elif self.path == '/api/state':
            self._handle_state(data)
        elif self.path == '/api/stats':
            self._handle_stats(data)
        elif self.path == '/api/round_end':
            self._handle_round_end(data)
        elif self.path == '/api/roundlog':
            self._handle_roundlog(data)
        elif self.path == '/api/chrlog':
            self._handle_chrlog(data)
        else:
            self.send_response(404)
            self.end_headers()

    # ── 设置：GET 返回合并默认值；POST 覆盖保存 ──
    def _handle_settings(self, data):
        if not data:
            # GET：无 body → 返回当前设置
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            merged = json.loads(json.dumps(DEFAULT_SETTINGS))  # 深拷贝，避免污染默认
            merged.update(_read_json(SETTINGS_PATH, {}))
            self.wfile.write(json.dumps(merged, ensure_ascii=False).encode('utf-8'))
            return
        cur = json.loads(json.dumps(DEFAULT_SETTINGS))
        cur.update(_read_json(SETTINGS_PATH, {}))
        cur.update(data)
        _write_json(SETTINGS_PATH, cur)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps(cur, ensure_ascii=False).encode('utf-8'))

    # ── 会话状态：GET 返回当前存档；POST 覆盖保存 ──
    def _handle_state(self, data):
        if not data:
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(_read_json(STATE_PATH, {}), ensure_ascii=False).encode('utf-8'))
            return
        _write_json(STATE_PATH, data)
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        # 回写 JSON（前端 debug.html 用 .json() 读取返回）
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    # ── 统计：GET 返回累计；POST 累加（tiisuinCount/wins/rounds/byPlayer）──
    def _handle_stats(self, data):
        cur = DEFAULT_STATS.copy()
        cur.update(_read_json(STATS_PATH, {}))
        cur = _normalize_stats(cur)
        if data:
            if data.get('kind') == 'reset':
                cur = json.loads(json.dumps(DEFAULT_STATS))
            else:
                cur['tiisuinCount'] = int(cur.get('tiisuinCount', 0)) + int(data.get('tiisuin', 0) or 0)
                cur['witnessCount'] = int(cur.get('witnessCount', 0)) + len(data.get('witness') or [])
                cur['wins'] = int(cur.get('wins', 0)) + int(data.get('wins', 0) or 0)
                cur['rounds'] = int(cur.get('rounds', 0)) + int(data.get('rounds', 0) or 0)
                bp = cur.get('byPlayer') or {}
                pn = data.get('player')
                if pn:
                    e = bp.get(pn) or {}
                    e['wins'] = int(e.get('wins', 0)) + int(data.get('wins', 0) or 0)
                    e['tiisuin'] = int(e.get('tiisuin', 0)) + int(data.get('tiisuin', 0) or 0)
                    bp[pn] = e
                # 大七星见证：同局其他三家各 +1
                for wn in (data.get('witness') or []):
                    we = bp.get(wn) or {}
                    we['witness'] = int(we.get('witness', 0)) + 1
                    bp[wn] = we
                cur['byPlayer'] = bp
            _write_json(STATS_PATH, cur)
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(cur, ensure_ascii=False).encode('utf-8'))

    # ── 单局结束归档：把本局日志目录压缩为 tar.gz（保留原始文件以防重复）──
    def _handle_round_end(self, data):
        session = data.get('session', '')
        dest = archive_session(session)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(('archived:' + (dest or 'none')).encode('utf-8'))

    # 每局每玩家的牌型日志：logs\<session>\局NNN_玩家名_UUID\log.txt
    def _handle_roundlog(self, data):
        os.makedirs(LOG_DIR, exist_ok=True)
        session = data.get('session', '')
        round_no = data.get('round', 0)
        player = data.get('player', '')
        puuid = data.get('playerUUID', '')
        entry = data.get('entry', '')
        safe_s = re.sub(r'[\\/:*?"<>|]', '-', session)
        safe_p = re.sub(r'[\\/:*?"<>|]', '-', str(player))
        safe_u = re.sub(r'[\\/:*?"<>|]', '-', str(puuid))
        folder = os.path.join(LOG_DIR, safe_s, '局%03d_%s_%s' % (int(round_no or 0), safe_p, safe_u))
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, 'log.txt')
        with open(path, 'a', encoding='utf-8') as f:
            f.write(entry + '\n\n')
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(b'ok')

    def _handle_chrlog(self, data):
        os.makedirs(LOG_DIR, exist_ok=True)
        session = data.get('session', '')
        # 文件名格式: YYMMDD_HH-MM-SS_chr_console.log (Windows 不允许冒号)
        safe = re.sub(r'[\\/:*?"<>|]', '-', session)
        fname = safe + '_chr_console.log'
        path = os.path.join(LOG_DIR, fname)
        entry = data.get('entry', '')
        with open(path, 'a', encoding='utf-8') as f:
            f.write(entry + '\n')
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(b'ok')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

class DualStackServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    def server_bind(self):
        self.socket.close()
        self.socket = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except:
            pass
        super().server_bind()

if __name__ == '__main__':
    # 解析命令行参数
    verbose = '--verbose' in sys.argv or '-v' in sys.argv

    # 启动时归档上一会话的牌型日志
    archive_previous_sessions()

    httpd = DualStackServer(('::', PORT), Handler)
    
    if verbose:
        print(f'[VERBOSE] Dual-stack server started')
        print(f'[VERBOSE] Listening on: http://[::]:{PORT} (IPv6+IPv4)')
        print(f'[VERBOSE] Static directory: {DIR}')
        print(f'[VERBOSE] Log directory: {LOG_DIR}')
        print(f'[VERBOSE] Press Ctrl+C to stop')
    else:
        print(f'Dual-stack server at http://[::]:{PORT} (IPv6+IPv4)')
        print(f'Static dir: {DIR}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        if verbose:
            print('\n[VERBOSE] Shutting down server...')
        httpd.shutdown()
        if verbose:
            print('[VERBOSE] Server stopped')