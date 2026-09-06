import test from 'node:test';
import assert from 'node:assert/strict';

import { createYouTubeChannelService } from '../lib/youtube-channel-service.js';

function fakeRedis(){
  const map=new Map();
  return {map,command:async args=>{const op=String(args[0]).toUpperCase(),key=String(args[1]);if(op==='GET')return map.get(key)??null;if(op==='SET'){map.set(key,args[2]);return 'OK';}throw new Error(`UNSUPPORTED:${op}`);}};
}
const profiles=count=>Array.from({length:count},(_,index)=>({id:`p${index+1}`,name:`정치인${index+1}`,party:'정당',office:'국회의원',jurisdiction:`지역${index+1}`}));

test('automatic discovery registers five politicians per resumable step',async()=>{
  const redis=fakeRedis(),searched=[];
  const service=createYouTubeChannelService({command:redis.command,profiles:profiles(7),env:{YOUTUBE_DATA_API_KEY:'secret'},now:()=>Date.parse('2026-09-06T12:00:00Z'),searchChannel:async person=>{searched.push(person.id);return {channelId:`UC_${person.id}`,channelTitle:`${person.name} 채널`,channelUrl:`https://www.youtube.com/channel/UC_${person.id}`,sourceMode:'AUTO',matchScore:90};}});
  const started=await service.startDiscovery();
  assert.equal(started.job.total,7);
  const first=await service.runDiscoveryStep();
  assert.equal(first.batch.size,5);
  assert.equal(first.job.completed,5);
  assert.equal(first.job.status,'RUNNING');
  const second=await service.runDiscoveryStep();
  assert.equal(second.batch.size,2);
  assert.equal(second.job.status,'COMPLETED');
  assert.deepEqual(searched,['p1','p2','p3','p4','p5','p6','p7']);
  const status=await service.status();
  assert.equal(status.registered,7);
  assert.equal(status.channels[0].sourceMode,'AUTO');
  assert.doesNotMatch(JSON.stringify(status),/secret/);
});

test('manual mappings are excluded from automatic discovery and remain locked',async()=>{
  const redis=fakeRedis(),searched=[];
  const service=createYouTubeChannelService({command:redis.command,profiles:profiles(2),env:{YOUTUBE_DATA_API_KEY:'secret'},now:()=>Date.parse('2026-09-06T12:00:00Z'),resolveReference:async()=>({channelId:'UC_MANUAL',channelTitle:'직접 채널',channelUrl:'https://www.youtube.com/channel/UC_MANUAL',sourceMode:'MANUAL'}),searchChannel:async person=>{searched.push(person.id);return {channelId:`UC_AUTO_${person.id}`,channelTitle:'자동 채널',channelUrl:`https://www.youtube.com/channel/UC_AUTO_${person.id}`,sourceMode:'AUTO'};}});
  await service.saveMapping({personId:'p1',reference:'https://youtube.com/@manual'});
  await service.startDiscovery();
  await service.runDiscoveryStep();
  assert.deepEqual(searched,['p2']);
  assert.equal((await service.status()).channels.find(row=>row.personId==='p1').channelId,'UC_MANUAL');
});

test('explicit rediscovery can replace a manual mapping with a fresh AUTO result',async()=>{
  const redis=fakeRedis();
  const service=createYouTubeChannelService({command:redis.command,profiles:profiles(1),env:{YOUTUBE_DATA_API_KEY:'secret'},now:()=>Date.parse('2026-09-06T12:00:00Z'),resolveReference:async()=>({channelId:'UC_MANUAL',channelTitle:'직접 채널',channelUrl:'https://www.youtube.com/channel/UC_MANUAL',sourceMode:'MANUAL'}),searchChannel:async()=>({channelId:'UC_REFOUND',channelTitle:'재검색 채널',channelUrl:'https://www.youtube.com/channel/UC_REFOUND',sourceMode:'AUTO',matchScore:88})});
  await service.saveMapping({personId:'p1',reference:'@manual'});
  const result=await service.rediscover('p1');
  assert.equal(result.mapping.channelId,'UC_REFOUND');
  assert.equal(result.mapping.sourceMode,'AUTO');
});

test('deleting a mapping makes the politician eligible for automatic registration again',async()=>{
  const redis=fakeRedis();
  const service=createYouTubeChannelService({command:redis.command,profiles:profiles(1),env:{YOUTUBE_DATA_API_KEY:'secret'},now:()=>Date.parse('2026-09-06T12:00:00Z'),resolveReference:async()=>({channelId:'UC_MANUAL',channelTitle:'직접 채널',channelUrl:'https://www.youtube.com/channel/UC_MANUAL',sourceMode:'MANUAL'}),searchChannel:async()=>({channelId:'UC_AUTO',channelTitle:'자동 채널',channelUrl:'https://www.youtube.com/channel/UC_AUTO',sourceMode:'AUTO'})});
  await service.saveMapping({personId:'p1',reference:'UC_MANUAL'});
  await service.deleteMapping('p1');
  await service.startDiscovery();
  const result=await service.runDiscoveryStep();
  assert.equal(result.job.registered,1);
  assert.equal((await service.registryForCollection()).p1.channelId,'UC_AUTO');
});

test('discovery pauses at 100 searches and resumes on the next Pacific quota day',async()=>{
  const redis=fakeRedis();let stamp=Date.parse('2026-09-06T12:00:00Z');
  const service=createYouTubeChannelService({command:redis.command,profiles:profiles(101),env:{YOUTUBE_DATA_API_KEY:'secret'},now:()=>stamp,searchChannel:async person=>({channelId:`UC_${person.id}`,channelTitle:person.name,channelUrl:`https://www.youtube.com/channel/UC_${person.id}`,sourceMode:'AUTO'})});
  await service.startDiscovery();
  let result;
  for(let index=0;index<20;index+=1)result=await service.runDiscoveryStep();
  assert.equal(result.job.completed,100);
  assert.equal(result.job.status,'PAUSED_QUOTA');
  assert.equal(result.job.quotaUsed,100);
  stamp=Date.parse('2026-09-07T12:00:00Z');
  result=await service.runDiscoveryStep();
  assert.equal(result.batch.size,1);
  assert.equal(result.job.status,'COMPLETED');
  assert.equal(result.job.quotaUsed,1);
});
