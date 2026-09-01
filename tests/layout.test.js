const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function read(name){ return fs.readFileSync(path.join(root,name),'utf8'); }

test('global shell exposes four primary foundation routes', () => {
  const html = read('index.html');
  for (const route of ['#/home','#/politician','#/compare','#/admin']) assert.match(html, new RegExp(route.replace('/','\\/')));
});

test('app includes home intelligence modules', () => {
  const js = read('app.js');
  for (const marker of ['NOW RANK','LIVE PULSE','ITS ME','COMPARE INTELLIGENCE','COMMUNITY']) assert.ok(js.includes(marker), marker);
});

test('app includes politician detail analysis shells', () => {
  const js = read('app.js');
  for (const marker of ['POLITICIAN INTELLIGENCE','AGE · GENDER','ANALYSIS TREND','CATEGORY RANK']) assert.ok(js.includes(marker), marker);
});

test('app includes admin control center and refresh pipeline shell', () => {
  const js = read('app.js');
  for (const marker of ['JCS CONTROL CENTER','REFRESH PIPELINE','PUBLISHED DATASET','COHORT ANALYSIS']) assert.ok(js.includes(marker), marker);
});

test('responsive CSS contains desktop, tablet and mobile breakpoints', () => {
  const css = read('styles.css');
  assert.match(css, /@media\s*\(max-width:\s*1100px\)/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.ok(css.includes('--accent'));
});
