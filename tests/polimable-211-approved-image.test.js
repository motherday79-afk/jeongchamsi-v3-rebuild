
import fs from 'node:fs';
import assert from 'node:assert/strict';
const v=fs.readFileSync(new URL('../src/views/polimable-page.js',import.meta.url),'utf8');
const c=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
assert.ok(v.includes('POLIMARBLE_STEP1_APPROVED_31_211.png'));
assert.ok(!v.includes('pm-tile'));
assert.ok(!v.includes('pm-player'));
assert.match(c,/grid-template-columns:7fr 3fr!important/);
console.log('31.211 approved-image step test passed');
