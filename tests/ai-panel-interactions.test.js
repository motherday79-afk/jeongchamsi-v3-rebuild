import test from 'node:test';
import assert from 'node:assert/strict';
import {aiPanelPayload} from '../src/ui/ai-panel-interactions.js';
const data=values=>{const p=new URLSearchParams();for(const [k,v] of Object.entries(values))for(const x of Array.isArray(v)?v:[v])p.append(k,x);return p;};
test('form conversion retains unknown values and explicit comparison confirmation',()=>{
 const p=aiPanelPayload('human',data({positive:'37.5',negative:'',undecided:'',n:'',marginOfError:'',subgroupsJson:'{}',comparable:'on'}));
 assert.deepEqual(p.poll.results.overall,{positive:37.5,negative:null,undecided:null,n:null});assert.equal(p.poll.comparable,true);
 assert.throws(()=>aiPanelPayload('human',data({subgroupsJson:'[]'})));
 assert.equal(p.poll.marginOfError,null);
 assert.equal(aiPanelPayload('human',data({marginOfError:'3.1'})).poll.marginOfError,3.1);
});
test('profiles and responses must be arrays; run modes retained; response timestamp normalized',()=>{
 assert.throws(()=>aiPanelPayload('panel-create',data({profilesJson:'{}'})));
 assert.deepEqual(aiPanelPayload('create',data({modes:['EXPOSED','BLIND']})).modes,['EXPOSED','BLIND']);
 assert.match(aiPanelPayload('responses',data({executedAt:'2026-09-19T12:00',responsesJson:'[]'})).executedAt,/Z$/);
});
