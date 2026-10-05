import test from 'node:test';
import assert from 'node:assert/strict';
import {getDailyFortune} from '../lib/jcs-fortune-engine/engine.js';
import {createFortuneService} from '../lib/fortune-service.js';
const input={userKey:'profile-test',calendarType:'solar',targetDate:'2026-10-05'};
test('profile signs respect lunar new year and solar zodiac boundaries',()=>{
 assert.deepEqual(getDailyFortune({...input,birthDate:'2024-02-09'}).signs,{animal:'토끼띠',star:'물병자리'});
 assert.deepEqual(getDailyFortune({...input,birthDate:'2024-02-10'}).signs,{animal:'용띠',star:'물병자리'});
 assert.equal(getDailyFortune({...input,birthDate:'2000-01-19'}).signs.star,'염소자리');
 assert.equal(getDailyFortune({...input,birthDate:'2000-01-20'}).signs.star,'물병자리');
 assert.deepEqual(getDailyFortune({...input,calendarType:'lunar',birthDate:'2024-01-01'}).signs,{animal:'용띠',star:'물병자리'});
});
test('existing daily cache upgrades once and changing birth profile changes signs',async()=>{
 const db=new Map([['jcs:fortune:profile:u',JSON.stringify({birthDate:'2024-02-10',calendarType:'solar'})],['jcs:fortune:daily:2026-10-05:u',JSON.stringify({needsProfile:false,date:'2026-10-05'})]]);
 const service=createFortuneService({now:()=>new Date('2026-10-05T03:00:00Z'),command:async([cmd,key,value])=>{if(cmd==='GET')return db.get(key);if(cmd==='SET')db.set(key,value);if(cmd==='DEL')db.delete(key);}});
 const result=await service.today({id:'u'});
 assert.equal(result.signs.animal,'용띠');assert.equal(result.signs.star,'물병자리');assert.equal(result.birthDate,undefined);
 assert.deepEqual(await service.today({id:'u'}),result);
 const changed=await service.saveProfile({id:'u'},{birthDate:'2023-10-05',calendarType:'solar'});
 assert.deepEqual(changed.signs,{animal:'토끼띠',star:'천칭자리'});
});
