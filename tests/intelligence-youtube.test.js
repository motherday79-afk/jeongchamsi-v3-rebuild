import test from 'node:test';
import assert from 'node:assert/strict';

import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { compactIntelligenceDraft } from '../lib/intelligence-storage.js';
import { projectIntelligence } from '../lib/intelligence-access.js';

const person={id:'assembly-001',type:'assembly',name:'김민석',party:'더불어민주당',region:'서울',jurisdiction:'서울 영등포구을',terms:'4선',roleLabel:'국회의원',office:'국회의원'};
const videos=Array.from({length:12},(_,index)=>({id:`video-${index+1}`,title:`정책 영상 ${index+1}`,url:`https://youtube.test/watch/${index+1}`,publishedAt:`2026-09-${String(6-Math.min(index,5)).padStart(2,'0')}T00:00:00.000Z`,viewCount:1200-index*10}));
const youtube={provider:'YOUTUBE_DATA_API',collectedAt:'2026-09-06T12:00:00.000Z',channel:{id:'UC_OFFICIAL',title:'김민석 공식채널',url:'https://www.youtube.com/channel/UC_OFFICIAL'},videos,uploads:{h24:1,d7:6,d30:12,daily:Array.from({length:30},(_,index)=>({date:`2026-08-${String(index+1).padStart(2,'0')}`,count:index%4===0?1:0})),scanned:12,truncated:false}};

test('compact intelligence storage keeps only ten YouTube videos and thirty daily points',()=>{
  const compact=compactIntelligenceDraft({id:person.id,snapshot:'s1',algorithmVersion:'JCS_INTELLIGENCE_V3',raw:{collectedAt:'2026-09-06T12:00:00.000Z',officialProfile:person,news:{items:[]},youtube}});
  assert.equal(compact.input.youtube.videos.length,10);
  assert.equal(compact.input.youtube.uploads.daily.length,30);
  assert.equal(compact.input.youtube.channel.id,'UC_OFFICIAL');
});

test('diagnosis 07 carries YouTube channel, views and upload flow through access tiers',()=>{
  const report=buildIntelligenceDraft(person,{personId:person.id,snapshotId:'s1',collectedAt:'2026-09-06T12:00:00.000Z',officialProfile:person,searchAds:{volume:{pc:100,mobile:200}},news:{items:[]},youtube,sourceErrors:[]},{peers:[person]},'JCS_INTELLIGENCE_V3');
  const publicMedia=projectIntelligence(report,'public').diagnoses.find(row=>row.id==='07').display.youtube;
  const memberMedia=projectIntelligence(report,'member').diagnoses.find(row=>row.id==='07').display.youtube;
  const adminMedia=projectIntelligence(report,'admin').diagnoses.find(row=>row.id==='07').display.youtube;
  assert.equal(publicMedia.videos.length,3);
  assert.equal(memberMedia.videos.length,5);
  assert.equal(adminMedia.videos.length,10);
  assert.equal(publicMedia.videos[0].viewCount,1200);
  assert.deepEqual(memberMedia.uploads,{h24:1,d7:6,d30:12,daily:youtube.uploads.daily,scanned:12,truncated:false});
  assert.equal(adminMedia.channel.url,'https://www.youtube.com/channel/UC_OFFICIAL');
});

test('diagnosis 07 does not invent a YouTube block without collected channel data',()=>{
  const report=buildIntelligenceDraft(person,{personId:person.id,snapshotId:'s1',collectedAt:'2026-09-06T12:00:00.000Z',officialProfile:person,searchAds:{volume:{pc:100,mobile:200}},news:{items:[]},sourceErrors:[]},{peers:[person]},'JCS_INTELLIGENCE_V3');
  assert.equal(projectIntelligence(report,'public').diagnoses.find(row=>row.id==='07').display.youtube,undefined);
});
