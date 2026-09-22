import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const inter=read('src/ui/polimable-interactions.js');
const layout=read('src/core/polimable-layout.js');

if(!layout.includes('export const POLIMARBLE_OWNER_BADGE_POINTS')) throw new Error('owner badge point map missing');
if(!(inter.includes('POLIMARBLE_PROPERTY_OBJECT_POINTS as OBJECT_POINTS')||inter.includes('POLIMARBLE_OWNER_BADGE_POINTS as OWNER_BADGES'))) throw new Error('owner/object point map is not imported into game interactions');
if(!(inter.includes('point=OBJECT_POINTS[idx]')||inter.includes('point=OWNER_BADGES[idx]')||inter.includes('base=OBJECT_POINTS[idx]'))) throw new Error('ownership renderer does not use mapped property point');
if(!inter.includes("safeUiRender(renderOwnership,'ownership-markers')")) throw new Error('ownership render is not isolated from turn engine');
if(!inter.includes('function safeUiRender(fn,label)')) throw new Error('safe UI renderer missing');
if(!inter.includes("if(state.turn===1) setTimeout(()=>runTurn(1),900);")) throw new Error('AI turn scheduling missing');
if(!inter.includes("if(playerIndex===1)setTimeout(()=>runTurn(1),850)")) throw new Error('AI double extra-turn scheduling missing');
console.log('polimable 31.244 ownership + AI hotfix test: OK');
