import test from 'node:test';
import assert from 'node:assert/strict';
import {createPanel,createRun,mutateRun,publicRun} from '../src/core/ai-panel-model.js';
export const profiles=(n=10)=>Array.from({length:n},(_,i)=>({id:`JCS-AI-${String(i+1).padStart(4,'0')}`,gender:i%2?'여성':'남성',age:'30대',region:'서울',politicalInterest:'중간',pollExposure:false}));
const ctx={id:'p1',now:'2026-09-19T00:00:00.000Z',user:{id:'admin',role:'admin',status:'active'}};
const panel=()=>createPanel({name:'샘플',isSample:true,population:{sourceUrl:'https://example.org',referenceDate:'2026-09-01'},profiles:profiles()},ctx);
const bareRun=()=>createRun({week:'2026-W38',basisDate:'2026-09-19',question:'평가?',questionVersion:'1',modes:['EXPOSED']},{...ctx,panel:panel(),runNumber:1});
test('imported HUMAN source summary provenance survives saving and cannot inject extra metadata',()=>{
 const source={id:'gallup-1659',institution:'한국갤럽',sourceUrl:'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1659',question:'대통령 직무수행 평가',comparable:false,topic:'presidential-approval',fetchedAt:ctx.now,provenance:{questionKind:'source-summary',parserVersion:'official-html-v1',contentHash:'a'.repeat(64),secret:'discard'},results:{overall:{positive:37,negative:56,undecided:7}}};
 const saved=mutateRun(bareRun(),'human',{poll:source},ctx).humanPolls[0];assert.equal(saved.provenance.questionKind,'source-summary');assert.equal(saved.provenance.secret,undefined);assert.equal(saved.fetchedAt,ctx.now);assert.equal(saved.topic,'presidential-approval');
});
const run=()=>mutateRun(bareRun(),'environment',{mode:'EXPOSED',notes:'Entered context',sources:[]},ctx);
export const poll=()=>({id:'poll1',institution:'기관',sourceUrl:'https://example.org/poll',question:'평가?',comparable:true,results:{overall:{positive:50,negative:40,undecided:10,n:null}}});
test('panel requires complete unique stable IDs and explicit sample classification',()=>{
 assert.throws(()=>createPanel({name:'x',profiles:profiles()},ctx));
 assert.throws(()=>createPanel({name:'x',isSample:true,profiles:[...profiles().slice(1),profiles()[1]]},ctx));
 assert.equal(panel().profiles.length,10);
});
test('exact responses required; aggregate counts combine four-way choices',()=>{
 const r=run(),input={mode:'EXPOSED',model:'entered-model',executedAt:ctx.now,responses:profiles().map((p,i)=>({id:p.id,choice:i<3?'very-positive':'negative',reason:'reason'}))};
 assert.throws(()=>mutateRun(r,'responses',{...input,responses:input.responses.slice(1)},ctx));
 assert.throws(()=>mutateRun(r,'responses',{...input,responses:input.responses.map(p=>({...p,choice:'invalid'}))},ctx));
 const next=mutateRun(r,'responses',input,ctx);assert.equal(next.aggregates.EXPOSED.overall.positive,30);assert.equal(next.aggregates.EXPOSED.overall.n,10);
});
test('LOCK is immutable except append-only HUMAN; samples cannot publish',()=>{
 let r=run();r=mutateRun(r,'responses',{mode:'EXPOSED',model:'m',executedAt:ctx.now,responses:profiles().map(p=>({id:p.id,choice:'undecided'}))},ctx);
 r=mutateRun(r,'review',{note:'checked'},ctx);r=mutateRun(r,'lock',{},ctx);const before=JSON.stringify(r.results);
 assert.throws(()=>mutateRun(r,'environment',{mode:'EXPOSED',notes:'changed'},ctx));
 r=mutateRun(r,'human',{poll:poll()},ctx);assert.equal(JSON.stringify(r.results),before);
 assert.throws(()=>mutateRun(r,'human',{poll:poll()},ctx));
 assert.throws(()=>mutateRun(r,'publish',{},ctx));assert.throws(()=>publicRun(r));
});
test('invalid percentages and BLIND leakage rejected',()=>{
 const r=run(),p=poll();p.results.overall.positive=101;assert.throws(()=>mutateRun(r,'human',{poll:p},ctx));
 const b=createRun({...r,modes:['BLIND']},{...ctx,panel:panel(),runNumber:1});assert.throws(()=>mutateRun(b,'environment',{mode:'BLIND',sources:[{title:'poll',url:'https://example.org',containsPollNumbers:true}]},ctx));
});
test('minimum profile fields and supplied axis distribution are validated',()=>{
 const input={name:'sample',isSample:true,profiles:profiles()};
 for(const field of ['gender','age','region','politicalInterest','pollExposure']){const p=structuredClone(input);delete p.profiles[0][field];assert.throws(()=>createPanel(p,ctx),/PROFILE_INVALID/);}
 for(const axes of [{경제:'high'},{경제:-1,외교:101},{경제:10},{},{경제:Infinity}]){const p=structuredClone(input);p.profiles[0].axes=axes;assert.throws(()=>createPanel(p,ctx),/PROFILE_INVALID/);}
 input.profiles[0].axes={경제:40,외교:60};assert.equal(createPanel(input,ctx).profiles[0].axes.경제,40);
});
test('environment and explicit timezone metadata required before review',()=>{
 const response={mode:'EXPOSED',model:'m',executedAt:ctx.now,responses:profiles().map(p=>({id:p.id,choice:'undecided'}))};
 assert.throws(()=>mutateRun(bareRun(),'responses',response,ctx),/ENVIRONMENT_REQUIRED/);
 for(const executedAt of ['2026-09-19','2026-09-19T10:30:00','2026-02-30T00:00:00Z'])assert.throws(()=>mutateRun(run(),'responses',{...response,executedAt},ctx),/INPUT_INVALID/);
 let r=mutateRun(run(),'responses',{...response,executedAt:'2026-09-19T09:00:00+09:00'},ctx);assert.equal(r.results.EXPOSED.executedAt,'2026-09-19T00:00:00.000Z');
 r=mutateRun(r,'review',{},ctx);r=mutateRun(r,'human',{poll:poll()},ctx);assert.equal(r.status,'draft');assert.throws(()=>mutateRun(r,'lock',{},ctx),/REVIEW_REQUIRED/);
});
