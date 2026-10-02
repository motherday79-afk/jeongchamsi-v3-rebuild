import {MOCK_BILL,ballots,tally} from '../data/mock-bill.js?v=0.0.31.411';
const colors={yes:'#67dbbd',no:'#ff898b',abstain:'#b8c2d6'};
const hash=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,2166136261);
export function chamberSeats(bill=MOCK_BILL){
 const votes=ballots(bill),order=['democratic',...bill.parties.map(p=>p.id).filter(id=>!['democratic','ppp'].includes(id)),'ppp'];
 const ordered=order.flatMap(id=>votes.filter(v=>v.party===id).sort((a,b)=>hash(a.id+'seat')-hash(b.id+'seat')));
 return ordered.map((v,i)=>{const column=Math.floor(i/6),row=i%6,a=Math.PI+(column+.5)/50*Math.PI,r=365-row*35;return {...v,x:420+Math.cos(a)*r,y:320+Math.sin(a)*r*.73,color:bill.parties.find(p=>p.id===v.party).color};});
}
export function renderChamber(){return `<svg class="bill-chamber" viewBox="0 0 840 380" role="img" aria-label="민주당 왼쪽, 기타 정당 중앙, 국민의힘 오른쪽의 가상 본회의장 300석"><path d="M28 328 A392 292 0 0 1 812 328" fill="none" stroke="#bc9d6440" stroke-width="20"/>${chamberSeats().map(v=>`<g><rect x="${v.x-5}" y="${v.y-6}" width="10" height="12" rx="2" fill="${v.color}"/><rect data-seat-vote="${v.vote}" data-seat-id="${v.id}" x="${v.x-2.5}" y="${v.y-3}" width="5" height="6" rx="1" fill="${colors[v.vote]}"/></g>`).join('')}<path d="M333 326 L345 284 Q420 263 495 284 L507 326 Z" fill="#79674d"/><rect x="385" y="267" width="70" height="32" rx="5" fill="#303849" stroke="#b8a277"/><text x="420" y="288" text-anchor="middle" fill="#f4e8d0" font-size="15" font-weight="700">JCS</text><text x="170" y="356" text-anchor="middle" fill="#82b5ff" font-size="19" font-weight="700">더불어민주당</text><text x="420" y="363" text-anchor="middle" fill="#d8cfb6" font-size="17">기타 정당 · 무소속</text><text x="676" y="356" text-anchor="middle" fill="#ff929b" font-size="19" font-weight="700">국민의힘</text></svg><div class="bill-chamber-controls"><span>좌석 테두리: 정당색 · 안쪽 불빛: 표결</span><button type="button" data-bill-replay>표결 다시 보기</button></div><p class="bill-live-result" role="status" aria-live="polite"></p>`;}
const runs=new WeakMap();
export function playBillVote(hall){
 if(!hall)return;const old=runs.get(hall);if(old)cancelAnimationFrame(old);
 const seats=[...hall.querySelectorAll('[data-seat-vote]')].sort((a,b)=>hash(a.dataset.seatId+'reveal')-hash(b.dataset.seatId+'reveal'));
 const t=tally(MOCK_BILL),verdict=hall.querySelector('.bill-verdict'),quorum=hall.querySelector('.bill-quorum b'),live=hall.querySelector('.bill-live-result');
 if(!seats.length)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const totals={yes:0,no:0,abstain:0};let shown=0,start;
 seats.forEach(el=>el.style.opacity='.08');hall.classList.add('is-voting');verdict.textContent='표결 중';quorum.textContent='집계 중';live.textContent='';
 for(const v of Object.keys(totals))hall.querySelector('.bill-'+v+' strong').textContent='0';
 function frame(now){if(!hall.isConnected)return;start??=now;const count=reduced?300:Math.min(300,Math.floor((now-start)/3000*300));while(shown<count){const seat=seats[shown++];seat.style.opacity='1';totals[seat.dataset.seatVote]++;}for(const v of Object.keys(totals))hall.querySelector('.bill-'+v+' strong').textContent=totals[v];if(shown<300){runs.set(hall,requestAnimationFrame(frame));return;}hall.classList.remove('is-voting');verdict.textContent='모의 '+(t.passed?'가결':'부결');quorum.textContent=t.passed?'가결 기준 충족':`가결까지 ${t.needed}표`;live.textContent=`표결 완료. 찬성 ${t.yes}, 반대 ${t.no}, 기권 ${t.abstain}.`;runs.delete(hall);}
 runs.set(hall,requestAnimationFrame(frame));
}
export function mountBillVote(root){const hall=root.querySelector('.bill-hall');if(!hall||hall.dataset.voteMounted)return;hall.dataset.voteMounted='1';hall.querySelector('[data-bill-replay]')?.addEventListener('click',()=>playBillVote(hall));playBillVote(hall);}
