// ══════════════════════════════════════════════════════════════
// host_adapter.js — WinForms + WebView2 外壳的 JS 适配器
//
// 作用：把 C# 的 Tiisu.Engine 通过 WebView2 host object 同步桥
//       （chrome.webview.hostObjects.sync.tiisu）包装成与 engine.js 的
//       TiisuMahjong 同名同参的类，供 js/game.js 原样使用。
//
// 只有当 URL 带 ?engine=csharp 且确实运行在 WebView2 宿主里时，本文件
// 才会把全局 TiisuMahjong 换成 TiisuMahjongHost；默认仍是 JS 引擎，
// 因此浏览器 / run_all.py 的冒烟与测试完全不受影响。
//
// 状态同步：宿主的每个修改型方法返回完整状态快照（JSON 字符串），
// 这里把它贴回镜像对象，使 game.js 的同步属性读（players[].hand 等）行为不变。
// ══════════════════════════════════════════════════════════════
(function () {
    'use strict';

    const HOST_NAME = 'tiisu';

    function getSyncHosts() {
        try {
            const webview = window.chrome && window.chrome.webview;
            return webview && webview.hostObjects ? webview.hostObjects.sync : null;
        } catch (e) {
            return null;
        }
    }

    function isCSharpHost() {
        return !!(getSyncHosts() && getSyncHosts()[HOST_NAME]);
    }

    // ══════════════════════════════════════════════════════════════
    // /api/* 的传输层
    //
    // WebView2 的 WebResourceRequested **不会**为 SetVirtualHostNameToFolderMapping
    // 映射的 URL 触发（微软文档明确写了这一点），所以页面上的 https://tiisu.local/api/*
    // 无法被宿主拦截。这里把同源 /api/* 的 fetch 改写到 tiisu-api.local，
    // 由宿主的 WebResourceRequested 过滤器（见 MainForm）转给 Tiisu.Api.DataStore。
    // 只改 origin，path/query/body 原样保留；页面代码（game.js）不需要改。
    // ══════════════════════════════════════════════════════════════
    const API_ORIGIN = 'https://tiisu-api.local';

    const csharpSelected = (function () {
        try {
            return new URLSearchParams(location.search).get('engine') === 'csharp' && isCSharpHost();
        } catch (e) {
            return false;
        }
    })();

    function installApiFetchShim() {
        if (window.__tiisuApiFetchShim || typeof window.fetch !== 'function') return;
        window.__tiisuApiFetchShim = true;

        const originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            try {
                const isRequest = typeof Request !== 'undefined' && input instanceof Request;
                const url = new URL(isRequest ? input.url : String(input), location.href);
                if (url.origin === location.origin && url.pathname.indexOf('/api/') === 0) {
                    const target = API_ORIGIN + url.pathname + url.search;
                    if (isRequest) return originalFetch(new Request(target, input));
                    return originalFetch(target, init);
                }
            } catch (e) {
                // 解析失败就走原生 fetch。
            }

            return originalFetch(input, init);
        };
    }

    if (csharpSelected) installApiFetchShim();

    function tileId(t) {
        if (!t) return null;
        if (typeof t === 'string') return t;
        return t.id || (t.suit + t.num);
    }

    function tileIds(tiles) {
        const out = [];
        if (!tiles) return out;
        for (let i = 0; i < tiles.length; i++) {
            const id = tileId(tiles[i]);
            if (id) out.push(id);
        }
        return out;
    }

    // 镜像里的 players 是纯对象；补上 game.js 会调用的两个统计方法。
    function decoratePlayer(p) {
        if (!p || p.__tiisuDecorated) return p;

        Object.defineProperty(p, 'totalTiles', {
            value: function () {
                let meldTiles = 0;
                for (let i = 0; i < this.melds.length; i++) meldTiles += this.melds[i].tiles.length;
                return this.hand.length + meldTiles;
            },
            enumerable: false,
            configurable: true
        });

        Object.defineProperty(p, 'kongCount', {
            value: function () {
                let k = 0;
                for (let i = 0; i < this.melds.length; i++) {
                    if (this.melds[i].tiles.length === 4) k++;
                }
                return k;
            },
            enumerable: false,
            configurable: true
        });

        Object.defineProperty(p, 'findPonMeld', {
            value: function (id) {
                for (let i = 0; i < this.melds.length; i++) {
                    const m = this.melds[i];
                    if (m.type === 'pon' && m.tiles[0] && m.tiles[0].id === id) return m;
                }
                return null;
            },
            enumerable: false,
            configurable: true
        });

        Object.defineProperty(p, '__tiisuDecorated', { value: true, enumerable: false });
        return p;
    }

    // ══════════════════════════════════════════════════════════════
    // 判役 / 听牌 / AI 的 JS 替身
    //
    // csharp 模式下 index.html 不加载 winchecker.js / tenpai.js / aiPlayer.js，
    // 由这里提供同名全局：WinChecker / listTenpai / getAIDiscardIndex。
    // 判役、听牌、AI 决策全部经同步 host object 走 C#；JS 只做参数/结果编解码。
    // ══════════════════════════════════════════════════════════════

    function callHost(method, args) {
        const hosts = getSyncHosts();
        const host = hosts && hosts[HOST_NAME];
        if (!host) {
            throw new Error('[host_adapter] 缺少 host object（' + method + '）');
        }

        const fn = host[method];
        if (typeof fn !== 'function') {
            throw new Error('[host_adapter] 宿主缺少方法: ' + method);
        }

        switch (args.length) {
            case 0: return host[method]();
            case 1: return host[method](args[0]);
            case 2: return host[method](args[0], args[1]);
            case 3: return host[method](args[0], args[1], args[2]);
            case 11:
                return host[method](args[0], args[1], args[2], args[3], args[4], args[5],
                    args[6], args[7], args[8], args[9], args[10]);
            default: return fn.apply(host, args);
        }
    }

    class HostOptionalSet extends Set {
        add(id) {
            const value = String(id);
            if (!this.has(value)) {
                super.add(value);
                callHost('OptionalEnabledAdd', [value]);
            }
            return this;
        }

        delete(id) {
            const value = String(id);
            const had = this.has(value);
            if (had) {
                super.delete(value);
                callHost('OptionalEnabledRemove', [value]);
            }
            return had;
        }

        // 从 C# 当前集合整体覆盖；用 super.add 避免回写 host。
        syncFrom(list) {
            super.clear();
            for (let i = 0; i < (list || []).length; i++) {
                super.add(String(list[i]));
            }
        }
    }

    const optionalEnabled = new HostOptionalSet();

    class WinCheckerHost {
        constructor(config, yakuData) {
            this.config = config;
            this.yakuData = yakuData || {};
            this.baseFu = (this.yakuData && this.yakuData.baseFu) || 7;
            this.optionalEnabled = optionalEnabled;
            this.maxSplit = true;
        }

        getYakuFu(id) {
            const data = this.yakuData || {};
            const lists = [data.yaku || [], data.highYaku || []];
            for (let i = 0; i < lists.length; i++) {
                for (let j = 0; j < lists[i].length; j++) {
                    if (lists[i][j].id === id) return lists[i][j].fu;
                }
            }
            return 0;
        }

        // 与 winchecker.js 同参：全部判役走 C#（结果形状见 EngineHost.ResultNode）。
        checkWin(hand, selfDraw, hasCalled, ankanCount, minkanCount, melds, kans, firstTurn, discards, winTile, winCtx) {
            const result = callHost('CheckerCheckWin', [
                JSON.stringify(tileIds(hand || [])),
                !!selfDraw,
                !!hasCalled,
                ankanCount | 0,
                minkanCount | 0,
                JSON.stringify((melds || []).map(function (m) {
                    return { type: m.type, tiles: tileIds(m.tiles) };
                })),
                JSON.stringify(tileIds(kans || [])),
                !!firstTurn,
                JSON.stringify(tileIds(discards || [])),
                JSON.stringify(winTile ? tileId(winTile) : null),
                JSON.stringify((winCtx && typeof winCtx === 'object') ? winCtx : null)
            ]);
            return JSON.parse(result);
        }

        // 返回与 JS 相同形状的函数：fn(hand, groups) -> bool。
        conditionFn(id) {
            return function (hand, groups) {
                return !!callHost('CheckerConditionFn', [
                    String(id),
                    JSON.stringify(tileIds(hand || [])),
                    JSON.stringify(groups || null)
                ]);
            };
        }
    }

    function listTenpaiHost(checker, hand, melds, opts) {
        const options = (opts && typeof opts === 'object') ? opts : {};
        const result = callHost('ListTenpai', [
            JSON.stringify(tileIds(hand || [])),
            JSON.stringify((melds || []).map(function (m) {
                return { type: m.type, tiles: tileIds(m.tiles) };
            })),
            JSON.stringify(options)
        ]);
        return JSON.parse(result);
    }

    function getAIDiscardIndexHost(hand, game) {
        // game 参数在 JS 算法里只作上下文；C# 的 ChooseDiscardIndex 只要手牌 + 一次随机值。
        return callHost('GetAIDiscardIndex', [
            JSON.stringify(tileIds(hand || [])),
            Math.random()
        ]);
    }

    class TiisuMahjongHost {
        constructor() {
            const hosts = getSyncHosts();
            if (!hosts || !hosts[HOST_NAME]) {
                throw new Error('[host_adapter] 需要 WebView2 host object（window.chrome.webview.hostObjects.sync.tiisu）');
            }

            this.__isHost = true;
            this._host = hosts[HOST_NAME];
            this._initialized = false;

            // ── 与 engine.js 构造函数同形状的初值（init 之前 renderAll 也不会炸）──
            this.wall = [];
            this.rinshan = [];
            this.wangDui = [];
            this.players = [];
            this.turnIndex = 0;
            this.dealerIndex = 0;
            this.roundWind = 'east';
            this.honba = 0;
            this.state = 'idle';
            this.roundDiscards = [];
            this.currentDrawn = null;
            this.config = null;
            this.speed = 250;
            this.scores = [0, 0, 0, 0];
            this._demoMode = false;
            this._allAI = false;
            this.lastDiscarded = null;
            this.pendingRon = null;
            this.pendingMeld = null;
            this.gameOver = false;
            this.handNumber = 0;
            this.diceDealer = null;
            this.diceCut = null;
            this.cutInfo = null;
            this.modeTarget = 1;
            this.handsPlayed = 0;
            this.roundWindIdx = 0;
            this.dealerCount = 0;
            this.recordTiles = false;
            this.revealHands = false;
            this.playerUUID = '';
            this.settings = { thinkSeconds: 30, optionalYaku: [], showMa: false, showDebug: false };
            this.lastRonMulti = [];
            this._kanThisTurn = false;
            this.matchOver = false;
            this.juFinished = false;
            this.initialPoints = 0;
            this.rankPoints = [0, 0, 0, 0];

            this._pendingNextRoundDelay = null;
            this._pumpTimer = null;
            this._nextTimer = null;
            this._actTicker = null;
            this._actLeft = 0;
            this._actMsg = '';
            this._actOpts = null;

            this._stalled = 0;
            this._lastFingerprint = '';

            this.checker = this._makeChecker();

            // 宿主在 AddHostObjectToScript 之前已构造好空引擎，这里可以先取一次快照。
            this._refresh(false);
        }

        // ══════════════════════════════════════════════════════════
        // 宿主调用 / 快照
        // ══════════════════════════════════════════════════════════

        _invoke(method, args) {
            const host = this._host;
            const fn = host[method];
            if (typeof fn !== 'function') {
                throw new Error('[host_adapter] 宿主缺少方法: ' + method);
            }

            switch (args.length) {
                case 0: return host[method]();
                case 1: return host[method](args[0]);
                case 2: return host[method](args[0], args[1]);
                case 3: return host[method](args[0], args[1], args[2]);
                default: return fn.apply(host, args);
            }
        }

        _refresh(render) {
            const raw = this._invoke('GetStateJson', []);
            this._apply(raw, render !== false);
        }

        _snapshot(method, args) {
            if (this._initialized) this._syncClient();
            const raw = this._invoke(method, args || []);
            this._apply(raw, true);
            return raw;
        }

        _syncClient() {
            const flags = [];
            const players = this.players || [];
            for (let i = 0; i < 4; i++) flags.push(!!(players[i] && players[i].isHuman));

            const payload = {
                handNumber: this.handNumber | 0,
                speed: this.speed | 0,
                recordTiles: !!this.recordTiles,
                demoMode: !!this._demoMode,
                allAI: !!this._allAI,
                isHuman: flags
            };

            this._invoke('SyncClientState', [JSON.stringify(payload)]);
        }

        _apply(raw, render) {
            let snap;
            try {
                snap = JSON.parse(raw);
            } catch (e) {
                throw new Error('[host_adapter] 状态快照解析失败: ' + e);
            }

            this.state = snap.state;
            this.turnIndex = snap.turnIndex;
            this.dealerIndex = snap.dealerIndex;
            this.roundWind = snap.roundWind;
            this.roundWindIdx = snap.roundWindIdx;
            this.honba = snap.honba;
            this.handNumber = snap.handNumber;
            this.handsPlayed = snap.handsPlayed;
            this.dealerCount = snap.dealerCount;
            this.modeTarget = snap.modeTarget;
            this.initialPoints = snap.initialPoints;
            this.finalWindIdx = snap.finalWindIdx;
            this.lastDiscarded = snap.lastDiscarded;
            this.currentDrawn = snap.currentDrawn;
            this.revealHands = snap.revealHands;
            this.gameOver = snap.gameOver;
            this.matchOver = snap.matchOver;
            this.juFinished = snap.juFinished;
            this._kanThisTurn = snap.kanThisTurn;
            this.speed = snap.speed;
            this.recordTiles = snap.recordTiles;
            this._demoMode = snap.demoMode;
            this._allAI = snap.allAI;
            this.settings = snap.settings || {};
            this.diceDealer = snap.diceDealer;
            this.diceCut = snap.diceCut;
            this.cutInfo = snap.cutInfo;
            this.scores = snap.scores;
            this.rankPoints = snap.rankPoints;
            this.wall = snap.wall;
            this.rinshan = snap.rinshan;
            this.wangDui = snap.wangDui;
            this.roundDiscards = snap.roundDiscards || [];
            this.lastRonMulti = snap.lastRonMulti || [];
            this.players = (snap.players || []).map(decoratePlayer);

            this.pendingRon = snap.pendingRon;
            this.pendingMeld = snap.pendingMeld;
            this._pendingNextRoundDelay = snap.pendingNextRoundDelay;

            this._syncAction(snap);

            if (render && typeof renderAll === 'function') renderAll();

            this._schedulePump();
            this._scheduleNextRound();
        }

        // ── 行动窗口（荣和 / 副露）倒计时 ──
        _syncAction(snap) {
            this._actMsg = snap.actMsg || '';
            if (snap.actOpts) {
                const firstOpen = !this._actOpts;
                this._actOpts = snap.actOpts;
                if (firstOpen) {
                    this._actLeft = (snap.actLeft | 0) || (this.settings && this.settings.thinkSeconds) || 30;
                    this._startActTicker();
                }
            } else if (this._actOpts) {
                this._actOpts = null;
                this._actLeft = 0;
                this._stopActTicker();
            }
        }

        _startActTicker() {
            if (this._actTicker) return;
            const self = this;
            this._actTicker = setInterval(function () {
                self._actLeft = Math.max(0, (self._actLeft | 0) - 1);
                if (typeof renderActionArea === 'function') renderActionArea();
                if (self._actLeft <= 0) {
                    self._stopActTicker();
                    self._actOpts = null;
                    try {
                        self.passAction();
                    } catch (e) {
                        console.error('[host_adapter] 行动超时自动「过」失败: ' + e);
                    }
                }
            }, 1000);
        }

        _stopActTicker() {
            if (this._actTicker) {
                clearInterval(this._actTicker);
                this._actTicker = null;
            }
        }

        // ── AI 逐拍推进（模拟 engine.js 的 setTimeout(aiTurn)）──
        _schedulePump() {
            if (this._pumpTimer || this.state !== 'ai_turn') return;

            const self = this;
            const delay = Math.max(0, Number(this.speed) || 250);
            this._pumpTimer = setTimeout(function () {
                self._pumpTimer = null;
                if (self.state !== 'ai_turn') return;

                let raw;
                try {
                    self._syncClient();
                    raw = self._invoke('StepAi', []);
                } catch (e) {
                    console.error('[host_adapter] StepAi 失败: ' + ((e && e.stack) || e));
                    return;
                }

                const fingerprint = [self.state, self.turnIndex, self.handNumber, self.handsPlayed,
                    self.wall.length, (self.players[0] ? self.players[0].hand.length : -1),
                    (self.lastDiscarded && self.lastDiscarded.id) || ''].join('|');

                self._apply(raw, true);

                if (fingerprint === self._lastFingerprint) {
                    if (++self._stalled > 300) {
                        console.error('[host_adapter] AI 推进疑似卡住（300 拍无变化）: ' + fingerprint);
                        return;
                    }
                } else {
                    self._lastFingerprint = fingerprint;
                    self._stalled = 0;
                }
            }, delay);
        }

        // ── 下一局（模拟 engine.js 的 scheduleNextRound）──
        _scheduleNextRound() {
            if (this._nextTimer) return;
            if (this.state !== 'ended' || this._pendingNextRoundDelay == null) return;

            const self = this;
            const delay = Number(this._pendingNextRoundDelay) || 2000;
            this._nextTimer = setTimeout(function () {
                self._nextTimer = null;
                let raw;
                try {
                    raw = self._invoke('AdvanceRound', []);
                } catch (e) {
                    console.error('[host_adapter] AdvanceRound 失败: ' + ((e && e.stack) || e));
                    return;
                }
                self._apply(raw, true);
            }, delay);
        }

        // ══════════════════════════════════════════════════════════
        // 判役查询（UI 按钮可用性 / scoretest）
        // ══════════════════════════════════════════════════════════

        _makeChecker() {
            return new WinCheckerHost(null, this.config);
        }

        _syncOptionalFromHost() {
            try {
                const list = JSON.parse(this._invoke('OptionalEnabledList', []));
                const optional = this.checker && this.checker.optionalEnabled;
                if (optional && typeof optional.syncFrom === 'function') {
                    optional.syncFrom(list);
                }
            } catch (e) {
                console.warn('[host_adapter] 同步可选役失败: ' + ((e && e.message) || e));
            }
        }

        // ══════════════════════════════════════════════════════════
        // engine.js 同名方法（按 game.js 的调用面）
        // ══════════════════════════════════════════════════════════

        get humanIdx() {
            if (!this.players) return -1;
            for (let i = 0; i < this.players.length; i++) {
                if (this.players[i].isHuman) return i;
            }
            return -1;
        }

        init(config, checker, playerUUID, settings) {
            this.config = config;
            this.checker = checker || this._makeChecker();
            this.playerUUID = playerUUID || '';
            this._invoke('Init', [JSON.stringify(settings || {}), this.playerUUID]);
            this._initialized = true;
            this._syncOptionalFromHost();
            this._refresh(false);
        }

        applySettings(settings) {
            this.settings = Object.assign({}, this.settings, settings || {});
            this._invoke('ApplySettings', [JSON.stringify(settings || {})]);
            this._syncOptionalFromHost();
            this._refresh(false);
        }

        setMode(target) {
            return this._snapshot('SetMode', [Number(target) || 1]);
        }

        startNewRound() {
            return this._snapshot('StartNewRound', []);
        }

        resetAll() {
            return this._snapshot('ResetAll', []);
        }

        applySavedState(state) {
            const ok = this._invoke('ApplySavedState', [JSON.stringify(state || {})]);
            this._refresh(true);
            return !!ok;
        }

        executeCommand(cmd) {
            if (this._initialized) this._syncClient();
            const result = this._invoke('ExecuteCommand', [JSON.stringify(cmd || {})]);
            this._refresh(true);
            return result;
        }

        humanDiscard(index) {
            return this._snapshot('HumanDiscard', [Number(index) || 0]);
        }

        humanChi(chiIndex) {
            return this._snapshot('HumanChi', [chiIndex == null ? 0 : Number(chiIndex)]);
        }

        humanPon() {
            return this._snapshot('HumanPon', []);
        }

        humanKan() {
            return this._snapshot('HumanKan', []);
        }

        humanKanSelf() {
            return this._snapshot('HumanKanSelf', []);
        }

        humanTsumo() {
            return this._snapshot('HumanTsumo', []);
        }

        humanRon() {
            return this._snapshot('HumanRon', []);
        }

        passAction() {
            return this._snapshot('PassAction', []);
        }

        humanFlow(reason) {
            return this._snapshot('HumanFlow', [reason == null ? '' : String(reason)]);
        }

        roundLabel() {
            return this._invoke('RoundLabel', []);
        }

        calcPoints(fu) {
            return Number(this._invoke('CalcPoints', [Number(fu) || 0]));
        }

        splitPayment(total) {
            return JSON.parse(this._invoke('SplitPayment', [Number(total) || 0]));
        }

        // ── game.js 渲染层直接调用、但 engine.js 里存在的辅助 ──

        canAnkan(p) {
            if (!p) return null;
            const counts = new Map();
            for (let i = 0; i < p.hand.length; i++) {
                const id = p.hand[i].id;
                counts.set(id, (counts.get(id) || 0) + 1);
            }
            for (let i = 0; i < p.hand.length; i++) {
                const id = p.hand[i].id;
                if (counts.get(id) === 4) return id;
            }
            return null;
        }

        canKakan(p) {
            if (!p) return null;
            const seen = new Set();
            for (let i = 0; i < p.hand.length; i++) {
                const id = p.hand[i].id;
                if (seen.has(id)) continue;
                seen.add(id);
                for (let j = 0; j < p.melds.length; j++) {
                    const m = p.melds[j];
                    if (m.type === 'pon' && m.tiles[0] && m.tiles[0].id === id) return id;
                }
            }
            return null;
        }

        flowOptions(hand) {
            return JSON.parse(this._invoke('FlowOptions', [JSON.stringify(tileIds(hand))]));
        }

        buildWinCtx(player, winTile, selfDraw) {
            let visible = 0;
            if (winTile) {
                for (let pi = 0; pi < this.players.length; pi++) {
                    const pl = this.players[pi];
                    for (let i = 0; i < pl.discards.length; i++) {
                        if (pl.discards[i].id === winTile.id) visible++;
                    }
                    for (let mi = 0; mi < pl.melds.length; mi++) {
                        const tiles = pl.melds[mi].tiles;
                        for (let ti = 0; ti < tiles.length; ti++) {
                            if (tiles[ti].id === winTile.id) visible++;
                        }
                    }
                    for (let hi = 0; hi < pl.hand.length; hi++) {
                        if (pl.hand[hi].id === winTile.id) visible++;
                    }
                }
            }

            let anyCalled = false;
            for (let pi = 0; pi < this.players.length; pi++) {
                const pl = this.players[pi];
                if (pl.melds.length > 0 || pl.minkanCount > 0) {
                    anyCalled = true;
                    break;
                }
            }

            const renhe = !selfDraw && !player.isDealer && !anyCalled && player.firstTurn && !player._lastDraw;
            return {
                seaMoon: !!player._seaMoon && !!selfDraw,
                haiDei: !!player._haiDei && !!selfDraw,
                riverFish: !selfDraw && this.wall.length === 0,
                lastTileVisible: visible,
                rinshanFlower: !!selfDraw && !!player._rinshanDrawn,
                rinshanGun: !selfDraw && !!this._kanThisTurn,
                kanRiichi: !!this._kanThisTurn,
                renhe: renhe,
                waterDrop: !!player._firstTurnTenpai &&
                    (selfDraw ? !!player._haiDei : (!selfDraw && this.wall.length === 0)),
                seatWind: player.seatWind,
                roundWind: this.roundWind
            };
        }
    }

    // 暴露给调试 / 手动覆盖
    window.TiisuMahjongHost = TiisuMahjongHost;

    // 手牌分析条（handAnalyzer.js）在 csharp 模式不再加载，整条面板直接隐藏。
    function hideAnalysisPanel() {
        const content = document.getElementById('handAnalysis');
        const panel = content && content.closest ? content.closest('.panel') : null;
        if (panel) panel.style.display = 'none';
    }

    // ── 选择适配器：默认 JS 引擎，只有 ?engine=csharp + WebView2 才接管 ──
    try {
        const engineParam = new URLSearchParams(location.search).get('engine');
        if (engineParam === 'csharp' && isCSharpHost()) {
            // csharp 模式下 index.html 已跳过 engine.js / winchecker.js / tenpai.js / aiPlayer.js，
            // 这里提供同名全局给 game.js 使用。
            window.TiisuMahjong = TiisuMahjongHost;
            window.WinChecker = WinCheckerHost;
            window.listTenpai = listTenpaiHost;
            window.getAIDiscardIndex = getAIDiscardIndexHost;
            hideAnalysisPanel();
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', hideAnalysisPanel);
            }
            console.log('[host_adapter] C# 引擎已接管（engine=csharp, host=tiisu；判役/听牌/AI 走 C#）');
        } else if (engineParam === 'csharp') {
            console.warn('[host_adapter] ?engine=csharp 但不在 WebView2 宿主中，继续使用 JS 引擎');
        }
    } catch (e) {
        if (window.console && console.error) {
            console.error('[host_adapter] 选择适配器失败: ' + ((e && e.message) || e));
        }
    }
})();
