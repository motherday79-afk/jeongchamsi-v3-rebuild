import { resolveBirthPillars, resolveDailyPillars } from './calendar.js';
import { buildBirthChart, buildDailyContext } from './bazi.js';
import { scoreFortune } from './scoring.js';
import { interpretAll } from './interpretation.js';
import { todayInTimeZone } from './utils.js';
export function getDailyFortune(input) {
    if (!input.userKey?.trim())
        throw new Error('userKey is required.');
    const timezone = input.timezone ?? 'Asia/Seoul';
    const targetDate = input.targetDate ?? todayInTimeZone(timezone);
    const birth = resolveBirthPillars({
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        calendarType: input.calendarType,
        isLeapMonth: input.isLeapMonth
    });
    const chart = buildBirthChart({
        ...birth,
        sourceCalendar: input.calendarType
    });
    const dailyPillars = resolveDailyPillars(targetDate);
    const daily = buildDailyContext(chart, targetDate, dailyPillars.year, dailyPillars.month, dailyPillars.day);
    const raw = scoreFortune(chart, daily);
    const interpreted = interpretAll(raw, `${input.userKey}|${targetDate}`);
    return {
        engine: 'JCS FORTUNE ENGINE v1',
        date: targetDate,
        displayName: input.displayName,
        ...interpreted,
        signals: raw.signals,
        chart: {
            dayMaster: chart.dayMaster.stem,
            yearPillar: chart.pillars.year.name,
            monthPillar: chart.pillars.month.name,
            dayPillar: chart.pillars.day.name,
            ...(chart.pillars.hour ? { hourPillar: chart.pillars.hour.name } : {})
        },
        meta: {
            deterministic: true,
            birthTimeKnown: chart.birthTimeKnown,
            genderUsedInScoring: false,
            disclaimer: '운세는 전통 명리 요소를 바탕으로 한 JCS 엔터테인먼트 콘텐츠입니다. 중요한 의사결정의 근거로 사용하지 마세요.'
        }
    };
}
