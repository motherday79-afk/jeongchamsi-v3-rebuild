import assert from 'node:assert/strict';
import {POLIMARBLE_32_TILE_LAYOUT,POLIMARBLE_HUD_LAYOUT} from '../src/core/polimable-layout.js';
assert.equal(POLIMARBLE_32_TILE_LAYOUT.length,32,'board must expose exactly 32 independent tile objects');
assert.deepEqual(POLIMARBLE_32_TILE_LAYOUT.filter(x=>x.corner).map(x=>x.index),[0,8,16,24]);
assert.deepEqual(POLIMARBLE_HUD_LAYOUT.map(x=>x.id),['player-1','player-2','dice-roll']);
for(const x of [...POLIMARBLE_32_TILE_LAYOUT,...POLIMARBLE_HUD_LAYOUT]){
  for(const k of ['cx','cy','w','h']) assert.ok(Number.isFinite(x[k])&&x[k]>=0,`${k} must be valid`);
}
console.log('polimable-227 object map OK');
