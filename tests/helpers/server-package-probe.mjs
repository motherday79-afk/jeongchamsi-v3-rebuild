// Only the external Redis transport is replaced. The packaged API entry,
// storage readers, services and HTTP handlers all execute from the trace.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=pathToFileURL(process.argv[2]+'/');
process.env.JCS_REBUILD_REDIS_REST_URL='https://redis.fixture.invalid';
process.env.JCS_REBUILD_REDIS_REST_TOKEN='test-only';
const {INTELLIGENCE_KEYS}=await import(new URL('lib/intelligence-keys.js',root));
const records=new Map([
 ['jcsr2:home-banner:v1',JSON.stringify({url:'https://images.fixture.invalid/sidebar.webp',alt:'저장된 배너',designVersion:'upload'})],
 ['jcsr2:home-banner:v1:hero',JSON.stringify({url:'https://images.fixture.invalid/hero.webp',alt:'저장된 가로 배너',designVersion:'upload'})],
 ['jcsr2:content:v1:community',JSON.stringify({featuredCageId:'cage-fixture',items:[{id:'cage-fixture',title:'저장된 케이지 제목',published:true,cageEnabled:true,createdAt:'2026-09-14'}]})],
 ['jcsr2:politicians:v1:assembly',JSON.stringify({items:[{id:'assembly-fixture',name:'검증용 인물',party:'검증 정당',office:'검증 직책'}]})],
 [INTELLIGENCE_KEYS.publicPointer,'fixture-snapshot'],
 [INTELLIGENCE_KEYS.rankings('fixture-snapshot'),JSON.stringify({snapshot:'fixture-snapshot',overall:[{id:'assembly-fixture',rank:1}],byId:{'assembly-fixture':{rank:1}}})]
]);
const original=[...records],commands=[];
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://redis.fixture.invalid','No external network in verification');
 const command=JSON.parse(options.body);commands.push(command);
 assert.ok(['GET','MGET'].includes(command[0]),'Homepage reads cannot mutate stored data: '+command[0]);
 const result=command[0]==='GET'?(records.get(command[1])??null):command.slice(1).map(key=>records.get(key)??null);
 return {ok:true,status:200,json:async()=>({result})};
};
const {default:handler}=await import(new URL('api/gateway.js',root));
async function request(route){
 let response;
 const res={statusCode:0,setHeader(){},end(body){response=JSON.parse(body)}};
 await handler({method:'GET',url:'/api/v3/'+route,headers:{host:'fixture.invalid'}},res);
 assert.equal(res.statusCode,200,JSON.stringify(response));assert.equal(response.ok,true);
 return response;
}
const health=await request('health');assert.match(health.version,/^JCS_0_0_31_/);
const banner=await request('home/banner');assert.equal(banner.banner.alt,'저장된 배너');assert.equal(banner.banner.hero.alt,'저장된 가로 배너');
const community=await request('content?domain=community');assert.equal(community.data.featuredCageId,'cage-fixture');assert.equal(community.data.items[0].title,'저장된 케이지 제목');
const rankings=await request('politicians?ranking=overall');assert.equal(rankings.published,true);assert.equal(rankings.items[0].name,'검증용 인물');assert.equal(rankings.items[0].rank,1);
assert.deepEqual([...records],original);
assert.ok(commands.length>0);
console.log('health,banner,community,rankings passed; read-only fixture data preserved');
