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
