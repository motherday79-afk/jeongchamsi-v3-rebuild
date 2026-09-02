import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoleNarratives } from '../src/ui/intelligence-narratives.js';

test('role narratives separate public signal, member diagnosis and admin decision copy',()=>{
  const copy=buildRoleNarratives({signalLabel:'민생·경제·모바일 확산형',audienceLabel:'대중 확장 우세',strongestLabel:'관심도',weakestLabel:'관심 안정성',transitionLabel:'전환력',rank:7});
  assert.match(copy.publicSignal,/민생·경제/);
  assert.doesNotMatch(copy.publicSignal,/검색|뉴스|관측/);
  assert.match(copy.memberDiagnosis,/현재 경쟁력의 핵심은/);
  assert.match(copy.memberDiagnosis,/관심 안정성/);
  assert.match(copy.adminDecision,/관리 우선순위는/);
  assert.match(copy.adminDecision,/전체 7위/);
  assert.notEqual(copy.publicSignal,copy.memberDiagnosis);
  assert.notEqual(copy.memberDiagnosis,copy.adminDecision);
});
