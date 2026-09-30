import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';

const people=Array.from({length:5},(_,index)=>({id:`assembly-${index+101}`,type:'assembly',roleLabel:'국회의원',name:`비교정치인${index+1}`,party:index%2?'국민의힘':'더불어민주당',jurisdiction:`서울 비교구${index+1}`,office:'국회의원',photo:{localPath:`/assets/politicians/assembly-${index+101}.jpg`,focus:'50% 28%'}}));
const legacyReportFor=(person,index)=>({
  id:person.id,snapshot:'2026-09-03',rank:{overall:index+3,category:index+2},currentRole:'국회의원',
  signal:{label:`${person.name} 브랜드`,summary:`${person.name} 현재 브랜드 진단`},core:[{label:'관심도',score:80-index}],
  audience:{position:60-index,label:'관심 구조',summary:'세대 반응 관측'},cohorts:[{age:'40대',male:70-index,female:68-index}],
  media:[{label:'뉴스 노출',score:75-index,desc:'최근 뉴스 흐름'}],issues:[{title:'민생 정책',impact:72-index}],
  competitors:[{name:'직접 경쟁자',score:67-index,note:'동일 지역'}],support:{core:71-index},resilience:{index:69-index},
  diagnosis:{title:'현재 위치 진단',body:'실제 공개 근거 기반 해석'},risks:['관리 위험'],opportunities:['활용 기회'],
  strategies:[{title:'핵심 메시지 설계',body:'검증된 메시지 방향'},{title:'실행 우선순위',body:'30일 재측정'}],
  conclusion:'근거 기반 전략 판단',policies:['민생 정책'],activities:['공식 활동'],achievements:['공식 기록'],news:[],related:[],trend:[60-index,70-index,80-index],
  sources:[{type:'Google 뉴스',title:'최근 보도',detail:'공개 보도',grade:'DIRECT',url:'https://news.google.com/'}]
});
const reportFor=(person,index)=>{const legacy=legacyReportFor(person,index);return {...buildIntelligenceDraft(person,{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',searchAds:{volume:{pc:200+index*20,mobile:500-index*15}},news:{items:[{title:`${person.name} 민생 정책 지역 현장 발표`,source:`뉴스${index+1}`,publishedAt:'2026-09-02'}]},sourceErrors:[]},{peers:people},'JCS_INTELLIGENCE_V2'),rank:legacy.rank};};

const serviceFor=tier=>({
  async search(query){return {ok:true,items:people.filter(person=>person.name.includes(query)||person.party.includes(query))};},
  async get(id){const item=people.find(person=>person.id===id);return item?{ok:true,item}:{ok:false,error:'NOT_FOUND'};},
  async getForCompare(id){const index=people.findIndex(person=>person.id===id),item=people[index];return item?{ok:true,item,intelligence:projectIntelligence(reportFor(item,index),tier,'compare')}:{ok:false,error:'NOT_FOUND'};}
});


const section=html=>html.split('data-board-panel="diagnosis" hidden>')[1]?.split('</section>')[0]||'';
test('each tier compares only its server-projected diagnosis rows',async()=>{
 for(const [tier,ids] of [['public',['01','07','09']],['member',['01','02','03','05','07','09']],['admin',['01','02','03','04','05','06','07','08','09','10']]]){
  const session=tier==='public'?null:{user:{id:tier==='admin'?'admin':'member',role:tier}};
  const html=await renderPoliticianCompare(serviceFor(tier),'/compare?ids=assembly-101,assembly-102&run=1',session);
  assert.deepEqual([...section(html).matchAll(/data-board-metric="score-(\d{2})"/g)].map(m=>m[1]),ids);
  assert.doesNotMatch(html,/jcs-compare-person-cell|data-prescription-shell/);
 }
});
test('four-person selection is capped and over-cap requests produce an explicit gate',async()=>{
 const html=await renderPoliticianCompare(serviceFor('admin'),'/compare?ids='+people.map(p=>p.id).join(',')+'&run=1',{user:{id:'admin',role:'admin'}});
 assert.match(html,/data-compare-limit="4"/);assert.match(html,/data-compare-access-gate/);assert.doesNotMatch(html,/data-compare-selected="assembly-105"/);
 const valid=await renderPoliticianCompare(serviceFor('admin'),'/compare?ids='+people.slice(0,4).map(p=>p.id).join(',')+'&run=1',{user:{id:'admin',role:'admin'}});
 assert.equal((section(valid).match(/data-board-person=/g)||[]).length,4);
});
test('large board uses real projected scores and source detail stays collapsed',async()=>{
 const service=serviceFor('member'),report=await service.getForCompare('assembly-101');
 const html=await renderPoliticianCompare(service,'/compare?ids=assembly-101,assembly-102&run=1',{user:{id:'member',role:'member'}});
 for(const t of report.intelligence.diagnoses)assert.match(section(html),new RegExp('data-board-metric="score-'+t.id+'"'));
 assert.ok(html.includes(new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(report.intelligence.diagnoses[0].score)));
 assert.match(html,/<details class="cb-evidence">/);assert.doesNotMatch(html,/<details class="cb-evidence" open/);
});
test('comparison search and removal routes remain usable',async()=>{
 const html=await renderPoliticianCompare(serviceFor('admin'),'/compare?ids=assembly-101&q=비교정치인',{user:{id:'admin',role:'admin'}});
 assert.match(html,/data-compare-add="assembly-102"/);assert.match(html,/data-compare-remove="assembly-101"/);
});
test('board typography stays readable with scrolling, sticky axes and reduced motion',async()=>{
 const css=await readFile(new URL('../css/comparison-board-364.css',import.meta.url),'utf8');
 assert.deepEqual([...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(m=>Number(m[1])<14),[]);
 for(const term of ['position:sticky','overflow:auto','prefers-reduced-motion','--board-count'])assert.ok(css.includes(term));
});
