export const MOCK_BILL={
 id:'financial-recovery-001',number:'001',title:'금융자산 피해회복 특별법',author:'김광선',date:'2026-10-03',documentDate:'2026-08-08',version:1,
 summary:'국민이 자신의 자금을 맡기고, 공적 금융역량으로 회복의 기회를 만드는 국민회복계좌를 제안합니다.',
 document:'/assets/bills/financial-recovery-kim.pdf',
 seatSource:'https://bill.modu.help/parties',seatDate:'2026-10-03',
 methodology:'제안서와 재정·형평성·운용 독립성 쟁점을 바탕으로 작성한 최초 AI 모의평가입니다. 정당별 수치는 가상 시나리오이며 실제 정당의 입장이나 의원의 표결을 뜻하지 않습니다.',
 rules:'가상 패널 300명 전원 출석 · 찬성 151명 이상 모의 가결 · 공석 대응 1명 기권 고정',
 facts:[['최대 5천만원','지원금이 아닌 자기자금 예탁한도'],['10조원','1차 시범 총 모집한도'],['최대 5년','한시 운영 후 종료']],
 sections:[
 ['무엇을 해결하려는 법안인가요?','시장 충격으로 금융손실을 겪은 국민에게 자기자금을 활용한 회복 경로를 마련하자는 제안입니다. 제안서는 국민의 금융생활 회복과 국내 자본시장 신뢰 회복을 목표로 합니다.'],
 ['국민회복계좌는 어떻게 운영하나요?','참여한도는 5천만원, 검증된 순손실액, 금융자산 대비 허용한도 중 가장 작은 금액입니다. 전체 증권계좌를 합산해 손실을 검증하고, 차입자금 예탁을 제외하며 1인 1계좌로 운영합니다.'],
 ['국민연금의 돈을 사용하는 건가요?','제안서는 국민연금기금의 자산·회계와 회복기금을 분리합니다. 국민연금에는 자산배분·위험관리·운용사 평가 등 전문역량 협업을 요청하고, 실제 운용은 별도 기금과 복수 전문운용사가 담당하도록 제안합니다.'],
 ['수익과 손실은 어떻게 처리하나요?','고정 수익률을 약속하지 않고 실제 실현 순이익이 있을 때 성과배당을 지급합니다. 손실은 후순위 자금과 준비금으로 완충하고, 만기 잔여 원금부족에 한해 국회 사전동의와 법정 한도 내 국가보증을 제안합니다.'],
 ['다음 단계로 무엇을 요청하나요?','관계부처 합동 TF가 60일 이내 피해규모, 법적 협업 범위, 재정추계와 특별법 조문안을 검토하도록 요청합니다. 원문은 정책 제안서이며 실제 국회에 접수된 법률안이 아닙니다.']
 ],
 parties:[
 {id:'democratic',name:'더불어민주당',color:'#2463b4',seats:161,yes:42,no:96,abstain:23,reason:'피해회복이라는 목표에 대한 공감과 별개로, 재정 노출액과 기존 금융정책과의 정합성이 충분히 정리되지 않았다는 우려를 크게 반영했습니다.',support:'현금 보전 대신 자기자금 참여와 전문운용을 연결하는 회복 통로.',concern:'국가보증의 구체적 상한과 피해 인정기간, 다른 피해자와의 형평성.',condition:'국가보증 상한·재원과 소액 피해자 우선 참여 기준을 구체화.'},
 {id:'ppp',name:'국민의힘',color:'#d94854',seats:109,yes:78,no:18,abstain:13,reason:'정부의 투자자 보호 대응을 점검하고 피해회복 대안을 요구하는 동기를 반영했습니다. 동시에 투자손실에 대한 공적 부담을 경계하는 반대·기권도 남겼습니다.',support:'정부 대응 점검과 자기책임을 유지하는 피해회복 대안.',concern:'국가의 투자위험 인수와 향후 반복적인 구제 요구.',condition:'보증 한도와 일몰을 엄격히 하고 위험자산 편입 제한을 명문화.'},
 {id:'rebuilding',name:'조국혁신당',color:'#167caa',seats:12,yes:6,no:3,abstain:3,reason:'금융소비자 보호와 공적 책임의 필요성에 무게를 두되, 피해 구제의 우선순위와 운용 통제장치를 쟁점으로 평가했습니다.',support:'금융소비자의 회복 기회와 공적 운용의 투명성.',concern:'가입자 선정의 공정성과 운용기관에 대한 실효적 감독.',condition:'소액 피해자 보호와 독립 감사·이해충돌 방지 강화.'},
 {id:'progressive',name:'진보당',color:'#c13c75',seats:4,yes:1,no:2,abstain:1,reason:'추가 예탁자금이 없는 피해자와 비투자 취약계층이 혜택에서 제외될 수 있다는 형평성 우려를 크게 반영했습니다.',support:'금융피해자의 생활 회복을 공적 과제로 다루는 방향.',concern:'자기자금이 남은 사람에게 혜택이 집중될 가능성.',condition:'생계 곤란 피해자 지원과 소득·자산별 우선순위 보완.'},
 {id:'reform',name:'개혁신당',color:'#df7930',seats:3,yes:0,no:2,abstain:1,reason:'투자 자기책임과 국가보증의 도덕적 해이 문제를 우선적으로 검토한 시나리오입니다.',support:'손실 검증, 차입금 제외와 제도의 한시성.',concern:'시장손실의 공적 이전과 민간 운용상품과의 경쟁.',condition:'공적 보증을 축소하고 기존 제도 대비 비용·효과를 제시.'},
 {id:'basic',name:'기본소득당',color:'#218a83',seats:1,yes:0,no:0,abstain:1,reason:'회복 기회를 넓힌다는 취지는 검토할 수 있으나, 특정 투자손실과 예탁 여력에 따라 접근성이 달라지는 구조의 보완을 요구하는 기권으로 설정했습니다.',support:'공적 금융역량의 성과를 국민과 나누는 방향.',concern:'소득·자산에 따른 접근 격차와 지원 범위.',condition:'예탁 여력이 낮은 국민까지 포괄하는 형평성 대안 제시.'},
 {id:'social',name:'사회민주당',color:'#ca7445',seats:1,yes:1,no:0,abstain:0,reason:'공적 위험관리와 제한된 손실완충을 결합하는 회복정책에 찬성하되, 재분배와 통제장치의 보완을 요구하는 시나리오입니다.',support:'공적 전문성과 국민의 자발적 참여를 연결하는 제도.',concern:'기금의 수혜 편중과 운용 수수료·감독 문제.',condition:'수혜 분포 공시와 소액 참여자 보호를 의무화.'},
 {id:'independent',name:'무소속',color:'#788296',seats:8,yes:4,no:2,abstain:2,reason:'공통 당론을 가정하지 않고 지역의 피해회복 요구, 재정부담과 형평성 판단이 나뉘는 것으로 평가했습니다.',support:'지역 투자 피해자에게 새로운 회복 경로 제공.',concern:'지역별 수혜 격차와 재정의 우선순위.',condition:'지역·소득별 피해 실측과 단계적 시범 평가.'},
 {id:'vacant',name:'공석 대응',color:'#a4a9b3',seats:1,yes:0,no:0,abstain:1,reason:'300명 구성 유지를 위한 공석 대응 패널입니다. 기권으로 고정합니다.',support:'—',concern:'—',condition:'실제 정당에 배정하지 않음'}
 ]
};
export function tally(bill){const r=bill.parties.reduce((a,p)=>({yes:a.yes+p.yes,no:a.no+p.no,abstain:a.abstain+p.abstain}),{yes:0,no:0,abstain:0});return {...r,total:r.yes+r.no+r.abstain,passed:r.yes>=151,needed:Math.max(0,151-r.yes)};}
export function validateBill(bill){let total=0;const ids=new Set();for(const p of bill.parties){if(ids.has(p.id)||![p.seats,p.yes,p.no,p.abstain].every(n=>Number.isInteger(n)&&n>=0)||p.yes+p.no+p.abstain!==p.seats)throw Error('INVALID_PARTY_VOTES');ids.add(p.id);total+=p.seats;}const vacant=bill.parties.find(p=>p.id==='vacant');if(total!==300||!vacant||vacant.seats!==1||vacant.abstain!==1)throw Error('INVALID_ASSEMBLY');return true;}
export function ballots(bill){validateBill(bill);let i=0;return bill.parties.flatMap(p=>['yes','no','abstain'].flatMap(v=>Array.from({length:p[v]},()=>({id:`JCS-MP-${String(++i).padStart(3,'0')}`,party:p.id,vote:v}))));}
