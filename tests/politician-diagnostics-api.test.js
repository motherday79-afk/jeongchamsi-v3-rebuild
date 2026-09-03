import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePoliticians } from '../api/gateway.js';
import { issueSessionToken } from '../lib/session.js';
import { TARGET_KEYS } from '../lib/migration-service.js';

const person={id:'assembly-221',type:'assembly',name:'API정치인',roleLabel:'국회의원',office:'국회의원',party:'테스트당',jurisdiction:'서울 테스트구'};
const report={id:person.id,snapshot:'2026-09-03',signal:{label:'브랜드',summary:'공개 현상'},core:[{label:'관심도',score:71}],audience:{summary:'회원 세대 해석'},cohorts:[{age:'40대',male:70,female:68}],media:[{label:'뉴스',score:75}],policies:['민생'],issues:[{title:'민생',impact:72}],risks:['관리자 위험'],opportunities:['관리자 기회'],strategies:[{title:'핵심 메시지 설계',body:'관리자 처방'}],conclusion:'관리자 전략 판단',sources:[{type:'Google 뉴스',title:'보도'}]};
const users={member:{id:'member',email:'member@example.com',name:'회원',role:'member'},admin:{id:'admin',email:'admin@example.com',name:'관리자',role:'admin'}};
const secret='diagnostics-api-test-secret';

function command(args){
  const key=args[1];
  if(key===TARGET_KEYS.politicians('assembly'))return JSON.stringify({items:[person]});
  if(key===TARGET_KEYS.politicianPhotos)return JSON.stringify({items:{[person.id]:{localPath:'/assets/politicians/assembly-221.jpg',focus:'50% 28%'}}});
  if(key===TARGET_KEYS.users)return JSON.stringify(users);
  return null;
}

async function requestFor(role){
  const previous=process.env.JCS_REBUILD_SESSION_SECRET;process.env.JCS_REBUILD_SESSION_SECRET=secret;
  let body='',status=0;const headers={};
  const cookie=role?`jcsr2_session=${encodeURIComponent(issueSessionToken(role,secret))}`:'';
  const req={method:'GET',headers:cookie?{cookie}:{},query:{}};
  const res={setHeader(name,value){headers[name]=value;},end(value){body=String(value);},set statusCode(value){status=value;},get statusCode(){return status;}};
  try{await handlePoliticians(req,res,command,new URL(`https://example.test/api/v3/politicians?id=${person.id}`),{async getPublicIntelligence(){return report;}});}finally{if(previous===undefined)delete process.env.JCS_REBUILD_SESSION_SECRET;else process.env.JCS_REBUILD_SESSION_SECRET=previous;}
  return {status,headers,json:JSON.parse(body),serialized:body};
}

test('direct politician API calls enforce public member and administrator projections',async()=>{
  const guest=await requestFor(null),member=await requestFor('member'),admin=await requestFor('admin');
  assert.equal(guest.status,200);assert.equal(member.status,200);assert.equal(admin.status,200);
  assert.deepEqual(guest.json.intelligence.diagnoses.map(topic=>topic.id),['01','07','09']);
  assert.deepEqual(member.json.intelligence.diagnoses.map(topic=>topic.id),['01','02','03','05','07','09']);
  assert.equal(admin.json.intelligence.diagnoses.length,10);
  assert.equal(admin.json.intelligence.prescriptions.length,10);
  for(const forbidden of ['strategicJudgment','prescriptions','관리자 처방','관리자 위험'])assert.doesNotMatch(guest.serialized,new RegExp(forbidden));
  for(const forbidden of ['strategicJudgment','prescriptions','관리자 처방','관리자 위험'])assert.doesNotMatch(member.serialized,new RegExp(forbidden));
  assert.match(admin.serialized,/전략 처방/);
  assert.equal(guest.headers['Cache-Control'],'no-store');
  assert.equal(guest.json.item.photo.localPath,'/assets/politicians/assembly-221.jpg');
});

test('the browser source tree does not ship the former administrator pilot payload',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/data/kim-minseok-pilot.js',import.meta.url),'utf8');
  for(const forbidden of ['cohorts:','support:','resilience:','risks:','opportunities:','competitors:','strategies:','raw:'])assert.doesNotMatch(source,new RegExp(forbidden));
});
