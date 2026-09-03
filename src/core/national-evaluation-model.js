export const NATIONAL_EVALUATION_SLOT_KEYS=Object.freeze(['assembly','local']);
const text=value=>String(value||'').trim();
const count=value=>Math.max(0,Math.round(Number(value||0)||0));
export const nationalEvaluationTypeLabel=id=>/^assembly-/.test(text(id))?'국회의원':/^metropolitan-/.test(text(id))?'광역단체장':/^basic-/.test(text(id))?'기초단체장':'정치인';
export function normalizeNationalEvaluation(input={}){
  const data=input&&typeof input==='object'?input:{},slots=data.slots&&typeof data.slots==='object'?data.slots:{};
  const normalized={};
  for(const slot of NATIONAL_EVALUATION_SLOT_KEYS){
    const source=slots[slot]||{},legacy=slot==='assembly'?data:{};
    const subjectId=text(source.subjectId||legacy.subjectId),evaluationId=text(source.evaluationId)||(subjectId?`legacy-${slot}-${subjectId}`:'');
    normalized[slot]={slot,evaluationId,subjectId:subjectId||null,enabled:subjectId?(typeof source.enabled==='boolean'?source.enabled:legacy.enabled===true):false,startedAt:text(source.startedAt),updatedAt:text(source.updatedAt),closedAt:text(source.closedAt)};
  }
  return {...data,slots:normalized,results:data.results&&typeof data.results==='object'?data.results:{},demoResults:data.demoResults&&typeof data.demoResults==='object'?data.demoResults:{},history:Array.isArray(data.history)?data.history:[]};
}
export function votesForEvaluationSlot(data={},slot={}){
  const source=data.demoMode===true?data.demoResults||{}:data.results||{},raw=source[slot.evaluationId]||source[slot.subjectId]||data.results?.[slot.evaluationId]||data.results?.[slot.subjectId]||{};
  return {positive:count(raw.positive),neutral:count(raw.neutral),negative:count(raw.negative)};
}
export const voteShare=(votes,key)=>{const total=count(votes.positive)+count(votes.neutral)+count(votes.negative);return total?Math.round(count(votes[key])*100/total):0;};
