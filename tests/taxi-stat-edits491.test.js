import test from 'node:test';
import assert from 'node:assert/strict';
import {correctedTaxiValues,saveTaxiNumbers} from '../lib/taxi-stat-edits.js';
import {canEditTaxiPage} from '../src/core/taxi-edit-permissions.js';
import {canEditPersonPage} from '../src/core/person-edit-permissions.js';
import {readTaxiStats,taxiStatsKey} from '../lib/taxi-statistics.js';
test('taxi and politician permissions never confer each other',()=>{
 const user={id:'member',role:'member',status:'active',taxiPageEditing:{scope:'selected',personIds:['assembly-001']}};
 assert.equal(canEditTaxiPage(user,'assembly-001'),true);assert.equal(canEditPersonPage(user,'assembly-001'),false);
 assert.equal(canEditTaxiPage({...user,taxiPageEditing:null,personPageEditing:{scope:'all'}},'assembly-001'),false);
});
test('corrections preserve later accumulation and do not affect private ride counts',async()=>{
 let rides=3;const person={personId:'assembly-001',beats:[]},command=async args=>args[0]==='GET'?JSON.stringify({offsets:{rides:7,distanceMeters:1000}}):args[1]===taxiStatsKey(person.personId)?args.slice(2).map(f=>f==='rides'?rides:f==='distanceMeters'?200:null):[3,200];
 let data=await readTaxiStats(command,person,{key:'private'});assert.equal(data.totals.rides,10);assert.equal(data.totals.distanceMeters,1200);assert.equal(data.my.rides,3);assert.equal(data.adjusted,true);
 rides++;data=await readTaxiStats(command,person,{key:'private'});assert.equal(data.totals.rides,11);
 assert.deepEqual(correctedTaxiValues({rides:4},{offsets:{}}),{rides:4});
});
test('only bounded nonnegative integer statistics are accepted, never text or private fields',async()=>{
 for(const changes of [{name:'x'},{rides:-1},{rides:1.5},{rides:'12'},{distanceMeters:Infinity},{'my:rides':20},{rides:1e13}])await assert.rejects(saveTaxiNumbers(()=>{throw Error('must not write');},'p',{revision:0,changes},{id:'admin'}),/INVALID/);
 let calls=0;await saveTaxiNumbers(async()=>{calls++;return 'OK';},'p',{revision:0,changes:{rides:10}},{id:'admin'});assert.equal(calls,1);
 await assert.rejects(saveTaxiNumbers(async()=> 'CONFLICT','p',{revision:0,changes:{rides:10}},{id:'admin'}),/EDIT_CONFLICT/);
});
