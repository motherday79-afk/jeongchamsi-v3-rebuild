import {isSuperAdmin} from '../src/core/membership.js';
export function visibleArticleCandidates(report,personId){
 const rows=[...(report?.news||[])];
 for(const topic of report?.diagnoses||[]){const d=topic.display||{};
  if(topic.id==='01')rows.push({title:d.evidenceTitle,url:d.evidenceUrl,source:d.evidenceSource});
  if(topic.id==='05')for(const person of d.people||[])if(person.id===personId)for(const period of person.framePeriods||[])rows.push(...(period.items||[]));
  if(topic.id==='06')rows.push(...(d.lifecycle||[]));
  if(topic.id==='09')rows.push(...(d.activities||[]));
 }
 return rows;
}
export async function articleCurationRequest(req,{url,user,service,getPerson,getReport,getCandidates,getCachedCandidates,cacheCandidates}={}){
 if(!user?.id||user.status==='suspended'||user.role!=='admin')return {status:403,body:{ok:false,error:'ARTICLE_EDITOR_FORBIDDEN'}};
 if(!['GET','POST'].includes(req.method))return {status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}};
 try{
  if(req.method==='POST'&&(req.headers?.origin!==url.origin||req.headers?.['sec-fetch-site']==='cross-site'))return {status:403,body:{ok:false,error:'ORIGIN_FORBIDDEN'}};
  let input=req.body||{};if(typeof input==='string'){if(input.length>4096)throw Error('ARTICLE_INPUT_INVALID');input=JSON.parse(input);}
  if(JSON.stringify(input).length>4096)throw Error('ARTICLE_INPUT_INVALID');
  const personId=req.method==='GET'?url.searchParams.get('personId'):input.personId;
  if(typeof personId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(personId))throw Error('ARTICLE_INPUT_INVALID');
  if(req.method==='POST'&&input.operation==='restore'&&!isSuperAdmin(user))return {status:403,body:{ok:false,error:'ARTICLE_RESTORE_FORBIDDEN'}};
  const person=await getPerson(personId);if(!person)return {status:404,body:{ok:false,error:'POLITICIAN_NOT_FOUND'}};
  const [current,cached]=await Promise.all([service.read(personId),req.method==='POST'&&getCachedCandidates?getCachedCandidates(personId):null]);
  let candidates=cached;
  if(!candidates?.length){const report=await getReport(personId,person);candidates=[...visibleArticleCandidates(report,personId),...(getCandidates?await getCandidates(person,report,current):[...(report?.raw?.news?.candidates||[]),...(report?.raw?.news?.items||[])])];}
  if(req.method==='GET'&&cacheCandidates)await cacheCandidates(personId,candidates);
  const state=req.method==='POST'?await service.mutate(personId,input,candidates,user):current;
  return {status:200,body:service.editorData(person,candidates,state)};
 }catch(error){
  const code=String(error?.message||'');const safe=/^(ARTICLE_|CURATION_|CONTENT_CHANGED_RETRY)/.test(code)?code:'ARTICLE_EDITOR_UNAVAILABLE';
  return {status:safe==='ARTICLE_EDITOR_UNAVAILABLE'?503:safe==='CONTENT_CHANGED_RETRY'?409:400,body:{ok:false,error:safe}};
 }
}
