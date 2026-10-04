import test from 'node:test';
import assert from 'node:assert/strict';
import {createComicService} from '../lib/political-comic-service.js';
import {DMZ_EPISODE} from '../src/data/political-comic-seed.js';
import {renderComicPage} from '../src/views/political-comic.js';
test('comic deletion requires owner privileges and remains deleted after seed reload',async()=>{
 let raw=null;const service=createComicService({command:async a=>{if(a[0]==='GET')return raw;if(a[0]==='EVAL'){if((raw||'')!==a[4])return 0;raw=a[5];return 1;}throw Error('Unexpected command');}});
 const episode=(await service.list()).items.find(p=>p.id===DMZ_EPISODE.id);
 for(const user of [null,{id:'member',role:'user'},{id:'staff',role:'admin'}])await assert.rejects(()=>service.remove(episode.id,episode.updatedAt,user),/ADMIN_REQUIRED/);
 await assert.rejects(()=>service.remove(episode.id,'stale',{id:'admin',role:'admin'}),/EDIT_CONFLICT/);
 await service.remove(episode.id,episode.updatedAt,{id:'admin',role:'admin'});
 for(let i=0;i<2;i++)assert.ok(!(await service.list()).items.some(p=>p.id===episode.id));
});
test('public comic menu shares only; authorized editor gets edit and delete',()=>{
 const result={items:[DMZ_EPISODE]};
 assert.doesNotMatch(renderComicPage(result,DMZ_EPISODE.id),/data-comic-delete|\/admin\/political-comic/);
 const html=renderComicPage(result,DMZ_EPISODE.id,true);
 assert.match(html,/data-comic-delete/);assert.match(html,/\/admin\/political-comic/);assert.match(html,/data-page-share/);
});
