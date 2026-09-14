import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityService } from '../lib/community-service.js';
const admin={id:'a',role:'admin'},post={id:'one',title:"'주거정책' 시민의 선택은?",published:true,cageEnabled:true,createdAt:'2026-09-01T00:00:00.000Z'};
const layout={cageId:'one',title:post.title,enabled:true,breakAt:6,emphasis:'first'};
function storage({conflict=false,posts=[post]}={}){let raw=JSON.stringify({items:posts,featuredCageId:'one',custom:'preserved'}),first=true;const command=async args=>{if(args[0]==='GET')return raw;if(args[0]==='EVAL'){if(conflict&&first){first=false;const changed=JSON.parse(raw);changed.items.push({id:'concurrent-post',title:'새 케이지',published:true,cageEnabled:true,createdAt:'2026-09-02T00:00:00.000Z'});raw=JSON.stringify(changed);return 0;}if(raw!==args[4])return 0;raw=args[5];return 1;}throw new Error('unexpected command');};return {command,read:()=>JSON.parse(raw)};}
test('cage layout saves through the existing CAS without overwriting concurrent posts',async()=>{
 const store=storage({conflict:true});await createCommunityService(store).featureCage('one',admin,{titleLayout:layout});
 assert.equal(store.read().items.length,2);assert.equal(store.read().custom,'preserved');assert.equal(store.read().items[0].title,post.title);assert.equal(store.read().cageTitleLayouts.one.breakAt,6);
});
test('stale title and unprivileged requests cannot change settings',async()=>{
 const store=storage(),service=createCommunityService(store);
 await assert.rejects(service.featureCage('one',{id:'m',role:'member'},{titleLayout:layout}),/ADMIN_REQUIRED/);
 await assert.rejects(service.featureCage('one',admin,{titleLayout:{...layout,title:'old title'}}),/CAGE_TITLE_CHANGED/);
 assert.equal(store.read().cageTitleLayouts,undefined);
});
test('turning manual layout off clears only the selected cage layout',async()=>{
 const store=storage(),service=createCommunityService(store);
 await service.featureCage('one',admin,{titleLayout:layout});
 await service.featureCage('one',admin,{titleLayout:{...layout,enabled:false}});
 assert.equal(store.read().featuredCageId,'one');assert.equal(store.read().cageTitleLayouts.one,undefined);assert.equal(store.read().items[0].title,post.title);
});
test('layout target must match the explicitly featured cage',async()=>{
 const two={id:'two',title:'두 번째 케이지',published:true,cageEnabled:true,createdAt:'2026-09-02T00:00:00.000Z'};
 const store=storage({posts:[post,two]}),service=createCommunityService(store);
 await assert.rejects(service.featureCage('one',admin,{titleLayout:{...layout,cageId:'two',title:'두 번째 케이지'}}),/CAGE_TITLE_CHANGED/);
 assert.equal(store.read().cageTitleLayouts,undefined);
});
test('automatic selection rejects a stale layout target after a concurrent newer cage appears',async()=>{
 const store=storage({conflict:true}),service=createCommunityService(store);
 await assert.rejects(service.featureCage('',admin,{titleLayout:layout}),/CAGE_TITLE_CHANGED/);
 assert.equal(store.read().featuredCageId,'one');
 assert.equal(store.read().cageTitleLayouts,undefined);
 assert.equal(store.read().items.at(-1).id,'concurrent-post');
});
test('automatic selection saves a layout for the newest eligible root',async()=>{
 const newer={id:'newest',title:'새로운 정책 토론',published:true,cageEnabled:true,createdAt:'2026-09-03T00:00:00.000Z'};
 let raw=JSON.stringify({items:[post,newer],featuredCageId:'one'});
 const command=async args=>{if(args[0]==='GET')return raw;if(args[0]==='EVAL'){if(raw!==args[4])return 0;raw=args[5];return 1;}throw new Error('unexpected command');};
 await createCommunityService({command}).featureCage('',admin,{titleLayout:{cageId:'newest',title:newer.title,enabled:true,breakAt:3,emphasis:'equal'}});
 const saved=JSON.parse(raw);assert.equal(saved.featuredCageId,'');assert.equal(saved.cageTitleLayouts.newest.title,newer.title);
});
