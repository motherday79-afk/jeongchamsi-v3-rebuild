import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeBannerService, homeBannerStorageStatus, validateHomeBanner } from '../lib/home-banner-service.js';
import { TARGET_KEYS } from '../lib/migration-service.js';

const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(20)]);

test('home banner validates real image bytes and https destination',()=>{
  const valid=validateHomeBanner({contentType:'image/png',bytes:png,targetUrl:'https://example.com/campaign',alt:'캠페인'});
  assert.equal(valid.extension,'png');
  assert.throws(()=>validateHomeBanner({contentType:'image/png',bytes:png,targetUrl:'http://example.com'}),/BANNER_TARGET_URL_INVALID/);
});

test('home banner upload stores a single active banner document',async()=>{
  const values=new Map(),command=async args=>args[0]==='GET'?(values.get(args[1])||null):args[0]==='SET'?(values.set(args[1],args[2]),'OK'):null;
  const service=createHomeBannerService({command,now:()=>1_789_000_000_000,putImpl:async()=>({url:'https://blob.example/banner.png',pathname:'home-banners/banner.png'})});
  const saved=await service.save({contentType:'image/png',bytes:png,targetUrl:'https://example.com/campaign',alt:'캠페인'},'admin');
  assert.equal(saved.updatedBy,'admin');
  assert.equal((await service.get()).url,'https://blob.example/banner.png');
  assert.ok(values.has(TARGET_KEYS.homeBanner));
});

test('home banner storage reports token and OIDC modes without exposing credentials',()=>{
  assert.deepEqual(homeBannerStorageStatus({BLOB_READ_WRITE_TOKEN:'secret'}),{configured:true,mode:'token'});
  assert.deepEqual(homeBannerStorageStatus({VERCEL_OIDC_TOKEN:'oidc',BLOB_STORE_ID:'store'}),{configured:true,mode:'oidc'});
  assert.deepEqual(homeBannerStorageStatus({}),{configured:false,mode:'missing'});
});

test('default banner upload rejects missing storage credentials before calling Blob',async()=>{
  const service=createHomeBannerService({command:async()=>null,env:{}});
  await assert.rejects(()=>service.save({contentType:'image/png',bytes:png,targetUrl:'https://example.com'}),/BANNER_STORAGE_NOT_CONFIGURED/);
});

test('banner upload forwards the configured Blob token and keeps the two megabyte limit',async()=>{
  let uploadOptions=null;
  const values=new Map(),command=async args=>args[0]==='GET'?(values.get(args[1])||null):args[0]==='SET'?(values.set(args[1],args[2]),'OK'):null;
  const service=createHomeBannerService({command,env:{BLOB_READ_WRITE_TOKEN:'banner-token'},putImpl:async(_path,_bytes,options)=>{uploadOptions=options;return {url:'https://blob.example/banner.png'};}});
  await service.save({contentType:'image/png',bytes:png,targetUrl:'https://example.com'});
  assert.equal(uploadOptions.token,'banner-token');
  assert.throws(()=>validateHomeBanner({contentType:'image/png',bytes:Buffer.concat([png,Buffer.alloc(2_097_152)]),targetUrl:'https://example.com'}),/BANNER_TOO_LARGE/);
});
