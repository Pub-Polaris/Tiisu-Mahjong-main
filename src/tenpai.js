// ══════════════════════════════════════════════════════════════
// tenpai.js — 听牌判定
// 依赖：tiles.js (createDeck), winchecker.js (checkWin)
// 对 34 种牌逐一模拟加入暗手，返回可和牌与 no_yaku 差赋
// ══════════════════════════════════════════════════════════════

/**
 * @param {WinChecker} checker
 * @param {Array} hand     13 张暗手
 * @param {Array} melds    固定面子（副露）
 * @param {Object} opts    {hasCalled, ankanCount, minkanCount, firstTurn, discards, winSelfDraw, seatWind, roundWind}
 * @returns {Array<{tile:string, success:boolean, totalFu:number, noYakuGap:number}>}
 */
function listTenpai(checker, hand, melds, opts) {
    opts = opts || {};
    const result = [];
    const deck = createDeck();               // 34 种牌各 4 张
    const seen = new Set();
    for (let t of deck) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        // 剩余张数（暗手+副露已用）
        const used = hand.filter(x => x.id === t.id).length +
            (melds||[]).reduce((a,m)=>a+m.tiles.filter(x=>x.id===t.id).length,0);
        if (used >= 4) continue;             // 该牌已尽
        const trial = hand.slice().concat([{suit:t.suit,num:t.num,id:t.id}]);
        const r = checker.checkWin(
            trial, opts.winSelfDraw !== false, opts.hasCalled || false,
            opts.ankanCount || 0, opts.minkanCount || 0,
            melds || [], opts.kans || [],
            opts.firstTurn || false,
            opts.discards || [], {suit:t.suit,num:t.num,id:t.id},
            { seaMoon:false, haiDei:false, riverFish:false, lastTileVisible:0,
              seatWind: opts.seatWind, roundWind: opts.roundWind }
        );
        const noYakuGap = (r && r.reason === 'no_yaku') ? (checker.baseFu - (r.totalFu||0)) : 0;
        result.push({
            tile: tileToStr(t),
            success: !!(r && r.success),
            totalFu: (r && r.totalFu) || 0,
            noYakuGap: noYakuGap
        });
    }
    return result;
}
