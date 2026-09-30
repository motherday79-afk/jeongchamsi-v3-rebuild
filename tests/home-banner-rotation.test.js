import test from 'node:test';
import assert from 'node:assert/strict';
import {homeBannerPlaylist,HOME_BANNER_INTERVAL,VELGARD_BANNER} from '../src/core/home-banner-playlist.js';
import {setupHomeBannerRotation} from '../src/ui/home-banner-rotation.js';
import {homeBanner} from '../src/layout/home-layout.js';
import {createHomeBannerService,BANNER_CAS_LUA} from '../lib/home-banner-service.js';
import {TARGET_KEYS} from '../lib/migration-service.js';

test('Velgard is first, old banners remain, and only one image link is initially visible',()=>{
 const previous={url:'https://images.example/old.webp',designVersion:'upload',targetUrl:'https://example.com',alt:'기존 광고'};
 assert.deepEqual(homeBannerPlaylist(previous),[VELGARD_BANNER,previous]);
 assert.equal(homeBannerPlaylist(null).length,2);
 assert.equal(homeBannerPlaylist({items:[VELGARD_BANNER,previous,previous]}).length,2);
 const html=homeBanner(previous);
 assert.match(html,/href="https:\/\/velgard.store"/);
 assert.match(html,/data-interval="60000"/);
 assert.equal((html.match(/data-home-banner-slide/g)||[]).length,2);
 assert.equal((html.match(/aria-hidden="false"/g)||[]).length,1);
 assert.equal((html.match(/aria-hidden="true" hidden/g)||[]).length,1);
 assert.doesNotMatch(html,/data-home-banner-edit/);
 assert.match(homeBanner(previous,{user:{role:'admin'}}),/배너 추가/);
});

test('rotation advances at 60 seconds, loops, pauses when hidden/focused, and cleans up on rebind',()=>{
 const callbacks=new Map(),cancelled=[],slides=[0,1,2].map(i=>({hidden:!!i,setAttribute(){}}));let id=0,focus=false;
 const carousel={isConnected:true,querySelectorAll:()=>slides,contains:()=>focus};
 const root={hidden:false,querySelectorAll:()=>[carousel]},options={setInterval:(fn,delay)=>{assert.equal(delay,HOME_BANNER_INTERVAL);callbacks.set(++id,fn);return id;},clearInterval:id=>{cancelled.push(id);callbacks.delete(id);}};
 const active=()=>slides.findIndex(s=>!s.hidden);
 setupHomeBannerRotation(root,options);assert.equal(active(),0);
 callbacks.get(1)();assert.equal(active(),1);callbacks.get(1)();assert.equal(active(),2);callbacks.get(1)();assert.equal(active(),0);
 root.hidden=true;callbacks.get(1)();assert.equal(active(),0);root.hidden=false;focus=true;callbacks.get(1)();assert.equal(active(),0);focus=false;
 setupHomeBannerRotation(root,options);assert.deepEqual(cancelled,[1]);assert.equal(callbacks.size,1);
 carousel.isConnected=false;callbacks.get(2)();assert.equal(callbacks.size,0);
});

const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(20)]);
const input={pc:{bytes:png,contentType:'image/png'},mobile:{bytes:png,contentType:'image/png'},tablet:{bytes:png,contentType:'image/png'},targetUrl:'https://velgard.store',alt:'벨가르드'};
function fixture(){
 const values=new Map([[TARGET_KEYS.homeBanner,JSON.stringify({url:'https://blob.example/old.png',pathname:'home-banners/old.png',designVersion:'upload'})]]),removed=[];let uploads=0;
 const command=async args=>{if(args[0]==='GET')return values.get(args[1])||null;if(args[0]==='SET'){values.set(args[1],args[2]);return 'OK';}if(args[0]==='EVAL'&&args[1]===BANNER_CAS_LUA){if((values.get(args[3])||'')!==args[4])return 0;values.set(args[3],args[5]);return 1;}throw Error(args[0]);};
 return {values,removed,command,options:{command,putImpl:async()=>({url:`https://blob.example/${++uploads}.png`,pathname:`home-banners/${uploads}.png`}),delImpl:async url=>removed.push(url)}};
}
test('new sidebar uploads append without deleting prior artwork, including simultaneous registrations',async()=>{
 const f=fixture(),service=createHomeBannerService(f.options);
 await Promise.all([service.save(input,'admin'),service.save(input,'staff')]);
 const saved=await service.get();assert.equal(saved.items.length,3);assert.equal(saved.items[0].url,'https://blob.example/old.png');
 assert.equal(saved.intervalMs,60000);assert.equal(f.removed.length,0);
 assert.equal(new Set(saved.items.map(row=>row.url)).size,3);
});
test('failed playlist commits clean up new uploads only',async()=>{
 const f=fixture(),service=createHomeBannerService({...f.options,command:args=>args[0]==='EVAL'?0:f.command(args)});
 await assert.rejects(service.save(input,'admin'),/BANNER_CHANGED_RETRY/);
 assert.equal(f.removed.length,3);assert.ok(!f.removed.includes('https://blob.example/old.png'));
 assert.equal(JSON.parse(f.values.get(TARGET_KEYS.homeBanner)).url,'https://blob.example/old.png');
});
