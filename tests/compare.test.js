import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';
import { createPoliticianService } from '../src/core/politicians.js';

const profiles=Array.from({length:6},(_,index)=>({
  id:`assembly-${String(index+1).padStart(3,'0')}`,
  type:'assembly',
  roleLabel:'국회의원',
  name:['김민석','강민국','강준현','강훈식','고동진','곽규택'][index],
  party:index%2?'국민의힘':'더불어민주당',
  jurisdiction:`선거구 ${index+1}`,
  terms:`${index+1}선`,
  committee:`위원회 ${index+1}`,
  photo:index<2?{localPath:`/assets/politicians/assembly-00${index+1}.jpg`,focus:'50% 28%'}:null
}));

const service={
  list:async()=>({ok:true,items:profiles,total:profiles.length,hasMore:false}),
  search:async query=>({ok:true,items:profiles.filter(profile=>`${profile.name} ${profile.party} ${profile.jurisdiction}`.includes(query)),total:profiles.length}),
  get:async id=>{
    const item=profiles.find(profile=>profile.id===id);
    return item?{ok:true,item}:{ok:false,error:'NOT_FOUND'};
  }
};

test('anonymous comparison is strictly 1:1 and ignores a third selected id',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001,assembly-002,assembly-003',null);
  assert.match(html,/data-compare-role="public"/);
  assert.match(html,/data-compare-limit="2"/);
  assert.equal((html.match(/data-compare-slot/g)||[]).length,2);
  assert.match(html,/data-compare-selected="assembly-001"/);
  assert.match(html,/data-compare-selected="assembly-002"/);
  assert.doesNotMatch(html,/data-compare-selected="assembly-003"/);
  assert.match(html,/정치인 1:1 비교/);
});

test('member comparison uses the same public two-person limit',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001,assembly-002,assembly-003',{authenticated:true,user:{role:'member'}});
  assert.match(html,/data-compare-role="public"[^>]*data-compare-limit="2"/);
  assert.equal((html.match(/data-compare-slot/g)||[]).length,2);
});

test('admin comparison accepts two to five and renders five simultaneous slots',async()=>{
  const ids=profiles.map(profile=>profile.id).join(',');
  const html=await renderPoliticianCompare(service,`/compare?ids=${ids}`,{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-compare-role="admin"/);
  assert.match(html,/data-compare-limit="5"/);
  assert.equal((html.match(/data-compare-slot/g)||[]).length,5);
  assert.equal((html.match(/data-compare-selected=/g)||[]).length,5);
  assert.doesNotMatch(html,/data-compare-selected="assembly-006"/);
  assert.match(html,/관리자 다중 비교/);
  assert.match(html,/최대 5명/);
});

test('empty comparison preserves role capacity layout without fake values',async()=>{
  const publicHtml=await renderPoliticianCompare(service,'/compare',null);
  const adminHtml=await renderPoliticianCompare(service,'/compare',{user:{role:'admin'}});
  assert.equal((publicHtml.match(/data-compare-slot/g)||[]).length,2);
  assert.equal((adminHtml.match(/data-compare-slot/g)||[]).length,5);
  assert.equal((publicHtml.match(/data-compare-search-form/g)||[]).length,2);
  assert.equal((adminHtml.match(/data-compare-search-form/g)||[]).length,5);
  assert.match(publicHtml,/type="search"/);
  assert.match(publicHtml,/정치인 이름·정당·지역 검색/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/politician-compare-empty-mark|>＋<|아래 정치인 목록에서/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/politician-compare-picker|ASSEMBLY DIRECTORY|국회의원 선택/);
  assert.match(adminHtml,/세부 데이터 연결 후 표시/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/당대표 전환·다채널 확산형|NOW INDEX[^<]*84|JCS 지수[^<]*84/);
});

test('comparison keeps the approved selected profile card and remove route',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001',{user:{role:'admin'}});
  assert.match(html,/김민석/);
  assert.match(html,/더불어민주당/);
  assert.match(html,/선거구 1/);
  assert.match(html,/위원회 1/);
  assert.match(html,/data-compare-remove="assembly-001"/);
  assert.match(html,/프로필·사진 데이터만 표시/);
});

test('search results stay inside the active empty slot and add a politician to the existing route',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001&q=강&slot=2',{user:{role:'admin'}});
  assert.equal((html.match(/data-compare-search-results/g)||[]).length,1);
  assert.match(html,/강민국/);
  assert.match(html,/data-compare-add="assembly-002"/);
  assert.match(html,/data-layout-route="\/compare\?ids=assembly-001%2Cassembly-002"/);
  assert.doesNotMatch(html,/politician-compare-picker/);
});

test('politician search covers every category and matches name, party, region or office',async()=>{
  const store=await import('../lib/politician-store.js');
  assert.equal(typeof store.searchPoliticianProfiles,'function');
  const groups={
    assembly:[profiles[0]],
    metropolitan:[{...profiles[1],id:'metropolitan-001',type:'metropolitan',name:'오세훈',office:'서울특별시장',jurisdiction:'서울'}],
    basic:[{...profiles[2],id:'basic-001',type:'basic',name:'정원오',office:'성동구청장',jurisdiction:'서울 성동구'}]
  };
  assert.deepEqual(store.searchPoliticianProfiles(groups,'서울',10).map(item=>item.id),['metropolitan-001','basic-001']);
  assert.deepEqual(store.searchPoliticianProfiles(groups,'더불어민주당',10).map(item=>item.id),['assembly-001','basic-001']);
  assert.deepEqual(store.searchPoliticianProfiles(groups,'성동구청장',10).map(item=>item.id),['basic-001']);
});

test('politician client sends an encoded all-category search request',async()=>{
  const originalFetch=globalThis.fetch;
  let requested='';
  globalThis.fetch=async url=>{requested=String(url);return {ok:true,json:async()=>({ok:true,items:[]})};};
  try{
    const result=await createPoliticianService().search('서울 시장',12);
    assert.equal(result.ok,true);
    assert.equal(requested,'/api/v3/politicians?q=%EC%84%9C%EC%9A%B8%20%EC%8B%9C%EC%9E%A5&limit=12');
  }finally{globalThis.fetch=originalFetch;}
});

test('embedded compare search has a readable slot-local result layer',async()=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_14 · EMBEDDED POLITICIAN COMPARE SEARCH');
  assert.ok(start>=0);
  const layer=css.slice(start);
  assert.match(layer,/\.politician-compare-slot-search/);
  assert.match(layer,/\.politician-compare-search-results/);
  assert.match(layer,/input\[type="search"\]/);
  const sub14=[...layer.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter(match=>Number(match[1])<14);
  assert.deepEqual(sub14.map(match=>match[0]),[]);
});
