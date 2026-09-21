import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {POLIMARBLE_32_TILE_LAYOUT,POLIMARBLE_TOKEN_POINTS,POLIMARBLE_PROPERTY_OBJECT_POINTS} from '../src/core/polimable-layout.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
if(POLIMARBLE_32_TILE_LAYOUT.length!==32) throw new Error('32 tiles required');
if(POLIMARBLE_TOKEN_POINTS.length!==32) throw new Error('32 token placements required');
if(Object.keys(POLIMARBLE_PROPERTY_OBJECT_POINTS).length!==24) throw new Error('24 property object points required');
const start=POLIMARBLE_TOKEN_POINTS[0];
if(!(start.p1.x<start.p2.x&&start.p1.y===start.p2.y)) throw new Error('START same-tile split invalid');
for(const p of POLIMARBLE_TOKEN_POINTS){
  if(!p.solo||!p.p1||!p.p2) throw new Error(`token slots missing at ${p.index}`);
  if(p.p1.x===p.p2.x&&p.p1.y===p.p2.y) throw new Error(`pair overlap at ${p.index}`);
}
const js=read('src/ui/polimable-interactions.js');
if(!js.includes("same?'p1':'solo'")||!js.includes("same?'p2':'solo'")) throw new Error('pair slot logic missing');
if(!js.includes("--pm-token-x")||!js.includes("--pm-token-y")) throw new Error('token css variables missing');
const css=read('css/polimable-201.css');
if(!css.includes('left:var(--pm-token-x,813px)!important')) throw new Error('token left variable not active');
if(!css.includes('top:var(--pm-token-y,817px)!important')) throw new Error('token top variable not active');
if(!css.includes('.pm-character-profile--p1{left:56px!important;top:82px!important;width:100px!important;height:100px!important}')) throw new Error('P1 profile pixel fit missing');
if(!css.includes('.pm-character-profile--p2{left:1517px!important;top:82px!important;width:100px!important;height:100px!important}')) throw new Error('P2 profile pixel fit missing');
if(!css.includes('.pm-property-state-object{\n  transform:translate(-50%,-50%)!important;')) throw new Error('property object center anchoring missing');
console.log('polimable 31.251 precision remap test: OK');
