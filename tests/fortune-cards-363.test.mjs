import test from 'node:test';
import assert from 'node:assert/strict';
import {fortuneStateKey,readFortuneState,revealFortune,saveFortuneState} from '../src/core/fortune-card-state.js?v=0.0.31.363';
import {renderFortuneCard} from '../src/layout/home-layout.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
const fortune={ok:true,date:'2026-10-01',overall:{score:82,title:'좋은 흐름',summary:'오늘의 한마디 내용'},money:{score:76,title:'차분한 선택',summary:'금전 요약',detail:'금전 상세 풀이'},business:{score:84,title:'좋은 연결',summary:'사업 요약'},relationship:{score:79,title:'따뜻한 하루',summary:'관계 요약'}};
test('independent reveals preserve opened cards and switch active reading',()=>{
 let s=readFortuneState('test-independent',fortune.date,storage());
 s=revealFortune(s,'money');s=revealFortune(s,'relationship');s=revealFortune(s,'money');
 assert.deepEqual(s.opened,['money','relationship']);assert.equal(s.selected,'money');
 assert.equal(revealFortune(s,'invalid'),s);
});
test('saved state survives reload, resets on new server KST date, and isolates accounts',()=>{
 const store=storage(),key=fortuneStateKey('test-user-A');
 saveFortuneState(key,revealFortune(readFortuneState(key,fortune.date,store),'business'),store);
 assert.deepEqual(readFortuneState(key,fortune.date,store).opened,['business']);
 assert.deepEqual(readFortuneState(key,'2026-10-02',store).opened,[]);
 assert.deepEqual(readFortuneState(fortuneStateKey('test-user-B'),fortune.date,store).opened,[]);
});
test('blocked or corrupt browser storage does not break fortune',()=>{
 const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 const key='test-storage-fallback';saveFortuneState(key,revealFortune(readFortuneState(key,fortune.date,broken),'money'),broken);
 assert.deepEqual(readFortuneState(key,fortune.date,broken).opened,['money']);
 assert.deepEqual(readFortuneState('corrupt',fortune.date,{getItem:()=>'{no'}).opened,[]);
});
test('render starts with three accessible closed cards and concealed readings',()=>{
 const html=renderFortuneCard(fortune,{authenticated:true,user:{id:'fresh-render'}});
 assert.equal((html.match(/data-fortune-reveal=/g)||[]).length,3);
 assert.equal((html.match(/aria-expanded="false"/g)||[]).length,3);
 assert.equal((html.match(/data-fortune-reading="[^"]+" hidden/g)||[]).length,3);
 assert.match(html,/今日|오늘의 한마디/);assert.match(html,/금전 상세 풀이/);assert.doesNotMatch(html,/fortune-guidance-item/);
});
test('saved cards render open without requiring DOM initialization',()=>{
 const key=fortuneStateKey('restored-render');saveFortuneState(key,{date:fortune.date,opened:['money'],selected:'money'},storage());
 const html=renderFortuneCard(fortune,{authenticated:true,user:{id:'restored-render'}});
 assert.match(html,/is-revealed is-selected/);assert.match(html,/data-fortune-reading="money">/);
 assert.match(html,/data-fortune-placeholder hidden/);
});
test('login and profile setup remain available',()=>{
 assert.match(renderFortuneCard({},{}),/로그인하고 보기/);
 assert.match(renderFortuneCard({needsProfile:true},{authenticated:true}),/data-fortune-profile-form/);
});
import {bindFortuneInteractions} from '../src/ui/fortune-interactions.js';
test('click handler reveals cards, changes reading, and retains prior reveals',()=>{
 const buttons=['money','business','relationship'].map(id=>{
  const classes=new Set(),attrs={},faces={'.fortune-card-back':{},'.fortune-card-front':{}};
  return {dataset:{fortuneReveal:id,fortuneLabel:id,fortuneScore:'80'},attrs,classes,faces,
   classList:{toggle(name,on){on?classes.add(name):classes.delete(name)}},
   setAttribute(k,v){attrs[k]=v},querySelector(s){return {setAttribute(k,v){faces[s][k]=v}}}};
 });
 const panels=buttons.map(b=>({dataset:{fortuneReading:b.dataset.fortuneReveal},hidden:true})),placeholder={hidden:false};
 const section={dataset:{fortuneStateKey:'interaction-test',fortuneDate:fortune.date},querySelectorAll:s=>s==='[data-fortune-reveal]'?buttons:panels,querySelector:()=>placeholder};
 const handlers={},root={addEventListener(k,fn){handlers[k]=fn}};bindFortuneInteractions(root,{});
 for(const index of [0,2,0]){buttons[index].closest=()=>section;handlers.click({target:{closest:s=>s==='[data-fortune-reveal]'?buttons[index]:null}})}
 assert.equal(buttons[0].attrs['aria-expanded'],'true');assert.equal(buttons[2].attrs['aria-expanded'],'false');
 assert.equal(buttons[2].classes.has('is-revealed'),true);assert.equal(buttons[1].classes.has('is-revealed'),false);
 assert.deepEqual(panels.map(p=>p.hidden),[false,true,true]);assert.equal(placeholder.hidden,true);
 assert.equal(buttons[0].faces['.fortune-card-back']['aria-hidden'],'true');
});
