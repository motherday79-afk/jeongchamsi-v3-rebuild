import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiPanelService,AI_PANEL_KEYS} from '../lib/ai-panel-service.js';
import {syncApprovalAi,AI_SYNC_KEY} from '../lib/approval-ai-sync.js';
const admin={id:'scheduler',role:'admin',membershipTier:'superadmin',status:'active'};
const instant=()=>Date.parse('2026-10-02T12:00:00Z');
function database(){
 const values=new Map(),hashes=new Map();let failOp=null;
 const command=async([op,...a])=>{
  if(op==='GET')return values.get(a[0])??null;
  if(op==='SET'){if(a.includes('NX')&&values.has(a[0]))return null;values.set(a[0],a[1]);return 'OK';}
  if(op==='HVALS')return [...(hashes.get(a[0])||new Map()).values()];
  if(op==='EVAL'){
   const [script,count,...rest]=a,n=Number(count),k=rest.slice(0,n),v=rest.slice(n);
   if(failOp&&script.includes(failOp)){failOp=null;throw Error('simulated write failure');}
   if(script.includes('APPROVAL_AI_RELEASE')){if(values.get(k[0])!==v[0])return 0;values.delete(k[0]);return 1;}
   if(script.includes('APPROVAL_AI_COMMIT')){if(values.get(k[0])!==v[0]||(values.get(k[1])||'')!==v[1])return 0;values.set(k[1],v[2]);return 1;}
   if(script.includes('AI_PANEL_PUBLISH')){const s=JSON.parse(hashes.get(k[0])?.get(v[0])||'null');if(!s)return -1;if(s.version!==Number(v[1]))return 0;if(values.has(k[1]))return 2;values.set(k[1],v[2]);if(!hashes.has(k[2]))hashes.set(k[2],new Map());hashes.get(k[2]).set(v[0],v[3]);return 1;}
   if(script.includes('AI_PANEL_COMMIT')){if((values.get(k[0])||'')!==v[0]||(n===3&&(values.get(k[2])||'')!==v[4]))return 0;values.set(k[0],v[1]);if(!hashes.has(k[1]))hashes.set(k[1],new Map());hashes.get(k[1]).set(v[3],v[2]);if(n===3)values.set(k[2],v[5]);return 1;}
  }
  throw Error('unexpected '+op);
 };
 return {command,values,fail:marker=>{failOp=marker;}};
}
const poll=(date='2026-09-25',positive=37)=>({id:'gallup-'+date,institution:'한국갤럽',topic:'presidential-approval',question:'대통령 직무 평가',sourceUrl:'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo='+date,startDate:date,endDate:date,publishedDate:date,sampleSize:1000,provenance:{provider:'gallup'},results:{overall:{positive,negative:56,undecided:100-positive-56}}});
const collected=p=>({items:[p],providers:[{id:'gallup',state:'success',checkedAt:new Date(instant()).toISOString()}],lastCheckedAt:new Date(instant()).toISOString()});
async function setup(){
 const db=database();let count=0;const svc=createAiPanelService({command:db.command,now:instant,idFor:()=>`original-${++count}`});
 const profiles=Array.from({length:1000},(_,i)=>({id:`JCS-AI-${String(i+1).padStart(4,'0')}`,gender:'여성',age:'30대',region:'서울',politicalInterest:'중간',pollExposure:false}));
 const {item:panel}=await svc.save(admin,{operation:'panel-create',input:{name:'Existing synthetic panel',profiles,population:{sourceUrl:'https://example.com',referenceDate:'2026-09-01'}}});
 let {item:run}=await svc.save(admin,{operation:'create',input:{panelId:panel.id,week:'2026-W39',basisDate:'2026-09-25',question:'대통령 직무 평가',questionVersion:'v1'}});
 for(const [operation,input] of [['environment',{mode:'EXPOSED'}],['responses',{mode:'EXPOSED',model:'existing',executedAt:new Date(instant()).toISOString(),responses:profiles.map(p=>({id:p.id,choice:'positive'}))}],['human',{poll:{...poll(),comparable:true}}],['finalize',{}]])run=(await svc.save(admin,{operation,id:run.id,version:run.version,input})).item;
 return {db,svc,run,panel};
}
test('baseline and unchanged source preserve existing public record byte for byte',async()=>{
 const {db,svc,run}=await setup(),before=db.values.get(AI_PANEL_KEYS.run(run.id));
 const first=await syncApprovalAi({command:db.command,polls:collected(poll()),now:instant});assert.equal(first.refreshState,'baseline');assert.equal(first.runId,run.id);
 const next=await syncApprovalAi({command:db.command,polls:collected({...poll(),fetchedAt:'new',provenance:{provider:'gallup',contentHash:'transport changed'}}),now:instant});assert.equal(next.refreshState,'unchanged');assert.equal(db.values.get(AI_PANEL_KEYS.run(run.id)),before);assert.equal((await svc.list()).items.length,1);
});
test('new Gallup and same-week correction create public runs using exact stored panel; retries do not duplicate',async()=>{
 const {db,svc,panel}=await setup();await syncApprovalAi({command:db.command,polls:collected(poll()),now:instant});
 const first=await syncApprovalAi({command:db.command,polls:collected(poll('2026-10-02')),now:instant});assert.equal(first.refreshState,'generated');
 const run=(await svc.get(first.runId,admin)).item;assert.deepEqual(run.panel.profiles,panel.profiles);assert.equal(run.results.EXPOSED.responses.length,1000);assert.match(run.environments.EXPOSED.notes,/LLM/);assert.match(run.results.EXPOSED.model,/simulation/);
 await syncApprovalAi({command:db.command,polls:collected(poll('2026-10-02')),now:instant});assert.equal((await svc.list()).items.length,2);
 const second=await syncApprovalAi({command:db.command,polls:collected(poll('2026-10-02',38)),now:instant});assert.notEqual(first.runId,second.runId);assert.equal((await svc.get(second.runId,admin)).item.runNumber,2);assert.equal((await svc.list()).items.length,3);
});
test('failed provider or incomplete latest poll never regenerates from older valid fallback',async()=>{
 const {db,svc}=await setup();const data=collected(poll());data.providers[0].state='error';assert.equal((await syncApprovalAi({command:db.command,polls:data,now:instant})).stale,true);
 data.providers[0].state='success';data.items.unshift({...poll('2026-10-02'),results:{overall:{positive:37,negative:56,undecided:null}}});await syncApprovalAi({command:db.command,polls:data,now:instant});assert.equal((await svc.list()).items.length,1);
});
test('publication failure retains prior run and retry resumes deterministic draft exactly once',async()=>{
 const {db,svc,run}=await setup();await syncApprovalAi({command:db.command,polls:collected(poll()),now:instant});db.fail('AI_PANEL_PUBLISH');
 const failed=await syncApprovalAi({command:db.command,polls:collected(poll('2026-10-02')),now:instant});assert.equal(failed.state,'error');assert.equal(failed.runId,run.id);assert.equal(failed.notifications.at(-1).state,'failure');
 const done=await syncApprovalAi({command:db.command,polls:collected(poll('2026-10-02')),now:instant});assert.equal(done.state,'ready');assert.equal((await svc.list()).items.length,2);assert.equal(JSON.parse(db.values.get(AI_SYNC_KEY)).runId,done.runId);
});
test('concurrent synchronizations publish one public run',async()=>{
 const {db,svc}=await setup();await syncApprovalAi({command:db.command,polls:collected(poll()),now:instant});await Promise.all(Array.from({length:3},()=>syncApprovalAi({command:db.command,polls:collected(poll('2026-10-02')),now:instant})));assert.equal((await svc.list()).items.length,2);
});
test('source recovers unchanged after collection failure without replacing the baseline',async()=>{
 const {db,svc,run}=await setup();await syncApprovalAi({command:db.command,polls:collected(poll()),now:instant});
 const bad=collected(poll());bad.providers[0].state='error';await syncApprovalAi({command:db.command,polls:bad,now:instant});
 const recovered=await syncApprovalAi({command:db.command,polls:collected(poll()),now:instant});assert.equal(recovered.refreshState,'unchanged');assert.equal(recovered.runId,run.id);assert.equal((await svc.list()).items.length,1);
});
