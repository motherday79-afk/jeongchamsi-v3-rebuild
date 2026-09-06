import test from 'node:test';
import assert from 'node:assert/strict';
import { fontSizeControl } from '../src/layout/site-shell.js';
import { FONT_SCALE_RATIOS, applyFontScale, changeFontScaleLevel, readFontScaleLevel, setupFontScaleControl } from '../src/ui/font-scale.js';

test('every page receives one top-right five-step font size control',()=>{
  const html=fontSizeControl();
  assert.match(html,/data-font-scale-control/);
  assert.match(html,/data-font-scale-decrease[^>]*aria-label="글자 크기 줄이기"/);
  assert.match(html,/data-font-scale-increase[^>]*aria-label="글자 크기 키우기"/);
  assert.match(html,/data-font-scale-level>기본<\/output>/);
  assert.deepEqual(FONT_SCALE_RATIOS,[1,1.06,1.12,1.18,1.24,1.3]);
});

test('font scale increases only through five levels and minus returns toward the default',()=>{
  let level=0;
  for(let index=0;index<8;index++)level=changeFontScaleLevel(level,1);
  assert.equal(level,5);
  level=changeFontScaleLevel(level,-1);
  assert.equal(level,4);
  for(let index=0;index<8;index++)level=changeFontScaleLevel(level,-1);
  assert.equal(level,0);
});

test('font scale safely restores a saved level and rejects malformed storage values',()=>{
  assert.equal(readFontScaleLevel({getItem:()=> '3'}),3);
  assert.equal(readFontScaleLevel({getItem:()=> '99'}),5);
  assert.equal(readFontScaleLevel({getItem:()=> 'broken'}),0);
  assert.equal(readFontScaleLevel({getItem:()=>{throw new Error('blocked');}}),0);
});

test('font scaling changes font and line-height without zooming the page geometry',()=>{
  const style={fontSize:'',lineHeight:'',zoom:''};
  const node={style,dataset:{}};
  const root={querySelectorAll:()=>[node],documentElement:{dataset:{}}};
  applyFontScale(root,2,()=>({fontSize:'16px',lineHeight:'24px'}));
  assert.equal(style.fontSize,'17.92px');
  assert.equal(style.lineHeight,'26.88px');
  assert.equal(style.zoom,'');
  assert.equal(root.documentElement.dataset.jcsFontScale,'2');
});

test('restoring a cached page never compounds an already applied font scale',()=>{
  const computed=node=>({fontSize:node.style.fontSize||'16px',lineHeight:node.style.lineHeight||'24px'});
  const first={style:{fontSize:'',lineHeight:''},dataset:{}};
  applyFontScale({querySelectorAll:()=>[first],documentElement:{dataset:{}}},2,()=>computed(first));
  const restored={style:{...first.style},dataset:{...first.dataset}};
  applyFontScale({querySelectorAll:()=>[restored],documentElement:{dataset:{}}},2,()=>computed(restored));
  assert.equal(restored.style.fontSize,'17.92px');
  assert.equal(restored.style.lineHeight,'26.88px');
});

test('plus and minus persist the selected level and update their boundary states',()=>{
  const makeButton=()=>({disabled:false,listeners:{},addEventListener(type,listener){this.listeners[type]=listener;}}),minus=makeButton(),plus=makeButton(),output={textContent:''},control={dataset:{},querySelector(selector){if(selector==='[data-font-scale-decrease]')return minus;if(selector==='[data-font-scale-increase]')return plus;if(selector==='[data-font-scale-level]')return output;return null;}},node={style:{fontSize:'',lineHeight:''},dataset:{}},saved=[];
  const root={documentElement:{dataset:{}},querySelector:selector=>selector==='[data-font-scale-control]'?control:null,querySelectorAll:()=>[node]},storage={getItem:()=>null,setItem:(_key,value)=>saved.push(value)};
  assert.equal(setupFontScaleControl(root,storage,()=>({fontSize:'16px',lineHeight:'24px'})),true);
  for(let index=0;index<6;index++)plus.listeners.click();
  assert.equal(output.textContent,'5단계');
  assert.equal(plus.disabled,true);
  assert.equal(saved.at(-1),'5');
  minus.listeners.click();
  assert.equal(output.textContent,'4단계');
  assert.equal(minus.disabled,false);
});
