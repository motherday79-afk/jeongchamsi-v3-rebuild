import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  LEGACY_DOMAINS,
  decodeLegacyJson,
  validateMigrationSnapshot,
  legacyUserKey,
  legacyActivityKey,
  legacyContentKey,
} from '../lib/migration-core.js';
import { verifyPasswordHash } from '../lib/password.js';

test('migration scope is limited to stable member/content domains',()=>{
  assert.deepEqual(LEGACY_DOMAINS,[
    'columns','community','itsme','polls','generation','nationalEvaluation','academy','comments'
  ]);
  assert.equal(LEGACY_DOMAINS.includes('keywords'),false);
  assert.equal(LEGACY_DOMAINS.includes('trending'),false);
  assert.equal(LEGACY_DOMAINS.includes('politicianPhotos'),false);
});

test('legacy storage keys are exact and do not touch NOW/HISTORY namespaces',()=>{
  assert.equal(legacyUserKey(),'jcv3:users:v2');
  assert.equal(legacyActivityKey('user-1'),'jcv3:useractivity:v1:user-1');
  assert.equal(legacyContentKey('community'),'jcv3:content:v4:community');
});

test('decodeLegacyJson supports direct json and chunk manifest',async()=>{
  const direct=await decodeLegacyJson('{"items":[{"id":"a"}]}',async()=>null);
  assert.equal(direct.items[0].id,'a');

  const source=Buffer.from(JSON.stringify({items:[{id:'chunked'}]}),'utf8');
  const chunks=[source.subarray(0,8),source.subarray(8)].map(x=>x.toString('base64'));
  const manifest=JSON.stringify({__jcv3_chunked_json_v1__:1,encoding:'base64',chunks:2,bytes:source.length});
  const decoded=await decodeLegacyJson(manifest,async i=>chunks[i]);
  assert.equal(decoded.items[0].id,'chunked');
});

test('snapshot validation preserves member-post-comment relationships',()=>{
  const snapshot={
    users:{u1:{id:'u1',role:'admin',passwordHash:'scrypt$salt$hash'}},
    activities:{u1:{likedPosts:['community:p1']}},
    contents:{
      community:{items:[{id:'p1',ownerId:'u1',title:'hello'}]},
      comments:{items:[{id:'c1',domain:'community',postId:'p1',ownerId:'u1',text:'ok'}]}
    }
  };
  const report=validateMigrationSnapshot(snapshot);
  assert.equal(report.ok,true);
  assert.equal(report.orphanPostOwners.length,0);
  assert.equal(report.orphanCommentOwners.length,0);
  assert.equal(report.orphanCommentPosts.length,0);
});

test('legacy scrypt password hashes remain login-compatible',()=>{
  const password='pass12345';
  const salt='00112233445566778899aabbccddeeff';
  const hash=crypto.scryptSync(password,salt,64).toString('hex');
  assert.equal(verifyPasswordHash(password,`scrypt$${salt}$${hash}`),true);
  assert.equal(verifyPasswordHash('wrong',`scrypt$${salt}$${hash}`),false);
});
