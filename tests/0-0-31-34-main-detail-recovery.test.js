import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHomeLayout } from '../src/layout/home-layout.js';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { FONT_SCALE_RATIOS, changeFontScaleLevel } from '../src/ui/font-scale.js';
import { nowRankRangeLabel } from '../src/ui/interactions.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { compactIntelligenceDraft } from '../lib/intelligence-storage.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const compactCss=value=>value.replace(/\s+/g,'');
const person={id:'assembly-034',type:'assembly',roleLabel:'국회의원',office:'제22대 국회의원',name:'김정참',party:'더불어민주당',region:'경기',jurisdiction:'경기 정참구',terms:'3선',committee:'정무위원회'};
const peers=Array.from({length:3},(_,index)=>({id:`assembly-03${index+5}`,type:'assembly',roleLabel:'국회의원',office:index===0?'제22대 국회의원':index===1?'정참시장':'정참도지사',name:`경쟁정치인 ${String.fromCharCode(65+index)}`,party:index===1?'국민의힘':'더불어민주당',region:'경기',jurisdiction:index===1?'정참시':'경기 정참구',terms:'재선'}));
const reference='2026-09-08T12:00:00.000Z';
const news=Array.from({length:30},(_,index)=>({
  title:`김정참 ${index%3===0?'지역 예산 확보 성과':index%3===1?'청년 주거 정책 발표':'지역 교통 현안 논의'} ${index+1}`,
  description:'정참구 지역 현안과 정책 실행을 다룬 기사',source:['연합뉴스','KBS','한겨레','경향신문'][index%4],url:`https://example.com/news-${index+1}`,
  publishedAt:new Date(Date.parse(reference)-index*86400000).toISOString()
}));
const officialContext={ageSex:[
  {age:'20대',maleShare:51,femaleShare:49,totalCount:12000,totalShare:12},
  {age:'30대',maleShare:50,femaleShare:50,totalCount:18000,totalShare:18},
  {age:'40대',maleShare:49,femaleShare:51,totalCount:24000,totalShare:24},
  {age:'50대',maleShare:50,femaleShare:50,totalCount:22000,totalShare:22},
  {age:'60대 이상',maleShare:47,femaleShare:53,totalCount:24000,totalShare:24}
]};
const raw={personId:person.id,snapshotId:'snapshot-31-34',collectedAt:reference,officialProfile:person,searchAds:{volume:{pc:3200,mobile:9800}},news:{items:news,queryBasis:'Google News RSS',collectedAt:reference},officialContext,sourceErrors:[]};

test('31.34 home uses compact single-line cards, mobile two-person NOW pages and seven font levels',()=>{
  const itsmePosts=Array.from({length:6},(_,index)=>({id:`idea-${index+1}`,title:`출산 장려정책과 대한민국의 미래를 위한 긴 제안 ${index+1}`}));
  const rank=Array.from({length:100},(_,index)=>({id:`assembly-${index+1}`,rank:index+1,name:`정치인 ${index+1}`,party:'정참시당',jurisdiction:'정참구',score:99-index/10}));
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts,polls:{items:[{id:'poll-1',question:'김승원 용혜인 국민의 판단은',featured:true,options:[{label:'인사청문회까지 가야한다',votes:1},{label:'의혹이 거센 후보자는 철회해야 한다',votes:1},{label:'청문회조차 필요 없을 정도로 지지한다',votes:1}]}]},nationalEvaluation:{},generation:{},columns:[],community:[],academy:{},rank,session:{authenticated:false}});
  assert.equal((html.match(/class="itsme-card-order"/g)||[]).length,6);
  assert.equal((html.match(/class="itsme-card-title"/g)||[]).length,6);
  assert.doesNotMatch(html,/class="poll-options"[\s\S]*?<i><em/);
  assert.equal((html.match(/data-now-rank-page="\d+"/g)||[]).length,10);
  assert.equal((html.match(/class="rank-top-card /g)||[]).length,100);
  assert.match(html,/data-mobile-page-size="2"/);
  assert.match(html,/data-now-rank-status="mobile">1–2 \/ 100/);
  assert.doesNotMatch(html,/rank-top-score|<strong>NOW\s*\d/);
  assert.deepEqual(FONT_SCALE_RATIOS,[1,1.06,1.12,1.18,1.24,1.3,1.36,1.42]);
  assert.equal(changeFontScaleLevel(7,1),7);
  assert.equal(nowRankRangeLabel(0,2,100),'1–2 / 100');
  assert.equal(nowRankRangeLabel(49,2,100),'99–100 / 100');
  assert.equal(nowRankRangeLabel(9,10,96),'91–96 / 96');
});

test('31.34 stylesheet is last and carries the approved compact and responsive contracts',()=>{
  const cssPath=path.join(root,'css/hotfix-31-34-main-detail-recovery.css'),html=read('index.html'),app=read('src/app.js'),interactions=read('src/ui/interactions.js'),release=read('src/core/release.js'),css=compactCss(fs.existsSync(cssPath)?fs.readFileSync(cssPath,'utf8'):'');
  assert.ok(html.indexOf('hotfix-31-34-main-detail-recovery.css?v=0.0.31.34')>html.indexOf('hotfix-31-33-home-admin-storage.css?v=0.0.31.33'));
  assert.match(app,/home-layout\.js\?v=0\.0\.31\.34/);
  assert.match(app,/interactions\.js\?v=0\.0\.31\.34/);
  assert.match(app,/politicians\.js\?v=0\.0\.31\.34/);
  assert.match(app,/stage1\.js\?v=0\.0\.31\.34/);
  assert.match(interactions,/font-scale\.js\?v=0\.0\.31\.34/);
  assert.match(release,/JCS_0_0_31_34/);
  assert.match(css,/#itsme\.itsme-home-module\.itsme-card\{display:grid;grid-template-columns:26pxminmax\(0,1fr\)/);
  assert.match(css,/#poll\.poll-main\{display:grid;grid-template-columns:1fr/);
  assert.match(css,/#community\.community-title\{font-size:calc\(var\(--fs-sub\)-2px\)/);
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.now-rank-status-desktop\{display:none\}/);
  assert.match(css,/#jcs-intelligence-nine\[data-approved-profile-card\]/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.jcs-detail-photo-admin\[open\]form\{position:static/);
});

test('compact storage preserves official electorate and real historical aggregates through reconstruction',()=>{
  const full=buildIntelligenceDraft(person,raw,{peers,ageSex:officialContext.ageSex},'JCS_INTELLIGENCE_V3');
  const stored=compactIntelligenceDraft(full),savedNews=stored.input.news;
  assert.deepEqual(stored.input.officialContext.ageSex.map(row=>row.totalCount),officialContext.ageSex.map(row=>row.totalCount));
  assert.deepEqual(stored.input.officialContext.ageSex.map(row=>row.totalShare),officialContext.ageSex.map(row=>row.totalShare));
  assert.equal(savedNews.historicalAggregates.imageConsistency.bars.length,10);
  assert.equal(savedNews.historicalAggregates.persistence.daily.length,30);
  assert.equal(savedNews.historicalAggregates.framePeriods.length,3);

  const rebuilt=buildIntelligenceDraft(person,{personId:person.id,snapshotId:stored.snapshot,collectedAt:stored.input.collectedAt,officialProfile:person,searchAds:stored.input.searchAds,news:{...savedNews,aggregate:{articleCount:stored.rankingInput.articleCount,sourceCount:stored.rankingInput.sourceCount}},officialContext:stored.input.officialContext,sourceErrors:[]},{peers,ageSex:stored.input.officialContext.ageSex},stored.algorithmVersion);
  const originalById=new Map(full.diagnoses.map(row=>[row.id,row.display]));
  const rebuiltById=new Map(rebuilt.diagnoses.map(row=>[row.id,row.display]));
  assert.deepEqual(rebuiltById.get('01').imageConsistency,originalById.get('01').imageConsistency);
  assert.deepEqual(rebuiltById.get('06').persistence.daily,originalById.get('06').persistence.daily);
  assert.deepEqual(rebuiltById.get('05').people[0].framePeriods,originalById.get('05').people[0].framePeriods);
  assert.equal(rebuiltById.get('03').population.length,5);
});

test('detail restores the approved profile, responsive photo editor, competitor positions and media concentration',async()=>{
  const report=buildIntelligenceDraft(person,raw,{peers,ageSex:officialContext.ageSex},'JCS_INTELLIGENCE_V3');
  report.rank={overall:7,category:3};
  const media=report.diagnoses.find(row=>row.id==='07').display;
  assert.equal(media.periods.every(row=>Number.isFinite(row.concentration)),true);
  assert.equal(media.periods.find(row=>row.label==='30D').concentration,media.periods.find(row=>row.label==='30D').allSources[0].share);
  const intelligence=projectIntelligence(report,'admin','detail');
  const html=await renderPoliticianDetail(person.id,{get:async()=>({ok:true,item:person,intelligence})},{authenticated:true,user:{role:'admin'}});
  assert.match(html,/class="jcs-person" data-approved-profile-card/);
  assert.match(html,/data-photo-editor-mode="responsive"/);
  assert.equal((html.match(/class="jcs-comp-position"/g)||[]).length,4);
  assert.match(html,/본인 · 제22대 국회의원 · 경기 정참구/);
  assert.match(html,/경쟁정치인 B[\s\S]*?정참시장 · 정참시/);
  const publicHtml=await renderPoliticianDetail(person.id,{get:async()=>({ok:true,item:person,intelligence:projectIntelligence(report,'public','detail')})},{authenticated:false,user:null});
  assert.match(publicHtml,/언론 집중도<\/span><b>\d+%/);
});
