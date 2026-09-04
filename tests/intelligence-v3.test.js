import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { compactIntelligenceDraft } from '../lib/intelligence-storage.js';
import { projectIntelligence } from '../lib/intelligence-access.js';

const person={id:'assembly-v3',type:'assembly',name:'이진숙',party:'국민의힘',region:'대구',jurisdiction:'대구 달성군',terms:'초선',roleLabel:'국회의원',office:'국회의원',electionLabel:'제22대 국회의원 당선',roleHistory:[{title:'제22대 국회의원',effectiveFrom:'2024-05-30',roleStatus:'active',sourceId:'assembly-official'}]};
const raw={personId:person.id,snapshotId:'jcs-v3-fixture',collectedAt:'2026-09-04T00:00:00Z',officialProfile:person,searchAds:{volume:{pc:48600,mobile:231200}},news:{items:[
  {title:'5·18 유공자들, 이진숙 상대 손배소 청구…1인당 3000만원',source:'대표 뉴스',url:'https://news/1',publishedAt:'2026-09-03T09:00:00Z'},
  {title:'이진숙 5·18 발언 놓고 유공자 손해배상 소송 제기',source:'두번째 뉴스',url:'https://news/2',publishedAt:'2026-09-02T09:00:00Z'}
]},sourceErrors:[]};
const context={peers:[person,{...person,id:'assembly-rival',name:'경쟁자',terms:'3선'}],ageSex:[{age:'20대',maleShare:51,femaleShare:49},{age:'30대',maleShare:50,femaleShare:50},{age:'40대',maleShare:49,femaleShare:51},{age:'50대',maleShare:48,femaleShare:52},{age:'60대 이상',maleShare:46,femaleShare:54}]};

const diagnosisRequired=['id','title','headline','currentPosition','dominantEvent','politicalMeaning','changeDirection','changeCause','pastPresentConnection','comparison','opportunity','risk','supportingSignals','metrics','evidenceIds','sourceTypes','updatedAt','algorithmVersion'];
const prescriptionRequired=['id','title','linkedDiagnosisIds','sourceFindings','objective','strategicJudgment','recommendedActions','targetGroups','messageDirection','channels','timing','immediateActions','actionsWithin30Days','actionsWithin90Days','longTermActions','expectedImpact','monitoringIndicators','priority','evidenceIds','updatedAt','algorithmVersion'];

test('V3 draft connects event clusters, asset effects, history and classification to every diagnosis and prescription',()=>{
  const report=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3');
  assert.equal(report.algorithmVersion,'JCS_INTELLIGENCE_V3');
  assert.equal(report.eventClusters.length,1);
  assert.equal(report.politicalAssetMatrix.byEvent.length,1);
  assert.match(report.politicianType.primaryType,/코어지지층|위기복원|미디어/);
  assert.match(report.politicianType.currentPhase,/부정 이슈/);
  assert.match(report.pastPresentConnections[0].outcome,/당선/);
  assert.equal(report.diagnoses.length,10);
  assert.equal(report.prescriptions.length,10);
  const evidenceUse=new Map();
  for(const diagnosis of report.diagnoses){
    for(const key of diagnosisRequired)assert.ok(diagnosis[key]!==undefined&&diagnosis[key]!==null&&diagnosis[key]!=='' ,`${diagnosis.id}.${key}`);
    assert.ok(diagnosis.evidenceIds.length>=2);
    for(const id of diagnosis.evidenceIds)evidenceUse.set(id,(evidenceUse.get(id)||0)+1);
    assert.equal(diagnosis.dominantEvent.eventId,report.eventClusters[0].eventId);
  }
  assert.ok(report.diagnoses.find(item=>item.id==='01').evidenceIds.some(id=>String(id).startsWith('news-')));
  assert.ok([...evidenceUse.values()].every(count=>count<=2));
  for(const prescription of report.prescriptions){
    for(const key of prescriptionRequired)assert.ok(prescription[key]!==undefined&&prescription[key]!==null&&prescription[key]!=='' ,`${prescription.id}.${key}`);
    assert.ok(prescription.linkedDiagnosisIds.length>0);
    assert.ok(prescription.sourceFindings.length>0);
  }
});

test('compact storage retains only reconstructable V3 inputs instead of every diagnosis and prescription',()=>{
  const report=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),stored=compactIntelligenceDraft(report);
  assert.equal(stored.diagnoses,undefined);
  assert.equal(stored.prescriptions,undefined);
  assert.equal(stored.input.news.items.length,2);
  assert.equal(stored.input.searchAds.volume.mobile,231200);
  assert.equal(stored.rankingInput.searchTotal,279800);
  assert.ok(Buffer.byteLength(JSON.stringify(stored),'utf8')<5000);
});

test('role projection exposes V3 review intelligence only to administrators',()=>{
  const report=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3');
  const guest=projectIntelligence(report,'public','detail'),member=projectIntelligence(report,'member','detail'),admin=projectIntelligence(report,'admin','detail');
  assert.equal(guest.eventClusters,undefined);
  assert.equal(guest.politicianType,undefined);
  assert.equal(member.politicalAssetMatrix,undefined);
  assert.equal(member.prescriptions,undefined);
  assert.equal(admin.eventClusters.length,1);
  assert.ok(admin.politicianType.primaryType);
  assert.ok(admin.politicalAssetMatrix.byEvent.length);
  assert.ok(admin.pastPresentConnections.length);
  assert.equal(JSON.stringify(guest).includes('recommendedActions'),false);
  assert.equal(JSON.stringify(member).includes('strategicJudgment'),false);
});

test('search volume remains a supporting signal and never becomes an event or classification basis',()=>{
  const report=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3');
  assert.equal(report.eventClusters.some(event=>/검색/.test(event.eventTitle)),false);
  assert.equal(report.politicianType.typeEvidence.some(row=>/검색/.test(row.basis)),false);
  assert.ok(report.diagnoses.every(row=>row.supportingSignals.some(signal=>signal.kind==='search')));
});
