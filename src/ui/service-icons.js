export const SERVICE_CATALOG = Object.freeze([
  { key:"now", tone:"blue", label:"NOW Rank", shortLabel:"NOW Rank", description:"지금 가장 주목받는 정치인", href:"/now" },
  { key:"poll", tone:"red", label:"시민들의 선택", shortLabel:"시민선택", description:"오늘의 쟁점에 직접 한 표", href:"/poll" },
  { key:"itsme", tone:"teal", label:"IT’S ME", shortLabel:"IT’S ME", description:"내가 만드는 정책 제안", href:"/itsme" },
  { key:"compare", tone:"orange", label:"정치인 비교분석", shortLabel:"비교분석", description:"두 사람을 같은 기준으로 비교", href:"/compare" },
  { key:"generation", tone:"navy", label:"세대의 선택, 대통령", shortLabel:"세대별 대통령", description:"세대별 모의투표 결과", href:"/generation-president" },
  { key:"community", tone:"green", label:"정뮤니티", shortLabel:"정뮤니티", description:"지금 시민들이 하는 말", href:"/community" }
]);

const ICON_PATHS = Object.freeze({
  now:`<path d="M4 17 9 12l3 3 8-9"/><path d="M15 6h5v5"/>`,
  itsme:`<path d="M5 5.5h14v10H9l-4 3v-13Z"/><path d="m10 12 4.8-4.8 2 2L12 14H10v-2Z"/>`,
  poll:`<path d="M6 9.5h12l1.5 9H4.5l1.5-9Z"/><path d="M9 9.5V6.8a3 3 0 0 1 6 0v2.7"/><path d="m9.2 14 1.8 1.8 3.8-4"/>`,
  community:`<path d="M4 6h11v8H8l-4 3V6Z"/><path d="M14 9h6v8h-3l-3 2v-10Z"/>`,
  compare:`<path d="M12 4v16"/><path d="M5 7h5M14 7h5"/><path d="m5 7-2 5h6L7 7"/><path d="m17 7-2 5h6l-2-5"/><path d="M7 17h10"/>`,
  generation:`<circle cx="8" cy="8" r="2.5"/><circle cx="16.5" cy="9" r="2"/><path d="M3.5 18c.6-3.3 2.1-5 4.5-5s3.9 1.7 4.5 5"/><path d="M13.5 18c.4-2.5 1.4-3.8 3-3.8 1.7 0 2.8 1.3 3.2 3.8"/>`,
  recent:`<path d="M12 8v5l3 2"/><circle cx="12" cy="12" r="9"/>`,
  badge:`<path d="M12 3 8 5v5c0 3 1.6 5.3 4 7 2.4-1.7 4-4 4-7V5z"/><path d="m9 18-1 3 4-2 4 2-1-3"/>`,
  guide:`<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>`
});
export function serviceIconSvg(key="") { return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[key] || ICON_PATHS.guide}</svg>`; }
