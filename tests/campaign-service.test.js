import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignState, normalizeCampaignContent, prepareCampaignMutation, publicCampaign, campaignSummary } from '../src/core/campaign-model.js';
import { createCampaignService } from '../lib/campaign-service.js';

const clock=()=>Date.parse('2026-10-15T12:00:00+09:00');
const content={headline:'비어 있는 집에,',accentLine:'다시 시작을.',intro:'현장의 정책 이야기',name:'실제 등록 인물',photoUrl:'https://images.example.org/portrait.webp',topic:'지역 재생',startDate:'2026-10-01',endDate:'2026-10-31',whyBody:'이 정책을 살펴보는 이유',storyBody:'현장에서 시작한 이야기',policyTitle:'공간을 다시 활용합니다.',policies:[{title:'현장 조사',body:'주민의 필요를 확인합니다.'}],productionRelation:'editorial',featured:true};
const published={id:'campaign-one',version:2,number:1,draft:content,published:content,publishedAt:'2026-09-15T00:00:00.000Z',visibility:'public',createdAt:'2026-09-14T00:00:00.000Z',updatedAt:'2026-09-15T00:00:00.000Z',endedAt:''};

test('the whole final day is current in Korea and the next midnight becomes archive',()=>{
  assert.equal(campaignState(published,Date.parse('2026-10-31T23:59:59.999+09:00')),'current');
  assert.equal(campaignState(published,Date.parse('2026-11-01T00:00:00+09:00')),'archive');
  assert.equal(campaignState(published,Date.parse('2026-09-30T23:59:59+09:00')),'scheduled');
});
test('unpublished and private campaigns cannot expose a public detail',()=>{
  assert.equal(publicCampaign({...published,visibility:'private'},clock()),null);
  assert.equal(publicCampaign({...published,published:null},clock()),null);
  assert.equal(publicCampaign(published,Date.parse('2026-09-20')),null);
});
test('saving a new draft preserves the live published story and immutable campaign number',()=>{
  const next=prepareCampaignMutation(published,{...content,headline:'편집 중인 제목',number:900},{operation:'save',version:2,actor:'admin',now:clock(),id:published.id});
  assert.equal(next.draft.headline,'편집 중인 제목');
  assert.equal(publicCampaign(next,clock()).headline,content.headline);
  assert.equal(next.number,1);
  assert.equal(next.version,3);
});
test('a stale editor cannot overwrite a newer version',()=>{
  assert.throws(()=>prepareCampaignMutation(published,content,{operation:'publish',version:1,actor:'admin',now:clock(),id:published.id}),/CAMPAIGN_CONFLICT/);
});
test('published records can be hidden or ended but never permanently deleted',()=>{
  assert.throws(()=>prepareCampaignMutation(published,{}, {operation:'delete',version:2,actor:'admin',now:clock(),id:published.id}),/CAMPAIGN_DELETE_PUBLISHED/);
  const ended=prepareCampaignMutation(published,{}, {operation:'end',version:2,actor:'admin',now:clock(),id:published.id});
  assert.equal(campaignState(ended,clock()),'archive');
  assert.deepEqual(ended.published,published.published);
});
test('publication validates real calendar days, required content and policy rows',()=>{
  assert.throws(()=>prepareCampaignMutation(null,{...content,endDate:'2026-02-31'},{operation:'publish',version:0,now:clock(),id:'new'}),/CAMPAIGN_DATE_INVALID/);
  assert.throws(()=>prepareCampaignMutation(null,{...content,policies:[]},{operation:'publish',version:0,now:clock(),id:'new'}),/CAMPAIGN_POLICY_REQUIRED/);
  assert.throws(()=>prepareCampaignMutation(null,{...content,name:''},{operation:'publish',version:0,now:clock(),id:'new'}),/CAMPAIGN_REQUIRED/);
});
test('stored content rejects executable URLs and cannot smuggle funding or sample flags',()=>{
  assert.throws(()=>normalizeCampaignContent({...content,photoUrl:'javascript:alert(1)'}),/CAMPAIGN_URL_INVALID/);
  assert.throws(()=>normalizeCampaignContent({...content,videoUrl:'https://untrusted.example/video'}),/CAMPAIGN_VIDEO_INVALID/);
  const safe=normalizeCampaignContent({...content,support:{officialUrl:'https://fake.example'},demo:true});
  assert.equal(safe.support,undefined);assert.equal(safe.demo,undefined);
});
test('public projection excludes draft text, author information and internal revisions',()=>{
  const result=publicCampaign({...published,updatedBy:'private-admin',draft:{...content,headline:'PRIVATE_DRAFT'},history:['secret']},clock());
  assert.equal(result.headline,content.headline);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_DRAFT|private-admin|secret/);
  assert.equal(campaignSummary(published,clock()).storyBody,undefined);
});
test('service denies mutations to guests and ordinary members before accessing storage',async()=>{
  let commands=0;const service=createCampaignService({command:async()=>{commands++;},now:clock});
  await assert.rejects(service.save(null,{operation:'save',input:content}),/ADMIN_REQUIRED/);
  await assert.rejects(service.save({id:'m',role:'member'},{operation:'publish',input:content}),/ADMIN_REQUIRED/);
  assert.equal(commands,0);
});
test('list selects one current feature, filters private records, and archives by Korean date',async()=>{
  const rows=[campaignSummary(published,clock(),true),campaignSummary({...published,id:'two',number:2,published:{...content,featured:false}},clock(),true),campaignSummary({...published,id:'private',visibility:'private'},clock(),true),campaignSummary({...published,id:'past',number:3,published:{...content,endDate:'2026-10-14'}},clock(),true)];
  const service=createCampaignService({command:async([op])=>{assert.equal(op,'HVALS');return rows.map(JSON.stringify);},now:clock});
  const current=await service.list(null,{view:'current'});
  assert.equal(current.featured.id,'campaign-one');assert.deepEqual(current.items.map(x=>x.id),['two']);assert.deepEqual(current.counts,{current:2,archive:1});
  const archive=await service.list(null,{view:'archive'});assert.deepEqual(archive.items.map(x=>x.id),['past']);
  await assert.rejects(service.list(null,{view:'manage'}),/ADMIN_REQUIRED/);
});

test('feature stays excluded from later pages while ordinary cards are reachable once',async()=>{
 const rows=Array.from({length:27},(_,index)=>campaignSummary({...published,id:'item-'+index,number:index+1,published:{...content,featured:index===0}},clock(),true));
 const service=createCampaignService({command:async()=>rows.map(JSON.stringify),now:clock});
 const pages=await Promise.all([1,2,3].map(page=>service.list(null,{page})));
 assert.equal(pages[0].featured.id,'item-0');assert.equal(pages[1].featured,null);assert.equal(pages[2].featured,null);
 assert.deepEqual(pages.map(page=>page.items.length),[12,12,2]);assert.deepEqual(pages.map(page=>page.hasMore),[true,true,false]);
 assert.equal(new Set(pages.flatMap(page=>page.items.map(item=>item.id))).size,26);
 assert.ok(pages.every(page=>page.items.every(item=>item.id!=='item-0')));
});
test('photo upload authorizes and validates before passing bytes to storage',async()=>{
 const calls=[];const service=createCampaignService({command:async()=>null,putImpl:async(...args)=>{calls.push(args);return {url:'https://images.example.org/upload.png'};}});
 const payload={contentType:'image/png',base64:Buffer.from([137,80,78,71,13,10,26,10,...Array(16).fill(0)]).toString('base64')};
 await assert.rejects(service.upload(null,payload),/ADMIN_REQUIRED/);
 await assert.rejects(service.upload({id:'a',role:'admin'},{...payload,contentType:'image/svg+xml'}),/CAMPAIGN_IMAGE_TYPE_INVALID/);
 await assert.rejects(service.upload({id:'a',role:'admin'},{...payload,base64:Buffer.from('<script>').toString('base64')}),/CAMPAIGN_IMAGE_INVALID/);
 assert.equal(calls.length,0);
 assert.equal((await service.upload({id:'a',role:'admin'},payload)).url,'https://images.example.org/upload.png');
 assert.match(calls[0][0],/^campaigns\/portraits\/.+\.png$/);assert.equal(calls[0][2].contentType,'image/png');
});
