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
import { hashPassword, passwordHashKind, verifyPasswordHash } from '../lib/password.js';
import { authenticateUser, readUsers } from '../lib/rebuild-store.js';
import { TARGET_KEYS } from '../lib/migration-service.js';

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

test('legacy SHA-256 password hashes remain login-compatible',()=>{
  const password='legacy-pass-9';
  const hash=crypto.createHash('sha256').update(password,'utf8').digest('hex');
  assert.equal(passwordHashKind(hash),'sha256');
  assert.equal(verifyPasswordHash(password,hash),true);
  assert.equal(verifyPasswordHash(password,`sha256$${hash}`),true);
  assert.equal(verifyPasswordHash('wrong',hash),false);
});

test('legacy member aliases normalize and successful login upgrades only target hash',async()=>{
  const password='legacy-pass-10';
  const legacyHash=crypto.createHash('sha256').update(password,'utf8').digest('hex');
  const map=new Map([[TARGET_KEYS.users,JSON.stringify([{userId:'legacy-admin',displayName:'관리자',email:'admin@example.com',role:'admin',passwordDigest:legacyHash}])]]);
  const writes=[];
  const command=async args=>{const op=String(args[0]).toUpperCase();if(op==='GET')return map.get(args[1])??null;if(op==='SET'){writes.push(args[1]);map.set(args[1],args[2]);return 'OK';}throw new Error('UNSUPPORTED');};
  const users=await readUsers(command);
  assert.equal(users['legacy-admin'].nickname,'관리자');
  const user=await authenticateUser(command,'admin@example.com',password);
  assert.equal(user.id,'legacy-admin');
  assert.equal(user.role,'admin');
  assert.equal('passwordHash' in user,false);
  assert.deepEqual(writes,[TARGET_KEYS.users]);
  const upgraded=JSON.parse(map.get(TARGET_KEYS.users));
  assert.equal(passwordHashKind(upgraded['legacy-admin'].passwordHash),'scrypt');
  assert.equal(verifyPasswordHash(password,upgraded['legacy-admin'].passwordHash),true);
  assert.notEqual(upgraded['legacy-admin'].passwordHash,legacyHash);
  assert.equal(hashPassword(password).startsWith('scrypt$'),true);
});
