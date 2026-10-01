import test from 'node:test';import assert from 'node:assert/strict';
import {createComicService} from '../lib/political-comic-service.js';
import {COMIC_EPISODES,DMZ_EPISODE} from '../src/data/political-comic-seed.js';
import {renderComicHome,renderComicPage} from '../src/views/political-comic.js';
test('new releases backfill existing store once, preserving edited and unpublished episodes',async()=>{
 let raw=JSON.stringify({items:[{...DMZ_EPISODE,title:'관리자가 수정한 제목'}, {...COMIC_EPISODES[1],published:false,title:'숨긴 회차'},{...DMZ_EPISODE,id:'custom',number:8}]});
 const command=async args=>{if(args[0]==='GET')return raw;if(args[0]==='EVAL'){assert.equal(args[4],raw);raw=args[5];return 1;}throw Error('unexpected');};
 const service=createComicService({command}),user={id:'admin',role:'admin'};
 const before=await service.list({admin:true,user});assert.equal(before.items.length,COMIC_EPISODES.length+1);
 assert.equal(before.items.find(p=>p.id===DMZ_EPISODE.id).title,'관리자가 수정한 제목');
 assert.equal((await service.list()).items.some(p=>p.id===COMIC_EPISODES[1].id),false);
 assert.equal(new Set(before.items.map(p=>p.number)).size,COMIC_EPISODES.length+1);
 const trial=before.items.find(p=>p.id===COMIC_EPISODES[2].id);await service.save({...trial,title:'구형과 선고'},user);
 const after=await service.list({admin:true,user});assert.equal(after.items.length,COMIC_EPISODES.length+1);assert.equal(after.items.find(p=>p.id===trial.id).title,'구형과 선고');
 assert.equal(after.items.find(p=>p.id===COMIC_EPISODES[1].id).published,false);
});
test('three new comics occupy main gallery; DMZ remains in archive with four-panel reader',async()=>{
 const data=await createComicService({command:async()=>null}).list();assert.equal(data.items.length,COMIC_EPISODES.length);
 const home=renderComicHome(data);assert.doesNotMatch(home,/dmz-20260921/);
 for(const p of data.items.slice(0,3)){assert.match(home,new RegExp(p.id));assert.equal(p.panels.length,4);assert.ok(p.sources.length);assert.equal((renderComicPage(data,p.id).match(/<figure>/g)||[]).length,4);}
 assert.match(renderComicPage(data),/dmz-20260921/);
});
