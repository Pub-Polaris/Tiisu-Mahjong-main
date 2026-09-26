// ══════════════════════════════════════════════════════════════
// tiles.js — 牌面工具（纯函数，无 DOM / 无游戏状态依赖）
// 七子麻将 · 四人游戏
// ══════════════════════════════════════════════════════════════

// 牌面显示文本
function tileDisplay(t) {
    if (!t) return '?';
    if (t.suit === 'm') return t.num + '万';
    if (t.suit === 'p') return t.num + '饼';
    if (t.suit === 's') return t.num + '索';
    if (t.suit === 'z') {
        const m = {1:'东',2:'南',3:'西',4:'北',5:'白',6:'发',7:'中'};
        return m[t.num] || t.num;
    }
    return '?';
}

// 牌面 SVG 路径（相对文档页面 index.html；index.html 位于根，mj_tiles 也在根）
function tileSvg(t) {
    return 'mj_tiles/' + t.num + t.suit + '.svg?v=2';
}

// 生成标准 136 张牌（无花牌）：万/饼/索 1-9 ×4 + 字牌 东南西北白发中 ×4
function createDeck() {
    const d = [];
    for (let s of ['m','p','s']) for (let n=1;n<=9;n++) for (let i=0;i<4;i++) d.push({suit:s,num:n,id:s+n});
    for (let w of ['1','2','3','4']) for (let i=0;i<4;i++) d.push({suit:'z',num:w,id:'z'+w});
    for (let g of ['5','6','7']) for (let i=0;i<4;i++) d.push({suit:'z',num:g,id:'z'+g});
    return d;
}

// Fisher-Yates 洗牌
function shuffle(arr) {
    for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
}

// 手牌排序：万 < 饼 < 索 < 字；字牌按 东南西北白发中
function sortHand(hand) {
    const order={m:0,p:1,s:2,z:3}, ho={1:0,2:1,3:2,4:3,5:4,6:5,7:6};
    hand.sort((a,b)=>{
        if(a.suit!==b.suit)return order[a.suit]-order[b.suit];
        if(a.suit==='z')return ho[a.num]-ho[b.num];
        return a.num-b.num;
    });
    return hand;
}

// 按 id 统计张数（Map<id, count>）
function countTiles(hand) {
    const m=new Map();
    for(let t of hand)m.set(t.id,(m.get(t.id)||0)+1);
    return m;
}

// 解析手牌字符串 "123m456p789s1122z" → 牌对象数组
function parseTileString(str) {
    const result = [];
    const re = /(\d+)([mpsz])/gi;
    let match;
    while ((match = re.exec(str)) !== null) {
        const nums = match[1];
        const suit = match[2].toLowerCase();
        if (suit === 'z') {
            for (let ch of nums) {
                const n = parseInt(ch);
                if (n < 1 || n > 7) return null;
                result.push({ suit:'z', num:String(n), id:'z'+n });
            }
        } else {
            for (let ch of nums) {
                const n = parseInt(ch);
                if (n < 1 || n > 9) return null;
                result.push({ suit, num:n, id:suit+n });
            }
        }
    }
    if (result.length === 0) return null;
    return result;
}
