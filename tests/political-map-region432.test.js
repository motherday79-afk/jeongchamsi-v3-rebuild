import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRegionStage,districtMembers} from '../src/ui/political-map-region.js';
import {renderPoliticalMapContent} from '../src/ui/political-map.js';
const items=[{id:'a',name:'수원 의원',type:'assembly',region:'경기',jurisdiction:'경기도 수원시 갑',party:'더불어민주당'},{id:'b',name:'수원 시장',type:'basic',region:'경기',jurisdiction:'경기도 수원시',party:'국민의힘'},{id:'c',name:'양주 시장',type:'basic',region:'경기',jurisdiction:'경기도 양주시',party:'국민의힘'},{id:'d',name:'남양주 시장',type:'basic',region:'경기',jurisdiction:'경기도 남양주시',party:'더불어민주당'},{id:'e',name:'서울 의원',type:'assembly',region:'서울',jurisdiction:'서울특별시 종로구',party:'무소속'}];
const state={region:'경기',type:'all',party:'all',q:'',limit:24,local:'',district:''};
test('regional stage retains category, totals and only region people',()=>{
 const html=renderPoliticalMapContent({items},state,false);assert.match(html,/pmap-broadcast/);assert.match(html,/수원 의원/);assert.doesNotMatch(html,/서울 의원/);
 const basic=renderRegionStage({items},{...state,type:'basic'},()=> '#245cce');assert.doesNotMatch(basic,/수원 의원/);assert.match(basic,/양주 시장/);
});
test('local filtering separates similarly named cities and does not assign city-wide constituencies to individual wards',()=>{
 assert.deepEqual(districtMembers(items,{region:'경기',name:'양주시'}).map(p=>p.id),['c']);
 assert.deepEqual(districtMembers(items,{region:'경기',name:'수원시장안구'}).map(p=>p.id),['b']);
 const html=renderRegionStage({items},{...state,type:'basic',local:'양주시'},()=> '#245cce');assert.match(html,/양주 시장/);assert.doesNotMatch(html,/남양주 시장/);
});
test('party filter narrows people without changing scoreboard totals and names are escaped',()=>{
 const html=renderRegionStage({items:[...items,{id:'x',name:'<script>bad</script>',type:'basic',region:'경기',jurisdiction:'경기도 광주시',party:'국민의힘'}]},{...state,party:'국민의힘'},()=> '#245cce');
 assert.doesNotMatch(html,/수원 의원|<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/더불어민주당/);
});
