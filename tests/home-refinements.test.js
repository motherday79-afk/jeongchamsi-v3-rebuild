import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { supportBridge } from '../src/layout/home-layout.js';

test('support bridge keeps two equal whole-half links with native decorative SVG',()=>{
 const html=supportBridge();
 assert.match(html,/class="side-support-bridge"/);
 assert.equal((html.match(/class="support-bridge-link /g)||[]).length,2);
 assert.match(html,/href="\/about"[^>]+data-layout-route="\/about"/);
 assert.match(html,/href="\/points\?view=support"[^>]+data-layout-route="\/points\?view=support"/);
 assert.equal((html.match(/<svg\b/g)||[]).length,4,'each half has an icon and refined arrow');
 assert.doesNotMatch(html,/<img\b|support-purple-gold-156\.webp/);
});

test('158 banner styling is white, 80px high, and split into equal halves',()=>{
 const css=fs.readFileSync(new URL('../css/home-refinements-158.css',import.meta.url),'utf8');
 assert.match(css,/\.side-support-bridge\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)\s+minmax\(0,1fr\)/s);
 assert.match(css,/\.side-support-bridge\s*\{[^}]*height\s*:\s*80px/s);
 assert.match(css,/\.side-support-bridge\s*\{[^}]*background\s*:\s*#fff(?:fff)?\b/s);
 assert.match(css,/\.support-bridge-link\s*\{[^}]*height\s*:\s*100%/s);
 assert.match(css,/--support-purple\s*:\s*#753bbd/i);
 assert.match(css,/--support-gold\s*:/i);
});

test('158 compare styling positions each impact at its measured avatar anchor',()=>{
 const css=fs.readFileSync(new URL('../css/home-refinements-158.css',import.meta.url),'utf8');
 assert.match(css,/\.matchup-impact-side\s*\{[^}]*left\s*:\s*var\(--matchup-anchor-x\)/s);
 assert.match(css,/\.matchup-impact-side\s*\{[^}]*top\s*:\s*var\(--matchup-anchor-y\)/s);
 assert.doesNotMatch(css,/\.matchup-impact-arena\s*\{[^}]*grid-template-columns/s);
});
