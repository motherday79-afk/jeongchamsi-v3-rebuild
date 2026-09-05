import test from 'node:test';
import assert from 'node:assert/strict';
import { setupDiagnosisInteractions } from '../src/ui/interactions.js';

function button(period,pressed=false){
  const listeners={};
  return {dataset:{jcsPeriod:period},attrs:{'aria-pressed':String(pressed)},listeners,
    addEventListener:(type,listener)=>{listeners[type]=listener;},
    setAttribute(name,value){this.attrs[name]=String(value);},
    getAttribute(name){return this.attrs[name];}};
}

test('diagnosis period control changes the visible values instead of only changing button styling',()=>{
  const buttons=[button('24H'),button('7D'),button('30D',true)];
  const values=['24H','7D','30D'].flatMap(period=>Array.from({length:4},()=>({dataset:{jcsPeriodValue:period},hidden:period!=='30D'})));
  const label={textContent:'30일 뉴스'};
  const chapter={querySelectorAll:selector=>selector==='[data-jcs-period-value]'?values:[],querySelector:selector=>selector==='[data-jcs-period-label]'?label:null};
  const group={dataset:{},querySelectorAll:()=>buttons,closest:()=>chapter};
  setupDiagnosisInteractions({querySelectorAll:selector=>selector==='.jcs-periods'?[group]:[]});
  buttons[0].listeners.click();
  assert.deepEqual(buttons.map(item=>item.attrs['aria-pressed']),['true','false','false']);
  assert.equal(values.filter(item=>!item.hidden).length,4);
  assert.equal(values.filter(item=>!item.hidden).every(item=>item.dataset.jcsPeriodValue==='24H'),true);
  assert.equal(label.textContent,'24시간 뉴스');
});

test('diagnosis media disclosure actually hides and restores the full outlet list',()=>{
  const listeners={},list={hidden:false},section={querySelector:selector=>selector==='.jcs-media-list'?list:null};
  const toggle={dataset:{},attrs:{'aria-expanded':'true'},innerHTML:'전체 목록 접기 <span>−</span>',
    addEventListener:(type,listener)=>{listeners[type]=listener;},
    getAttribute(name){return this.attrs[name];},setAttribute(name,value){this.attrs[name]=String(value);},closest:()=>section};
  setupDiagnosisInteractions({querySelectorAll:selector=>selector==='.jcs-media-toggle'?[toggle]:[]});
  listeners.click();
  assert.equal(list.hidden,true);
  assert.equal(toggle.attrs['aria-expanded'],'false');
  assert.match(toggle.innerHTML,/전체 목록 보기/);
  listeners.click();
  assert.equal(list.hidden,false);
  assert.equal(toggle.attrs['aria-expanded'],'true');
});
