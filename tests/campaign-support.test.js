import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCampaignContent, prepareCampaignMutation, publicCampaign, campaignSummary } from '../src/core/campaign-model.js';
import { renderCampaignSupport, renderCampaignProgress } from '../src/views/campaign-support.js';
import { campaignInputFromFormData, bindCampaignInteractions } from '../src/ui/campaign-interactions.js';
import { createCampaignService } from '../lib/campaign-service.js';
import { renderCampaignEditor } from '../src/views/campaign-editor.js';
import { readFileSync } from 'node:fs';

const now=()=>Date.parse('2026-10-15T03:00:00.000Z');
const base={headline:'제목',intro:'소개',name:'이름',photoUrl:'https://images.example/photo.webp',topic:'주제',startDate:'2026-10-01',endDate:'2026-10-31',whyBody:'이유',storyBody:'이야기',policyTitle:'제안',policies:[{title:'하나',body:'내용'}],productionRelation:'editorial'};
const support={recipientName:'시민문화협동조합',bankName:'예시은행',accountNumber:'123-45',accountHolder:'시민문화협동조합',officialUrl:'https://recipient.example/support',sourceUrl:'https://recipient.example/notice',qrImageUrl:'https://recipient.example/qr.png',instructions:'입금자 이름을 확인해 주세요.',public:true,verified:true};
const funding={goalKrw:1000000,raisedKrw:1250000,supporterCount:42,asOf:'2026-10-14',sourceUrl:'https://recipient.example/report',public:true};
const record=(content={...base,support,funding})=>({id:'one',version:1,number:1,draft:content,published:content,publishedAt:'2026-10-01T00:00:00Z',visibility:'public',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',endedAt:''});

test('normalization accepts safe support and whole-number funding but preserves missing values as null',()=>{
 const value=normalizeCampaignContent({...base,support:{...support,officialUrl:''},funding:{...funding,goalKrw:'1000000',raisedKrw:'0',supporterCount:''}});
 assert.equal(value.support.recipientName,'시민문화협동조합');assert.equal(value.support.officialUrl,'');
 assert.deepEqual(value.funding,{goalKrw:1000000,raisedKrw:0,supporterCount:null,asOf:'2026-10-14',sourceUrl:'https://recipient.example/report',public:true});
 for(const bad of [-1,1.5,'1.5',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>normalizeCampaignContent({...base,funding:{...funding,raisedKrw:bad}}),/CAMPAIGN_FUNDING_INVALID/);
 assert.throws(()=>normalizeCampaignContent({...base,funding:{...funding,goalKrw:0}}),/CAMPAIGN_FUNDING_INVALID/);
});

test('publication requires confirmed recipient sources and dated funding sources',()=>{
 assert.throws(()=>prepareCampaignMutation(null,{...base,support:{...support,sourceUrl:''}},{id:'new',operation:'publish',version:0,now:now()}),/CAMPAIGN_SUPPORT_INVALID/);
 assert.throws(()=>prepareCampaignMutation(null,{...base,funding:{...funding,asOf:'2026-02-31'}},{id:'new',operation:'publish',version:0,now:now()}),/CAMPAIGN_FUNDING_INVALID/);
 assert.throws(()=>prepareCampaignMutation(null,{...base,funding:{...funding,sourceUrl:''}},{id:'new',operation:'publish',version:0,now:now()}),/CAMPAIGN_FUNDING_INVALID/);
 assert.throws(()=>prepareCampaignMutation(null,{...base,funding:{...funding,asOf:'2026-10-16'}},{id:'new',operation:'publish',version:0,now:now()}),/CAMPAIGN_FUNDING_INVALID/);
 assert.throws(()=>prepareCampaignMutation(null,{...base,support:{...support,accountHolder:''}},{id:'new',operation:'publish',version:0,now:now()}),/CAMPAIGN_SUPPORT_INVALID/);
 assert.doesNotThrow(()=>prepareCampaignMutation(null,{...base,support:{...support,bankName:'',accountNumber:'',accountHolder:''}},{id:'new',operation:'publish',version:0,now:now()}));
 assert.throws(()=>prepareCampaignMutation(null,{...base,support:{demo:true,recipientName:'가짜',public:true,verified:true,officialUrl:'https://fake.example'}},{id:'new',operation:'publish',version:0,now:now()}),/CAMPAIGN_SUPPORT_INVALID/);
});

test('omitted support fields preserve legacy draft data while explicit empty objects clear it',()=>{
 const previous=record();
 const kept=prepareCampaignMutation(previous,{...base},{id:'one',operation:'save',version:1,now:now()});
 assert.deepEqual(kept.draft.support,support);assert.deepEqual(kept.draft.funding,funding);
 const cleared=prepareCampaignMutation(previous,{...base,support:{},funding:{}},{id:'one',operation:'save',version:1,now:now()});
 assert.equal(cleared.draft.support,undefined);assert.equal(cleared.draft.funding,undefined);
});

test('public detail filters private or unverified data and list projection never exposes account details',()=>{
 const detail=publicCampaign(record(),now());assert.equal(detail.support.accountNumber,'123-45');assert.equal(detail.funding.raisedKrw,1250000);
 assert.equal(publicCampaign(record({...base,support:{...support,verified:false},funding:{...funding,public:false}}),now()).support,undefined);
 const summary=campaignSummary(record(),now());assert.deepEqual(summary.funding,{goalKrw:1000000,raisedKrw:1250000,supporterCount:42,asOf:'2026-10-14'});
 assert.equal(summary.support,undefined);assert.doesNotMatch(JSON.stringify(summary),/123-45|instructions|recipient\.example/);
});

test('support renderer caps the meter, reports honest percentage, and keeps archive actions inert',()=>{
 const current=renderCampaignSupport({support,funding,state:'current',category:'culture'});
 assert.match(current,/이 제안에 공감하셨나요\?/);
 assert.match(current,/125%/);assert.match(current,/style="--campaign-progress:100%"/);assert.match(current,/data-campaign-copy-account="123-45"/);assert.match(current,/시민문화협동조합/);
 const archive=renderCampaignSupport({support,funding,state:'archive',category:'culture'});
 assert.match(archive,/125%/);assert.doesNotMatch(archive,/data-campaign-copy-account|qr\.png|123-45|후원하기/);
 assert.equal(renderCampaignSupport({support:{...support,verified:false},funding:null,state:'current'}),'');
 assert.match(renderCampaignProgress({funding:{goalKrw:null,raisedKrw:0,supporterCount:0,asOf:'2026-10-14'}}),/0원/);
});

test('form serialization includes nested support and funding with explicit clearing',()=>{
 const data=new FormData();data.set('headline','제목');data.set('support.recipientName','단체');data.set('support.public','true');data.set('funding.raisedKrw','0');data.set('funding.public','true');
 const input=campaignInputFromFormData(data);assert.equal(input.support.recipientName,'단체');assert.equal(input.support.public,true);assert.equal(input.funding.raisedKrw,'0');
 const empty=new FormData();empty.set('support.present','true');empty.set('funding.present','true');const cleared=campaignInputFromFormData(empty);assert.deepEqual(cleared.support,{});assert.deepEqual(cleared.funding,{});
});

test('copy handler copies only enabled real campaign account actions',async()=>{
 const listeners={},writes=[];bindCampaignInteractions({addEventListener:(type,fn)=>listeners[type]=fn},{client:{},clipboard:{writeText:async value=>writes.push(value)}});
 const live={disabled:false,dataset:{campaignCopyAccount:' 123-45 '},closest:s=>s==='[data-campaign-copy-account]'?live:null,setAttribute(){},textContent:'계좌 복사'};
 await listeners.click({target:live});assert.deepEqual(writes,['123-45']);assert.match(live.textContent,/복사됨/);
 const disabled={disabled:true,dataset:{campaignCopyAccount:'999'},closest:s=>s==='[data-campaign-copy-account]'?disabled:null};await listeners.click({target:disabled});assert.deepEqual(writes,['123-45']);
});

test('saved example overrides receive canonical inert demo support metadata',async()=>{
 const override={...record({...base}),id:'example-001',isExample:true,exampleNumber:1};
 const service=createCampaignService({command:async args=>args[0]==='GET'?JSON.stringify(override):args[0]==='HVALS'?[JSON.stringify(override)]:[],now});
 const detail=(await service.get('example-001')).item;assert.equal(detail.support.demo,true);assert.equal(detail.funding.demo,true);assert.equal(detail.exampleNumber,1);
 assert.doesNotMatch(JSON.stringify(detail.support),/https?:|\d{3}[- ]\d/);
 const listed=await service.list(null);assert.equal(listed.items[0].funding.demo,true);
});

test('all examples have distinct authored progress ratios and nonpayable account guidance',async()=>{
 const service=createCampaignService({command:async args=>args[0]==='GET'?null:[],now});const result=await service.list(null);const rows=[result.featured,...result.items];
 assert.deepEqual(rows.map(row=>Math.floor(row.funding.raisedKrw/row.funding.goalKrw*100)),[38,67,24,82,112]);
 for(const row of rows){const detail=(await service.get(row.id)).item,html=renderCampaignSupport(detail);assert.match(html,/예시은행/);assert.match(html,/예시-계좌번호/);assert.match(html,/인물명\(예시\)/);assert.match(html,/disabled/);assert.doesNotMatch(html,/href=|data-campaign-copy-account/);}
});

test('example editor exposes canonical support and funding values as disabled reference fields',async()=>{
 const service=createCampaignService({command:async args=>args[0]==='GET'?null:[],now});const item=(await service.get('example-005',{id:'admin',role:'admin'},{edit:true})).item;
 const html=renderCampaignEditor(item,{authenticated:true,user:{role:'admin'}});assert.match(html,/name="support\.bankName"[^>]*value="예시은행"[^>]*disabled/);assert.match(html,/name="support\.accountNumber"[^>]*value="예시-계좌번호"[^>]*disabled/);assert.match(html,/name="funding\.raisedKrw"[^>]*value="5600000"[^>]*disabled/);
});

test('editable example GET draft publishes through service with canonical demo fields and no official number',async()=>{
 let raw=null;const command=async args=>{if(args[0]==='GET')return raw;if(args[0]==='HVALS')return raw?[raw]:[];if(args[0]==='EVAL'){raw=args[9];return JSON.stringify({ok:true,item:JSON.parse(raw)});}return null;};
 const service=createCampaignService({command,now}),admin={id:'admin',role:'admin'},editable=(await service.get('example-002',admin,{edit:true})).item;
 editable.draft.support={...editable.draft.support,recipientName:'FORGED',demo:false};editable.draft.funding={...editable.draft.funding,raisedKrw:999,demo:false};
 const saved=await service.save(admin,{id:editable.id,version:editable.version,operation:'publish',input:editable.draft});assert.equal(saved.item.number,null);assert.equal(saved.item.draft.support.recipientName,'DEMO 수령 단체 2');assert.equal(saved.item.draft.funding.raisedKrw,1340000);
 const detail=(await service.get('example-002')).item;assert.equal(detail.support.demo,true);assert.equal(detail.funding.demo,true);assert.equal(detail.exampleNumber,2);
});

test('shipped example form omission publishes and reads canonical private-safe demo identity',async()=>{
 let raw=null;const command=async args=>{if(args[0]==='GET')return raw;if(args[0]==='EVAL'){raw=args[9];return JSON.stringify({ok:true,item:JSON.parse(raw)});}return [];};const service=createCampaignService({command,now}),admin={id:'admin',role:'admin'},editable=(await service.get('example-003',admin,{edit:true})).item;
 const input={...editable.draft};delete input.support;delete input.funding;const result=await service.save(admin,{id:editable.id,version:editable.version,operation:'publish',input});assert.equal(result.item.number,null);
 const detail=(await service.get(editable.id)).item;assert.equal(detail.isExample,true);assert.equal(detail.exampleNumber,3);assert.equal(detail.support.demo,true);assert.doesNotMatch(JSON.stringify(detail.support),/https?:|\d{3}[- ]\d/);
});

test('support stylesheet keeps dark SUPPORT readable, gold actions, and root-scoped selectors',()=>{
 const css=readFileSync(new URL('../css/campaign-support-159.css',import.meta.url),'utf8');
 assert.match(css,/#jcs-campaign-preview \.campaign-support\{[^}]*color:#fff/);assert.match(css,/#jcs-campaign-preview \.campaign-support-actions :is\(a,button\)\{[^}]*background:#c3922f[^}]*color:#2f2237/);
 assert.match(css,/#jcs-campaign-preview \.campaign-progress-values strong\{[^}]*color:#30243b/);assert.match(css,/#jcs-campaign-directory \.jcd-feature .*campaign-progress-compact\{[^}]*color:#f3e5bd/);assert.match(css,/#jcs-campaign-directory \.jcd-item .*campaign-progress-compact\{[^}]*color:#6b527d/);
 assert.doesNotMatch(css,/(?:^|\})\s*\.(?:campaign-progress|campaign-support|campaign-recipient|campaign-account|jcs-direct-note)/m);
});
