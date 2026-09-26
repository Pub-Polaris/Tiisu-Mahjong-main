// ══════════════════════════════════════════════════════════════
// engine.js — 玩家类 + 主游戏引擎（TiisuMahjong）
// 依赖：tiles.js, winchecker.js, aiPlayer.js
// 依赖注入：本文件不直接 new WinChecker / 不直接 fetch ike.json；
//           init(config) 由装配层调用，checker 由装配层注入。
// ══════════════════════════════════════════════════════════════

// ── 玩家类 ──
class TiisuPlayer {
    constructor(name, seat, isHuman, uuid) {
        this.name = name;
        this.seat = seat;
        this.isHuman = isHuman;
        this.uuid = uuid || '';
        this.hand = [];
        this.discards = [];
        this.melds = [];     // {type:'chi'|'pon'|'minkan'|'ankan'|'kakan', tiles:[...]}
        this.kans = [];
        this.isDealer = false;
        this.seatWind = '';
        this.ankanCount = 0;
        this.minkanCount = 0;
        this.firstTurn = true;
        this._lastDraw = null;
        this._seaMoon = false;   // 本摸为倒数第二张墙牌（海上月）
        this._haiDei = false;    // 本摸为最后一张墙牌（海底月）
        this._groups = null;
        this._skipDraw = false;
    }

    totalTiles() {
        let m = 0;
        for (let meld of this.melds) m += meld.tiles.length;
        return this.hand.length + m;
    }

    // 杠数（4张面子即杠）→ 手牌物理张数 = 13 + 杠数（回合开始）/ 14 + 杠数（出牌前）
    kongCount() {
        let k = 0;
        for (let meld of this.melds) if (meld.tiles.length === 4) k++;
        return k;
    }

    addMeld(type, tiles) {
        this.melds.push({ type: type, tiles: tiles });
        if (type === 'minkan' || type === 'kakan') this.minkanCount++;
        if (type === 'ankan') this.ankanCount++;
    }

    findPonMeld(id) {
        for (let m of this.melds) {
            if (m.type === 'pon' && m.tiles[0].id === id) return m;
        }
        return null;
    }

    reset() {
        this.hand = [];
        this.discards = [];
        this.melds = [];
        this.kans = [];
        this.ankanCount = 0;
        this.minkanCount = 0;
        this.firstTurn = true;
        this._lastDraw = null;
        this._seaMoon = false;
        this._haiDei = false;
        this._groups = null;
        this._skipDraw = false;
    }
}

// ══════════════════════════════════════════════════════════════
// 主游戏引擎
// ══════════════════════════════════════════════════════════════
class TiisuMahjong {
    constructor() {
        this.wall = [];
        this.rinshan = [];
        this.wangDui = [];   // 王堆（跳墩中除 4 张马以外的死牌）
        this.players = [];
        this.turnIndex = 0;
        this.dealerIndex = 0;
        this.roundWind = 'east';
        this.honba = 0;
        this.state = 'idle';
        this.roundDiscards = [];
        this.currentDrawn = null;
        this.checker = null;       // 装配层注入（WinChecker 实例）
        this.config = null;        // 装配层注入（ike.json 解析结果）
        this.speed = 250;
        this._aiTimer = null;      // AI 回合调度
        this._humanTimer = null;   // 人类自动摸牌调度
        this._nextRoundTimer = null; // 下一局调度（demo/手动共用，可取消）
        this.ronTimeout = null;
        this.meldTimeout = null;
        this.scores = [0,0,0,0];
        this._demoMode = false;
        this._allAI = false;
        this.lastDiscarded = null;
        this.pendingRon = null;
        this.pendingMeld = null;
        this.gameOver = false;
        this.handNumber = 0;
        this.diceDealer = null;
        this.diceCut = null;
        this.cutInfo = null;      // {side, stack, skipTiles, maCount, wangCount}
        this.modeTarget = 1;      // 目标局数
        this.handsPlayed = 0;     // 已打局数（每手 +1，含连庄）
        this.roundWindIdx = 0;    // 场风：0=东 1=南 2=西 3=北
        this.dealerCount = 0;     // 庄家更替次数（不含连庄），用于算"东N局"的 N
        this.recordTiles = false; // 调试：记录每家每步牌型
        this.revealHands = false; // 和牌/流局后所有家手牌明牌
        this.playerUUID = '';     // 人类玩家 UUID
        this._logEntries = {};    // playerIdx -> [entry,...] 本局待写日志
        this._firstDeal = true;   // 整场是否尚未掷骰定庄（首次 true，此后 false）
        this.settings = {         // 装配层注入（/api/settings 读取）
            thinkSeconds: 30,
            optionalYaku: [],
            showMa: false,
            daxingqi: false,
            showDebug: false
        };
        this.lastRonMulti = [];   // 本局荣和多家并存的赋数列表（用于"多家和牌只显赋数"）

        this._kanThisTurn = false;   // 本巡是否开过杠（岭上炮/杠立）
        // ── 2026-09-26 规则书对齐新增状态 ──
        this.matchOver = false;      // 整场比赛是否已结束（大七星直接获胜 / 出岭）
        this.juFinished = false;     // 本局是否已结束（避免重复调度）
        this.initialPoints = 0;      // 场次初始点数（东风/半庄 49000；全庄 77000）
        this.rankPoints = [0,0,0,0]; // 段位点（8.3，每场结算累计）
        this._westDiscardCount = 0;  // 拔厄（4.3）：本局打出西风的家数
        this._lastWestDiscarder = -1;// 最后打出西风的家
        this._weekEndHandled = false;
    }

    // 装配层调用：config 为 ike.json 解析结果，checker 为 WinChecker 实例
    // playerUUID 为人类玩家 UUID（由 uuid.js 生成）；AI UUID 由方案 A 派生
    // settings 为 /api/settings 读取结果（可选）
    init(config, checker, playerUUID, settings) {
        this.config = config;
        this.checker = checker;
        this.playerUUID = playerUUID || '';
        if (settings) this.settings = Object.assign(this.settings, settings);
        const pu = this.playerUUID;
        this.players = [
            new TiisuPlayer('你', 'east', true, pu),
            new TiisuPlayer('AI 南', 'south', false, typeof generateAIUUID==='function' ? generateAIUUID(pu, 0) : ''),
            new TiisuPlayer('AI 西', 'west', false, typeof generateAIUUID==='function' ? generateAIUUID(pu, 1) : ''),
            new TiisuPlayer('AI 北', 'north', false, typeof generateAIUUID==='function' ? generateAIUUID(pu, 2) : ''),
        ];
        this.dealerIndex = 0;
        this.players[0].isDealer = true;
        this.updateSeatWinds();
    }

    get humanIdx() { return this.players.findIndex(p => p.isHuman); }

    // 应用设置（可选役 → checker.optionalEnabled；长考/马牌/大七星/记录牌型等存于 this.settings）
    applySettings(settings) {
        if (!settings) return;
        this.settings = Object.assign(this.settings, settings);
        if (this.checker && Array.isArray(settings.optionalYaku)) {
            settings.optionalYaku.forEach(id => this.checker.optionalEnabled.add(id));
        }
        if (settings.recordTiles != null) this.recordTiles = !!settings.recordTiles;
    }

    // 门风轮转：按庄家位置与场风，给四家重新分配门风（东南西北）
    // 摸牌顺序为 0→1→2→3（逆时针），庄家 = 场风，其后依次 南/西/北
    updateSeatWinds() {
        const order = ['east','south','west','north'];
        const rw = this.roundWindIdx % 4;
        this.roundWind = order[rw];
        for (let i = 0; i < 4; i++) {
            const off = (i - this.dealerIndex + 4) % 4;   // 相对庄家的座次偏移
            this.players[i].seatWind = order[(rw + off) % 4];
        }
    }

    // 庄家更替：庄家输 → 顺时针移到下一家；绕回起点时场风 +1
    advanceDealer() {
        const next = (this.dealerIndex + 1) % 4;
        if (next === 0) this.roundWindIdx++;
        this.dealerIndex = next;
        this.dealerCount++;
        this.honba = 0;
        this.updateSeatWinds();
    }

    // ═══ 3.1 定庄：掷两骰 ═══
    rollDice() {
        return [1 + Math.floor(Math.random()*6), 1 + Math.floor(Math.random()*6)];
    }

    // 点数合计 <7 顺时针数；=7 掷骰者本人；>7 逆时针数
    determineDealer(dice) {
        const sum = dice[0] + dice[1];
        const roller = 0; // 人类为掷骰者
        let dealer;
        if (sum === 7) dealer = roller;
        else if (sum < 7) dealer = (roller + sum) % 4;        // 顺时针
        else dealer = (roller - sum % 4 + 4) % 4;              // 逆时针
        this.dealerIndex = dealer;
        return { sum, dealer, dir: sum === 7 ? '自数' : (sum < 7 ? '顺时针' : '逆时针') };
    }

    // ═══ 3.2 配牌与牌山设置 ═══
    setupWallAndCut(dice) {
        // 总牌数 136。骰子和 S → 定切牌侧 side；从该侧右端向左数 S 墩（2S 张）为"跳墩"。
        // 跳墩 = 4 张岭上（马）+ 王堆（2S−4）。
        //
        // 牌山模型（规则书 3.3 / 4.2 / 10.1，2026-09-26 口径 C）：
        //   摸牌顺序 = 活牌山 → 王堆 → 岭上；
        //   平时只摸「活牌山 + 王堆」，摸到**王堆耗尽**才荒牌（活牌山 + 王堆都空）；
        //   岭上 4 张平时不参与普通摸牌，只用于 开杠摸取 / 和牌后赐马；
        //   岭上摸取顺序 = 从靠近庄家侧开始。
        // 因此显示的"牌山"= 可摸总数 = (136 − 2S) + (2S − 4) = 132，配牌后恒为 132 − 53 = 79。
        const deck = createDeck();   // 136 张
        shuffle(deck);

        const sum = dice[0] + dice[1];
        let side;
        if (sum === 7) side = this.dealerIndex;
        else if (sum < 7) side = (this.dealerIndex + sum) % 4;  // 顺时针
        else side = (this.dealerIndex - sum % 4 + 4) % 4;        // 逆时针

        const skipStacks = sum;                             // 跳墩墩数（= 骰子和）
        const skipTiles = skipStacks * 2;                   // 跳墩张数
        const maCount = 4;                                  // 岭上（马）4 张
        const wangCount = Math.max(0, skipTiles - maCount); // 王堆张数

        // 跳墩区（牌堆前 skipTiles 张）：靠近活牌山的 4 张为马，其余为王堆
        const dead = deck.slice(0, skipTiles);
        // 岭上 4 张：从靠近庄家侧摸取 → 反转存放，shift() 取的是庄家侧那张
        this.rinshan = dead.slice(dead.length - maCount).reverse();
        this.wangDui = dead.slice(0, Math.max(0, dead.length - maCount));  // 王堆
        const live = deck.slice(skipTiles);                                // 活牌山

        this.cutInfo = { side, stack: skipStacks, skipTiles, maCount, wangCount };

        // 摸牌顺序：活牌山 → 王堆（pop() 取数组末尾，故整体反转）
        const drawOrder = live.concat(this.wangDui);
        this.wall = drawOrder.slice().reverse();
        this._liveStart = live.length;   // 便于调试/展示
    }

    deal() {
        for (let round = 0; round < 3; round++) {
            for (let pi = 0; pi < 4; pi++) {
                for (let i = 0; i < 4; i++) {
                    this.players[pi].hand.push(this.wall.pop());
                }
            }
        }
        for (let pi = 0; pi < 4; pi++) {
            this.players[pi].hand.push(this.wall.pop());
        }
        const dealer = this.players[this.dealerIndex];
        dealer.hand.push(this.wall.pop());
        this.players.forEach(p => sortHand(p.hand));
    }

    startNewRound() {
        this.clearAllTimers();
        this.clearRoundLogs();
        this.revealHands = false;
        this.players.forEach(p => p.reset());
        // 定庄仅在首次开局掷骰；后续沿用 declareWin/flow 维护的 dealerIndex（庄赢连庄、输下庄）
        let dealerInfo = null;
        if (this._firstDeal) {
            this._firstDeal = false;
            this.diceDealer = this.rollDice();
            dealerInfo = this.determineDealer(this.diceDealer);
        }
        this.diceCut = this.rollDice();
        this.setupWallAndCut(this.diceCut);
        this.deal();
        this.state = 'playing';
        this.roundDiscards = [];
        this.currentDrawn = null;
        this.pendingRon = null;
        this.pendingMeld = null;
        this.gameOver = false;
        this.players.forEach(p => { p.isDealer = false; });
        this.players[this.dealerIndex].isDealer = true;
        this.updateSeatWinds();
        this.turnIndex = this.dealerIndex;
        this.hideActionBar();
        // 本局重置：拔厄计数 / 杠标记
        this._westDiscardCount = 0;
        this._westDiscarders = {};
        this._lastWestDiscarder = -1;
        this._kanThisTurn = false;
        this.players.forEach(pl => { pl._firstTurnTenpai = false; });

        // 九种九牌：不再自动流局（玩家如需做十三幺可自行保留），改为可选"流局"按钮
        if (typeof updateDiceLines === 'function') updateDiceLines(dealerInfo);
        if (this.players[this.turnIndex].isHuman) {
            this.state = 'human_discard';
        } else {
            this.state = 'ai_turn';
            this.scheduleAI();
        }
        if (typeof renderAll === 'function') renderAll();
        if (typeof showMsg === 'function') showMsg('');
    }

    // 改牌等公共清理
    clearAllTimers() {
        if (this._aiTimer) { clearTimeout(this._aiTimer); this._aiTimer = null; }
        if (this._humanTimer) { clearTimeout(this._humanTimer); this._humanTimer = null; }
        if (this._nextRoundTimer) { clearTimeout(this._nextRoundTimer); this._nextRoundTimer = null; }
        if (this.ronTimeout) { clearTimeout(this.ronTimeout); this.ronTimeout = null; }
        if (this.meldTimeout) { clearTimeout(this.meldTimeout); this.meldTimeout = null; }
    }

    draw(player) {
        if (this.wall.length === 0) return null;
        const before = this.wall.length;   // 摸牌前剩余墙牌数
        const tile = this.wall.pop();
        player.hand.push(tile);
        sortHand(player.hand);
        player._lastDraw = tile;
        player._seaMoon = (before === 2);  // 倒数第二张墙牌自摸 → 海上月
        player._haiDei = (before === 1);   // 最后一张墙牌自摸 → 海底月
        player.firstTurn = false;
        this.currentDrawn = tile;
        this.recordStep(this.players.indexOf(player), '摸', tileToStr(tile));
        return tile;
    }

    discard(player, index) {
        if (index < 0 || index >= player.hand.length) return null;
        const tile = player.hand.splice(index, 1)[0];
        player.discards.push(tile);
        const pi = this.players.indexOf(player);
        this.roundDiscards.push({ player: pi, tile });
        this.lastDiscarded = tile;
        this.recordStep(pi, '出', tileToStr(tile));
        // 首巡听牌标志（水滴石破用）：本局第一张打出后，若剩 13 张已听牌 → 标记
        if (player.discards.length === 1) {
            player._firstTurnTenpai = this.isTenpai(player);
        }
        // 拔厄（4.3）：统计各家打出西风（z3）的家数
        if (tile.suit === 'z' && tile.num === '3') {
            if (!this._westDiscarders) this._westDiscarders = {};
            if (!this._westDiscarders[pi]) {
                this._westDiscarders[pi] = true;
                this._westDiscardCount = (this._westDiscardCount || 0) + 1;
                this._lastWestDiscarder = pi;
            }
        }
        return tile;
    }

    // 特殊流局 / 拔厄检查（每次出牌后调用）。
    //  · 四风连打（4.3）：四家同一巡打出 4 张相同风牌 → 当场流局并连庄，不增加本场数；
    //  · 拔厄（4.3）：四家打出西风 → 最后打西风者向其他家各付 700 点；四家分数一致则本场 +1。
    // 返回 true 表示已触发"流局"（调用方应停止后续流程）。
    checkSpecialFlow() {
        const rd = this.roundDiscards || [];
        if (rd.length >= 4) {
            const last4 = rd.slice(-4);
            const t0 = last4[0].tile;
            const isWind = t0 && t0.suit === 'z' && ['1','2','3','4'].indexOf(t0.num) !== -1;
            const same = last4.every(e => e.tile && e.tile.id === t0.id);
            const fourPlayers = new Set(last4.map(e => e.player)).size === 4;
            if (isWind && same && fourPlayers) {
                this.declareSpecialFlow('四风连打（' + tileDisplay(t0) + '）');
                return true;
            }
        }
        if ((this._westDiscardCount || 0) >= 4) {
            const payer = this._lastWestDiscarder;
            for (let k = 0; k < 4; k++) {
                if (k === payer) continue;
                this.scores[payer] -= 700;
                this.scores[k] += 700;
            }
            const allEqual = this.scores.every(s => s === this.scores[0]);
            if (allEqual) this.honba++;
            gameLog('拔厄（四家打西风）→ ' + this.players[payer].name + ' 向其他家各付 700 点'
                + (allEqual ? '；四家分数一致 → 本场 +1' : ''));
            this._westDiscardCount = 0;
            this._westDiscarders = {};
            if (typeof renderAll === 'function') renderAll();
        }
        return false;
    }

    // 特殊流局（四风连打 / 三家和牌 / 九种九牌等）：连庄、本场不变
    declareSpecialFlow(reason) {
        this.state = 'ended';
        this.gameOver = true;
        this.revealHands = true;
        gameLog('第' + this.handNumber + '局 特殊流局：' + reason + '（庄家连庄，本场不变）');
        if (this.recordTiles) {
            for (let pi = 0; pi < 4; pi++) this.recordStep(pi, '特殊流局:' + reason, '');
            for (let pi = 0; pi < 4; pi++) this.flushRoundLog(pi);
        }
        if (typeof showMsg === 'function') showMsg('⏸ 特殊流局 · ' + reason + ' → 庄家连庄（本场不变）', false);
        if (typeof renderAll === 'function') renderAll();
        this.scheduleNextRound(2000);
    }

    // ── AI 回合 ──
    scheduleAI() {
        if (this._aiTimer) clearTimeout(this._aiTimer);
        this._aiTimer = setTimeout(() => this.aiTurn(), this.speed);
    }

    // 偶发役上下文：海上月/海底月/河中鱼/和绝张
    buildWinCtx(player, winTile, selfDraw) {
        // 和绝张：全桌该牌已见 4 张（含和牌张）
        let visible = 0;
        if (winTile) {
            for (let pl of this.players) {
                for (let d of pl.discards) if (d.id === winTile.id) visible++;
                for (let m of pl.melds) for (let t of m.tiles) if (t.id === winTile.id) visible++;
                for (let t of pl.hand) if (t.id === winTile.id) visible++;
            }
        }
        // 人和：闲家、第一巡、在自己摸牌之前荣和；且本局无人副露
        const anyCalled = this.players.some(p => p.melds.length > 0 || p.minkanCount > 0);
        const renhe = !selfDraw && !player.isDealer && !anyCalled &&
                      player.firstTurn && !player._lastDraw;
        return {
            seaMoon: !!player._seaMoon && !!selfDraw,
            haiDei: !!player._haiDei && !!selfDraw,
            riverFish: !selfDraw && this.wall.length === 0,
            lastTileVisible: visible,
            rinshanFlower: !!selfDraw && !!player._rinshanDrawn,     // 岭上花：自己开杠后摸岭上自摸
            rinshanGun: !selfDraw && !!this._kanThisTurn,            // 岭上炮：别人本巡开过杠后打出牌被荣和
            kanRiichi: !!this._kanThisTurn,                          // 杠立：开杠后当巡和牌
            renhe: renhe,
            // 水滴石破（6.1）：第一巡即听牌，最终以海底自摸 / 河底荣和和牌
            // （原形为"双立直后河底荣和或自摸"；立直已移除，改用等价的"首巡听牌"）
            waterDrop: !!player._firstTurnTenpai && (selfDraw ? !!player._haiDei : (!selfDraw && this.wall.length === 0)),
            seatWind: player.seatWind,
            roundWind: this.roundWind,
            daxingqi: !!(this.settings && this.settings.daxingqi)
        };
    }

    // 统一「流局」按钮（4.3 推牌流局）：玩家在自己的出牌阶段，
    // 手牌符合「九种九牌」或「十三不靠」时可选推牌流局（庄家连庄、本场不增加）。
    humanFlow(reason) {
        const p = this.players[this.humanIdx];
        if (this.state !== 'human_discard') return;
        if (this.turnIndex !== this.humanIdx) return;
        const opts = this.flowOptions(p.hand);
        if (opts.length === 0) return;
        const picked = (reason && opts.indexOf(reason) !== -1) ? reason : opts[0];
        this.declarePushFlow(picked, this.humanIdx);
    }

    aiTurn() {
        if (this.state !== 'ai_turn') return;
        const player = this.players[this.turnIndex];
        const isDealerFirst = player.isDealer && player.hand.length === 14 && !player._lastDraw && !player._skipDraw;
        if (player._skipDraw) {
            player._skipDraw = false; // 副露后免摸牌，直接出牌
        } else if (!isDealerFirst) {
            const drawn = this.draw(player);
            if (!drawn) { this.flow(); return; }
        } else {
            player.firstTurn = false;
        }

        // 自摸检查（传暗手 + 固定面子）
        const tsumoResult = this.checker.checkWin(
            player.hand.slice(), true,
            player.melds.length > 0 || player.minkanCount > 0,
            player.ankanCount, player.minkanCount,
            player.melds, player.kans,
            player.firstTurn,
            player.discards, player._lastDraw,
            this.buildWinCtx(player, player._lastDraw, true)
        );
        if (tsumoResult.success) {
            this.declareWin(this.turnIndex, true, tsumoResult);
            return;
        }

        // AI 暗杠/加杠
        const ank = this.canAnkan(player);
        const kak = ank ? null : this.canKakan(player);
        if (ank || kak) {
            if (this.doKan(player, ank || kak, ank ? 'ankan' : 'kakan')) {
                const r2 = this.checker.checkWin(
                    player.hand.slice(), true,
                    player.melds.length > 0 || player.minkanCount > 0,
                    player.ankanCount, player.minkanCount,
                    player.melds, player.kans,
                    player.firstTurn,
                    player.discards, player._lastDraw,
                    this.buildWinCtx(player, player._lastDraw, true)
                );
                if (r2.success) { this.declareWin(this.turnIndex, true, r2); return; }
            } else return;
        }

        // AI出牌
        const discPlayer = this.turnIndex;
        const idx = getAIDiscardIndex(player.hand, this);
        const discarded = this.discard(player, idx);
        if (!discarded) { this.flow(); return; }

        player._lastDraw = null;
        this.lastDiscarded = discarded;
        if (typeof renderAll === 'function') renderAll();

        this.afterDiscard(discarded, discPlayer);
    }

    // ═══ 出牌后的反应链：荣和 → 杠/碰 → 吃 ═══
    afterDiscard(discarded, discPlayer) {
        // 0. 特殊流局 / 拔厄（四风连打等）——优先于荣和/副露
        if (this.checkSpecialFlow()) return;

        // 1. 荣和（人类优先弹窗，AI 自动）
        const human = this.humanIdx;
        if (human !== -1 && human !== discPlayer) {
            const hr = this.tryRon(human, discarded);
            if (hr) {
                this.pendingRon = { tile: discarded, result: hr, discarder: discPlayer };
                this.state = 'human_ron';
                if (typeof renderAll === 'function') renderAll();
                this.showAction(
                    '🎯 荣和机会! 下家打出 ' + tileDisplay(discarded) + ' · ' + hr.totalFu + '赋可和',
                    { ron: true }, this.settings.thinkSeconds || 30,
                    () => this.passRon()
                );
                return;
            }
        }
        const ronCheck = this.checkRon(discarded);
        if (ronCheck.length > 0) {
            // 多家荣和：所有能荣和的都同时和牌（不互相跳过）
            this.declareMultiRon(ronCheck, discPlayer);
            return;
        }

        // 2. 杠/碰/吃
        this.checkMelds(discarded, discPlayer);
    }

    // 检查副露机会
    meldOptions(discarded, discPlayer) {
        const opts = { kan: [], pon: [], chi: null };
        for (let pi = 0; pi < 4; pi++) {
            if (pi === discPlayer) continue;
            const p = this.players[pi];
            const cnt = p.hand.filter(t => t.id === discarded.id).length;
            if (cnt >= 3) opts.kan.push(pi);
            else if (cnt >= 2) opts.pon.push(pi);
        }
        const next = (discPlayer + 1) % 4;
        const np = this.players[next];
        if (this.canChi(np, discarded)) opts.chi = next;
        return opts;
    }

    canChi(p, tile) {
        if (tile.suit === 'z') return false;
        const s = tile.suit, n = tile.num;
        const has = (x) => p.hand.some(t => t.suit === s && t.num === x);
        if (n === 1) return has(2) && has(3);
        if (n === 9) return has(7) && has(8);
        if (has(n-1) && has(n-2)) return true;
        if (has(n-1) && has(n+1)) return true;
        if (has(n+1) && has(n+2)) return true;
        return false;
    }

    // 返回所有可行的吃牌组合，如 12345 摸 4 → [{trio:[2,3,4]},{trio:[3,4,5]}]
    chiOptions(p, tile) {
        if (tile.suit === 'z') return [];
        const s = tile.suit, n = tile.num;
        const opts = [];
        const cnt = (x) => p.hand.filter(t => t.suit === s && t.num === x).length;
        // 可用的两邻张组合（扣除暗手实际拥有）
        const pairs = [];
        if (n === 1) { if (cnt(2)>=1 && cnt(3)>=1) pairs.push([2,3]); }
        else if (n === 9) { if (cnt(7)>=1 && cnt(8)>=1) pairs.push([7,8]); }
        else {
            if (cnt(n-2)>=1 && cnt(n-1)>=1) pairs.push([n-2,n-1]);
            if (cnt(n-1)>=1 && cnt(n+1)>=1) pairs.push([n-1,n+1]);
            if (cnt(n+1)>=1 && cnt(n+2)>=1) pairs.push([n+1,n+2]);
        }
        for (let pr of pairs) {
            const trio = [tile, {suit:s,num:pr[0],id:s+pr[0]}, {suit:s,num:pr[1],id:s+pr[1]}]
                .sort((a,b)=>a.num-b.num);
            opts.push({ trio: trio });
        }
        return opts;
    }

    checkMelds(discarded, discPlayer) {
        const opts = this.meldOptions(discarded, discPlayer);
        const human = this.humanIdx;

        if (human !== -1 && human !== discPlayer) {
            const canKan = opts.kan.includes(human);
            const canPon = opts.pon.includes(human);
            const canChi = opts.chi === human;
            if (canKan || canPon || canChi) {
                const chiList = canChi ? this.chiOptions(this.players[human], discarded) : [];
                this.pendingMeld = { tile: discarded, discarder: discPlayer, chiList: chiList };
                this.state = 'human_meld';
                if (typeof renderAll === 'function') renderAll();
                this.showAction(
                    '🀄 副露机会! 别人打出 ' + tileDisplay(discarded),
                    { kan: canKan, pon: canPon, chi: canChi, chiList: chiList }, this.settings.thinkSeconds || 30,
                    () => this.passMeld()
                );
                return;
            }
        }
        this.aiMeldDecision(opts, discarded, discPlayer);
    }

    aiMeldDecision(opts, discarded, discPlayer) {
        const human = this.humanIdx;
        const pick = (list) => { for (let pi of list) if (pi !== human) return pi; return null; };
        let target = null, type = null, chiTrio = null;
        if (opts.kan.length) { target = pick(opts.kan); type = 'minkan'; }
        else if (opts.pon.length) { target = pick(opts.pon); type = 'pon'; }
        else if (opts.chi !== null) {
            if (opts.chi !== human) {
                const np = this.players[opts.chi];
                const suitCnt = np.hand.filter(t => t.suit === discarded.suit).length;
                if (suitCnt >= 5) {
                    target = opts.chi; type = 'chi';
                    const optsList = this.chiOptions(np, discarded);
                    if (optsList.length) {
                        chiTrio = optsList[Math.floor(Math.random() * optsList.length)].trio; // AI 随机选组合
                    } else {
                        target = null;
                    }
                }
            }
        }
        if (target === null || target === human) { this.nextTurn(); return; }
        this.applyMeld(target, type, discarded, discPlayer, chiTrio);
    }

    // 执行副露。明杠(minkan) 需从岭上补摸一张（Bug 2 修复）
    // chiTrio 可选：人类吃牌多选时传入指定组合的牌对象数组
    applyMeld(pi, type, tile, discarder, chiTrio) {
        const p = this.players[pi];
        if (type === 'pon' || type === 'minkan') {
            const need = type === 'pon' ? 2 : 3;
            let removed = 0;
            p.hand = p.hand.filter(t => { if (t.id === tile.id && removed < need) { removed++; return false; } return true; });
            const tiles = [tile];
            for (let i = 1; i < (type === 'pon' ? 3 : 4); i++) tiles.push({ suit: tile.suit, num: tile.num, id: tile.id });
            p.addMeld(type, tiles);
        } else if (type === 'chi') {
            // 优先使用调用方指定组合；否则自动选第一组
            const trio = chiTrio || (this.chiOptions(p, tile)[0] ? this.chiOptions(p, tile)[0].trio : null);
            if (!trio) { this.nextTurn(); return; }
            for (let t of trio) {
                if (t.id === tile.id) continue;
                const pos = p.hand.findIndex(h => h.suit === t.suit && h.num === t.num);
                if (pos !== -1) p.hand.splice(pos, 1);
            }
            p.addMeld('chi', trio.slice().sort((a,b)=>a.num-b.num));
        }
        sortHand(p.hand);
        gameLog(p.name + (type === 'pon' ? ' 碰 ' : type === 'minkan' ? ' 明杠 ' : ' 吃 ') + tileDisplay(tile));
        this.recordStep(pi, (type === 'pon' ? '碰' : type === 'minkan' ? '明杠' : '吃'), tileToStr(tile));

        // ── 明杠后补摸岭上；岭上池耗尽则回退从活牌墙摸（不得流局）──
        if (type === 'minkan') {
            if (this.wall.length === 0 && this.rinshan.length === 0) { this.flow(); return; }
            const rep = this.rinshan.length > 0 ? this.rinshan.shift() : this.wall.pop();
            this._kanThisTurn = true;
            p._rinshanDrawn = (rep != null);
            p.hand.push(rep);
            sortHand(p.hand);
            p._lastDraw = rep;
            p.firstTurn = false;
            this.currentDrawn = rep;
            gameLog(p.name + ' 明杠补摸' + (this.rinshan.length === 0 && rep ? '（牌山代摸）' : '岭上') + ' ' + tileDisplay(rep));
            this.recordStep(pi, '明杠补摸' + (this.rinshan.length === 0 ? '（牌山）' : '岭上'), tileToStr(rep));
        }

        this.turnIndex = pi;
        this.lastDiscarded = null;
        p._skipDraw = true; // 副露/杠后免常规摸牌（明杠已补摸岭上）
        if (p.isHuman) {
            this.state = 'human_discard';
        } else {
            this.state = 'ai_turn';
            this.scheduleAI();
        }
        if (typeof renderAll === 'function') renderAll();
    }

    // ── 人类副露操作 ──
    humanPon() { this.humanMeldAction('pon'); }
    humanKan() { this.humanMeldAction('minkan'); }
    // 人类吃牌多选：chiIndex 指定组合下标（0-based），-1 或未传走第一组
    humanChi(chiIndex) {
        const opt = (chiIndex != null && chiIndex >= 0) ? chiIndex : 0;
        this.humanMeldAction('chi', opt);
    }

    humanMeldAction(type, chiIndex) {
        if (!this.pendingMeld) return;
        this.hideActionBar();
        const { tile, discarder, chiList } = this.pendingMeld;
        this.pendingMeld = null;
        let chiTrio = null;
        if (type === 'chi' && chiList && chiList.length) {
            const idx = (chiIndex != null && chiIndex >= 0 && chiIndex < chiList.length) ? chiIndex : 0;
            chiTrio = chiList[idx].trio;
        }
        this.applyMeld(this.humanIdx, type, tile, discarder, chiTrio);
    }

    passMeld() {
        if (!this.pendingMeld) return;
        this.hideActionBar();
        const { tile, discarder } = this.pendingMeld;
        this.pendingMeld = null;
        const opts = this.meldOptions(tile, discarder);
        this.aiMeldDecision(opts, tile, discarder);
    }

    passAction() {
        if (this.state === 'human_ron') this.passRon();
        else if (this.state === 'human_meld') this.passMeld();
    }

    humanKanSelf() {
        const p = this.players[this.humanIdx];
        if (this.state !== 'human_discard') return;
        const ank = this.canAnkan(p);
        const kak = ank ? null : this.canKakan(p);
        if (ank || kak) {
            if (this.doKan(p, ank || kak, ank ? 'ankan' : 'kakan')) {
                const r2 = this.checker.checkWin(
                    p.hand.slice(), true,
                    p.melds.length > 0 || p.minkanCount > 0,
                    p.ankanCount, p.minkanCount,
                    p.melds, p.kans,
                    p.firstTurn,
                    p.discards, p._lastDraw,
                    this.buildWinCtx(p, p._lastDraw, true)
                );
                if (r2.success) { this.declareWin(this.humanIdx, true, r2); return; }
                if (typeof renderAll === 'function') renderAll();
            }
        }
    }

    // 暗杠/加杠检查
    canAnkan(p) {
        const m = countTiles(p.hand);
        for (let [id, c] of m) if (c === 4) return id;
        return null;
    }
    canKakan(p) {
        const m = countTiles(p.hand);
        for (let [id, c] of m) {
            if (c >= 1 && p.findPonMeld(id)) return id;
        }
        return null;
    }

    // 由 id 生成牌对象（字牌 num 为字符串，数牌 num 为数字，与 tiles.js 约定一致）
    tileFromId(id) {
        const suit = id[0];
        const n = id.slice(1);
        return { suit: suit, num: (suit === 'z' ? n : parseInt(n, 10)), id: id };
    }

    // 抢杠（3.4）：加杠（明杠）可被任意家抢；暗杠仅"国士无双"型可抢。返回 [{playerIdx,result}]。
    checkRobKan(id, type) {
        const tile = this.tileFromId(id);
        const winners = [];
        for (let pi = 0; pi < 4; pi++) {
            if (pi === this.turnIndex) continue;
            const p = this.players[pi];
            if (type === 'ankan' && !this.isKokushiShape(p)) continue;   // 暗杠只有国士能抢
            p.hand.push(tile);
            sortHand(p.hand);
            const r = this.checker.checkWin(
                p.hand.slice(), false,
                p.melds.length > 0 || p.minkanCount > 0,
                p.ankanCount, p.minkanCount,
                p.melds, p.kans,
                p.firstTurn, p.discards, tile,
                this.buildWinCtx(p, tile, false)
            );
            if (r.success) winners.push({ playerIdx: pi, result: r });
            else {
                const pos = p.hand.findIndex(t => t.id === tile.id);
                if (pos !== -1) p.hand.splice(pos, 1);
            }
        }
        return winners;
    }

    // 该家是否持"国士无双"形（全幺九/字，且种类足够）——用于判定能否抢暗杠
    isKokushiShape(p) {
        const kinds = new Set();
        for (const t of p.hand) {
            if (t.suit === 'z') kinds.add(t.id);
            else if (t.num === 1 || t.num === 9) kinds.add(t.id);
            else return false;
        }
        return kinds.size >= 12;
    }

    doKan(p, id, type) {
        // ── 抢杠（3.4）：先问其他家是否荣和这张 ──
        const robbers = this.checkRobKan(id, type);
        if (robbers.length > 0) {
            gameLog((type === 'ankan' ? '暗杠' : '加杠') + ' ' + tileDisplay(this.tileFromId(id)) +
                ' 被抢杠：' + robbers.map(r => this.players[r.playerIdx].name).join('、'));
            if (robbers.length >= 3) { this.declareSpecialFlow('三家和牌（抢杠）→ 自动流局'); return false; }
            this.declareMultiRon(robbers, this.players.indexOf(p));
            return false;
        }

        let removed = 0;
        p.hand = p.hand.filter(t => { if (t.id === id && removed < (type === 'ankan' ? 4 : 1)) { removed++; return false; } return true; });
        if (type === 'ankan') {
            const t = this.tileFromId(id);
            p.addMeld('ankan', [t, {suit:t.suit,num:t.num,id:t.id}, {suit:t.suit,num:t.num,id:t.id}, {suit:t.suit,num:t.num,id:t.id}]);
        } else {
            const m = p.findPonMeld(id);
            m.type = 'kakan';
            m.tiles.push(this.tileFromId(id));
            p.minkanCount++;
        }
        if (this.wall.length === 0 && this.rinshan.length === 0) { this.flow(); return false; }
        const tile = this.rinshan.length > 0 ? this.rinshan.shift() : this.wall.pop();
        this._kanThisTurn = true;
        p._rinshanDrawn = (tile != null);
        p.hand.push(tile);
        sortHand(p.hand);
        p._lastDraw = tile;
        p.firstTurn = false;
        this.currentDrawn = tile;
        gameLog(p.name + (type === 'ankan' ? ' 暗杠 ' : ' 加杠 ') + tileDisplay(tile) + ' · ' +
            (this.rinshan.length === 0 ? '牌山代摸' : '岭上摸') + ' ' + tileDisplay(tile));
        this.recordStep(this.players.indexOf(p), (type === 'ankan' ? '暗杠' : '加杠') + '·岭上摸', tileToStr(tile));
        return true;
    }

    // ── 荣和试探 / 判定 ──
    tryRon(pi, tile) {
        const p = this.players[pi];
        // 防御：荣和前必须为 13 张（含副露后的暗手），加上荣和张 = 14 张
        // 15 张（大相公）直接拒绝
        const meldTiles = [];
        for (let m of (p.melds || [])) for (let t of m.tiles) meldTiles.push(t);
        const concealedLen = p.hand.length;
        const kongCount = (p.melds || []).filter(m => m.tiles.length === 4).length;
        const expectedConcealed = 13 - meldTiles.length + kongCount;
        if (concealedLen !== expectedConcealed) {
            gameLog(`[DEBUG] tryRon 拒绝: player=${p.name}, 手牌=${concealedLen}, 期望暗手=${expectedConcealed}, 副露牌=${meldTiles.length}, 杠数=${kongCount}`);
            return null;
        }
        p.hand.push(tile);
        sortHand(p.hand);
        const result = this.checker.checkWin(
            p.hand.slice(), false,
            p.melds.length > 0 || p.minkanCount > 0,
            p.ankanCount, p.minkanCount,
            p.melds, p.kans,
            p.firstTurn,
            p.discards, tile,
            this.buildWinCtx(p, tile, false)
        );
        if (!result.success) {
            const pos = p.hand.findIndex(t => t.id === tile.id && t.suit === tile.suit && t.num === tile.num);
            if (pos !== -1) p.hand.splice(pos, 1);
        }
        return result.success ? result : null;
    }

    checkRon(discardedTile) {
        const winners = [];
        for (let pi = 0; pi < 4; pi++) {
            if (pi === this.turnIndex) continue;
            const p = this.players[pi];
            if (p.isHuman) continue; // 人类走 tryRon 流程
            // 防御：荣和前必须为 13 张（含副露后的暗手），加上荣和张 = 14 张
            const meldTiles = [];
            for (let m of (p.melds || [])) for (let t of m.tiles) meldTiles.push(t);
            const concealedLen = p.hand.length;
            const kongCount = (p.melds || []).filter(m => m.tiles.length === 4).length;
            const expectedConcealed = 13 - meldTiles.length + kongCount;
            if (concealedLen !== expectedConcealed) {
                gameLog(`[DEBUG] checkRon 拒绝: player=${p.name}, 手牌=${concealedLen}, 期望暗手=${expectedConcealed}, 副露牌=${meldTiles.length}, 杠数=${kongCount}`);
                continue;
            }
            p.hand.push(discardedTile);
            sortHand(p.hand);
            const result = this.checker.checkWin(
                p.hand.slice(), false,
                p.melds.length > 0 || p.minkanCount > 0,
                p.ankanCount, p.minkanCount,
                p.melds, p.kans,
                p.firstTurn,
                p.discards, discardedTile,
                this.buildWinCtx(p, discardedTile, false)
            );
            if (result.success) {
                winners.push({ playerIdx: pi, result });
            } else {
                const pos = p.hand.findIndex(t => t.id === discardedTile.id && t.suit === discardedTile.suit && t.num === discardedTile.num);
                if (pos !== -1) p.hand.splice(pos, 1);
            }
        }
        return winners;
    }

    // ── 人类操作 ──
    humanDiscard(idx) {
        if (this.state !== 'human_discard') return;
        if (this.turnIndex !== this.humanIdx) return;
        const player = this.players[this.turnIndex];
        if (idx < 0 || idx >= player.hand.length) return;

        const discPlayer = this.turnIndex;
        const discarded = this.discard(player, idx);
        if (!discarded) return;
        
        // 防御：弃牌后暗手应为 13 张（含副露的玩家可能不同）
        const meldTiles = [];
        for (let m of (player.melds || [])) for (let t of m.tiles) meldTiles.push(t);
        const kongCount = (player.melds || []).filter(m => m.tiles.length === 4).length;
        const expectedConcealed = 13 - meldTiles.length + kongCount;
        if (player.hand.length !== expectedConcealed) {
            gameLog(`[DEBUG] humanDiscard 异常: player=${player.name}, 当前暗手=${player.hand.length}, 期望=${expectedConcealed}, 副露牌=${meldTiles.length}, 杠数=${kongCount}`);
        }
        
        player._lastDraw = null;
        player._skipDraw = false;
        this.lastDiscarded = discarded;
        if (typeof renderAll === 'function') renderAll();

        this.afterDiscard(discarded, discPlayer);
    }

    humanDraw() {
        if (this.state !== 'human_draw') return;
        const player = this.players[this.turnIndex];
        const drawn = this.draw(player);
        if (!drawn) { this.flow(); return; }
        this.state = 'human_discard';
        if (typeof renderAll === 'function') renderAll();
    }

    humanTsumo() {
        const player = this.players[this.turnIndex];
        if (this.state !== 'human_discard') return;
        if (player.totalTiles() !== 14 + player.kongCount()) return;
        const result = this.checker.checkWin(
            player.hand.slice(), true,
            player.melds.length > 0 || player.minkanCount > 0,
            player.ankanCount, player.minkanCount,
            player.melds, player.kans,
            player.firstTurn,
            player.discards, player._lastDraw,
            this.buildWinCtx(player, player._lastDraw, true)
        );
        if (result.success) {
            this.declareWin(this.turnIndex, true, result);
        }
    }

    humanRon() {
        if (!this.pendingRon) return;
        this.hideActionBar();
        const { tile, result, discarder } = this.pendingRon;
        this.pendingRon = null;
        // 防御：荣和时手牌应为 14 张（含副露调整）
        const player = this.players[this.humanIdx];
        const meldTiles = [];
        for (let m of (player.melds || [])) for (let t of m.tiles) meldTiles.push(t);
        const kongCount = (player.melds || []).filter(m => m.tiles.length === 4).length;
        const expectedTotal = 14 + kongCount;
        const actualTotal = player.hand.length + meldTiles.length;
        if (actualTotal !== expectedTotal) {
            gameLog(`[DEBUG] humanRon 拒绝: 总张数异常=${actualTotal}, 期望=${expectedTotal}, 暗手=${player.hand.length}, 副露=${meldTiles.length}`);
            return;
        }
        // 人类荣和：同时收集同张可荣和的 AI，所有胜者一起和牌（不互相跳过）
        const aiWinners = this.checkRon(tile); // 返回 AI 胜者（checkRon 跳过人类）
        const winners = [{ playerIdx: this.humanIdx, result }].concat(aiWinners);
        this.declareMultiRon(winners, discarder);
    }

    passRon() {
        if (!this.pendingRon) return;
        this.hideActionBar();
        const { tile, discarder } = this.pendingRon;
        this.pendingRon = null;
        // 移除试探牌
        const p = this.players[this.humanIdx];
        const pos = p.hand.findIndex(t => t.id === tile.id && t.suit === tile.suit && t.num === tile.num);
        if (pos !== -1) p.hand.splice(pos, 1);
        // 检查 AI 荣和（多家同时和牌）
        const ronCheck = this.checkRon(tile);
        if (ronCheck.length > 0) {
            this.declareMultiRon(ronCheck, discarder);
            return;
        }
        // 荣和放弃后，弃牌仍应进入杠/碰/吃问询
        this.checkMelds(tile, discarder);
    }

    // ── 停止全自动：清计时器；若停在 AI 回合则交还人类（或续 AI）──
    stopAuto() {
        this._demoMode = false;
        this.clearAllTimers();
        if (this._actTicker) { clearInterval(this._actTicker); this._actTicker = null; }
        this.hideActionBar();
        if (this.gameOver) return; // 已终局，等待下一局调度
        if (this.state === 'ai_turn' || this.state === 'human_draw' || this.state === 'human_discard') {
            const np = this.players[this.turnIndex];
            if (np.isHuman) {
                if (np.totalTiles() === 13 + np.kongCount() && !np._skipDraw && !this._dealerHas14()) {
                    this.state = 'human_draw';
                    if (this._humanTimer) clearTimeout(this._humanTimer);
                    this._humanTimer = setTimeout(() => this.humanDraw(), 1);
                } else {
                    this.state = 'human_discard';
                }
            } else {
                // 回合属于 AI（非全自动时仍由 AI 续打）
                this.state = 'ai_turn';
                this.scheduleAI();
            }
        }
        if (typeof renderAll === 'function') renderAll();
    }

    _dealerHas14() {
        const p = this.players[this.turnIndex];
        return p && p.isDealer && p.hand.length === 14 && !p._lastDraw && !p._skipDraw;
    }

    // ── 回合推进 ──
    nextTurn() {
        this._kanThisTurn = false;
        this.players.forEach(pl => { pl._rinshanDrawn = false; });
        this.turnIndex = (this.turnIndex + 1) % 4;
        if (this.wall.length === 0) {
            this.flow();
            return;
        }
        this.currentDrawn = null;
        this.lastDiscarded = null;
        const np = this.players[this.turnIndex];
        if (np.isHuman) {
            if (np.totalTiles() === 13 + np.kongCount() && !np._skipDraw) {
                // 人类玩家自动摸牌
                this.state = 'human_draw';
                if (this._humanTimer) clearTimeout(this._humanTimer);
                this._humanTimer = setTimeout(() => this.humanDraw(), 200);
            } else {
                this.state = 'human_discard';
            }
        } else {
            this.state = 'ai_turn';
            this.scheduleAI();
        }
        if (typeof renderAll === 'function') renderAll();
    }

    // ── 和牌结算 ──
    // 一局结束：调度下一局（demo 与手动均推进；可被停止/重置取消）
    scheduleNextRound(delay) {
        if (this._nextRoundTimer) clearTimeout(this._nextRoundTimer);
        const d = this;
        this._nextRoundTimer = setTimeout(() => {
            d._nextRoundTimer = null;
            if (d.advanceRound()) { d.handNumber++; d.startNewRound(); }
            else { d._demoMode = false; }
        }, delay || (this._demoMode ? 2500 : 2500));
    }

    // 推牌流局（4.3）：九种九牌 / 十三不靠 共用。
    // 规则书：符合条件可直接推牌流局，不受摸牌顺序影响，继续连庄不加本场数。
    declarePushFlow(reason, playerIdx) {
        this.state = 'ended';
        this.gameOver = true;
        this.revealHands = true;
        const p = this.players[playerIdx];
        gameLog('第' + this.handNumber + '局 ' + reason + '流局（' + (p ? p.name : '') +
            '）→ 庄家连庄，本场不增加');
        if (this.recordTiles) {
            for (let pi = 0; pi < 4; pi++) this.recordStep(pi, reason + '流局', '');
            for (let pi = 0; pi < 4; pi++) this.flushRoundLog(pi);
        }
        if (typeof showMsg === 'function') {
            showMsg('🌐 ' + reason + '流局 · ' + (p ? p.name : '') + ' 推牌 → 庄家连庄（本场不增加）', false);
        }
        if (typeof renderAll === 'function') renderAll();
        this.scheduleNextRound(2000);
    }

    // 兼容旧调用名
    declareNineOrphans(playerIdx) {
        this.declarePushFlow('九种九牌', playerIdx);
    }

    declareWin(winIdx, selfDraw, result, discarderIdx) {
        this.state = 'ended';
        this.gameOver = true;
        this.turnIndex = winIdx;
        const winner = this.players[winIdx];

        // 大七星（6.2.1）：开启「大七星算赋」时 = 双役满 70000 点 + 比赛场做出直接获胜
        // （立即结束整场）；未开启时按普通七对子正常结算，不触发直接获胜。
        if (result && result.sevenHonors && this.settings && this.settings.daxingqi) {
            this.declareDaxingqi(winIdx, discarderIdx);
            return;
        }

        // 赐马（赋马）：翻开剩余岭上为指示牌 → 指向的牌在手中（含副露）的张数，逐项累加
        const ma = this.resolveMa(winner, result);
        if (ma.fu > 0) {
            (result.activeYaku = result.activeYaku || []).push({ name: '赐马', fu: ma.fu, ma: true });
        }
        const fu = result.totalFu + ma.fu;
        const subPoints = this.calcFinalPoints(result, fu);   // 子家点数（全包赤特判 / 赋位表 / 固定点数役）
        const winMsg = selfDraw ? '自摸' : '荣和';
        const yakuStr = (result.activeYaku||[]).map(y=>y.name+'='+y.fu).join(' ');

        // 庄家 ×1.5，再加连庄奖励（700 点/根，不论庄家都加）
        const finalPoints = (winner.isDealer ? (subPoints * 1.5) : subPoints) + this.honbaBonus();

        if (selfDraw) {
            const { each, remainder } = this.splitPayment(finalPoints);
            for (let pi = 0; pi < 4; pi++) {
                if (pi === winIdx) continue;
                this.scores[winIdx] += each;
                this.scores[pi] -= each;
            }
            this.scores[winIdx] += remainder; // 余数归自摸者
        } else {
            const payer = (typeof discarderIdx === 'number') ? discarderIdx : this.turnIndex;
            this.scores[winIdx] += finalPoints;
            this.scores[payer] -= finalPoints;
        }

        if (winIdx === this.dealerIndex) { this.honba++; }
        else { this.advanceDealer(); }

        const logLine = winner.name + ' ' + winMsg + ' ' + fu + '赋 ' + finalPoints + '点 [' + yakuStr + ']';
        gameLog('第' + this.handNumber + '局 ' + logLine);
        this.revealHands = true; // 和牌后所有家手牌明牌
        // 局末：记录全部 4 家手牌快照
        if (this.recordTiles) {
            for (let pi = 0; pi < 4; pi++) {
                this.recordStep(pi, winIdx === pi ? (selfDraw ? '自摸和牌' : '荣和和牌') : '旁观', '');
            }
            for (let pi = 0; pi < 4; pi++) this.flushRoundLog(pi);
        }
        // 统计（大七星计数 / 和牌 → /api/stats；局数在 advanceRound 里统一记一次）
        this.reportStats(winIdx, result);
        // 出岭（击飞，8.2）：任一家分数跌至 0 以下 → 该家记 −7000 点并立即终局
        if (this.checkDeungnyeong()) {
            if (typeof renderAll === 'function') renderAll();
            return;
        }
        if (typeof renderAll === 'function') renderAll();
        if (typeof showMsg === 'function') {
            showMsg(this.buildWinOverlay(winIdx, selfDraw, result, finalPoints, fu), true);
        }
        this.scheduleNextRound(2500);
    }

    // 大七星：比赛场做出直接获胜 —— 立即结束整场、回门户（由 UI 处理跳转）、记统计
    declareDaxingqi(winIdx, discarderIdx) {
        const w = this.players[winIdx];
        this.revealHands = true;
        gameLog('第' + this.handNumber + '局 ★大七星★ ' + w.name + ' 做出七种字牌七对子 → 直接获胜');
        try {
            fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    daxingqi: 1, wins: 0, rounds: 0,
                    player: w.name,
                    witness: this.players.filter((_, i) => i !== winIdx).map(p => p.name)
                }),
                keepalive: true
            }).catch(() => {});
        } catch (e) {}
        this.reportStatsRoundOnce();
        if (this.recordTiles) {
            for (let pi = 0; pi < 4; pi++) this.recordStep(pi, pi === winIdx ? '大七星直接获胜' : '见证', '');
            for (let pi = 0; pi < 4; pi++) this.flushRoundLog(pi);
        }
        this.juFinished = true;
        if (typeof renderAll === 'function') renderAll();
        if (typeof showMsg === 'function') {
            showMsg('<div style="text-align:center">★🏆 <b>' + w.name + '</b> 做出 <b>大七星</b>（七种字牌七对子）🏆★<br>' +
                '<span style="font-size:14px">比赛场做出直接获胜 —— 本场立即结束</span><br>' +
                '<span style="font-family:Consolas,monospace">' + (handToStr(w.hand) || '') + '</span></div>', true);
        }
        this.saveSessionState();
        // 直接获胜：整场结束（demo 模式下不再自动开新局）
        this._demoMode = false;
        this.gameOver = true;
        this.state = 'ended';
        this.matchOver = true;
        try {
            fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inProgress: false, savedAt: new Date().toISOString() }),
                keepalive: true
            }).catch(() => {});
        } catch (e) {}
    }

    // 出岭（击飞，8.2）：分数跌破 0 → 记 −7000 点并立即终局。返回是否触发。
    checkDeungnyeong() {
        for (let i = 0; i < 4; i++) {
            if (this.scores[i] < 0) {
                this.scores[i] = -7000;               // 出岭惩罚点数
                this.matchOver = true;
                this.state = 'ended';
                this.gameOver = true;
                gameLog('⚡ 出岭（击飞）！' + this.players[i].name + ' 分数跌破 0 → 记 −7000 点，比赛立即结束');
                if (typeof showMsg === 'function') {
                    showMsg('⚡ 出岭（击飞）· ' + this.players[i].name + ' 记 −7000 点 → 比赛立即结束', true);
                }
                try {
                    fetch('/api/state', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ inProgress: false, savedAt: new Date().toISOString() }),
                        keepalive: true
                    }).catch(() => {});
                } catch (e) {}
                return true;
            }
        }
        return false;
    }

    // rounds 统计只记一次（大七星/流局等非和牌路径用）
    reportStatsRoundOnce() {
        try {
            fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rounds: 1 }),
                keepalive: true
            }).catch(() => {});
        } catch (e) {}
    }

    // 构建和牌计分 overlay（含胜者手牌 + 役种表格）
    buildWinOverlay(winIdx, selfDraw, result, finalPoints, fu) {
        const winner = this.players[winIdx];
        const winMsg = selfDraw ? '自摸' : '荣和';
        fu = (fu != null) ? fu : result.totalFu;
        const yakuRows = (result.activeYaku||[]).map(y =>
            '<tr><td>' + y.name + (y.isBonus || y.ma ? ' ※' : '') + '</td><td>' + y.fu + '</td></tr>'
        ).join('');
        // 和牌计分面板：默认显示马牌（岭上），除非设置要求隐藏
        let maHtml = '';
        const showMa = (this.settings && this.settings.showMa);
        if (showMa && this.rinshan.length) {
            maHtml = '<div style="margin:6px 0;font-size:13px;color:#ffd84a">马牌(岭上): ' +
                this.rinshan.map(t => tileDisplay(t)).join(' ') + '</div>';
        }
        return '<div style="text-align:center">' +
            '🏆 <b>' + winner.name + '</b> ' + winMsg + ' · ' + fu + '赋 ' + finalPoints + '点</div>' +
            maHtml +
            '<div style="margin:6px 0;font-family:Consolas,monospace">' +
            '手牌: ' + (handToStr(winner.hand) || '∅') +
            (winner.melds.length ? ' 副露: ' + meldsToStr(winner.melds) : '') +
            '</div>' +
            '<table style="margin:4px auto;border-collapse:collapse">' +
            '<tr style="border-bottom:1px solid #888"><th>役种</th><th>赋</th></tr>' +
            yakuRows +
            '</table>';
    }

    // ── 多家荣和结算：所有能荣和的都同时和牌，放铳者对每家各付全额 ──
    // winners: [{playerIdx, result}]
    declareMultiRon(winners, discarderIdx) {
        if (!winners || winners.length === 0) return;
        // 三家和牌（4.2）：自动流局（并破坏双和子跳庄规则）
        if (winners.length >= 3) {
            this.declareSpecialFlow('三家和牌 → 自动流局');
            return;
        }
        this.state = 'ended';
        this.gameOver = true;
        const payer = (typeof discarderIdx === 'number') ? discarderIdx : this.turnIndex;
        const payerName = this.players[payer] ? this.players[payer].name : '?';

        // 双和子跳庄（10.3）：子家与庄家同时荣和时，若子家手牌较大 → 庄家放弃和牌，
        // 并由庄家向该和牌子家支付 3500 点。
        let effective = winners.slice();
        if (winners.length === 2) {
            const di = winners.findIndex(w => w.playerIdx === this.dealerIndex);
            if (di !== -1) {
                const childIdx = 1 - di;
                const dealerW = winners[di], childW = winners[childIdx];
                if ((childW.result.totalFu || 0) >= (dealerW.result.totalFu || 0)) {
                    this.scores[this.dealerIndex] -= 3500;
                    this.scores[childW.playerIdx] += 3500;
                    gameLog('双和子跳庄：子家 ' + this.players[childW.playerIdx].name
                        + ' 手牌（' + childW.result.totalFu + '赋）≥ 庄家（' + dealerW.result.totalFu
                        + '赋）→ 庄家放弃和牌，并付 3500 点');
                    effective = [childW];
                }
            }
        }

        // 每个胜者各得全额（放铳者一家付所有胜者）；赐马只按胜者自己的手牌计
        effective.forEach(w => {
            const p = this.players[w.playerIdx];
            const ma = this.resolveMa(p, w.result);
            if (ma.fu > 0) {
                (w.result.activeYaku = w.result.activeYaku || []).push({ name: '赐马', fu: ma.fu, ma: true });
            }
            w.totalFu = w.result.totalFu + ma.fu;
            const sub = this.calcFinalPoints(w.result, w.totalFu);
            const fp = (p.isDealer ? (sub * 1.5) : sub) + this.honbaBonus();
            w.finalPoints = fp;
            this.scores[w.playerIdx] += fp;
            this.scores[payer] -= fp;
        });
        this.lastRonMulti = effective.map(w => ({
            playerIdx: w.playerIdx,
            fu: w.totalFu,
            points: w.finalPoints,
            name: this.players[w.playerIdx].name
        }));

        // 连庄判定：胜者含庄家 → 连庄；否则庄家顺移一位
        if (effective.some(w => w.playerIdx === this.dealerIndex)) { this.honba++; }
        else { this.advanceDealer(); }

        this.revealHands = true;
        // 逐胜者日志 / 快照 / 统计（wins/daxingqi 按胜者记；rounds 在 advanceRound 统一记一次）
        effective.forEach((w) => {
            const p = this.players[w.playerIdx];
            const yakuStr = (w.result.activeYaku||[]).map(y=>y.name+'='+y.fu).join(' ');
            const fp = w.finalPoints != null ? w.finalPoints : this.calcFinalPoints(w.result, w.result.totalFu);
            gameLog('第' + this.handNumber + '局 ' + p.name + ' 荣和 ' + (w.totalFu != null ? w.totalFu : w.result.totalFu) + '赋 ' + fp + '点（放铳 ' + payerName + '）[' + yakuStr + ']');
            this.reportStats(w.playerIdx, w.result);
        });
        if (this.recordTiles) {
            const winIdxs = new Set(effective.map(w => w.playerIdx));
            for (let pi = 0; pi < 4; pi++) {
                this.recordStep(pi, winIdxs.has(pi) ? '荣和和牌' : '旁观', '');
            }
            for (let pi = 0; pi < 4; pi++) this.flushRoundLog(pi);
        }
        if (this.checkDeungnyeong()) { if (typeof renderAll === 'function') renderAll(); return; }
        if (typeof renderAll === 'function') renderAll();
        if (typeof showMsg === 'function') {
            showMsg(this.buildMultiWinOverlay(effective, payer), true);
        }
        this.scheduleNextRound(2500);
    }

    // 多家荣和 overlay：逐一完整显示每个胜者
    buildMultiWinOverlay(winners, payerIdx) {
        const payerName = this.players[payerIdx] ? this.players[payerIdx].name : '?';
        let maHtml = '';
        if (this.settings && this.settings.showMa && this.rinshan.length) {
            maHtml = '<div style="margin:6px 0;font-size:13px;color:#ffd84a">马牌(岭上): ' +
                this.rinshan.map(t => tileDisplay(t)).join(' ') + '</div>';
        }
        let body = '';
        winners.forEach(w => {
            const p = this.players[w.playerIdx];
            const totalFu = w.totalFu != null ? w.totalFu : w.result.totalFu;
            const fp = w.finalPoints != null ? w.finalPoints : (p.isDealer ? (this.calcPoints(totalFu) * 1.5) : this.calcPoints(totalFu));
            const yakuRows = (w.result.activeYaku||[]).map(y =>
                '<tr><td>' + y.name + (y.isBonus || y.ma ? ' ※' : '') + '</td><td>' + y.fu + '</td></tr>'
            ).join('');
            body += '<div style="margin:8px 0;border-top:1px dashed #666;padding-top:6px">' +
                '🏆 <b>' + p.name + '</b> 荣和 · ' + totalFu + '赋 ' + fp + '点</div>' +
                '<div style="font-family:Consolas,monospace">手牌: ' + (handToStr(p.hand) || '∅') +
                (p.melds.length ? ' 副露: ' + meldsToStr(p.melds) : '') + '</div>' +
                '<table style="margin:4px auto;border-collapse:collapse">' +
                '<tr style="border-bottom:1px solid #888"><th>役种</th><th>赋</th></tr>' +
                yakuRows + '</table>';
        });
        return '<div style="text-align:center;font-size:15px;max-height:420px;overflow:auto">' +
            '🎯 多家荣和（' + winners.length + '家）· 放铳：' + payerName + '</div>' +
            maHtml + body;
    }

    // 大七星 / 和牌 统计上报（/api/stats）。rounds（局数）不在此记，
    // 由 advanceRound 每手统一记一次，避免多家荣和重复累加。
    reportStats(winIdx, result) {
        const winner = this.players[winIdx];
        const isSevenHonors = !!(result && result.sevenHonors);
        try {
            fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wins: 1,
                    daxingqi: isSevenHonors ? 1 : 0,
                    player: winner.name
                }),
                keepalive: true
            }).catch(() => {});
            if (isSevenHonors) gameLog('大七星！' + winner.name + ' 和牌（字牌七对子）');
        } catch(e) {}
    }

    // 每手（无论和牌/流局）把 rounds +1 上报一次
    reportRound() {
        try {
            fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rounds: 1 }),
                keepalive: true
            }).catch(() => {});
        } catch(e) {}
    }

    // 会话存档：和牌/流局后把可恢复状态写入 /api/state（下一局继续）
    // 合并保留 pending 的 game_cmd（debug.html 运行时命令）
    saveSessionState() {
        try {
            const base = { game_cmd: null };
            const doPost = (state) => {
                fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state),
                    keepalive: true
                }).catch(() => {});
            };
            const state = {
                session: (typeof __SESSION__ !== 'undefined' ? __SESSION__ : ''),
                savedAt: new Date().toISOString(),
                playerUUID: this.playerUUID,
                modeTarget: this.modeTarget,
                handsPlayed: this.handsPlayed,
                handNumber: this.handNumber,
                scores: this.scores.slice(),
                dealerIndex: this.dealerIndex,
                honba: this.honba,
                roundWindIdx: this.roundWindIdx,
                dealerCount: this.dealerCount,
                inProgress: this.handsPlayed < this.modeTarget
            };
            // 先读取现存 game_cmd 再写，避免覆盖
            fetch('/api/state').then(r => r.json()).then((st) => {
                if (st && st.game_cmd) state.game_cmd = st.game_cmd;
                doPost(state);
            }).catch(() => doPost(state));
        } catch(e) {}
    }

    // 三家均摊取整：余数归自摸者
    splitPayment(total) {
        const each = Math.floor(total / 3);
        const remainder = total - each * 3;
        return { each, remainder };
    }

    // 赐马（赋马）指示：下一张 = 立直宝牌顺序
    // 数牌 1→…→9→1；风 东→南→西→北→东；三元 白→发→中→白
    maNextId(id) {
        const suit = id[0], num = parseInt(id.slice(1), 10);
        if (suit === 'z') {
            if (num <= 4) return 'z' + (num === 4 ? 1 : num + 1);
            return 'z' + (num === 7 ? 5 : num + 1);
        }
        return suit + (num === 9 ? 1 : num + 1);
    }

    // 赐马计赋（已确认口径，见 docs/北极星_(人类)/规则与实现_当前版本.md 2.1）：
    //   **只看命中的指示牌张数** —— 每张翻开的指示牌，若它指向的目标牌（"下一张"）
    //   在胜者手牌 + 副露中存在，该指示牌即计 1 赋；命中几张就几赋。
    //   · 手牌里有几张对应的马牌【不影响赋数】（不是 min，也不是按手牌张数累加）；
    //   · 多张指示牌指向同一张牌时各算各的（2 张 → 2 赋）。
    // 不算入起和（checkWin 不含赐马）；倍满/役满（handType=highyaku）不计。
    resolveMa(winner, result) {
        if (result && (result.handType === 'highyaku' ||
            (result.sevenHonors && this.settings && this.settings.daxingqi))) {
            return { fu: 0, detail: [] };
        }
        const ma = this.rinshan || [];
        if (ma.length === 0) return { fu: 0, detail: [] };
        // 胜者全手（手牌 + 副露）实际持有
        const own = {};
        winner.hand.forEach(t => { own[t.id] = (own[t.id] || 0) + 1; });
        winner.melds.forEach(m => m.tiles.forEach(t => { own[t.id] = (own[t.id] || 0) + 1; }));
        // 逐张指示牌判定：它指向的牌在手 → 该指示牌计 1 赋（手牌张数不影响赋数）
        let fu = 0; const detail = [];
        ma.forEach(t => {
            const nxt = this.maNextId(t.id);
            if ((own[nxt] || 0) > 0) { fu += 1; detail.push({ indicator: t.id, nxt, fu: 1 }); }
        });
        return { fu, detail };
    }

    // 荒牌流局（牌山耗尽）。规则书 4.2 / 4.3 / 4.4：
    //   · 听牌流局：三家听牌则本场数 +1（无论庄家是否听牌）；
    //   · 荒牌流局按常规判定连庄：庄家听牌 → 连庄，否则过庄；
    //   · 未听返杠（4.4）：杠最多且流局未听者，按 700 点/杠返还；子家额外向庄家付 700；
    //   · 鸣牌后无役听牌（4.4）：罚 1400/2100 点；
    //   · 七日终战（4.3）：半庄/东风场本场数为 7 且流局 → 强制过庄进入 ALL LAST。
    flow() {
        this.state = 'ended';
        this.gameOver = true;
        this.revealHands = true; // 流局后所有家手牌明牌

        const tenpai = this.players.map(p => this.isTenpai(p));
        const nTenpai = tenpai.filter(Boolean).length;

        // 未听返杠（4.4）+ 鸣牌后无役听牌（4.4）
        const penaltyLog = [];
        this.applyNotenKanPenalty(tenpai, penaltyLog);
        this.applyNoYakuTenpaiPenalty(tenpai, penaltyLog);

        // 连庄判定：庄家听牌 → 连庄（本场 +1）；否则过庄（本场归零）
        if (tenpai[this.dealerIndex]) {
            this.honba++;
        } else {
            this.advanceDealer();
        }
        // 听牌流局：三家听牌则本场 +1（无论庄家是否听牌；已 +1 则不重复）
        if (nTenpai === 3 && this.honba === 0) this.honba++;

        // 七日终战（4.3）
        const weekLog = this.applySevenHandRule();

        gameLog('第' + this.handNumber + '局 流局·牌山已空（听牌' + nTenpai + '家，本场' + this.honba + '）');
        if (penaltyLog.length) gameLog('  罚则: ' + penaltyLog.join(' / '));
        if (weekLog) gameLog('  ' + weekLog);
        if (this.recordTiles) {
            for (let pi = 0; pi < 4; pi++) this.recordStep(pi, '流局', '');
            for (let pi = 0; pi < 4; pi++) this.flushRoundLog(pi);
        }
        if (typeof showMsg === 'function') showMsg('⏸ 流局 · 牌山已空 → ' + this.roundLabel() + this.buildFlowOverlay(), false);
        if (typeof renderAll === 'function') renderAll();
        this.scheduleNextRound(2000);
    }

    // 是否听牌（用 listTenpai 判定）
    isTenpai(p) {
        if (typeof listTenpai !== 'function') return false;
        try {
            const tp = listTenpai(this.checker, p.hand.slice(), p.melds, {
                hasCalled: p.melds.length > 0 || p.minkanCount > 0,
                ankanCount: p.ankanCount, minkanCount: p.minkanCount,
                firstTurn: p.firstTurn, discards: p.discards,
                seatWind: p.seatWind, roundWind: this.roundWind
            });
            return tp.some(x => x.success);
        } catch (e) { return false; }
    }

    // 未听返杠（4.4）：杠牌最多且流局未听牌者，按 700 点/杠向各家返还杠牌奖励；子家额外向庄家付 700 点。
    applyNotenKanPenalty(tenpai, logArr) {
        const kanCount = (p) => (p.ankanCount || 0) + (p.minkanCount || 0);
        let maxKan = 0;
        for (const p of this.players) maxKan = Math.max(maxKan, kanCount(p));
        if (maxKan <= 0) return;
        for (let pi = 0; pi < 4; pi++) {
            const p = this.players[pi];
            if (tenpai[pi]) continue;                       // 已听牌 → 不罚
            if (kanCount(p) !== maxKan) continue;           // 只罚"杠最多"的那家
            const per = 700 * maxKan;
            for (let k = 0; k < 4; k++) {
                if (k === pi) continue;
                this.scores[pi] -= per;
                this.scores[k] += per;
            }
            // 子家额外向庄家付 700
            if (pi !== this.dealerIndex) {
                this.scores[pi] -= 700;
                this.scores[this.dealerIndex] += 700;
            }
            logArr.push(p.name + ' 未听返杠 −' + per + '（' + maxKan + '杠）' + (pi !== this.dealerIndex ? ' 另付庄家700' : ''));
        }
    }

    // 鸣牌后无役听牌（4.4）：子家罚 1400（350×其他子家 + 庄家 700）；庄家罚 2100（三子家各 700）。
    // 判定：该家已有副露（鸣牌），且属于"无役听牌"（有听牌形但所有和牌张都因 no_yaku 不成立）。
    applyNoYakuTenpaiPenalty(tenpai, logArr) {
        if (typeof listTenpai !== 'function') return;
        for (let pi = 0; pi < 4; pi++) {
            const p = this.players[pi];
            const hasMeld = p.melds.length > 0 || p.minkanCount > 0;
            if (!hasMeld) continue;
            let tp;
            try {
                tp = listTenpai(this.checker, p.hand.slice(), p.melds, {
                    hasCalled: true, ankanCount: p.ankanCount, minkanCount: p.minkanCount,
                    firstTurn: p.firstTurn, discards: p.discards,
                    seatWind: p.seatWind, roundWind: this.roundWind
                });
            } catch (e) { continue; }
            const shapeOk = tp.some(x => x.success || x.noYakuGap > 0);   // 有听牌或差赋
            const canWin = tp.some(x => x.success);
            if (!shapeOk || canWin) continue;                              // 能和的不算"无役听牌"
            if (pi === this.dealerIndex) {
                for (let k = 0; k < 4; k++) { if (k === pi) continue; this.scores[pi] -= 700; this.scores[k] += 700; }
                logArr.push(p.name + '（庄）鸣牌后无役听牌 −2100');
            } else {
                this.scores[pi] -= 1400;
                this.scores[this.dealerIndex] += 700;
                for (let k = 0; k < 4; k++) {
                    if (k === pi || k === this.dealerIndex) continue;
                    this.scores[k] += 350;
                }
                logArr.push(p.name + ' 鸣牌后无役听牌 −1400');
            }
        }
    }

    // 七日终战（4.3）：半庄 / 东风场「本场数为 7」流局时，强制过庄进入 ALL LAST；
    // 结束后庄家若为 1 位须向最低点支付 2100 点并强制结算。
    applySevenHandRule() {
        if (this._weekEndHandled) return '';
        // 仅东风战 / 半庄战（全庄战不适用）
        if (!(this.modeTarget === 4 || this.modeTarget === 8)) return '';
        if ((this.honba || 0) < 7) return '';
        this._weekEndHandled = true;
        // 强制过庄
        this.advanceDealer();
        // 进入 ALL LAST：把终局场风设为当前场风（打完这一圈即终局）
        this.finalWindIdx = this.roundWindIdx;
        const d = this.players[this.dealerIndex];
        let log = '七日终战 → 强制过庄进入 ALL LAST（终局场风=' + ['东','南','西','北'][this.roundWindIdx] + '）';
        // 庄家若为 1 位 → 向最低点付 2100 点
        const maxS = Math.max.apply(null, this.scores);
        if (this.scores[this.dealerIndex] === maxS) {
            let lowIdx = 0;
            for (let i = 1; i < 4; i++) if (this.scores[i] < this.scores[lowIdx]) lowIdx = i;
            if (lowIdx !== this.dealerIndex) {
                this.scores[this.dealerIndex] -= 2100;
                this.scores[lowIdx] += 2100;
                log += '；庄家为 1 位 → 向最低点 ' + this.players[lowIdx].name + ' 付 2100 点';
            }
        }
        return log;
    }

    // 构建流局 overlay：4 家手牌 + 听牌判定
    buildFlowOverlay() {
        if (typeof listTenpai !== 'function') return '';
        let html = '<div style="margin-top:6px;font-size:13px;text-align:left;max-height:300px;overflow:auto">';
        for (let pi = 0; pi < 4; pi++) {
            const p = this.players[pi];
            html += '<div style="margin:6px 0;border-bottom:1px dashed #666">' + seatLabel(p) + '</div>';
            html += '<div style="font-family:Consolas,monospace;margin-left:8px">' +
                '手牌: ' + (handToStr(p.hand) || '∅') +
                (p.melds.length ? ' 副露: ' + meldsToStr(p.melds) : '') + '</div>';
            // 听牌判定
            const tp = listTenpai(this.checker, p.hand.slice(), p.melds, {
                hasCalled: p.melds.length > 0 || p.minkanCount > 0,
                ankanCount: p.ankanCount, minkanCount: p.minkanCount,
                firstTurn: p.firstTurn, discards: p.discards,
                seatWind: p.seatWind,
                roundWind: this.roundWind
            });
            const winTiles = tp.filter(x => x.success).map(x => x.tile);
            const noYaku = tp.filter(x => x.noYakuGap > 0);
            if (winTiles.length) {
                html += '<div style="margin-left:16px;color:#8dff8d">听牌: ' + winTiles.join(' ') + '</div>';
            } else if (noYaku.length) {
                const worst = noYaku.reduce((a,b)=>Math.max(a,b.noYakuGap),0);
                html += '<div style="margin-left:16px;color:#ffd84a">不成听 · 差' + worst + '赋达起和(no_yaku)</div>';
            } else {
                html += '<div style="margin-left:16px;color:#ff9">不听牌</div>';
            }
        }
        html += '</div>';
        return html;
    }

    calcPoints(fu) {
        if (fu >= 28) return 35000;
        const th = this.config.points.thresholds || [7,14,21,28];
        const bl = this.config.points.baselines || [0,7000,14000,28000,35000];
        const per = this.config.points.perFu || 700;
        let baseline = bl[0], threshold = 0;
        for (let i = th.length - 1; i >= 0; i--) { if (fu >= th[i]) { baseline = bl[i+1]; threshold = th[i]; break; } }
        return baseline + (fu - threshold) * per;
    }

    // 子家点数（最终口径，已确认）：
    //  · 人和（5.4）/ 三国将副露（6.1）—— 固定点数役，**扁平返回**，不叠加任何表外赋；
    //  · 全带赤（6.1）—— 不走赋位表：14000 +（其他正式役赋数之和）× 700，再加表外赋；
    //  · 其余 —— calcPoints(【表内赋】) + 【表外赋】× 700。
    //
    // 表外赋 = 5.5 听牌型奖赏 + 赐马：**不计入起和门槛，也不并入总赋查表**，
    // 而是按 700 点/个直接相加（面板上役名后加「※」）。这样避免了查表跳跃把 700 放大。
    calcFinalPoints(result, fu) {
        const ys = (result && result.activeYaku) || [];
        // 固定点数役最高优先：直接返回该固定点数（人和 7000 / 三国将副露 7000）
        const fx = ys.find(y => y.fixedPoints != null);
        if (fx) return fx.fixedPoints;
        const tableless = ys.filter(y => y.isBonus || y.ma).reduce((a, y) => a + y.fu, 0);
        let base;
        if (result && result.specialPoints != null) {
            base = result.specialPoints + tableless * 700;
        } else {
            const inTable = fu - tableless;      // 表内赋（可用赋位表查）
            base = this.calcPoints(inTable) + tableless * 700;
        }
        // 表外点数加项：倍满 +7000 点（6.1 南北通）
        const pb = ys.reduce((a, y) => a + (y.pointsBonus || 0), 0);
        return base + pb;
    }

    // 连庄奖励（8.1：「700 点 / 根」）：本场数每 +1 加 700 点，不论庄家，扁平相加。
    honbaBonus() {
        return 700 * (this.honba || 0);
    }

    isNineOrphans(hand) {
        const types = new Set();
        for (let t of hand) {
            if (t.suit === 'z') types.add(t.id);
            else if (t.num === 1 || t.num === 9) types.add(t.id);
        }
        return types.size >= 9;
    }

    // 十三不靠（4.3，推牌流局）：13 张手牌 = 三花色各一组「147 / 258 / 369」不靠顺
    // （三种进度互不重复地分配给万/饼/索）+ 4 张互不相同的字牌（东南西北白发中任选）。
    // 例：147m 258p 369s + 4 张不同字牌  →  9 + 4 = 13 张。
    isThirteenUnrelated(hand) {
        if (!hand || hand.length !== 13) return false;
        const m = countTiles(hand);
        // 字牌：恰好 4 张，且两两不同（字牌不得成对）
        let honorCount = 0;
        for (const [id, c] of m) {
            if (id[0] !== 'z') continue;
            if (c !== 1) return false;
            honorCount += c;
        }
        if (honorCount !== 4) return false;
        // 三花色：各恰好 3 张、每张 1 张，且构成 147 / 258 / 369 之一
        const PROGRESSIONS = ['147', '258', '369'];
        const used = [];
        for (const suit of ['m', 'p', 's']) {
            const nums = [];
            for (let n = 1; n <= 9; n++) {
                const c = m.get(suit + n) || 0;
                if (c > 1) return false;
                if (c === 1) nums.push(n);
            }
            if (nums.length !== 3) return false;
            const key = nums.join('');
            if (PROGRESSIONS.indexOf(key) === -1) return false;
            used.push(key);
        }
        // 三种进度各用一次（万/饼/索 的分配可任意排列）
        return new Set(used).size === 3;
    }

    // 当前手牌可用的推牌流局条件名（供统一「流局」按钮显示与执行）
    flowOptions(hand) {
        const opts = [];
        if (this.isNineOrphans(hand)) opts.push('九种九牌');
        if (this.isThirteenUnrelated(hand)) opts.push('十三不靠');
        return opts;
    }

    // ── 模式 / 场次 ──
    setMode(target) {
        this.modeTarget = target;
        this.handsPlayed = 0;
        this.roundWindIdx = 0;
        this.dealerCount = 0;
        // 场次初始点数（8.2）：东风战 / 半庄战 49000；全庄战 77000
        this.initialPoints = (target >= 16) ? 77000 : 49000;
        this.scores = [this.initialPoints, this.initialPoints, this.initialPoints, this.initialPoints];
        this.rankPoints = [0,0,0,0];
        // 终局场风（8.2 场次类型）：一局=东；东风战=东；半庄战=东南；全庄战=东南西北
        this.finalWindIdx = (target >= 16) ? 3 : (target >= 8) ? 1 : (target === 1 ? 0 : 0);
        this.matchOver = false;
        this.juFinished = false;
        this._weekEndHandled = false;
    }

    roundLabel() {
        const wn = ['东','南','西','北'];
        const wind = this.roundWindIdx % 4;        // 场风
        const n = (this.dealerCount % 4) + 1;      // 本场内的第几手（1-4）
        return wn[wind] + n + '局';
    }

    // 一局结束：推进局数 / 检查终局 / 结算段位点
    advanceRound() {
        // 已终局（含大七星直接获胜 / 出岭）则不再推进
        if (this.matchOver) return false;
        if (this.gameOver && this.handsPlayed >= this.modeTarget) return false;
        this.handsPlayed++;
        this.reportRound();        // 每手统一记一次 rounds
        this.saveSessionState();   // 存档必须在 handsPlayed 更新之后，inProgress 才准确

        const rank = this.scores.slice().map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s);
        const top = rank[0].s;
        let over = false;
        if (this.modeTarget === 1) {
            over = true;                                          // 一局制：一手即终
        } else if (this.roundWindIdx > this.finalWindIdx && top >= this.initialPoints) {
            // 场风走完 + 1 位达到初始点数 → 终局（8.2）；否则延长（再打一圈）
            over = true;
        }
        if (this.handsPlayed >= this.modeTarget * 6) over = true;  // 安全上限，避免无限延长

        if (over) {
            this.state = 'ended';
            this.gameOver = true;
            this.matchOver = true;
            this.settleRankPoints();
            const summary = rank.map((r,i)=>(i+1)+'位 ' + this.players[r.i].name +
                ' (' + (r.s>=0?'+':'') + r.s + '，段位' + (this.rankPoints[r.i]>=0?'+':'') + this.rankPoints[r.i].toFixed(1) + ')').join(' · ');
            gameLog('终局 ' + summary);
            if (typeof showMsg === 'function') showMsg('🏁 对局结束! ' + summary, true);
            if (typeof renderAll === 'function') renderAll();
            try {
                fetch('/api/state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inProgress: false, savedAt: new Date().toISOString() }),
                    keepalive: true
                }).catch(() => {});
            } catch(e) {}
            return false;
        }
        return true;
    }

    // 段位点（8.3）：起始 0 分；每 700 点 = 0.1 分（余数 ≥350 进位 700）；
    // 次位赏：1 位 +14、2 位 +7、3 位 0、4 位 −7。
    settleRankPoints() {
        const rank = this.scores.slice().map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s);
        const bonus = [14, 7, 0, -7];
        for (let order = 0; order < 4; order++) {
            const i = rank[order].i;
            const diff = this.scores[i] - this.initialPoints;
            let units = Math.trunc(diff / 700);
            const rem = diff - units * 700;
            if (rem >= 350) units += 1;
            if (rem <= -350) units -= 1;
            this.rankPoints[i] = Math.round((bonus[order] + units * 0.1) * 10) / 10;
        }
    }

    // ── 主视角行动区（荣和/吃碰杠 + 倒计时）：存状态，由 index.html 的 renderActionArea 绘制 ──
    hideActionBar() {
        if (this.ronTimeout) { clearTimeout(this.ronTimeout); this.ronTimeout = null; }
        if (this.meldTimeout) { clearTimeout(this.meldTimeout); this.meldTimeout = null; }
        if (this._actTicker) { clearInterval(this._actTicker); this._actTicker = null; }
        this._actOpts = null;
        this._actMsg = '';
        this._actLeft = 0;
        if (typeof renderActionArea === 'function') renderActionArea();
    }

    showAction(msg, opts, seconds, onExpire) {
        this._actMsg = msg;
        this._actOpts = opts;
        this._actLeft = seconds;
        this._actOnExpire = onExpire;
        if (this._actTicker) clearInterval(this._actTicker);
        this._actTicker = setInterval(() => {
            this._actLeft--;
            if (typeof renderActionArea === 'function') renderActionArea();
            if (this._actLeft <= 0) {
                clearInterval(this._actTicker);
                this._actTicker = null;
                this._actOpts = null;
                this._actLeft = 0;
                onExpire();
            }
        }, 1000);
        if (typeof renderActionArea === 'function') renderActionArea();
    }

    // ── 完整重置（回到未开局状态）──
    resetAll() {
        this.clearAllTimers();
        this.hideActionBar();
        this._firstDeal = true;
        this.players.forEach(p => { p.isHuman = (p.name === '你'); });
        this.scores = [this.initialPoints || 0, this.initialPoints || 0, this.initialPoints || 0, this.initialPoints || 0];
        this.rankPoints = [0,0,0,0];
        this.speed = 250;
        this.dealerIndex = 0;
        this.honba = 0;
        this.state = 'idle';
        this._demoMode = false;
        this._allAI = false;
        this.lastRonMulti = [];
        this.players.forEach(p => { p.isDealer = false; p.hand = []; p.discards = []; p.melds = []; });
        this.players[0].isDealer = true;
        this.turnIndex = 0;
        this.wall = [];
        this.rinshan = [];
        this.wangDui = [];
        this.handsPlayed = 0;
        this.handNumber = 0;
        this.roundWindIdx = 0;
        this.dealerCount = 0;
        this.updateSeatWinds();
        try {
            fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inProgress: false, savedAt: new Date().toISOString() }),
                keepalive: true
            }).catch(() => {});
        } catch(e) {}
    }

    // ── 运行时命令（debug.html / 键盘快捷键 / 轮询）──
    executeCommand(cmd) {
        if (!cmd || typeof cmd !== 'object') return 'noop';
        switch (cmd.action) {
            case 'next':
                if (this.state === 'ended' || this.gameOver) {
                    // 已终局 → 开始一场全新比赛（分数/局数/庄家全部重置）
                    if (this.handsPlayed >= this.modeTarget) {
                        this.resetAll();
                        if (typeof startMode === 'function') { startMode(this.modeTarget, false); }
                        else { this.setMode(this.modeTarget); this.handNumber = 1; this.startNewRound(); }
                        return 'next-new-game';
                    }
                    if (this.advanceRound()) { this.handNumber++; this.startNewRound(); }
                    return 'next';
                }
                return 'next-busy';
            case 'auto': {
                this._allAI = !this._allAI;
                this.players.forEach(p => p.isHuman = this._allAI ? false : (p.name === '你'));
                if (this._allAI) {
                    this.speed = cmd.speed || this.speed || 250;
                    this._demoMode = true;
                    this.handNumber++;
                    this.startNewRound();
                } else {
                    this.stopAuto();
                }
                return 'auto:' + this._allAI;
            }
            case 'reset':
                this.resetAll();
                return 'reset';
            case 'flow':
                this.humanFlow();
                return 'flow';
            case 'setHand':
                if (cmd.hand) {
                    const tiles = (typeof parseTileString === 'function') ? parseTileString(cmd.hand) : null;
                    if (tiles && tiles.length === 14) {
                        const p = this.players[this.humanIdx];
                        p.hand = tiles; sortHand(p.hand);
                        p._lastDraw = null;
                        this.state = 'human_discard';
                        if (typeof renderAll === 'function') renderAll();
                        return 'setHand';
                    }
                }
                return 'setHand-invalid';
            case 'speed':
                if (cmd.speed) { this.speed = cmd.speed; return 'speed'; }
                return 'speed-invalid';
            case 'optional':
                if (this.checker && cmd.id) {
                    if (cmd.on) this.checker.optionalEnabled.add(cmd.id);
                    else this.checker.optionalEnabled.delete(cmd.id);
                    return 'optional';
                }
                return 'optional-invalid';
            case 'record':
                this.recordTiles = !!cmd.on;
                return 'record';
            case 'render':
                if (typeof renderAll === 'function') renderAll();
                return 'render';
            default:
                return 'unknown';
        }
    }

    // 会话恢复：加载 /api/state 存档并应用到本实例（从下一局继续）
    applySavedState(state) {
        if (!state || !state.inProgress) return false;
        if (state.playerUUID && this.playerUUID && state.playerUUID !== this.playerUUID) return false;
        this.modeTarget = state.modeTarget || this.modeTarget;
        this.handsPlayed = state.handsPlayed || 0;
        this.handNumber = state.handNumber || 0;
        this.scores = (state.scores && state.scores.length === 4) ? state.scores.slice() : [0,0,0,0];
        this.dealerIndex = state.dealerIndex || 0;
        this.honba = state.honba || 0;
        this.roundWindIdx = state.roundWindIdx || 0;
        this.dealerCount = state.dealerCount || 0;
        this.initialPoints = (this.modeTarget >= 16) ? 77000 : 49000;
        this._firstDeal = false; // 已定庄过
        this.updateSeatWinds();
        gameLog('恢复存档: ' + this.roundLabel() + ' / ' + this.modeTarget + '局 · 从下一局继续');
        return true;
    }

    // ════════ 牌型记录（recordTiles 开启时） ════════

    // 追加一条该玩家的本局日志
    recordStep(playerIdx, action, tileStr) {
        if (!this.recordTiles) return;
        if (!this._logEntries) this._logEntries = {};
        if (!this._logEntries[playerIdx]) this._logEntries[playerIdx] = [];
        const p = this.players[playerIdx];
        const ctx = '[' + this.roundLabel() + (this.honba ? ' ' + this.honba + '本场' : '') + '] ' +
            seatLabel(p) + ' ' + action +
            (tileStr ? ' ' + tileStr : '') +
            ' | 手牌=' + (handToStr(p.hand) || '∅') +
            (p.melds.length ? ' 副露=' + meldsToStr(p.melds) : '') +
            (p.discards.length ? ' 弃牌=' + discardsToStr(p.discards) : '') +
            ' | 牌山' + this.wall.length + ' 岭上' + this.rinshan.length;
        this._logEntries[playerIdx].push(ctx);
    }

    // 写入某玩家本局日志（含上下文头），返回格式串
    recordRoundHeader(playerIdx) {
        const p = this.players[playerIdx];
        return '=== ' + this.roundLabel() + (this.honba ? ' ' + this.honba + '本场' : '') +
            ' · ' + seatLabel(p) + ' · UUID=' + (p.uuid || '') + ' ===';
    }

    // 局末：将该玩家本局记录写入对应会话日志文件夹
    flushRoundLog(playerIdx) {
        if (!this.recordTiles) return;
        const p = this.players[playerIdx];
        const entries = (this._logEntries && this._logEntries[playerIdx]) || [];
        const header = this.recordRoundHeader(playerIdx);
        const body = entries.join('\n');
        const payload = header + '\n' + body;
        try {
            fetch('/api/roundlog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: (typeof __SESSION__ !== 'undefined' ? __SESSION__ : ''),
                    round: this.handNumber,
                    player: p.name,
                    playerUUID: p.uuid || '',
                    entry: payload
                }),
                keepalive: true
            }).catch((e) => this._queueRoundlog(payload, e));
        } catch(e) { this._queueRoundlog(payload, e); }
        if (this._logEntries) delete this._logEntries[playerIdx];
    }

    // 详档 POST 失败回退：暂存 sessionStorage，服务可用后补发（错误可见）
    _queueRoundlog(payload, err) {
        if (typeof console !== 'undefined' && console.error) console.error('[api/roundlog]', err || 'failed');
        try {
            if (typeof sessionStorage === 'undefined') return;
            let q = [];
            try { q = JSON.parse(sessionStorage.getItem('roundlog_pending') || '[]'); } catch(e) {}
            if (!Array.isArray(q)) q = [];
            q.push({ ts: Date.now(), payload: payload });
            if (q.length > 50) q = q.slice(-50);
            sessionStorage.setItem('roundlog_pending', JSON.stringify(q));
        } catch(e2) {}
    }

    // 清空本局待写日志（新局开始）
    clearRoundLogs() {
        this._logEntries = {};
    }
}
