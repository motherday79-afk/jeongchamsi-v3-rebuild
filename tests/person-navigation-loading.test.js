import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPersonNavigation } from '../src/core/content.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('person request starts while session and favorites are still pending, and is fetched once',async()=>{
  const session=deferred(),favorites=deferred(),detail=deferred(),calls=[];
  const pending=loadPersonNavigation('assembly-001',
    {session:()=>{calls.push('session');return session.promise;}},
    {favoriteKeys:()=>{calls.push('favorites');return favorites.promise;}},
    {get:id=>{calls.push(id);return detail.promise;}});
  assert.ok(calls.includes('assembly-001'));
  assert.ok(calls.includes('session'));
  assert.ok(!calls.includes('favorites'));
  session.resolve({authenticated:true,user:{id:'reader',role:'member'}});
  await Promise.resolve();await Promise.resolve();
  assert.ok(calls.includes('favorites'));
  favorites.resolve({ok:true,favoriteKeys:['person:assembly-001']});
  detail.resolve({ok:true,item:{id:'assembly-001',name:'정치인'}});
  const result=await pending;
  assert.equal(calls.filter(x=>x==='assembly-001').length,1);
  assert.equal(result.session.user.id,'reader');
  assert.deepEqual(result.dashboard.favoriteKeys,['person:assembly-001']);
  assert.equal(result.detail.item.id,'assembly-001');
});

test('an early detail rejection is handled while session is pending and public visits skip favorites',async()=>{
  const session=deferred();let favoriteCalls=0;
  const pending=loadPersonNavigation('assembly-002',{session:()=>session.promise},
    {favoriteKeys:()=>{favoriteCalls++;}},
    {get:()=>Promise.reject(new Error('offline'))});
  await new Promise(resolve=>setImmediate(resolve));
  session.resolve({authenticated:false,user:null});
  const result=await pending;
  assert.equal(result.detail.ok,false);
  assert.equal(result.detail.error,'POLITICIAN_REQUEST_FAILED');
  assert.equal(favoriteCalls,0);
});

test('rendering the prepared person result never starts a second detail fetch',async()=>{
  let calls=0;
  const service={get:async()=>{calls++;return {ok:true,item:{id:'assembly-001',name:'정치인',type:'assembly',party:'무소속'}};}};
  const prepared=await loadPersonNavigation('assembly-001',{session:async()=>({authenticated:false})},{},service);
  const html=await renderPoliticianDetail('assembly-001',service,prepared.session,prepared.dashboard,prepared.detail);
  assert.equal(calls,1);
  assert.match(html,/data-recent-id="assembly-001"/);
  assert.match(html,/정치인/);
});

test('network failures are not presented as nonexistent politicians',async()=>{
  const service={get:async()=>{throw new Error('must use prepared result');}};
  const failure=await renderPoliticianDetail('assembly-001',service,null,{}, {ok:false,error:'POLITICIAN_REQUEST_FAILED'});
  assert.match(failure,/불러오지 못했습니다/);
  assert.doesNotMatch(failure,/존재하지 않는/);
  const missing=await renderPoliticianDetail('missing',service,null,{}, {ok:false,status:404,error:'POLITICIAN_NOT_FOUND'});
  assert.match(missing,/존재하지 않는 정치인/);
});
