import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupClient } from '../src/core/group-client.js';

const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});

test('group client sends filtered list and invite detail requests',async()=>{
  const calls=[]; const client=createGroupClient({fetch:async(url,options)=>{calls.push([url,options]);return response({ok:true});}});
  await client.list({view:'mine',category:'culture',q:' 함께 ',page:2});
  await client.get('group / one',{invite:'secret token'});
  assert.equal(calls[0][0],'/api/v3/groups?view=mine&category=culture&q=+%ED%95%A8%EA%BB%98+&page=2');
  assert.equal(calls[1][0],'/api/v3/groups?id=group+%2F+one&invite=secret+token');
  assert.equal(calls[0][1].credentials,'same-origin');
});

test('group client save preserves the exact optimistic mutation envelope',async()=>{
  let body; const client=createGroupClient({fetch:async(_url,options)=>(body=JSON.parse(options.body),response({ok:true,item:{id:'g'}}))});
  await client.save({id:'g',version:7,operation:'member',input:{userId:'u',decision:'approve'},invite:'i'});
  assert.deepEqual(body,{id:'g',version:7,operation:'member',input:{userId:'u',decision:'approve'},invite:'i'});
});

test('group upload validates files and sends base64 without storage details',async()=>{
  let call; const client=createGroupClient({fetch:async(url,options)=>(call=[url,JSON.parse(options.body)],response({ok:true,image:{id:'im',url:'/api/v3/groups?id=g&imageId=im'},version:2}))});
  assert.equal((await client.upload('g',{type:'text/plain',size:2,arrayBuffer:async()=>new ArrayBuffer(2)})).error,'GROUP_IMAGE_INVALID');
  assert.equal((await client.upload('g',{type:'image/png',size:3*1024*1024,arrayBuffer:async()=>new ArrayBuffer(2)})).error,'GROUP_IMAGE_TOO_LARGE');
  assert.equal((await client.upload('g',{type:'image/gif',size:2,arrayBuffer:async()=>new ArrayBuffer(2)})).error,'GROUP_IMAGE_INVALID');
  await client.upload('g',{type:'image/png',size:2,arrayBuffer:async()=>Uint8Array.from([65,66]).buffer},{purpose:'cover'});
  assert.equal(call[0],'/api/v3/groups?image=1');
  assert.deepEqual(call[1],{id:'g',purpose:'cover',contentType:'image/png',base64:'QUI='});
  assert.doesNotMatch(JSON.stringify(call),/pathname|credential|storage/i);
});

test('group client returns structured errors for non-json responses',async()=>{
  const client=createGroupClient({fetch:async()=>({ok:false,status:500,json:async()=>{throw Error('bad')}})});
  assert.deepEqual(await client.get('g'),{status:500,ok:false,error:'GROUP_INVALID_RESPONSE'});
});
