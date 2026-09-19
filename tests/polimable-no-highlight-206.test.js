import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderPoliMarblePage} from '../src/views/polimable-page.js';

test('Polimable renders 24 invisible movement anchors and no current-cell visual marker',()=>{
  const state={position:7,score:1000,peakScore:1000,status:'playing',cards:[],effects:{},lastDice:[],lastEvents:[]};
  const html=renderPoliMarblePage({session:{authenticated:true},state,leaderboard:{entries:[]},scope:'today'});
  assert.equal((html.match(/data-pm-cell=/g)||[]).length,24);
  assert.equal((html.match(/pm-moving-avatar/g)||[]).length,1);
  assert.doesNotMatch(html,/pm-cell-index/);
  assert.doesNotMatch(html,/is-active/);
});

test('Polimable CSS has no permanent active-cell pulse or glow',()=>{
  const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/pm-active-pulse/);
  assert.doesNotMatch(css,/is-active:before/);
  assert.doesNotMatch(css,/pm-cell-index/);
  assert.match(css,/\.pm-cell-anchor\.has-player\{z-index:15\}/);
  assert.match(css,/\.pm-cell-anchor\.is-moving \.pm-moving-avatar\{animation:pm-hop/);
});
