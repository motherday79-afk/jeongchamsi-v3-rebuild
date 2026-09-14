// Full application execution with an in-memory DOM boundary and deterministic
// read-only HTTP responses. This is not a browser or a layout test.
import assert from 'node:assert/strict';
const renders=[],calls=[],app={get innerHTML(){return renders.at(-1)||''},set innerHTML(value){renders.push(value)},firstElementChild:{}};
const classList={add(){},remove(){},toggle(){},contains(){return false}};
globalThis.document={getElementById:id=>id==='app'?app:null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}},classList},body:{classList},activeElement:null};
globalThis.location=new URL('https://fixture.invalid/');
globalThis.window={location,history:{state:null,replaceState(s){this.state=s},pushState(s){this.state=s}},addEventListener(){},scrollTo(){},innerWidth:1280,scrollX:0,scrollY:0,matchMedia:()=>({matches:false})};
globalThis.matchMedia=window.matchMedia;
globalThis.localStorage={getItem(){return null},setItem(){}};
globalThis.sessionStorage=localStorage;
globalThis.fetch=async(url,options={})=>{
 calls.push(String(url));assert.ok(!options.method||options.method==='GET','startup must not write as guest');
 let data={ok:true,items:[],data:{items:[]}},status=200;
 if(String(url).includes('user/session'))data={ok:true,authenticated:false,user:null};
 if(String(url).includes('stats'))data={ok:true,members:7};
 if(String(url).includes('site/footer-info'))data={ok:true,info:{}};
 if(String(url).includes('home/banner')){
  const state=process.argv[3];
  data=state==='failed'?{ok:false,error:'BANNER_UNAVAILABLE'}:{ok:true,banner:state==='empty'?null:{url:'/assets/banners/sidebar-pc-117.webp',alt:'등록한 배너',designVersion:'upload'}};
  if(state==='failed')status=503;
 }
 return {ok:status===200,status,json:async()=>data};
};
await import(process.argv[2]);
assert.ok(calls.includes('/api/v3/home/banner'));
assert.match(renders[0],/정참시를 불러오고 있습니다/);
assert.match(app.innerHTML,/class="site-shell"/);
assert.match(app.innerHTML,/class="product-home-wrap"/);
assert.doesNotMatch(app.innerHTML,/정참시를 불러오고 있습니다/);
