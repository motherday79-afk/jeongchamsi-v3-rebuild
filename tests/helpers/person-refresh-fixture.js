import {createIntelligenceRepository} from '../../lib/intelligence-repository.js';
import {createIntelligenceService} from '../../lib/intelligence-service.js';
import {buildOperationalRankings} from '../../lib/operational-ranking.js';
import {buildIntelligenceDraft} from '../../lib/intelligence-analysis.js';
import {compactIntelligenceDraft} from '../../lib/intelligence-storage.js';
import {INTELLIGENCE_KEYS as K} from '../../lib/intelligence-keys.js';
export const now=()=>Date.parse('2026-09-16T12:00:00Z');
export const profiles=[{id:'assembly-026',name:'박지원',type:'assembly',jurisdiction:'전남 해남군완도군진도군'},{id:'assembly-211',name:'박지원',type:'assembly',jurisdiction:'전북 군산시김제시부안군을'},{id:'assembly-001',name:'다른 인물',type:'assembly',jurisdiction:'서울'}];
export function storage(){
 const values=new Map(),calls=[];
 const command=async args=>{calls.push(args);const [op,key,...rest]=args;
  if(op==='GET')return values.get(key)??null;
  if(op==='MGET')return [key,...rest].map(k=>values.get(k)??null);
  if(op==='SET'){values.set(key,rest[0]);return 'OK';}
  if(op==='DEL'){let count=0;for(const k of [key,...rest])count+=Number(values.delete(k));return count;}
  if(op==='SCAN'){const prefix=args[args.indexOf('MATCH')+1].replace(/\*$/,'');return ['0',[...values.keys()].filter(k=>k.startsWith(prefix))];}
  if(op==='EVAL'){const n=Number(args[2]),keys=args.slice(3,3+n),before=args.slice(3+n,3+n*2),after=args.slice(3+n*2);if(keys.some((k,i)=>(values.get(k)||'')!==before[i]))return 0;keys.forEach((k,i)=>values.set(k,after[i]));return 1;}
  throw Error('Unexpected storage command '+op);
 };return {values,calls,command};
}
export function rawFor(person,volume=100){return {personId:person.id,snapshotId:'base',collectedAt:new Date(now()).toISOString(),officialProfile:person,searchAds:{volume:{pc:volume,mobile:volume}},news:{items:[{title:person.name+' 지역 예산',source:'연합뉴스',url:'https://example.org/'+person.id,publishedAt:'2026-09-15T00:00:00Z'}]},sourceErrors:[]};}
export async function fixture(options={}){
 const db=storage(),repo=createIntelligenceRepository(db.command,{now}),collected=[];
 const drafts=profiles.map((p,i)=>compactIntelligenceDraft(buildIntelligenceDraft(p,rawFor(p,i===1?10000:i===0?1000:100))));
 for(const d of drafts)await repo.putDraft('base',d.id,d);
 await repo.setPublicPointer('base');await repo.setRankings('base',buildOperationalRankings(drafts,new Map(profiles.map(p=>[p.id,p])),'base',now()));
 await repo.putVersion({analysisVersion:'base',status:'published'});
 db.values.set(K.job('collect'),JSON.stringify({snapshotId:'base',status:'COMPLETED',ids:profiles.map(p=>p.id),successIds:profiles.map(p=>p.id),total:3,completed:3}));await repo.setValidation('base',{ok:true});
 const env={NAVER_AD_ACCESS_LICENSE:'test',NAVER_AD_SECRET_KEY:'test',NAVER_AD_CUSTOMER_ID:'test'};
 const service=createIntelligenceService({command:db.command,now,env,profiles,youtubeChannels:{registryForCollection:async()=>({}),status:async()=>({credentials:{}})},collectRaw:async(p,c)=>{collected.push({p,c});return {...rawFor(p,1),snapshotId:c.snapshotId,collectionProfile:c.collectionProfile};},...options});
 return {db,repo,service,collected,drafts};
}
