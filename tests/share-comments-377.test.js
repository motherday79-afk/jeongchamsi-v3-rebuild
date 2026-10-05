import test from 'node:test';import assert from 'node:assert/strict';
import {buildShareMetadata,renderShareDocument} from '../lib/share-metadata.js';
import {COMIC_EPISODES} from '../src/data/political-comic-seed.js';
import {COMIC_KEY} from '../lib/political-comic-service.js';
import {createCommunityService} from '../lib/community-service.js';
import {sharePage,renderPageShare} from '../src/ui/page-share.js';
import {renderComicHome} from '../src/views/political-comic.js';
test('public share cards use per-episode images and section art without exposing hidden comics',async()=>{
 const source={readComics:async()=>({items:[...COMIC_EPISODES,{id:'secret',title:'비밀',image:'/assets/secret.webp',published:false}]})};
 for(const p of COMIC_EPISODES){const m=await buildShareMetadata('/political-comic/'+p.id,source);assert.equal(m.title,p.title);assert.ok(m.image.endsWith(p.image));assert.ok(m.url.endsWith('/'+p.id));assert.match(renderShareDocument(m,'<head></head>'),/og:image/);}
 const hidden=await buildShareMetadata('/political-comic/secret',source);assert.doesNotMatch(JSON.stringify(hidden),/비밀|secret.webp/);
 const poll=await buildShareMetadata('/ai-panel',source);assert.match(poll.image,/jcs-survey-441.png$/);assert.match(poll.title,/여론조사/);
 const home=renderComicHome({items:COMIC_EPISODES});assert.match(home,/module-icon-action/);assert.doesNotMatch(home,/전체 회차 보기 ↗/);
});
test('sharing preserves exact episode URL, supports copy fallback and blocks private screens',async()=>{
 let value;const result=await sharePage('/political-comic/test','제목',{clipboard:{writeText:async s=>{value=s;}}});assert.equal(value,'https://www.jeongchamsi.com/political-comic/test');assert.equal(result.status,'copied');
 assert.equal(renderPageShare('/admin'), '');assert.equal(renderPageShare('/shop/request'),'');assert.equal(renderPageShare('/community/write'),'');
 assert.equal((await sharePage('/ai-panel','여론조사',{share:async()=>{throw Object.assign(Error(),{name:'AbortError'});}})).status,'cancelled');
});
test('comic comments require login, public episode and ownership, and preserve original comic data',async()=>{
 const db=new Map(),command=async a=>{if(a[0]==='GET')return db.get(a[1])||null;if(a[0]==='EVAL'){const n=Number(a[2]),keys=a.slice(3,3+n),old=a.slice(3+n,3+2*n),next=a.slice(3+2*n);if(keys.some((k,i)=>(db.get(k)||'')!==old[i]))return 0;keys.forEach((k,i)=>db.set(k,next[i]));return 1;}throw Error('Unsupported '+a[0]);};
 const service=createCommunityService({command}),member={id:'reader',nickname:'독자',role:'member'},other={id:'other',role:'member'},id=COMIC_EPISODES[0].id;
 await assert.rejects(service.addComment('political-comic',id,{text:'의견'},null),/LOGIN_REQUIRED/);
 await assert.rejects(service.addComment('political-comic','missing',{text:'의견'},member),/POST_NOT_FOUND/);
 await assert.rejects(service.createPost('political-comic',{title:'권한 우회'},member),/WRITE_NOT_ALLOWED/);
 const c=await service.addComment('political-comic',id,{text:'웹툰으로 보니 내용을 이해하는 데 도움이 됩니다.',requestId:'comic-comment-0001'},member);
 assert.equal(c.domain,'political-comic');assert.equal(JSON.parse(db.get(COMIC_KEY)).items.length,COMIC_EPISODES.length);
 await assert.rejects(service.editComment('political-comic',id,c.id,'남의 댓글 수정',other),/COMMENT_EDIT_FORBIDDEN/);
 assert.equal((await service.editComment('political-comic',id,c.id,'수정한 의견',member)).text,'수정한 의견');
 assert.equal((await service.deleteComment('political-comic',id,c.id,member)).ok,true);
 const stored=JSON.parse(db.get(COMIC_KEY));stored.items[0].published=false;db.set(COMIC_KEY,JSON.stringify(stored));
 await assert.rejects(service.addComment('political-comic',id,{text:'숨긴 회차'},member),/POST_NOT_FOUND/);
});
