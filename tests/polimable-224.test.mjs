import assert from 'node:assert/strict';
import {POLIMARBLE_BOARD} from '../src/core/polimable-data.js';
import {POLIMARBLE_32_TILE_LAYOUT} from '../src/core/polimable-layout.js';
import {createGameState,rollTurn,resolveAssetAction} from '../lib/polimable-engine.js';
assert.equal(POLIMARBLE_BOARD.length,32);
assert.equal(POLIMARBLE_32_TILE_LAYOUT.length,32);
for(const index of [0,8,16,24])assert.equal(POLIMARBLE_32_TILE_LAYOUT[index].corner,true);
assert.deepEqual(POLIMARBLE_BOARD.filter(t=>t.kind==='asset').map(t=>t.group),[
 'civic','civic','civic','civic','ngo','ngo','ngo','ngo','press','press','press','press','media','media','media','media','policy','policy','policy','policy'
]);
let state=createGameState({sessionId:'test',userId:'u1',nickname:'JCS',initials:'JCS',now:new Date('2026-09-20T00:00:00Z')});
assert.equal(state.score,10000);
const rng={int:()=>1,float:()=>.1};
state=rollTurn(state,rng,new Date('2026-09-20T00:00:01Z'));
assert.deepEqual(state.lastDice,[1,1]);
assert.equal(state.position,2);
assert.equal(state.pendingAction.mode,'buy');
state=resolveAssetAction(state,'buy',null,new Date('2026-09-20T00:00:02Z'));
assert.equal(state.assets['2'].level,1);
assert.equal(state.score,9300);
console.log('POLIMARBLE 31.224 tests: PASS');
