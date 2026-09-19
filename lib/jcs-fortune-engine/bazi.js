import { BRANCH_HIDDEN_STEMS, GENERATES, CONTROLS, STEM_META } from './constants.js';
import { addElement, emptyDistribution } from './utils.js';
function hiddenStemWeights(count) {
    if (count <= 1)
        return [1];
    if (count === 2)
        return [0.75, 0.25];
    return [0.7, 0.2, 0.1];
}
function addPillarToDistribution(dist, pillar) {
    addElement(dist, pillar.stemElement, 1);
    const hidden = BRANCH_HIDDEN_STEMS[pillar.branch] ?? [];
    const weights = hiddenStemWeights(hidden.length);
    hidden.forEach((stem, i) => {
        const meta = STEM_META[stem];
        if (meta)
            addElement(dist, meta.element, weights[i] ?? 0);
    });
}
export function buildBirthChart(args) {
    const dist = emptyDistribution();
    addPillarToDistribution(dist, args.year);
    addPillarToDistribution(dist, args.month);
    addPillarToDistribution(dist, args.day);
    if (args.birthTimeKnown)
        addPillarToDistribution(dist, args.hour);
    return {
        pillars: {
            year: args.year,
            month: args.month,
            day: args.day,
            ...(args.birthTimeKnown ? { hour: args.hour } : {})
        },
        dayMaster: {
            stem: args.day.stem,
            element: args.day.stemElement,
            yinYang: args.day.stemYinYang
        },
        elementDistribution: dist,
        birthTimeKnown: args.birthTimeKnown,
        sourceCalendar: args.sourceCalendar,
        resolvedSolarDate: args.resolvedSolarDate
    };
}
export function tenGod(dayMasterStem, otherStem) {
    const me = STEM_META[dayMasterStem];
    const other = STEM_META[otherStem];
    if (!me || !other)
        throw new Error(`Unknown stem pair: ${dayMasterStem}, ${otherStem}`);
    const samePolarity = me.yinYang === other.yinYang;
    if (me.element === other.element)
        return samePolarity ? '比肩' : '劫財';
    if (GENERATES[me.element] === other.element)
        return samePolarity ? '食神' : '傷官';
    if (CONTROLS[me.element] === other.element)
        return samePolarity ? '偏財' : '正財';
    if (CONTROLS[other.element] === me.element)
        return samePolarity ? '七殺' : '正官';
    if (GENERATES[other.element] === me.element)
        return samePolarity ? '偏印' : '正印';
    throw new Error('Unable to resolve ten god.');
}
export function buildDailyContext(chart, date, year, month, day) {
    return {
        date,
        year,
        month,
        day,
        tenGodOfDayStem: tenGod(chart.dayMaster.stem, day.stem)
    };
}
