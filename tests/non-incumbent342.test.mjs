import test from 'node:test';
import assert from 'node:assert/strict';
import {readPoliticianType,readPoliticianPhotos,getPolitician,searchPoliticianProfiles} from '../lib/politician-store.js';
import {collectionProfileFor} from '../lib/collection-profile.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {buildOperationalRankings} from '../lib/operational-ranking.js';
import {renderPoliticianDirectory,renderPoliticianDetail} from '../src/views/politicians.js';
const command=async()=>null;
test('editor overrides take precedence over fallback profiles and portraits',async()=>{
 const edited={id:'nonincumbent-001',type:'nonincumbent',name:'홍준표',office:'수정한 직함'};
 const photos=await readPoliticianPhotos(async args=>args[1]===TARGET_KEYS.politicianPhotoOverrides?JSON.stringify({items:{[edited.id]:{url:'/override.jpg'}}}):null);
 assert.equal(photos[edited.id].url,'/override.jpg');assert.ok(photos['nonincumbent-003'].localPath);
 const rows=await readPoliticianType(async()=>JSON.stringify({items:[edited]}),'nonincumbent');
 assert.equal(rows.length,1);assert.equal(rows[0].office,edited.office);
});
test('former minister Kim uses disambiguated collection terms',()=>{
 const person={id:'nonincumbent-002',name:'김문수'};
 assert.equal(collectionProfileFor(person).mode,'specified');
 assert.ok(collectionProfileFor(person).newsRegions.includes('고용노동부'));
 assert.equal(collectionProfileFor(person,{collectionProfile:{mode:'name'}}).mode,'name');
 assert.equal(collectionProfileFor({id:'nonincumbent-005',name:'유승민'}).mode,'specified');
});
test('twelve approved non-incumbents are available without reseeding existing office holders',async()=>{
 const rows=await readPoliticianType(command,'nonincumbent');
 assert.deepEqual(rows.map(p=>p.name),['홍준표','김문수','이낙연','황교안','유승민','김부겸','원희룡','조국','윤희숙','양향자','조응천','금태섭']);
 assert.equal((await getPolitician(command,rows[0].id)).id,rows[0].id);
 assert.equal(searchPoliticianProfiles({nonincumbent:rows},'이낙연')[0].name,'이낙연');
 assert.ok(rows.every(p=>!p.termStart&&!p.termEnd&&p.roleHistory.length));
 const photos=await readPoliticianPhotos(command);
 const {existsSync}=await import('node:fs');
 assert.ok(rows.every(p=>existsSync(new URL('..'+photos[p.id].localPath,import.meta.url))));
});
test('non-incumbents have their own category ranks and enter the combined ranking',async()=>{
 const rows=await readPoliticianType(command,'nonincumbent');
 const ranks=buildOperationalRankings(rows.map((p,i)=>({id:p.id,rankingInput:{searchTotal:100+i,searchStatus:'DIRECT',articleCount:10+i,sourceCount:2,newsStatus:'DIRECT',latestPublishedAt:'2026-09-28T00:00:00Z'}})),new Map(rows.map(p=>[p.id,p])),'test');
 assert.equal(Object.keys(ranks.byId).length,12);
 assert.ok(Object.values(ranks.byId).every(p=>p.type==='nonincumbent'&&p.categoryRank>0));
});
test('category and existing detail display former careers without an invented current term',async()=>{
 const rows=await readPoliticianType(command,'nonincumbent');assert.equal(rows.length,12);
 const list=await renderPoliticianDirectory({list:async(type)=>{assert.equal(type,'nonincumbent');return {ok:true,total:4,items:rows};}},'/now?type=nonincumbent');
 assert.match(list,/비현직 정치인 12명/);assert.match(list,/황교안/);assert.match(list,/금태섭/);
 for(const item of rows){
  const html=await renderPoliticianDetail(item.id,{get:async()=>({ok:true,item})});
  assert.match(html,/주요 경력/);assert.match(html,/비현직 정치인/);
  assert.doesNotMatch(html,/민선 9기 임기 시작|현 임기|관할 지역/);
 }
});
