import test from 'node:test';
import assert from 'node:assert/strict';
import {pickSoundName} from '../mine/audio.js';
import {PICKS,equippedPick} from '../mine/pick-catalog.js';
test('each equipped pick has its own swing and impact, including legacy paid tools',()=>{
 for(const phase of ['swing','strike']){
  const names=PICKS.map(p=>pickSoundName(equippedPick({tool:p.id}).visual,phase));
  assert.equal(new Set(names).size,10);
  assert.equal(pickSoundName(equippedPick({tool:'trial'}).visual,phase),`pick-gold-${phase}`);
  assert.equal(pickSoundName('missing',phase),`pick-rust-${phase}`);
 }
});
