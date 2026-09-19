import { LunarHour, SolarTime } from 'tyme4ts';
import { STEM_META } from './constants.js';
import { formatDate, parseDateParts, parseTimeParts } from './utils.js';
function pillarFromName(name) {
    const chars = Array.from(name);
    if (chars.length < 2)
        throw new Error(`Unexpected pillar name: ${name}`);
    const stem = chars[0];
    const branch = chars[1];
    const meta = STEM_META[stem];
    if (!meta)
        throw new Error(`Unknown heavenly stem: ${stem}`);
    return {
        name: `${stem}${branch}`,
        stem,
        branch,
        stemElement: meta.element,
        stemYinYang: meta.yinYang
    };
}
export function resolveBirthPillars(args) {
    const { year, month, day } = parseDateParts(args.birthDate);
    const { hour, minute, known } = parseTimeParts(args.birthTime);
    let solarTime;
    if (args.calendarType === 'solar') {
        solarTime = SolarTime.fromYmdHms(year, month, day, hour, minute, 0);
    }
    else {
        const lunarMonth = args.isLeapMonth ? -month : month;
        solarTime = LunarHour.fromYmdHms(year, lunarMonth, day, hour, minute, 0).getSolarTime();
    }
    const lunarHour = solarTime.getLunarHour();
    const eightChar = lunarHour.getEightChar();
    // Resolve the solar date without JS Date timezone conversion.
    const solarDay = solarTime.getSolarDay();
    const solarMonth = solarDay.getSolarMonth();
    const resolvedSolarDate = formatDate(solarMonth.getSolarYear().getYear(), solarMonth.getMonth(), solarDay.getDay());
    return {
        resolvedSolarDate,
        birthTimeKnown: known,
        year: pillarFromName(eightChar.getYear().getName()),
        month: pillarFromName(eightChar.getMonth().getName()),
        day: pillarFromName(eightChar.getDay().getName()),
        hour: pillarFromName(eightChar.getHour().getName())
    };
}
export function resolveDailyPillars(targetDate) {
    const { year, month, day } = parseDateParts(targetDate);
    // Noon avoids the 23:00 day-boundary school difference for a date-only daily fortune.
    const eightChar = SolarTime.fromYmdHms(year, month, day, 12, 0, 0).getLunarHour().getEightChar();
    return {
        year: pillarFromName(eightChar.getYear().getName()),
        month: pillarFromName(eightChar.getMonth().getName()),
        day: pillarFromName(eightChar.getDay().getName())
    };
}
