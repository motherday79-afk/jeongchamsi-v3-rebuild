import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const layout=readFileSync(new URL('../src/core/polimable-layout.js',import.meta.url),'utf8');
const labels=readFileSync(new URL('../src/core/polimable-labels.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/views/polimable-page.js',import.meta.url),'utf8');
const interactions=readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');

assert.equal((layout.match(/cell\(/g)||[]).length,32,'layout must contain exactly 32 cell objects');
assert.equal((labels.match(/label\(/g)||[]).length,32,'label map must contain exactly 32 label objects');
assert.match(page,/polimable-board-base-31-226\.png/);
assert.match(page,/pm-board-label-icon/);
assert.match(page,/pm-board-label-text/);
assert.match(labels,/START/);
assert.match(labels,/정참시 광장/);
assert.match(labels,/운명의 선택/);
assert.match(labels,/정참시 투어/);
assert.match(interactions,/hydratePoliMarble\(\)\{ return; \}/,'game hydration must remain disabled');
assert.match(interactions,/bindPoliMarbleInteractions\(\)\{ return; \}/,'game binding must remain disabled');
console.log('31.226 label/icon visual stage structure: OK');
