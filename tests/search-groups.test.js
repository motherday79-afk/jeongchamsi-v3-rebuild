import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSearchDiscovery,renderSearchDiscovery} from '../src/views/search-discovery.js';
import {createGroupClient} from '../src/core/group-client.js';
import {createGroupService} from '../lib/group-service.js';
import {groupRequest} from '../lib/group-http.js';

const group=(id,extra={})=>({id,name:`모임 ${id}`,category:'culture',description:'함께하는 문화 활동',region:'서울',status:'approved',visibility:'public',isExample:false,coverUrl:'',...extra});
function surface(){
 const campaign={isConnected:true,dataset:{},innerHTML:''};
 const groups={isConnected:true,dataset:{},innerHTML:''};
 const root={isConnected:true,querySelector:selector=>({'[data-search-discovery-campaigns]':campaign,'[data-search-discovery-groups]':groups}[selector]||null)};
 return {root,campaign,groups};
}
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const idleCampaigns={list:async()=>({ok:true,items:[]})};

test('recommendations exclude restricted or unapproved groups, deduplicate and mark example fillers',async()=>{
 const {root,groups}=surface();
 const input={ok:true,items:[null,group('pending',{status:'pending'}),group('closed',{status:'closed'}),group('invite',{visibility:'invite'}),group('members',{visibility:'members'}),group('public',{name:'<고래> & 모임'}),group('public')],examples:[group('example-a',{isExample:true}),group('example-b',{isExample:true}),group('example-c',{isExample:true})]};
 const before=structuredClone(input);
 await loadSearchDiscovery(root,idleCampaigns,'',{groups:{list:async options=>{assert.deepEqual(options,{view:'browse',category:'all',q:'',page:1,visibility:'public'});return input;}},session:{authenticated:true,user:{nickname:'고등어'}}});
 assert.equal((groups.innerHTML.match(/class="search-discovery-group"/g)||[]).length,3);
 assert.match(groups.innerHTML,/고등어님께 추천하는 모임입니다\./);
 assert.match(groups.innerHTML,/&lt;고래&gt; &amp; 모임/);
 assert.equal((groups.innerHTML.match(/href="\/groups\/public"/g)||[]).length,1);
 assert.doesNotMatch(groups.innerHTML,/\/groups\/(pending|closed|invite|members|example-c)"/);
 assert.equal((groups.innerHTML.match(/예시 모임/g)||[]).length,2);
 assert.deepEqual(input,before);
});

test('three real public groups replace examples and guest headings do not reuse an account name',async()=>{
 const {root,groups}=surface();
 await loadSearchDiscovery(root,idleCampaigns,'',{groups:{list:async()=>({ok:true,items:[group('a'),group('b'),group('c'),group('d')],examples:[group('example-a',{isExample:true})]})},session:{authenticated:false,user:{nickname:'이전회원'}}});
 assert.match(groups.innerHTML,/정참시가 추천하는 모임입니다\./);
 assert.equal((groups.innerHTML.match(/class="search-discovery-group"/g)||[]).length,3);
 assert.doesNotMatch(groups.innerHTML,/이전회원|예시 모임|\/groups\/d"/);
});

test('group recommendations appear while campaigns are still loading',async()=>{
 const {root,groups}=surface(),campaign=deferred();
 const pending=loadSearchDiscovery(root,{list:()=>campaign.promise},'',{groups:{list:async()=>({ok:true,items:[group('ready')]})},session:async()=>({authenticated:true,user:{nickname:'고래아빠'}})});
 await new Promise(resolve=>setImmediate(resolve));
 const visible=groups.innerHTML;
 campaign.resolve({ok:true,items:[]});await pending;
 assert.match(visible,/고래아빠님께 추천하는 모임입니다\./);
 assert.match(visible,/\/groups\/ready/);
});

test('older recommendation responses cannot overwrite a newer account or search route',async()=>{
 const {root,groups}=surface(),old=deferred();
 const before=loadSearchDiscovery(root,idleCampaigns,'old',{groups:{list:()=>old.promise},session:{authenticated:true,user:{nickname:'이전회원'}}});
 await loadSearchDiscovery(root,idleCampaigns,'new',{groups:{list:async()=>({ok:true,items:[group('new')]})},session:{authenticated:true,user:{nickname:'관리자'}}});
 old.resolve({ok:true,items:[group('old')]});await before;
 assert.match(groups.innerHTML,/관리자님께 추천하는 모임입니다\./);
 assert.match(groups.innerHTML,/\/groups\/new/);
 assert.doesNotMatch(groups.innerHTML,/이전회원|\/groups\/old/);
});

test('failed group requests clear stale recommendations without removing the shop or campaigns',async()=>{
 const {root,groups,campaign}=surface();groups.innerHTML='old';
 await loadSearchDiscovery(root,{list:async()=>({ok:true,items:[{id:'campaign-one',headline:'진행 캠페인',category:'politics'}]})},'',{groups:{list:async()=>{throw new Error('offline');}},session:{authenticated:false}});
 assert.equal(groups.innerHTML,'');
 assert.match(campaign.innerHTML,/campaign-one/);
 const html=renderSearchDiscovery();
 assert.ok(html.indexOf('data-search-discovery-groups')>html.indexOf('data-search-discovery-shop'));
 assert.equal((html.match(/class="search-discovery-product"/g)||[]).length,4);
});

test('detached recommendation mounts ignore late results',async()=>{
 const {root,groups}=surface(),request=deferred();
 const pending=loadSearchDiscovery(root,idleCampaigns,'',{groups:{list:()=>request.promise}});
 groups.isConnected=false;groups.innerHTML='detached';
 request.resolve({ok:true,items:[group('late')]});await pending;
 assert.equal(groups.innerHTML,'detached');
});

test('public recommendation filtering runs before pagination through the real client, HTTP and service',async()=>{
 const records=[
  ...Array.from({length:12},(_,i)=>group(`members-${i}`,{visibility:'members',updatedAt:'2026-09-15'})),
  ...['real-a','real-b','real-c'].map(id=>group(id,{updatedAt:'2026-09-14'})),
  group('pending',{status:'pending',updatedAt:'2026-09-16'}),
  group('invite',{visibility:'invite',updatedAt:'2026-09-16'})
 ];
 const service=createGroupService({command:async([operation])=>{assert.equal(operation,'HVALS');return records.map(row=>JSON.stringify(row));}});
 const client=createGroupClient({fetch:async(url,options)=>{
  const r=await groupRequest({method:options.method||'GET'},{service,url:new URL(url,'https://fixture.invalid')});
  return {ok:r.status===200,status:r.status,json:async()=>r.data};
 }});
 // Ordinary browsing must still show members-only introductions.
 const browse=await client.list();assert.equal(browse.total,15);assert.ok(browse.items.every(item=>item.visibility==='members'));
 const {root,groups}=surface();
 await loadSearchDiscovery(root,idleCampaigns,'',{groups:client,session:{authenticated:false}});
 for(const id of ['real-a','real-b','real-c'])assert.match(groups.innerHTML,new RegExp(`/groups/${id}`));
 assert.doesNotMatch(groups.innerHTML,/예시 모임|\/groups\/members-|\/groups\/(pending|invite)/);
});
