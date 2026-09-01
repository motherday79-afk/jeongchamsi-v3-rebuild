import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('layout uses only local production assets and no legacy production origin',()=>{
  const html=read('index.html');
  assert.match(html,/\/css\/app\.css/);
  assert.match(html,/\/src\/app\.js/);
  assert.doesNotMatch(html,/jeongchamsi-v3-preview-clean|https:\/\/.*vercel\.app/);
});

test('new app contains no legacy API, Redis, repository or refresh engine imports',()=>{
  const app=read('src/app.js');
  const home=read('src/layout/home-layout.js');
  const all=app+'\n'+home;
  assert.doesNotMatch(all,/\/api\/|redis|repository\.js|refresh|history-repository|getHomeSnapshot|getNowPublic/i);
});

test('home preserves current production section order',()=>{
  const home=read('src/layout/home-layout.js');
  const markers=['product-hero','product-launcher','itsme-home-module','poll-module','national-eval','generation-president','id="compare"','now-module','id="column"','id="community"','academy-module'];
  let pos=-1;
  for(const marker of markers){
    const next=home.indexOf(marker);
    assert.ok(next>pos, `${marker} must appear in production order`);
    pos=next;
  }
});

test('existing vector icon path definitions are present locally',()=>{
  const icons=read('src/ui/service-icons.js');
  for(const key of ['now','poll','itsme','compare','generation','community']) assert.match(icons,new RegExp(`${key}:`));
  assert.match(icons,/M4 17 9 12l3 3 8-9/);
  assert.match(icons,/viewBox="0 0 24 24"/);
});

test('layout foundation has new UI behavior wiring rather than disabled controls',()=>{
  const ui=read('src/ui/interactions.js');
  assert.match(ui,/setupDrawer/);
  assert.match(ui,/setupNowCarousel/);
  assert.match(ui,/setupLayoutNavigation/);
  assert.doesNotMatch(ui,/pointer-events\s*:\s*none|disabled\s*=\s*true/);
});

test('home renders migrated Redis content instead of sample board rows',()=>{
  const html=renderHomeLayout({
    ...HOME_FIXTURE,
    itsmePosts:[{id:'its-7',title:'실제 정책 제안',published:true}],
    columns:[{id:'col-4',title:'실제 칼럼 제목',author:'칼럼니스트',published:true}],
    community:[{id:'com-11',title:'실제 정뮤니티 글',author:'회원',published:true,likes:3,views:9}],
    polls:{items:[{id:'poll-1',question:'실제 설문 질문',published:true,options:[{id:'yes',label:'찬성',votes:2},{id:'no',label:'반대',votes:1}]}]},
    generation:{candidates:['후보A'],results:{'20대':{'후보A':4}}},
    nationalEvaluation:{},academy:{items:[]}
  });
  assert.match(html,/\/itsme\/its-7/);
  assert.match(html,/실제 정책 제안/);
  assert.match(html,/\/column\/col-4/);
  assert.match(html,/실제 칼럼 제목/);
  assert.match(html,/\/community\/com-11/);
  assert.match(html,/실제 정뮤니티 글/);
  assert.match(html,/실제 설문 질문/);
  assert.doesNotMatch(html,/\/column\/sample-|\/community\/sample-|정뮤니티 게시물 제목 영역/);
});
