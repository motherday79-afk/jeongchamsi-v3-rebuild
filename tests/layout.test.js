import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';
import { siteHeader, drawer } from '../src/layout/site-shell.js';
import { SERVICE_CATALOG, launcherServices } from '../src/ui/service-icons.js';
import { renderAcademy, renderBoard, renderBoardDetail, renderItsme } from '../src/views/stage1.js';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
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
  for(const key of ['now','poll','itsme','compare','generation','community','president','keywords','trending']) assert.match(icons,new RegExp(`${key}:`));
  assert.match(icons,/M4 17 9 12l3 3 8-9/);
  assert.match(icons,/viewBox="0 0 24 24"/);
});

test('home launcher keeps the legacy six services and full drawer restores all services',()=>{
  assert.deepEqual(launcherServices().map(item=>item.href),[
    '/now','/poll','/itsme','/compare','/generation-president','/community'
  ]);
  assert.equal(SERVICE_CATALOG.length,13);
  assert.deepEqual(SERVICE_CATALOG.map(item=>item.href),[
    '/now','/poll','/itsme','/compare','/generation-president','/community','/president',
    '/news','/national-evaluation','/academy','/column','/keywords','/trending'
  ]);
  const html=drawer({authenticated:false,user:null});
  assert.match(html,/data-layout-route="\/president"/);
  assert.match(html,/>대통령<\/b><small>대통령 정보와 기록/);
  assert.match(html,/data-layout-route="\/mypage\/activity"/);
  assert.match(html,/data-layout-route="\/mypage\/recent"/);
});

test('home 전체 서비스 expands the current navigation instead of opening the drawer',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},rank:[],session:{authenticated:false}});
  const launcher=html.slice(html.indexOf('<section class="product-launcher'),html.indexOf('</section>',html.indexOf('<section class="product-launcher'))+10);
  assert.match(launcher,/data-launcher-toggle/);
  assert.match(launcher,/aria-expanded="false"/);
  assert.match(launcher,/data-launcher-panel hidden/);
  assert.doesNotMatch(launcher,/data-drawer-open/);
  assert.equal((launcher.match(/class="launcher-card/g)||[]).length,SERVICE_CATALOG.length);
  assert.equal((launcher.match(/data-layout-route="\/now"/g)||[]).length,1);
  assert.match(launcher,/data-layout-route="\/president"/);
  assert.match(launcher,/data-layout-route="\/national-evaluation"/);
});

test('authenticated session is reflected in header and home account panels',()=>{
  const session={authenticated:true,user:{nickname:'정참시민',role:'member'}};
  const header=siteHeader(27,session);
  const home=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},session});
  assert.match(header,/정참시민님/);
  assert.match(header,/data-layout-route="\/mypage\/activity"/);
  assert.match(home,/정참시민님/);
  assert.match(home,/로그인 상태 유지 중/);
  assert.doesNotMatch(home,/정참시에 로그인하세요/);
});

test('home sidebar shows the four most recently viewed politicians as detail links',()=>{
  const recentPoliticians=[
    {id:'assembly-001',name:'김민석',party:'더불어민주당',office:'국회의원',photo:{localPath:'/assets/politicians/assembly-001.jpg',focus:'50% 20%'}},
    {id:'assembly-002',name:'한동훈',party:'국민의힘',office:'당대표'},
    {id:'assembly-003',name:'이준석',party:'개혁신당',office:'국회의원'},
    {id:'assembly-004',name:'조국',party:'조국혁신당',office:'국회의원'}
  ];
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},rank:[],recentPoliticians,session:{authenticated:false}});
  assert.equal((html.match(/class="recent-visual-card/g)||[]).length,4);
  assert.match(html,/data-layout-route="\/person\/assembly-001"/);
  assert.match(html,/김민석/);
  assert.match(html,/더불어민주당 · 국회의원/);
  assert.match(html,/data-politician-photo src="\/assets\/politicians\/assembly-001\.jpg"/);
});

test('app passes one resolved session through home, header and drawer',()=>{
  const app=read('src/app.js');
  assert.match(app,/siteHeader\(memberCount,session\)/);
  assert.match(app,/academy,[^}]*session/);
  assert.match(app,/shell\(body,session,renderId\)/);
});

test('layout foundation has new UI behavior wiring rather than disabled controls',()=>{
  const ui=read('src/ui/interactions.js');
  assert.match(ui,/setupDrawer/);
  assert.match(ui,/setupNowCarousel/);
  assert.match(ui,/setupLayoutNavigation/);
  assert.doesNotMatch(ui,/pointer-events\s*:\s*none|disabled\s*=\s*true/);
  assert.doesNotMatch(ui,/setInterval|setTimeout|4000|auto(?:play|advance)/i);
});

test('compare search submit preserves selected ids and targets the active slot',async()=>{
  const interactions=await import('../src/ui/interactions.js');
  assert.equal(typeof interactions.compareSearchRoute,'function');
  assert.equal(interactions.compareSearchRoute('/compare?ids=assembly-001',3,'서울 시장'),'/compare?ids=assembly-001&q=%EC%84%9C%EC%9A%B8+%EC%8B%9C%EC%9E%A5&slot=3');
  assert.equal(interactions.compareSearchRoute('/compare',1,'   '),'/compare');
});

test('broken politician photos fall back to the fixed initial avatar',async()=>{
  const interactions=await import('../src/ui/interactions.js');
  assert.equal(typeof interactions.setupPoliticianPhotoFallback,'function');
  const classes=new Set(['rank-top-avatar','has-photo']);
  const listeners={};let removed=false;
  const frame={classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
  const image={closest:selector=>selector==='[data-politician-avatar]'?frame:null,addEventListener:(type,listener)=>{listeners[type]=listener;},remove:()=>{removed=true;}};
  interactions.setupPoliticianPhotoFallback({querySelectorAll:selector=>selector==='[data-politician-photo]'?[image]:[]});
  listeners.error();
  assert.equal(removed,true);
  assert.equal(classes.has('has-photo'),false);
  assert.equal(classes.has('is-empty'),true);
});

test('home NOW rank renders 30 assembly members as three manual pages with photos',()=>{
  const rank=POLITICIAN_SEED.profiles.assembly.slice(0,30).map((item,index)=>({...item,photo:POLITICIAN_SEED.photos[item.id],rank:index+1,score:Number((99.9-index*.7).toFixed(1))}));
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},rank,session:{authenticated:false}});
  assert.equal((html.match(/data-now-rank-page=/g)||[]).length,3);
  assert.equal((html.match(/class="rank-top-card/g)||[]).length,30);
  assert.match(html,/aria-label="1위 김민석 상세"/);
  assert.match(html,/data-now-rank-prev/);
  assert.match(html,/data-now-rank-next/);
  assert.match(html,/rank-top-avatar has-photo/);
  assert.match(html,/전체 정치인 NOW 운영 순위 · 좌우 버튼으로 10명씩 보기/);
  assert.match(html,/NOW 99\.9/);
  assert.match(html,/data-politician-avatar/);
  assert.match(html,/data-politician-photo/);
  assert.match(html,/politician-photo-initial/);
  assert.match(html,/class="rank-top-card party-reform"[^>]*aria-label="23위 이준석 상세"/);
  assert.match(html,/<span class="rank-party-flag" title="개혁신당">개<\/span>/);
  assert.doesNotMatch(html,/임시|파일럿/);
  assert.doesNotMatch(html,/자동|4초/);
});

test('home NOW rank assigns a distinct party flag to every registered party and keeps only independents as 무',()=>{
  const rank=[
    {id:'party-jo',name:'조국',party:'조국혁신당',jurisdiction:'비례대표',rank:1,score:99.1},
    {id:'party-jin',name:'윤종오',party:'진보당',jurisdiction:'울산 북구',rank:2,score:98.1},
    {id:'party-gi',name:'용혜인',party:'기본소득당',jurisdiction:'비례대표',rank:3,score:97.1},
    {id:'party-sa',name:'한창민',party:'사회민주당',jurisdiction:'비례대표',rank:4,score:96.1},
    {id:'party-mu',name:'무소속 의원',party:'무소속',jurisdiction:'서울',rank:5,score:95.1},
    {id:'party-vacant',name:'강릉시 국회의원 공석',party:'공석',jurisdiction:'강릉시',rank:6,score:94.1}
  ];
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},rank,session:{authenticated:false}});
  assert.match(html,/class="rank-top-card party-innovation"[^>]*aria-label="1위 조국 상세"[\s\S]*?<span class="rank-party-flag" title="조국혁신당">조<\/span>/);
  assert.match(html,/class="rank-top-card party-progressive"[^>]*aria-label="2위 윤종오 상세"[\s\S]*?<span class="rank-party-flag" title="진보당">진<\/span>/);
  assert.match(html,/class="rank-top-card party-basicincome"[^>]*aria-label="3위 용혜인 상세"[\s\S]*?<span class="rank-party-flag" title="기본소득당">기<\/span>/);
  assert.match(html,/class="rank-top-card party-socialdemocratic"[^>]*aria-label="4위 한창민 상세"[\s\S]*?<span class="rank-party-flag" title="사회민주당">사<\/span>/);
  assert.match(html,/class="rank-top-card party-independent"[^>]*aria-label="5위 무소속 의원 상세"[\s\S]*?<span class="rank-party-flag" title="무소속">무<\/span>/);
  assert.match(html,/class="rank-top-card party-vacant"[^>]*aria-label="6위 강릉시 국회의원 공석 상세"[\s\S]*?<span class="rank-party-flag" title="공석">공<\/span>/);
});

test('home does not invent an assembly ranking when no operating rank is published',async()=>{
  const app=await import('node:fs/promises').then(({readFile})=>readFile(new URL('../src/app.js',import.meta.url),'utf8'));
  assert.doesNotMatch(app,/rankMode:'temporary-assembly-pilot'/);
  assert.doesNotMatch(app,/fallback\.items[\s\S]*rank:index\+1/);
});

test('home comparison entry no longer presents invented sample politicians or scores',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},rank:[],session:{authenticated:false}});
  assert.match(html,/COMPARE · OPERATING/);
  assert.match(html,/실제 공개 스냅샷으로 비교/);
  assert.doesNotMatch(html,/COMPARE · SAMPLE|가상후보|예시 화면 · 실제 정치인 아님|style="width:(?:72|61|48|67)%"/);
});

test('home renders migrated Redis content instead of sample board rows',()=>{
  const html=renderHomeLayout({
    ...HOME_FIXTURE,
    itsmePosts:[{id:'its-7',title:'실제 정책 제안',published:true}],
    columns:[{id:'col-4',title:'실제 칼럼 제목',author:'칼럼니스트',coverImage:'https://images.example.com/column.webp',published:true}],
    community:[{id:'com-11',title:'실제 정뮤니티 글',author:'회원',published:true,likes:3,views:9}],
    polls:{items:[{id:'poll-1',question:'실제 설문 질문',published:true,options:[{id:'yes',label:'찬성',votes:2},{id:'no',label:'반대',votes:1}]}]},
    generation:{candidates:['후보A'],results:{'20대':{'후보A':4}}},
    nationalEvaluation:{},academy:{items:[]}
  });
  assert.match(html,/\/itsme\/its-7/);
  assert.match(html,/실제 정책 제안/);
  assert.match(html,/\/column\/col-4/);
  assert.match(html,/실제 칼럼 제목/);
  assert.match(html,/src="https:\/\/images\.example\.com\/column\.webp"/);
  assert.match(html,/\/community\/com-11/);
  assert.match(html,/실제 정뮤니티 글/);
  assert.match(html,/실제 설문 질문/);
  assert.doesNotMatch(html,/\/column\/sample-|\/community\/sample-|정뮤니티 게시물 제목 영역/);
});

test('column list and detail restore legacy board geometry and readable paragraphs',async()=>{
  const item={id:'col-9',title:'칼럼 상세 제목',summary:'칼럼 요약',author:'박감독',coverImage:'https://images.example.com/detail.webp',body:'첫 번째 문단입니다.\n계속되는 문장입니다.\n\n두 번째 문단입니다.',published:true,createdAt:'2026-09-01T00:00:00.000Z',likes:2,views:7};
  const content={async list(){return [item]},async get(){return item},async commentsFor(){return []}};
  const list=await renderBoard('columns',content,{});
  const detail=await renderBoardDetail('columns','col-9',content,{});
  assert.match(list,/page-hero/);
  assert.match(list,/board-list/);
  assert.match(list,/board-thumb/);
  assert.match(list,/background-image:url\('https:\/\/images\.example\.com\/detail\.webp'\)/);
  assert.match(detail,/legacy-board-detail/);
  assert.match(detail,/article-cover/);
  assert.match(detail,/detail\.webp/);
  assert.match(detail,/<p>첫 번째 문단입니다\.<br>계속되는 문장입니다\.<\/p>/);
  assert.match(detail,/<p>두 번째 문단입니다\.<\/p>/);
  assert.doesNotMatch(detail,/legal-copy/);
});

test('community list restores the legacy subtitle from body when summary is empty',async()=>{
  const item={id:'com-1',title:'정뮤니티 제목',summary:'',body:'목록에 보여야 할 부제목입니다.\n두 번째 줄',author:'회원',published:true,createdAt:'2026-09-01T00:00:00.000Z'};
  const html=await renderBoard('community',{async list(){return [item]}},{authenticated:false});
  assert.match(html,/board-list/);
  assert.match(html,/<p>목록에 보여야 할 부제목입니다\. 두 번째 줄<\/p>/);
});

test('article typography matches the measured legacy detail values',()=>{
  const css=read('css/pages.css');
  assert.match(css,/\.legacy-board-detail>h1\{/);
  assert.match(css,/font-size:30px/);
  assert.match(css,/width:min\(58%,620px\)/);
  assert.match(css,/\.legacy-board-detail>\.article-body\{/);
  assert.match(css,/font-size:16px/);
  assert.match(css,/line-height:1\.9/);
});

test('IT’S ME restores legacy category tabs and board list',async()=>{
  const data={categories:['내가 대통령이라면','내가 시장이라면'],items:[{id:'its-1',title:'정책 제목',summary:'정책 부제목',category:'내가 시장이라면',author:'회원',published:true,createdAt:'2026-09-01T00:00:00.000Z'}]};
  const html=await renderItsme({async readDomain(){return data}},'/itsme?category='+encodeURIComponent('내가 시장이라면'));
  assert.match(html,/page-hero/);
  assert.match(html,/itsme-category-tabs/);
  assert.match(html,/board-list itsme-board-list/);
  assert.match(html,/정책 부제목/);
  assert.match(html,/class="active"[^>]*>내가 시장이라면/);
});

test('academy restores migrated slots, descriptions and chronological order',async()=>{
  const data={slots:[
    {id:'a-2',date:'2026-08-31',title:'수료식',description:'마무리',published:true},
    {id:'a-1',date:'2026-08-24',title:'정치 기본 교육',description:'신청하세요.',published:true}
  ]};
  const html=await renderAcademy({async readDomain(){return data}},{authenticated:false});
  assert.match(html,/academy-detail-intro/);
  assert.match(html,/academy-slot-list/);
  assert.match(html,/정치 기본 교육 · 신청하세요\./);
  assert.match(html,/로그인 후 신청/);
  assert.ok(html.indexOf('2026-08-24')<html.indexOf('2026-08-31'));
});

test('home academy restores legacy schedule rows and application cue',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{slots:[
    {id:'a-1',date:'2026-08-24',title:'정치 기본 교육',published:true}
  ]},session:{}});
  assert.match(html,/class="schedule-row"/);
  assert.match(html,/08\.24/);
  assert.match(html,/<small>월<\/small>/);
  assert.match(html,/정치 기본 교육/);
  assert.match(html,/>신청가능<\/button>/);
  assert.doesNotMatch(html,/class="side-row"><span>2026-08-24/);
});

test('home poll and national evaluation match the legacy panel structures',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],generation:{},academy:{slots:[]},polls:{items:[{id:'p-1',question:'정부 평가',published:true,options:[{id:'a',label:'잘함',votes:1},{id:'b',label:'보통',votes:2},{id:'c',label:'못함',votes:1},{id:'d',label:'기타',votes:0}]}]},nationalEvaluation:{slots:{assembly:{slot:'assembly',evaluationId:'e-1',subjectId:'assembly-182',enabled:true,closedAt:''},local:{slot:'local',evaluationId:'e-2',subjectId:'basic-038',enabled:true,closedAt:''}},demoResults:{'e-1':{positive:4,neutral:1,negative:1},'e-2':{positive:5,neutral:1,negative:0}}}});
  assert.match(html,/poll-vote-panel/);
  assert.match(html,/poll-confirm-row/);
  assert.doesNotMatch(html,/>기타<\/span>/);
  assert.match(html,/national-eval-dual/);
  assert.match(html,/SLOT A/);
  assert.match(html,/SLOT B/);
  assert.match(html,/전용기/);
  assert.match(html,/신상진/);
  assert.match(html,/67%/);
  assert.match(html,/83%/);
});

test('home generation summary resolves stored politician ids to names',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},academy:{slots:[]},nationalEvaluation:{},rank:[],session:{},generation:{candidates:['assembly-001'],candidateLabels:{'assembly-001':'김민석'},results:{'20대':{'assembly-001':7}}}});
  assert.match(html,/김민석/);
  assert.doesNotMatch(html,/>assembly-001<\/b>/);
});
