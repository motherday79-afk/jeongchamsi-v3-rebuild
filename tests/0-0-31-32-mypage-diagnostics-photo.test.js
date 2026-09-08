import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMyPage } from '../src/views/stage1.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { parseMoisAgeSex, selectAgeSexForPerson } from '../lib/official-public-data.js';
import * as photoModule from '../lib/politician-photo-service.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const session={authenticated:true,user:{id:'member-1',nickname:'정참시민',role:'member'}};
const post=(id,title)=>({id:String(id),title,domain:'community',route:'community',createdAt:`2026-09-${String(30-id).padStart(2,'0')}T00:00:00.000Z`});

test('mypage overview limits every collection preview to five and exposes dedicated routes',()=>{
  const dashboard={
    authoredPosts:Array.from({length:8},(_,index)=>post(index+1,`작성글 ${index+1}`)),
    favoritePosts:Array.from({length:7},(_,index)=>post(index+20,`저장글 ${index+1}`)),
    favoritePeople:Array.from({length:6},(_,index)=>({id:`assembly-${index}`,name:`정치인 ${index+1}`,party:'정참시당'}))
  };
  const html=renderMyPage(session,{earnedBadges:['attendance-365','attendance-180','attendance-90','attendance-30','attendance-7','posts-1']},dashboard);
  assert.equal((html.match(/data-mypage-preview="authored"[\s\S]*?<\/section>/)?.[0].match(/mypage-list-row/g)||[]).length,5);
  assert.equal((html.match(/data-mypage-preview="favorite-posts"[\s\S]*?<\/section>/)?.[0].match(/mypage-list-row/g)||[]).length,5);
  assert.equal((html.match(/data-mypage-preview="favorite-people"[\s\S]*?<\/section>/)?.[0].match(/mypage-person-row/g)||[]).length,5);
  assert.match(html,/data-layout-route="\/mypage\/posts"/);
  assert.match(html,/data-layout-route="\/mypage\/badges"/);
  assert.match(html,/data-layout-route="\/mypage\/favorites\/posts"/);
  assert.match(html,/data-layout-route="\/mypage\/favorites\/politicians"/);
});

test('mypage post collection renders fifteen rows per numbered page',()=>{
  const authoredPosts=Array.from({length:34},(_,index)=>post(index+1,`작성글 ${index+1}`));
  const html=renderMyPage(session,{}, {authoredPosts}, {section:'authored',search:'?page=2'});
  assert.equal((html.match(/mypage-list-row/g)||[]).length,15);
  assert.match(html,/작성글 16/);
  assert.doesNotMatch(html,/작성글 1<\/b>/);
  assert.match(html,/data-page="1"/);
  assert.match(html,/data-page="2"[^>]*aria-current="page"/);
  assert.match(html,/data-page="3"/);
});

test('favorite politician collection renders the whole saved list without pagination',()=>{
  const favoritePeople=Array.from({length:21},(_,index)=>({id:`assembly-${index}`,name:`정치인 ${index+1}`,party:'정참시당',now:{rank:index+1}}));
  const html=renderMyPage(session,{}, {favoritePeople}, {section:'favorite-people'});
  assert.equal((html.match(/mypage-person-rank-row/g)||[]).length,21);
  assert.doesNotMatch(html,/mypage-pagination/);
  assert.match(html,/NOW 21위/);
});

const person={id:'assembly-032',type:'assembly',roleLabel:'국회의원',name:'김정참',party:'더불어민주당',region:'서울',jurisdiction:'서울 정참구',terms:'재선',office:'제22대 국회의원'};
const news=Array.from({length:10},(_,index)=>({
  title:`김정참 ${index%2?'청년 주거 정책':'지역 예산 확보'} ${index+1}`,
  source:index%2?'KBS':'연합뉴스',
  url:`https://example.com/${index+1}`,
  publishedAt:new Date(Date.parse('2026-09-08T00:00:00.000Z')-index*3*86400000).toISOString()
}));
const raw={snapshotId:'snapshot-32',collectedAt:'2026-09-08T00:00:00.000Z',searchAds:{volume:{pc:2000,mobile:8000}},news:{items:news},sourceErrors:[]};
const context={peers:[],ageSex:[
  {age:'20대',maleShare:49,femaleShare:51,totalCount:100,totalShare:10},
  {age:'30대',maleShare:50,femaleShare:50,totalCount:200,totalShare:20},
  {age:'40대',maleShare:51,femaleShare:49,totalCount:250,totalShare:25},
  {age:'50대',maleShare:49,femaleShare:51,totalCount:250,totalShare:25},
  {age:'60대 이상',maleShare:47,femaleShare:53,totalCount:200,totalShare:20}
]};
const diagnoses=()=>projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail').diagnoses;

test('brand diagnosis exposes evidence components, ten real period bars and an expansion percentage',()=>{
  const brand=diagnoses().find(row=>row.id==='01').display;
  assert.equal(brand.brandClarity.components.length,4);
  assert.equal(Number.isFinite(brand.brandClarity.average),true);
  assert.equal(brand.imageConsistency.bars.length,10);
  assert.equal(brand.imageConsistency.bars.every(row=>Number.isFinite(row.value)&&typeof row.observed==='boolean'),true);
  assert.equal(Number.isFinite(brand.imageConsistency.average),true);
  assert.equal(brand.expansion.axes.length,5);
  assert.match(brand.expansion.label,/확장/);
});

test('support diagnosis uses three independent JCS indices instead of a forced 100 percent composition',()=>{
  const support=diagnoses().find(row=>row.id==='04').display;
  assert.deepEqual(support.composition.map(row=>row.key),['core','floating','exit']);
  assert.equal(support.composition.every(row=>Number.isFinite(row.value)&&row.value>=0&&row.value<=100),true);
  assert.notEqual(support.composition.reduce((sum,row)=>sum+row.value,0),100);
  assert.equal(support.scale,'independent-index');
});

test('issue persistence retains thirty dated raw counts and a seven day trend',()=>{
  const risk=diagnoses().find(row=>row.id==='06').display;
  assert.equal(risk.persistence.daily.length,30);
  assert.equal(risk.persistence.trend7.length,30);
  assert.equal(risk.persistence.daily.every(row=>/^2026-/.test(row.date)),true);
  assert.equal(risk.persistence.events.every(row=>row.title&&row.url),true);
});

function moisRow(code,name,total){
  const unit=total===1000?2:5,values=Array(39).fill(0);values[0]=total;values[1]=total;
  for(let index=2;index<13;index++)values[index]=unit*2;
  values[13]=Math.round(total/2);values[14]=Math.round(total/2);
  for(let index=15;index<26;index++)values[index]=unit;
  values[26]=Math.round(total/2);values[27]=Math.round(total/2);
  for(let index=28;index<39;index++)values[index]=unit;
  return `<tr><td>${code}</td><td>${name}</td>${values.map(value=>`<td>${value}</td>`).join('')}</tr>`;
}

test('official population selector prefers a matching district over its province aggregate',()=>{
  const parsed=parseMoisAgeSex(`<table>${moisRow('1100000000','서울특별시',10000)}${moisRow('1111000000','서울특별시 정참구',1000)}</table>`);
  const selected=selectAgeSexForPerson(parsed,{region:'서울',jurisdiction:'서울 정참구'});
  assert.equal(selected.reduce((sum,row)=>sum+row.totalCount,0),36);
});

function memoryCommand(){const map=new Map();return async args=>{if(args[0]==='GET')return map.get(args[1])??null;if(args[0]==='SET'){map.set(args[1],args[2]);return 'OK';}throw new Error('UNSUPPORTED');};}
const webp=Buffer.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]);

test('politician photo upload explicitly forwards the configured Blob token',async()=>{
  let uploadOptions;
  const service=photoModule.createPoliticianPhotoService({command:memoryCommand(),profiles:[{id:'assembly-032'}],env:{BLOB_READ_WRITE_TOKEN:'blob-token'},putImpl:async(_path,_bytes,options)=>{uploadOptions=options;return {url:'https://blob.example/photo.webp',pathname:'politicians/photo.webp'};}});
  await service.save({personId:'assembly-032',contentType:'image/webp',bytes:webp},'admin');
  assert.equal(uploadOptions.token,'blob-token');
  assert.deepEqual(photoModule.politicianPhotoStorageStatus?.({BLOB_READ_WRITE_TOKEN:'blob-token'}),{configured:true,mode:'TOKEN'});
  assert.deepEqual(photoModule.politicianPhotoStorageStatus?.({}),{configured:false,mode:'MISSING'});
});

test('approved politician detail renders the evidence-led brand, local, support and persistence visuals',async()=>{
  const intelligence=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const html=await renderPoliticianDetail(person.id,{get:async()=>({ok:true,item:person,intelligence})},{authenticated:true,user:{role:'admin'}});
  assert.equal((html.match(/class="jcs-clarity-ring"/g)||[]).length,4);
  assert.equal((html.match(/class="jcs-consistency-bar /g)||[]).length,10);
  assert.match(html,/이미지 일관성 평균/);
  assert.match(html,/data-expansion-percent="\d+"/);
  assert.match(html,/다방면 확장 가능성 기대|확장 기대|확장 가능성 중립|확장 기반 보완/);
  assert.match(html,/독립지수이며 합계 100이 아님/);
  assert.match(html,/class="jcs-local-response-matrix"/);
  assert.match(html,/class="jcs-local-response-point"/);
  assert.match(html,/data-persistence-trend-window="7"/);
  assert.match(html,/class="jcs-persistence-y-label"/);
  assert.match(html,/data-photo-storage-status/);
});
