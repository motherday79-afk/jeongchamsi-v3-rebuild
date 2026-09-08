import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { createIntelligenceRepository } from '../lib/intelligence-repository.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { compactIntelligenceDraft } from '../lib/intelligence-storage.js';

function redis(){const map=new Map();return {map,command:async args=>{const op=args[0],key=args[1];if(op==='GET')return map.get(key)??null;if(op==='SET'){map.set(key,args[2]);return 'OK';}if(op==='MGET')return args.slice(1).map(item=>map.get(item)??null);if(op==='SCAN')return ['0',[]];if(op==='DEL')return 0;throw new Error(`UNSUPPORTED_${op}`);}};}
const person={id:'assembly-001',type:'assembly',name:'고민정',party:'더불어민주당',region:'서울',jurisdiction:'서울 광진구을',roleLabel:'국회의원',office:'국회의원'};
const raw=(snapshot,title)=>({personId:person.id,snapshotId:snapshot,collectedAt:'2026-09-06T12:00:00Z',officialProfile:person,searchAds:{volume:{pc:10,mobile:20}},news:{items:[{title,source:'테스트뉴스',url:`https://news.example/${snapshot}`,publishedAt:'2026-09-06T10:00:00Z'}]},sourceErrors:[]});

test('single-politician refresh remains private until direct validated publication',async()=>{
  const store=redis(),repository=createIntelligenceRepository(store.command,{now:()=>Date.parse('2026-09-06T12:00:00Z')}),baseline=buildIntelligenceDraft(person,raw('public-1','고민정 기존 기사'),{peers:[person]},'JCS_INTELLIGENCE_V3');
  await repository.putDraft('public-1',person.id,compactIntelligenceDraft(baseline));await repository.setPublicPointer('public-1');await repository.setRankings('public-1',{byId:{[person.id]:{rank:7,categoryRank:3}},overall:[]});
  const service=createIntelligenceService({command:store.command,profiles:[person],env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},now:()=>Date.parse('2026-09-06T12:00:00Z'),collectRaw:async(_person,context)=>raw(context.snapshotId,'고민정 새 기사'),analyze:(p,r,c,v)=>buildIntelligenceDraft(p,r,c,v)});
  assert.equal((await service.getPublicIntelligence(person.id)).news[0].title,'고민정 기존 기사');
  await service.refreshPerson({personId:person.id,editorId:'admin'});
  assert.equal((await service.getPublicIntelligence(person.id)).news[0].title,'고민정 기존 기사');
  await service.publishPersonRefresh({personId:person.id,reviewedBy:'admin'});
  const published=await service.getPublicIntelligence(person.id);
  assert.equal(published.news[0].title,'고민정 새 기사');
  assert.equal(published.rank.overall,7);
});
