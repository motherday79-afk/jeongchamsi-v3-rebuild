import test from 'node:test';
import assert from 'node:assert/strict';
import {makeIdleNotice,setText} from '../mine/idle-state.js';
test('idle notice waits one visible minute and resets on mining, full or leaving',()=>{
 const idle=makeIdleNotice(),base={visible:true,running:false,full:false,ready:true};
 assert.equal(idle({...base,now:0}),'');assert.equal(idle({...base,now:59999}),'');
 assert.match(idle({...base,now:60000}),/채굴이 멈춰/);
 assert.equal(idle({...base,now:61000,full:true}),'');
 assert.equal(idle({...base,now:120000}),'');
 assert.equal(idle({...base,now:150000,visible:false}),'');
 assert.equal(idle({...base,now:200000}),'');
 assert.equal(idle({...base,now:260000,running:true}),'');
});
test('unchanged text does not rewrite DOM',()=>{
 let writes=0,value='대기';const el={get textContent(){return value;},set textContent(v){writes++;value=v;}};
 setText(el,'대기');assert.equal(writes,0);setText(el,'채굴');assert.equal(writes,1);
});
import {miningRequest} from '../lib/mining-http.js';
import {validateMineAd} from '../lib/mining-service.js';
test('image upload requires admin and JSON and never runs for members',async()=>{
 let calls=0;const service={upload:async()=>{calls++;return {ok:true,url:'https://asset.test/a.png'};}},url=new URL('https://jcs.test/api/v3/mine/image');
 const req={method:'POST',headers:{'content-type':'application/json'},body:{base64:'test'}};
 assert.equal((await miningRequest(req,{service,url,user:{id:'m',role:'member'}})).status,403);assert.equal(calls,0);
 assert.equal((await miningRequest({...req,headers:{'content-type':'text/plain'}},{service,url,user:{id:'a',role:'admin'}})).status,415);
 assert.equal((await miningRequest(req,{service,url,user:{id:'a',role:'admin'}})).status,201);assert.equal(calls,1);
});
test('ad settings retain only an uploaded mine image URL',()=>{
 const imageUrl='https://abc.public.blob.vercel-storage.com/mine-ad/123-random.png';
 assert.equal(validateMineAd({name:'광고',imageUrl}).imageUrl,imageUrl);
 assert.throws(()=>validateMineAd({name:'광고',imageUrl:'javascript:alert(1)'}),/MINE_IMAGE_URL/);
 assert.throws(()=>validateMineAd({name:'광고',imageUrl:'https://example.com/a.png'}),/MINE_IMAGE_URL/);
});
