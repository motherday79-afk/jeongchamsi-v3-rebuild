import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderPoliMarblePage} from '../src/views/polimable-page.js';

test('31.209 step1 intentionally renders no board cells and no character',()=>{
  const html=renderPoliMarblePage({session:{authenticated:true},state:{score:2580,peakScore:8420,stage:1,status:'playing',lastDice:[4,5],cards:[],effects:{}},leaderboard:{entries:[]}});
  assert.equal((html.match(/pm-tile/g)||[]).length,0);
  assert.equal((html.match(/pm-player/g)||[]).length,0);
  assert.doesNotMatch(html,/player-male|mascot-31/);
});

test('31.209 foundation locks desktop to 70:30 and uses clean scenic background',()=>{
  const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  assert.match(css,/grid-template-columns:70% 30%/);
  assert.match(css,/board-background-31-209\.webp/);
  assert.doesNotMatch(css,/pm-board-track|pm-player-token|pm-tile\{/);
});

test('31.209 keeps the live right status console',()=>{
  const html=renderPoliMarblePage({session:{authenticated:true},state:{score:2580,peakScore:8420,stage:1,status:'playing',lastDice:[4,5],cards:[],effects:{}},leaderboard:{entries:[]}});
  assert.match(html,/pm-console/);
  assert.match(html,/pm-dice-panel/);
  assert.match(html,/pm-score-panel/);
  assert.match(html,/pm-cards-panel/);
  assert.match(html,/pm-ranking-panel/);
});
