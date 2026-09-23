export const PROPERTY_RENT_RATES=[0,.40,.80,1.50,2.50];
export const PROPERTY_UPGRADE_RATES=[0,0,.60,.90,1.20];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v).toLocaleString('ko-KR');
export const ownershipLabel=level=>level>=4?'강화 3단계 · 영구 소유':level>1?`강화 ${level-1}단계`:'소유';
export function propertyQuote({kind,tile,cash,prop,discount=false,network=false,boost=false}){
 const level=kind==='buy'?1:kind==='upgrade'?prop.level+1:prop.level;
 const base=kind==='buy'?tile.price:kind==='upgrade'?Math.round(tile.price*PROPERTY_UPGRADE_RATES[level]):kind==='buyout'?prop.invested*2:0;
 const cost=discount&&kind==='upgrade'?Math.round(base*.5):discount&&kind==='buyout'?Math.round(base*.7):base;
 const incomeAt=l=>Math.round(tile.price*PROPERTY_RENT_RATES[l])*(network?2:1)*(boost?2:1);
 return {kind,name:tile.name,level,base,cost,discount:base-cost,cash,remaining:cash-cost,shortage:Math.max(0,cost-cash),affordable:cash>=cost,income:incomeAt(level),beforeIncome:prop?incomeAt(prop.level):0,beforeLevel:prop?.level||0,invested:prop?.invested||0,sale:prop?Math.round(prop.invested*.7):0,network,boost};
}
export function quoteMarkup(q){
 const row=(label,value,cls='')=>`<div class="pm-price-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
 const action={buy:'구매',upgrade:'강화',buyout:'인수',hold:'보유'}[q.kind];
 const state=q.kind==='upgrade'?`${ownershipLabel(q.beforeLevel)} → ${ownershipLabel(q.level)}`:ownershipLabel(q.level);
 return `<div class="pm-property-summary"><strong class="pm-property-name">${esc(q.name)}</strong><span class="pm-property-state">${esc(state)}</span></div><div class="pm-price-list">${row(q.kind==='buyout'?'방문 비용 정산 후 보유 민심':'현재 보유 민심',n(q.cash))}${q.kind==='hold'?row('누적 투자 민심',n(q.invested))+row('매각 시 받는 민심',n(q.sale)):row(`기본 ${action} 비용`,n(q.base))+(q.discount?row('카드 할인',`−${n(q.discount)}`,'is-discount'):'')+row('최종 지불 금액',n(q.cost),'is-total')+row(`${action} 후 남는 민심`,q.affordable?n(q.remaining):`${n(q.shortage)} 부족`,q.affordable?'is-balance':'is-shortage')}${row('상대 방문 시 받을 민심',q.kind==='upgrade'?`${n(q.beforeIncome)} → ${n(q.income)}`:n(q.income),'is-income')}</div><small class="pm-property-note">${q.level>=4?'영구 소유 · 상대 인수 불가':'강화 3단계 달성 시 영구 소유'}${q.network?' · 같은 그룹 독점 2배':''}${q.boost?' · 다음 수입 2배 카드 반영':''}<br>상대가 방어권을 사용하면 방문 수입이 면제됩니다.</small>`;
}
