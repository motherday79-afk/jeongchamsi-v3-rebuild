import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POLIMARBLE_24_TILE_LAYOUT as L} from '../src/core/polimable-layout.js';

test('31.208 connected board keeps exactly 24 cells',()=>assert.equal(L.length,24));
test('31.208 route still starts at bottom-right and contains four connected bands',()=>{
  assert.equal(L[0].band,'bottom');
  assert.deepEqual([...new Set(L.map(x=>x.band))],['bottom','left','top','right']);
});
test('31.208 only 지역공감 tile 16 is translucent in CSS',()=>{
  const css=readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  assert.match(css,/\[data-pm-tile="16"\]::before\{opacity:\.54\}/);
  assert.match(css,/\.pm-board-tile::before\{[\s\S]*?opacity:1;/);
});
test('31.208 step reaction class is wired to movement',()=>{
  const js=readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');
  assert.match(js,/is-stepping/);
  assert.match(js,/react:true/);
});
