import test from 'node:test';
import assert from 'node:assert/strict';
import {createComicService} from '../lib/political-comic-service.js';
import {DMZ_EPISODE} from '../src/data/political-comic-seed.js';
import {renderHomeLayout} from '../src/layout/home-layout.js';
import {renderComicPage,renderComicAdmin,renderComicHome} from '../src/views/political-comic.js';
import fs from 'node:fs';
import handler from '../api/gateway.js';
const owner={id:'admin',role:'admin'};
function store(initial=null){let raw=initial;return async args=>{if(args[0]==='GET')return raw;if(args[0]==='EVAL'){if((raw||'')!==args[4])return 0;raw=args[5];return 1;}throw Error('Unexpected command');};}
test('initial issue is published, drafts remain owner-only, unpublished seed stays hidden',async()=>{
 const service=createComicService({command:store()});
 assert.equal((await service.list()).items.length,1);
 await assert.rejects(()=>service.list({admin:true,user:{id:'staff',role:'admin'}}),/ADMIN_REQUIRED/);
 await assert.rejects(()=>service.save(DMZ_EPISODE,{id:'member'}),/ADMIN_REQUIRED/);
 await service.save({...DMZ_EPISODE,published:false},owner);
 assert.equal((await service.list()).items.length,0);
 assert.equal((await service.list({admin:true,user:owner})).items.length,1);
});
test('four complete panels and safe image/source URLs required; stale edits rejected',async()=>{
 const service=createComicService({command:store()});
 await assert.rejects(()=>service.save({...DMZ_EPISODE,panels:[]},owner),/FOUR_PANELS_REQUIRED/);
 await assert.rejects(()=>service.save({...DMZ_EPISODE,image:'javascript:alert(1)'},owner),/IMAGE_REQUIRED/);
 const saved=await service.save(DMZ_EPISODE,owner);
 await assert.rejects(()=>service.save(DMZ_EPISODE,owner),/EDIT_CONFLICT/);
 const next=await service.save({...saved,title:'수정된 제목'},owner);assert.equal(next.title,'수정된 제목');
});
test('new issues retain earlier episodes and render four accessible scenes without raw HTML',async()=>{
 const service=createComicService({command:store()});const added=await service.save({...DMZ_EPISODE,id:'',title:'<script>alert(1)</script>'},owner);
 assert.equal(added.number,2);assert.equal((await service.list()).items.length,2);
 const html=renderComicPage({items:[added]},added.id);assert.equal((html.match(/<figure>/g)||[]).length,4);assert.equal((html.match(/role="img"/g)||[]).length,4);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/출처와 내용 확인/);
});
test('home includes issue before columns and after polls; mobile retains that order',()=>{
 const html=renderHomeLayout({rank:[],columns:[],community:[],session:{},comicResult:{items:[DMZ_EPISODE]}});
 const pos=html.indexOf('id="political-comic"');assert.ok(pos>html.indexOf('ai-home'));assert.ok(pos<html.indexOf('id="column"'));assert.match(html,/\/political-comic\/dmz-20260921/);
 const css=fs.readFileSync(new URL('../css/political-comic-368.css',import.meta.url),'utf8');assert.match(css,/political-comic-home\{order:25!important/);
});
test('HTTP endpoint allows public reading but rejects anonymous management and uploads',async()=>{
 const keys=['JCS_REBUILD_REDIS_REST_URL','JCS_REBUILD_REDIS_REST_TOKEN','JCS_REBUILD_REDIS_REDIS_URL','JCS_REBUILD_REDIS_URL'],saved=new Map(keys.map(k=>[k,process.env[k]])),oldFetch=globalThis.fetch;
 process.env.JCS_REBUILD_REDIS_REST_URL='https://comic-test.invalid';process.env.JCS_REBUILD_REDIS_REST_TOKEN='test';delete process.env.JCS_REBUILD_REDIS_REDIS_URL;delete process.env.JCS_REBUILD_REDIS_URL;
 globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({result:null})});
 try{for(const [suffix,method,status] of [['','GET',200],['?admin=1','GET',403],['','POST',403]]){
  const res={setHeader(){},end(value){this.body=JSON.parse(value);}};
  await handler({url:'/api/v3/political-comic'+suffix,method,headers:{host:'comic-test.invalid'},body:{operation:'upload-image'}},res);
  assert.equal(res.statusCode,status);if(status===200)assert.equal(res.body.items[0].panels.length,4);
 }}finally{globalThis.fetch=oldFetch;for(const [key,value] of saved)value===undefined?delete process.env[key]:process.env[key]=value;}
});
test('finished comic has no detached captions and persisted seed artwork upgrades without republishing',async()=>{
 const service=createComicService({command:store(JSON.stringify({items:[{...DMZ_EPISODE,image:'/assets/webtoons/dmz-20260921.webp',published:false}]}))});
 assert.equal((await service.list()).items.length,0);
 const data=await service.list({admin:true,user:owner});assert.equal(data.items[0].format,'comic');assert.equal(data.items[0].image,DMZ_EPISODE.image);
 const html=renderComicPage(data,DMZ_EPISODE.id);assert.doesNotMatch(html,/<figcaption|comic-takeaway/);assert.match(html,/comic-manuscript comic-square/);assert.doesNotMatch(html,/<details class="comic-sources">/);
 const library=renderComicPage(data);assert.doesNotMatch(library,/comic-home-copy|comic-panels/);assert.match(library,/comic-cover/);
});
test('finished manuscript publishes without twelve panel fields; cover and transcript round trip',async()=>{
 const service=createComicService({command:store()});const input={...DMZ_EPISODE,id:'',coverImage:'/assets/banners/citizen-choice-369.webp',transcript:'전체 대본'};delete input.panels;
 const saved=await service.save(input,owner);assert.equal(saved.panels.length,4);assert.equal(saved.transcript,'전체 대본');assert.equal(saved.coverImage,input.coverImage);
 const page=renderComicPage({items:[saved]},saved.id);assert.doesNotMatch(page,/전체 대본/);
 const admin=renderComicAdmin({items:[saved]},saved.id);assert.doesNotMatch(admin,/data-comic-upload="coverImage"/);assert.match(admin,/완성 만화 원고/);assert.doesNotMatch(admin,/name="title0"|name="text0"|name="alt0"|name="takeaway"/);
 const listing=renderComicPage({items:[saved]});assert.match(listing,/citizen-choice-369.webp/);
});
test('minimal editor saves without sources; home shows only latest three linked images',async()=>{
 const service=createComicService({command:store()});const saved=await service.save({format:'comic',title:'한 줄 제목',date:'2026-10-01',image:DMZ_EPISODE.image,published:true},owner);
 assert.equal(saved.title,'한 줄 제목');assert.deepEqual(saved.sources,[]);
 const rows=Array.from({length:4},(_,i)=>({...saved,id:'episode-'+i,number:i+1}));const home=renderComicHome({items:rows});
 assert.equal((home.match(/class="comic-home-thumbnail"/g)||[]).length,3);assert.doesNotMatch(home,/episode-3|4컷으로 읽기|comic-kicker|<h2>/);
 const admin=renderComicAdmin({items:[saved]},saved.id);assert.doesNotMatch(admin,/name="sources"|name="category"|name="transcript"|name="coverImage"/);
 const page=renderComicPage({items:[saved]},saved.id);assert.doesNotMatch(page,/기준|출처|comic-editor-note/);
});
