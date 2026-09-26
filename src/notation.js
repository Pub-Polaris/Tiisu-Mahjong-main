// ══════════════════════════════════════════════════════════════
// notation.js — 牌型标准记号（人类可读，供日志/计分文本）
// 依赖：tiles.js (sortHand)
// 示例："123m456p789s1122z"，字牌 1z东 2z南 3z西 4z北 5z白 6z发 7z中
// ══════════════════════════════════════════════════════════════

// 单张牌记号：数牌 "5m"；字牌 "1z"
function tileToStr(t) {
    if (!t) return '?';
    if (t.suit === 'z') return t.num + 'z';
    return t.num + t.suit;
}

// 手牌 → "123m456p789s1122z"（已排序分组）
function handToStr(hand) {
    if (!hand || hand.length === 0) return '';
    const sorted = hand.slice();
    sortHand(sorted);
    // 分组：同花色相邻段
    const parts = [];
    let i = 0;
    while (i < sorted.length) {
        const t = sorted[i];
        let j = i;
        while (j < sorted.length && sorted[j].suit === t.suit &&
               (t.suit !== 'z' ? true : true)) {
            // 收集同花色，再按数字排序拼接
            j++;
        }
        const group = sorted.slice(i, j);
        group.sort((a,b) => (a.suit==='z' ? a.num : a.num) - (b.suit==='z' ? b.num : b.num));
        let nums = '';
        for (let g of group) nums += (g.suit==='z' ? g.num : g.num);
        parts.push(nums + t.suit);
        i = j;
    }
    return parts.join('');
}

// 副露 → "吃:234m 碰:888m 杠:8888m 暗杠:6666p 加杠:55z"
function meldsToStr(melds) {
    if (!melds || melds.length === 0) return '';
    const mtype = {chi:'吃',pon:'碰',minkan:'杠',ankan:'暗杠',kakan:'加杠'};
    return melds.map(m => {
        const nums = m.tiles.map(t => (t.suit==='z' ? t.num : t.num)).join('');
        return (mtype[m.type]||m.type) + ':' + nums + m.tiles[0].suit;
    }).join(' ');
}

// 弃牌河 → "1m 4m 7m"
function discardsToStr(discards) {
    if (!discards || discards.length === 0) return '';
    return discards.map(tileToStr).join(' ');
}

// 座次标记：东/南/西/北 + 名字 + 庄/立直
function seatLabel(p) {
    const wn = {east:'东',south:'南',west:'西',north:'北'};
    const s = wn[p.seatWind] || p.seatWind || '';
    let label = s + '家(' + p.name;
    if (p.isDealer) label += '·庄';
    if (p.riichi) label += '·立直';
    label += ')';
    return label;
}

// 玩家完整牌型快照（含副露/弃牌）
function playerNotation(p) {
    return seatLabel(p) +
        ' 手牌[' + p.hand.length + ']=' + (handToStr(p.hand) || '∅') +
        (p.melds.length ? ' 副露=' + meldsToStr(p.melds) : '') +
        (p.discards.length ? ' 弃牌=' + discardsToStr(p.discards) : '');
}
