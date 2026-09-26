/**
 * aiPlayer.js - 七子麻将智能出牌策略（速和版）
 * 目标：做牌偏向速和（快速凑齐面子+雀头），而非无脑追大牌（清一色/暗刻）
 * 策略权重：
 *  - 对子/刻子（已成型面子）价值最高
 *  - 与邻牌成搭子（顺子潜力）次之
 *  - 花色集中度权重大幅降低，仅在大量同色时才轻微加分
 *  - 孤立字牌/幺九优先弃
 */

/**
 * 获取 AI 推荐弃牌的索引
 * @param {Array} hand - 手牌数组（对象数组，含 suit, num, id）
 * @param {Object} game - 游戏实例（用于获取牌山等）
 * @returns {number} 要弃掉的牌在 hand 中的索引
 */
function getAIDiscardIndex(hand, game = null) {
    if (!hand || hand.length === 0) return -1;

    // 1. 花色占比作为极弱权重（仅大量同色时微调，不主导决策）
    let suitStrength = { m: 0, p: 0, s: 0, z: 0 };
    const total = hand.length;
    hand.forEach(t => { suitStrength[t.suit] = (suitStrength[t.suit] || 0) + 1; });
    for (let s in suitStrength) suitStrength[s] = (suitStrength[s] / total) * 100;

    // 2. 统计每张牌的出现次数
    const tileCount = new Map();
    hand.forEach(t => {
        tileCount.set(t.id, (tileCount.get(t.id) || 0) + 1);
    });

    // 顺子搭子：该花色内有相邻牌（差值1）或隔一张（差值2，如 3-5 等5）
    function hasNeighbor(t, hand) {
        if (t.suit === 'z') return false;
        return hand.some(h => h.suit === t.suit && (Math.abs(h.num - t.num) === 1 || Math.abs(h.num - t.num) === 2));
    }

    // 邻牌数量：决定后续进张效率（速和关键）
    function neighborCount(t, hand) {
        if (t.suit === 'z') return 0;
        let c = 0;
        for (let n of [t.num - 2, t.num - 1, t.num + 1, t.num + 2]) {
            if (n < 1 || n > 9) continue;
            if (hand.some(h => h.suit === t.suit && h.num === n)) c++;
        }
        return c;
    }

    // 中心度：孤立数牌 3-7 进张面最广，1/9 最差
    function centerBonus(num) {
        if (num >= 3 && num <= 7) return 8;
        if (num === 2 || num === 8) return 0;
        return -6;
    }

    const scores = hand.map((t) => {
        let score = 0;
        const count = tileCount.get(t.id) || 0;

        // 面子成型：对子/刻子价值最高（速和核心）
        if (count >= 2) score += 28;
        if (count >= 3) score += 38;
        if (count >= 4) score += 48;

        // 花色集中度：仅微弱权重，避免无脑清一色
        const suitPct = suitStrength[t.suit] || 0;
        score += suitPct * 0.05;

        // 顺子搭子（有相邻或隔张）→ 快速成型
        if (hasNeighbor(t, hand)) {
            score += 20;
            score += neighborCount(t, hand) * 3;
        }

        // 字牌：成对保留，孤张必弃（最阻碍速和）
        if (t.suit === 'z') {
            if (count >= 2) score += 14;
            else score -= 14;
        } else {
            // 孤立数牌：中心度高者留，幺九弃
            const sameSuitCount = hand.filter(h => h.suit === t.suit).length;
            if (sameSuitCount === 1 && count === 1) {
                score += centerBonus(t.num) - 14;
            }
            // 已与面子衔接的边张自然得分
            if (count === 1 && !hasNeighbor(t, hand) && sameSuitCount > 1) {
                score += centerBonus(t.num);
            }
        }

        return score;
    });

    let minScore = Infinity;
    let minIdx = 0;
    scores.forEach((s, idx) => {
        if (s < minScore) {
            minScore = s;
            minIdx = idx;
        }
    });

    if (scores.every(s => s === minScore)) {
        return Math.floor(Math.random() * hand.length);
    }

    return minIdx;
}
