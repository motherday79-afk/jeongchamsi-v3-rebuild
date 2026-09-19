import test from 'node:test';
import assert from 'node:assert/strict';
import {POLIMARBLE_24_TILE_LAYOUT as L} from '../src/core/polimable-layout.js';

test('31.207 connected board has exactly 24 cells',()=>assert.equal(L.length,24));
test('bottom/top horizontal cells touch',()=>{
  for(const pair of [[7,6],[6,5],[5,4],[4,3],[3,2],[2,1],[1,0],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19]]){
    const [a,b]=pair; const left=L[a].x<L[b].x?L[a]:L[b],right=left===L[a]?L[b]:L[a];
    assert.ok(Math.abs((left.x+left.w)-right.x)<0.02);
  }
});
test('side cells touch vertically',()=>{
  for(const pair of [[11,10],[10,9],[9,8],[8,7],[20,21],[21,22],[22,23],[23,0]]){
    const [a,b]=pair; const top=L[a].y<L[b].y?L[a]:L[b],bottom=top===L[a]?L[b]:L[a];
    assert.ok(Math.abs((top.y+top.h)-bottom.y)<0.02);
  }
});
