import fs from 'fs';
import {calculatePoliMarbleStage,POLIMARBLE_LOGICAL_WIDTH as W,POLIMARBLE_LOGICAL_HEIGHT as H} from '../src/core/polimable-viewport.js';

const eps=0.02;
const ratio=W/H;
const devices=[
  ['iPhone standard',844,390,{left:47,right:47,bottom:21},'height-fit'],
  ['Galaxy standard',915,412,{},'height-fit'],
  ['iPhone Max',932,430,{left:47,right:47,bottom:21},'height-fit'],
  ['Galaxy Ultra',960,432,{},'height-fit'],
  ['Fold closed',904,344,{},'height-fit'],
  ['Fold open',906,754,{},'width-fit']
];
for(const [name,vw,vh,insets,mode] of devices){
  const fit=calculatePoliMarbleStage(vw,vh,insets);
  if(fit.mode!==mode) throw new Error(`${name}: expected ${mode}, got ${fit.mode}`);
  if(Math.abs(fit.width/fit.height-ratio)>eps) throw new Error(`${name}: aspect ratio changed`);
  if(fit.width>fit.availableWidth+.01||fit.height>fit.availableHeight+.01) throw new Error(`${name}: stage overflow`);
}

const css=fs.readFileSync(new URL('../css/polimable-201.css',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/ui/polimable-interactions.js',import.meta.url),'utf8');
const view=fs.readFileSync(new URL('../src/views/polimable-page.js',import.meta.url),'utf8');
if(!css.includes('.pm-board-stage-page.pm-mobile-fit')) throw new Error('mobile-fit CSS missing');
if(!css.includes('safe-area-inset-left')) throw new Error('safe-area support missing');
if(!ui.includes('calculatePoliMarbleStage')) throw new Error('viewport fit calculation not wired');
if(ui.includes('canvas.style.transform=`scale(${sx},${sy})`')) throw new Error('non-uniform logical scaling still active');
if(!view.includes('data-pm-orientation-guard')) throw new Error('portrait orientation guard missing');
console.log('polimable 31.246 mobile fit test: OK');
