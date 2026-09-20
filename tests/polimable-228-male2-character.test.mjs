import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
const names=['front','token','profile','move','win','fail','emotion'];
for(const n of names){
 const p=new URL(`assets/polimable/characters/male2/male2-${n}.png`,base);
 assert.equal(fs.existsSync(p),true,`missing ${n}`);
}
const page=fs.readFileSync(new URL('src/views/polimable-page.js',base),'utf8');
assert.match(page,/male2-profile\.png/);
assert.match(page,/male2-token\.png/);
const css=fs.readFileSync(new URL('css/polimable-201.css',base),'utf8');
assert.match(css,/pm-character-profile--p1/);
const js=fs.readFileSync(new URL('src\/ui\/polimable-interactions.js',base),'utf8');
assert.match(js,/male2-move\.png/);
assert.match(js,/male2-win\.png/);
assert.match(js,/male2-fail\.png/);
assert.match(js,/male2-emotion\.png/);
console.log('31.228 male2 character assets OK');
