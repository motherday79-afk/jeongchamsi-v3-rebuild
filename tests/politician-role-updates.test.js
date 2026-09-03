import test from 'node:test';
import assert from 'node:assert/strict';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { applyPoliticianRoleUpdates } from '../lib/politician-role-updates.js';
import { searchPoliticianProfiles } from '../lib/politician-store.js';

const assembly=POLITICIAN_SEED.profiles.assembly;
const byName=name=>assembly.find(person=>person.name===name);

test('Kim Min-seok exposes party leader as primary role while preserving assembly and former prime-minister history',()=>{
  const person=applyPoliticianRoleUpdates(byName('김민석'));
  assert.equal(person.office,'더불어민주당 당대표');
  assert.equal(person.primaryRole.title,'더불어민주당 당대표');
  assert.equal(person.primaryRole.effectiveFrom,'2026-08-17');
  assert.equal(person.primaryRole.roleStatus,'appointed');
  assert.match(person.secondaryRole,/제22대 국회의원/);
  assert.match(person.secondaryRole,/서울 영등포구 을/);
  assert.equal(person.roleHistory.some(role=>role.title.includes('국무총리')&&role.roleStatus==='ended'),true);
});

test('five elected Democratic Party supreme council members retain their assembly roles',()=>{
  for(const name of ['최민희','박선원','서미화','이성윤','한민수']){
    const person=applyPoliticianRoleUpdates(byName(name));
    assert.equal(person.primaryRole.title,'더불어민주당 최고위원',name);
    assert.equal(person.primaryRole.effectiveFrom,'2026-08-17',name);
    assert.equal(person.primaryRole.roleStatus,'appointed',name);
    assert.match(person.secondaryRole,/제22대 국회의원/,name);
  }
});

test('registered minister nominees remain nominees and retain their elected office',()=>{
  const expected={이소영:'중소벤처기업부 장관 후보자',김승원:'법무부 장관 후보자',용혜인:'성평등가족부 장관 후보자'};
  for(const [name,title] of Object.entries(expected)){
    const person=applyPoliticianRoleUpdates(byName(name));
    assert.equal(person.primaryRole.title,title,name);
    assert.equal(person.primaryRole.roleStatus,'nominated',name);
    assert.equal(person.primaryRole.effectiveFrom,'2026-08-30',name);
    assert.doesNotMatch(person.office,/후보자$/.test(title)?new RegExp(`${title.replace(' 후보자','')}$`):/$^/,name);
    assert.match(person.secondaryRole,/제22대 국회의원/,name);
  }
});

test('current role metadata is searchable without removing original party region or office fields',()=>{
  const groups={assembly:assembly.map(applyPoliticianRoleUpdates),metropolitan:[],basic:[]};
  const leaders=searchPoliticianProfiles(groups,'최고위원',20);
  assert.equal(leaders.length,5);
  assert.deepEqual(leaders.map(person=>person.name).sort(),['박선원','서미화','이성윤','최민희','한민수'].sort());
  assert.equal(searchPoliticianProfiles(groups,'중소벤처기업부 장관 후보자',20)[0].name,'이소영');
});
