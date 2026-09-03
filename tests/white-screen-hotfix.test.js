import test from 'node:test';
import assert from 'node:assert/strict';
import * as siteShell from '../src/layout/site-shell.js';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';

test('initial loading shell paints an empty app before remote data resolves',()=>{
  assert.equal(typeof siteShell.renderInitialLoading,'function');
  const app={innerHTML:'',childElementCount:0};
  const painted=siteShell.renderInitialLoading(app);
  assert.equal(painted,true);
  assert.match(app.innerHTML,/role="status"/);
  assert.match(app.innerHTML,/정참시를 불러오고 있습니다/);
});

test('initial loading shell never replaces an already rendered page',()=>{
  assert.equal(typeof siteShell.renderInitialLoading,'function');
  const app={innerHTML:'<main>기존 화면</main>',childElementCount:1};
  const painted=siteShell.renderInitialLoading(app);
  assert.equal(painted,false);
  assert.equal(app.innerHTML,'<main>기존 화면</main>');
});

test('home exposes both badge showcases as independently refreshable mounts',()=>{
  const html=renderHomeLayout({
    ...HOME_FIXTURE,
    itsmePosts:[],columns:[],community:[],rank:[],recentPoliticians:[],
    polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},
    session:{authenticated:true,user:{id:'admin',nickname:'관리자',role:'admin'}},
    badgeStatus:null
  });
  assert.equal((html.match(/data-badge-showcase-mount/g)||[]).length,2);
});
