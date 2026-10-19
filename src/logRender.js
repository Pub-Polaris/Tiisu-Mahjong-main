// ══════════════════════════════════════════════════════════════
// logRender.js — 把机器可读的牌型事件（JSONL）渲染成原来的中文日志行。
//
// 存储层（engine.js → /api/roundlog → logs/**.jsonl）只使用 ASCII 字段；
// 本文件是唯一的“汉字生成层”，供 logview.html / 调试脚本使用。
//
// 事件 schema（v1）
//   round: {type:"round", round, honba, player, name, wind, dealer, riichi,
//           uuid, session, roundWindIdx, dealerCount, extension}
//   step : {type:"step", a, p, t?, hand, melds:[{k,t}], discards:[t],
//           wall, rinshan, h, rw, dc, x, w, d, r, reason?, via?}
//
// 动作码 a：
//   draw discard pon chi kan_minkan kan_ankan kan_kakan rinshan_draw
//   win_tsumo win_ron observe special_flow flow tiisuin_win witness
//
// 流局/特殊流局 reason 码：
//   exhaustive nine_orphans thirteen_unrelated
//   four_wind_repeat triple_ron triple_ron_chankan special
// ══════════════════════════════════════════════════════════════
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.TiisuLogRender = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const WIND_CN = { east: '东', south: '南', west: '西', north: '北' };
    const PLAYER_CN = {
        human: '你',
        ai_south: 'AI 南',
        ai_west: 'AI 西',
        ai_north: 'AI 北'
    };
    const ACTION_CN = {
        draw: '摸',
        discard: '出',
        pon: '碰',
        chi: '吃',
        kan_minkan: '明杠',
        kan_ankan: '暗杠',
        kan_kakan: '加杠',
        win_tsumo: '自摸和牌',
        win_ron: '荣和和牌',
        observe: '旁观',
        tiisuin_win: '大七星直接获胜',
        witness: '见证'
    };
    const MELD_CN = {
        chi: '吃',
        pon: '碰',
        minkan: '杠',
        ankan: '暗杠',
        kakan: '加杠'
    };
    const HONOR_CN = { 1: '东', 2: '南', 3: '西', 4: '北', 5: '白', 6: '发', 7: '中' };

    function roundLabel(roundEvent) {
        if (!roundEvent) return '';
        const idx = Number(roundEvent.roundWindIdx) || 0;
        const n = ((Number(roundEvent.dealerCount) || 0) % 4) + 1;
        const wind = WIND_CN[['east', 'south', 'west', 'north'][((idx % 4) + 4) % 4]];
        if (roundEvent.extension) {
            return (idx % 4 === 0 ? '北增' : wind + '入') + n + '局';
        }
        return wind + n + '局';
    }

    function honbaSuffix(roundEvent) {
        const honba = Number(roundEvent && roundEvent.honba) || 0;
        return honba ? ' ' + honba + '本场' : '';
    }

    function playerName(roundEvent, playerIndex) {
        if (roundEvent && roundEvent.name && PLAYER_CN[roundEvent.name]) {
            return PLAYER_CN[roundEvent.name];
        }
        if (roundEvent && typeof roundEvent.player === 'number') {
            const slug = ['human', 'ai_south', 'ai_west', 'ai_north'][roundEvent.player];
            if (slug) return PLAYER_CN[slug];
        }
        const slug = ['human', 'ai_south', 'ai_west', 'ai_north'][playerIndex];
        return (slug && PLAYER_CN[slug]) || ('P' + (playerIndex || 0));
    }

    function seatLabel(roundEvent, playerIndex) {
        const wind = (roundEvent && roundEvent.wind) || '';
        let label = (WIND_CN[wind] || wind || '?') + '家(' +
            playerName(roundEvent, playerIndex);
        if (roundEvent && roundEvent.dealer) label += '·庄';
        if (roundEvent && roundEvent.riichi) label += '·立直';
        return label + ')';
    }

    function tileDisplayFromCode(code) {
        if (!code || typeof code !== 'string') return '?';
        let match = /^(\d)([mpsz])$/.exec(code);
        if (!match) {
            const reversed = /^([mpsz])(\d)$/.exec(code);
            if (reversed) match = [code, reversed[2], reversed[1]];
        }
        if (!match) return code;
        const num = match[1];
        const suit = match[2];
        if (suit === 'm') return num + '万';
        if (suit === 'p') return num + '饼';
        if (suit === 's') return num + '索';
        return HONOR_CN[num] || num;
    }

    function meldsText(melds) {
        if (!melds || !melds.length) return '';
        return melds.map(m => (MELD_CN[m.k] || m.k) + ':' + (m.t || '')).join(' ');
    }

    function discardsText(discards) {
        if (!discards || !discards.length) return '';
        return discards.join(' ');
    }

    function reasonLabel(ev) {
        switch (ev.reason) {
            case 'four_wind_repeat':
                return '四风连打（' + tileDisplayFromCode(ev.t) + '）';
            case 'triple_ron':
                return '三家和牌 → 自动流局';
            case 'triple_ron_chankan':
                return '三家和牌（抢杠）→ 自动流局';
            case 'nine_orphans':
                return '九种九牌';
            case 'thirteen_unrelated':
                return '十三不靠';
            case 'exhaustive':
                return '流局';
            case 'special':
                return '特殊流局';
            default:
                return ev.reason || '特殊流局';
        }
    }

    function actionText(ev) {
        switch (ev.a) {
            case 'special_flow':
                return '特殊流局:' + reasonLabel(ev);
            case 'flow':
                if (ev.reason === 'nine_orphans') return '九种九牌流局';
                if (ev.reason === 'thirteen_unrelated') return '十三不靠流局';
                return '流局';
            case 'rinshan_draw':
                return '明杠补摸' + (ev.via === 'wall' ? '（牌山）' : '岭上');
            case 'kan_ankan':
            case 'kan_kakan':
                return (ACTION_CN[ev.a] || ev.a) + '·岭上摸';
            default:
                return ACTION_CN[ev.a] || ev.a || '?';
        }
    }

    function renderRoundHeader(roundEvent) {
        return '=== ' + roundLabel(roundEvent) + honbaSuffix(roundEvent) +
            ' · ' + seatLabel(roundEvent, roundEvent.player) +
            ' · UUID=' + (roundEvent.uuid || '') + ' ===';
    }

    function stepContext(ev, roundEvent) {
        // Step events carry a snapshot of honba / round wind / seat state because
        // the legacy text log rendered each line with the state at that moment.
        return {
            player: ev.p,
            name: roundEvent && roundEvent.name,
            honba: ev.h != null ? ev.h : (roundEvent && roundEvent.honba),
            roundWindIdx: ev.rw != null ? ev.rw : (roundEvent && roundEvent.roundWindIdx),
            dealerCount: ev.dc != null ? ev.dc : (roundEvent && roundEvent.dealerCount),
            extension: ev.x != null ? !!ev.x : (roundEvent && !!roundEvent.extension),
            wind: ev.w || (roundEvent && roundEvent.wind),
            dealer: ev.d != null ? !!ev.d : (roundEvent && roundEvent.dealer),
            riichi: ev.r != null ? !!ev.r : (roundEvent && roundEvent.riichi)
        };
    }

    function renderStep(ev, roundEvent) {
        const ctx = stepContext(ev, roundEvent);
        const prefix = '[' + roundLabel(ctx) + honbaSuffix(ctx) + '] ' +
            seatLabel(ctx, ev.p) + ' ' + actionText(ev);
        const tile = (ev.a === 'special_flow' || ev.a === 'flow') ? '' :
            (ev.t ? ' ' + ev.t : '');
        const melds = meldsText(ev.melds);
        const discards = discardsText(ev.discards);
        return prefix + tile +
            ' | 手牌=' + (ev.hand || '∅') +
            (melds ? ' 副露=' + melds : '') +
            (discards ? ' 弃牌=' + discards : '') +
            ' | 牌山' + (ev.wall == null ? '?' : ev.wall) +
            ' 岭上' + (ev.rinshan == null ? '?' : ev.rinshan);
    }

    function renderEvent(ev, roundEvent) {
        if (!ev) return '';
        if (ev.type === 'round') return renderRoundHeader(ev);
        if (ev.type === 'step') return renderStep(ev, roundEvent || null);
        return '';
    }

    function renderEvents(events) {
        const out = [];
        let roundEvent = null;
        for (const ev of events || []) {
            if (!ev) continue;
            if (ev.type === 'round') {
                roundEvent = ev;
                out.push(renderRoundHeader(ev));
            } else if (ev.type === 'step') {
                out.push(renderStep(ev, roundEvent));
            }
        }
        return out.join('\n');
    }

    function parseJsonl(text) {
        const events = [];
        for (const line of String(text || '').split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                events.push(JSON.parse(trimmed));
            } catch (e) {
                // Keep the viewer alive for partially written lines.
            }
        }
        return events;
    }

    function renderJsonl(text) {
        return renderEvents(parseJsonl(text));
    }

    return {
        WIND_CN,
        PLAYER_CN,
        ACTION_CN,
        MELD_CN,
        roundLabel,
        seatLabel,
        actionText,
        reasonLabel,
        renderRoundHeader,
        renderStep,
        renderEvent,
        renderEvents,
        parseJsonl,
        renderJsonl
    };
});
