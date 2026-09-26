import {recordQuest} from './mining-quests.js';
const marks=['태양','달','별','왕관','눈','날개'],gems=['루비','사파이어','에메랄드','자수정','호박','진주'],weapons=['검','창','활','도끼','지팡이','방패'];
export function ruinsPuzzle(seed){
 let x=seed>>>0;const random=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const m=shuffle(marks),g=shuffle(gems),w=shuffle(weapons),board=m.map((mark,id)=>({id,mark,gem:g[id],weapon:w[id]})),answer=Math.floor(random()*6),bits=fn=>board.reduce((n,b)=>n|(fn(b)?1<<b.id:0),0),pool=[];
 const atoms=[];
 for(const b of board){atoms.push({text:`왕묘는 ${b.mark} 문양 석관보다 번호가 작다`,mask:bits(t=>t.id<b.id)},{text:`왕묘는 ${b.gem} 석관보다 번호가 크다`,mask:bits(t=>t.id>b.id)},{text:`왕묘는 ${b.weapon} 석관과 바로 이웃한다`,mask:bits(t=>Math.abs(t.id-b.id)===1)});}
 const unique=new Set();
 for(const a of atoms)for(const b of atoms){const mask=a.mask^b.mask;if(!(mask&(1<<answer))||unique.has(mask)||mask.toString(2).replaceAll('0','').length<3)continue;unique.add(mask);pool.push({mask,text:`두 기록 중 정확히 하나만 참입니다. ① ${a.text}. ② ${b.text}.`});}
 let clues;
 for(let k=0;k<6000&&!clues;k++){const c=shuffle(pool).slice(0,4);if(c.length!==4||c.reduce((n,a)=>n&a.mask,63)!==(1<<answer))continue;if(c.every((_,i)=>c.filter((_,j)=>i!==j).reduce((n,a)=>n&a.mask,63)!==(1<<answer)))clues=c;}
 // Guaranteed solvable fallback: every clue contributes a distinct exclusion.
 if(!clues){const others=shuffle(board.filter(b=>b.id!==answer)),common=others.pop();clues=others.map(b=>({mask:63^(1<<common.id)^(1<<b.id),text:`왕묘에는 ${common.gem}도 없고, ${b.weapon}도 새겨져 있지 않습니다.`}));}
 const questions=[{text:'왕묘는 1~3번 중에 있습니까?',mask:7},{text:'왕묘는 홀수 번호입니까?',mask:21},...board.map(b=>({text:`왕묘는 ${b.mark} 문양과 이웃합니까?`,mask:bits(t=>Math.abs(t.id-b.id)===1)}))];
 return {board,answer,clues,questions};
}
const pub=r=>({id:r.id,board:r.board,clues:r.clues.map((c,i)=>({id:i,text:r.revealed.includes(i)?c.text:null})),questions:r.questions.map((q,id)=>({id,text:q.text})),asked:r.asked,done:r.done,won:r.won,choice:r.choice,...(r.done?{answer:r.answer,explanation:r.clues.map(c=>({text:c.text,possible:r.board.filter(b=>c.mask&(1<<b.id)).map(b=>b.id+1)}))}:{})});
export function ruinsAction(s,input,now,seed){
 if(input.action==='ruins-start'){
  if(s.ruinsRun&&!s.ruinsRun.done&&now-s.ruinsRun.startedAt<1800000)return {ruins:pub(s.ruinsRun)};
  s.ruinsRun={...ruinsPuzzle(seed),id:input.requestId,startedAt:now,revealed:[],asked:[],done:false,won:false};return {ruins:pub(s.ruinsRun)};
 }
 const r=s.ruinsRun;if(!r||r.id!==input.runId||r.done||now-r.startedAt>1800000)throw Error('MINE_RUINS_RUN');
 if(input.action==='ruins-clue'){if(!Number.isInteger(input.clue)||input.clue<0||input.clue>3)throw Error('MINE_RUINS_INPUT');if(!r.revealed.includes(input.clue))r.revealed.push(input.clue);}
 else if(input.action==='ruins-ask'){if(!Number.isInteger(input.question)||!r.questions[input.question])throw Error('MINE_RUINS_INPUT');if(!r.asked.some(a=>a.id===input.question)){if(r.asked.length>=2)throw Error('MINE_RUINS_QUESTIONS');r.asked.push({id:input.question,yes:!!(r.questions[input.question].mask&(1<<r.answer))});}}
 else if(input.action==='ruins-finish'){if(!Number.isInteger(input.choice)||input.choice<0||input.choice>5)throw Error('MINE_RUINS_INPUT');r.choice=input.choice;r.done=true;r.won=input.choice===r.answer;if(r.won)recordQuest(s,'ruins-success',now);}
 else throw Error('MINE_RUINS_INPUT');
 return {ruins:pub(r)};
}
