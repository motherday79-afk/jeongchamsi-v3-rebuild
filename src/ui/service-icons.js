export const SERVICE_CATALOG = Object.freeze([
  { key:"now", tone:"blue", label:"NOW Rank", shortLabel:"NOW Rank", description:"지금 가장 주목받는 정치인", href:"/now", launcher:true },
  { key:"poll", tone:"red", label:"시민들의 선택", shortLabel:"시민선택", description:"오늘의 쟁점에 직접 한 표", href:"/poll", launcher:true },
  { key:"itsme", tone:"teal", label:"IT’S ME", shortLabel:"IT’S ME", description:"내가 만드는 정책 제안", href:"/itsme", launcher:true },
  { key:"compare", tone:"orange", label:"정치인 비교분석", shortLabel:"비교분석", description:"두 사람을 같은 기준으로 비교", href:"/compare", launcher:true },
  { key:"generation", tone:"navy", label:"세대의 선택, 대통령", shortLabel:"세대별 대통령", description:"세대별 모의투표 결과", href:"/generation-president", launcher:true },
  { key:"community", tone:"green", label:"정뮤니티", shortLabel:"정뮤니티", description:"지금 시민들이 하는 말", href:"/community", launcher:true },
  { key:"president", tone:"gold", label:"대통령", shortLabel:"대통령", description:"대통령 정보와 기록", href:"/president", launcher:false },
  { key:"news", tone:"red", label:"정참시 NEWS", shortLabel:"NEWS", description:"정치 뉴스 모아보기", href:"/news", launcher:false },
  { key:"evaluation", tone:"teal", label:"정참시민 전국 평가제", shortLabel:"전국 평가제", description:"정참시민 정치인 평가", href:"/national-evaluation", launcher:false },
  { key:"academy", tone:"orange", label:"정참시 아카데미", shortLabel:"아카데미", description:"정치 교육 일정과 수강신청", href:"/academy", launcher:false },
  { key:"column", tone:"navy", label:"COLUMN", shortLabel:"COLUMN", description:"오늘 정치에서 읽어야 할 것", href:"/column", launcher:false },
  { key:"keywords", tone:"green", label:"실시간 정치키워드", shortLabel:"정치키워드", description:"지금 많이 언급되는 정치어", href:"/keywords", launcher:false },
  { key:"trending", tone:"blue", label:"실시간 급상승 정치인", shortLabel:"급상승 정치인", description:"주목도가 빠르게 오른 정치인", href:"/trending", launcher:false }
]);
const ICON_PATHS=Object.freeze({
 inquiry:`<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4M12 14h.01"/>`,
 cheer:`<path d="M12 20 4.8 13a4.7 4.7 0 0 1 6.6-6.7l.6.6.6-.6a4.7 4.7 0 0 1 6.6 6.7L12 20Z"/><path d="M12 2v1M3 4l1 1M21 4l-1 1"/>`,
 donate:`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 9h4M6 13h3M14 15l2 1 3-4M6 16h3"/>`,
 shop:`<path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-6h4v6"/>`,
 requestPolitician:`<circle cx="10" cy="9" r="3"/><path d="M4 19v-2a5 5 0 0 1 8-4"/><circle cx="17" cy="16" r="3"/><path d="m19 18 3 3"/>`,
 partners:`<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3"/>`,
 now:`<path d="M4 17 9 12l3 3 8-9"/><path d="M15 6h5v5"/>`,
 itsme:`<path d="M5 5.5h14v10H9l-4 3v-13Z"/><path d="m10 12 4.8-4.8 2 2L12 14H10v-2Z"/>`,
 column:`<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>`,
 news:`<path d="M4 6h12v12H4z"/><path d="M8 9h5M8 12h5M8 15h3"/><path d="M16 9h4v8a1 1 0 0 1-1 1h-3"/>`,
 poll:`<path d="M6 9.5h12l1.5 9H4.5l1.5-9Z"/><path d="M9 9.5V6.8a3 3 0 0 1 6 0v2.7"/><path d="m9.2 14 1.8 1.8 3.8-4"/>`,
 community:`<path d="M4 6h11v8H8l-4 3V6Z"/><path d="M14 9h6v8h-3l-3 2v-10Z"/>`,
 compare:`<path d="M12 4v16"/><path d="M5 7h5M14 7h5"/><path d="m5 7-2 5h6L7 7"/><path d="m17 7-2 5h6l-2-5"/><path d="M7 17h10"/>`,
 generation:`<circle cx="8" cy="8" r="2.5"/><circle cx="16.5" cy="9" r="2"/><path d="M3.5 18c.6-3.3 2.1-5 4.5-5s3.9 1.7 4.5 5"/><path d="M13.5 18c.4-2.5 1.4-3.8 3-3.8 1.7 0 2.8 1.3 3.2 3.8"/>`,
 president:`<path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M4 19h16"/><path d="m12 4 7 4H5z"/>`,
 evaluation:`<path d="M5 4h14v16H5z"/><path d="m8 12 2.3 2.3L16 8"/><path d="M8 7h3"/>`,
 academy:`<path d="m3 8 9-4 9 4-9 4z"/><path d="M7 10v5c2.8 2 7.2 2 10 0v-5"/><path d="M21 8v6"/>`,
 keywords:`<path d="M5 7h14M5 12h14M5 17h9"/><circle cx="18" cy="17" r="1.5"/>`,
 trending:`<path d="M13 2c1 5-3 6-3 9-2-1-2-3-2-3-3 3-4 5-4 7a8 8 0 0 0 16 0c0-5-4-9-7-13Z"/><path d="M12 14c-2 2-3 3-3 4a3 3 0 0 0 6 0c0-1-1-3-3-4Z"/>`,
 recent:`<path d="M12 8v5l3 2"/><circle cx="12" cy="12" r="9"/>`,
 badge:`<path d="M12 3 8 5v5c0 3 1.6 5.3 4 7 2.4-1.7 4-4 4-7V5z"/><path d="m9 18-1 3 4-2 4 2-1-3"/>`,
 guide:`<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>`
});
export function serviceIconSvg(key=""){return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[key]||ICON_PATHS.guide}</svg>`;}
export function launcherServices(){return SERVICE_CATALOG.filter(x=>x.launcher);}

const MODULE_ACTION_PATHS=Object.freeze({
  write:`<path d="M5 19h4l10-10-4-4L5 15v4Z"/><path d="m13.5 6.5 4 4"/>`,
  poll:ICON_PATHS.poll,
  evaluation:ICON_PATHS.evaluation,
  generation:ICON_PATHS.generation,
  compare:`<path d="m5 4 15 15M19 4 4 19"/><path d="m4 4 4 1-3 3M20 4l-4 1 3 3M4 20l4-1-3-3M20 20l-4-1 3-3"/>`,
  now:`<circle cx="7" cy="9" r="2.4"/><circle cx="17" cy="9" r="2.4"/><circle cx="12" cy="7" r="2.7"/><path d="M2.8 19c.4-3.2 1.8-4.8 4.2-4.8 1.3 0 2.3.4 3 1.2M21.2 19c-.4-3.2-1.8-4.8-4.2-4.8-1.3 0-2.3.4-3 1.2M6.8 19c.5-4 2.2-6 5.2-6s4.7 2 5.2 6"/>`,
  column:`<path d="M5 4h10v16H5z"/><path d="m14 15 5.5-5.5 1.5 1.5-5.5 5.5-2 .5.5-2Z"/><path d="M8 8h4M8 12h3"/>`,
  community:ICON_PATHS.community,
  academy:ICON_PATHS.academy
});
export function moduleActionIconSvg(key=""){return `<svg viewBox="0 0 24 24" aria-hidden="true">${MODULE_ACTION_PATHS[key]||ICON_PATHS.guide}</svg>`;}

// Navigation-only solid glyphs. Shared small utility icons retain their own rendering.
const NAV_SOLID={
 president:'<path d="m2 12 14-9 14 9zM4 27h24v3H4zM7 14h4v11H7zm7 0h4v11h-4zm7 0h4v11h-4z"/>',
 news:'<rect x="3" y="4" width="22" height="25" rx="3"/><path d="M27 10h4v16a3 3 0 0 1-3 3h-1z" fill="#29262e"/><path d="M8 10h12M8 16h12M8 22h8" stroke="white" stroke-width="2"/>',
 keywords:'<path d="M5 3h16l10 13-15 15L3 18V5z"/><circle cx="10" cy="10" r="3" fill="white"/>',
 inquiry:'<path d="M6 3h20a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H12l-8 5v-6a4 4 0 0 1-2-3V7a4 4 0 0 1 4-4"/><path d="M12 11a4 4 0 0 1 8 0c0 4-4 3-4 7" stroke="white" stroke-width="2.5" fill="none"/><circle cx="16" cy="22" r="1.5" fill="white"/>',
 cheer:'<path d="M16 29 3 16C-5 5 9-2 16 7 23-2 37 5 29 16z"/>',
 donate:'<rect x="2" y="7" width="28" height="20" rx="4"/><circle cx="16" cy="17" r="6" fill="white"/><path d="M5 12h3M24 22h3" stroke="white" stroke-width="2"/>',
 shop:'<path d="M5 3h22l4 10H1zM3 16h26v14H3z"/><path d="M13 21h7v9h-7z" fill="white"/><path d="M2 14h28" stroke="white" stroke-width="2"/>',
 requestPolitician:'<circle cx="12" cy="9" r="6"/><path d="M1 29v-5a11 11 0 0 1 15-10l-3 15z"/><circle cx="23" cy="21" r="6" fill="none" stroke="#29262e" stroke-width="3"/><path d="m27 26 4 5" stroke="#29262e" stroke-width="3"/>',
 partners:'<path d="M11 2h10v6h-3V5h-4v3h-3z"/><rect x="2" y="8" width="28" height="22" rx="3"/><path d="M2 17h28" stroke="white" stroke-width="2"/><rect x="13" y="14" width="6" height="7" rx="1" fill="white"/>',
 now:'<rect x="3" y="18" width="7" height="11" rx="2"/><rect x="12" y="11" width="7" height="18" rx="2"/><rect x="21" y="3" width="7" height="26" rx="2"/>',
 poll:'<path d="M6 13h20l4 6H2z"/><rect x="3" y="21" width="26" height="9" rx="2"/><rect x="12" y="2" width="12" height="14" rx="2" transform="rotate(18 18 9)"/><path d="m15 8 2 2 4-4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
 itsme:'<path d="M6 2h15v8h7v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m17 0 5 6h-5z"/><path d="M10 22h12M10 26h8M16 12v3m-6 0 2 2m10-2-2 2" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>',
 compare:'<path d="M4 3h10a2 2 0 0 1 2 2v10l-4 3v9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2"/><path d="M20 6h8a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V20l4-3V8a2 2 0 0 1 2-2" fill="#29262e"/><path d="M6 9h6M20 24h6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>',
 community:'<path d="M3 3h18a4 4 0 0 1 4 4v5H15a6 6 0 0 0-6 6v4l-6 4v-7a4 4 0 0 1-3-4V7a4 4 0 0 1 3-4"/><path d="M16 14h12a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4v3l-5-3h-7a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4" fill="#29262e"/>',
 evaluation:'<rect x="5" y="5" width="22" height="25" rx="3"/><rect x="11" y="1" width="10" height="7" rx="2" fill="#29262e"/><path d="m10 18 4 4 8-9" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
 column:'<rect x="5" y="2" width="22" height="28" rx="3"/><path d="M11 9h10M11 15h10M11 21h7" stroke="white" stroke-width="2.5" stroke-linecap="round"/>',
 academy:'<path d="m1 11 15-8 15 8-15 8zM7 17l9 5 9-5v8c-6 5-12 5-18 0z"/><path d="M29 13v11" stroke="#29262e" stroke-width="2"/>',
 generation:'<circle cx="11" cy="9" r="5"/><path d="M1 29v-5a10 10 0 0 1 20 0v5z"/><circle cx="24" cy="11" r="4" fill="#29262e"/><path d="M23 29v-5a12 12 0 0 0-3-8c6-2 11 3 11 8v5z" fill="#29262e"/>',
 trending:'<path d="M17 1c2 8 11 11 11 20a12 12 0 0 1-24 0c0-6 4-11 7-14 0 6 3 7 3 7s5-5 3-13"/><path d="M17 16c1 4 5 5 5 9a6 6 0 0 1-12 0c0-3 3-6 4-7 0 3 2 4 2 4s2-2 1-6" fill="white"/>'
};
export function serviceNavIconSvg(key){return NAV_SOLID[key]?`<svg class="service-solid-icon" viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">${NAV_SOLID[key]}</svg>`:serviceIconSvg(key);}
