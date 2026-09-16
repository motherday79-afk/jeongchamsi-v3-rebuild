import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPoliticianCompare} from '../src/views/politician-compare.js';
const session={authenticated:true,user:{id:'member',role:'member'}};
const report=(id,{paid=false,expiresAt=2000,serverNow=1000}={})=>({ok:true,item:{id,name:id,type:'assembly'},accessTier:paid?'admin':'member',analysisAccess:paid?{personId:id,active:true,grantedAt:expiresAt-86400000,expiresAt,serverNow}:null,intelligence:{accessTier:paid?'admin':'member',diagnoses:[{id:'01',title:'브랜드',headline:'ANALYSIS-'+id,display:{kind:'brand',indicators:[]}},{id:'10',title:'종합',headline:'DEEP-'+id,display:{kind:'summary'}}],prescriptions:[]}});
const service=items=>({get:async id=>items[id],getForCompare:async id=>items[id],search:async()=>({ok:true,items:[]})});
test('ordinary members can search and add their first and second comparison candidates',async()=>{
 for(const route of ['/compare','/compare?ids=a']){
  const html=await renderPoliticianCompare(service({a:report('a')}),route,session);
  assert.ok(html.includes('data-compare-search-form'),'ordinary member must retain candidate search');
 }
});
test('an entitlement that expires while another comparison response loads cannot render old full data',async()=>{
 const initial=Date.now;let localNow=10000;Date.now=()=>localNow;
 try{
  const data={a:report('a',{paid:true,serverNow:1000,expiresAt:1500}),b:report('b',{paid:true,serverNow:1600,expiresAt:10000})};
  const html=await renderPoliticianCompare({getForCompare:async id=>{if(id==='b'){await Promise.resolve();localNow=10600;}return data[id];},search:async()=>({ok:true,items:[]})},'/compare?ids=a,b&run=1',session);
  assert.ok(html.includes('data-compare-access-gate'),'expired selected grant must block full comparison');assert.ok(!html.includes('data-comparison-topic="10"'));assert.ok(!html.includes('DEEP-a'));
 }finally{Date.now=initial;}
});
test('expired full-tier response cannot fall through to ordinary comparison and leak extra topics',async()=>{
 const a=report('a',{paid:true,serverNow:2000,expiresAt:2000});a.analysisAccess.active=false;
 const b=report('b',{paid:true,serverNow:2000,expiresAt:2000});b.analysisAccess.active=false;
 const html=await renderPoliticianCompare(service({a,b}),'/compare?ids=a,b&run=1',session);
 assert.ok(html.includes('data-compare-access-gate'));assert.ok(!html.includes('DEEP-a'));
});
test('a report whose person identity mismatches the requested selection cannot participate',async()=>{
 const html=await renderPoliticianCompare(service({a:report('other',{paid:true}),b:report('b',{paid:true})}),'/compare?ids=a,b&run=1',session);
 assert.ok(html.includes('data-compare-access-gate'));assert.ok(!html.includes('ANALYSIS-other'));
});
test('response transport time is included when judging near-expiry comparison access',async()=>{
 const original=Date.now;let localNow=10000;Date.now=()=>localNow;
 try{
  const html=await renderPoliticianCompare({getForCompare:async id=>{await Promise.resolve();localNow=10600;return report(id,{paid:true,serverNow:1000,expiresAt:1500});},search:async()=>({ok:true,items:[]})},'/compare?ids=a,b&run=1',session);
  assert.ok(html.includes('data-compare-access-gate'));assert.ok(!html.includes('data-comparison-topic="10"'));
 }finally{Date.now=original;}
});
