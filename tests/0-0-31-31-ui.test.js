import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';
import { footer } from '../src/layout/site-shell.js';
import { renderMyPage } from '../src/views/stage1.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('generation launcher has deliberate two-line wording and banner guide is 640 by 350',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,rank:[],itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},session:{authenticated:true,user:{id:'admin',nickname:'관리자',role:'admin'}}});
  assert.match(html,/launcher-generation[^]*launcher-label-line[^]*세대별[^]*launcher-label-line[^]*대통령/);
  assert.match(html,/640\s*[×x*]\s*350/);
  assert.doesNotMatch(html,/640\s*[×x*]\s*200/);
});

test('sidebar account card itself is fixed and only mypage plus four badge slots are routed hover targets',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,rank:[],itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},session:{authenticated:true,user:{id:'member-1',nickname:'회원',role:'member'}}});
  const start=html.indexOf('side-participation-account'),end=html.indexOf('</section>',start),card=html.slice(start,end);
  assert.match(card,/data-layout-route="\/mypage"/);
  assert.equal((card.match(/class="badge-slot[^>]*data-layout-route="\/mypage\/activity"/g)||[]).length,4);
  assert.doesNotMatch(card,/data-layout-route="\/mypage\/activity">MY</);
  const css=read('css/hotfix-31-31-favorites-inquiry-hover.css');
  assert.match(css,/side-participation-account:hover[^}]*transform:\s*none/);
  assert.match(css,/--jcs-click-lift/);
});

test('mypage shows five collection previews with dedicated full-list routes',()=>{
  const html=renderMyPage(
    {authenticated:true,user:{id:'member-1',nickname:'회원',role:'member'}},
    {earnedBadges:['first-penguin'],eligibleBadges:['opinion-leader'],representativeBadge:'first-penguin'},
    {authoredPosts:[{domain:'community',id:'mine',title:'내 글'}],favoritePosts:[{domain:'news',id:'saved',title:'저장한 뉴스'}],favoritePeople:[{id:'assembly-001',name:'김민석',party:'더불어민주당'}]}
  );
  for(const label of ['내가 쓴 게시글','획득한 배지','즐겨찾기한 게시글','즐겨찾기한 정치인'])assert.match(html,new RegExp(label));
  for(const route of ['/mypage/posts','/mypage/badges','/mypage/favorites/posts','/mypage/favorites/politicians'])assert.match(html,new RegExp(`data-layout-route="${route.replaceAll('/','\\/')}"`));
  assert.match(html,/data-layout-route="\/person\/assembly-001"/);
  assert.match(html,/data-layout-route="\/news\/saved"/);
});

test('footer links the public inquiry board and inquiry UI carries the fixed private notice',async()=>{
  assert.match(footer(),/data-layout-route="\/inquiry"[^>]*>1:1 문의하기/);
  const stage=await import('../src/views/stage1.js');
  assert.equal(typeof stage.renderInquiryBoard,'function');
  assert.equal(typeof stage.renderInquiryWrite,'function');
  const write=stage.renderInquiryWrite({authenticated:true,user:{id:'member-1',role:'member'}});
  assert.match(write,/공개/);
  assert.match(write,/비공개/);
  assert.match(write,/비공개 문의는 작성자 본인과 관리자에게만 공개됩니다\./);
});

test('politician and article details expose working favorite controls',()=>{
  const politician=read('src/views/politicians.js'),stage=read('src/views/stage1.js');
  assert.match(politician,/data-stage-action="favorite-toggle"[^>]*data-favorite-kind="person"/);
  assert.doesNotMatch(politician,/즐겨찾기 준비 중/);
  assert.match(stage,/data-stage-action="favorite-toggle"[^>]*data-favorite-kind="post"/);
});
