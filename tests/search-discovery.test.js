import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSearchDiscovery, renderDiscoveryCampaigns, loadSearchDiscovery} from '../src/views/search-discovery.js';
import {renderSearchPage} from '../src/views/search-page.js';

const campaign=(id,extra={})=>({id,headline:`제목 ${id}`,name:`이름 ${id}`,category:'politics',photoUrl:`/assets/${id}.webp`,...extra});

test('discovery renders campaign before the canonical four shop products with existing routes and one art definition',()=>{
 const html=renderSearchDiscovery();
 assert.ok(html.indexOf('data-search-discovery-campaigns')<html.indexOf('data-search-discovery-shop'));
 assert.equal((html.match(/class="search-discovery-product"/g)||[]).length,4);
 assert.match(html,/정참시 쇼핑몰에 새로운 아이템이 추가되었습니다/);
 assert.match(html,/작고 귀여운 별빛 친구들/);
 assert.match(html,/출시 준비 중/);
 assert.match(html,/디자인 시안/);
 assert.match(html,/href="\/shop\/kids-/);
 assert.match(html,/href="\/shop" data-layout-route="\/shop"/);
 assert.equal((html.match(/class="cheer-art-defs"/g)||[]).length,1);
});

test('campaign discovery keeps featured first, removes duplicates and limits public cards to three',()=>{
 const featured=campaign('featured',{accentLine:'강조'}),html=renderDiscoveryCampaigns({ok:true,featured,items:[campaign('a',{topic:'주거'}),featured,campaign('b'),campaign('c')]});
 assert.equal((html.match(/<a class="jcd-item"/g)||[]).length,3);
 assert.ok(html.indexOf('/campaigns/featured')<html.indexOf('/campaigns/a'));
 assert.equal((html.match(/\/campaigns\/featured/g)||[]).length,2);
 assert.match(html,/캠페인 전체보기/);
 assert.match(html,/이름 a/);
 assert.match(html,/jcd-item-title/);
 assert.match(html,/jcd-topic/);
 assert.match(html,/<div id="jcs-campaign-directory" class="search-discovery-campaign-scope">[\s\S]*<a class="jcd-item"/);
});

test('newer same-query campaign load owns the mount when the older request resolves last',async()=>{
 let resolveOld,resolveNew;
 const oldRequest=new Promise(resolve=>{resolveOld=resolve;}),newRequest=new Promise(resolve=>{resolveNew=resolve;});
 let call=0;
 const mount={isConnected:true,dataset:{},innerHTML:'pending'},root={isConnected:true,querySelector:()=>mount};
 const client={list:()=>++call===1?oldRequest:newRequest};
 const oldLoad=loadSearchDiscovery(root,client,'same');
 const newLoad=loadSearchDiscovery(root,client,'same');
 resolveNew({ok:true,items:[campaign('new')]});await newLoad;
 resolveOld({ok:true,items:[campaign('old')]});await oldLoad;
 assert.match(mount.innerHTML,/\/campaigns\/new/);
 assert.doesNotMatch(mount.innerHTML,/\/campaigns\/old/);
});

test('campaign failure is nonblocking and a stale route response cannot update the current discovery mount',async()=>{
 let resolveFirst;
 const first=new Promise(resolve=>{resolveFirst=resolve;});
 const mounts=new Map();
 const root={isConnected:true,querySelector:selector=>mounts.get(selector)||null};
 const mount={isConnected:true,dataset:{searchDiscoveryQuery:'old'},innerHTML:'pending'};
 mounts.set('[data-search-discovery-campaigns]',mount);
 const pending=loadSearchDiscovery(root,{list:()=>first},'old');
 mount.dataset.searchDiscoveryQuery='new';
 resolveFirst({ok:true,items:[campaign('stale')]});
 await pending;
 assert.equal(mount.innerHTML,'pending');
 mount.dataset.searchDiscoveryQuery='new';
 await loadSearchDiscovery(root,{list:async()=>{throw new Error('offline');}},'new');
 assert.equal(mount.innerHTML,'');
});

test('search page appends discovery after a complete political analysis and also after empty post results',async()=>{
 const political=await renderSearchPage({query:'정치인',politicians:{mediaSpread:async()=>({ok:true,matches:[{}],target:{kind:'person'}})},content:{}});
 assert.ok(political.lastIndexOf('search-discovery')>political.lastIndexOf('spread-'));
 const empty=await renderSearchPage({query:'없음',politicians:{mediaSpread:async()=>({ok:true,matches:[],target:{kind:'none'}})},content:{list:async()=>[]}});
 assert.ok(empty.indexOf('일치하는 결과가 없습니다')<empty.indexOf('search-discovery'));
});
