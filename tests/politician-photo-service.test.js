import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGET_KEYS } from '../lib/migration-service.js';
import { createPoliticianPhotoService, validatePoliticianPhoto } from '../lib/politician-photo-service.js';
import { politicianPhotoErrorCode } from '../api/gateway.js';
import { photoUploadMessage } from '../src/core/auth.js';

function memoryCommand(){const map=new Map();return {map,command:async args=>{if(args[0]==='GET')return map.get(args[1])??null;if(args[0]==='SET'){map.set(args[1],args[2]);return 'OK';}throw new Error('UNSUPPORTED');}};}
const webp=Buffer.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]);

test('photo validation accepts only image bytes up to one megabyte',()=>{
  assert.equal(validatePoliticianPhoto({contentType:'image/webp',bytes:webp}).extension,'webp');
  assert.throws(()=>validatePoliticianPhoto({contentType:'image/svg+xml',bytes:Buffer.from('<svg/>')}),/PHOTO_TYPE_INVALID/);
  assert.throws(()=>validatePoliticianPhoto({contentType:'image/png',bytes:Buffer.alloc(1_048_577)}),/PHOTO_TOO_LARGE/);
});

test('photo upload stores only public Blob metadata and safely replaces the override',async()=>{
  const redis=memoryCommand(),uploads=[];
  const service=createPoliticianPhotoService({command:redis.command,profiles:[{id:'assembly-001',name:'고민정'}],putImpl:async(path,bytes,options)=>{uploads.push({path,bytes,options});return {url:`https://blob.example/${uploads.length}.webp`,pathname:path,contentType:options.contentType};},now:()=>Date.parse('2026-09-06T12:00:00Z')});
  const first=await service.save({personId:'assembly-001',contentType:'image/webp',bytes:webp,focus:'50% 20%'},'admin');
  const second=await service.save({personId:'assembly-001',contentType:'image/webp',bytes:webp},'admin');
  assert.equal(first.photo.url,'https://blob.example/1.webp');
  assert.equal(second.photo.url,'https://blob.example/2.webp');
  assert.equal(first.previous,null);
  assert.equal(second.previous.url,'https://blob.example/1.webp');
  assert.equal(uploads[0].options.access,'public');
  const stored=JSON.parse(redis.map.get(TARGET_KEYS.politicianPhotoOverrides));
  assert.equal(stored.items['assembly-001'].url,'https://blob.example/2.webp');
  assert.equal('bytesData' in stored.items['assembly-001'],false);
});

test('photo upload rejects unknown politicians before writing',async()=>{
  const service=createPoliticianPhotoService({command:memoryCommand().command,profiles:[],putImpl:async()=>{throw new Error('must not upload');}});
  await assert.rejects(()=>service.save({personId:'missing',contentType:'image/webp',bytes:webp},'admin'),/POLITICIAN_PROFILE_MISSING/);
});

test('missing Vercel Blob credentials are converted to an actionable admin message',()=>{
  assert.equal(politicianPhotoErrorCode(new Error("Vercel Blob: No blob credentials found. Pass a token option, set 'BLOB_READ_WRITE_TOKEN'")),'PHOTO_STORAGE_NOT_CONFIGURED');
  assert.equal(photoUploadMessage({ok:false,error:'PHOTO_STORAGE_NOT_CONFIGURED'}),'사진 저장소가 연결되지 않았습니다. Vercel Blob을 연결한 뒤 다시 배포해 주세요.');
});
