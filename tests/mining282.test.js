import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {minerSprite} from '../mine/integrated-miner.js';
import {SWING_FRAMES} from '../mine/motion.js';
test('every character selects its integrated miner and tool for each upgrade boundary',()=>{
 for(const character of ['strong','glamour','elf'])for(const [pick,tier]of [[1,0],[2,1],[6,1],[7,2],[13,2],[14,3],[20,3]]){
  const sprite=minerSprite({character,pick,tool:'basic'});assert.equal(sprite.tier,tier);assert.equal(sprite.character,character);
  assert.ok(existsSync(new URL('..'+sprite.url,import.meta.url)),sprite.url);
 }
 assert.equal(minerSprite({character:'elf',pick:1,tool:'trial'}).tier,2);
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
