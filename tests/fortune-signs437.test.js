import test from 'node:test';
import assert from 'node:assert/strict';
import {ANIMALS,SIGNS,fortuneDay,signFortune,readFortunePreferences,saveFortunePreferences} from '../src/core/fortune-signs.js?v=0.0.31.437';
import {renderFortuneCard} from '../src/layout/home-layout.js';
test('readings are stable within a Korean day and refresh at Korean midnight',()=>{
 assert.equal(fortuneDay(new Date('2026-10-05T14:59:59Z')),'2026-10-05');
 assert.equal(fortuneDay(new Date('2026-10-05T15:00:00Z')),'2026-10-06');
 for(const [tab,choices] of [['animal',ANIMALS],['star',SIGNS]])for(const choice of choices){const a=signFortune(tab,choice,'2026-10-05');assert.deepEqual(a,signFortune(tab,choice,'2026-10-05'));assert.notDeepEqual(a,signFortune(tab,choice,'2026-10-06'));for(const key of ['overall','money','business','relationship'])assert.ok(a[key].score>=55&&a[key].score<=95&&a[key].title);}
 assert.throws(()=>signFortune('star','invalid'),/INVALID/);
});
test('preferences survive reload and are isolated per account',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 saveFortunePreferences('pref-A',{tab:'star',animal:'용띠',star:'사자자리'},storage);
 assert.equal(readFortunePreferences('pref-A',storage).star,'사자자리');assert.equal(readFortunePreferences('pref-B',storage).tab,'overall');
 const broken={getItem(){throw Error();},setItem(){throw Error();}};saveFortunePreferences('pref-C',{tab:'animal',animal:'말띠',star:'물병자리'},broken);assert.equal(readFortunePreferences('pref-C',broken).animal,'말띠');
});
test('sign tab shows only three cards, selected sign and separate reveal storage',()=>{
 saveFortunePreferences('sign-render',{tab:'animal',animal:'용띠',star:'사자자리'});
 const html=renderFortuneCard({needsProfile:true},{authenticated:true,user:{id:'sign-render'}});
 assert.equal((html.match(/data-fortune-reveal=/g)||[]).length,3);assert.match(html,/data-fortune-tab="animal" aria-pressed="true"/);assert.match(html,/value="용띠" selected/);assert.match(html,/:animal:용띠/);assert.doesNotMatch(html,/data-fortune-profile-form/);
});
