import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPrescriptionReport } from '../src/views/prescription-visuals.js';

const titles=['정치인 브랜드 전략 처방','세대·성별 타깃 전략 처방','지역구 메시지 전략 처방','지지층 결집·확장 전략 처방','경쟁자 대응 전략 처방','이슈·위기 대응 전략 처방','언론·온라인 확산 전략 처방','선거·캠페인 데이터 전략 처방','정치 활동·미디어 전환 처방','JCS 종합 실행 처방'];
const linked=[['01','07','09'],['02','04','09'],['03','07','09'],['02','04','08'],['05','06','08'],['01','06','07'],['01','07','09'],['03','04','08'],['09','07','01'],['01','02','03','04','05','06','09']];
const prescriptions=titles.map((title,index)=>({
  id:String(index+1).padStart(2,'0'),title,linkedDiagnosisIds:linked[index],sourceFindings:[`확인 근거 ${index+1}`],diagnosisBasis:[`${linked[index][0]} · 진단 근거`],objective:`목표 ${index+1}`,strategicJudgment:`전략 판단 ${index+1}`,
  actions:[`첫 번째 실행 ${index+1}`,`두 번째 실행 ${index+1}`,`세 번째 실행 ${index+1}`],target:`타깃 ${index+1}`,messageDirection:`메시지 ${index+1}`,channels:['공식 발표','지역 언론'],timing:index===5?'0~6시간 · 24시간 · 72시간 · 7일':'즉시 · 30일 · 90일',priority:index<3?'즉시 실행':'30일 이내',expectedImpact:`확인 변화 ${index+1}`,monitoringIndicators:[`추적 지표 ${index+1}`]
}));
const diagnoses=[
  {id:'01',display:{kind:'brand',nowSignal:'민생 성과',policyConnection:{value:64},indicators:[{label:'브랜드 선명도',value:70}]}},
  {id:'02',display:{kind:'demographic',cohorts:[{age:'20대',total:18,male:63,female:37},{age:'30대',total:24,male:42,female:58},{age:'40대',total:31,male:48,female:52},{age:'50대',total:27,male:55,female:45}]}},
  {id:'03',display:{kind:'local',issues:[{label:'교통',count:3,share:60}],messagePath:[{label:'지역 문제',value:61},{label:'정치인 메시지 연결',value:55}]}},
  {id:'04',display:{kind:'support',composition:[{key:'core',label:'코어',value:45},{key:'floating',label:'유동',value:35},{key:'exit',label:'이탈',value:20}]}},
  {id:'05',display:{kind:'competitor',people:[
    {name:'본인',region:'인천 연수구갑',newsCount:28,agendas:[{label:'민생'}],competition:{index:68,gap:0}},
    {name:'경쟁 A',region:'인천',newsCount:21,agendas:[{label:'경제'}],competition:{index:61,gap:-7}},
    {name:'경쟁 B',region:'인천',newsCount:34,agendas:[{label:'교통'}],competition:{index:72,gap:4}},
    {name:'경쟁 C',region:'인천',newsCount:17,agendas:[{label:'교육'}],competition:{index:55,gap:-13}}
  ]}},
  {id:'06',display:{kind:'risk',frames:{positive:5,neutral:3,negative:2},persistence:{shape:'지속 이슈',reignitionCount:1,daily:Array.from({length:30},(_,index)=>({index,count:[0,1,0,3,1,5,2,4,1,0][index%10]}))}}},
  {id:'07',display:{kind:'media',articleCount:10,sourceCount:6,ownership:{led:4,external:6},agendaPenetration:[{label:'민생',articles:5,outlets:3}]}},
  {id:'08',display:{kind:'campaign',foundations:[{key:'career',label:'공식 경력',value:76},{key:'regional',label:'지역 기반',value:63},{key:'support',label:'지지 기반',value:58},{key:'competition',label:'현재 경쟁력',value:66}]}},
  {id:'09',display:{kind:'action',activityCount:8,initiative:{firstMover:5,joined:3},conversion:{led:4,external:6,total:10},composition:[{label:'정책·의제 선점',value:50},{label:'지역 현장',value:50}]}},
  {id:'10',display:{kind:'summary',totalScore:64}}
];
const priorities={immediate:['01','06','09'],days30:['02','03','07'],days90:['04','05'],longTerm:['08','10']};
const fixture={prescriptions,diagnoses,prescriptionPriorities:priorities};

test('prescription report renders ten different blue execution tools from the approved contracts',()=>{
  const html=renderPrescriptionReport(fixture);
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  for(const layout of ['message-pyramid','target-matrix','local-playbook','support-flow','response-matrix','crisis-timeline','propagation-flow','resource-board','action-conversion','integrated-execution'])assert.match(html,new RegExp(`data-prescription-layout="${layout}"`));
  assert.match(html,/정치 활동·미디어 전환 처방/);
  assert.match(html,/JCS 종합 실행 처방/);
  assert.match(html,/즉시 실행/);
  assert.doesNotMatch(html,/정책·공약 반응 전략 처방|중장기 정치 성장 전략 처방/);
});

test('prescription chapters preserve the exact approved visual grammar instead of a repeated text template',()=>{
  const html=renderPrescriptionReport(fixture);
  const first=html.slice(html.indexOf('id="jcs-rx-01"'),html.indexOf('id="jcs-rx-02"'));
  assert.ok(first.indexOf('BRAND MESSAGE PRESCRIPTION')<first.indexOf('정치인 브랜드 전략 처방'));
  assert.match(first,/jcs-rx-grid-2/);
  assert.match(first,/메시지 피라미드/);
  assert.match(first,/표현 운영/);
  assert.match(first,/jcs-rx-language[\s\S]*유지[\s\S]*축소/);
  assert.equal((html.match(/class="jcs-rx-actions"/g)||[]).length,3);
  assert.doesNotMatch(html,/data-rx-source-findings|data-rx-channels|<h3>실행 행동<\/h3>/);
});

test('prescriptions 02 through 05 render age-gender targets, arrows, orbits and unique rival responses',()=>{
  const html=renderPrescriptionReport(fixture);
  for(const label of ['20대 남성','30대 여성','40대 여성','50대 남성'])assert.match(html,new RegExp(label));
  assert.equal((html.match(/class="jcs-rx-step"/g)||[]).length,4);
  assert.equal((html.match(/class="jcs-rx-orbit"/g)||[]).length,3);
  for(const copy of ['성과 재확인','참여 행동 제시','거부 표현 축소'])assert.match(html,new RegExp(copy));
  assert.equal((html.match(/class="jcs-rx-rival(?: |")/g)||[]).length,4);
  const rivalBodies=[...html.matchAll(/<article class="jcs-rx-rival[^"]*">([\s\S]*?)<\/article>/g)].map(match=>match[1]);
  assert.equal(new Set(rivalBodies).size,4);
});

test('prescriptions 06 through 10 use the approved curve, pipelines, grouped conversion and four-column commands',()=>{
  const html=renderPrescriptionReport(fixture);
  assert.match(html,/30일 실제 기사량 기반 지속 흐름/);
  assert.match(html,/class="jcs-rx-spark"[\s\S]*<svg[\s\S]*<path/);
  for(const label of ['원문 메시지','언론 보도','메시지 주도','외부 발생','후속 확산'])assert.match(html,new RegExp(label));
  assert.equal((html.match(/class="jcs-rx-pipeline-node"/g)||[]).length,5);
  for(const label of ['관측 정치 활동','행보 방식','관련 보도 전환'])assert.match(html,new RegExp(label));
  assert.equal((html.match(/class="jcs-rx-activity-stage"/g)||[]).length,3);
  assert.equal((html.match(/class="jcs-rx-board-column"/g)||[]).length,4);
  assert.match(html,/대표 메시지 통일/);
  assert.doesNotMatch(html,/정치인 브랜드 전략 처방<\/p>/);
});

test('prescription report completely omits optional elements that have no supporting data',()=>{
  const sparse={prescriptions:prescriptions.map(row=>({...row,channels:[],sourceFindings:[],monitoringIndicators:[]})),diagnoses:diagnoses.map(row=>({id:row.id,display:{kind:row.display.kind}})),prescriptionPriorities:priorities};
  const html=renderPrescriptionReport(sparse);
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  assert.doesNotMatch(html,/연결 전|관측 없음|준비 중|데이터 없음|jcs-rx-empty/);
  assert.doesNotMatch(html,/data-rx-channels|data-rx-source-findings|data-rx-monitoring/);
});

test('prescription stylesheet scopes a blue visual family to prescriptions without recoloring diagnosis numbers',async()=>{
  const css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  const active=css.slice(css.indexOf('/* JCS 0.0.31.24'));
  assert.match(css,/--jcs-rx-blue:/);
  assert.match(css,/\.jcs-rx-chapter \.jcs-no/);
  for(const layout of ['message-pyramid','target-matrix','local-playbook','support-flow','response-matrix','crisis-timeline','propagation-flow','resource-board','action-conversion','integrated-execution'])assert.match(css,new RegExp(`\\[data-prescription-layout="${layout}"\\]`));
  assert.doesNotMatch(css,/(^|,)\s*\.jcs-chapter-head \.jcs-no\s*\{[^}]*var\(--jcs-rx-blue\)/m);
  assert.match(css,/\.jcs-rx-pyramid>div\{[^}]*clip-path:polygon/);
  assert.match(css,/\.jcs-rx-steps \.jcs-rx-step:not\(:last-child\):after\{[^}]*content:"→"/);
  assert.match(css,/\.jcs-rx-orbit:nth-child\(2\)\{[^}]*scale:\.88/);
  assert.match(css,/\.jcs-rx-pipeline-node:not\(:last-child\):after\{[^}]*content:"→"/);
  assert.match(css,/\.jcs-rx-board\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.jcs-prescription-shell\{[^}]*width:100%[^}]*max-width:1180px/);
  assert.match(css,/\.jcs-prescription-disclosure\{[^}]*width:100%/);
  assert.match(active,/\.jcs-rx-nav\{[^}]*grid-template-columns:repeat\(10,1fr\)[^}]*padding:0/);
  assert.match(active,/\.jcs-rx-nav a\{[^}]*display:grid[^}]*place-items:center/);
  assert.match(active,/\.jcs-rx-nav\{grid-template-columns:repeat\(5,1fr\);padding:0\}/);
});
