import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const compact=value=>value.replace(/\s+/g,'');

test('mobile NOW rank hotfix loads after every existing stylesheet',()=>{
  const html=read('index.html');
  const approved=html.indexOf('/css/diagnosis-approved.css');
  const mobileNow=html.indexOf('/css/hotfix-31-27-mobile-now-rank.css?v=0.0.31.27');
  assert.ok(approved>=0,'approved diagnosis stylesheet must remain loaded');
  assert.ok(mobileNow>approved,'mobile NOW hotfix must load last so legacy mobile selectors cannot override it');
});

test('Galaxy phone widths keep all ten NOW cards in a stable two-column layout',()=>{
  const css=compact(read('css/hotfix-31-27-mobile-now-rank.css'));
  assert.match(css,/@media\(max-width:560px\)\{/);
  assert.match(css,/#now\.rank-top-grid-10\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px;/);
  assert.match(css,/#now\.rank-top-grid-10\.rank-top-card,#now\.rank-top-grid-10\.rank-top-card:first-child\{grid-column:auto;display:flex;flex-direction:column;align-items:center;min-width:0;min-height:168px;height:auto;/);
});

test('NOW names, affiliations and scores cannot collapse into vertical characters',()=>{
  const css=compact(read('css/hotfix-31-27-mobile-now-rank.css'));
  assert.match(css,/#now\.rank-top-grid-10\.rank-top-copy>b,#now\.rank-top-grid-10\.rank-top-copy>span,#now\.rank-top-grid-10\.rank-top-copy>strong\{[^}]*white-space:nowrap;[^}]*word-break:keep-all;[^}]*overflow-wrap:normal;[^}]*writing-mode:horizontal-tb;[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;/);
  assert.doesNotMatch(css,/text-size-adjust:none|-webkit-text-size-adjust:none/);
});

test('Samsung display zoom and 320px Fold widths switch NOW cards to one compact column',()=>{
  const css=compact(read('css/hotfix-31-27-mobile-now-rank.css'));
  assert.match(css,/@media\(max-width:340px\)\{#now\.rank-top-grid-10\{grid-template-columns:minmax\(0,1fr\);\}/);
  assert.match(css,/#now\.rank-top-grid-10\.rank-top-card,#now\.rank-top-grid-10\.rank-top-card:first-child\{grid-column:1;display:grid;grid-template-columns:64pxminmax\(0,1fr\);align-items:center;min-height:112px;/);
});
