import { BRANCH_HIDDEN_STEMS, SIX_CLASHES, SIX_COMBINES, SIX_HARMS, STEM_COMBINES, STEM_META, THREE_HARMONY_GROUPS } from './constants.js';
import { addElement, balanceDistance, clamp } from './utils.js';
const TEN_GOD_SCORE = {
    比肩: { money: -1, business: 4, relationship: 7, overall: 2 },
    劫財: { money: -8, business: 3, relationship: 5, overall: -1 },
    食神: { money: 6, business: 10, relationship: 4, overall: 6 },
    傷官: { money: 3, business: 8, relationship: 1, overall: 3 },
    偏財: { money: 12, business: 7, relationship: 5, overall: 7 },
    正財: { money: 14, business: 5, relationship: 4, overall: 8 },
    七殺: { money: -1, business: 8, relationship: -2, overall: 2 },
    正官: { money: 3, business: 12, relationship: 4, overall: 7 },
    偏印: { money: -2, business: 4, relationship: 2, overall: 1 },
    正印: { money: 0, business: 6, relationship: 6, overall: 5 }
};
function cloneDist(input) {
    return { ...input };
}
function applyDailyPillarToDistribution(dist, day) {
    addElement(dist, day.stemElement, 0.8);
    const hidden = BRANCH_HIDDEN_STEMS[day.branch] ?? [];
    const weights = hidden.length === 1 ? [0.8] : hidden.length === 2 ? [0.6, 0.2] : [0.55, 0.17, 0.08];
    hidden.forEach((stem, i) => {
        const meta = STEM_META[stem];
        if (meta)
            addElement(dist, meta.element, weights[i] ?? 0);
    });
}
function elementBalanceDelta(chart, daily) {
    const before = balanceDistance(chart.elementDistribution);
    const afterDist = cloneDist(chart.elementDistribution);
    applyDailyPillarToDistribution(afterDist, daily.day);
    const after = balanceDistance(afterDist);
    // Positive means today's element mix moves the chart closer to an even five-element balance.
    return clamp((before - after) * 45, -9, 9);
}
function relationOfBranches(a, b) {
    const pair = `${a}${b}`;
    if (SIX_COMBINES.has(pair))
        return 'combine';
    if (SIX_CLASHES.has(pair))
        return 'clash';
    if (SIX_HARMS.has(pair))
        return 'harm';
    if (THREE_HARMONY_GROUPS.some((group) => group.has(a) && group.has(b) && a !== b))
        return 'threeHarmony';
    return 'none';
}
function branchSignals(chart, daily) {
    const natal = [
        { branch: chart.pillars.year.branch, weight: 0.8 },
        { branch: chart.pillars.month.branch, weight: 1.15 },
        { branch: chart.pillars.day.branch, weight: 1.45 },
        ...(chart.pillars.hour ? [{ branch: chart.pillars.hour.branch, weight: 0.8 }] : [])
    ];
    let combine = 0;
    let clash = 0;
    let harm = 0;
    let threeHarmony = 0;
    let weightedNet = 0;
    for (const item of natal) {
        const r = relationOfBranches(daily.day.branch, item.branch);
        if (r === 'combine') {
            combine += 1;
            weightedNet += 4.2 * item.weight;
        }
        else if (r === 'threeHarmony') {
            threeHarmony += 1;
            weightedNet += 2.2 * item.weight;
        }
        else if (r === 'clash') {
            clash += 1;
            weightedNet -= 5.2 * item.weight;
        }
        else if (r === 'harm') {
            harm += 1;
            weightedNet -= 2.7 * item.weight;
        }
    }
    return { combine, threeHarmony, clash, harm, weightedNet: clamp(weightedNet, -14, 14) };
}
function stemCombineCount(chart, daily) {
    const stems = [chart.pillars.year.stem, chart.pillars.month.stem, chart.pillars.day.stem, chart.pillars.hour?.stem].filter(Boolean);
    return stems.reduce((sum, stem) => sum + (STEM_COMBINES.has(`${daily.day.stem}${stem}`) ? 1 : 0), 0);
}
export function scoreFortune(chart, daily) {
    const ten = TEN_GOD_SCORE[daily.tenGodOfDayStem];
    const balance = elementBalanceDelta(chart, daily);
    const branches = branchSignals(chart, daily);
    const stemCombines = stemCombineCount(chart, daily);
    const money = clamp(63 + ten.money + balance * 0.65 + branches.weightedNet * 0.25 + stemCombines * 0.8, 38, 95);
    const business = clamp(64 + ten.business + balance * 0.75 + branches.weightedNet * 0.45 + stemCombines * 1.0, 38, 95);
    const relationship = clamp(63 + ten.relationship + balance * 0.35 + branches.weightedNet * 0.95 + stemCombines * 1.5, 38, 95);
    const categoryAvg = money * 0.28 + business * 0.37 + relationship * 0.35;
    const overall = clamp(categoryAvg + ten.overall * 0.4 + balance * 0.35 + branches.weightedNet * 0.2, 40, 95);
    const signals = {
        tenGod: daily.tenGodOfDayStem,
        elementBalanceDelta: Math.round(balance * 10) / 10,
        branchRelations: branches,
        stemCombineCount: stemCombines,
        precision: chart.birthTimeKnown ? 'enhanced' : 'standard'
    };
    return {
        overall: Math.round(overall),
        money: Math.round(money),
        business: Math.round(business),
        relationship: Math.round(relationship),
        signals
    };
}
