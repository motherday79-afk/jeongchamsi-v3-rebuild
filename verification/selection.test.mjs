import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as probe from '../jcs-touch-check/selection-core.mjs';

test('selection probe changes only the body selection policy and restores the exact inline settings',()=>{
 const dom=new JSDOM('<!doctype html><html><head><style>body{user-select:none}h2{color:purple}</style></head><body style="padding:8px;user-select:none!important"><main><h2>나는 이렇게 제안합니다</h2><a href="/itsme">게시판</a></main></body></html>');
 try {
  assert.equal(typeof probe.createSelectionProbe,'function');
  const d=dom.window.document, originalHead=d.head.innerHTML, originalMain=d.querySelector('main').outerHTML;
  const change=probe.createSelectionProbe(d);
  let clicks=0;d.querySelector('h2').addEventListener('click',()=>clicks++);
  change.enable();
  assert.equal(d.body.style.getPropertyValue('user-select'),'text');
  assert.equal(d.body.style.getPropertyPriority('user-select'),'important');
  assert.equal(d.body.style.padding,'8px');
  assert.equal(d.head.innerHTML,originalHead);
  assert.equal(d.querySelector('main').outerHTML,originalMain);
  const e=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});d.querySelector('h2').dispatchEvent(e);
  assert.equal(e.defaultPrevented,false);assert.equal(clicks,1);
  // A second enable must not replace the saved original policy.
  change.enable();change.restore();
  assert.equal(d.body.style.getPropertyValue('user-select'),'none');
  assert.equal(d.body.style.getPropertyPriority('user-select'),'important');
  assert.equal(d.body.style.padding,'8px');
 }finally{dom.window.close();}
});

test('removes temporary inline selection when original policy came from a stylesheet',()=>{
 const dom=new JSDOM('<!doctype html><html><head><style>body{user-select:none}</style></head><body></body></html>');
 try {
  assert.equal(typeof probe.createSelectionProbe,'function');
  const p=probe.createSelectionProbe(dom.window.document);p.enable();p.restore();
  assert.equal(dom.window.document.body.style.getPropertyValue('user-select'),'');
  assert.equal(dom.window.getComputedStyle(dom.window.document.body).userSelect,'none');
 }finally{dom.window.close();}
});

test('requires a repeated original condition before attributing the difference to selection policy',()=>{
 assert.equal(typeof probe.nextCondition,'function');
 assert.equal(probe.nextCondition({}),'selection');
 assert.equal(probe.nextCondition({selection:'no'}),'original');
 assert.equal(probe.nextCondition({selection:'yes'}),'done');
 assert.equal(probe.nextCondition({selection:'no',original:'yes'}),'done');
 assert.equal(probe.nextCondition({selection:'no',original:'no'}),'done');
});
