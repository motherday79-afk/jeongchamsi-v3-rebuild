import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const base=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const page=read('src/views/polimable-page.js');
const inter=read('src/ui/polimable-interactions.js');
const audio=read('src/core/polimable-audio.js');
const css=read('css/polimable-201.css');

if(!page.includes('data-pm-sound-toggle')) throw new Error('sound toggle missing');
if(!inter.includes("createPoliMarbleAudio")) throw new Error('audio controller not wired');
for(const key of ['diceRoll','diceLand','step','land','purchase','gain','loss','double','start']){
  if(!inter.includes(`audio.play('${key}')`)) throw new Error(`missing SFX hook: ${key}`);
}
if(!audio.includes('jcs:polimable:audio-enabled')) throw new Error('persistent audio setting missing');
if(!audio.includes('polimable-bgm-purple-gold.mp3')) throw new Error('Purple Gold BGM missing');
if(!css.includes('.pm-sound-toggle')) throw new Error('sound toggle CSS missing');
for(const f of [
  'polimable-bgm-purple-gold.mp3','sfx-dice-roll.wav','sfx-dice-land.wav','sfx-step.wav','sfx-land.wav',
  'sfx-purchase.wav','sfx-gain.wav','sfx-loss.wav','sfx-double.wav','sfx-start.wav'
]){
  const p=path.join(base,'assets/polimable/audio',f);
  if(!fs.existsSync(p)||fs.statSync(p).size<1000) throw new Error(`audio asset missing/empty: ${f}`);
}
console.log('polimable 31.245 audio test: OK');
