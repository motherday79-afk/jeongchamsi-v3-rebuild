import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {POLIMARBLE_32_TILE_LAYOUT, POLIMARBLE_MOVE_ANCHORS, POLIMARBLE_PROPERTY_OBJECT_POINTS, POLIMARBLE_STRATEGY_INDICES} from '../src/core/polimable-layout.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const must=[
  'assets/polimable/objects/flag-p1.png','assets/polimable/objects/flag-p2.png',
  'assets/polimable/objects/building-1.png','assets/polimable/objects/building-2.png','assets/polimable/objects/building-3.png',
  'assets/polimable/objects/fixed-asset-effect.png',
  'assets/polimable/characters/player1/profile.png','assets/polimable/characters/player1/token.png',
  'assets/polimable/characters/player2/profile.png','assets/polimable/characters/player2/token.png'
];
for(const f of must) if(!fs.existsSync(path.join(root,f))) throw new Error(`missing ${f}`);
if(POLIMARBLE_32_TILE_LAYOUT.length!==32) throw new Error('board must have 32 tiles');
if(POLIMARBLE_MOVE_ANCHORS.length!==32) throw new Error('movement anchors must have 32 points');
if(Object.keys(POLIMARBLE_PROPERTY_OBJECT_POINTS).length!==24) throw new Error('property object anchors must be 24');
if(JSON.stringify(POLIMARBLE_STRATEGY_INDICES)!==JSON.stringify([4,12,20,28])) throw new Error('strategy positions mismatch');
const ui=fs.readFileSync(path.join(root,'src/ui/polimable-interactions.js'),'utf8');
for(const s of ['flag-p1.png','flag-p2.png','building-1.png','building-2.png','building-3.png']) if(!ui.includes(s)) throw new Error(`UI missing ${s}`);
const view=fs.readFileSync(path.join(root,'src/views/polimable-page.js'),'utf8');
if(!view.includes('fixed-asset-effect.png')) throw new Error('view missing fixed asset effect');
if(!(ui.includes('TOKEN_POINTS')&&ui.includes("same?'p1':'solo'")&&ui.includes("same?'p2':'solo'"))) throw new Error('same-tile token placement missing');
console.log('polimable 31.250 object system test: OK');
