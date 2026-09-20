import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('css/polimable-201.css');
const js=read('src/ui/polimable-interactions.js');

if(!css.includes('grid-template-columns:repeat(4,1fr)')) throw new Error('strategy slots not upgraded to 4 columns');
if(!js.includes('const MAX_CARDS=4;')) throw new Error('MAX_CARDS not upgraded to 4');
if(!js.includes('[0,1,2,3].map')) throw new Error('card render loop not upgraded to 4 slots');
if(!css.includes('.pm-player-hud--p1{left:11.05%;top:1.72%;width:12.7%;height:10.2%;')) throw new Error('p1 hud alignment missing');
if(!css.includes('.pm-ranking-overlay{position:absolute;left:34.05%;bottom:2.7%;width:32.2%;height:10.55%;')) throw new Error('ranking alignment missing');
console.log('polimable 31.235 hud align test: OK');
