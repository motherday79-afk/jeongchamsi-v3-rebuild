import test from 'node:test';
import assert from 'node:assert/strict';
import * as regions from '../src/data/korean-regions.js';
import {addressFields,renderJoin} from '../src/views/registration.js';
import {updateProfile,USERS_CAS_LUA} from '../lib/rebuild-store.js';
import {TARGET_KEYS} from '../lib/migration-service.js';

test('city districts are single choices, with no incomplete parent city',()=>{
  const choices=regions.regionLocalityOptions('경기도');
  for(const label of ['용인시 처인구','용인시 기흥구','용인시 수지구','수원시 영통구','성남시 분당구','부천시 원미구'])assert.ok(choices.includes(label));
  assert.ok(!choices.includes('용인시'));
  assert.ok(choices.includes('과천시'));
});
test('every combined choice round-trips to the existing server region format',()=>{
  for(const province of regions.regionProvinceOptions()){
    const choices=regions.regionLocalityOptions(province);
    assert.equal(new Set(choices).size,choices.length);
    for(const label of choices){
      const result=regions.resolveRegionLocality(province,label);
      assert.ok(regions.validRegion(province,result.regionCity,result.regionDistrict),`${province} ${label}`);
      assert.equal([result.regionCity,result.regionDistrict].filter(Boolean).join(' '),label);
    }
  }
});
test('changing province cannot retain a district from another province',()=>{
  assert.equal(regions.resolveRegionLocality('서울특별시','용인시 처인구'),null);
  assert.equal(regions.resolveRegionLocality('경기도','용인시'),null);
  assert.equal(regions.resolveRegionLocality('',''),null);
  assert.deepEqual(regions.resolveRegionLocality('서울특별시','중구'),{regionCity:'중구',regionDistrict:''});
});

test('existing addresses select the combined option, including identical district names',()=>{
  const html=addressFields({regionProvince:'경상북도',regionCity:'포항시',regionDistrict:'남구'});
  assert.match(html,/<option value="포항시 남구" selected>/);
  assert.equal((html.match(/<select /g)||[]).length,2);
  assert.doesNotMatch(html,/data-region-district/);
  assert.match(addressFields(),/data-region-locality required disabled/);
});

test('combined address updates preserve the existing database fields',async()=>{
  const map=new Map([[TARGET_KEYS.users,JSON.stringify({member1:{id:'member1',regionProvince:'서울특별시',regionCity:'중구',regionDistrict:''}})]]);
  const command=async args=>{const [op,key]=args;if(op==='GET')return map.get(key)||null;if(op==='EVAL'&&key===USERS_CAS_LUA){const [, , ,storageKey,expected,value]=args;if((map.get(storageKey)||'')!==expected)return 0;map.set(storageKey,value);return 1;}throw Error(op);};
  const result=await updateProfile(command,'member1',{regionProvince:'경기도',...regions.resolveRegionLocality('경기도','용인시 처인구')});
  assert.equal(result.ok,true);
  assert.equal(result.user.regionCity,'용인시');
  assert.equal(result.user.regionDistrict,'처인구');
  assert.equal(result.user.region,'경기도 용인시 처인구');
});

test('registration keeps required fields and exposes readable browser validation hints',()=>{
  const html=renderJoin();
  for(const name of ['id','password','nickname','name','email','phoneDigits','birthYear','regionProvince','regionLocality'])assert.match(html,new RegExp(`(?:input|select) name="${name}"[^>]*required`));
  assert.match(html,/autocomplete="new-password" minlength="8"/);
  assert.match(html,/aria-live="polite"/);
  assert.doesNotMatch(html,/<input name="referrerCode"[^>]*required/);
});
