import test from 'node:test';import assert from 'node:assert/strict';
import {articleCurationRequest} from '../lib/article-curation-http.js';
const url=new URL('https://www.jeongchamsi.com/api/v3/article-curation?personId=p1'),staff={id:'staff',role:'admin',status:'active'};
const make=()=>{let writes=0;return {get writes(){return writes;},url,user:staff,getPerson:async id=>({id,name:'테스트'}),getReport:async()=>({raw:{news:{items:[{title:'기사',url:'https://example.com/a'}]}}}),service:{read:async()=>({}),mutate:async()=>{writes++;return {};},editorData:(person,candidates)=>({ok:true,person,candidates})}};};
test('only staff and superadmin can edit; regular platinum and suspended users cannot',async()=>{
 for(const user of [null,{id:'m',role:'member'},{id:'p',role:'platinum'},{...staff,status:'suspended'}]){const d=make();assert.equal((await articleCurationRequest({method:'GET'},{...d,user})).status,403);assert.equal(d.writes,0);}
 assert.equal((await articleCurationRequest({method:'GET'},make())).status,200);
});
test('mutation rejects cross-origin and staff restoration before writing',async()=>{
 const d=make();assert.equal((await articleCurationRequest({method:'POST',headers:{origin:'https://evil.example'},body:{personId:'p1',operation:'exclude'}},d)).status,403);
 assert.equal((await articleCurationRequest({method:'POST',headers:{origin:url.origin},body:{personId:'p1',operation:'restore'}},d)).status,403);assert.equal(d.writes,0);
});
test('immediate changes return refreshed editor data, superadmin may restore',async()=>{
 const d=make();const response=await articleCurationRequest({method:'POST',headers:{origin:url.origin},body:{personId:'p1',operation:'place',articleKey:'k',slot:'brand:0'}},d);assert.equal(response.status,200);assert.equal(d.writes,1);assert.equal(response.body.candidates.length,1);
 const r=await articleCurationRequest({method:'POST',headers:{origin:url.origin},body:{personId:'p1',operation:'restore',articleKey:'k'}},{...d,user:{...staff,id:'admin'}});assert.equal(r.status,200);
});
