import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCampaignBoard, renderCampaignDetail } from '../src/views/campaign-pages.js';

const card=(overrides={})=>({
  id:'campaign-1',number:1,headline:'골목의 <내일>',accentLine:'다시 시작을.',intro:'소개 & 설명',
  name:'홍길동',party:'시민당',office:'시의원',region:'서울',photoUrl:'https://cdn.example/photo.webp',
  topic:'주거',startDate:'2026-09-01',endDate:'2026-10-01',state:'current',...overrides
});

test('board renders a featured campaign once and gives every card a real routed link',()=>{
  const featured=card();
  const second=card({id:'campaign-2',number:2,name:'김하나'});
  const html=renderCampaignBoard({ok:true,featured,items:[featured,second],counts:{current:2,archive:1},total:2,page:1,pageSize:20,hasMore:false});
  assert.equal((html.match(/href="\/campaigns\/campaign-1"/g)||[]).length,1);
  assert.match(html,/href="\/campaigns\/campaign-2" data-layout-route="\/campaigns\/campaign-2"/);
  assert.match(html,/href="\/campaigns\?view=archive" data-layout-route="\/campaigns\?view=archive"/);
  assert.doesNotMatch(html,/가상|AI 생성|data:image/);
});

test('grid and archive cards retain the stored accent line',()=>{
  const current=renderCampaignBoard({ok:true,featured:null,items:[card()],counts:{current:1,archive:0}});
  const archive=renderCampaignBoard({ok:true,items:[card({state:'archive'})],counts:{current:0,archive:1}}, {}, 'archive');
  assert.match(current,/골목의 &lt;내일&gt;<br><em>다시 시작을\.<\/em>/);
  assert.match(archive,/골목의 &lt;내일&gt;<br><em>다시 시작을\.<\/em>/);
});

test('board pagination provides routed previous and next pages for the selected view',()=>{
  const middle=renderCampaignBoard({ok:true,items:[card()],counts:{current:25,archive:0},page:2,pageSize:12,total:25,hasMore:true});
  assert.match(middle,/href="\/campaigns\?page=1" data-layout-route="\/campaigns\?page=1"/);
  assert.match(middle,/href="\/campaigns\?page=3" data-layout-route="\/campaigns\?page=3"/);
  const archive=renderCampaignBoard({ok:true,items:[card({state:'archive'})],counts:{current:0,archive:14},page:2,pageSize:12,total:14,hasMore:false}, {}, 'archive');
  assert.match(archive,/href="\/campaigns\?view=archive&amp;page=1" data-layout-route="\/campaigns\?view=archive&amp;page=1"/);
  assert.doesNotMatch(archive,/page=3/);
});

test('board escapes stored content and hides absent card media and profile fields',()=>{
  const html=renderCampaignBoard({ok:true,featured:null,items:[card({photoUrl:'',party:'',office:'',region:'',headline:'<img src=x onerror=alert(1)>',name:'A&B'})],counts:{current:1,archive:0}});
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html,/A&amp;B/);
  assert.doesNotMatch(html,/<img[^>]+onerror/);
  assert.doesNotMatch(html,/jcd-party|jcd-role|data-politician-photo/);
});

test('archive uses record rows and current campaign controls remain links',()=>{
  const html=renderCampaignBoard({ok:true,items:[card({id:'old one',state:'archive',number:9})],counts:{current:3,archive:1}}, {}, 'archive');
  assert.match(html,/class="jcd-record"/);
  assert.match(html,/href="\/campaigns\/old%20one" data-layout-route="\/campaigns\/old%20one"/);
  assert.match(html,/href="\/campaigns" data-layout-route="\/campaigns"/);
  assert.match(html,/종료된 캠페인의 기록/);
});

test('board exposes register and manage controls only to authenticated admins',()=>{
  const result={ok:true,items:[],featured:null,counts:{current:0,archive:0}};
  const visitor=renderCampaignBoard(result,{});
  const admin=renderCampaignBoard(result,{authenticated:true,user:{role:'admin'}});
  assert.doesNotMatch(visitor,/\/campaigns\/write|view=manage/);
  assert.match(admin,/href="\/campaigns\/write" data-layout-route="\/campaigns\/write"/);
  assert.match(admin,/href="\/campaigns\?view=manage" data-layout-route="\/campaigns\?view=manage"/);
});

test('manage board renders truthful state and edit links',()=>{
  const html=renderCampaignBoard({ok:true,items:[card({id:'draft-1',state:'draft',draftHeadline:'검토 중 제목',version:4})],counts:{current:0,archive:0}}, {authenticated:true,user:{role:'admin'}}, 'manage');
  assert.match(html,/검토 중 제목/);
  assert.match(html,/초안/);
  assert.match(html,/href="\/campaigns\/draft-1\/edit" data-layout-route="\/campaigns\/draft-1\/edit"/);
});

test('manage board labels scheduled campaigns as public upcoming',()=>{
  const html=renderCampaignBoard({ok:true,items:[card({state:'scheduled'})],counts:{}}, {authenticated:true,user:{role:'admin'}}, 'manage');
  assert.match(html,/공개 예정/);
  assert.doesNotMatch(html,/>scheduled</);
});

test('board reports API errors and empty views truthfully',()=>{
  assert.match(renderCampaignBoard({ok:false,error:'서버 <오류>'}),/서버 &lt;오류&gt;/);
  assert.match(renderCampaignBoard({ok:true,items:[],featured:null,counts:{current:0,archive:0}}),/공개된 캠페인이 아직 없습니다/);
  assert.match(renderCampaignBoard({ok:true,items:[],counts:{current:0,archive:0}}, {}, 'archive'),/종료된 캠페인 기록이 아직 없습니다/);
});

test('detail renders registered sections, sources, safe video, and escapes all content',()=>{
  const item={...card(),whyTitle:'왜 <지금>',whyBody:'본문 & 이유',selectionReason:'선정 <근거>',quote:'“말 & 생각”',storyBody:'이야기',needsBody:'필요한 것',policyTitle:'정책',policies:[{title:'첫 <정책>',body:'내용 & 설명'}],sources:[{label:'공식 <자료>',url:'https://example.org/source'}],videoUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',productionRelation:'editorial',productionDisclosure:'자체 <기획>'};
  const html=renderCampaignDetail(item);
  assert.match(html,/WHY THIS CAMPAIGN/);
  assert.match(html,/&lt;지금&gt;/);
  assert.match(html,/첫 &lt;정책&gt;/);
  assert.match(html,/href="https:\/\/example.org\/source"/);
  assert.match(html,/src="https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ"/);
  assert.doesNotMatch(html,/<지금>|<정책>|<기획>/);
});

test('detail uses shared model URL and video rules',()=>{
  const local=renderCampaignDetail(card({photoUrl:'/campaign-media/photo.webp',videoUrl:'https://youtu.be/dQw4w9WgXcQ'}));
  const short=renderCampaignDetail(card({videoUrl:'https://www.youtube.com/shorts/dQw4w9WgXcQ'}));
  const live=renderCampaignDetail(card({videoUrl:'https://youtube.com/live/dQw4w9WgXcQ'}));
  assert.match(local,/src="\/campaign-media\/photo.webp"/);
  assert.match(local,/src="https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ"/);
  assert.match(short,/src="https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ"/);
  assert.match(live,/src="https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ"/);
  assert.doesNotMatch(renderCampaignDetail(card({photoUrl:'https://user@example.org/photo.jpg',videoUrl:'https://vimeo.com/12345'})),/jcs-photo|<iframe/);
  assert.doesNotMatch(renderCampaignDetail(card({photoUrl:'/bad\\photo.jpg'})),/jcs-photo/);
});

test('detail translates production relation values and preserves the policy introduction',()=>{
  for(const [relation,label] of [['editorial','자체 기획'],['commissioned','의뢰 제작'],['ad','광고']]){
    const html=renderCampaignDetail({...card(),whyBody:'이유',productionRelation:relation,policies:[{title:'정책1',body:'내용1'},{title:'정책2',body:'내용2'},{title:'정책3',body:'내용3'}]});
    assert.match(html,new RegExp(label));
    assert.doesNotMatch(html,new RegExp(`>${relation}<`));
    assert.match(html,/이번 캠페인에서 함께 살펴볼 정책의 세 가지 방향입니다\./);
  }
  assert.match(renderCampaignDetail({...card(),policies:[{title:'정책',body:'내용'},{title:'정책2',body:'내용2'}]}),/이번 캠페인에서 함께 살펴볼 정책의 방향입니다\./);
});

test('archive groups rows by end month',()=>{
  const html=renderCampaignBoard({ok:true,items:[card({id:'a',endDate:'2026-10-20'}),card({id:'b',endDate:'2026-09-30'})],counts:{archive:2}}, {}, 'archive');
  assert.match(html,/class="jcd-year">2026\.10<\/p>[\s\S]*\/campaigns\/a[\s\S]*class="jcd-year">2026\.09<\/p>[\s\S]*\/campaigns\/b/);
});

test('detail omits absent sections and rejects unsafe source, photo, and video URLs',()=>{
  const html=renderCampaignDetail(card({photoUrl:'javascript:alert(1)',whyTitle:'',whyBody:'',quote:'',storyBody:'',needsBody:'',policyTitle:'',policies:[],sources:[{label:'나쁜 링크',url:'javascript:alert(1)'}],videoUrl:'https://evil.example/video'}));
  assert.doesNotMatch(html,/jcs-photo|WHY THIS CAMPAIGN|POLITICIAN STORY|class="jcs-policy-list"|<iframe|나쁜 링크|javascript:/);
});

test('detail renders support only for verified public official https information on current campaigns',()=>{
  const support={public:true,verified:true,officialUrl:'https://support.example/official',associationName:'홍길동 후원회',sourceUrl:'https://source.example/notice'};
  const current=renderCampaignDetail({...card(),support});
  assert.match(current,/홍길동 후원회/);
  assert.match(current,/href="https:\/\/support.example\/official"/);
  assert.match(current,/href="https:\/\/source.example\/notice"/);
  assert.doesNotMatch(renderCampaignDetail({...card(),state:'archive',support}),/jcs-support/);
  assert.doesNotMatch(renderCampaignDetail({...card(),support:{...support,verified:false}}),/jcs-support/);
  assert.doesNotMatch(renderCampaignDetail({...card(),support:{...support,officialUrl:'http://support.example'}}),/jcs-support/);
});

test('detail has a routed board backlink, archive notice, and admin edit control',()=>{
  const html=renderCampaignDetail(card({state:'archive'}),{authenticated:true,user:{role:'admin'}});
  assert.match(html,/href="\/campaigns" data-layout-route="\/campaigns"/);
  assert.match(html,/종료된 캠페인의 기록입니다/);
  assert.match(html,/href="\/campaigns\/campaign-1\/edit" data-layout-route="\/campaigns\/campaign-1\/edit"/);
});

test('example and category presentation uses distinct labels and nonpolitical language',()=>{
 const example=card({isExample:true,exampleNumber:3,number:null,category:'culture',organization:'가상 예술팀',party:'',whyBody:'이유',storyBody:'활동',policyTitle:'활동',policies:[{title:'작품',body:'설명'}]});
 const board=renderCampaignBoard({ok:true,featured:example,items:[],counts:{current:1,archive:0}}, {}, 'current', 'culture');
 assert.match(board,/EXAMPLE 3/);assert.match(board,/문화·예술/);assert.match(board,/category=culture/);assert.match(board,/사람과 프로젝트/);
 const detail=renderCampaignDetail(example);assert.match(detail,/작품 · 활동/);assert.match(detail,/예시 기간/);assert.match(detail,/허구의 예시/);assert.match(detail,/가상 예술팀/);assert.doesNotMatch(detail,/정당을 보고 사람을 선택/);
});

test('category survives view changes and pagination',()=>{
 const html=renderCampaignBoard({ok:true,items:[card({category:'culture'})],counts:{current:15,archive:14},page:2,hasMore:true}, {}, 'current','culture');
 assert.match(html,/href="\/campaigns\?category=culture&amp;page=1"/);assert.match(html,/href="\/campaigns\?category=culture&amp;page=3"/);assert.match(html,/href="\/campaigns\?view=archive&amp;category=culture"/);
});

test('example atlas portraits render as inline crops and nonpolitical support is excluded',()=>{
 const item=card({category:'business',photoUrl:'/assets/campaigns/approved-campaign-0.webp',photoCrop:'atlas-br',storyBody:'사업 이야기',policyTitle:'창업 제안',policies:[{title:'첫 제안',body:'내용'}],support:{public:true,verified:true,officialUrl:'https://support.example',sourceUrl:'https://source.example',associationName:'후원회'}});
 const html=renderCampaignDetail(item);assert.match(html,/<svg class="campaign-crop atlas-br"/);assert.match(html,/<image href="\/assets\/campaigns\/approved-campaign-0.webp"[^>]*x="-768" y="-512"/);assert.doesNotMatch(html,/class="jcs-support"/);assert.match(html,/기업 · 창업/);assert.doesNotMatch(html,/소개된 정치인|정책을 살펴보고/);
});

test('filtered archive invitation retains the active category',()=>{
 const html=renderCampaignBoard({ok:true,featured:card({category:'culture'}),items:[],counts:{current:1,archive:2},page:1,hasMore:false}, {}, 'current','culture');
 assert.match(html,/class="jcd-archive-link" href="\/campaigns\?view=archive&amp;category=culture"/);
});
