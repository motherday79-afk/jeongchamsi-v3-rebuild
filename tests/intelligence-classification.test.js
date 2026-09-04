import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPastPresentConnections, classifyPolitician } from '../lib/intelligence-classification.js';

const matrix=overrides=>({summary:{
  brand:{direction:'neutral'},mediaAttention:{direction:'neutral'},policyIdentity:{direction:'neutral'},regionalBase:{direction:'neutral'},coreSupport:{direction:'neutral'},moderateExpansion:{direction:'neutral'},partyAlliance:{direction:'neutral'},politicalResilience:{direction:'neutral'},electionCompetitiveness:{direction:'neutral'},crisisRisk:{direction:'neutral'},growthPotential:{direction:'neutral'},...overrides
}});

test('local executive with regional performance is classified from evidence as local administration type',()=>{
  const person={id:'local-1',name:'김시장',party:'무소속',office:'시장',roleLabel:'기초단체장',jurisdiction:'테스트시',terms:'재선',roleHistory:[{title:'테스트시장',effectiveFrom:'2022-07-01',roleStatus:'active',sourceId:'official-1'}]};
  const evidence={eventClusters:[{eventId:'event-1',eventType:'지역·성과',eventTitle:'산업단지 유치 성과',direction:'positive',relatedNewsIds:['news-1']}],politicalAssetMatrix:matrix({regionalBase:{direction:'positive'},policyIdentity:{direction:'positive'},politicalResilience:{direction:'positive'}})};
  const result=classifyPolitician(person,evidence,'JCS_INTELLIGENCE_V3');
  assert.equal(result.primaryType,'지역기반·생활행정형');
  assert.match(result.currentPhase,/성과|지역/);
  assert.ok(result.typeEvidence.some(row=>row.evidenceIds.includes('news-1')));
  assert.equal(result.algorithmVersion,'JCS_INTELLIGENCE_V3');
  assert.equal(result.classifiedFrom.officialRole,'시장');
});

test('controversy followed by an election win connects image burden and verified political resilience',()=>{
  const person={id:'assembly-1',name:'이의원',party:'국민의힘',office:'국회의원',roleLabel:'국회의원',jurisdiction:'대구 테스트구',terms:'초선',electionLabel:'제22대 국회의원 당선',roleHistory:[{title:'제22대 국회의원',effectiveFrom:'2024-05-30',roleStatus:'active',sourceId:'assembly-official'}]};
  const events=[{eventId:'event-crisis',eventType:'발언·논란',eventTitle:'역사 인식 발언 논란',direction:'negative',relatedNewsIds:['news-crisis'],historyLinks:[]}];
  const connections=buildPastPresentConnections(person,events);
  assert.match(connections[0].outcome,/당선/);
  assert.match(connections[0].currentEffect,/복원력|부담/);
  const result=classifyPolitician(person,{eventClusters:events,politicalAssetMatrix:matrix({mediaAttention:{direction:'positive'},coreSupport:{direction:'positive'},moderateExpansion:{direction:'negative'},crisisRisk:{direction:'negative'},politicalResilience:{direction:'positive'}}),pastPresentConnections:connections},'JCS_INTELLIGENCE_V3');
  assert.ok(['코어지지층 결집형','위기복원형','미디어·이슈주도형'].includes(result.primaryType));
  assert.ok(result.secondaryTypes.includes('위기복원형'));
  assert.match(result.currentPhase,/부정 이슈|외연 확장 위험/);
});

test('first term alone never forces an unsupported growth classification',()=>{
  const person={id:'assembly-2',name:'박의원',party:'무소속',office:'국회의원',roleLabel:'국회의원',jurisdiction:'서울 테스트구',terms:'초선'};
  const result=classifyPolitician(person,{eventClusters:[],politicalAssetMatrix:matrix({regionalBase:{direction:'positive'}})},'JCS_INTELLIGENCE_V3');
  assert.doesNotMatch([result.primaryType,...result.secondaryTypes].join(' '),/성장형/);
  assert.ok(result.typeScores.every(row=>Number.isFinite(row.score)));
  assert.ok(result.typeEvidence.length>0);
});

test('classification and past-present links are deterministic for identical evidence',()=>{
  const person={id:'assembly-3',name:'최의원',party:'더불어민주당',office:'당대표',roleLabel:'국회의원',jurisdiction:'서울',terms:'3선',electionLabel:'제22대 국회의원 당선'};
  const evidence={eventClusters:[{eventId:'event-policy',eventType:'정책·입법',eventTitle:'민생 법안 성과',direction:'positive',relatedNewsIds:['news-policy']}],politicalAssetMatrix:matrix({policyIdentity:{direction:'positive'},partyAlliance:{direction:'positive'},growthPotential:{direction:'positive'}})};
  assert.deepEqual(classifyPolitician(person,evidence,'JCS_INTELLIGENCE_V3'),classifyPolitician(person,evidence,'JCS_INTELLIGENCE_V3'));
  assert.deepEqual(buildPastPresentConnections(person,evidence.eventClusters),buildPastPresentConnections(person,evidence.eventClusters));
});

test('classification output is driven by evidence rather than a politician name',()=>{
  const base={id:'same-1',name:'첫번째',party:'무소속',office:'국회의원',roleLabel:'국회의원',jurisdiction:'서울 테스트구',terms:'재선'};
  const evidence={eventClusters:[{eventId:'event-policy',eventType:'정책·입법',eventTitle:'민생 법안 통과',direction:'positive',relatedNewsIds:['news-1']}],politicalAssetMatrix:matrix({policyIdentity:{direction:'positive'},brand:{direction:'positive'}})};
  const first=classifyPolitician(base,evidence,'JCS_INTELLIGENCE_V3'),second=classifyPolitician({...base,id:'same-2',name:'두번째'},evidence,'JCS_INTELLIGENCE_V3');
  assert.deepEqual({primary:first.primaryType,secondary:first.secondaryTypes,phase:first.currentPhase},{primary:second.primaryType,secondary:second.secondaryTypes,phase:second.currentPhase});
});
