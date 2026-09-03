import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('role diagnostics use a compact report layer with four-person responsive matrix safety',async()=>{
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_28 · ROLE TIERED POLITICAL DIAGNOSTICS');
  assert.ok(start>=0);
  const layer=css.slice(start);
  for(const selector of ['.jcs-diagnostics-public-grid','.jcs-diagnostic-admin-grid','.jcs-compare-matrix','.jcs-compare-matrix-profile-row','.jcs-compare-topic-row','.jcs-compare-report-admin'])assert.match(layer,new RegExp(selector.replaceAll('.','\\.')));
  assert.match(layer,/grid-template-columns:\s*minmax\([^;]+repeat\(var\(--compare-count\)/);
  assert.match(layer,/overflow-x:\s*auto/);
  assert.match(layer,/position:\s*sticky/);
  assert.match(layer,/@media\s*\(max-width:\s*760px\)/);
  assert.match(layer,/min-width:\s*calc\(/);
  const adminHeadingSizes=[...layer.matchAll(/\.jcs-diagnostic-admin-topic[^{}]*h3[^{}]*\{[^}]*font-size:\s*(\d+(?:\.\d+)?)px/gs)].map(match=>Number(match[1]));
  assert.ok(adminHeadingSizes.length>0);
  assert.ok(adminHeadingSizes.every(size=>size<=20));
});
