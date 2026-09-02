import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalRankings, withOperationalRank } from '../lib/operational-ranking.js';

const profileRows=[
  {id:'assembly-001',name:'가',type:'assembly',party:'정당A',jurisdiction:'가구'},
  {id:'assembly-002',name:'나',type:'assembly',party:'정당A',jurisdiction:'나구'},
  {id:'metropolitan-001',name:'다',type:'metropolitan',party:'정당B',jurisdiction:'다시'},
  {id:'basic-001',name:'라',type:'basic',party:'정당B',jurisdiction:'라구'},
];
const profileMap=new Map(profileRows.map(row=>[row.id,row]));

function draft(id,pc,mobile,news=[]){
  return {
    id,
    signal:{index:100,label:'기존 상세 신호',summary:'요약'},
    rank:{overall:null,category:null,temporary:false},
    raw:{
      searchAds:pc===null?null:{volume:{pc,mobile,total:Number(pc)+Number(mobile)}},
      news:news===null?null:{items:news},
    },
  };
}

const news=(count,sources,date)=>Array.from({length:count},(_,index)=>({
  title:`기사 ${index+1}`,
  source:sources[index%sources.length],
  publishedAt:new Date(Date.parse(date)-index*3_600_000).toISOString(),
}));

const fixtures=[
  draft('assembly-001',null,null,null),
  draft('assembly-002',10,90,news(1,['매체A'],'2026-09-01T00:00:00.000Z')),
  draft('metropolitan-001',100,900,news(2,['매체A','매체B'],'2026-09-02T00:00:00.000Z')),
  draft('basic-001',1000,9000,news(3,['매체A','매체B','매체C'],'2026-09-03T00:00:00.000Z')),
];

test('operating NOW uses search 40 and three Google news signals at 20 each',()=>{
  const rows=buildOperationalRankings(fixtures,profileMap,'snapshot-1',0);
  assert.deepEqual(rows.weights,{search:40,news:60,newsArticles:20,newsSources:20,newsRecency:20});
  assert.equal(rows.byId['basic-001'].score,100);
  assert.equal(rows.byId['assembly-001'].score,0);
  assert.ok(new Set(rows.overall.map(row=>row.score)).size>1);
  assert.deepEqual(rows.overall.map(row=>row.id),['basic-001','metropolitan-001','assembly-002','assembly-001']);
});

test('operating ranking covers every person, excludes raw payloads and records approved source status',()=>{
  const rows=buildOperationalRankings(fixtures,profileMap,'snapshot-1',0);
  assert.equal(rows.population,4);
  assert.equal(rows.categories.assembly.length,2);
  assert.equal(rows.categories.metropolitan.length,1);
  assert.equal(rows.categories.basic.length,1);
  assert.deepEqual(rows.byId['assembly-001'].sourceStatus,{search:'MISSING',news:'MISSING'});
  assert.equal('raw' in rows.overall[0],false);
  assert.equal('signal' in rows.overall[0],false);
});

test('equal raw signals receive equal scores and deterministic id ordering',()=>{
  const tied=[
    draft('assembly-002',100,900,news(2,['매체A','매체B'],'2026-09-02T00:00:00.000Z')),
    draft('assembly-001',100,900,news(2,['매체A','매체B'],'2026-09-02T00:00:00.000Z')),
  ];
  const rows=buildOperationalRankings(tied,profileMap,'snapshot-2',0);
  assert.equal(rows.byId['assembly-001'].score,rows.byId['assembly-002'].score);
  assert.deepEqual(rows.overall.map(row=>row.id),['assembly-001','assembly-002']);
});

test('detail NOW index and ranks synchronize without mutating the stored draft',()=>{
  const rows=buildOperationalRankings(fixtures,profileMap,'snapshot-1',0);
  const source=fixtures[3],before=structuredClone(source);
  const result=withOperationalRank(source,rows.byId['basic-001']);
  assert.equal(result.signal.index,100);
  assert.deepEqual(result.rank,{overall:1,category:1,temporary:false});
  assert.deepEqual(source,before);
});

