import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderCageBanner} from '../src/ui/home-cage-banner.js';

const example="'인사청문회' 게임을 시작해 볼까?";
test('selected Black Han Sans matches the actual approved option 2 sizes with the whole title centered on the screen',()=>{
 const art=renderCageBanner({title:example,blue:2,red:1});
 assert.match(art,/font-family="JCS Cage Black,JCS Cage Sans Fallback,sans-serif"/);
 assert.doesNotMatch(art,/skewX|feDisplacementMap|grain-mask|JCS Cage Rock/);
 const lines=[...art.matchAll(/<text\b[^>]*data-cage-title-line="[^"]+"[^>]*>/g)].map(m=>m[0]);
 assert.equal(lines.length,2);
 assert.match(lines[0],/font-size="145.47"/);
 assert.match(lines[1],/font-size="106.44"/);
 assert.match(art,/gradientUnits="userSpaceOnUse"[^>]*y1="90"[^>]*y2="356"/);
});

test('LIVE moves between title and VS while original scene and clickable score boards stay in place',()=>{
 const art=renderCageBanner({title:example,blue:2,red:1});
 assert.match(art,/data-cage-live-position="above-vs"/);
 assert.match(art,/data-cage-live-y="439"/);
 assert.match(art,/data-cage-live-bottom="498"/);
 assert.match(art,/data-cage-art-patches="header-only"/);
 assert.match(art,/cage-template-156\.webp/);
 assert.match(art,/cage-readout--progressive/);assert.match(art,/cage-readout--conservative/);
 assert.match(art,/>67%<\/text>/);assert.match(art,/>33%<\/text>/);
});

test('fonts are self hosted and Black font bytes are the approved comparison file',()=>{
 const css=fs.readFileSync(new URL('../css/cage-title-166.css',import.meta.url),'utf8');
 assert.match(css,/BlackHanSans-Regular\.ttf/);assert.doesNotMatch(css,/https?:/);
 const font=fs.readFileSync(new URL('../assets/fonts/BlackHanSans-Regular.ttf',import.meta.url));
 assert.equal(font.length,979200);
 const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/css\/cage-title-166\.css/);
});
