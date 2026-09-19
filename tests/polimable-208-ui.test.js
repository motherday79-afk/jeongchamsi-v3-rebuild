import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderPoliMarblePage} from '../src/views/polimable-page.js';

test('31.208 renders exactly 24 live board cells and one player token',()=>{
  const html=renderPoliMarblePage({session:{authenticated:true},state:{position:5,score:2580,peakScore:8420,stage:1,status:'playing',lastDice:[4],cards:[],effects:{}}});
  assert.equal((html.match(/class="pm-tile tone-/g)||[]).length,24);
  assert.equal((html.match(/class="pm-player-token/g)||[]).length,1);
  assert.match(html,/01[\s\S]*24/);
});

test('31.208 uses scenic-only background and separate logo/player assets',()=>{
  const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  const view=fs.readFileSync(new URL('../src/views/polimable-page.js',import.meta.url),'utf8');
  assert.match(css,/board-scene-only-31-208\.webp/);
  assert.doesNotMatch(css,/DESIGN_SOURCE_OF_TRUTH|board-scene-31-207\.webp/);
  assert.match(view,/player-male-31-208\.png/);
  assert.match(view,/logo-31-208\.webp/);
});

test('31.208 has no active-cell glow/pulse current-position class',()=>{
  const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  const view=fs.readFileSync(new URL('../src/views/polimable-page.js',import.meta.url),'utf8');
  assert.doesNotMatch(css,/pm-tile[^\n{]*(active|current|pulse|glow)/i);
  assert.doesNotMatch(view,/current-cell|active-cell|tile-active|tile-current/i);
});

test('31.208 dice has dedicated roll animation',()=>{
  const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  const ui=fs.readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');
  assert.match(css,/@keyframes pm-dice-roll/);
  assert.match(css,/\.pm-die\.is-rolling/);
  assert.match(ui,/_diceRolling=true/);
  assert.match(ui,/wait\(720\)/);
});
