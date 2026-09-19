export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
export function round1(value) {
    return Math.round(value * 10) / 10;
}
export function parseDateParts(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m)
        throw new Error(`Invalid date format: ${value}. Expected YYYY-MM-DD.`);
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31)
        throw new Error(`Invalid date: ${value}`);
    return { year, month, day };
}
export function parseTimeParts(value) {
    if (!value)
        return { hour: 12, minute: 0, known: false };
    const m = /^(\d{2}):(\d{2})$/.exec(value);
    if (!m)
        throw new Error(`Invalid time format: ${value}. Expected HH:mm.`);
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59)
        throw new Error(`Invalid time: ${value}`);
    return { hour, minute, known: true };
}
export function formatDate(year, month, day) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function todayInTimeZone(timeZone = 'Asia/Seoul') {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}
export function emptyDistribution() {
    return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}
export function normalizeDistribution(input) {
    const total = Object.values(input).reduce((a, b) => a + b, 0) || 1;
    return {
        wood: input.wood / total,
        fire: input.fire / total,
        earth: input.earth / total,
        metal: input.metal / total,
        water: input.water / total
    };
}
export function balanceDistance(input) {
    const n = normalizeDistribution(input);
    return Object.values(n).reduce((sum, v) => sum + Math.abs(v - 0.2), 0);
}
export function addElement(input, element, amount) {
    input[element] += amount;
}
/** Stable FNV-1a-ish hash. Used only to choose text variants, never to change scores. */
export function stableHash(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
export function pickStable(items, seed) {
    if (items.length === 0)
        throw new Error('pickStable requires at least one item.');
    return items[stableHash(seed) % items.length];
}
