// ══════════════════════════════════════════════════════════════
// winchecker.js — 役种判定引擎（WinChecker）
// 依赖：tiles.js (countTiles / parseTileString)
// 设计要点：
//   - checkWin(concealedHand, ...) 仅接收【暗手】；
//     melds 作为【固定面子】传入，不再合并进 hand 重新拆分。
//   - 结构判定：暗手需拆成 (4 - meldCount) 组面子 + 1 对（七对子仅门清）。
//   - 役种计算时使用 fullHand = 暗手 + 副露牌（清一色/断幺九等按全手数）。
// ══════════════════════════════════════════════════════════════

// ── 手牌结构拆分（纯函数）──

// 是否七对子（14 张全部成对；同种 4 张按两对计 → 龙七对仍是七对，不单独立役、不加赋）
function isSevenPairs(hand) {
    if(hand.length!==14)return false;
    const m=countTiles(hand); let pairs=0;
    for(let c of m.values()){ if(c%2!==0) return false; pairs+=c/2; }
    return pairs===7;
}

// 是否tiisuin：14 张全为字牌，且【恰好】东南西北白发中各 2 张（= 11223344556677z）。
// 注意：不允许多出第 4 张（如某张字牌 3 张 + 和牌凑成 4 张），那不算tiisuin。
function isSevenHonors(hand) {
    if(hand.length!==14)return false;
    for(let t of hand) if(t.suit!=='z') return false;
    if(!isSevenPairs(hand)) return false;
    const m=countTiles(hand);
    for(let k of ['1','2','3','4','5','6','7']) if((m.get('z'+k)||0)!==2) return false;
    return true;
}

// 是否国士无双（十三幺 / 十四才子）：十三种幺九字牌（1m 9m 1p 9p 1s 9s 1~7z）各至少一张，
// 恰好 14 张（即其中一种成对）。这不是"4 面子 + 1 雀头"结构，所以要在结构判定前单独拦。
function isKokushi13(hand) {
    if (!hand || hand.length !== 14) return false;
    const need = ['m1','m9','p1','p9','s1','s9','z1','z2','z3','z4','z5','z6','z7'];
    const m = countTiles(hand);
    for (const id of need) if ((m.get(id) || 0) < 1) return false;
    let total = 0;
    for (const id of need) total += (m.get(id) || 0);
    return total === 14;      // 不允许出现第十四种牌
}

// 标准手拆分：找雀头 → 拆面子（递归）
function splitStandard(hand) {
    const s=hand.slice().sort((a,b)=>a.id.localeCompare(b.id));
    return findPair(s);
}
function findPair(tiles) {
    if(tiles.length===0)return {success:true,groups:[]};
    if(tiles.length%3!==2)return {success:false};
    for(let i=0;i<tiles.length-1;i++){
        if(tiles[i].id===tiles[i+1].id){
            const rest=[...tiles.slice(0,i),...tiles.slice(i+2)];
            const r=splitGroups(rest);
            if(r.success)return {success:true,groups:[{type:'pair',tiles:[tiles[i],tiles[i+1]]},...r.groups]};
        }
    }
    return {success:false};
}
function splitGroups(tiles) {
    if(tiles.length===0)return {success:true,groups:[]};
    if(tiles.length%3!==0)return {success:false};
    const first=tiles[0];
    const i1=tiles.findIndex((t,idx)=>idx>0&&t.id===first.id);
    if(i1!==-1){
        const i2=tiles.findIndex((t,idx)=>idx>i1&&t.id===first.id);
        if(i2!==-1){
            const rest=tiles.filter((_,idx)=>idx!==0&&idx!==i1&&idx!==i2);
            const r=splitGroups(rest);
            if(r.success)return {success:true,groups:[{type:'pung',tiles:[first,tiles[i1],tiles[i2]]},...r.groups]};
        }
    }
    if(first.suit!=='z'){
        const n1=tiles.findIndex((t,idx)=>idx>0&&t.suit===first.suit&&t.num===first.num+1);
        const n2=tiles.findIndex((t,idx)=>idx>0&&t.suit===first.suit&&t.num===first.num+2);
        if(n1!==-1&&n2!==-1){
            const rest=tiles.filter((_,idx)=>idx!==0&&idx!==n1&&idx!==n2);
            const r=splitGroups(rest);
            if(r.success)return {success:true,groups:[{type:'sequence',tiles:[first,tiles[n1],tiles[n2]]},...r.groups]};
        }
    }
    return {success:false};
}

// ── WinChecker ──

class WinChecker {
    constructor(config, yakuData) {
        this.config = config;
        this.yakuData = yakuData;
        this.baseFu = yakuData.baseFu || 7;
        this.optionalEnabled = new Set(); // 已启用的可选役（5.7）
    }

    getYakuFu(id) {
        for(let y of(this.yakuData.yaku||[]))if(y.id===id)return y.fu;
        for(let y of(this.yakuData.highYaku||[]))if(y.id===id)return y.fu;
        return 0;
    }

    /**
     * 和牌判定
     * @param {Array} hand        暗手（不含副露）
     * @param {Boolean} selfDraw  是否自摸
     * @param {Boolean} hasCalled 是否副露过（食降/门清限定判定）
     * @param {Number} ankanCount 暗杠数
     * @param {Number} minkanCount 明杠数
     * @param {Array} melds      固定面子 [{type,tiles}]
     * @param {Array} kans       杠记录
     * @param {Boolean} firstTurn 首巡
     * @param {Array} discards   已弃牌（保留兼容）
     * @param {Object|null} winTile 和牌张
     * @param {Object|null} winCtx   偶发役上下文 {seaMoon, haiDei, riverFish, lastTileVisible}
     */
    checkWin(hand, selfDraw, hasCalled, ankanCount, minkanCount, melds, kans, firstTurn, discards, winTile, winCtx) {
        this._winTile = winTile || null;
        this._winCtx = winCtx || null;
        this._concealedHand = hand.slice(); // 暗手（供暗刻役排除明副露）
        this._ankanCount = ankanCount || 0;
        this._minkanCount = minkanCount || 0;
        this._melds = (melds || []).slice();   // 原始副露（供全食顺/全碰刻判断类型）
        this._selfDraw = !!selfDraw;           // 供自摸相关特例（三七之花自摸=双役满）判断

        // 全手 = 暗手 + 副露牌；杠(4张面子)会使手牌物理张数 = 14 + 杠数
        const meldTiles = [];
        for (let m of (melds || [])) for (let t of m.tiles) meldTiles.push(t);
        const meldCount = (melds || []).length;
        const kongCount = (melds || []).filter(m => m.tiles.length === 4).length;
        const fullHand = hand.concat(meldTiles);
        const expectedTotal = 14 + kongCount;
        if (fullHand.length !== expectedTotal) {
            // 静默降级：这是调用方数据问题，不应污染日志（避免刷屏）
            return {success:false,reason:'not_formed',msg:`手牌总数不符 (实际${fullHand.length} vs 期望${expectedTotal})`};
        }

        let groups=null;                     // 提前声明：国士无双旁路会用到
        // 国士无双（十三幺）：不是"4 面子 + 1 雀头"结构，必须在结构判定之前拦下来，
        // 否则会被当成 not_formed 直接拒掉（旧实现就是这个问题）。
        if (meldCount === 0 && isKokushi13(fullHand)) {
            const y = (this.yakuData.highYaku || []).find(x => x.id === 'thirteen_orphans');
            if (y) {
                const tk = this._tokureiBonus(y, fullHand, groups);
                const yaku = [{ name: y.name, fu: y.fu, isHigh: true, id: y.id }];
                if (tk > 0) yaku.push({ name: '特例加计', fu: 0, isBonus: true, pointsBonus: tk });
                return { success: true, totalFu: y.fu, activeYaku: yaku, handType: 'highyaku',
                         sevenHonors: false, specialPoints: this._highPoints(y), tokureiBonus: tk };
            }
        }

        // 结构判定
        let handType=null, baseFu=0;
        if (meldCount === 0 && isSevenPairs(fullHand)) {
            handType='seven_pairs';
            baseFu=this.getYakuFu('seven_pairs');
        } else {
            // 暗手需拆成 (4 - meldCount) 组面子 + 1 对
            const need = 4 - meldCount;               // 还需组数
            const concealedLen = hand.length;
            if (need < 0 || concealedLen !== (need * 3) + 2) {
                return {success:false,reason:'not_formed',msg:'暗手张数与所需面子数不符'};
            }
            const r = splitStandard(hand);
            const formedGroups = (r.success && r.groups) ? r.groups.filter(g=>g.type!=='pair').length : -1;
            if (!r.success || formedGroups !== need) {
                return {success:false,reason:'not_formed',msg:'暗手不成形'};
            }
            handType='standard_hand';
            // 归一化副露类型：吃→sequence，碰/明杠/暗杠/加杠→pung（役判定只认这两种）
            groups = (melds || []).map(m => ({
                type: m.type === 'chi' ? 'sequence'
                    : (m.type === 'pon' || m.type === 'minkan' || m.type === 'ankan' || m.type === 'kakan') ? 'pung' : m.type,
                tiles: m.tiles.slice()
            })).concat(r.groups);
            baseFu=0;
        }
        if (!handType) return {success:false,reason:'not_formed',msg:'不成形'};

        // tiisuin（字牌七对子）：检测但默认不计分（由 winCtx.tiisuin 决定是否计赋）
        const sevenHonors = handType === 'seven_pairs' && isSevenHonors(fullHand);

        let totalFu=0, activeYaku=[];

        // 高得点役：按 ike.json 里的顺序取【第一个成立】的 —— 顺序即优先权：
        //   双役满(70) > 役满(28) > 倍满(14)
        // 命中役满后【只叠特例加计 7000】，其余普通役一律不叠（已确认口径）。
        let highFound=null;
        for(let hy of(this.yakuData.highYaku||[])){
            if(hy.menzen && hasCalled) continue; // 门清限定
            const fn=this.conditionFn(hy.id);
            if(!fn)continue;
            try{const r=fn(fullHand,groups);if(r===true){highFound=hy;break;}}catch(e){}
        }
        if(highFound){
            totalFu=highFound.fu;
            const tokurei = this._tokureiBonus(highFound, fullHand, groups);
            activeYaku.push({name:highFound.name,fu:highFound.fu,isHigh:true,id:highFound.id,
                             doubleYakuman:!!highFound.doubleYakuman,pointsBonus:highFound.pointsBonus});
            if(highFound.pointsBonus){
                // 倍满 +7000 点（6.1 南北通）：赋数仍按 14 计；
                // 点数加项只挂在役本体上（这里仅作展示行，勿再带 pointsBonus，否则会重复计）。
                activeYaku.push({name:'倍满加计',fu:0,isBonus:true});
            }
            if(highFound.fixedPoints && (!highFound.fixedPointsWhenCalled || hasCalled)){
                // 固定点数役（如 三国将副露 = 7000 点）：赋数仅作展示，点数由 specialPoints 覆写
                totalFu=10;activeYaku[0].fu=10;activeYaku[0].fixedPoints=highFound.fixedPoints;
            }
            if(tokurei > 0){
                // 特例加计 = +7000 **点**（不是赋）；走 pointsBonus 点数加项
                activeYaku.push({name:'特例加计',fu:0,isBonus:true,pointsBonus:tokurei});
            }
            // 例外：小于七 / 大于七 明写"附加混一色得点"，允许叠混一色
            if((highFound.id==='less_than_seven'||highFound.id==='greater_than_seven')&&this.isHalfFlush(fullHand)){
                const hf=this.getYakuFu('half_flush');totalFu+=hf;activeYaku.push({name:'混一色',fu:hf});
            }
        }else{
            for(let yaku of(this.yakuData.yaku||[])){
                if(yaku.id==='seven_pairs')continue;
                // 七对子路径不叠加刻子役（对对和/两暗刻/三暗刻等）
                if(handType==='seven_pairs'&&(yaku.id==='all_pungs'||yaku.id==='two_ankou'||yaku.id==='three_ankou'||yaku.id==='one_color_triple'))continue;
                if(yaku.optional && !this.optionalEnabled.has(yaku.id)) continue; // 5.7 可选役默认禁用
                if(yaku.menzen && hasCalled) continue;                            // 门清限定（如 水滴石破）
                const fn=this.conditionFn(yaku.id);
                if(!fn)continue;
                try{
                    const r=fn(fullHand,groups);
                    if(r===true){totalFu+=yaku.fu;activeYaku.push({name:yaku.name,fu:yaku.fu,id:yaku.id,kaishoku:yaku.kaishoku,fixedPoints:yaku.fixedPoints});}
                    else if(typeof r==='object'&&r&&r.fu){totalFu+=r.fu;activeYaku.push({name:yaku.name,fu:r.fu,id:yaku.id,kaishoku:yaku.kaishoku,fixedPoints:yaku.fixedPoints});}
                }catch(e){}
            }
            totalFu+=baseFu;
            // 七对子：纯正水中月 / tiisuin 命中时【覆盖七对子】，不另计（已确认口径）
            // 纯正水中月：覆盖七对子（自身 70 赋 > 0，不影响门槛）
            const coverSevenPairs = activeYaku.some(y => y.id === 'pure_moon_in_water');
            if(handType==='seven_pairs' && !coverSevenPairs)activeYaku.push({name:'七对子',fu:baseFu});

            activeYaku=activeYaku.filter(y=>y.name!=='自摸'&&y.name!=='门前自摸'&&y.name!=='门清自摸');
            if(selfDraw){
                if(handType==='seven_pairs'){totalFu+=4;activeYaku.push({name:'门前自摸',fu:4});}
                else if(hasCalled){totalFu+=2;activeYaku.push({name:'自摸',fu:2});}
                else {totalFu+=this.getYakuFu('menzen_tsumo');activeYaku.push({name:'门前自摸',fu:this.getYakuFu('menzen_tsumo')});}
            }
            if(selfDraw&&this.hasKachi7(fullHand)){const b=(this.yakuData.bonus&&this.yakuData.bonus.kachi7_self)||1;totalFu+=b;activeYaku.push({name:'卡七自摸加成',fu:b});}

            // 役牌：getHonorYaku 返回 {name, fu}（圈+门同风时合并为「东风东」2 赋）
            // 达成大三元/小三元时不再单独计三元役牌赋（已确认口径 2.10）
            const hyaku=this.getHonorYaku(fullHand, this._winCtx && this._winCtx.seatWind, this._winCtx && this._winCtx.roundWind);
            const dragonYaku=['白役牌','发役牌','中役牌'];
            const bigThree=activeYaku.some(y=>y.id==='big_three_dragons');
            const smallThree=activeYaku.some(y=>y.id==='small_three_dragons');
            const suppressDragonYaku=bigThree||smallThree;
            for(let h of hyaku){
                if(suppressDragonYaku&&dragonYaku.indexOf(h.name)!==-1)continue;
                totalFu+=h.fu;activeYaku.push({name:h.name,fu:h.fu});
            }

            if(hasCalled||minkanCount>0){for(let ay of activeYaku){if(ay.kaishoku){ay.fu=Math.max(0,ay.fu-1);totalFu=Math.max(0,totalFu-1);}}}

            const mY=activeYaku.find(y=>y.name==='缺门');
            if(mY&&groups){const hg=groups.some(g=>g.tiles[0].suit==='z'&&(g.type==='pair'||g.type==='pung'));if(hg){mY.fu+=1;totalFu+=1;}}

            const jY=activeYaku.find(y=>y.name==='全数筋和');
            if(jY&&selfDraw&&groups&&handType!=='seven_pairs'){const ss=new Set();for(let t of fullHand)if(t.suit!=='z')ss.add(t.suit);if(ss.size===3){const tY=activeYaku.find(y=>y.name==='自摸');if(tY&&tY.fu===2){tY.fu=3;totalFu+=1;}}}

            if(ankanCount>0||minkanCount>0){
                const fa=this.getYakuFu('ankan')||2,fm=this.getYakuFu('meikan')||1;
                for(let i=0;i<ankanCount;i++){totalFu+=fa;activeYaku.push({name:'一暗杠（暗根）',fu:fa});}
                for(let i=0;i<minkanCount;i++){totalFu+=fm;activeYaku.push({name:'加杠/明杠（明根）',fu:fm});}
                const tk=ankanCount+minkanCount;
                if(tk>=2){let kf=this.getYakuFu('two_kan')||3;if(minkanCount>0)kf=Math.max(1,kf-1);totalFu+=kf;activeYaku.push({name:'两杠子',fu:kf});}
                if(tk>=3){let kf=this.getYakuFu('three_kan')||5;if(minkanCount>0)kf=Math.max(1,kf-1);totalFu+=kf;activeYaku.push({name:'三杠子',fu:kf});}
            }
        }

        // tiisuin（已确认口径 2026-09-26）：【本身不计分】，只是标记。
        // 触发时由 engine 直接结束本局并回主菜单，同时记统计（做出者+1、其余三家见证+1）。
        // 注意：门槛判定仍用 totalFu（七对子路径会给 7 赋），所以tiisuin一定能"和"。

        // tiisuin无视 7 赋起和门槛：它不计分，而是直接结束本局（由 engine 处理）
        if(!sevenHonors && totalFu<this.baseFu)return {success:false,reason:'no_yaku',msg:'赋数不足',totalFu,activeYaku,sevenHonors};

        // ── 听牌型奖赏（5.5）与全带赤特判（6.1）──
        // 5.5 是"非役加分项"：不计入起和门槛，只在已和之后叠加（门槛判定已在上方完成）。
        const extraYaku = [];
        if(groups){
            const w = this.waitFuOf(fullHand, groups, this._winTile);
            if(w){ totalFu += w.fu; extraYaku.push({name:w.name,fu:w.fu,isBonus:true}); }
        }
        // 全带赤：不走赋位表，由 engine 按 14000 +（其他正式役赋数之和）×700 结算。
        // 双役满（纯正水中月等）：直接固定 70000 点，不受 35000 封顶影响。
        let specialPoints = null;
        const fxYaku = activeYaku.find(y => y.fixedPoints != null);
        // 6.1「14000 点 + 其他役 700 点累加」型：全带赤 / 水滴石破
        const additive = activeYaku.find(y => y.id === 'chidaichi' || y.id === 'water_drop');
        if (fxYaku) {
            // 固定点数役（人和 7000 / 三国将副露 7000 等）：直接采用固定点数
            specialPoints = fxYaku.fixedPoints;
        } else if (sevenHonors) {
            // tiisuin（6.2.1 双役满 70000）：仅在「tiisuin算赋」开启时计分；否则不计分（0 赋）
            specialPoints = null;
        } else if(additive){
            const otherFu = activeYaku.filter(y => y.id !== 'chidaichi' && y.id !== 'water_drop').reduce((a,y) => a + y.fu, 0);
            specialPoints = 14000 + otherFu * 700;
        } else if(highFound){
            const base = this._highPoints(highFound);
            if(base !== null){ specialPoints = base; }   // 特例加计走 pointsBonus，不并入这里
        }
        // 注：pointsBonus（倍满 +7000 点，6.1 南北通）由 engine#calcFinalPoints 统一相加，
        //     这里不并入 specialPoints，以免与赋位表口径混淆。

        return {success:true,totalFu,activeYaku:activeYaku.concat(extraYaku),
                handType:highFound?'highyaku':handType,sevenHonors,specialPoints};
    }

    conditionFn(id) {
        const m={
            menzen_tsumo:()=>false,tsumo:()=>false,
            all_simple:h=>{for(let t of h){if(t.suit==='z'||t.num===1||t.num===9)return false;}return true;},
            all_pungs:(h,g)=>g&&g.every(x=>x.type!=='sequence'),
            half_flush:this.isHalfFlush,fully_flush:this.isFullyFlush,
            mixed_terminals:h=>{for(let t of h){if(t.suit==='z')continue;if(t.num!==1&&t.num!==9)return false;}return true;},
            five_gates:this.isFiveGates,
            same_high:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');if(s.length<2)return false;for(let i=0;i<s.length-1;i++)for(let j=i+1;j<s.length;j++)if(s[i].tiles[0].suit===s[j].tiles[0].suit&&s[i].tiles[0].num===s[j].tiles[0].num)return true;return false;},
            double_same_high:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');if(s.length<4)return false;const cm={};for(let x of s){const k=x.tiles[0].suit+x.tiles[0].num;cm[k]=(cm[k]||0)+1;}let p=0;for(let k in cm)if(cm[k]>=2)p++;return p>=2;},
            four_same:h=>{const m=countTiles(h);for(let c of m.values())if(c===4)return true;return false;},
            two_color_straight:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');if(s.length<2)return false;for(let i=0;i<s.length-1;i++)for(let j=i+1;j<s.length;j++)if(s[i].tiles[0].suit!==s[j].tiles[0].suit&&s[i].tiles[0].num===s[j].tiles[0].num)return true;return false;},
            // 三节高：同花色三个数字连号（差 1）的刻子——【全组合遍历】，
            // 旧写法只比较前三个元素，含 4 个刻子时会漏判（缺陷 B4）
            one_color_triple:(h,g)=>{if(!g)return false;const p=g.filter(x=>x.type==='pung');if(p.length<3)return false;
                for(let i=0;i<p.length-2;i++)for(let j=i+1;j<p.length-1;j++)for(let k=j+1;k<p.length;k++){
                    const a=p[i].tiles[0],b=p[j].tiles[0],c=p[k].tiles[0];
                    if(a.suit===b.suit&&b.suit===c.suit){const ns=[a.num,b.num,c.num].sort((x,y)=>x-y);
                        if(ns[0]+1===ns[1]&&ns[1]+1===ns[2])return true;}}
                return false;},
            two_ankou:()=>{const m=countTiles(this._concealedHand||[]);let n=0;for(let c of m.values())if(c>=3)n++;n+=(this._ankanCount||0);return n>=2;},
            missing_suit:h=>{const s=new Set();for(let t of h)if(t.suit!=='z')s.add(t.suit);return s.size<=2;},
            two_color_ko:(h,g)=>{if(!g)return false;const p=g.filter(x=>x.type==='pung');if(p.length<2)return false;const ss=new Set();const ns=[];for(let x of p){ss.add(x.tiles[0].suit);ns.push(x.tiles[0].num);}return ss.size===2&&ns.every(n=>n===ns[0]);},
            three_color_straight:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');if(s.length<3)return false;for(let i=0;i<s.length-2;i++)for(let j=i+1;j<s.length-1;j++)for(let k=j+1;k<s.length;k++){const a=s[i].tiles[0],b=s[j].tiles[0],c=s[k].tiles[0];if(a.suit!==b.suit&&b.suit!==c.suit&&a.suit!==c.suit&&a.num===b.num&&b.num===c.num)return true;}return false;},
            // 三步高：同花色三个数字依次递增（差 1、2 或 1、1）的顺子——同理改为【全组合遍历】
            one_color_step:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');if(s.length<3)return false;
                for(let i=0;i<s.length-2;i++)for(let j=i+1;j<s.length-1;j++)for(let k=j+1;k<s.length;k++){
                    const a=s[i].tiles[0],b=s[j].tiles[0],c=s[k].tiles[0];
                    if(a.suit===b.suit&&b.suit===c.suit){const ns=[a.num,b.num,c.num].sort((x,y)=>x-y);
                        if(ns[0]+1===ns[1]&&ns[1]+1===ns[2])return true;}}
                return false;},
            one_dragon:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');const ns={};for(let x of s){const su=x.tiles[0].suit;if(su==='z')continue;if(!ns[su])ns[su]=new Set();for(let t of x.tiles)ns[su].add(t.num);}for(let su in ns){if(ns[su].size>=9){let all=true;for(let i=1;i<=9;i++)if(!ns[su].has(i)){all=false;break;}if(all)return true;}}return false;},
            three_color_ko:(h,g)=>{if(!g)return false;const p=g.filter(x=>x.type==='pung');if(p.length<3)return false;for(let i=0;i<p.length-2;i++)for(let j=i+1;j<p.length-1;j++)for(let k=j+1;k<p.length;k++){const a=p[i].tiles[0],b=p[j].tiles[0],c=p[k].tiles[0];if(a.suit!==b.suit&&b.suit!==c.suit&&a.suit!==c.suit&&a.num===b.num&&b.num===c.num)return true;}return false;},
            mixed_fully_terminal:(h,g)=>{
                if(!g)return false;
                for(let x of g){
                    // 每组面子/雀头须含至少一个幺九(1/9)或字牌
                    let hasTerm=false;
                    for(let t of x.tiles){if(t.suit==='z'||t.num===1||t.num===9){hasTerm=true;break;}}
                    if(!hasTerm)return false;
                }
                return true;
            },
            three_ankou:()=>{const m=countTiles(this._concealedHand||[]);let n=0;for(let c of m.values())if(c>=3)n++;n+=(this._ankanCount||0);return n>=3;},
            pure_fully_terminal:(h,g)=>{if(!g)return false;for(let x of g)for(let t of x.tiles){if(t.suit==='z')return false;if(t.num!==1&&t.num!==9)return false;}return true;},
            small_three_dragons:h=>{const d={5:0,6:0,7:0};for(let t of h)if(t.suit==='z'&&d.hasOwnProperty(t.num))d[t.num]++;let pu=0,pa=0;for(let k in d){if(d[k]>=3)pu++;else if(d[k]===2)pa++;}return pu===2&&pa===1;},
            // 大三元：白/发/中三组刻子（役满 28 赋）。命中时不再单独计三元役牌赋，见 checkWin。
            missing_seven:h=>{let hasNum=false;for(let t of h)if(t.suit!=='z'){hasNum=true;break;}if(!hasNum)return false;for(let t of h)if(t.suit!=='z'&&t.num===7)return false;return true;},
            kachi_7:h=>{let hasNum=false;for(let t of h)if(t.suit!=='z'){hasNum=true;break;}return hasNum&&!!(this._winTile&&this._winTile.suit!=='z'&&this._winTile.num===7);},
            all_number:h=>{for(let t of h)if(t.suit==='z')return false;return true;},
            // 全数筋和（可选役）：去掉"平和形状"前置，按"全数字牌 + 全部面子为顺子"判定
            all_number_jin:(h,g)=>{for(let t of h)if(t.suit==='z')return false;if(!g)return false;for(let x of g)if(x.type==='pung')return false;return true;},
            sea_moon:()=>!!(this._winCtx&&this._winCtx.seaMoon),
            river_fish:()=>!!(this._winCtx&&this._winCtx.riverFish),
            last_tile:()=>!!(this._winCtx&&this._winCtx.lastTileVisible>=4),
            hai_dei:()=>!!(this._winCtx&&this._winCtx.haiDei),
            same_color_old_young:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');const bs={};for(let x of s){const su=x.tiles[0].suit;if(!bs[su])bs[su]=[];bs[su].push(x);}for(let su in bs){let h123=false,h789=false;for(let x of bs[su]){const ns=x.tiles.map(t=>t.num).sort((a,b)=>a-b);if(ns[0]===1&&ns[1]===2&&ns[2]===3)h123=true;if(ns[0]===7&&ns[1]===8&&ns[2]===9)h789=true;}if(h123&&h789)return true;}return false;},
            same_color_double_old_young:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');const bs={};for(let x of s){const su=x.tiles[0].suit;if(!bs[su])bs[su]=[];bs[su].push(x);}for(let su in bs){let c123=0,c789=0;for(let x of bs[su]){const ns=x.tiles.map(t=>t.num).sort((a,b)=>a-b);if(ns[0]===1&&ns[1]===2&&ns[2]===3)c123++;if(ns[0]===7&&ns[1]===8&&ns[2]===9)c789++;}if(c123>=2&&c789>=2)return true;}return false;},
            two_color_double_old_young:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');const s123=new Set(),s789=new Set();for(let x of s){const su=x.tiles[0].suit;const ns=x.tiles.map(t=>t.num).sort((a,b)=>a-b);if(ns[0]===1&&ns[1]===2&&ns[2]===3)s123.add(su);if(ns[0]===7&&ns[1]===8&&ns[2]===9)s789.add(su);}return s123.size>=2&&s789.size>=2;},
            double_even_ko:(h,g)=>{if(!g)return false;const p=g.filter(x=>x.type==='pung');const bs={};for(let x of p){const t=x.tiles[0];if(t.suit==='z'||t.num%2!==0)continue;if(!bs[t.suit])bs[t.suit]=[];bs[t.suit].push(t.num);}let f=0;for(let su in bs){const ns=bs[su].sort((a,b)=>a-b);for(let i=0;i<ns.length-1;i++)if(ns[i+1]-ns[i]===2){f++;break;}}return f>=2;},
            triple_even_ko:(h,g)=>{if(!g)return false;const p=g.filter(x=>x.type==='pung');const bs={};for(let x of p){const t=x.tiles[0];if(t.suit==='z'||t.num%2!==0)continue;if(!bs[t.suit])bs[t.suit]=[];bs[t.suit].push(t.num);}let f=0;for(let su in bs){const ns=bs[su].sort((a,b)=>a-b);for(let i=0;i<ns.length-1;i++)if(ns[i+1]-ns[i]===2){f++;break;}}return f>=3;},
            less_than_seven:h=>{if(h.length!==14)return false;const ho=h.filter(t=>t.suit==='z'),st=h.filter(t=>t.suit!=='z');if(ho.length!==2||ho[0].id!==ho[1].id||!['5','6','7'].includes(ho[0].num))return false;const ss=[...new Set(st.map(t=>t.suit))];if(ss.length!==1)return false;for(let n=1;n<=6;n++)if(st.filter(t=>t.num===n).length!==2)return false;for(let n=7;n<=9;n++)if(st.some(t=>t.num===n))return false;return true;},
            greater_than_seven:h=>{if(h.length!==14)return false;const ho=h.filter(t=>t.suit==='z'),st=h.filter(t=>t.suit!=='z');if(ho.length!==2||ho[0].id!==ho[1].id||!['5','6','7'].includes(ho[0].num))return false;const ss=[...new Set(st.map(t=>t.suit))];if(ss.length!==1)return false;for(let n=7;n<=9;n++)if(st.filter(t=>t.num===n).length!==4)return false;for(let n=1;n<=6;n++)if(st.some(t=>t.num===n))return false;return true;},
            three_kingdoms:(h,g)=>{if(!g)return false;const p=g.filter(x=>x.type==='pung');if(p.length!==3)return false;const ss=new Set(),ns=p.map(x=>x.tiles[0].num);for(let x of p)ss.add(x.tiles[0].suit);return ss.size===3&&ns.includes(2)&&ns.includes(5)&&ns.includes(8);},
            north_south_pass:(h,g)=>{if(!g)return false;const s=g.filter(x=>x.type==='sequence');if(!s.length)return false;const ns={};for(let x of s){const su=x.tiles[0].suit;if(su==='z')continue;if(!ns[su])ns[su]=new Set();for(let t of x.tiles)ns[su].add(t.num);}let hasDragon=false;for(let su in ns){if(ns[su].size>=9){let all=true;for(let i=1;i<=9;i++)if(!ns[su].has(i)){all=false;break;}if(all){hasDragon=true;break;}}}if(!hasDragon)return false;const wc={1:0,2:0,3:0,4:0};for(let t of h)if(t.suit==='z'&&['1','2','3','4'].includes(t.num))wc[t.num]++;return (wc['4']>=2&&wc['2']>=2)||(wc['4']>=3&&wc['2']>=1)||(wc['2']>=3&&wc['4']>=1);},
            // 镜中花（6.1，倍满 14 赋，门清）：112233s 112233m 55p，单钓 5p 和牌
            flower_in_mirror:h=>this.isFlowerInMirror(h),
            // 水中月（6.1，倍满 14 赋，门清）：112233s 112233m 11p，单钓 1p 和牌
            moon_in_water:h=>this.isMoonInWater(h),
            // 纯正水中月（6.2.1，双役满 70000，门清）：112233s 112233s 11p，单钓 1p 和牌
            // 全带赤（6.1）：万子 1-9 各恰好一张，且其余 5 张均为"红牌"；
            // 总点数由 engine 特判为 14000 +（其他正式役赋数之和）× 700，不走赋位表。
            chidaichi:h=>this.isChidaichi(h),
            // 水滴石破（6.1，倍满 + 其他役得点，门清）：第一巡即听牌，最终以海底自摸 / 河底荣和和牌
            // （原形为"双立直后河底荣和或自摸"，因本实现移除立直，改为等价条件）
            water_drop:()=>!!(this._winCtx&&this._winCtx.waterDrop),
            // 岭上炮（1 赋）：别人开杠后打出的牌被荣和
            rinshan_gun:()=>!!(this._winCtx&&this._winCtx.rinshanGun),
            // 岭上花（1 赋）：开杠后从岭上摸到的牌自摸和牌（等同日麻杠上开花）
            rinshan_flower:()=>!!(this._winCtx&&this._winCtx.rinshanFlower),
            // 杠立（1 赋）：立直已移除，改为"开杠后当巡和牌"
            kan_riichi:()=>!!(this._winCtx&&this._winCtx.kanRiichi),
            // 人和：第一巡、在自己摸牌之前荣和；仅记 7000 点（engine 特判，不叠加其他役）
            renhe:()=>!!(this._winCtx&&this._winCtx.renhe),
            // 全食顺（5.6，1 赋）：四个面子全部副露，且全部为吃（顺子）
            // 全碰刻（5.6，2 赋）：四个面子全部副露，且全部为碰/杠（刻子）
            // 门清时 melds 为空 → 自然不成立，无需额外判断（已确认口径）。
            // 注意：groups 里副露类型已被归一化（吃→sequence、碰/杠→pung），所以判定要用原始 melds。
            all_chi:(h,g)=>this._allMeldsOfType('sequence'),
            all_pon:(h,g)=>this._allMeldsOfType('pung'),

            // ── 役满 / 双役满（按 ike.json 的 highYaku 顺序即优先权）──
            pure_moon_in_water:h=>this.isPureMoonInWater(h),
            three_seven_flower:(h,g)=>this.isThreeSevenFlower(h,g),
            beauty_seven_pairs:h=>this.isBeautySevenPairs(h),
            four_minkan:()=>(this._minkanCount||0)>=4,
            four_kings:h=>this.isFourKings(h),
            big_three_dragons:h=>{const d={5:0,6:0,7:0};for(let t of h)if(t.suit==='z'&&d.hasOwnProperty(t.num))d[t.num]++;return d[5]>=3&&d[6]>=3&&d[7]>=3;},
            four_ankou:h=>this.isFourAnkou(h),
            all_green:h=>this.isAllGreen(h),
            thirteen_orphans:h=>isKokushi13(h),
            nine_gates:h=>this.isNineGates(h),
            all_honors:h=>this.isAllHonors(h),
            all_terminals:h=>this.isAllTerminals(h),
            four_kan_daikan:(h,g)=>this.isFourKanDaikan(h,g),
            north_south_self:(h,g)=>this.isNorthSouthSelf(h,g),
        };
        return m[id];
    }

    // ── 全求役（5.6）辅助 ────────────────────────────────────────
    // 判断"四个面子是否全部副露且类型一致"：
    //   want='sequence' → 全食顺（全吃）；want='pung' → 全碰刻（全碰/杠）。
    // 要求恰好 4 个副露面子（暗手只剩雀头），且每个副露的类型都匹配。
    _allMeldsOfType(want) {
        const melds = this._melds || [];
        if (melds.length !== 4) return false;
        for (const m of melds) {
            const isSeq = (m.type === 'chi');
            const isPung = (m.type === 'pon' || m.type === 'minkan' || m.type === 'ankan' || m.type === 'kakan');
            if (want === 'sequence' && !isSeq) return false;
            if (want === 'pung' && !isPung) return false;
        }
        return true;
    }

    // ── 水中月 / 纯正水中月 / 镜中花（6.1 / 6.2.1）辅助 ──────────
    // 三条结构（北极星 2026-09-26 给定；均门清限定、不计赐马；三者都是 7 个对子）：
    //
    //   水中月      和牌后 112233s 112233m 11p —— 任意【两花色】各一组 112233 + 11p；单钓 1p 和牌
    //   纯正水中月  和牌后 112233s 112233s 11p —— 【同一花色】两组 112233 + 11p；单钓 1p 和牌（双役满）
    //   镜中花      和牌后 112233s 112233m 55p —— 任意【两花色】各一组 112233 + 55p；单钓 5p 和牌
    //
    // 口诀：**"月"必定单钓 1p 和牌；"花"必定单钓 5p 和牌**。
    // 数法：七对子形里，把 6 对拆成"花色 → 该花色占几个连续对子"；
    //       月要求 start1 的花色数 == 2（水中月）或 1 个花色连续 6 对（纯正水中月）。

    // 数某花色含几个"112233 同高组"：
    //   1、2、3 各 2 张 → 1 组；各 4 张 → 2 组（纯正水中月）；其余（含 4~9）→ 0 组。
    _sameHighGroups(cnt, suit) {
        for (let n = 4; n <= 9; n++) if ((cnt[suit + n] || 0) > 0) return 0;
        const c1 = cnt[suit + '1'] || 0, c2 = cnt[suit + '2'] || 0, c3 = cnt[suit + '3'] || 0;
        if (c1 !== c2 || c2 !== c3) return 0;
        if (c1 % 2 !== 0) return 0;
        return c1 / 2;
    }

    _moonShapeStats(hand) {
        const m = countTiles(hand);
        const cnt = {};
        for (const [id, c] of m) cnt[id] = c;
        const groups = {};
        for (const s of ['m', 'p', 's']) {
            const g = this._sameHighGroups(cnt, s);
            if (g > 0) groups[s] = g;
        }
        return { groups, cnt };
    }

    // 水中月：两花色各 1 组 112233 + 11p，单钓 1p 和牌（共 7 对）
    isMoonInWater(hand) {
        const w = this._winTile;
        if (!w || w.suit !== 'p' || w.num !== 1) return false;
        if (!hand || hand.length !== 14 || !isSevenPairs(hand)) return false;
        const st = this._moonShapeStats(hand);
        if ((st.cnt['p1'] || 0) !== 2) return false;
        const suits = Object.keys(st.groups);
        if (suits.length !== 2) return false;
        return suits.every(s => st.groups[s] === 1);
    }

    // 纯正水中月：同一花色 2 组 112233（1、2、3 各 4 张）+ 11p，单钓 1p 和牌（共 7 对）
    isPureMoonInWater(hand) {
        const w = this._winTile;
        if (!w || w.suit !== 'p' || w.num !== 1) return false;
        if (!hand || hand.length !== 14 || !isSevenPairs(hand)) return false;
        const st = this._moonShapeStats(hand);
        if ((st.cnt['p1'] || 0) !== 2) return false;
        const suits = Object.keys(st.groups);
        if (suits.length !== 1) return false;
        return st.groups[suits[0]] === 2;
    }

    // 镜中花：两花色各 1 组 112233 + 55p，单钓 5p 和牌（共 7 对）
    isFlowerInMirror(hand) {
        const w = this._winTile;
        if (!w || w.suit !== 'p' || w.num !== 5) return false;
        if (!hand || hand.length !== 14 || !isSevenPairs(hand)) return false;
        const st = this._moonShapeStats(hand);
        if ((st.cnt['p5'] || 0) !== 2) return false;
        const suits = Object.keys(st.groups);
        if (suits.length !== 2) return false;
        return suits.every(s => st.groups[s] === 1);
    }

    // ── 全带赤（6.1）────────────────────────────────────────────
    // 规则书 6.1：包含所有带红色的牌（1-9 万、红中 z7、1/5/7/9 索、1/3/5/6/7/9 饼）
    //             且万子每种仅出现一次；14000 点 + 其他役 700 点累加。
    // 实现口径：万 1-9 各恰好 1 张，其余 5 张必须全部落在"红牌集合"内。
    isChidaichi(hand) {
        const m = countTiles(hand);
        for (let n = 1; n <= 9; n++) if ((m.get('m' + n) || 0) !== 1) return false;
        // 红牌集合（万已由上面覆盖）：红中、索 1/5/7/9、饼 1/3/5/6/7/9
        const redSet = new Set(['z7', 's1','s5','s7','s9', 'p1','p3','p5','p6','p7','p9']);
        for (const [id, c] of m) {
            if (id[0] === 'm') continue;          // 万子已校验
            if (!redSet.has(id)) return false;
        }
        const extra = hand.filter(t => t.suit !== 'm').length;
        return extra === 5;
    }

    // ── 役满相关（第七章 / 6.2）─────────────────────────────────
    // 役满点数：双役满 70000；三七之花自摸时也按双役满；其余役满 35000。
    // engine 的 calcFinalPoints 会用 specialPoints 覆写，不走赋位表。
    _highPoints(y) {
        if (!y) return null;
        if (y.doubleYakuman) {
            if (y.selfDrawDouble && !this._selfDraw) return 35000;   // 三七之花荣和=单役满
            return 70000;
        }
        if (y.fu === 28) return 35000;
        return null;        // 倍满 14 赋走赋位表
    }

    // 特例加计 7000（第七章，多个特例也不重复计算 → 命中第一个即返回）。
    // 只有 ike.json 里带 tokurei.when 的役满才可能命中；每役最多加一次。
    _tokureiBonus(y, fullHand, groups) {
        if (!y || !y.tokurei || !y.tokurei.length) return 0;
        const cnt = countTiles(fullHand || []);
        const windPungs = ['z1','z2','z3','z4'].filter(id => (cnt.get(id) || 0) >= 3).length;
        const pungs = (groups || []).filter(g => g.type === 'pung').length
                    + this._concealedPungCount(fullHand);
        const ankanPlus = (this._ankanCount || 0);
        const kanTotal = (this._melds || []).filter(m => m.tiles.length === 4).length;
        const winNum = this._winTile ? this._winTile.num : null;
        const w = this._winTile;
        for (const t of y.tokurei) {
            if (t.when === 'four_wind_pungs' && windPungs >= 4) return t.bonus;
            if (t.when === 'four_ankan' && ankanPlus >= 4) return t.bonus;
            if (t.when === 'win_1_5_7' && [1, 5, 7].indexOf(winNum) !== -1) return t.bonus;
            if (t.when === 'three_suit_1_or_9') {
                const n1 = ['m1','p1','s1'].filter(id => (cnt.get(id) || 0) >= 3).length;
                const n9 = ['m9','p9','s9'].filter(id => (cnt.get(id) || 0) >= 3).length;
                if (n1 >= 3 || n9 >= 3) return t.bonus;
            }
            // 驷马越岭：四杠 + 大单钓自摸
            if (t.when === 'four_kan_tanki_tsumo' && kanTotal >= 4 && this._selfDraw) return t.bonus;
            // 国士无双：13 面听
            if (t.when === 'kokushi_13_wait' && this._isKokushi13Wait(fullHand)) return t.bonus;
            // 国士无双：数牌 1、9 自摸（"高寿中举"）
            if (t.when === 'kokushi_1_9_tsumo' && this._selfDraw && w && w.suit !== 'z'
                && (w.num === 1 || w.num === 9)) return t.bonus;
        }
        return 0;
    }

    // 国士无双 13 面听：去掉和牌张后，恰好是 13 种幺九/字牌各 1 张
    _isKokushi13Wait(hand) {
        const w = this._winTile;
        if (!w || !hand) return false;
        const arr = hand.slice();
        const pos = arr.findIndex(t => t.id === w.id);
        if (pos === -1) return false;
        arr.splice(pos, 1);
        if (arr.length !== 13) return false;
        const m = countTiles(arr);
        if (m.size !== 13) return false;
        for (const [, c] of m) if (c !== 1) return false;
        return true;
    }

    // 全手里的暗刻数（用于特例判断的粗估）
    _concealedPungCount(fullHand) {
        const cnt = countTiles(fullHand || []);
        let n = 0;
        for (const [, c] of cnt) if (c >= 3) n++;
        return n;
    }

    // 四喜和：东/南/西/北 四种风牌都是刻子（门清或副露均可）
    isFourKings(hand) {
        const m = countTiles(hand);
        for (const id of ['z1','z2','z3','z4']) if ((m.get(id) || 0) < 3) return false;
        return true;
    }

    // 四暗刻：四组【暗】刻（含暗杠）。
    // 注意：副露的明刻不算 —— 传进来的 fullHand 含副露牌，所以必须只看暗手 + 暗杠数。
    isFourAnkou(hand) {
        const m = countTiles(this._concealedHand || hand || []);
        let n = 0;
        for (const c of m.values()) if (c >= 3) n++;
        n += (this._ankanCount || 0);
        return n >= 4;
    }

    // 绿一色：只由 2/3/4/6/8 索与发（z6）组成
    isAllGreen(hand) {
        for (const t of (hand || [])) {
            if (t.suit === 'z') { if (t.num !== '6') return false; continue; }
            if (t.suit !== 's') return false;
            if ([2,3,4,6,8].indexOf(t.num) === -1) return false;
        }
        return true;
    }

    // 字一色：全字牌
    isAllHonors(hand) {
        for (const t of (hand || [])) if (t.suit !== 'z') return false;
        return true;
    }

    // 清老头：全由数牌 1 / 9 组成
    isAllTerminals(hand) {
        for (const t of (hand || [])) {
            if (t.suit === 'z') return false;
            if (t.num !== 1 && t.num !== 9) return false;
        }
        return true;
    }

    // 九莲宝灯（门清）：同一花色，1 与 9 各≥3 张，且 1~9 每种都有；不能有字牌/其他花色
    isNineGates(hand) {
        if (!hand) return false;
        const m = countTiles(hand);
        const suits = new Set();
        for (const t of hand) { if (t.suit === 'z') return false; suits.add(t.suit); }
        if (suits.size !== 1) return false;
        const s = [...suits][0];
        for (let n = 1; n <= 9; n++) if ((m.get(s + n) || 0) < 1) return false;
        return (m.get(s + '1') || 0) >= 3 && (m.get(s + '9') || 0) >= 3;
    }

    // 三七之花（役满；自摸按双役满 —— 由 _highPoints 处理）：
    // 三种花色的 7 各一组刻子（777m 777p 777s）+ 三元/四风/1/9 组成的雀头或面子
    isThreeSevenFlower(hand, groups) {
        if (!hand) return false;
        const m = countTiles(hand);
        if ((m.get('m7') || 0) < 3 || (m.get('p7') || 0) < 3 || (m.get('s7') || 0) < 3) return false;
        const rest = hand.filter(t => {
            if (t.suit === 'z') return t.num >= 5 && t.num <= 7;            // 三元
            if (t.num === 7) return false;                                  // 已被三组刻子用掉
            if (t.num === 1 || t.num === 9) return true;                    // 1/9
            return false;
        });
        // 剩下 5 张须是"三元/四风/1/9"，且不能是其他牌
        const others = hand.filter(t => !((t.suit==='m'||t.suit==='p'||t.suit==='s') && t.num===7));
        if (others.length !== 5) return false;
        for (const t of others) {
            const okHonor = (t.suit === 'z');
            const okTerm = (t.suit !== 'z' && (t.num === 1 || t.num === 9));
            if (!okHonor && !okTerm) return false;
        }
        return true;
    }

    // 美人七对（镜中丽人，双役满，门清）：三元牌（白/发/中）三种各 4 张 = 6 对 + 1 饼一对
    // 规则书 6.2.1 附加：三元牌不得开杠（本实现：有杠即不成立）
    isBeautySevenPairs(hand) {
        if (!hand || hand.length !== 14) return false;
        if ((this._ankanCount || 0) > 0 || (this._minkanCount || 0) > 0) return false;
        const m = countTiles(hand);
        for (const id of ['z5','z6','z7']) if ((m.get(id) || 0) !== 4) return false;
        if ((m.get('p1') || 0) !== 2) return false;
        return true;
    }

    // 驷马越岭（役满）：四杠 + 大单钓自摸（特例加计 7000 由 tokurei 处理）
    // 「大单钓」= 暗手只剩一对（等这张成对）。四杠时暗手必为 2 张，故要求其确为一对。
    isFourKanDaikan(hand, groups) {
        const kans = (this._melds || []).filter(m => m.tiles.length === 4).length;
        if (kans < 4) return false;
        if (!this._selfDraw) return false;
        const ch = this._concealedHand || [];
        return ch.length === 2 && !!ch[0] && !!ch[1] && ch[0].id === ch[1].id;
    }

    // 南北自通（役满，门清）：南北通牌型 + 风刻为门自风 + （自摸 或 和牌张为 1/5/7/9）；
    // 规则书 6.2 原文：「南北通牌型且风刻为门自风，自摸 1579 成头或和牌；门清限定」
    isNorthSouthSelf(hand, groups) {
        if (!this.isNorthSouthPassShape(hand, groups)) return false;
        const w = this._winTile;
        const okWin = this._selfDraw || (w && (w.num === 1 || w.num === 5 || w.num === 7 || w.num === 9));
        if (!okWin) return false;
        const sw = this._winCtx && this._winCtx.seatWind;
        const windNum = { east:'1', south:'2', west:'3', north:'4' };
        const n = sw && windNum[sw];
        if (!n) return false;
        const m = countTiles(hand);
        return (m.get('z' + n) || 0) >= 3;
    }

    // 南北通的结构判定（供 north_south_pass 与 north_south_self 共用）
    isNorthSouthPassShape(hand, groups) {
        const fn = this.conditionFn('north_south_pass');
        if (!fn) return false;
        try { return fn(hand, groups) === true; } catch (e) { return false; }
    }

    // ── 听牌型奖赏（5.5，非役加分项）─────────────────────────────
    // 只取最终形成牌型时的一种，优先级【已确认】：嵌张 > 边张 > 单钓 > 双碰 > 筋和。
    // 双碰与单钓在和牌张为幺九或字牌时各再加 1 赋。
    // 返回 {name, fu} 或 null；不计入 7 赋起和门槛（在 checkWin 末尾叠加）。
    waitFuOf(hand, groups, winTile) {
        if (!winTile || !groups || !groups.length) return null;
        const cnt = countTiles(hand);
        const oki = (cnt.get(winTile.id) || 0);
        const used = { seq: new Set(), pair: new Set(), pung: new Set() };
        for (const g of groups) {
            if (!g.tiles.some(t => t.id === winTile.id)) continue;
            const face = g.tiles[0].suit + '|' + g.tiles.map(t => t.num).join('|');
            if (g.type === 'sequence') used.seq.add(face);
            else if (g.type === 'pair') used.pair.add(face);
            else used.pung.add(face);
        }
        // 1) 嵌张：顺子里的中间张，且另两张各有 2 张（和牌前是 35 听 4 的形）
        for (const f of used.seq) {
            const parts = f.split('|'), s = parts[0], ns = parts.slice(1).map(Number);
            if (ns.indexOf(winTile.num) !== 1) continue;
            if ((cnt.get(s + ns[0]) || 0) >= 2 && (cnt.get(s + ns[2]) || 0) >= 2) return { name:'嵌张', fu:1 };
        }
        // 2) 边张：12 听 3 / 89 听 7
        for (const f of used.seq) {
            const parts = f.split('|'), s = parts[0], ns = parts.slice(1).map(Number);
            const idx = ns.indexOf(winTile.num);
            const strict = (ns[0] === 1 && ns[1] === 2 && ns[2] === 3 && winTile.num === 3 && idx === 2) ||
                           (ns[0] === 7 && ns[1] === 8 && ns[2] === 9 && winTile.num === 7 && idx === 0);
            if (!strict) continue;
            // 去掉这张和牌张后，搭子的另外两张仍在手里 → 说明和牌前是 12 听 3 / 89 听 7
            if ((cnt.get(s + ns[0]) || 0) >= 1 && (cnt.get(s + ns[1]) || 0) >= 1) return { name:'边张', fu:1 };
        }
        // 3/4) 单钓 与 双碰 必须看【和牌前】的 13 张才能区分：
        //      和牌后的 14 张里两者都长成"某组含和牌张"，无法凭 14 张分辨。
        //      判据：把和牌张去掉后，13 张若拆成 4 面子 + 1 张孤张 → 单钓；拆成 3 面子 + 2 个对子 → 双碰。
        if (used.pair.size > 0 || used.pung.size > 0) {
            const pre = this.splitPreWin(hand, winTile);
            if (pre === 'single') return { name:'单钓', fu:1 + this.yaochuBonus(winTile) };
            if (pre === 'shanpon') return { name:'双碰', fu:1 + this.yaochuBonus(winTile) };
        }
        // 5) 筋和（剩余情形：两面等）
        return { name:'筋和', fu:1 };
    }

    // 判断和牌前的 13 张（= hand 去掉一张和牌张）的形状：
    //   'single'  → 4 面子 + 1 张孤张（单钓：孤张等成对）
    //   'shanpon' → 3 面子 + 2 个对子（双碰：两对之一成刻）
    //   null      → 以上都不是
    splitPreWin(hand, winTile) {
        const arr = hand.slice();
        const pos = arr.findIndex(t => t.id === winTile.id);
        if (pos === -1) return null;
        arr.splice(pos, 1);
        const m = countTiles(arr);
        const pairIds = [];
        for (const [id, c] of m) if (c === 2) pairIds.push(id);
        // 双碰：3 面子 + 2 对子
        if (pairIds.length >= 2) {
            for (let i = 0; i < pairIds.length - 1; i++) {
                for (let j = i + 1; j < pairIds.length; j++) {
                    const rest = arr.filter(t => t.id !== pairIds[i] && t.id !== pairIds[j]);
                    const r = splitGroups(rest);
                    if (r.success && r.groups.length === 3) return 'shanpon';
                }
            }
        }
        // 单钓：4 面子 + 1 张孤张（逐个候选试）
        for (let k = 0; k < arr.length; k++) {
            const rest = arr.slice(0, k).concat(arr.slice(k + 1));
            const r = splitGroups(rest);
            if (r.success && r.groups.length === 4) return 'single';
        }
        return null;
    }

    // 和牌张为幺九（1/9 数牌）或字牌时，双碰/单钓各 +1 赋
    yaochuBonus(t) {
        if (!t) return 0;
        return (t.suit === 'z' || t.num === 1 || t.num === 9) ? 1 : 0;
    }

    isHalfFlush(hand){const s=new Set();let h=false;for(let t of hand){if(t.suit==='z')h=true;else s.add(t.suit);}return h&&s.size===1;}
    isFullyFlush(hand){const s=new Set();for(let t of hand){if(t.suit==='z')return false;s.add(t.suit);}return s.size===1;}
    isFiveGates(hand){const s=new Set();let w=false,d=false;for(let t of hand){if(t.suit==='z'){if(['1','2','3','4'].includes(t.num))w=true;else d=true;}else s.add(t.suit);}return s.size===3&&w&&d;}
    hasKachi7(hand){const ld=this._winTile;let hasNum=false;for(let t of hand)if(t.suit!=='z'){hasNum=true;break;}return hasNum&&ld&&ld.num===7&&ld.suit!=='z';}
    // 风牌役牌：圈风与门风【总是分别计算】——两者为同一种风时也计 2 赋，面板合并为一项「东风东」。
    // 三元牌（白/发/中）刻子各 1 赋；但达成大三元/小三元时不再单独计三元役牌赋（见 checkWin）。
    getHonorYaku(hand, seatWind, roundWind){
        const r=[];
        const windNum={east:'1',south:'2',west:'3',north:'4'};
        const windName={'1':'东','2':'南','3':'西','4':'北'};
        const isWindPung=(n)=>hand.filter(t=>t.suit==='z'&&t.num===n).length>=3;
        const rw=roundWind&&windNum[roundWind];
        const sw=seatWind&&windNum[seatWind];
        const hasRw=!!(rw&&isWindPung(rw));
        const hasSw=!!(sw&&isWindPung(sw));
        if(hasRw&&hasSw&&rw===sw){
            // 圈风与门风为同一种风：合并为一项「东风东」，计 2 赋
            r.push({name:windName[rw]+'风'+windName[sw],fu:2});
        }else{
            if(hasRw)r.push({name:windName[rw]+'役牌',fu:1});
            if(hasSw)r.push({name:windName[sw]+'役牌',fu:1});
        }
        for(let d of['5','6','7'])if(isWindPung(d))r.push({name:{5:'白',6:'发',7:'中'}[d]+'役牌',fu:1});
        return r;
    }
}
