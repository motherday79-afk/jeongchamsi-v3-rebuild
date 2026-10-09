import test from 'node:test';
import assert from 'node:assert/strict';
import {taxiRideCounts,readTaxiStats} from '../lib/taxi-statistics.js';

test('only completed policy rides contribute and reaction fields are disjoint',()=>{
 const ride={status:'completed',heardCount:3,beatIndex:2,distanceMs:12500,activeMs:99999,finishReason:'dropoff',likedBeatIndexes:[0,2]};
 assert.equal(taxiRideCounts({...ride,status:'active'},'p'),null);
 assert.equal(taxiRideCounts({...ride,heardCount:0},'p'),null);
 const {counts}=taxiRideCounts(ride,'p');
 assert.equal(counts.distanceMeters,100);assert.equal(counts.completed,0);assert.equal(counts.likedRides,1);
 assert.equal(counts['beat:0:continued'],1);assert.equal(counts['beat:1:continued'],1);
 assert.equal(counts['beat:2:continued'],undefined);assert.equal(counts['beat:2:dropoffs'],1);
 assert.equal(counts['beat:3:heard'],undefined);
 assert.equal(taxiRideCounts({...ride,finishReason:'completed'},'p').counts.completed,1);
});

test('unregistered passengers do not read storage or fabricate zero records',async()=>{
 assert.deepEqual(await readTaxiStats(()=>{throw Error('unexpected storage');},null),{ok:true,registered:false});
});

test('public statistics omit personal totals, private lookup uses hashed key',async()=>{
 const commands=[],person={personId:'government-001',beats:[{context:'첫 이야기'}]};
 const command=async args=>{commands.push(args);return args.slice(2).map(()=>null);};
 const publicStats=await readTaxiStats(command,person);
 assert.equal(publicStats.my,null);assert.equal(commands.length,1);assert.equal(publicStats.totals.rides,0);
 const mine=await readTaxiStats(command,person,{key:'private-identity'});
 assert.deepEqual(mine.my,{rides:0,distanceMeters:0});assert.equal(JSON.stringify(commands).includes('private-identity'),false);
});
