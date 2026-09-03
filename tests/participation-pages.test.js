import test from 'node:test';
import assert from 'node:assert/strict';

const people={
  'assembly-182':{id:'assembly-182',name:'전용기',party:'더불어민주당',jurisdiction:'경기 화성시정',office:'국회의원',photo:{localPath:'/assets/politicians/assembly-182.jpg'}},
  'basic-038':{id:'basic-038',name:'신상진',party:'국민의힘',jurisdiction:'경기도 성남시',office:'성남시장'},
  'assembly-001':{id:'assembly-001',name:'김민석',party:'더불어민주당',jurisdiction:'서울 영등포구을',office:'국회의원'}
};
const politicians={
  async get(id){return people[id]?{ok:true,item:people[id]}:{ok:false,error:'NOT_FOUND'};},
  async search(query){return {ok:true,items:Object.values(people).filter(item=>`${item.name} ${item.party} ${item.jurisdiction}`.includes(query))};}
};

test('poll board renders every published poll and requires a selected option confirmation',async()=>{
  const {renderPollBoard}=await import('../src/views/participation-pages.js');
  const content={async readDomain(){return {items:[
    {id:'p1',question:'첫 설문',published:true,options:[{id:'yes',label:'찬성',votes:3},{id:'no',label:'반대',votes:1}]},
    {id:'p2',question:'둘째 설문',published:true,options:[{id:'a',label:'A',votes:0}]},
    {id:'hidden',question:'비공개',published:false,options:[]}
  ]};}};
  const html=await renderPollBoard({content,session:{authenticated:true},route:'/poll'});
  assert.match(html,/귀담아 들어야 합니다/);
  assert.match(html,/첫 설문/);assert.match(html,/둘째 설문/);assert.doesNotMatch(html,/비공개/);
  assert.equal((html.match(/data-poll-vote-form/g)||[]).length,2);
  assert.match(html,/type="radio"[^>]*name="option"/);
  assert.match(html,/>투표 확인</);
});

test('generation page restores age tabs, TOP 15 names, search and authenticated voting',async()=>{
  const {renderGenerationPresident}=await import('../src/views/participation-pages.js');
  const content={async readDomain(){return {candidates:['assembly-001','assembly-182'],results:{'20대':{'assembly-001':7,'assembly-182':3}}};}};
  const html=await renderGenerationPresident({content,politicians,session:{authenticated:true},route:'/generation-president?age=20%EB%8C%80&q=%EA%B9%80'});
  assert.match(html,/세대의 선택, 대통령/);assert.match(html,/TOP 15/);
  assert.match(html,/class="active"[^>]*>20대</);assert.match(html,/김민석/);assert.match(html,/전용기/);
  assert.match(html,/data-generation-search/);assert.match(html,/data-stage-vote="generation:20대"/);
  assert.doesNotMatch(html,/>assembly-001</);
});

test('national evaluation resolves both subjects and renders result shares plus history',async()=>{
  const {renderNationalEvaluationPage}=await import('../src/views/participation-pages.js');
  const content={async readDomain(){return {
    slots:{assembly:{slot:'assembly',evaluationId:'e1',subjectId:'assembly-182',enabled:true},local:{slot:'local',evaluationId:'e2',subjectId:'basic-038',enabled:true}},
    results:{e1:{positive:4,neutral:1,negative:1},e2:{positive:5,neutral:1,negative:0}},
    history:[{evaluationId:'old1',subjectId:'assembly-001',positive:8,neutral:1,negative:1,closedAt:'2026-08-01'}]
  };}};
  const html=await renderNationalEvaluationPage({content,politicians,session:{authenticated:true},route:'/national-evaluation'});
  assert.match(html,/정참시민 전국 평가제/);assert.match(html,/SLOT A/);assert.match(html,/SLOT B/);
  assert.match(html,/전용기/);assert.match(html,/신상진/);assert.match(html,/67%/);assert.match(html,/83%/);
  assert.match(html,/지난 전국 평가/);assert.match(html,/김민석/);
  assert.doesNotMatch(html,/<b>assembly-182<\/b>/);
});
