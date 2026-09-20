import fs from 'node:fs';
const layout=fs.readFileSync(new URL('../src/core/polimable-layout.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');
const anchors=[...layout.matchAll(/anchor\((\d+),([\d.]+),([\d.]+),/g)];
if(anchors.length!==33) throw new Error(`expected 33 precision visual anchors, got ${anchors.length}`);
for(const [,i,x,y] of anchors){
  const nx=Number(x), ny=Number(y);
  if(nx<0||nx>100||ny<0||ny>100) throw new Error(`anchor ${i} out of bounds`);
}
if(!ui.includes('POLIMARBLE_MOVE_ANCHORS as MOVE_ANCHORS')) throw new Error('movement does not use precision anchors');
if(ui.includes('cell.x+cell.w/2')) throw new Error('old rectangle-center movement still present');
console.log('31.233 precision center coordinates: OK');
