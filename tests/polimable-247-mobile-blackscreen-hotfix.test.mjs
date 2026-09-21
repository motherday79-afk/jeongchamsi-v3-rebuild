import fs from 'fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const ui=read('src/ui/polimable-interactions.js');
const css=read('css/polimable-201.css');
if(!ui.includes("import {calculatePoliMarbleStage} from '../core/polimable-viewport.js?v=0.0.31.247';")) throw new Error('viewport calculator import missing');
if(!ui.includes("root.dataset.pmFitMode='fallback-fit'")) throw new Error('mobile fallback fit missing');
if(!css.includes('aspect-ratio:1672/941!important')) throw new Error('mobile stage safe aspect ratio missing');
console.log('polimable 31.247 mobile blackscreen hotfix: OK');
