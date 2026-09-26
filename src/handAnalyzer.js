// ══════════════════════════════════════════════════════════════
// handAnalyzer.js — 手牌直觉提示（只给人看，不影响任何判役/计分）
// 作用：分析一手牌的花色构成 / 幺九分布 / 字牌类型，
//       生成一句"你这手牌大概想做什么"的提示文字，显示在界面"手牌分析"栏。
// 纯展示用途：判役、计分、回合逻辑都不依赖它，改坏了也不影响对局。
// ══════════════════════════════════════════════════════════════

function analyzeHand(hand) {
    if (!hand || hand.length === 0) return null;
    const suitCount = { m: 0, p: 0, s: 0, z: 0 };
    const numDistribution = { low: 0, mid: 0, high: 0 };
    const honorTypes = { wind: 0, dragon: 0 };
    const tileCountMap = new Map();
    hand.forEach(t => {
        suitCount[t.suit] = (suitCount[t.suit] || 0) + 1;
        if (t.suit !== 'z') {
            const n = t.num;
            if (n >= 1 && n <= 3) numDistribution.low++;
            else if (n >= 4 && n <= 6) numDistribution.mid++;
            else if (n >= 7 && n <= 9) numDistribution.high++;
        } else {
            if (['1','2','3','4'].includes(t.num)) honorTypes.wind++;
            else honorTypes.dragon++;
        }
        tileCountMap.set(t.id, (tileCountMap.get(t.id) || 0) + 1);
    });
    let pairs = 0, pungs = 0, kongs = 0;
    for (let count of tileCountMap.values()) {
        if (count >= 4) kongs++;
        else if (count >= 3) pungs++;
        else if (count >= 2) pairs++;
    }
    const total = hand.length;
    const suitPercent = {
        m: (suitCount.m / total * 100).toFixed(1),
        p: (suitCount.p / total * 100).toFixed(1),
        s: (suitCount.s / total * 100).toFixed(1),
        z: (suitCount.z / total * 100).toFixed(1)
    };
    let maxSuit = 'z', maxCount = suitCount.z;
    for (let s of ['m','p','s']) { if (suitCount[s] > maxCount) { maxCount = suitCount[s]; maxSuit = s; } }
    const suitNames = { m: '万', p: '饼', s: '索', z: '字' };
    let numTendency = '均衡';
    const totalNum = hand.filter(t => t.suit !== 'z').length;
    if (totalNum > 0) {
        const lowRatio = numDistribution.low / totalNum;
        const highRatio = numDistribution.high / totalNum;
        if (lowRatio > 0.5) numTendency = '偏小（幺九多）';
        else if (highRatio > 0.5) numTendency = '偏大（老头多）';
        else if (numDistribution.mid / totalNum > 0.6) numTendency = '偏中张';
        else numTendency = '分布均匀';
    }
    let description = '';
    const maxSuitName = suitNames[maxSuit] || '字';
    if (maxSuit !== 'z' && suitPercent[maxSuit] >= 40) {
        description += `★ 强花色：${maxSuitName}（${suitPercent[maxSuit]}%）`;
    } else if (suitPercent.z >= 30) {
        description += `★ 字牌偏多（${suitPercent.z}%）`;
    } else {
        description += '☆ 花色均衡';
    }
    if (pairs >= 3) description += ` | 对子多（${pairs}对）`;
    if (pungs >= 2) description += ` | 刻子潜力（${pungs}组）`;
    if (kongs > 0) description += ` | 含杠子（${kongs}组）`;
    if (numTendency !== '均衡') description += ` | 数字${numTendency}`;
    let specialHint = [];
    if (suitPercent.m >= 60 && suitPercent.p < 10 && suitPercent.s < 10 && suitPercent.z < 10) {
        specialHint.push('清一色(万)');
    } else if (suitPercent.p >= 60 && suitPercent.m < 10 && suitPercent.s < 10 && suitPercent.z < 10) {
        specialHint.push('清一色(饼)');
    } else if (suitPercent.s >= 60 && suitPercent.m < 10 && suitPercent.p < 10 && suitPercent.z < 10) {
        specialHint.push('清一色(索)');
    } else if (suitPercent.m + suitPercent.p + suitPercent.s > 80 && suitPercent.z > 10) {
        specialHint.push('混一色可能');
    }
    if (suitPercent.z > 40) {
        if (honorTypes.dragon >= 3) specialHint.push('三元牌多');
        if (honorTypes.wind >= 3) specialHint.push('风牌多');
    }
    let allTerminals = true;
    for (let t of hand) {
        if (t.suit === 'z') continue;
        if (t.num !== 1 && t.num !== 9) { allTerminals = false; break; }
    }
    if (allTerminals && hand.some(t => t.suit !== 'z')) specialHint.push('老头牌(混老头)');
    let hasSeven = hand.some(t => t.suit !== 'z' && t.num === 7);
    if (!hasSeven) specialHint.push('缺七');
    if (specialHint.length > 0) description += ' | \uD83C\uDFAF ' + specialHint.join('\u3001');
    return { suitCount, suitPercent, numDistribution, numTendency, honorTypes, pairs, pungs, kongs, description, maxSuit: maxSuitName, maxSuitPercent: suitPercent[maxSuit], specialHint };
}
