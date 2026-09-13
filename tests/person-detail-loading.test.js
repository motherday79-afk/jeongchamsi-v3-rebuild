import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePoliticians } from '../api/gateway.js';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { INTELLIGENCE_KEYS as K } from '../lib/intelligence-keys.js';
import { TARGET_KEYS as T } from '../lib/migration-service.js';
import { issueSessionToken } from '../lib/session.js';

const person={id:'assembly-001',type:'assembly',name:'정치인',party:'무소속',jurisdiction:'서울'};
const report={id:person.id,diagnoses:Array.from({length:10},(_,i)=>({id:String(i+1).padStart(2,'0'),score:50,display:{}})),related:[{id:person.id}]};
const response=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){this.body=JSON.parse(raw);}});
function storage(){
  const values=new Map([[T.politicians('assembly'),JSON.stringify({items:[person]})],[K.publicPointer,'snapshot'],[K.draft('snapshot',person.id),JSON.stringify(report)]]),calls=[];
  return {values,calls,command:async args=>{calls.push(args);const [op,key,...keys]=args;if(op==='GET')return values.get(key)||null;if(op==='MGET')return [key,...keys].map(k=>values.get(k)||null);throw new Error('unexpected write '+op);}};
}

test('person overrides are requested before the global pointer has finished',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve),calls=[];
  const service=createIntelligenceService({command:async([op,key])=>{calls.push(key);return key===K.publicPointer?gate:null;},profiles:[person]});
  const pending=service.getPublicIntelligence(person.id);
  const started=calls.includes(K.publicPersonOverride(person.id));
  release(null);await pending;
  assert.equal(started,true);
});

test('detail analysis starts before photo storage has finished',async()=>{
  const db=storage();let release,started=false;
  const gate=new Promise(resolve=>release=resolve),res=response();
  const command=args=>args[0]==='GET'&&args[1]===T.politicianPhotos?gate:db.command(args);
  const pending=handlePoliticians({method:'GET',headers:{}},res,command,new URL('https://example.com/api/v3/politicians?id=assembly-001'),{getPublicIntelligence:async()=>{started=true;return report;}});
  await Promise.resolve();await Promise.resolve();
  const parallel=started;release(null);await pending;
  assert.equal(parallel,true);
  assert.equal(res.body.item.id,person.id);
});

test('one detail request reads each shared profile only once and the next request sees fresh data',async()=>{
  const db=storage();
  const call=async()=>{const res=response();await handlePoliticians({method:'GET',headers:{}},res,db.command,new URL('https://example.com/api/v3/politicians?id=assembly-001'));return res;};
  const res=await call();
  assert.equal(res.statusCode,200);
  assert.equal(res.body.accessTier,'public');
  assert.equal(res.headers['Cache-Control'],'no-store');
  assert.equal(db.calls.filter(([op,key])=>op==='GET'&&key===T.politicians('assembly')).length,1);
  db.values.set(T.politicians('assembly'),JSON.stringify({items:[{...person,name:'갱신된 이름'}]}));
  assert.equal((await call()).body.item.name,'갱신된 이름');
});

test('request-scoped reads preserve admin, member and public projections on successive visits',async()=>{
  const db=storage(),previous=process.env.JCS_REBUILD_SESSION_SECRET;
  const secret='test-only-person-loading-secret';
  process.env.JCS_REBUILD_SESSION_SECRET=secret;
  db.values.set(T.users,JSON.stringify({manager:{id:'manager',role:'admin',sessionVersion:0},reader:{id:'reader',role:'member',sessionVersion:0}}));
  db.values.set(K.draft('snapshot',person.id),JSON.stringify({...report,prescriptions:[{id:'01',strategicJudgment:'ADMIN_ONLY_MARKER'}]}));
  try{
    for(const [id,tier,want] of [
      ['manager','admin',['01','02','03','04','05','06','07','08','09','10']],
      ['reader','member',['01','02','03','05','07','09']],
      [null,'public',['01','07','09']],
    ]){
      const cookie=id?'jcsr2_session='+issueSessionToken(id,secret):'';
      const res=response();
      await handlePoliticians({method:'GET',headers:{cookie}},res,db.command,new URL('https://example.com/api/v3/politicians?id=assembly-001'));
      assert.equal(res.body.accessTier,tier);
      assert.deepEqual(res.body.intelligence.diagnoses.map(row=>row.id),want);
      if(tier!=='admin')assert.ok(!JSON.stringify(res.body).includes('ADMIN_ONLY_MARKER'));
    }
  }finally{
    if(previous===undefined)delete process.env.JCS_REBUILD_SESSION_SECRET;
    else process.env.JCS_REBUILD_SESSION_SECRET=previous;
  }
});
