import assert from 'node:assert/strict';
import {POLIMARBLE_32_TILE_LAYOUT,POLIMARBLE_CORNER_INDICES as CORNER_INDICES} from '../src/core/polimable-layout.js';

assert.equal(POLIMARBLE_32_TILE_LAYOUT.length,32,'board must have exactly 32 independent objects');
assert.deepEqual(POLIMARBLE_32_TILE_LAYOUT.map(x=>x.index),Array.from({length:32},(_,i)=>i),'indices must be 0..31');
assert.deepEqual(POLIMARBLE_32_TILE_LAYOUT.filter(x=>x.corner).map(x=>x.index),[0,8,16,24],'four large corners must be 0/8/16/24');
for(const cell of POLIMARBLE_32_TILE_LAYOUT){
  for(const key of ['x','y','w','h']) assert.ok(Number.isFinite(cell[key]),`${key} must be finite for ${cell.index}`);
  assert.ok(cell.w>0&&cell.h>0,`cell ${cell.index} must have positive size`);
}
console.log('POLIMARBLE 31.225 structure OK: 32 blank independent objects / 4 corners');
