import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';

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
  assert.match(publicHtml,/비교 인물을 선택해 주세요/);
  assert.match(adminHtml,/세부 데이터 연결 후 표시/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/당대표 전환·다채널 확산형|NOW INDEX[^<]*84|JCS 지수[^<]*84/);
});

test('comparison exposes real profile fields and add/remove routes only',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001',{user:{role:'admin'}});
  assert.match(html,/김민석/);
  assert.match(html,/더불어민주당/);
  assert.match(html,/선거구 1/);
  assert.match(html,/위원회 1/);
  assert.match(html,/data-compare-remove="assembly-001"/);
  assert.match(html,/data-compare-add="assembly-002"/);
  assert.match(html,/프로필·사진 데이터만 표시/);
});
