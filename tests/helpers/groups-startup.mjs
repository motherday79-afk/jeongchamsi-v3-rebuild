// Real application/module graph with a Node DOM boundary; no browser/layout emulation.
import assert from 'node:assert/strict';
import {createGroupService} from '../../lib/group-service.js';
const service=createGroupService({command:async()=>[]});
const renders=[],calls=[],attributes={},app={setAttribute(k,v){attributes[k]=v},get innerHTML(){return renders.at(-1)||''},set innerHTML(value){renders.push(value)},firstElementChild:{}};
const classList={add(){},remove(){},toggle(){},contains(){return false}};
globalThis.document={getElementById:id=>id==='app'?app:null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}},classList},body:{classList},activeElement:null};
globalThis.location=new URL(process.argv[3]||'/groups','https://fixture.invalid');
globalThis.window={location,history:{state:null,replaceState(s){this.state=s},pushState(s){this.state=s}},addEventListener(){},scrollTo(){},innerWidth:1280,scrollX:0,scrollY:0,matchMedia:()=>({matches:false})};
globalThis.matchMedia=window.matchMedia;globalThis.localStorage={getItem(){return null},setItem(){}};globalThis.sessionStorage=localStorage;
globalThis.fetch=async(value,options={})=>{
 calls.push(String(value));assert.ok(!options.method||options.method==='GET','guest example navigation must not write');
 const url=new URL(value,location.origin);let data={ok:true,items:[],data:{items:[]}};
 if(url.pathname==='/api/v3/groups')data=url.searchParams.has('id')?await service.get(url.searchParams.get('id'),null):await service.list(null);
 if(String(value).includes('user/session'))data={ok:true,authenticated:false,user:null};
 if(String(value).includes('stats'))data={ok:true,members:7};
 if(String(value).includes('site/footer-info'))data={ok:true,info:{}};
 return {ok:true,status:200,json:async()=>data};
};
await import(process.argv[2]);
assert.equal(attributes['data-jcs-ready'],'true');assert.match(app.innerHTML,/class="site-shell"/);assert.match(app.innerHTML,/groups-page/);assert.doesNotMatch(app.innerHTML,/정참시를 불러오고 있습니다/);
assert.ok(calls.some(url=>url.startsWith('/api/v3/groups?')));assert.ok(!calls.includes('/api/v3/home/banner'));
if(location.pathname==='/groups'){assert.match(app.innerHTML,/우리동네 정책연구회/);assert.match(app.innerHTML,/골목 문화예술 모임/);assert.match(app.innerHTML,/퇴근 후 한 바퀴/);}
else{assert.match(app.innerHTML,/읽기 전용/);assert.doesNotMatch(app.innerHTML,/data-group-(?:action|post|event|settings|member|review)-form/);}
console.log('Groups guest route, API and readonly seed integration passed');
