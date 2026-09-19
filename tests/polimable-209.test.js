import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('31.209 uses server client actions instead of local random dice',()=>{
  const js=readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');
  assert.match(js,/client\.start\(\)/);
  assert.match(js,/client\.roll\(ctx\.state\.sessionId\)/);
  assert.match(js,/client\.choice\(/);
  assert.match(js,/client\.card\(/);
  assert.match(js,/client\.cashout\(/);
  assert.doesNotMatch(js,/Math\.random/);
});

test('31.209 keeps one-step-at-a-time movement and tile reaction',()=>{
  const js=readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');
  assert.match(js,/for\(let step=0;step<distance;step\+=1\)/);
  assert.match(js,/position=\(position\+1\)%24/);
  assert.match(js,/react:true/);
});

test('31.209 renders live score cards ranking and choice UI',()=>{
  const page=readFileSync(new URL('../src/views/polimable-page.js',import.meta.url),'utf8');
  for(const token of ['data-pm-score','data-pm-card-slot','data-pm-ranking','data-pm-choice-modal','data-pm-cashout'])assert.match(page,new RegExp(token));
});

test('31.209 preserves only tile 16 translucency rule',()=>{
  const css=readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  assert.match(css,/\.pm-board-tile\[data-pm-tile="16"\]::before\{opacity:\.54\}/);
});
