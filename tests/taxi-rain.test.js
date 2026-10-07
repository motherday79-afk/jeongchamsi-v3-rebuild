import test from 'node:test';
import assert from 'node:assert/strict';
import {fillRoofRain} from '../taxi/rain.js';
test('roof rain produces a bounded non-silent loop at mobile and desktop sample rates',()=>{
 for(const rate of [24000,44100,48000]){
  let seed=473;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const data=new Float32Array(rate*2);fillRoofRain(data,rate,random);
  let energy=0,peak=0;for(const v of data){assert.ok(Number.isFinite(v));energy+=v*v;peak=Math.max(peak,Math.abs(v));}
  assert.ok(peak<1);assert.ok(energy/data.length>.00001);
  assert.ok(Math.abs(data[0]-data.at(-1))<.000001);
 }
});
