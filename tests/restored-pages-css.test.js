import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('restored pages include responsive participation, president, search, story and compact compare layouts',async()=>{
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_27 · RESTORED LEGACY PAGES');
  assert.ok(start>0);const layer=css.slice(start);
  for(const selector of ['.poll-board-card','.generation-choice-panel','.national-evaluation-two-slot-page','.president-page','.search-page','.brand-support-story','.admin-compare-summary-table'])assert.match(layer,new RegExp(selector.replaceAll('.','\\.')));
  assert.match(layer,/@media\(max-width:760px\)/);
});
