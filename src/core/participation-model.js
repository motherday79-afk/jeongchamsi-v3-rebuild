export const GENERATION_AGES=Object.freeze(['20대','30대','40대','50대','60대+']);
export function generationAgeGroup(birthYear,currentYear=new Date().getFullYear()){
 const year=Number(birthYear),age=currentYear-year;
 if(!Number.isInteger(year)||year<1900||age<20||age>130)return '';
 return age<30?'20대':age<40?'30대':age<50?'40대':age<60?'50대':'60대+';
}
export function hasGenerationVote(votes={},roundId=''){
 return roundId?Object.hasOwn(votes,`round:${roundId}`)||Object.keys(votes).some(k=>k.startsWith(`${roundId}:`)):Object.hasOwn(votes,'round:legacy')||['10대',...GENERATION_AGES].some(k=>Object.hasOwn(votes,k));
}
export function castGenerationVote(data,activity,user,scope,option,currentYear=new Date().getFullYear()){
 const fail=code=>{throw new Error(code);};
 const parts=scope.slice('generation:'.length).split(':'),requestedId=parts.length>1?parts.shift():'',group=parts.join(':');
 if(user.role==='admin')fail('ADMIN_VOTE_DISABLED');
 if(!GENERATION_AGES.includes(group)||group!==generationAgeGroup(user.birthYear,currentYear))fail('AGE_GROUP_MISMATCH');
 const rows=(data.items||[]).filter(x=>x.published!==false),active=rows.find(x=>x.featured===true)||rows.find(x=>String(x.id)===String(data.activeItemId));
 if(data.enabled===false||active?.closedAt||requestedId&&requestedId!==String(active?.id||'')||!active&&rows.length)fail('GENERATION_VOTE_CLOSED');
 const roundId=active?String(active.id):'',candidates=active?.candidateIds||data.candidates||[];
 if(!candidates.includes(option))fail('CANDIDATE_NOT_ALLOWED');
 const votes=activity.generationVotes||{};
 if(hasGenerationVote(votes,roundId))fail('ALREADY_VOTED');
 const results=active?(active.results=active.results||{}):(data.results=data.results||{});
 results[group]=results[group]||{};results[group][option]=Number(results[group][option]||0)+1;
 if(active){data.results=results;data.candidates=active.candidateIds;}
 activity.generationVotes={...votes,[`round:${roundId||'legacy'}`]:option};
 return {ok:true};
}
export function participationDisplay(domain,source={}){
 const data=JSON.parse(JSON.stringify(source||{}));
 for(const item of data.items||[]){
  if(item.demo?.enabled!==true)continue;
  item.jcsDemo=true;
  if(domain==='polls')item.options=(item.options||[]).map(o=>({...o,votes:item.demo.counts?.[o.id]||0}));
  if(domain==='generation')item.results=item.demo.counts||{};
 }
 if(domain==='generation'){
  const active=(data.items||[]).find(x=>x.featured===true)||(data.items||[]).find(x=>String(x.id)===String(data.activeItemId));
  if(active){data.results=active.results||{};data.candidates=active.candidateIds||[];data.jcsDemo=!!active.jcsDemo;}
 }
 if(domain==='nationalEvaluation'){
  // Demo display is explicit and per item. Never fall back to unlabeled demo counts.
  data.demoMode=false;
  for(const slot of Object.values(data.slots||{})){
   const item=(data.items||[]).find(x=>x.id===slot.itemId||`evaluation-${x.id}`===slot.evaluationId);
   if(item?.jcsDemo){data.results=data.results||{};data.results[slot.evaluationId]=item.demo.counts||{};slot.jcsDemo=true;}
  }
 }
 return data;
}
export const demoLabel=enabled=>enabled?'<span class="jcs-demo-label">JCS 데모데이터</span>':'';
