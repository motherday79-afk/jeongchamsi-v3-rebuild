import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderPoliMarblePage} from '../src/views/polimable-page.js';

test('Polimable renders exactly 24 real board tiles and one Minime current-position token',()=>{
  const state={position:7,score:1000,peakScore:1000,stage:1,status:'playing',cards:[],effects:{},lastDice:[],lastEvents:[]};
  const html=renderPoliMarblePage({session:{authenticated:true},state,leaderboard:{entries:[]},scope:'today'});
  assert.equal((html.match(/data-pm-cell=/g)||[]).length,24);
  assert.equal((html.match(/pm-player-token/g)||[]).length,1);
  assert.equal((html.match(/player-male-31-207\.png/g)||[]).length>=1,true);
  assert.doesNotMatch(html,/is-active|has-player|pm-cell-anchor|pm-moving-avatar|DESIGN_SOURCE_OF_TRUTH/);
});

test('Polimable CSS contains no active-cell glow or pulse; movement animation is player-only',()=>{
  const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/pm-active-pulse|is-active:before|has-player|pm-cell-anchor/);
  assert.match(css,/\.pm-player-token\.is-moving\{animation:pm-minime-hop/);
  assert.doesNotMatch(css,/\.pm-tile[^\{]*\{[^}]*animation:/s);
});
