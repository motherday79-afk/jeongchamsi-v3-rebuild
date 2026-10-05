import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_REGIONS,MAP_DISTRICTS} from '../src/data/political-map-geometry.js';
import {districtLabelGroups,layoutRegionLabels,labelOverlap,minimumRegionLabelZoom} from '../src/ui/political-map-labels.js';
import {renderRegionStage} from '../src/ui/political-map-region.js';
const districts=MAP_DISTRICTS.filter(d=>d.region==='경기');
const state={region:'경기',type:'all',party:'all',q:'',limit:24,local:'',district:'',city:''};
test('province names group city wards while every district remains reachable',()=>{
 const groups=districtLabelGroups(districts);
 assert.equal(groups.length,31);
 assert.deepEqual(groups.find(g=>g.name==='수원시').members.map(d=>d.name).sort(),['수원시장안구','수원시권선구','수원시팔달구','수원시영통구'].sort());
 const wards=districtLabelGroups(districts,'수원시');
 assert.equal(wards.length,4);
 assert.deepEqual(wards.map(g=>g.label).sort(),['장안구','권선구','팔달구','영통구'].sort());
 assert.equal(districtLabelGroups(MAP_DISTRICTS.filter(d=>d.region==='서울')).length,25);
});
test('Gyeonggi labels stay over their own geography without overlapping',()=>{
 const region=MAP_REGIONS.find(r=>r.name==='경기'),[x,y,w,h]=region.bounds;
 const rows=layoutRegionLabels(districtLabelGroups(districts),[x-4,y-4,w+8,h+8],680,700);
 assert.equal(rows.length,31);
 for(const row of rows){
  assert.ok(row.inside,`${row.name} must stay inside its city`);
  assert.ok(row.x-row.w/2>=0&&row.x+row.w/2<=680);
  assert.ok(row.y-row.h/2>=0&&row.y+row.h/2<=700);
 }
 const overlaps=rows.flatMap((a,i)=>rows.slice(i+1).filter(b=>labelOverlap(a,b)).map(b=>a.name+'/'+b.name));
 assert.deepEqual(overlaps,[]);
});
test('city zoom keeps the city delegation and exposes ward selection',()=>{
 const items=[{id:'a',name:'수원 의원',type:'assembly',region:'경기',jurisdiction:'경기 수원시갑',party:'더불어민주당'},{id:'b',name:'양주 시장',type:'basic',region:'경기',jurisdiction:'경기 양주시',party:'국민의힘'}];
 const html=renderRegionStage({items},{...state,city:'수원시'},()=> '#245cce');
 assert.match(html,/data-label-city="수원시"/);
 assert.match(html,/data-map-city-back/);
 assert.match(html,/수원 의원/);
 assert.doesNotMatch(html,/양주 시장/);
 assert.match(html,/data-map-local="수원시영통구"/);
 assert.match(html,/data-map-detail-zoom="in"/);
});
test('all provinces have a legible default scale with no overlapping names',()=>{
 for(const region of MAP_REGIONS){
  const groups=districtLabelGroups(MAP_DISTRICTS.filter(d=>d.region===region.name));
  const [x,y,w,h]=region.bounds,box=[x-4,y-4,w+8,h+8],zoom=minimumRegionLabelZoom(groups,box);
  const rows=layoutRegionLabels(groups,box,680*zoom,700*zoom);
  assert.ok(rows.every(r=>r.inside),region.name+' labels stay in their region');
  assert.ok(!rows.some((a,i)=>rows.slice(i+1).some(b=>labelOverlap(a,b))),region.name+' names must not overlap');
 }
});
test('map clicks drill into a city, select a ward and return to the province',async()=>{
 const {mountPoliticalMap}=await import('../src/ui/political-map.js?labels450');
 const beforeFetch=globalThis.fetch,beforeLocation=globalThis.location;
 const items=[{id:'a',name:'수원 의원',type:'assembly',region:'경기',jurisdiction:'경기 수원시갑',party:'더불어민주당'},{id:'b',name:'양주 시장',type:'basic',region:'경기',jurisdiction:'경기 양주시',party:'국민의힘'}];
 globalThis.fetch=async()=>({ok:true,json:async()=>({ok:true,items})});
 globalThis.location={search:'?region='+encodeURIComponent('경기')};
 const handlers={},content={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
 const root={dataset:{politicalMap:'detail'},isConnected:false,querySelector:()=>content,addEventListener:(type,fn)=>{handlers[type]=fn;}};
 const click=async(attr,dataset={})=>handlers.click({target:{closest:()=>({dataset,hasAttribute:name=>name===attr})}});
 try{
  await mountPoliticalMap(root);
  await click('data-map-city',{mapCity:'수원시'});
  assert.match(content.innerHTML,/data-label-city="수원시"/);assert.doesNotMatch(content.innerHTML,/양주 시장/);
  await click('data-map-local',{mapLocal:'수원시영통구'});
  assert.match(content.innerHTML,/data-selected-local="수원시영통구"/);
  await click('data-map-city-back');
  assert.match(content.innerHTML,/data-label-city=""/);assert.match(content.innerHTML,/양주 시장/);
 }finally{globalThis.fetch=beforeFetch;if(beforeLocation===undefined)delete globalThis.location;else globalThis.location=beforeLocation;}
});
