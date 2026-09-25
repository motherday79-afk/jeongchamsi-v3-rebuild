import {towerAction,publicTower} from './mining-tower.js';
import {eyeAction} from './mining-eye.js';
import {forestAction} from './mining-forest.js';
import {valleyAction} from './mining-valley.js';
import {publicQuests,recordQuest} from './mining-quests.js';
import {publicRaid,raidAction,resetRaid} from './mining-raid.js';
import {getUser,listUsers} from './rebuild-store.js';
import {PICKS} from '../mine/pick-catalog.js';
import {randomInt,randomUUID} from 'node:crypto';
import {newMine,advanceMine,applyMineAction,publicMine,mineStats,migrateMine285} from './mining-engine.js';
import {MINE_TRANSACTION,initialCampaign,publicCampaign,migrateCampaign,publicLottery,lotteryAction,campaignFields} from './mining-campaign.js';
const PREFIX='jcsr2:mine:v1:',AD=PREFIX+'ad';
const JACKPOT_FAILURES=PREFIX+'jackpot:failures';
const CAMPAIGN=PREFIX+'campaigns';
const key=id=>PREFIX+'user:'+id;
const fail=code=>{throw new Error(code);};
const parse=raw=>{if(!raw)return null;try{return JSON.parse(raw);}catch{fail('MINE_STORAGE_INVALID');}};
const DAY_TTL=90*86400;
export const MINE_CAS=`-- MINE_CAS_275
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
if #KEYS>1 then redis.call('INCRBY',KEYS[2],ARGV[3]) end
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
 const imageUrl=String(input.imageUrl||'').trim();
 if(imageUrl&&!/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/mine-ad\/[^\s<>"']+$/i.test(imageUrl))fail('MINE_IMAGE_URL');
 return {name,message,url,imageUrl,enabled:input.enabled===true,id:randomUUID()};
}
export function createMiningService({command,now=()=>Date.now(),rng=()=>randomInt(0,0x100000000)/0x100000000,uuid=randomUUID}={}){
 const transact=async(entries,failures=0)=>Number(await command(['EVAL',MINE_TRANSACTION,String(entries.length+1),...entries.map(e=>e[0]),JACKPOT_FAILURES,...entries.flatMap(e=>[e[1]||'',JSON.stringify(e[2])]),String(failures)]))===1;
 const ad=async()=>parse(await command(['GET',AD]))||defaultMineAd();
 const jackpot=async()=>({failedCycles:Number(await command(['GET',JACKPOT_FAILURES]))||0,rewards:{bronze:100,silver:300,gold:1000},enabled:false});
 async function run(user,input={action:'sync'}){
  if(!user?.id)fail('LOGIN_REQUIRED');if(user.status&&user.status!=='active')fail('MINE_FORBIDDEN');
  const mutating=input.action!=='sync';
  if(mutating&&!/^[a-zA-Z0-9_-]{8,96}$/.test(input.requestId||''))fail('MINE_REQUEST_ID');
  const sponsor=await ad(),roll=['lottery-buy','raid-play','valley-start','eye-start','eye-choose','tower-start'].includes(input.action)?rng():null;
  for(let attempt=0;attempt<12;attempt++){
   const campaignRaw=await command(['GET',CAMPAIGN]),g=parse(campaignRaw)||initialCampaign();
   const raw=await command(['GET',key(user.id)]),instant=now(),s=parse(raw)||newMine(instant);
   migrateMine285(s);migrateCampaign(s,g.current,instant);
   if(user.role!=='admin'&&PICKS.some(p=>p.id===s.tool)&&!(s.ownedPicks||['rust']).includes(s.tool)&&!(s.paidPicks||[]).includes(s.tool)){s.tool='rust';s.plannedSwings=[];}
   const response=async(result,error)=>({ok:!error,...(error?{error}:{}),state:{...publicMine(s,instant),adminAllPicks:user.role==='admin'},result,ad:sponsor,jackpot:await jackpot(),campaign:publicCampaign(g.current),lottery:publicLottery(s,g),raid:publicRaid(s,instant),tower:publicTower(s),quests:publicQuests(s,instant)});
   const campaignChanged=mutating&&input.campaignId!==undefined&&input.campaignId!==g.current.id;
   const prior=mutating&&!campaignChanged?s.ledger.find(x=>x.id===input.requestId):null;
   if(prior)return response(prior.result,prior.error);
   const priorFailures=s.failedSwings||0;
   const autoGained=advanceMine(s,instant,rng);let result={autoGained},error;
   try{
    if(campaignChanged)fail('MINE_CAMPAIGN_CHANGED');
    if(input.action==='strike')fail('MINE_USE_AUTO');
    if(input.action==='lottery-buy'||input.action==='lottery-reveal'){
     result={...result,...lotteryAction(s,g,user,input,instant,roll,uuid)};
    }else if(input.action==='tower-start'||input.action==='tower-finish'){
     result={...result,...towerAction(s,input,instant,Math.floor(roll*4294967296),user.role==='admin')};
    }else if(input.action==='eye-start'||input.action==='eye-choose'){
     result={...result,...eyeAction(s,input,instant,Math.floor(roll*4294967296))};
    }else if(input.action==='forest-start'||input.action==='forest-finish'){
     result={...result,...forestAction(s,input,instant)};
    }else if(input.action==='valley-start'||input.action==='valley-finish'){
     result={...result,...valleyAction(s,input,instant,Math.floor(roll*4294967296))};
    }else if(input.action==='raid-reset'){
     result={...result,...resetRaid(s,user,input,instant)};
    }else if(input.action==='raid-play'){
     result={...result,raid:raidAction(s,input,instant,roll)};
    }else if(input.action==='admin-gold'){
     if(user.role!=='admin')fail('FORBIDDEN');
     const amount=input.amount;
     if(!Number.isSafeInteger(amount)||amount<1||amount>1000000||!Number.isSafeInteger(s.gold+amount))fail('MINE_GOLD_AMOUNT');
     s.gold+=amount;result.grantedGold=amount;
     s.adminGoldLog=[{amount,by:user.id,at:instant,requestId:input.requestId},...(s.adminGoldLog||[])].slice(0,50);
    }else if(input.action==='test-fill'){
     if(user.role!=='admin')fail('FORBIDDEN');s.ore=mineStats(s).capacity;s.testCycle=true;result.test=true;
    }else if(mutating){
     const test=s.testCycle,previousSequence=s.presence?.sequence;result={...result,...applyMineAction(s,input,instant,rng,{allPicks:user.role==='admin'})};
     if(input.action==='auto-start'&&input.sequence>previousSequence&&s.presence?.running)recordQuest(s,'auto-start',instant);
     if(input.action==='collect'){
      recordQuest(s,'collect',instant);
      const token=uuid(),receipt={token,cycle:input.cycle,at:instant,visited:false,test:test||!sponsor.enabled,destination:sponsor.enabled?sponsor.url:'/mine/ad',adName:sponsor.name};
      s.receipts=[receipt,...s.receipts].slice(0,8);s.testCycle=false;
      result.visitUrl='/api/v3/mine/visit?token='+encodeURIComponent(token);
     }
    }
   }catch(e){error=e.message;}
   if(mutating&&!campaignChanged)s.ledger=[{id:input.requestId,result,error},...s.ledger].slice(0,16);
   const failures=(s.failedSwings||0)-priorFailures;
   if(await transact([[key(user.id),raw,s],[CAMPAIGN,campaignRaw,g]],failures)){
    return response(result,error);
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
  if(input?.action==='reset-members'){
   const users=await listUsers(command);return {ok:true,users:users.map(({id,nickname,role})=>({id,nickname,role}))};
  }
  if(input?.action==='reset-preview'||input?.action==='reset-member'){
   const targetId=String(input.targetId||'');if(!targetId||targetId.length>24)fail('MINE_RESET_TARGET');
   const target=await getUser(command,targetId);if(!target||target.id!==targetId)fail('MINE_RESET_TARGET');
   const resetKey=PREFIX+'reset-log:'+targetId;
   if(input.action==='reset-member'&&(!/^[a-zA-Z0-9_-]{8,96}$/.test(input.requestId||'')||input.confirmTarget!==targetId||!Number.isSafeInteger(input.expectedVersion)))fail('MINE_RESET_CONFIRM');
   for(let attempt=0;attempt<12;attempt++){
    const raw=await command(['GET',key(targetId)]),instant=now(),old=parse(raw)||newMine(instant),version=old.resetVersion||0;
    if(input.action==='reset-preview')return {ok:true,target:{id:target.id,nickname:target.nickname},state:{gold:old.gold,ore:old.ore,pick:old.pick,worker:old.worker,storage:old.storage,resetVersion:version}};
    const logRaw=await command(['GET',resetKey]),log=parse(logRaw)||[];
    if(log.some(row=>row.requestId===input.requestId))return {ok:true,resetTarget:targetId};
    if(version!==input.expectedVersion)fail('MINE_RESET_CHANGED');
    const next={...newMine(instant),resetVersion:version+1,cycle:(old.cycle||1)+1,campaignId:old.campaignId,
     raid:old.raid,raidRevision:old.raidRevision,raidResetLog:old.raidResetLog,lottery:old.lottery,prizeHistory:old.prizeHistory||[],ledger:old.ledger||[],
     retiredTokens:[old.presence?.token,...(old.retiredTokens||[])].filter(Boolean).slice(0,16)};
    const audit=[{requestId:input.requestId,by:user.id,at:instant,before:old},...log].slice(0,10);
    if(await transact([[key(targetId),raw,next],[resetKey,logRaw,audit]]))return {ok:true,resetTarget:targetId};
   }fail('MINE_BUSY');
  }
  if(input?.action==='campaign-winners'){
   const g=parse(await command(['GET',CAMPAIGN]))||initialCampaign(),c=[g.current,...g.campaigns].find(c=>c.id===input.campaignId);
   if(!c)fail('MINE_CAMPAIGN_CHANGED');return {ok:true,campaign:publicCampaign(c),winners:g.winners.filter(w=>w.campaignId===c.id)};
  }
  if(input?.action?.startsWith('campaign-')){
   if(!/^[a-zA-Z0-9_-]{8,96}$/.test(input.requestId||''))fail('MINE_REQUEST_ID');
   for(let attempt=0;attempt<12;attempt++){
    const raw=await command(['GET',CAMPAIGN]),g=parse(raw)||initialCampaign();
    const prior=g.requests.find(x=>x.id===input.requestId);if(prior)return {ok:true,campaign:publicCampaign(g.current),ad:await ad()};
    if(input.campaignId!==g.current.id)fail('MINE_CAMPAIGN_CHANGED');
    const entries=[];
    if(input.action==='campaign-start'){
     const fields=campaignFields(input);g.campaigns.push({...g.current,endedAt:now()});g.current={...fields,id:uuid(),wins:0,at:now()};
     if(input.ad){const adRaw=await command(['GET',AD]);entries.push([AD,adRaw,validateMineAd(input.ad)]);}
    }else if(input.action==='campaign-update'){
     const fields=campaignFields(input);if(fields.limit<g.current.wins)fail('MINE_CAMPAIGN_INPUT');Object.assign(g.current,fields);
    }else if(input.action==='campaign-fulfill'){
     const winner=g.winners.find(t=>t.id===input.ticketId);if(!winner||typeof input.fulfilled!=='boolean')fail('MINE_TICKET');winner.fulfilled=input.fulfilled;winner.fulfilledAt=input.fulfilled?now():null;
    }else fail('MINE_ACTION');
    g.requests.push({id:input.requestId,action:input.action,at:now()});
    if(await transact([[CAMPAIGN,raw,g],...entries]))return {ok:true,campaign:publicCampaign(g.current),ad:await ad()};
   }fail('MINE_BUSY');
  }
  if(input){const value=validateMineAd(input);await command(['SET',AD,JSON.stringify(value)]);return {ok:true,ad:value};}
  const days=Array.from({length:30},(_,i)=>new Date(now()+9*3600000-i*86400000).toISOString().slice(0,10));
  const rows=await Promise.all(days.map(async day=>({day,visits:Number(await command(['HGET',PREFIX+'day:'+day,'visits']))||0,users:Number(await command(['SCARD',PREFIX+'unique:'+day]))||0})));
  const g=parse(await command(['GET',CAMPAIGN]))||initialCampaign();
  return {ok:true,ad:await ad(),rows,campaign:publicCampaign(g.current),winners:g.winners,campaigns:[...g.campaigns.map(publicCampaign),publicCampaign(g.current)]};
 }
 return {run,visit,admin};
}
