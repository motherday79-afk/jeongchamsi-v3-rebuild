import {screenContours} from './bill-screen-contours.js?v=0.0.31.421';
import {MOCK_BILL,ballots,tally} from '../data/mock-bill.js?v=0.0.31.421';
const colors={yes:'#67dbbd',no:'#ff898b',abstain:'#b8c2d6'};
const hash=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,2166136261);
export function chamberSeats(bill=MOCK_BILL){
 const votes=ballots(bill),order=['democratic',...bill.parties.map(p=>p.id).filter(id=>!['democratic','ppp'].includes(id)),'ppp'];
 const ordered=order.flatMap(id=>votes.filter(v=>v.party===id).sort((a,b)=>hash(a.id+'seat')-hash(b.id+'seat')));
 return ordered.map((v,i)=>{const column=Math.floor(i/6),row=i%6,a=Math.PI+(column+.5)/50*Math.PI,r=365-row*35;return {...v,x:420+Math.cos(a)*r,y:320+Math.sin(a)*r*.73,color:bill.parties.find(p=>p.id===v.party).color};});
}
export function renderChamber(bill=MOCK_BILL){
 const all=chamberSeats(bill),groups={d:all.filter(v=>v.party==='democratic'),p:all.filter(v=>v.party==='ppp'),o:all.filter(v=>!['democratic','ppp'].includes(v.party))};
 const groupFor=s=>s.x<700?'d':s.x>840?'p':'o',used={d:0,p:0,o:0},counts={d:0,p:0,o:0};screenContours.forEach(s=>counts[groupFor(s)]++);
 const screens=screenContours.map(s=>{const group=groupFor(s),list=groups[group],v=list[Math.floor(used[group]++*list.length/counts[group])];return '<path d="'+s.path+'" fill="#142228"/><path data-seat-vote="'+v.vote+'" data-seat-id="'+v.id+'" d="'+s.path+'" fill="'+colors[v.vote]+'" style="opacity:0"/>';}).join('');
 return `<svg class="bill-populated-scene" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" role="img" aria-label="높은 뒤쪽 시점의 본회의장, 의석에 앉은 가상 인물과 모니터"><image href="/assets/bills/chamber-421.webp" width="1536" height="1024"/><rect class="bill-scene-result-wash" width="1536" height="1024"/>${screens}</svg><div class="bill-scene-space" aria-hidden="true"></div><div class="bill-chamber-controls"><button type="button" data-bill-action>결과 보기</button></div><p class="bill-live-result" role="status" aria-live="polite">결과 보기를 누르면 표결이 시작됩니다.</p><script type="application/json" data-bill-votes>${JSON.stringify(all.map(v=>({id:v.id,vote:v.vote})))}</script>`;
}
const runs=new WeakMap();
export function playBillVote(hall,{instant=false}={}){
 if(!hall)return;const old=runs.get(hall);if(old)cancelAnimationFrame(old);
 const lamps=new Map([...hall.querySelectorAll('[data-seat-vote]')].map(el=>[el.dataset.seatId,el]));const seats=JSON.parse(hall.querySelector('[data-bill-votes]').textContent).sort((a,b)=>hash(a.id+'reveal')-hash(b.id+'reveal'));
 const t=tally({parties:[{yes:Number(hall.dataset.voteYes),no:Number(hall.dataset.voteNo),abstain:Number(hall.dataset.voteAbstain)}]}),verdict=hall.querySelector('.bill-verdict'),quorum=hall.querySelector('.bill-quorum b'),live=hall.querySelector('.bill-live-result');
 if(!seats.length)return;const reduced=instant||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const totals={yes:0,no:0,abstain:0};let shown=0,start;
 lamps.forEach(el=>el.style.opacity='0');hall.dataset.voteState='playing';hall.querySelector('[data-bill-action]').textContent='빠르게 결과만 보기';hall.closest('.bill-page').querySelector('[data-bill-jump="bill-results"]').disabled=true;hall.classList.add('is-voting');verdict.innerHTML='<img src="/assets/bills/plates/voting-414.svg" alt="표결 진행 중">';quorum.textContent='집계 중';live.textContent='';
 for(const v of Object.keys(totals))hall.querySelector('.bill-'+v+' strong').textContent='0';
 function frame(now){if(!hall.isConnected)return;start??=now;const count=reduced?300:Math.min(300,Math.floor((now-start)/8000*300));while(shown<count){const vote=seats[shown++],seat=lamps.get(vote.id);if(seat){seat.style.opacity='1';if(!reduced)seat.animate([{filter:'brightness(2)'},{filter:'brightness(1)'}],{duration:450});}totals[vote.vote]++;}for(const v of Object.keys(totals))hall.querySelector('.bill-'+v+' strong').textContent=totals[v];if(shown<300){runs.set(hall,requestAnimationFrame(frame));return;}hall.classList.remove('is-voting');hall.dataset.voteState='complete';hall.querySelector('[data-bill-action]').textContent='표결 다시 보기';hall.closest('.bill-page').querySelector('[data-bill-jump="bill-results"]').disabled=false;verdict.innerHTML=`<img src="/assets/bills/plates/${t.passed?'passed':'rejected'}-414.svg" alt="모의 ${t.passed?'가결':'부결'}">`;quorum.textContent=t.passed?'가결 기준 충족':`가결까지 ${t.needed}표`;live.textContent=`표결 완료. 찬성 ${t.yes}, 반대 ${t.no}, 기권 ${t.abstain}.`;runs.delete(hall);}
 runs.set(hall,requestAnimationFrame(frame));
}
export function mountBillVote(root){const hall=root.querySelector('.bill-hall');if(!hall||hall.dataset.voteMounted)return;hall.dataset.voteMounted='1';hall.dataset.voteState='idle';hall.querySelector('[data-bill-action]').addEventListener('click',()=>playBillVote(hall,{instant:hall.dataset.voteState==='playing'}));const page=hall.closest('.bill-page');page.querySelector('[data-bill-fullscreen]')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await page.requestFullscreen();}catch{}});}
