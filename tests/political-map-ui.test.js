import test from 'node:test';import assert from 'node:assert/strict';
import {matchDistrict,mapSvg,renderPoliticalMapContent} from '../src/ui/political-map.js';
import {POLITICIAN_SEED} from '../lib/politician-seed.generated.js';
import {MAP_DISTRICTS,MAP_REGIONS} from '../src/data/political-map-geometry.js';
import {buildShareMetadata} from '../lib/share-metadata.js';
const items=Object.values(POLITICIAN_SEED.profiles).flat(),state={type:'all',region:'all',party:'all',q:'',limit:24,zoom:false,district:''};
test('district matching distinguishes suffix-colliding cities and wards',()=>{
 for(const [region,name,jurisdiction] of [['부산','서구','부산광역시 서구'],['경기','양주시','경기도 양주시'],['경기','수원시장안구','경기도 수원시'],['경기','남양주시','경기도 남양주시']])assert.equal(matchDistrict({region,name},items)?.jurisdiction,jurisdiction);
 assert.equal(matchDistrict({region:'인천',name:'서해구'},items),undefined);
 const matched=new Set(MAP_DISTRICTS.map(d=>matchDistrict(d,items)?.id));assert.equal(items.filter(p=>p.type==='basic'&&matched.has(p.id)).length,226);
});
test('flag and district views remain distinct and map selects a real subset',()=>{
 const flags=mapSvg(items,state,false);assert.equal((flags.match(/class="pmap-flag"/g)||[]).length,16);
 const districts=mapSvg(items,{...state,type:'basic'},false);assert.equal((districts.match(/data-map-district=/g)||[]).length,MAP_DISTRICTS.length);assert.ok(!districts.includes('class="pmap-flag"'));
 const person=items.find(p=>p.type==='basic'&&p.jurisdiction==='경기도 수원시');const html=renderPoliticalMapContent({items,basis:'등록 정보',asOf:'2026-10-02'}, {...state,type:'basic',region:'경기',district:person.id},false);assert.equal((html.match(/href="\/person\//g)||[]).length,1);assert.ok(html.includes(person.name));
 assert.equal(new Set(MAP_REGIONS.map(x=>x.name)).size,16);
});
test('map has dedicated social preview',async()=>{const meta=await buildShareMetadata('/political-map');assert.match(meta.title,/정치지도/);assert.equal(meta.image,'https://www.jeongchamsi.com/assets/og/jcs-political-map-391.png');});
test('detached home snapshot still receives async map data and keeps one event binding',async()=>{
 const {mountPoliticalMap}=await import('../src/ui/political-map.js');const original=globalThis.fetch;let resolve;globalThis.fetch=()=>new Promise(r=>{resolve=r;});const content={innerHTML:''},listeners=[];const root={dataset:{politicalMap:'home'},isConnected:false,querySelector:()=>content,addEventListener:name=>listeners.push(name)};
 try{const pending=mountPoliticalMap(root);resolve({ok:true,json:async()=>({ok:true,items,asOf:'2026-10-02',basis:'등록 정보'})});await pending;assert.match(content.innerHTML,/pmap-preview/);await mountPoliticalMap(root);assert.equal(listeners.filter(x=>x==='click').length,1);}finally{globalThis.fetch=original;}
});
test('overall map uses separate solid party flags and omits the home ratio caption',()=>{
 const svg=mapSvg(items,state,true);assert.ok((svg.match(/class="pmap-party-flag"/g)||[]).length>16);assert.ok(svg.includes('data-flag-party="더불어민주당"'));assert.ok(!svg.includes('<linearGradient'));
 const html=renderPoliticalMapContent({items,basis:'등록 정보',asOf:'2026-10-02'},state,true);assert.ok(!html.includes('pmap-mini-note'));
});
