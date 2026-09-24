import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {minerSprite} from '../mine/integrated-miner.js';
import {SWING_FRAMES} from '../mine/motion.js';
test('all five races select all ten integrated owned pickaxe sprites',()=>{
 for(const character of ['orc','elf','dwarf','human','goblin'])for(const tool of ['rust','iron','silver','gold','mystic','dimension','dark','heaven','lightning','wind']){
  const sprite=minerSprite({character,tool});assert.equal(sprite.tier,tool);assert.equal(sprite.character,character);
  assert.ok(existsSync(new URL('..'+sprite.url,import.meta.url)),sprite.url);
 }
 assert.equal(minerSprite({character:'elf',tool:'trial'}).tier,'gold');
});
test('lifting takes longer than the downswing; impact precedes recovery',()=>{
 const when=n=>SWING_FRAMES.find(x=>x.frame===n).at;
 assert.ok(when(3)-when(1)>when(5)-when(3));assert.ok(when(6)>when(5));
});
test('active game does not import the multipart rig or wardrobe',()=>{
 const js=readFileSync(new URL('../mine/mine.js',import.meta.url),'utf8');
 assert.doesNotMatch(js,/character-rig|wardrobe-ui|renderPickDecoration/);
 assert.match(js,/renderIntegratedMiner/);
});

import {PICK_SOCKETS} from '../mine/pick-sockets.js';
test('every integrated sprite has eight measured effect positions within its frame',()=>{
 assert.equal(Object.keys(PICK_SOCKETS).length,50);
 for(const sockets of Object.values(PICK_SOCKETS)){assert.equal(sockets.length,8);for(const [x,y]of sockets){assert.ok(x>=0&&x<540);assert.ok(y>=0&&y<710);}}
});
