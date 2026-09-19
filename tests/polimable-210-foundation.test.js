
import fs from 'node:fs';
import assert from 'node:assert/strict';

const view = fs.readFileSync(new URL('../src/views/polimable-page.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/polimable-201.css', import.meta.url), 'utf8');
const svg = fs.readFileSync(new URL('../assets/polimable/board-background-31-210.svg', import.meta.url), 'utf8');

assert.match(css, /grid-template-columns:\s*7fr\s+3fr/);
assert.ok(!view.includes('pm-board-logo'), 'STEP1 must not render logo over board');
assert.ok(!view.includes('pm-board-copy'), 'STEP1 must not render copy over board');
assert.ok(!view.includes('pm-tile'), 'STEP1 must not render board tiles');
assert.ok(!view.includes('pm-player'), 'STEP1 must not render player');
assert.ok(!svg.includes('<text'), 'background SVG must contain no text');
assert.ok(!svg.includes('image href='), 'background must not stitch raster images');
assert.ok(svg.includes('id="capitol"'), 'background must include original central civic building');
assert.ok(svg.includes('id="park"'), 'background must include original park scene');
console.log('polimable 31.210 foundation tests passed');
