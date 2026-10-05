import test from 'node:test';
import assert from 'node:assert/strict';
import * as comparison from '../src/ui/comparison-board.js';
import * as labels from '../src/ui/political-map-labels.js';
import {MAP_REGIONS,MAP_DISTRICTS} from '../src/data/political-map-geometry.js';
test('horizontal gesture changes one comparison tab; vertical and short gestures do not',()=>{
 assert.equal(comparison.swipeTabIndex(0,5,-80,12),1);
 assert.equal(comparison.swipeTabIndex(1,5,90,10),0);
 assert.equal(comparison.swipeTabIndex(0,5,80,0),0);
 assert.equal(comparison.swipeTabIndex(4,5,-80,0),4);
 assert.equal(comparison.swipeTabIndex(2,5,-20,0),2);
 assert.equal(comparison.swipeTabIndex(2,5,-80,100),2);
});
test('phone map labels stay legible, inside their areas and never overlap at fitted width',()=>{
 for(const region of MAP_REGIONS){
  const [x,y,w,h]=region.bounds,box=[x-4,y-4,w+8,h+8];
  const groups=labels.districtLabelGroups(MAP_DISTRICTS.filter(d=>d.region===region.name));
  const rows=labels.mobileRegionLabels(groups,box,300,390);
  assert.ok(rows.length>0,region.name);
  for(const [i,row] of rows.entries()){
   assert.ok(row.inside,region.name+' '+row.name);
   assert.ok(row.x-row.w/2>=0&&row.x+row.w/2<=300);
   assert.ok(!rows.slice(i+1).some(other=>labels.labelOverlap(row,other)));
  }
 }
});
