import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const inter=read('src/ui/polimable-interactions.js');
const layout=read('src/core/polimable-layout.js');
const page=read('src/views/polimable-page.js');
const css=read('css/polimable-201.css');

if(!inter.includes("async function useCard(pi,index)")) throw new Error('card use is not confirmable async flow');
if(!inter.includes("const choice=await ask('전략카드'")) throw new Error('strategy card confirmation modal missing');
if(!inter.includes("if(choice!=='use')return;")) throw new Error('card can still consume without explicit use confirmation');
if(!inter.includes("disabled aria-disabled=\"true\"")) throw new Error('disabled card-use state missing');
if(!layout.includes('POLIMARBLE_OWNER_BADGE_POINTS')) throw new Error('owner badge pixel point map missing');
if(!page.includes('data-pm-owner-marker-layer')) throw new Error('owner marker layer missing');
if(!inter.includes("tile.type!=='property'")) throw new Error('ownership marker not restricted to property tiles');
if(!css.includes('.pm-logical-canvas .pm-owner-marker')) throw new Error('owner marker visual missing');
if(!css.includes('Disable legacy pseudo-element ownership badges permanently')) throw new Error('legacy ownership badge not disabled');
console.log('polimable 31.243 card confirm + ownership test: OK');
