import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('css/polimable-201.css');
const js=read('src/ui/polimable-interactions.js');
if(!css.includes('.pm-dice-roll-button{left:88.15%!important;top:84.15%!important;width:8.55%!important;height:8.95%!important;')) throw new Error('dice hitbox precision override missing');
if(!css.includes('.pm-card-chip{width:88%;height:88%;')) throw new Error('strategy card size tune missing');
if(!css.includes('.pm-player-hud--p1{left:11.18%;top:1.95%;width:12.45%;height:9.75%}')) throw new Error('P1 fine tune missing');
if(!js.includes('const MAX_CARDS=4;')) throw new Error('4-card rule changed unexpectedly');
console.log('polimable 31.237 hud/dice hitbox test: OK');
