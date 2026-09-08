import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';
import { createParticipationPost, featureParticipationPost } from '../lib/participation-admin.js';
import { renderBoard, renderBoardWrite } from '../src/views/stage1.js';

const homeBase={...HOME_FIXTURE,memberCount:7,columns:[{id:'c1',title:'칼럼 제목',published:true}],community:[{id:'m1',title:'커뮤니티 제목',views:1234,likes:99,published:true}],itsmePosts:[{id:'i1',title:'제안 제목',published:true}],polls:{items:[{id:'p1',question:'정부 평가',featured:true,published:true,options:[{id:'a',label:'잘한다',votes:2},{id:'b',label:'보통이다',votes:1}]}]},generation:{candidates:[],results:{}},nationalEvaluation:{},academy:{items:[]},recentPoliticians:[],keywords:[],rank:[{id:'r1',rank:1,name:'정순위',party:'무소속',jurisdiction:'서울',score:98.5}],newsPosts:[{id:'n1',title:'정참시 뉴스 제목',published:true}],homeBanner:{url:'https://example.com/banner.jpg',targetUrl:'https://example.com/campaign',alt:'캠페인'},badgeStatus:{},session:{authenticated:true,user:{nickname:'관리자',role:'admin'}}};

test('home hotfix keeps score, uses real NEWS links, removes likes, and orders banner before merged MY card',()=>{
  const html=renderHomeLayout(homeBase);
  assert.match(html,/data-now-score="98\.5"/);
  assert.match(html,/NOW 98\.5/);
  assert.match(html,/data-layout-route="\/news\/n1"/);
  assert.doesNotMatch(html,/좋아요 99/);
  assert.match(html,/조회 1,234/);
  const banner=html.indexOf('side-home-banner');
  const my=html.indexOf('side-participation-account');
  assert.ok(banner>=0&&my>banner);
  assert.doesNotMatch(html,/side-login-authenticated/);
});

test('generation participation posts can be created and selected for main exposure',()=>{
  const source={items:[],candidates:[],results:{}};
  const created=createParticipationPost('generation',source,{title:'9월 세대 모의투표',body:'후보 선택',candidateIds:['assembly-001','assembly-002'],applyToMain:true},{id:'admin',nickname:'관리자'},'2026-09-08T00:00:00.000Z');
  assert.equal(created.item.candidateIds.length,2);
  assert.equal(created.data.items[0].featured,true);
  assert.deepEqual(created.data.candidates,['assembly-001','assembly-002']);
  const second=createParticipationPost('generation',created.data,{title:'10월 세대 모의투표',candidateIds:['assembly-003','assembly-004']},{id:'admin',nickname:'관리자'},'2026-09-09T00:00:00.000Z');
  const featured=featureParticipationPost('generation',second.data,second.item.id,'2026-09-09T01:00:00.000Z');
  assert.deepEqual(featured.data.candidates,['assembly-003','assembly-004']);
});

test('NEWS is a real board with editor write access and detail routes',async()=>{
  const content={async list(){return [{id:'news-1',title:'검증 뉴스',body:'기사 본문',author:'관리자',published:true}]}};
  const board=await renderBoard('news',content,{authenticated:true,user:{role:'admin'}}),write=renderBoardWrite('news');
  assert.match(board,/정참시 NEWS/);
  assert.match(board,/data-layout-route="\/news\/news-1"/);
  assert.match(board,/data-layout-route="\/news\/write"/);
  assert.match(write,/data-domain="news"/);
});
