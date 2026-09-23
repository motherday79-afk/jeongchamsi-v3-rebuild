import {randomInt,randomUUID} from 'node:crypto';
import {newMine,advanceMine,applyMineAction,publicMine,mineStats} from './mining-engine.js';
const PREFIX='jcsr2:mine:v1:',AD=PREFIX+'ad';
const key=id=>PREFIX+'user:'+id;
const fail=code=>{throw new Error(code);};
const parse=raw=>{if(!raw)return null;try{return JSON.parse(raw);}catch{fail('MINE_STORAGE_INVALID');}};
const DAY_TTL=90*86400;
export const MINE_CAS=`-- MINE_CAS_275
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2])
return 1`;
export const MINE_VISIT=`-- MINE_VISIT_275
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2])
if ARGV[3]=='1' then
 redis.call('HINCRBY',KEYS[2],'visits',1)
 redis.call('SADD',KEYS[3],ARGV[4])
 redis.call('EXPIRE',KEYS[2],ARGV[5])
 redis.call('EXPIRE',KEYS[3],ARGV[5])
end
return 1`;
export const defaultMineAd=()=>({name:'정참시 광산',message:'광물을 모으고, 나만의 광산을 키워보세요',url:'',enabled:false,id:'test'});
export function validateMineAd(input){
 const name=String(input.name||'').trim().slice(0,40),message=String(input.message||'').trim().slice(0,90),raw=String(input.url||'').trim();
 if(!name)fail('MINE_AD_NAME');
 let url='';if(raw){let parsed;try{parsed=new URL(raw);}catch{fail('MINE_AD_URL');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||raw.length>1800||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(parsed.hostname))fail('MINE_AD_URL');url=parsed.href;
 }
 if(input.enabled===true&&!url)fail('MINE_AD_URL');
 return {name,message,url,enabled:input.enabled===true,id:randomUUID()};
}
export function createMiningService({command,now=()=>Date.now(),rng=()=>randomInt(0,0x100000000)/0x100000000,uuid=randomUUID}={}){
 const ad=async()=>parse(await command(['GET',AD]))||defaultMineAd();
 async function run(user,input={action:'sync'}){
  if(!user?.id)fail('LOGIN_REQUIRED');if(user.status&&user.status!=='active')fail('MINE_FORBIDDEN');
  const mutating=input.action!=='sync';
  if(mutating&&!/^[a-zA-Z0-9_-]{8,96}$/.test(input.requestId||''))fail('MINE_REQUEST_ID');
  const sponsor=await ad();
  for(let attempt=0;attempt<4;attempt++){
   const raw=await command(['GET',key(user.id)]),instant=now(),s=parse(raw)||newMine(instant);
   const prior=mutating?s.ledger.find(x=>x.id===input.requestId):null;
   if(prior)return {ok:!prior.error,error:prior.error,state:publicMine(s,instant),result:prior.result,ad:sponsor};
   const autoGained=advanceMine(s,instant,rng);let result={autoGained},error;
   try{
    if(input.action==='strike')fail('MINE_USE_AUTO');
    if(input.action==='test-fill'){
     if(user.role!=='admin')fail('FORBIDDEN');s.ore=mineStats(s).capacity;s.testCycle=true;result.test=true;
    }else if(mutating){
     const test=s.testCycle;result={...result,...applyMineAction(s,input,instant,rng)};
     if(input.action==='collect'){
      const token=uuid(),receipt={token,cycle:input.cycle,at:instant,visited:false,test:test||!sponsor.enabled,destination:sponsor.enabled?sponsor.url:'/mine/ad',adName:sponsor.name};
      s.receipts=[receipt,...s.receipts].slice(0,8);s.testCycle=false;
      result.visitUrl='/api/v3/mine/visit?token='+encodeURIComponent(token);
     }
    }
   }catch(e){error=e.message;}
   if(mutating)s.ledger=[{id:input.requestId,result,error},...s.ledger].slice(0,16);
   const serialized=JSON.stringify(s);
   if(raw===serialized||Number(await command(['EVAL',MINE_CAS,'1',key(user.id),raw||'',serialized]))===1){
    return {ok:!error,...(error?{error}:{}),state:publicMine(s,instant),result,ad:sponsor};
   }
  }
  fail('MINE_BUSY');
 }
 async function visit(user,token){
  if(!user?.id)fail('LOGIN_REQUIRED');if(!/^[a-zA-Z0-9_-]{8,96}$/.test(token||''))fail('MINE_VISIT_EXPIRED');
  for(let i=0;i<4;i++){
   const raw=await command(['GET',key(user.id)]),s=parse(raw),receipt=s?.receipts?.find(x=>x.token===token);
   if(!receipt||now()-receipt.at>86400000)fail('MINE_VISIT_EXPIRED');
   if(receipt.visited)return receipt.destination;
   receipt.visited=true;
   const day=new Date(now()+9*3600000).toISOString().slice(0,10);
   if(Number(await command(['EVAL',MINE_VISIT,'3',key(user.id),PREFIX+'day:'+day,PREFIX+'unique:'+day,raw,JSON.stringify(s),receipt.test?'0':'1',String(user.id),String(DAY_TTL)]))===1)return receipt.destination;
  }fail('MINE_BUSY');
 }
 async function admin(user,input){
  if(user?.role!=='admin')fail('FORBIDDEN');
  if(input){const value=validateMineAd(input);await command(['SET',AD,JSON.stringify(value)]);return {ok:true,ad:value};}
  const days=Array.from({length:30},(_,i)=>new Date(now()+9*3600000-i*86400000).toISOString().slice(0,10));
  const rows=await Promise.all(days.map(async day=>({day,visits:Number(await command(['HGET',PREFIX+'day:'+day,'visits']))||0,users:Number(await command(['SCARD',PREFIX+'unique:'+day]))||0})));
  return {ok:true,ad:await ad(),rows};
 }
 return {run,visit,admin};
}
