import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminStable } from '../src/views/stage1.js';

const admin={authenticated:true,user:{role:'admin'}};
const auth={
  async adminSummary(){return {ok:true,users:{total:11,admins:1},contents:{columns:2}};},
  async exportMembers(){return [];},
  async intelligenceStatus(){return {ok:true,sources:{naverSearchAds:{configured:false}},collection:{status:'RUNNING',completed:25,total:542,failed:0},publication:null,latestDraft:'draft-1',publicSnapshot:'public-0',validation:null};},
};

test('admin control center exposes one-click resumable collect and publish controls',async()=>{
  const html=await renderAdminStable(admin,auth);
  assert.match(html,/data-intelligence-action="collect"/);
  assert.match(html,/data-intelligence-action="collect" disabled/);
  assert.match(html,/data-intelligence-action="publish" disabled/);
  assert.match(html,/25 \/ 542/);
  assert.match(html,/중단되어도 현재 위치부터 재개/);
  assert.match(html,/NAVER SEARCH ADS/);
  assert.match(html,/연결 필요/);
});
