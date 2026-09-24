export const MINING_VERSION=278;
export const CHARACTERS=['strong','glamour','elf'];
const fail=code=>{throw new Error(code);};
export function newMine(now){return {version:1,gold:0,ore:0,pick:1,worker:1,storage:1,character:'strong',chosen:false,tool:'basic',cursor:now,lastStrike:null,cycle:1,claims:0,totalGold:0,receipts:[],ledger:[],testCycle:false};}
export function mineStats(s){
 return {capacity:s.storage*10,chance:Math.min(.8,.03+(s.pick-1)*.02+(s.tool==='trial'?.12:0)),doubleChance:s.tool==='trial'?.25:0,autoMs:Math.max(1100,3000-(s.worker-1)*100),manualMs:1500,
 costs:{pick:Math.ceil(5*s.pick**1.35),worker:Math.ceil(7*s.worker**1.35),storage:20*s.storage},storageRequirement:s.storage*5,maxLevel:20,maxLevels:{pick:20,worker:20,storage:5}};
}
function advanceInterval(s,now,interval,rng){
 const st=mineStats(s);if(now<=s.cursor||s.ore>=st.capacity)return 0;
 let swings=Math.floor((now-s.cursor)/interval),gained=0;
 // Sample waiting time between productive swings rather than looping over days of misses.
 const p=st.chance,d=st.doubleChance,q=p+d*p-d*p*p,two=d*p*p/q;
 while(swings>0&&s.ore<st.capacity){
  const u=Math.max(0,Math.min(1-Number.EPSILON,rng()));
  const wait=Math.floor(Math.log1p(-u)/Math.log1p(-q))+1;
  if(wait>swings){s.failedSwings=(s.failedSwings||0)+swings;s.totalSwings=(s.totalSwings||0)+swings;s.cursor+=swings*interval;break;}
  s.failedSwings=(s.failedSwings||0)+wait-1;s.totalSwings=(s.totalSwings||0)+wait;
  swings-=wait;s.cursor+=wait*interval;
  const amount=Math.min(st.capacity-s.ore,two>0&&rng()<two?2:1);s.ore+=amount;gained+=amount;
 }
 return gained;
}
function retire(s,token){s.retiredTokens=[token,...(s.retiredTokens||[]).filter(t=>t!==token)].slice(0,16);}
export function advanceMine(s,now,rng=Math.random){
 let gained=0;
 if(s.presence){
  const end=Math.min(now,s.presence.until);
  if(s.presence.running)gained+=advanceInterval(s,end,1500,rng);
  else s.cursor=Math.max(s.cursor,end);
  if(s.ore>=mineStats(s).capacity)s.presence.running=false;
  if(now<=s.presence.until)return gained;
  s.cursor=Math.max(s.cursor,s.presence.until);retire(s,s.presence.token);s.presence=null;
 }
 return gained+advanceInterval(s,now,mineStats(s).autoMs,rng);
}
export function applyMineAction(s,input,now,rng=Math.random){
 const st=mineStats(s),a=input.action;
 if(['enter','leave','heartbeat','auto-start','auto-stop'].includes(a)){
  const {token,sequence}=input;
  if(!/^[a-zA-Z0-9_-]{8,96}$/.test(token||'')||!Number.isSafeInteger(sequence)||sequence<1)fail('MINE_SESSION');
  if(a==='leave'){
   retire(s,token);
   if(s.presence?.token===token){s.presence=null;s.cursor=now;}return {};
  }
  if((s.retiredTokens||[]).includes(token))fail('MINE_SESSION');
  if(a==='enter'){
   if(s.presence?.token===token)return {};
   if(s.presence)retire(s,s.presence.token);
   s.presence={token,sequence,until:now+12000,running:false};s.cursor=now;return {};
  }
  if(s.presence?.token!==token||s.presence.until<now)fail('MINE_SESSION');
  if(sequence<=s.presence.sequence)return {};
  s.presence.sequence=sequence;s.presence.until=now+12000;
  if(a!=='heartbeat'){
   if(a==='auto-start'&&s.ore>=st.capacity)fail('MINE_FULL');
   s.presence.running=a==='auto-start';s.cursor=now;
  }
  return {};
 }
 if(a==='strike'){
  if(s.ore>=st.capacity)fail('MINE_FULL');
  if(s.lastStrike!==null&&now-s.lastStrike<1500)fail('MINE_COOLDOWN');
  s.lastStrike=now;s.cursor=now;let gained=0;
  if(rng()<st.chance)gained++;
  const hits=st.doubleChance>0&&rng()<st.doubleChance?2:1;
  if(hits===2&&rng()<st.chance)gained++;
  gained=Math.min(st.capacity-s.ore,gained);s.ore+=gained;return {hits,gained};
 }
 if(a==='collect'){
  if(input.cycle!==s.cycle)fail('MINE_CYCLE_CHANGED');
  if(s.ore<st.capacity)fail('MINE_NOT_FULL');
  const gained=s.ore;s.gold+=gained;s.totalGold+=gained;s.ore=0;s.claims++;s.cycle++;s.cursor=now;
  if(s.presence)retire(s,s.presence.token);s.presence=null;return {gained};
 }
 if(a==='upgrade'){
  if(!['pick','worker','storage'].includes(input.target))fail('MINE_TARGET');
  if(s[input.target]>=st.maxLevels[input.target])fail('MINE_MAX_LEVEL');
  if(input.target==='storage'&&Math.max(s.pick,s.worker)<st.storageRequirement)fail('MINE_STORAGE_LOCKED');
  const cost=st.costs[input.target];if(s.gold<cost)fail('MINE_GOLD_REQUIRED');
  s.gold-=cost;s[input.target]++;s.cursor=now;return {upgraded:input.target};
 }
 if(a==='character'){if(!CHARACTERS.includes(input.character))fail('MINE_CHARACTER');s.character=input.character;s.chosen=true;return {};}
 if(a==='tool'){if(!['basic','trial'].includes(input.tool)&&!(s.paidPicks||[]).includes(input.tool))fail('MINE_TOOL');s.tool=input.tool;s.cursor=now;return {};}
 fail('MINE_ACTION');
}
export function publicMine(s,now){
 const {gold,ore,pick,worker,storage,character,chosen,tool,cycle,claims,totalGold,cursor,lastStrike}=s;
 const online=s.presence&&s.presence.until>=now;
 return {gold,ore,pick,worker,storage,character,chosen,tool,cycle,claims,totalGold,cursor,lastStrike,campaignId:s.campaignId,paidPicks:s.paidPicks||[],mode:online?(s.presence.running?'player':'ready'):'offline',onlineToken:online?s.presence.token:null,onlineUntil:online?s.presence.until:0,serverNow:now,stats:mineStats(s)};
}
