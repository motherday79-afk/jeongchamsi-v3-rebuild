import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPoliticianCompare} from '../src/views/politician-compare.js';
const people=Array.from({length:4},(_,i)=>({id:'p'+i,name:'정치인 '+i,party:i%2?'정당 B':'정당 A',office:'국회의원'}));
const data=i=>({rank:{overall:i+1},algorithmVersion:'v1',diagnoses:[{id:'01',title:'브랜드',score:i?65:85,updatedAt:'2026-10-01',headline:'근거가 있는 요약',display:{kind:'brand',search:{pc:i?0:500,mobile:1000}}},{id:'07',title:'미디어',score:i?null:72,updatedAt:'2026-10-01',display:{kind:'media',articleCount:i?null:20,sourceCount:4}},{id:'09',title:'활동',score:60,display:{kind:'action',activityCount:12}}]});
const service={getForCompare:async id=>({ok:true,item:people.find(p=>p.id===id),intelligence:data(Number(id.slice(1)))}),get:async id=>({ok:true,item:people.find(p=>p.id===id)}),search:async()=>({ok:true,items:[]})};
test('results use a focused comparison board with aligned metrics and detail links',async()=>{
 const html=await renderPoliticianCompare(service,'/compare?ids=p0,p1&run=1',{user:{id:'admin',role:'admin'}});
 assert.match(html,/data-compare-board/);assert.match(html,/role="tablist"/);assert.match(html,/<table/);
 assert.match(html,/data-board-panel="overview"/);assert.match(html,/data-board-panel="diagnosis" hidden/);
 assert.match(html,/href="\/person\/p0"/);assert.doesNotMatch(html,/jcs-compare-person-cell|COMPETITOR RESPONSE PLAYBOOK|전략 처방/);
 assert.match(html,/자료 없음/);assert.match(html,/20<small>p/);
});
test('four people have aligned table column headers and results load only after request',async()=>{
 const html=await renderPoliticianCompare(service,'/compare?ids=p0,p1,p2,p3&run=1',{user:{id:'staff',role:'admin'}});
 assert.match(html,/--board-count:4/);assert.equal((html.match(/data-board-person=/g)||[]).length,16);
 const waiting=await renderPoliticianCompare(service,'/compare?ids=p0,p1',{user:{id:'admin',role:'admin'}});
 assert.doesNotMatch(waiting,/data-compare-board/);
});
test('partial failures do not present a misleading successful comparison',async()=>{
 const partial={...service,getForCompare:async id=>id==='p1'?{ok:false}:service.getForCompare(id)};
 const html=await renderPoliticianCompare(partial,'/compare?ids=p0,p1&run=1',{user:{id:'admin',role:'admin'}});
 assert.match(html,/data-compare-access-gate/);assert.doesNotMatch(html,/data-compare-board/);
});
import {boardRows,comparisonInsights,metricNumber} from '../src/views/comparison-board.js';
import {bindComparisonBoard} from '../src/ui/comparison-board.js';
test('zero is real data while missing values never become zero or generic scores',()=>{
 assert.equal(metricNumber(null),null);assert.equal(metricNumber(''),null);assert.equal(metricNumber(false),null);assert.equal(metricNumber(0),0);
 const entries=people.slice(0,2).map((item,i)=>({item,intelligence:data(i)}));
 assert.equal(boardRows(entries).attention.find(r=>r.id==='pc').value(entries[1]),0);
 assert.equal(boardRows(entries).attention.find(r=>r.id==='articles').value(entries[1]),null);
 assert.equal(comparisonInsights(entries)[0].gap,20);
 entries[1].intelligence.diagnoses[0].updatedAt='2026-09-30';assert.equal(comparisonInsights(entries).length,0);
 entries[1].intelligence.diagnoses[0].updatedAt='2026-10-01';entries[1].intelligence.algorithmVersion='v2';assert.equal(comparisonInsights(entries).length,0);
});
test('private payloads do not get repeated in the condensed board',async()=>{
 const srv={...service,getForCompare:async id=>{const r=await service.getForCompare(id);r.intelligence.prescriptions=[{title:'PRIVATE_RX'}];return r}};
 const html=await renderPoliticianCompare(srv,'/compare?ids=p0,p1&run=1',{user:{role:'admin',id:'admin'}});
 assert.doesNotMatch(html,/PRIVATE_RX/);
});
test('valid paid access keeps expiry protection attached to the entire new board',async()=>{
 const srv={...service,getForCompare:async id=>({...await service.getForCompare(id),accessTier:'admin',analysisAccess:{personId:id,active:true,serverNow:1000,expiresAt:999999}})};
 const html=await renderPoliticianCompare(srv,'/compare?ids=p0,p1&run=1',{user:{role:'member',id:'member'}});
 assert.match(html,/data-paid-analysis="compare"/);assert.match(html,/data-analysis-access/);
});
test('keyboard and clicks switch all people together and preserve horizontal position',()=>{
 const handlers={},root={addEventListener:(type,fn)=>handlers[type]=fn},panels=['overview','diagnosis'].map(id=>({dataset:{boardPanel:id},hidden:id!=='overview',scroll:{scrollLeft:id==='overview'?124:0},querySelector(){return this.scroll}}));
 const tabs=panels.map(p=>({dataset:{boardTab:p.dataset.boardPanel},attrs:{},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true}}));
 const board={querySelectorAll:s=>s==='[data-board-tab]'?tabs:panels,querySelector:()=>panels.find(p=>!p.hidden).scroll};
 tabs.forEach(t=>t.closest=s=>s==='[role="tablist"]'?{querySelectorAll:()=>tabs}:board);
 bindComparisonBoard(root);let prevented=false;handlers.keydown({target:{closest:()=>tabs[0]},key:'ArrowRight',preventDefault(){prevented=true}});
 assert.equal(prevented,true);assert.equal(tabs[1].focused,true);assert.equal(tabs[1].attrs['aria-selected'],'true');assert.deepEqual(panels.map(p=>p.hidden),[true,false]);assert.equal(panels[1].scroll.scrollLeft,124);
 handlers.click({target:{closest:s=>s==='[data-board-tab]'?tabs[0]:null}});assert.deepEqual(panels.map(p=>p.hidden),[false,true]);
});
