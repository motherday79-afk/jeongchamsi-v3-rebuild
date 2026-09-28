import {createHash} from 'node:crypto';
const names={gallup:'한국갤럽',realmeter:'리얼미터',nbs:'NBS'};
const ids=values=>Object.keys(names).filter(id=>values?.includes(id));
const label=values=>ids(values).map(id=>names[id]).join('·');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const latest=rows=>{const result={};for(const p of [...(rows||[])].sort((a,b)=>String(b.publishedDate).localeCompare(String(a.publishedDate)))){const id=p.provenance?.provider;if(names[id]&&!result[id])result[id]=p;}return result;};
const content=p=>p?Object.fromEntries(['institution','startDate','endDate','publishedDate','sampleSize','results','question','method','responseRate','marginOfError'].map(k=>[k,p[k]])):null;
export function changedPollProviders(before,after){const a=latest(before),b=latest(after);return Object.keys(names).filter(id=>b[id]&&hash(content(a[id]))!==hash(content(b[id])));}
export const kstDay=now=>new Date(now+9*3600000).toISOString().slice(0,10);
export function operationEvent(target,reason,at,providers=[]){return {id:`operation:${target}:${kstDay(at)}:${reason}:${ids(providers).join(',')}`,kind:'failure',target,reason,providers:ids(providers),at};}
export function pollOperationEvents(previous,next,at,changed=[]){
 const failed=(next.providers||[]).filter(p=>p.state!=='success').map(p=>p.id);
 if(failed.length)return [operationEvent('poll','source',at,failed)];
 const recovered=(previous.providers||[]).filter(p=>['error','partial'].includes(p.state)).map(p=>p.id);
 if(recovered.length)return [{...operationEvent('poll','recovered',at,recovered),kind:'recovered'}];
 if(!changed.length)return [{id:`poll-check:${kstDay(at)}`,kind:'unchanged',target:'poll',at}];
 return [];
}
export function pushCopy(event){
 const path=event.target==='rank'||event.kind==='rank'?'/now':'/ai-panel';
 if(event.kind==='rank')return {title:'나우랭크 데이터가 업데이트되었습니다.',body:'새로운 나우랭크를 확인해 보세요.',path};
 if(event.kind==='poll'){
  const selected=ids(event.providers),subject=selected.length===3?'전체':label(selected)||'JCS';
  return {title:`${subject} 여론조사 데이터가 업데이트되었습니다.`,body:'실제로 변경된 대통령 직무수행 조사 결과가 반영되었습니다.',path};
 }
 const subject=event.target==='rank'?'나우랭크':label(event.providers)?`${label(event.providers)} 여론조사`:'전체 여론조사';
 if(event.kind==='unchanged')return {title:'전체 여론조사 확인 완료 · 새 자료가 없습니다.',body:'공개 자료를 정상 확인했습니다. 기존 데이터를 유지합니다.',path};
 if(event.kind==='recovered')return {title:`${subject} 자동 갱신이 복구되었습니다.`,body:'오류 이후 정상 확인이 완료됐습니다. 데이터 변경 여부는 업데이트 알림으로 안내합니다.',path};
 if(event.kind!=='failure')return null;
 const reasons={source:'원본 수집 또는 자료 검증에 실패했습니다. 해당 기관의 기존 데이터를 유지합니다.',missing:'예약 시간 이후에도 오늘의 실행 기록이 없습니다. 자동 실행 설정 확인이 필요합니다.',stalled:'작업 진행이 15분 이상 멈췄습니다. 수집 엔진 또는 작업 큐 확인이 필요합니다.',run:'자동 갱신 작업이 실패했습니다. 수집·저장·작업 큐 로그 확인이 필요합니다.',skipped:'다른 갱신 작업이 진행 중이어서 예약 작업을 완료하지 못했습니다.'};
 return {title:`${subject} 업데이트 ${event.reason==='stalled'?'지연':event.reason==='missing'?'실행 누락':'실패'}`,body:reasons[event.reason]||reasons.run,path};
}
export function watchdogProblems({now=Date.now(),rank=null,polls=null}={}){
 const local=new Date(now+9*3600000),day=kstDay(now),minutes=local.getUTCHours()*60+local.getUTCMinutes(),events=[];
 // Hobby cron may start up to one hour late. Allow that window before reporting a missed start.
 if(minutes>=17*60+5){
  if(rank?.date!==day)events.push(operationEvent('rank','missing',now));
  else if(rank.status==='RUNNING'&&now-Number(rank.updatedAt)>15*60000)events.push(operationEvent('rank','stalled',now));
  else if(['FAILED','SKIPPED'].includes(rank.status))events.push(operationEvent('rank',rank.status==='SKIPPED'?'skipped':'run',now));
 }
 if([1,4,5].includes(local.getUTCDay())&&minutes>=18*60+10){
  const checked=Date.parse(polls?.lastCheckedAt);
  if(!Number.isFinite(checked)||kstDay(checked)!==day||new Date(checked+9*3600000).getUTCHours()<17)events.push(operationEvent('poll','missing',now));
  else events.push(...pollOperationEvents({},polls,now,['checked']).filter(e=>e.kind==='failure'));
 }
 return events;
}
export function watchdogRecovery(issues,{now=Date.now(),rank=null,polls=null}={}){
 return (issues||[]).filter(e=>e.target==='rank'?rank?.status==='COMPLETED'&&rank.completedAt>e.at:
  Date.parse(polls?.lastCheckedAt)>e.at&&polls?.providers?.length===3&&polls.providers.every(p=>p.state==='success'))
 .map(e=>({id:`recovery:${e.id||e.target+e.at}`,kind:'recovered',target:e.target,at:now}));
}
