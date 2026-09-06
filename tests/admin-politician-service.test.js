import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGET_KEYS } from '../lib/migration-service.js';
import { createAdminPoliticianService } from '../lib/admin-politician-service.js';

function memoryCommand(seed={}){
  const map=new Map(Object.entries(seed));
  return {map,command:async args=>{const op=String(args[0]).toUpperCase();if(op==='GET')return map.get(args[1])??null;if(op==='SET'){map.set(args[1],args[2]);return 'OK';}throw new Error(`UNSUPPORTED_${op}`);}};
}

const profiles=[{id:'assembly-001',name:'고민정',party:'더불어민주당',type:'assembly'},{id:'assembly-002',name:'사진없음',party:'국민의힘',type:'assembly'}];

test('structured risks and news exclusions persist independently from collection drafts',async()=>{
  const redis=memoryCommand();
  const service=createAdminPoliticianService({command:redis.command,profiles});
  const risks=[{tag:'#과거발언',title:'관련 기사',url:'https://news.example/risk',date:'2024-01-02'}];
  assert.equal((await service.savePastRisks('assembly-001',risks,'admin')).record.pastRisks.length,1);
  assert.equal((await service.saveNewsExclusions('assembly-001',['source:오탐 기사'],'admin')).record.newsExclusions.length,1);
  const recreated=createAdminPoliticianService({command:redis.command,profiles});
  assert.deepEqual((await recreated.get('assembly-001')).record.pastRisks,risks);
  assert.deepEqual((await recreated.editorialInputs('assembly-001')).newsExclusions,['source:오탐 기사']);
  const applied=await recreated.applyToDraft('assembly-001',{diagnoses:[{id:'01',display:{pastRisks:[]}}]});
  assert.deepEqual(applied.diagnoses[0].display.pastRisks,risks);
  assert.equal((await recreated.audit()).entries.length,2);
});

test('risk records enforce five items and HTTPS evidence links',async()=>{
  const service=createAdminPoliticianService({command:memoryCommand().command,profiles});
  await assert.rejects(()=>service.savePastRisks('assembly-001',[{tag:'#오류',title:'기사',url:'http://unsafe.example',date:'2024-01-01'}],'admin'),/PAST_RISK_HTTPS_REQUIRED/);
  await assert.rejects(()=>service.savePastRisks('assembly-001',Array.from({length:6},(_,i)=>({tag:`#위험${i}`,title:'기사',url:'https://safe.example',date:'2024-01-01'})),'admin'),/PAST_RISK_LIMIT/);
});

test('completeness reports photo, risks, and YouTube state for every profile',async()=>{
  const redis=memoryCommand({
    [TARGET_KEYS.politicianPhotos]:JSON.stringify({items:{'assembly-001':{url:'https://blob.example/photo.webp'}}}),
    [TARGET_KEYS.content('youtubeChannels')]:JSON.stringify({channels:{'assembly-001':{personId:'assembly-001',channelId:'UC123'}}})
  });
  const service=createAdminPoliticianService({command:redis.command,profiles});
  await service.savePastRisks('assembly-001',[{tag:'#검증',title:'기사',url:'https://news.example',date:'2024-01-01'}],'admin');
  const report=await service.completeness();
  const flags=({photo,pastRisks,youtube})=>({photo,pastRisks,youtube});
  assert.deepEqual(flags(report.items.find(row=>row.id==='assembly-001')),{photo:true,pastRisks:true,youtube:true});
  assert.deepEqual(flags(report.items.find(row=>row.id==='assembly-002')),{photo:false,pastRisks:false,youtube:false});
  const listed=await service.list('고민정');
  assert.equal(listed.items[0].photo.url,'https://blob.example/photo.webp');
  assert.equal(listed.items[0].youtube.channelId,'UC123');
});
