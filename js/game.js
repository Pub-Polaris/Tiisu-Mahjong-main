
// ══════════════════════════════════════════════════════════════
// 装配层 + UI（游戏逻辑已解耦至 tiles.js / winchecker.js / engine.js）
// ══════════════════════════════════════════════════════════════

// ── 启动参数（门户/URL 传入；无参默认东风场 4 局）──
let LAUNCH = (() => {
    const p = new URLSearchParams(location.search);
    return { mode: parseInt(p.get('mode')) || 4, test: p.get('test') === '1', nostart: p.get('nostart') === '1' };
})();
// nostart=1：只装配、不开局、不读写 state.json —— 供测试页（yaku_test / engine_test）挂载用，
// 这样断言跑完后 stats.json / state.json 都不会被运行态初始化污染。
const NO_START = LAUNCH.nostart;

// 注意：engine.js / winchecker.js 等由 <script src> 加载。
// 极少数情况下（磁盘/网络抖动）某个脚本可能未成功执行，导致 WinChecker / TiisuMahjong 未定义。
// 这里延迟到 DOMContentLoaded，并用 ensureDeps() 兜底补加载后再创建 game。
let game = null;

// ── 日志 ──
function gameLog(msg) {
    const line = '[' + new Date().toLocaleString() + '] ' + msg;
    console.log(line);
    try {
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: line }),
            keepalive: true
        }).catch(() => {});
    } catch(e) {}
}

// ── Debugger（console 捕获 + 转发 chrlog）──
class Debugger {
    constructor() {
        this.buffer = [];
        this.max = 300;
        this.el = null;
        this.session = null;
        this._queue = [];
        this._flushTimer = null;
        this._patch();
        this._initSession();
        this._patchGlobalErrors();
    }
    _initSession() {
        const d = new Date();
        const p = n => (n < 10 ? '0' : '') + n;
        this.session = '' + (d.getFullYear() % 100) + p(d.getMonth()+1) + p(d.getDate()) + '_' +
            p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
    }
    _patch() {
        const d = this;
        const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
        console.log = function(...a) { d._capture('LOG', ...a); orig.log.apply(console, a); };
        console.warn = function(...a) { d._capture('WARN', ...a); orig.warn.apply(console, a); };
        console.error = function(...a) { d._capture('ERROR', ...a); orig.error.apply(console, a); };
        console.info = function(...a) { d._capture('INFO', ...a); orig.info.apply(console, a); };
    }
    _patchGlobalErrors() {
        const d = this;
        window.addEventListener('error', function(e) {
            d._capture('ERROR', 'UNCAUGHT: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
        });
        window.addEventListener('unhandledrejection', function(e) {
            let r = e.reason;
            d._capture('ERROR', 'UNHANDLED_PROMISE: ' + (r && (r.stack || r.message) || String(r)));
        });
    }
    _capture(lvl, ...args) {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        const entry = { time: new Date(), level: lvl, message: msg };
        this.buffer.push(entry);
        if (this.buffer.length > this.max) this.buffer.shift();
        this._render(entry);
        this._forward(entry);
    }
    _forward(entry) {
        if (!this.session) return;
        this._queue.push('[' + entry.time.toLocaleString() + '] [' + entry.level + '] ' + entry.message);
        if (this._flushTimer) return;
        const d = this;
        this._flushTimer = setTimeout(() => {
            d._flushTimer = null;
            const batch = d._queue.splice(0, d._queue.length);
            if (!batch.length) return;
            try {
                fetch('/api/chrlog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session: d.session, entry: batch.join('\n') }),
                    keepalive: true
                }).catch(() => {});
            } catch(e) {}
        }, 800);
    }
    _render(entry) {
        if (!this.el) return;
        const t = entry.time.toLocaleTimeString();
        const d = document.createElement('div');
        d.className = 'd-' + entry.level;
        d.textContent = '[' + t + '] [' + entry.level + '] ' + entry.message;
        this.el.appendChild(d);
        this.el.scrollTop = this.el.scrollHeight;
    }
    attach(el) { this.el = el; }
}

// ── 消息 ──
function showMsg(msg, important) {
    const el = document.getElementById('msg');
    el.style.display = msg ? 'block' : 'none';
    // 支持 HTML（和牌/流局计分表格）
    el.innerHTML = msg || '';
    if (important && msg) { clearTimeout(showMsg._t); showMsg._t = setTimeout(() => { if (el.innerHTML === msg) el.style.display = 'none'; }, 10000); }
}

// ── 整场结束（大七星直接获胜 / 出岭 / 终局）→ 等待 5 秒后回到门户 ──
// engine 只调用本函数，不直接依赖 DOM / 跳转（保持逻辑与界面解耦）。
// 演示模式（?auto=1，game._demoMode）不跳转，避免自动演示被打断。
function onMatchOver(reason) {
    if (!game || game._demoMode) return;
    const SEC = 5;
    const el = document.getElementById('msg');
    if (el) {
        el.style.display = 'block';
        el.innerHTML = (el.innerHTML || '') +
            '<div style="font-size:14px;margin-top:8px">' +
            '（' + (reason || '整场结束') + '）<b id="matchOverLeft">' + SEC + '</b> 秒后返回门户…</div>';
    }
    let left = SEC;
    clearInterval(window._matchOverTimer);
    window._matchOverTimer = setInterval(() => {
        left--;
        const c = document.getElementById('matchOverLeft');
        if (c) c.textContent = left;
        if (left <= 0) {
            clearInterval(window._matchOverTimer);
            window._matchOverTimer = null;
            location.href = 'portal.html';
        }
    }, 1000);
}

// 开局显示一次各家 UUID：对"其他人类"隐去中间段(A-****-****-D)；AI 对玩家不隐藏
function showPlayerUUIDs(playerUUID) {
    const rows = game.players.map(p => {
        const display = (p.isHuman)
            ? p.uuid                            // 自己/本人类：完整
            : (typeof maskUUID === 'function' ? maskUUID(p.uuid) : p.uuid); // AI/其他家：掩码
        return '<tr><td>' + seatLabel(p) + '</td><td style="font-family:Consolas,monospace">' + display + '</td></tr>';
    }).join('');
    showMsg('<div style="text-align:center;margin-bottom:6px"><b>🆔 对局玩家</b></div>' +
        '<table style="border-collapse:collapse;margin:0 auto">' +
        '<tr style="border-bottom:1px solid #888"><th>玩家</th><th>UUID</th></tr>' + rows + '</table>', true);
}

// ── 模式启动 ──
function startMode(target, isTest) {
    if (window._matchOverTimer) { clearInterval(window._matchOverTimer); window._matchOverTimer = null; }
    game.setMode(target);
    game.handNumber++;
    game.startNewRound();
    if (isTest) {
        gameLog('测试模式开始: ' + target + '局');
    } else {
        gameLog('选择模式: ' + (target === 1 ? '一局' : target === 4 ? '东风场' : target === 8 ? '南风场' : '全庄'));
    }
}

// 可选役(5.7)开关
function toggleOptional(id, on) {
    if (on) game.checker.optionalEnabled.add(id);
    else game.checker.optionalEnabled.delete(id);
    gameLog('可选役 ' + id + (on ? ' 启用' : ' 禁用'));
}

// ── UI 渲染 ──
function renderSeat(pi, pos) {
    const p = game.players[pi];
    const el = document.getElementById('seat' + pos.charAt(0).toUpperCase() + pos.slice(1));
    if (!el) return;
    const isTurn = game.turnIndex === pi && game.state !== 'idle' && game.state !== 'ended';
    const reveal = game.revealHands; // 和牌/流局后明牌

    let html = '<div class="pname">';
    html += '<span class="seat-badge">' + ({east:'东',south:'南',west:'西',north:'北'}[p.seatWind] || p.seatWind) + '</span>';
    html += p.name;
    if (p.isDealer) html += '<span class="dealer-badge">庄</span>';
    if (isTurn) html += '<span class="turn-mark">◀</span>';
    html += '</div>';

    // 副露区（各家左侧独立位置）
    if (p.melds.length > 0) {
        const mtype = {chi:'吃',pon:'碰',minkan:'杠',ankan:'暗杠',kakan:'加杠'};
        html += '<div class="meld-area">';
        for (let m of p.melds) {
            html += '<div class="meld-group"><span class="mtype">' + (mtype[m.type]||m.type) + '</span>';
            for (let t of m.tiles) {
                html += '<div class="tile tiny" style="background-image:url(\'' + tileSvg(t) + '\')"></div>';
            }
            html += '</div>';
        }
        html += '</div>';
    }

    // 行动区：玩家手牌上方（其上是长考倒计时，其下一行按钮）
    if (p.isHuman) {
        html += '<div class="seat-actions" id="seatActions"></div>';
    }

    // 手牌区（按座次旋转；上座保持横排）
    const rotateCls = pos === 'left' ? ' rotate-left' : pos === 'right' ? ' rotate-right' : '';
    const nowrap = (pos === 'left' || pos === 'right') ? ' nowrap' : ' wrap';
    html += '<div class="hand-area' + rotateCls + '"><div class="ptiles' + nowrap + '">';
    if (p.isHuman) {
        p.hand.forEach((t, i) => {
            html += '<div class="tile clickable" data-pi="' + pi + '" data-idx="' + i + '" data-id="' + t.id + '" style="background-image:url(\'' + tileSvg(t) + '\')"></div>';
        });
    } else if (reveal) {
        // 明牌：显示真实牌面（小型）
        for (let i = 0; i < p.hand.length; i++) {
            const cls = pos === 'bottom' ? ' small' : (pos === 'left' || pos === 'right' ? ' side' : ' small');
            html += '<div class="tile' + cls + '" style="background-image:url(\'' + tileSvg(p.hand[i]) + '\')"></div>';
        }
    } else {
        for (let i = 0; i < p.hand.length; i++) {
            const cls = pos === 'bottom' ? '' : (pos === 'left' || pos === 'right' ? ' side' : ' small');
            html += '<div class="tile hidden' + cls + '"></div>';
        }
    }
    html += '</div></div>';

    el.innerHTML = html;
}

// 中央统一弃牌河：按全桌出牌顺序逐张追加，7 张/行换行（四家不分割）
function renderCenterRiver() {
    const el = document.getElementById('centerRiver');
    if (!el) return;
    const entries = (game.roundDiscards || []);
    let html = '';
    entries.forEach((e, i) => {
        const t = e.tile;
        const isLast = game.lastDiscarded && game.lastDiscarded.id === t.id && i === entries.length - 1;
        html += '<div class="tile tiny' + (isLast ? ' last-discard' : '') + '" data-id="' + t.id + '" style="background-image:url(\'' + tileSvg(t) + '\')"></div>';
    });
    el.innerHTML = html || '<span style="color:#8ab87a;font-size:13px">（尚无弃牌）</span>';
    el.scrollTop = el.scrollHeight;
}

function updateDiceLines(dealerInfo) {
    const dl = document.getElementById('diceDealerLine');
    const cl = document.getElementById('diceCutLine');
    const wn = ['东','南','西','北'];
    if (game.diceDealer) {
        const d = game.diceDealer;
        const sum = d[0] + d[1];
        const dir = dealerInfo ? dealerInfo.dir : (sum === 7 ? '自数' : (sum < 7 ? '顺时针' : '逆时针'));
        dl.style.display = 'block';
        dl.textContent = '🎲 定庄: ' + d[0] + '+' + d[1] + '=' + sum + ' (' + dir + ') → ' + wn[game.dealerIndex] + '家坐庄';
    } else {
        dl.style.display = 'none';
    }
    if (game.diceCut && game.cutInfo) {
        const d = game.diceCut;
        const sum = d[0] + d[1];
        const c = game.cutInfo;
        cl.style.display = 'block';
        cl.textContent = '🎲 配牌: ' + d[0] + '+' + d[1] + '=' + sum + ' 数至' + wn[c.side] + '家牌墙 · 跳墩' + c.stack + '墩(' + c.skipTiles + '张 = 岭上' + c.maCount + ' + 王堆' + c.wangCount + ') · 活牌山' + (136 - c.skipTiles) + '张';
    } else {
        cl.style.display = 'none';
    }
}

// 主视角行动区：其上是长考倒计时，其下一行按钮（荣和/吃/碰/杠/过 / 和牌!/杠/流局）
function renderActionArea() {
    const el = document.getElementById('seatActions');
    if (!el) return; // 全 AI 时无玩家座位
    const g = game;
    const human = g.humanIdx;
    const p = g.players[human];

    // ── 倒计时行（行动窗口时显示）──
    let timerHtml = '';
    if (g._actOpts) {
        timerHtml = '<div class="seat-timer">⏱ <strong>' + (g._actLeft != null ? g._actLeft : 0) + '</strong>s · ' +
            (g._actMsg || '') + '</div>';
    } else {
        timerHtml = '<div class="seat-timer"></div>';
    }

    // ── 按钮行 ──
    let row = '';
    if (g._actOpts) {
        // 行动窗口：荣和 / 吃(可多个) / 碰 / 杠 / 过
        const opts = g._actOpts;
        if (opts.ron) {
            row += '<button class="btn btn-win" onclick="game.humanRon()">🎯 荣和</button>';
        }
        if (opts.chi) {
            const chiList = opts.chiList || [];
            if (chiList.length <= 1) {
                row += '<button class="btn btn-secondary" onclick="game.humanChi(0)">吃</button>';
            } else {
                chiList.forEach((o, i) => {
                    row += '<button class="btn btn-secondary" onclick="game.humanChi(' + i + ')">吃 ' +
                        o.trio.map(t=>t.num).join('') + o.trio[0].suit + '</button>';
                });
            }
        }
        if (opts.pon) row += '<button class="btn btn-primary" onclick="game.humanPon()">碰</button>';
        if (opts.kan) row += '<button class="btn btn-win" onclick="game.humanKan()">杠</button>';
        if (opts.ron || opts.kan || opts.pon || opts.chi) {
            row += '<button class="btn btn-secondary" onclick="game.passAction()">过</button>';
        }
    } else if (g.state === 'human_discard') {
        // 自己的出牌阶段：和牌! / 杠 / 流局 / 提示
        const total = p.totalTiles();
        if (total === 14 + p.kongCount()) {
            const canWin = g.checker.checkWin(p.hand.slice(), true,
                p.melds.length > 0 || p.minkanCount > 0, p.ankanCount, p.minkanCount,
                p.melds, p.kans, p.firstTurn, p.discards, p._lastDraw,
                g.buildWinCtx(p, p._lastDraw, true)).success;
            if (canWin) row += '<button class="btn btn-win" onclick="game.humanTsumo()">🏆 和牌!</button>';
        }
        if (g.canAnkan(p) || g.canKakan(p)) {
            row += '<button class="btn btn-primary" onclick="game.humanKanSelf()">杠</button>';
        }
        // 统一「流局」按钮（4.3 推牌流局）：九种九牌 / 十三不靠
        const flowOpts = g.flowOptions(p.hand);
        if (flowOpts.length > 0) {
            row += '<button class="btn btn-primary" onclick="game.humanFlow()">流局(' +
                flowOpts.join(' / ') + ')</button>';
        }
        if (!row) row = '<span class="info" style="font-size:13px">点击手牌出牌</span>';
    }
    el.innerHTML = timerHtml + '<div class="seat-btn-row">' + row + '</div>';
}

// 左上角：岭上(马) 牌面（默认暗牌；showMa 或和牌后亮出）
function renderTopLeftMa() {
    const el = document.getElementById('tliMa');
    if (!el) return;
    const showMa = (game.settings && game.settings.showMa) || game.revealHands;
    let html = '';
    if (game.rinshan && game.rinshan.length) {
        for (let i = 0; i < game.rinshan.length; i++) {
            const t = game.rinshan[i];
            if (showMa) {
                html += '<div class="wv-tile' + (i === 0 ? ' yellow-mark' : ' blue-mark') + '" style="background-image:url(\'' + tileSvg(t) + '\')"></div>';
            } else {
                html += '<div class="wv-tile face-down"></div>';
            }
        }
    }
    el.innerHTML = html ? ('岭上(马): ' + html) : '';
}

function renderAll() {
    document.getElementById('wallCount').textContent = game.wall.length;
    document.getElementById('rinshanCount').textContent = game.rinshan.length;

    const rdEl = document.getElementById('roundDisplay');
    rdEl.textContent = game.roundLabel() + ' / ' + game.modeTarget + '局';
    document.getElementById('honbaDisplay').textContent = game.honba > 0 ? ('· ' + game.honba + '本场') : '';

    // 左上角：四家分数 4 行 × 2 列（东/南/西/北 + 分数）
    const tl = document.getElementById('tlScores');
    if (tl) {
        const wn = {east:'东',south:'南',west:'西',north:'北'};
        tl.innerHTML = game.players.map((p, i) =>
            '<span class="s-name">' + (wn[p.seatWind]||p.seatWind) + ' ' + p.name + '</span>' +
            '<span class="s-val">' + (game.scores[i] >= 0 ? '+' : '') + game.scores[i] + '</span>'
        ).join('');
    }

    renderSeat(0, 'bottom');
    renderSeat(1, 'right');
    renderSeat(2, 'top');
    renderSeat(3, 'left');
    renderActionArea();
    renderCenterRiver();
    renderTopLeftMa();
    updateAnalysis();
    updateDiceLines();
    // 牌山查看器仅调试选项开启时显示
    const wv = document.getElementById('wallViewer');
    if (wv) wv.style.display = (game.settings && game.settings.showWallViewer) ? '' : 'none';
    if (game.settings && game.settings.showWallViewer) renderWallViewer();
}

let wvTab = 'wall';
function showWallTab(tab) {
    wvTab = tab;
    document.getElementById('wvTabWall').className = 'wv-tab' + (tab === 'wall' ? ' active' : '');
    document.getElementById('wvTabRinshan').className = 'wv-tab' + (tab === 'rinshan' ? ' active' : '');
    renderWallViewer();
}

function renderWallViewer() {
    const body = document.getElementById('wvBody');
    if (!body) return;
    let html = '';
    if (wvTab === 'wall') {
        const remaining = game.wall.slice().reverse();
        const n = Math.min(remaining.length, 200);
        for (let i = 0; i < n; i++) {
            html += '<div class="wv-tile" style="background-image:url(\'' + tileSvg(remaining[i]) + '\')"></div>';
        }
        html += n === 0 ? '<span style="color:#ff9">牌山已空</span>' : '';
    } else {
        const showMa = (game.settings && game.settings.showMa) || game.revealHands;
        for (let i = 0; i < game.rinshan.length; i++) {
            const t = game.rinshan[i];
            if (showMa) {
                html += '<div class="wv-tile' + (i === 0 ? ' yellow-mark' : ' blue-mark') + '" style="background-image:url(\'' + tileSvg(t) + '\')"></div>';
            } else {
                html += '<div class="wv-tile face-down" data-id="' + t.id + '"></div>';
            }
        }
        html += game.rinshan.length === 0 ? '<span style="color:#ff9">王牌堆已空</span>' : '';
        if (showMa) {
            html += '<span style="color:#b8d8a0;margin-left:10px;font-size:13px">左起第1张为赋马牌(黄)，其余为王牌堆(蓝)</span>';
        } else {
            html += '<span style="color:#b8d8a0;margin-left:10px;font-size:13px">马牌默认暗牌 · 和牌后 / 设置中开启"显示马牌"时可见</span>';
        }
    }
    body.innerHTML = html;
}

function updateAnalysis() {
    const human = game.humanIdx;
    const p = game.players[human];
    const el = document.getElementById('handAnalysis');
    if (p && p.hand && p.hand.length > 0 && typeof analyzeHand === 'function') {
        const a = analyzeHand(p.hand);
        el.textContent = a ? a.description : '分析失败';
    } else {
        el.textContent = '等待摸牌…';
    }
}

// ── 计分自测：?scoretest=1 ──
function runScoreTest() {
    const out = [];
    const cases = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28];
    for (const fu of cases) {
        const sub = game.calcPoints(fu);
        const dealer = sub * 1.5;
        out.push(fu + '赋: 子' + sub + ' 庄' + dealer + ' 庄/3=' + (dealer/3) + ' 整除=' + (dealer%3===0));
    }
    const hand7 = [
        {suit:'m',num:1,id:'m1'},{suit:'m',num:2,id:'m2'},{suit:'m',num:3,id:'m3'},
        {suit:'m',num:2,id:'m2'},{suit:'m',num:3,id:'m3'},{suit:'m',num:4,id:'m4'},
        {suit:'m',num:3,id:'m3'},{suit:'m',num:4,id:'m4'},{suit:'m',num:5,id:'m5'},
        {suit:'m',num:4,id:'m4'},{suit:'m',num:5,id:'m5'},{suit:'m',num:6,id:'m6'},
        {suit:'p',num:5,id:'p5'},{suit:'p',num:5,id:'p5'}
    ];
    const r = game.checker.checkWin(hand7, true, false, 0, 0, [], [], false, false, [], {suit:'p',num:5,id:'p5'}, false);
    const names = (r.activeYaku||[]).map(y=>y.name);
    out.push('7赋手牌: success=' + r.success + ' totalFu=' + r.totalFu + ' points=' + game.calcPoints(r.totalFu) + ' 卡七加成=' + (names.filter(n=>n==='卡七自摸加成').length));
    out.push('子家自摸7000分摊: each=' + game.splitPayment(7000).each + ' rem=' + game.splitPayment(7000).remainder + ' 总和=' + (game.splitPayment(7000).each*3+game.splitPayment(7000).remainder));
    out.push('庄家7000(10500)分摊: each=' + game.splitPayment(10500).each + ' rem=' + game.splitPayment(10500).remainder);
    const allHonor = [
        {suit:'z',num:'1',id:'z1'},{suit:'z',num:'1',id:'z1'},{suit:'z',num:'2',id:'z2'},{suit:'z',num:'2',id:'z2'},
        {suit:'z',num:'3',id:'z3'},{suit:'z',num:'3',id:'z3'},{suit:'z',num:'4',id:'z4'},{suit:'z',num:'4',id:'z4'},
        {suit:'z',num:'5',id:'z5'},{suit:'z',num:'5',id:'z5'},{suit:'z',num:'6',id:'z6'},{suit:'z',num:'6',id:'z6'},
        {suit:'z',num:'7',id:'z7'},{suit:'z',num:'7',id:'z7'}
    ];
    const fn = game.checker.conditionFn('missing_seven');
    out.push('全字手牌缺七=' + fn(allHonor, null) + ' (应为false)');
    out.push('全字手牌卡七=' + game.checker.conditionFn('kachi_7')(allHonor, null) + ' (应为false)');
    document.getElementById('debugLog').textContent = out.join('\n');
    console.log('SCORETEST:' + out.join(' | '));
}

// ══════════════════════════════════════════════════════════════
// 初始化
// 用 window 'load'（而非 DOMContentLoaded）：确保所有 <script src> 都已执行完毕，
// 避免在极快/虚拟时钟场景下拿到尚未就绪的 WinChecker / TiisuMahjong。
// ══════════════════════════════════════════════════════════════
// 依赖兜底：若某个 <script src> 偶发加载失败，动态补加载一次后重试。
// 用 thunk + 动态 <script> 的 onload 等待真实网络；不用 setTimeout（虚拟时钟下不可靠）。
async function ensureDeps() {
    const deps = [
        ['tiles.js',        () => typeof createDeck !== 'undefined' && typeof parseTileString !== 'undefined' && typeof tileSvg !== 'undefined'],
        ['uuid.js',         () => typeof getPlayerUUID !== 'undefined' && typeof generateAIUUID !== 'undefined' && typeof maskUUID !== 'undefined'],
        ['notation.js',     () => typeof handToStr !== 'undefined' && typeof meldsToStr !== 'undefined' && typeof seatLabel !== 'undefined'],
        ['tenpai.js',       () => typeof listTenpai !== 'undefined'],
        ['aiPlayer.js',     () => typeof getAIDiscardIndex !== 'undefined'],
        ['winchecker.js',   () => typeof WinChecker !== 'undefined'],
        ['engine.js',       () => typeof TiisuMahjong !== 'undefined'],
        ['handAnalyzer.js', () => typeof analyzeHand !== 'undefined']
    ];
    for (const [file, ready] of deps) {
        if (ready()) continue;
        console.warn('[boot] 补加载 ' + file);
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'src/' + file + '?reboot=' + Date.now();
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
        });
    }
}

window.addEventListener('load', async () => {
    if (typeof WinChecker === 'undefined' || typeof TiisuMahjong === 'undefined') {
        console.warn('[boot] 依赖缺失，尝试补加载：WinChecker=' + (typeof WinChecker) + ' TiisuMahjong=' + (typeof TiisuMahjong));
        await ensureDeps();
    }
    if (typeof WinChecker === 'undefined' || typeof TiisuMahjong === 'undefined') {
        console.error('[boot] 依赖仍缺失，放弃启动：WinChecker=' + (typeof WinChecker) + ' TiisuMahjong=' + (typeof TiisuMahjong));
        return;
    }

    // 装配：加载 ike.json → 注入 WinChecker → 注入引擎
    let config;
    try { config = await (await fetch('ike.json')).json(); } catch(e) { config = await (await fetch('./ike.json')).json(); }
    const checker = new WinChecker(null, config);
    const playerUUID = getPlayerUUID();
    game = new TiisuMahjong();
    window.__game = game;
    __SESSION__ = (() => {
        const d = new Date(), p = n => (n < 10 ? '0' : '') + n;
        return '' + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '_' +
            p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
    })();
    // 加载设置（/api/settings）与会话存档（/api/state）
    let settings = {};
    let saved = null;
    try { settings = await (await fetch('/api/settings')).json(); } catch(e) { settings = {}; }
    try { saved = await (await fetch('/api/state')).json(); } catch(e) { saved = null; }

    game.init(config, checker, playerUUID, settings);
    game.applySettings(settings);

    const dbg = new Debugger();
    dbg.attach(document.getElementById('debugLog'));
    gameLog('游戏启动 · 四人模式 · 玩家UUID=' + playerUUID + ' · 长考' + (settings.thinkSeconds||30) + 's');
    document.getElementById('thinkDisplay').textContent = settings.thinkSeconds || 30;
    if (settings.recordTiles) {
        document.getElementById('recordTilesChk').checked = true;
        game.recordTiles = true; // 修复：设置中的"记录牌型"此前只勾了界面未真正生效
    }
    // 调试日志默认隐藏，仅设置开启"显示调试面板"时显示
    document.getElementById('debugLog').style.display = settings.showDebug ? '' : 'none';
    renderAll();

    // ── 会话恢复：有进行中存档且 UUID 匹配 → 确认后从下一局继续 ──
    async function maybeResume() {
        if (!saved || !saved.inProgress) { startFresh(); return; }
        if (saved.playerUUID && playerUUID && saved.playerUUID !== playerUUID) { startFresh(); return; }
        // 演示/自测模式跳过恢复弹窗（避免阻塞无头运行）
        const q0 = new URLSearchParams(location.search);
        if (q0.get('auto') || q0.get('scoretest')) { startFresh(); return; }
        const ok = confirm('检测到未完成对局（' + (saved.handNumber||0) + ' 局后）\n是否继续？\n\n确定=恢复存档继续\n取消=重新开始');
        if (ok && game.applySavedState(saved)) {
            game.handNumber++;
            game.startNewRound();
            gameLog('已恢复存档继续');
        } else {
            startFresh();
        }
    }
    function startFresh() {
        if (NO_START) { renderAll(); return; }   // 测试页挂载：不开局、不写 state.json
        // 清除陈旧存档（避免下次加载误弹恢复提示）
        try { fetch('/api/state', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ inProgress:false }) }).catch(()=>{}); } catch(e) {}
        showPlayerUUIDs(playerUUID);
        const q = new URLSearchParams(location.search);
        if (q.get('scoretest')) { runScoreTest(); }
        else if (q.get('auto')) {
            LAUNCH = { mode: parseInt(q.get('mode') || 4), test: false };
            game.players.forEach(p => p.isHuman = false);
            game.speed = 60;
            game._demoMode = true;
            game._allAI = true;
            game.handNumber++;
            document.getElementById('autoBtn').textContent = '停止全自动';
            game.setMode(LAUNCH.mode);
            game.startNewRound();
        } else {
            startMode(LAUNCH.mode, LAUNCH.test);
        }
    }

    // 点击手牌 → 直接出牌
    document.getElementById('table').addEventListener('click', function(e) {
        const t = e.target.closest('.tile.clickable');
        if (!t) return;
        const pi = parseInt(t.dataset.pi);
        const idx = parseInt(t.dataset.idx);
        if (pi !== game.humanIdx) return;
        if (game.state !== 'human_discard') return;
        game.humanDiscard(idx);
    });

    // 河牌高亮：悬停手牌 → 给同名牌加覆盖层
    const tableEl = document.getElementById('table');
    function clearRiverHighlights() {
        document.querySelectorAll('.pdiscards .tile.hl').forEach(x => x.classList.remove('hl'));
    }
    tableEl.addEventListener('mouseover', function(e) {
        const t = e.target.closest('.tile.clickable');
        if (!t) return;
        const id = t.dataset.id;
        if (!id) return;
        clearRiverHighlights();
        document.querySelectorAll('.pdiscards .tile').forEach(r => {
            if (r.dataset.id === id) r.classList.add('hl');
        });
    });
    tableEl.addEventListener('mouseout', function(e) {
        const t = e.target.closest('.tile.clickable');
        if (t && !tableEl.contains(e.relatedTarget)) clearRiverHighlights();
    });

    document.getElementById('nextRoundBtn').addEventListener('click', () => {
        game.executeCommand({ action: 'next' });
    });

    document.getElementById('autoBtn').addEventListener('click', () => {
        game.executeCommand({ action: 'auto', speed: parseInt(document.getElementById('speedSel').value) || 250 });
        document.getElementById('autoBtn').textContent = game._allAI ? '停止全自动' : '全自动';
    });

    // ── 重置：10 秒倒计时确认 ──
    let resetCountdown = null;
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', () => {
        if (resetCountdown) { clearInterval(resetCountdown); resetCountdown = null; resetBtn.textContent = '重置'; return; }
        let left = 10;
        resetBtn.textContent = '重置(' + left + ')';
        resetBtn.classList.add('btn-danger');
        resetCountdown = setInterval(() => {
            left--;
            resetBtn.textContent = '重置(' + left + ')';
            if (left <= 0) {
                clearInterval(resetCountdown); resetCountdown = null;
                resetBtn.textContent = '重置';
                game.resetAll();
                document.getElementById('autoBtn').textContent = '全自动';
                showMsg('已重置');
                renderAll();
                startFresh();
            }
        }, 1000);
    });

    document.getElementById('speedSel').addEventListener('change', (e) => {
        game.speed = parseInt(e.target.value) || 250;
    });

    // ── 轮询 debug.html 写入的命令（state.game_cmd）──
    async function pollCommands() {
        try {
            const st = await (await fetch('/api/state')).json();
            if (st && st.game_cmd && typeof st.game_cmd === 'object') {
                const res = game.executeCommand(st.game_cmd);
                gameLog('[cmd] ' + (st.game_cmd.action || '?') + ' → ' + res);
                document.getElementById('autoBtn').textContent = game._allAI ? '停止全自动' : '全自动';
                if (typeof renderAll === 'function') renderAll();
                // 清除已执行命令
                await fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.assign({}, st, { game_cmd: null }))
                }).catch(() => {});
            }
        } catch(e) {}
    }
    if (!NO_START) setInterval(pollCommands, 1000);

    // ── 键盘快捷键（N=下一局 A=全自动 R=重置 F=流局）──
    document.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        const k = e.key.toLowerCase();
        if (k === 'n') { game.executeCommand({ action: 'next' }); }
        else if (k === 'a') {
            game.executeCommand({ action: 'auto', speed: game.speed || 250 });
            document.getElementById('autoBtn').textContent = game._allAI ? '停止全自动' : '全自动';
        }
        else if (k === 'r') { resetBtn.click(); }
        else if (k === 'f') { game.humanFlow(); }
    });

    if (NO_START) renderAll(); else maybeResume();
});

// ══════════════════════════════════════════════════════════════
// UI 版本切换（classic / modern）
//   两套皮肤共用本文件与同一份 DOM + 同一份 css/game.css（全部结构规则都在里面）。
//   ⚠ 绝不可 disable css/game.css —— 它含有 .table/座位/牌面的尺寸与定位，
//   关掉会让整张桌子塌成一行行文字。现代皮肤是"覆盖层"，全部规则被
//   css/theme-modern.css 收在 html[data-ui="modern"] 之下，classic 下自然不生效。
//   所以切换只改 data-ui 属性，【不跳转页面、不丢对局状态】。
//   默认版本由页面上的 <html data-ui-default="..."> 决定（index=classic / new=modern），
//   一旦使用者在运行时切换过，就用 localStorage 记住其选择。
// ══════════════════════════════════════════════════════════════
(function () {
    const KEY = 'oc_ui_version';
    const VALID = ['classic', 'modern'];
    const root = document.documentElement;
    const pageDefault = VALID.indexOf(root.getAttribute('data-ui-default')) >= 0
        ? root.getAttribute('data-ui-default') : 'classic';

    function stored() {
        try { const v = localStorage.getItem(KEY); return VALID.indexOf(v) >= 0 ? v : null; }
        catch (e) { return null; }
    }
    // 当前生效版本：URL 参数 > 已记住的选择 > 页面默认
    function current() {
        try {
            const q = new URLSearchParams(location.search).get('ui');
            if (VALID.indexOf(q) >= 0) return q;
        } catch (e) {}
        return stored() || pageDefault;
    }
    function apply(v) {
        if (VALID.indexOf(v) < 0) v = 'classic';
        // 只改属性：现代皮肤的规则由 html[data-ui="modern"] 选择器接管。
        // 不要碰任何 <link> 的 disabled —— 见本段顶部警告。
        root.setAttribute('data-ui', v);
    }
    apply(current());

    function build() {
        const bar = document.querySelector('.runtime-bar');
        if (!bar || document.getElementById('uiVersionSel')) return;
        const wrap = document.createElement('span');
        wrap.className = 'ui-version-wrap';
        const lbl = document.createElement('span');
        lbl.className = 'dbg-label';
        lbl.textContent = '界面';
        const sel = document.createElement('select');
        sel.id = 'uiVersionSel';
        sel.title = '切换界面版本（不跳转、不丢对局）';
        [['classic', '经典'], ['modern', '现代（实验）']].forEach(function (p) {
            const o = document.createElement('option');
            o.value = p[0]; o.textContent = p[1];
            sel.appendChild(o);
        });
        sel.value = current();
        sel.addEventListener('change', function () {
            const v = sel.value;
            apply(v);
            try { localStorage.setItem(KEY, v); } catch (e) {}
            if (typeof gameLog === 'function') gameLog('界面版本切换为：' + v);
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        bar.appendChild(wrap);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else { build(); }

    // 供调试/自动化使用
    window.__uiVersion = {
        get: current,
        set: function (v) { apply(v); try { localStorage.setItem(KEY, v); } catch (e) {} },
        pageDefault: pageDefault
    };
})();
