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

test('delegated diagnosis controls keep working for markup rendered after setup',()=>{
  const listeners={};
  const root={
    dataset:{},
    querySelectorAll:()=>[],
    addEventListener:(type,listener)=>{listeners[type]=listener;}
  };
  setupDiagnosisInteractions(root);
  assert.equal(typeof listeners.click,'function');

  const buttons=['24H','7D','30D'].map(period=>({
    dataset:{jcsPeriod:period},attrs:{'aria-pressed':String(period==='30D')},
    setAttribute(name,value){this.attrs[name]=String(value);}
  }));
  const panels=['24H','7D','30D'].map(period=>({dataset:{jcsPeriodPanel:period},hidden:period!=='30D'}));
  const chapter={
    querySelectorAll(selector){
      if(selector==='[data-jcs-period-panel]')return panels;
      if(selector==='[data-jcs-period-value]')return [];
      return [];
    },
    querySelector:()=>null
  };
  const group={querySelectorAll:selector=>selector==='[data-jcs-period]'?buttons:[],closest:selector=>selector==='.jcs-chapter'?chapter:null};
  const target={dataset:buttons[0].dataset,closest(selector){if(selector==='[data-jcs-period]')return buttons[0];if(selector==='.jcs-periods')return group;return null;}};
  listeners.click({target});
  assert.deepEqual(buttons.map(item=>item.attrs['aria-pressed']),['true','false','false']);
  assert.deepEqual(panels.map(item=>item.hidden),[false,true,true]);
});

test('delegated media disclosure controls the list in the active period panel',()=>{
  const listeners={};
  const root={dataset:{},querySelectorAll:()=>[],addEventListener:(type,listener)=>{listeners[type]=listener;}};
  setupDiagnosisInteractions(root);
  const list={hidden:false},attrs={'aria-expanded':'true'};
  const panel={querySelector:selector=>selector==='.jcs-media-list'?list:null};
  const toggle={
    innerHTML:'전체 목록 접기 <span>−</span>',
    getAttribute:name=>attrs[name],setAttribute:(name,value)=>{attrs[name]=String(value);},
    closest:selector=>selector==='.jcs-media-period-panel'?panel:null
  };
  const target={closest:selector=>selector==='.jcs-media-toggle'?toggle:null};
  listeners.click({target});
  assert.equal(list.hidden,true);
  assert.equal(attrs['aria-expanded'],'false');
  assert.match(toggle.innerHTML,/전체 목록 보기/);
});

test('delegated period control updates only its nearest comparison cell scope',()=>{
  const listeners={};
  const root={dataset:{},querySelectorAll:()=>[],addEventListener:(type,listener)=>{listeners[type]=listener;}};
  setupDiagnosisInteractions(root);
  const buttons=['24H','7D','30D'].map(period=>({dataset:{jcsPeriod:period},attrs:{'aria-pressed':String(period==='30D')},setAttribute(name,value){this.attrs[name]=String(value);}}));
  const localPanels=['24H','7D','30D'].map(period=>({dataset:{jcsPeriodPanel:period},hidden:period!=='30D'}));
  const otherPanels=['24H','7D','30D'].map(period=>({dataset:{jcsPeriodPanel:period},hidden:period!=='30D'}));
  const scope={querySelectorAll:selector=>selector==='[data-jcs-period-panel]'?localPanels:[],querySelector:()=>null};
  const group={querySelectorAll:selector=>selector==='[data-jcs-period]'?buttons:[],closest:selector=>selector==='[data-jcs-period-scope]'?scope:null};
  const target={closest(selector){if(selector==='[data-jcs-period]')return buttons[0];if(selector==='.jcs-periods')return group;return null;}};
  root.querySelectorAll=selector=>selector==='[data-jcs-period-panel]'?[...localPanels,...otherPanels]:[];
  listeners.click({target});
  assert.deepEqual(localPanels.map(item=>item.hidden),[false,true,true]);
  assert.deepEqual(otherPanels.map(item=>item.hidden),[true,true,false]);
});
