import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';

const people=[
  {id:'assembly-001',name:'김전략',party:'가나다당',jurisdiction:'서울 가구',office:'국회의원'},
  {id:'assembly-002',name:'이비교',party:'라마바당',jurisdiction:'서울 나구',office:'국회의원'}
];
const intelligenceFor=person=>({
  accessTier:'admin',stInterpretation:`${person.name} 종합 해석`,rank:{overall:1,category:1},
  diagnoses:Array.from({length:10},(_,index)=>({id:String(index+1).padStart(2,'0'),title:`진단 ${index+1}`,headline:`진단 ${index+1}`,score:60+index,percentile:'상위 30%',display:{kind:''}})),
  prescriptions:Array.from({length:10},(_,index)=>({id:String(index+1).padStart(2,'0'),title:`처방 ${index+1}`,priority:index<3?'즉시 실행':'단계 실행',strategicJudgment:`전략 판단 ${index+1}`,actions:[`실행 ${index+1}`],linkedDiagnosisIds:[String(index+1).padStart(2,'0')]})),
  prescriptionPriorities:{immediate:['01','02','03'],days30:['04','05','06'],days90:['07','08'],longTerm:['09','10']}
});
const service={
  async getForCompare(id){const item=people.find(row=>row.id===id);return {ok:true,item,intelligence:intelligenceFor(item)};},
  async get(id){return this.getForCompare(id);},
  async search(){return {ok:true,items:[]};}
};

test('administrator comparison uses the same collapsed visual 01-10 prescription engine as detail',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001,assembly-002&run=1&strategy=assembly-001',{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-prescription-shell/);
  assert.match(html,/data-prescription-scope="compare"/);
  assert.match(html,/data-prescription-disclosure[^>]*aria-expanded="false"/);
  assert.match(html,/data-prescription-payload/);
  assert.match(html,/data-prescription-mount[^>]*hidden/);
  assert.match(html,/처방 10/);
  assert.doesNotMatch(html,/class="jcs-compare-prescription"/);
  assert.doesNotMatch(html,/class="jcs-compare-priority"/);
});
