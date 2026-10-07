import test from 'node:test';
import assert from 'node:assert/strict';
import {TAXI_PASSENGERS} from '../lib/taxi-passengers.js';
import {POLITICIAN_SEED} from '../lib/politician-seed.generated.js';

test('taxi catalog contains twelve distinct registered people across political parties',()=>{
  const profiles=Object.values(POLITICIAN_SEED.profiles).flat();
  assert.equal(TAXI_PASSENGERS.length,12);
  assert.equal(new Set(TAXI_PASSENGERS.map(p=>p.id)).size,12);
  assert.equal(new Set(TAXI_PASSENGERS.map(p=>p.personId)).size,12);
  assert.ok(new Set(TAXI_PASSENGERS.map(p=>p.partyLabel)).size>=5);
  for(const p of TAXI_PASSENGERS){
    const profile=profiles.find(x=>x.id===p.personId);
    assert.equal(profile?.name,p.name,p.personId);
    assert.equal(profile.party,p.partyLabel);
    assert.ok(p.photoUrl===null||/^\/assets\/politicians\/[a-z0-9-]+\.(jpg|png|webp)$/.test(p.photoUrl));
  }
});

test('all sixty distinct dialogue beats are dated attributed paraphrases with source links',()=>{
  const beats=TAXI_PASSENGERS.flatMap(p=>p.beats);
  assert.equal(beats.length,60);
  assert.equal(new Set(beats.map(b=>b.id)).size,60);
  assert.equal(new Set(beats.map(b=>b.text)).size,60);
  assert.ok(beats.some(b=>b.attribution==='대표발의'));
  assert.ok(beats.some(b=>b.attribution==='발언'));
  assert.ok(beats.some(b=>b.attribution==='공약 제안'));
  for(const p of TAXI_PASSENGERS){
    assert.equal(p.beats.length,5);
    for(const b of p.beats){
      assert.equal(b.type,'paraphrase');
      assert.ok(b.text.length>=280&&b.text.length<=450,b.id);
      assert.ok(b.context.includes(b.attribution),b.id);
      assert.match(b.context,/20\d{2}-\d{2}-\d{2}/);
      assert.ok(b.sources.length>0);
      for(const s of b.sources){
        assert.ok(s.title.length>5);
        assert.equal(new URL(s.url).protocol,'https:');
        assert.match(s.date,/^20\d{2}-\d{2}-\d{2}$/);
        assert.ok(Number.isFinite(Date.parse(s.date)));
        assert.ok(s.date<='2025-12-31','historical material must not silently become current news');
      }
    }
  }
});

test('anonymous dialogue excludes personal names, party labels and self-identifying offices',()=>{
  const forbidden=[...TAXI_PASSENGERS.map(p=>p.name),...TAXI_PASSENGERS.map(p=>p.partyLabel),'국회의원인','서울시장인','원내대표인','당대표인','제가 대통령'];
  for(const p of TAXI_PASSENGERS)for(const b of p.beats){
    for(const word of forbidden)assert.equal(b.text.includes(word),false,`${b.id} reveals ${word}`);
    assert.doesNotMatch(b.text,/[“”「」]/,'dialogue must not pretend to be a verbatim quotation');
    assert.doesNotMatch(b.text,/법을 통과시켰|이미 시행|법이 시행/,'proposal must not be represented as enacted');
  }
});
