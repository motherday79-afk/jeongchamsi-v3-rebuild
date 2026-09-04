import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminStable } from '../src/views/stage1.js';

const admin={authenticated:true,user:{role:'admin'}};
const auth={
  async adminSummary(){return {ok:true,users:{total:11,admins:1},contents:{columns:2}};},
  async exportMembers(){return [];},
  async intelligenceStatus(){return {ok:true,sources:{naverSearchAds:{configured:true}},collection:{status:'COMPLETED',completed:542,total:542,failed:0},publication:null,latestDraft:'draft-1',publicSnapshot:'public-0',validation:{ok:true,errors:[]},versions:[{analysisVersion:'draft-1',status:'draft',reviewStatus:'pending',generatedAt:1},{analysisVersion:'public-0',status:'published',reviewStatus:'approved',generatedAt:0}]};},
  async intelligencePreview(){return {ok:true,version:{analysisVersion:'draft-1',status:'draft'},validation:{ok:true,errors:[]},reviewSample:{personId:'p1',news:[{title:'대표 정책 발표'}],eventClusters:[{eventId:'e1',eventTitle:'대표 정책 발표',eventType:'정책·입법'}],politicianType:{primaryType:'정책·성과형',secondaryTypes:['정책의제 선점형'],currentPhase:'정책 성과 축적'},diagnoses:Array.from({length:10},(_,i)=>({id:String(i+1).padStart(2,'0'),headline:`진단 ${i+1}`})),prescriptions:Array.from({length:10},(_,i)=>({id:String(i+1).padStart(2,'0'),strategicJudgment:`처방 ${i+1}`}))}};},
};

test('admin control center exposes ten processing stages and draft review before approval',async()=>{
  const html=await renderAdminStable(admin,auth);
  assert.match(html,/data-intelligence-action="collect"/);
  assert.doesNotMatch(html,/data-intelligence-action="collect" disabled/);
  assert.match(html,/data-intelligence-action="publish" disabled/);
  assert.match(html,/542 \/ 542/);
  assert.match(html,/NAVER SEARCH ADS/);
  assert.match(html,/연결됨/);
  assert.equal((html.match(/data-intelligence-stage=/g)||[]).length,10);
  assert.match(html,/핵심 사건 추출/);
  assert.match(html,/정책·성과형/);
  assert.match(html,/대표 정책 발표/);
  assert.match(html,/진단 10개 · 처방 10개/);
  assert.match(html,/data-intelligence-approve/);
  assert.match(html,/draft-1.*draft|draft.*draft-1/s);
  assert.match(html,/public-0.*published|published.*public-0/s);
  assert.match(html,/JCS_0_0_31_12/);
  assert.match(html,/관리자 화면 버전/);
});

test('admin warns when browser bundle and server release versions differ',async()=>{
  const stale={...auth,async intelligenceStatus(){const value=await auth.intelligenceStatus();return {...value,release:{version:'JCS_0_0_31_8',commit:'old123'}};}};
  const html=await renderAdminStable(admin,stale);
  assert.match(html,/강력 새로고침 필요/);
});

test('approved reviewed draft enables publication',async()=>{
  const approved={...auth,async intelligenceStatus(){const value=await auth.intelligenceStatus();return {...value,versions:[{...value.versions[0],status:'approved',reviewStatus:'approved'},value.versions[1]]};},async intelligencePreview(){const value=await auth.intelligencePreview();return {...value,version:{...value.version,status:'approved'}};}};
  const html=await renderAdminStable(admin,approved);
  assert.doesNotMatch(html,/data-intelligence-action="publish" disabled/);
  assert.doesNotMatch(html,/data-intelligence-approve/);
});

test('approved partial-current draft enables publication when collection completed with source errors',async()=>{
  const partial={...auth,async intelligenceStatus(){const value=await auth.intelligenceStatus();return {...value,collection:{status:'COMPLETED_WITH_ERRORS',completed:542,total:542,succeeded:531,failed:11},versions:[{...value.versions[0],status:'approved',reviewStatus:'approved'},value.versions[1]]};},async intelligencePreview(){const value=await auth.intelligencePreview();return {...value,version:{...value.version,status:'approved'}};}};
  const html=await renderAdminStable(admin,partial);
  assert.doesNotMatch(html,/data-intelligence-action="publish" disabled/);
  assert.match(html,/오류 11건 기록됨/);
});

test('publication readiness falls back to the completed collection snapshot when latest pointer lookup is empty',async()=>{
  const recovered={...auth,async intelligenceStatus(){const value=await auth.intelligenceStatus();return {...value,collection:{...value.collection,snapshotId:'draft-1'},latestDraft:'',versions:[{...value.versions[0],status:'approved',reviewStatus:'approved'},value.versions[1]]};},async intelligencePreview(){return {ok:false};}};
  const html=await renderAdminStable(admin,recovered);
  assert.doesNotMatch(html,/data-intelligence-action="publish" disabled/);
});

test('admin publication card shows the persisted final switch error after rerender',async()=>{
  const failed={...auth,async intelligenceStatus(){const value=await auth.intelligenceStatus();return {...value,publication:{status:'COMPLETED',completed:542,total:542,failed:0,lastError:'ANALYSIS_VERSION_NOT_FOUND'}};}};
  const html=await renderAdminStable(admin,failed);
  assert.match(html,/최종 게시 실패 · ANALYSIS_VERSION_NOT_FOUND/);
});

test('collection failures show actionable details and a failed-only retry control',async()=>{
  const failed={...auth,async intelligenceStatus(){const value=await auth.intelligenceStatus();return {...value,collection:{status:'COMPLETED_WITH_ERRORS',completed:541,total:542,failed:1,failures:[{personId:'p2',name:'오류 정치인',stage:'news',code:'SOURCE_TIMEOUT',details:'Google RSS 응답 시간 초과',at:'2026-09-04T00:00:00.000Z',attempts:3,retryable:true}]}};}};
  const html=await renderAdminStable(admin,failed);
  assert.match(html,/오류 정치인/);
  assert.match(html,/SOURCE_TIMEOUT/);
  assert.match(html,/Google RSS 응답 시간 초과/);
  assert.match(html,/data-intelligence-retry-failures/);
  assert.match(html,/data-intelligence-error-report/);
});
