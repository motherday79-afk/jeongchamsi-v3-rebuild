const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function lotteryMarkup({campaign:c,lottery:l,state,busy=false}){
 if(!c||!l)return '<p class="dialog-copy">복권 정보를 불러오는 중입니다.</p>';
 const t=l.ticket,pending=t&&!t.revealed,closed=c.status==='closed',canBuy=!busy&&!closed&&!pending&&state.gold>=20;
 const result=t?`<div class="scratch-outcome ${t.won?'is-win':'is-miss'}" aria-hidden="${!t.revealed}"><span class="scratch-emblem" aria-hidden="true">${t.won?'✦':'☾'}</span><b>${t.won?'당첨!!!':'다음 기회에…'}</b><small>${t.won?esc(t.prize)+'<br>당첨 내역에 보관했어요.':'아쉽지만 이번 복권은 당첨되지 않았어요.'}</small></div>`:`<div class="scratch-outcome is-ready"><span class="scratch-emblem" aria-hidden="true">✧</span><b>${esc(c.prize)}</b><small>20G로 행운을 확인해 보세요</small></div>`;
 return `<div class="scratch-panel"><div class="scratch-intro"><p><b>${esc(c.title)}</b><br><span data-lottery-remaining>경품 ${fmt(c.wins)} / ${fmt(c.limit)} 당첨 · ${closed?'이번 회차 종료':'남은 경품 '+fmt(c.remaining)+'개'}</span></p><span class="scratch-price">1회 20G</span></div>
 <div class="scratch-ticket" data-scratch-ticket><div class="scratch-ticket-head"><b>GOLD CHANCE</b><span>당첨 확률 5%</span></div><div class="scratch-surface ${t?.revealed?'is-revealed':''}">${result}${t?'<canvas aria-hidden="true"></canvas>':''}</div>${pending?'<button class="scratch-reveal-button" data-scratch-reveal>긁기 대신 결과 확인</button>':''}<p class="scratch-ticket-note">${t?(t.won?'당첨 확인 번호 ':'복권 번호 ')+esc(t.code||t.id):'긁는 속도나 방식은 당첨 확률에 영향을 주지 않습니다.'}</p></div>
 <div class="scratch-stats"><div><span>복권을 긁은 횟수</span><b data-lottery-plays>${fmt(l.plays)}회</b></div><div><span>나의 당첨 횟수</span><b data-lottery-wins>${fmt(l.wins)}회</b></div><div><span>당첨 확률</span><b>5%</b></div></div>
 <p class="scratch-balance">내 광산 골드 <strong>${fmt(state.gold)} G</strong></p>
 ${closed?'<p class="scratch-close-note">준비된 경품이 모두 당첨되어 이번 복권은 종료됐습니다.<br>관리자가 다음 회차를 시작하면 다시 참여할 수 있습니다. 채굴은 계속할 수 있습니다.</p>':''}
 <button class="gold-action" data-lottery-buy ${canBuy?'':'disabled'}>${closed?'이번 회차 종료':pending?'구매한 복권을 먼저 긁어주세요':state.gold<20?'20G를 모으면 참여할 수 있어요':'20G · '+(t?'다시 복권 긁기':'복권 긁기')}</button>
 <p class="scratch-purchase-note">구매와 동시에 20G가 차감되고 추첨 결과가 저장됩니다. 새로고침해도 같은 복권이 유지됩니다.</p>
 ${l.history?.length?`<details class="scratch-history"><summary>나의 경품 당첨 내역 (${fmt(l.history.length)})</summary>${l.history.map(h=>`<article><b>${esc(h.prize)}</b><small>${esc(h.code||h.id)} · ${h.fulfilled?'전달 완료':'전달 대기'}</small><span>${esc(new Date(h.at).toLocaleDateString('ko-KR'))}</span></article>`).join('')}</details>`:''}</div>`;
}
export function refreshLotteryNumbers(root,{campaign:c,lottery:l,state,busy=false}){
 if(!c||!l)return;
 const buy=root.querySelector('[data-lottery-buy]');
 if(buy){buy.disabled=busy||c.status==='closed'||!!(l.ticket&&!l.ticket.revealed)||state.gold<20;buy.textContent=c.status==='closed'?'이번 회차 종료':l.ticket&&!l.ticket.revealed?'구매한 복권을 먼저 긁어주세요':state.gold<20?'20G를 모으면 참여할 수 있어요':'20G · '+(l.ticket?'다시 복권 긁기':'복권 긁기');}
 const remaining=root.querySelector('[data-lottery-remaining]'),balance=root.querySelector('.scratch-balance strong');
 if(remaining)remaining.textContent=`경품 ${fmt(c.wins)} / ${fmt(c.limit)} 당첨 · ${c.status==='closed'?'이번 회차 종료':'남은 경품 '+fmt(c.remaining)+'개'}`;
 if(balance)balance.textContent=fmt(state.gold)+' G';
 // Do not replace a partly scratched canvas during heartbeat updates.
 const plays=root.querySelector('[data-lottery-plays]'),wins=root.querySelector('[data-lottery-wins]');
 if(plays)plays.textContent=fmt(l.plays)+'회';if(wins)wins.textContent=fmt(l.wins)+'회';
}
export function campaignAdminMarkup({campaign:c,winners=[],campaigns=[]}){
 if(!c)return '';
 const winnersHtml=winners.map(w=>`<tr><td>${esc(w.nickname||w.userId)}</td><td>${esc(w.prize)}<small>${esc(w.code||w.id)}</small></td><td><button class="fulfill-button" data-fulfill-ticket="${esc(w.id)}" data-fulfill-round="${esc(w.campaignId||c.id)}" ${w.fulfilled?'disabled':''}>${w.fulfilled?'전달 완료':'전달 완료로 표시'}</button></td></tr>`).join('');
 return `<section class="campaign-admin"><h3>광고주 복권 회차</h3><p class="dialog-copy">현재 ${esc(c.title)} · ${c.status==='closed'?'종료':'진행 중'}<br>당첨 ${fmt(c.wins)} / ${fmt(c.limit)} · 1회 20G · 당첨 확률 5%</p>
 <form class="admin-form" data-campaign-update><label>회차 이름<input name="title" maxlength="60" required value="${esc(c.title)}"></label><label>경품 이름<input name="prize" maxlength="80" required value="${esc(c.prize)}"></label><label>전체 당첨 한도<input name="limit" type="number" min="${Math.max(1,c.wins)}" max="10000" step="1" required value="${c.limit}"></label><p class="dialog-copy">현재 회차의 설정만 수정합니다. 골드와 강화는 유지됩니다.</p><button class="purple-action" type="submit">현재 회차 설정 저장</button><p class="panel-error" data-campaign-error role="status"></p></form>
 <details class="new-campaign"><summary>다음 광고주 · 새 회차 시작</summary><form class="admin-form" data-campaign-start><label>새 회차 이름<input name="title" maxlength="60" placeholder="예: 영화관 초대 이벤트" required></label><label>새 경품 이름<input name="prize" maxlength="80" value="영화예매 티켓" required></label><label>전체 당첨 한도<input name="limit" type="number" min="1" max="10000" step="1" value="50" required></label><label>광고주 이름<input name="name" maxlength="40" required></label><label>광고 문구<input name="message" maxlength="90"></label><label>광고주 주소<input name="url" type="url" placeholder="https://example.com" required></label><p class="panel-error">새 회차를 시작하면 모든 회원의 골드·저장 광물·일반 곡괭이·인부·저장고 강화가 초기화됩니다. 유료 장비 소유권과 이전 경품 당첨 기록은 유지됩니다.</p><label class="reset-confirm"><input type="checkbox" name="confirmReset" required> 초기화 내용을 확인했으며 새 회차를 시작합니다.</label><button class="gold-action" type="submit">초기화하고 새 회차 시작</button><p class="panel-error" data-campaign-error role="status"></p></form></details>
 <h3>경품 당첨자</h3><p class="dialog-copy">당첨 확인 번호를 기준으로 경품을 전달한 뒤 완료로 표시합니다. 실제 영화 예매권 자동 발급 서비스는 연결되어 있지 않습니다.</p><div class="winner-table-wrap"><table class="admin-table"><thead><tr><th>회원</th><th>경품 / 확인 번호</th><th>전달</th></tr></thead><tbody>${winnersHtml||'<tr><td colspan="3">아직 당첨자가 없습니다.</td></tr>'}</tbody></table></div>
 ${campaigns.length?`<h3>회차 기록</h3><div class="round-history">${campaigns.map(r=>`<button type="button" data-winner-round="${esc(r.id)}">${esc(r.title)} · ${fmt(r.wins)} / ${fmt(r.limit)}</button>`).join('')}</div>`:''}</section>`;
}
