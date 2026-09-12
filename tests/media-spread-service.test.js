import test from 'node:test';
import assert from 'node:assert/strict';
import {INTELLIGENCE_KEYS as K} from '../lib/intelligence-keys.js';
import {encodeStored} from '../lib/intelligence-repository.js';
const load=()=>import('../lib/media-spread-service.js').catch(()=>({}));
const profile={id:'assembly-001',name:'김민석',party:'더불어민주당'};
function storage(){const values=new Map(),calls=[];return {values,calls,command:async args=>{calls.push(args);const [op,key,...rest]=args;if(op==='GET')return values.get(key)||null;if(op==='MGET')return [key,...rest].map(k=>values.get(k)||null);if(op==='SET'){values.set(key,rest[0]);return 'OK';}if(op==='DEL'){values.delete(key);return 1;}throw new Error('unexpected '+op);}};}
const draft=(source)=>({id:profile.id,input:{collectedAt:'2026-09-12T00:00:00Z',news:{keywordCorpus:[['김민석 지역 철도 협약',source,'2026-09-11T12:00:00Z']],mediaCorpusVersion:1}}});
test('public snapshot cache coalesces requests; valid overrides replace published base, unpublished drafts stay private',async()=>{
 const {createMediaSpreadService}=await load();assert.equal(typeof createMediaSpreadService,'function');
 const db=storage();db.values.set(K.publicPointer,'public');db.values.set(K.draft('public',profile.id),encodeStored(draft('연합뉴스')));db.values.set(K.draft('unpublished',profile.id),encodeStored(draft('비공개매체')));
 const service=createMediaSpreadService({command:db.command,scope:'test-'+Math.random(),profiles:[profile],now:()=>Date.parse('2026-09-12T00:00:00Z')});
 const [a,b]=await Promise.all([service.search({query:'김민석'}),service.search({query:'김민석'})]);assert.equal(a.selected.name,'연합뉴스');assert.equal(b.target.articleCount,1);
 const reads=db.calls.filter(x=>x[0]==='MGET'&&x.some(k=>String(k).includes(':draft:'))).length;
 await service.search({query:'김민석',period:'cumulative'});assert.equal(db.calls.filter(x=>x[0]==='MGET'&&x.some(k=>String(k).includes(':draft:'))).length,reads);
 db.values.set(K.publicPersonOverride(profile.id),JSON.stringify({basePublicSnapshot:'public',snapshotId:'refresh'}));db.values.set(K.draft('refresh',profile.id),encodeStored(draft('동아일보')));await service.invalidate();
 const refreshed=await service.search({query:'김민석'});assert.equal(refreshed.selected.name,'동아일보');assert(!JSON.stringify(refreshed).includes('비공개매체'));
});
test('no public snapshot does not read drafts and does not fabricate publisher statistics',async()=>{
 const {createMediaSpreadService}=await load();assert.equal(typeof createMediaSpreadService,'function');
 const db=storage(),service=createMediaSpreadService({command:db.command,scope:'empty-'+Math.random(),profiles:[profile]});const result=await service.search({query:'김민석'});
 assert.equal(result.target.person.name,'김민석');assert.deepEqual(result.publishers,[]);assert(!db.calls.some(x=>x[0]==='MGET'));
});
test('old publisher index is rebuilt from the same published inputs without collecting news again',async()=>{
 const {createMediaSpreadService}=await load(),db=storage();db.values.set(K.publicPointer,'existing');db.values.set(K.draft('existing',profile.id),encodeStored(draft('연합뉴스')));
 db.values.set(K.mediaIndex('existing'),encodeStored({revision:'',index:{version:1,people:[profile],publishers:['다음뉴스'],articles:[],issues:[],coverage:{}}}));
 const result=await createMediaSpreadService({command:db.command,scope:'legacy-index-'+Math.random(),profiles:[profile],now:()=>Date.parse('2026-09-12T00:00:00Z')}).search({query:'김민석'});
 assert.equal(result.selected.name,'연합뉴스');assert(!result.publishers.some(row=>row.name==='다음뉴스'));
 assert(db.calls.some(row=>row[0]==='MGET'&&row.includes(K.draft('existing',profile.id))));
});

test('monthly attention survives the persisted public cache and warm navigation without exposing private inputs',async()=>{
 const {createMediaSpreadService}=await load(),db=storage(),now=Date.parse('2026-09-12T12:00:00Z');
 const people=Array.from({length:4},(_,i)=>({id:`attention-${i}`,name:`검색인물${i}`,type:'assembly'}));
 db.values.set(K.publicPointer,'attention-public');
 for(let i=0;i<4;i++){
  const row={id:people[i].id,input:{collectedAt:new Date(now).toISOString(),searchAds:{volume:{pc:(i+1)*100,mobile:(i+1)*900}},news:{periodCounts:[{label:'30D',value:40-i*10}],coverage:[{date:'2026-09-12',collected:true}],items:[]}},prescriptions:[{private:'ADMIN_SECRET'}]};
  db.values.set(K.draft('attention-public',row.id),encodeStored(row));
 }
 db.values.set(K.mediaIndex('attention-public'),encodeStored({revision:'',index:{version:2,people,publishers:[],articles:[],issues:[],coverage:{}}}));
 const service=createMediaSpreadService({command:db.command,scope:'attention-first-'+Math.random(),profiles:people,now:()=>now});
 const first=await service.search({query:people[0].name});assert.ok(first.attention);assert.equal(first.attention.target.searchRank,4);assert.equal(first.attention.target.newsRank,1);
 const reads=db.calls.filter(row=>row[0]==='MGET').length;
 const next=await service.search({query:people[0].name,period:'cumulative'});assert.deepEqual(next.attention,first.attention);assert.equal(db.calls.filter(row=>row[0]==='MGET').length,reads);
 const persisted=await createMediaSpreadService({command:db.command,scope:'attention-new-process-'+Math.random(),profiles:people,now:()=>now}).search({query:people[0].name});
 assert.deepEqual(persisted.attention,first.attention);assert.equal(db.calls.filter(row=>row[0]==='MGET').length,reads);assert(!JSON.stringify(persisted).includes('ADMIN_SECRET'));
});
