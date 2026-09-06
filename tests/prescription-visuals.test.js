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
  {id:'02',display:{kind:'demographic',cohorts:[{age:'20대',total:18,male:46,female:54},{age:'40대',total:27,male:51,female:49}]}},
  {id:'03',display:{kind:'local',issues:[{label:'교통',count:3,share:60}],messagePath:[{label:'지역 문제',value:61},{label:'정치인 메시지 연결',value:55}]}},
  {id:'04',display:{kind:'support',composition:[{key:'core',label:'코어',value:45},{key:'floating',label:'유동',value:35},{key:'exit',label:'이탈',value:20}]}},
  {id:'05',display:{kind:'competitor',people:[{name:'본인',competition:{index:68,gap:0}},{name:'경쟁 A',competition:{index:61,gap:-7}},{name:'경쟁 B',competition:{index:72,gap:4}}]}},
  {id:'06',display:{kind:'risk',frames:{positive:5,neutral:3,negative:2},persistence:{shape:'지속 이슈',reignitionCount:1}}},
  {id:'07',display:{kind:'media',articleCount:10,sourceCount:6,ownership:{led:4,external:6},agendaPenetration:[{label:'민생',articles:5,outlets:3}]}},
  {id:'08',display:{kind:'campaign',foundations:[{key:'career',label:'공식 경력',value:76},{key:'regional',label:'지역 기반',value:63},{key:'support',label:'지지 기반',value:58},{key:'competition',label:'현재 경쟁력',value:66}]}},
  {id:'09',display:{kind:'action',activityCount:8,initiative:{firstMover:5,joined:3},conversion:{led:4,external:6,total:10},composition:[{label:'정책·의제 선점',value:50}]}},
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

test('prescription report completely omits optional elements that have no supporting data',()=>{
  const sparse={prescriptions:prescriptions.map(row=>({...row,channels:[],sourceFindings:[],monitoringIndicators:[]})),diagnoses:diagnoses.map(row=>({id:row.id,display:{kind:row.display.kind}})),prescriptionPriorities:priorities};
  const html=renderPrescriptionReport(sparse);
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  assert.doesNotMatch(html,/연결 전|관측 없음|준비 중|데이터 없음|jcs-rx-empty/);
  assert.doesNotMatch(html,/data-rx-channels|data-rx-source-findings|data-rx-monitoring/);
});

test('prescription stylesheet scopes a blue visual family to prescriptions without recoloring diagnosis numbers',async()=>{
  const css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  assert.match(css,/--jcs-rx-blue:/);
  assert.match(css,/\.jcs-rx-chapter \.jcs-no/);
  for(const layout of ['message-pyramid','target-matrix','local-playbook','support-flow','response-matrix','crisis-timeline','propagation-flow','resource-board','action-conversion','integrated-execution'])assert.match(css,new RegExp(`\\[data-prescription-layout="${layout}"\\]`));
  assert.doesNotMatch(css,/(^|,)\s*\.jcs-chapter-head \.jcs-no\s*\{[^}]*var\(--jcs-rx-blue\)/m);
});
