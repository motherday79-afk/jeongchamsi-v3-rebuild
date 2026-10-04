export const ANIMALS=['쥐띠','소띠','호랑이띠','토끼띠','용띠','뱀띠','말띠','양띠','원숭이띠','닭띠','개띠','돼지띠'];
export const SIGNS=['물병자리','물고기자리','양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리'];
export const SIGN_DATES=['1.20–2.18','2.19–3.20','3.21–4.19','4.20–5.20','5.21–6.21','6.22–7.22','7.23–8.22','8.23–9.22','9.23–10.22','10.23–11.22','11.23–12.21','12.22–1.19'];
export const fortuneDay=(now=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const memory=new Map(),key=id=>'jcs:fortune-preferences:v1:'+encodeURIComponent(id||'');
export function readFortunePreferences(id,storage){let value=memory.get(key(id));try{value=JSON.parse((storage??globalThis.localStorage)?.getItem(key(id))||'null')||value;}catch{}return {tab:['overall','animal','star'].includes(value?.tab)?value.tab:'overall',animal:ANIMALS.includes(value?.animal)?value.animal:ANIMALS[0],star:SIGNS.includes(value?.star)?value.star:SIGNS[0]};}
export function saveFortunePreferences(id,value,storage){memory.set(key(id),value);try{(storage??globalThis.localStorage)?.setItem(key(id),JSON.stringify(value));}catch{}}
const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const messages={
 overall:[['작은 시작의 힘','미뤄둔 일을 하나만 시작해 보세요. 생각보다 가벼운 첫걸음이 하루의 분위기를 바꿉니다.'],['천천히, 분명하게','서두르기보다 우선순위를 정해 보세요. 오늘 해야 할 한 가지가 또렷해집니다.'],['반가운 연결','먼저 건네는 짧은 안부가 좋은 대화의 시작이 됩니다. 주변 사람의 이야기에 귀 기울여 보세요.'],['내 페이스를 찾는 날','다른 사람의 속도와 비교하지 마세요. 익숙한 일을 차분히 마무리하는 데 집중해 보세요.'],['새로운 시선','평소와 다른 방법을 작게 시도해 보세요. 막혀 있던 생각에 새로운 방향이 보일 수 있습니다.'],['정리가 주는 여유','복잡한 계획과 주변을 정리해 보세요. 덜어낸 만큼 필요한 일에 집중하기 쉬워집니다.'],['꾸준함이 빛나는 날','그동안 쌓아온 노력을 돌아보세요. 작은 진전을 알아보는 일이 다음 걸음을 돕습니다.'],['한 번 더 살펴보기','마음을 정하기 전 놓친 조건이 없는지 살펴보세요. 잠깐의 점검이 하루를 편하게 만듭니다.'],['편안한 대화','잘 설명하려 애쓰기보다 솔직하고 짧게 말해 보세요. 상대의 답을 기다리는 여유도 좋습니다.'],['기분 좋은 마무리','새 일을 벌이기보다 끝내지 못한 일에 집중해 보세요. 마무리에서 작은 만족을 찾을 수 있습니다.'],['휴식도 계획입니다','잠시 쉬어가는 시간을 정해 보세요. 몸과 마음이 편해야 눈앞의 기회도 잘 보입니다.'],['작은 용기를 내세요','부담 없는 제안이나 질문부터 시작해 보세요. 망설였던 일을 한 걸음 움직이기 좋은 날입니다.']],
 money:[['지출 점검','작은 지출을 돌아보세요.'],['계획적인 소비','필요한 항목부터 정리하세요.'],['한 번 더 비교','조건을 꼼꼼히 살펴보세요.'],['여유를 남기기','예산에 작은 여유를 두세요.'],['균형 잡기','수입과 지출의 균형을 보세요.'],['차분한 판단','충동적인 선택은 잠시 미루세요.']],
 business:[['우선순위 정리','중요한 일부터 시작하세요.'],['새로운 제안','작은 아이디어를 나눠보세요.'],['마무리의 힘','진행하던 일을 정리하세요.'],['협력의 기회','혼자보다 함께 생각하세요.'],['꼼꼼한 점검','작은 조건도 살펴보세요.'],['꾸준한 전진','정한 계획을 이어가세요.']],
 relationship:[['먼저 건넨 안부','가벼운 인사를 건네보세요.'],['경청의 힘','상대의 말을 끝까지 들어보세요.'],['솔직한 마음','짧고 다정하게 표현하세요.'],['적당한 여유','서로의 시간을 존중하세요.'],['고마움 전하기','작은 도움에도 감사를 표현하세요.'],['따뜻한 한마디','부드러운 말투를 선택하세요.']]
};
// Date-keyed editorial entertainment readings; no external API or personal data required.
export function signFortune(tab,selection,date=fortuneDay()){
 const allowed=tab==='animal'?ANIMALS:tab==='star'?SIGNS:[];if(!allowed.includes(selection))throw Error('INVALID_FORTUNE_SELECTION');
 const result={ok:true,date};for(const category of ['overall','money','business','relationship']){const n=hash(date+':'+tab+':'+selection+':'+category),[title,summary]=messages[category][n%messages[category].length];result[category]={title,summary,score:55+(hash('score:'+n)%41)};}return result;
}
