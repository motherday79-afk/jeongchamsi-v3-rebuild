import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('css/polimable-201.css');
const page=read('src/views/polimable-page.js');

if(!page.includes('<div class="pm-logical-canvas"')) throw new Error('logical canvas missing');
if(!page.includes('pm-player-hud--p2')) throw new Error('P2 HUD missing');
const logicalStart=page.indexOf('<div class="pm-logical-canvas"');
const overlayStart=page.indexOf('<div class="pm-game-overlay-layer">');
const p2Index=page.indexOf('pm-player-hud--p2');
if(!(logicalStart < p2Index && p2Index < overlayStart)) throw new Error('P2 HUD is not inside logical canvas');
if(!css.includes('left:1302px!important;top:52px!important;width:182px!important;height:13px!important')) throw new Error('P2 name coordinate missing');
if(!css.includes('left:1302px!important;top:65px!important;width:182px!important;height:22px!important')) throw new Error('P2 cash coordinate missing');
if(!css.includes('left:1300px!important;top:98px!important;width:186px!important;height:31px!important')) throw new Error('P2 meta coordinate missing');
if(!css.includes('font-size:20px!important')) throw new Error('P2 cash font size missing');
if(!css.includes('font-size:17px!important')) throw new Error('P2 meta font size missing');
console.log('polimable 31.240 p2 info fit test: OK');
