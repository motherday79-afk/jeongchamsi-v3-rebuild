import test from 'node:test';import assert from 'node:assert/strict';
import {createContentService} from '../src/core/content.js';
test('visits count re-entry and refresh but not internal renders or background reads',async()=>{
 const old=globalThis.fetch,calls=[];globalThis.fetch=async(url,options)=>{if(options.method==='POST')calls.push(JSON.parse(options.body).payload);return {status:200,json:async()=>({ok:true,data:{items:[{id:'a'},{id:'b'}]}})};};
 try{
 const c=createContentService();await c.get('community','a');assert.equal(calls.length,0);
 c.beginVisit('/community/a');await Promise.all([c.get('community','a'),c.get('community','a')]);assert.equal(calls.length,1);
 c.beginVisit('/community/a?camp=progressive');await c.get('community','a');assert.equal(calls.length,1);
 c.beginVisit('/community/b');await c.get('community','b');c.beginVisit('/community/a');await c.get('community','a');assert.equal(calls.length,3);
 const fresh=createContentService();fresh.beginVisit('/community/a');await fresh.get('community','a');assert.equal(calls.length,4);
 assert.equal(new Set(calls.map(p=>p.visitId)).size,4);
 c.beginVisit('/community');c.beginVisit('/community/a');await c.get('community','a');assert.equal(calls.length,5);
 for(const [domain,section] of [['columns','column'],['news','news'],['itsme','itsme']]){c.beginVisit(`/${section}/a`);await c.get(domain,'a');await c.get(domain,'a');assert.equal(calls.at(-1).domain,domain);}
 assert.equal(calls.length,8);
 }finally{globalThis.fetch=old;}
});
