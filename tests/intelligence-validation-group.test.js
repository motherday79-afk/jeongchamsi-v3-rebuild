import test from 'node:test';
import assert from 'node:assert/strict';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { validateIntelligenceDraft } from '../lib/intelligence-validation.js';

const names=['한동훈','천하람','김민석','전용기','용혜인','송영길','오세훈','추경호','신상진','김용민'];
const people=Object.values(POLITICIAN_SEED.profiles).flat().filter(person=>!person.isVacant);
const context={peers:people,ageSex:[{age:'20대',maleShare:55,femaleShare:45},{age:'30대',maleShare:52,femaleShare:48},{age:'40대',maleShare:48,femaleShare:52},{age:'50대',maleShare:46,femaleShare:54},{age:'60대 이상',maleShare:44,femaleShare:56}]};
const rawFor=person=>({snapshotId:'validation-2026-09-04',collectedAt:'2026-09-04T00:00:00Z',officialProfile:person,news:{items:[{title:`${person.name} ${person.jurisdiction||person.region} 민생 정책 현장 발표`,source:'검증 픽스처',publishedAt:'2026-09-04'}]},sourceErrors:[]});

test('the ten-person validation group receives evidence-derived V3 type output without forced growth labels',()=>{
  for(const name of names){
    const person=people.find(row=>row.name===name);
    assert.ok(person,`${name} registered`);
    const report=buildIntelligenceDraft(person,rawFor(person),context,'JCS_INTELLIGENCE_V3');
    assert.ok(report.politicianType.primaryType,name);
    assert.ok(report.politicianType.currentPhase,name);
    assert.ok(report.politicianType.typeEvidence.length,name);
    assert.equal(report.politicianType.algorithmVersion,'JCS_INTELLIGENCE_V3');
    assert.equal(validateIntelligenceDraft(report).ok,true,name);
    if(!report.politicalAssetMatrix.summary.growthPotential||report.politicalAssetMatrix.summary.growthPotential.direction!=='positive')assert.doesNotMatch([report.politicianType.primaryType,...report.politicianType.secondaryTypes].join(' '),/신흥리더형/,name);
  }
});

test('all 542 active profiles produce a valid V3 event-to-diagnosis-to-prescription contract',()=>{
  assert.equal(people.length,542);
  for(const person of people){
    const report=buildIntelligenceDraft(person,rawFor(person),context,'JCS_INTELLIGENCE_V3');
    assert.equal(report.diagnoses.length,10,person.id);
    assert.equal(report.prescriptions.length,10,person.id);
    assert.equal(validateIntelligenceDraft(report).ok,true,person.id);
  }
});
