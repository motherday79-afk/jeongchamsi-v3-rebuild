import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const page=read('src/views/polimable-page.js');
const css=read('css/polimable-201.css');

if(!page.includes('<div class="pm-ranking-overlay" data-pm-ranking-overlay aria-label="TODAY RANKING"></div>')) throw new Error('ranking overlay missing from page');
const logicalStart=page.indexOf('<div class="pm-logical-canvas"');
const ranking=page.indexOf('data-pm-ranking-overlay');
const logicalEnd=page.indexOf('</div>\n\n      <div class="pm-game-overlay-layer">',logicalStart);
if(!(logicalStart>=0 && ranking>logicalStart && ranking<logicalEnd)) throw new Error('ranking overlay is not inside logical canvas');
for(const y of ['788px','827px','866px']) if(!css.includes(`top:${y}!important`)) throw new Error(`ranking row y ${y} missing`);
if(!css.includes('left:650px!important')||!css.includes('width:435px!important')) throw new Error('ranking row geometry missing');
if(!css.includes('.pm-logical-canvas .pm-ranking-overlay .pm-rank-row.is-empty{opacity:0!important}')) throw new Error('empty third row behavior missing');
console.log('polimable 31.241 today ranking alignment test: OK');
