import {PICKS,RACES,progression,upgradeCost,equippedPick} from '../mine/pick-catalog.js';
import {saveCostume} from './mining-wardrobe.js';
export const MINING_VERSION=285;
export const CHARACTERS=Object.keys(RACES);
const fail=code=>{throw new Error(code);};
export function newMine(now){return {version:1,balanceVersion:285,ownedPicks:['rust'],gold:0,ore:0,pick:1,worker:1,storage:1,character:'orc',chosen:false,tool:'rust',cursor:now,lastStrike:null,cycle:1,claims:0,totalGold:0,receipts:[],ledger:[],testCycle:false};}
export function migrateMine285(s){
 if(s.balanceVersion===285)return;
 s.character=({strong:'orc',glamour:'human',elf:'elf'})[s.character]||'orc';
 const legacy=s.pick>=14?'mystic':s.pick>=7?'gold':s.pick>=2?'silver':'iron';
 s.ownedPicks=[...new Set(['rust',legacy,...(s.ownedPicks||[])])];
 if(s.tool==='basic')s.tool=legacy;
 s.balanceVersion=285;s.plannedSwings=[];
}
export function mineStats(s){
 const p=progression(s.pick,s.worker,s.storage),tool=equippedPick(s);
 return {...p,capacity:Math.max(p.capacity,s.ore||0),amount:tool.amount,hits:tool.hits,doubleChance:tool.extraChance||0,manualMs:1500,
 costs:Object.fromEntries(['pick','worker','storage'].map(k=>[k,upgradeCost(s[k],k)])),storageRequirement:s.storage+1,maxLevel:150,maxLevels:{pick:150,worker:150,storage:150},
 next:{pick:progression(s.pick+1,s.worker,s.storage).chance,worker:progression(s.pick,s.worker+1,s.storage).autoMs,storage:progression(s.pick,s.worker,s.storage+1).capacity}};
}
function rollSwing(s,rng){
 const st=mineStats(s),hits=st.hits+(st.doubleChance&&rng()<st.doubleChance?1:0);let successes=0;
 for(let i=0;i<hits;i++)if(rng()<st.chance)successes++;
 return {hits,gained:successes*st.amount,tool:equippedPick(s).visual};
}
function planSwings(s,rng){
 if(!s.presence?.running)return;
 s.plannedSwings ||= [];
 let at=(s.plannedSwings.at(-1)?.at??s.cursor)+1500;
 while(at<=s.presence.until){s.plannedSwings.push({at,...rollSwing(s,rng)});at+=1500;}
}
function advanceOnline(s,end,rng){
 planSwings(s,rng);let gained=0;const cap=mineStats(s).capacity;
 while(s.plannedSwings?.length&&s.plannedSwings[0].at<=end&&s.ore<cap){
  const swing=s.plannedSwings.shift(),amount=Math.min(cap-s.ore,swing.gained);
  s.ore+=amount;gained+=amount;s.cursor=swing.at;s.totalSwings=(s.totalSwings||0)+1;
  if(!swing.gained)s.failedSwings=(s.failedSwings||0)+1;
 }
 if(s.ore>=cap){s.plannedSwings=[];s.presence.running=false;}
 return gained;
}
function advanceInterval(s,now,interval,rng){
 const st=mineStats(s);if(now<=s.cursor||s.ore>=st.capacity)return 0;
 let swings=Math.floor((now-s.cursor)/interval),gained=0;
 // Skip empty cycles geometrically; then sample the exact conditional success distribution.
 const p=st.chance,n=st.hits,d=st.doubleChance;
 const choose=(a,b)=>{let v=1;for(let i=1;i<=b;i++)v=v*(a-i+1)/i;return v;};
 const probs=Array.from({length:n+2},(_,k)=>(k<=n?(1-d)*choose(n,k)*p**k*(1-p)**(n-k):0)+(d&&k<=n+1?d*choose(n+1,k)*p**k*(1-p)**(n+1-k):0));
 const q=1-probs[0];
 while(swings>0&&s.ore<st.capacity){
  const u=Math.max(0,Math.min(1-Number.EPSILON,rng())),wait=Math.floor(Math.log1p(-u)/Math.log1p(-q))+1;
  if(wait>swings){s.failedSwings=(s.failedSwings||0)+swings;s.totalSwings=(s.totalSwings||0)+swings;s.cursor+=swings*interval;break;}
  s.failedSwings=(s.failedSwings||0)+wait-1;s.totalSwings=(s.totalSwings||0)+wait;
  swings-=wait;s.cursor+=wait*interval;
  let r=rng()*q,successes=1;for(let k=1;k<probs.length;k++){successes=k;r-=probs[k];if(r<=0)break;}
  const amount=Math.min(st.capacity-s.ore,successes*st.amount);s.ore+=amount;gained+=amount;
 }
 return gained;
}
function retire(s,token){s.retiredTokens=[token,...(s.retiredTokens||[]).filter(t=>t!==token)].slice(0,16);}
export function advanceMine(s,now,rng=Math.random){
 let gained=0;
 if(s.presence){
  const end=Math.min(now,s.presence.until);
  if(s.presence.running)gained+=advanceOnline(s,end,rng);
  else s.cursor=Math.max(s.cursor,end);
  if(s.ore>=mineStats(s).capacity)s.presence.running=false;
  if(now<=s.presence.until)return gained;
  s.cursor=Math.max(s.cursor,s.presence.until);retire(s,s.presence.token);s.presence=null;s.plannedSwings=[];
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
   if(s.presence?.token===token){s.presence=null;s.plannedSwings=[];s.cursor=now;}return {};
  }
  if((s.retiredTokens||[]).includes(token))fail('MINE_SESSION');
  if(a==='enter'){
   if(s.presence?.token===token)return {};
   if(s.presence)retire(s,s.presence.token);
   s.presence={token,sequence,until:now+12000,running:false};s.plannedSwings=[];s.cursor=now;return {};
  }
  if(s.presence?.token!==token||s.presence.until<now)fail('MINE_SESSION');
  if(sequence<=s.presence.sequence)return {};
  s.presence.sequence=sequence;s.presence.until=now+12000;
  if(a!=='heartbeat'){
   if(a==='auto-start'&&s.ore>=st.capacity)fail('MINE_FULL');
   s.presence.running=a==='auto-start';s.plannedSwings=[];s.cursor=now;
  }
  planSwings(s,rng);return {};
 }
 if(a==='strike'){
  if(s.ore>=st.capacity)fail('MINE_FULL');
  if(s.lastStrike!==null&&now-s.lastStrike<1500)fail('MINE_COOLDOWN');
  s.lastStrike=now;s.cursor=now;const result=rollSwing(s,rng);
  result.gained=Math.min(st.capacity-s.ore,result.gained);s.ore+=result.gained;return result;
 }
 if(a==='collect'){
  if(input.cycle!==s.cycle)fail('MINE_CYCLE_CHANGED');
  if(s.ore<st.capacity)fail('MINE_NOT_FULL');
  const gained=s.ore;s.gold+=gained;s.totalGold+=gained;s.ore=0;s.claims++;s.cycle++;s.cursor=now;
  if(s.presence)retire(s,s.presence.token);s.presence=null;s.plannedSwings=[];return {gained};
 }
 if(a==='upgrade'){
  if(!['pick','worker','storage'].includes(input.target))fail('MINE_TARGET');
  if(s[input.target]>=st.maxLevels[input.target])fail('MINE_MAX_LEVEL');
  if(input.target==='storage'&&Math.max(s.pick,s.worker)<st.storageRequirement)fail('MINE_STORAGE_LOCKED');
  const cost=st.costs[input.target];if(s.gold<cost)fail('MINE_GOLD_REQUIRED');
  s.gold-=cost;s[input.target]++;s.cursor=now;s.plannedSwings=[];planSwings(s,rng);return {upgraded:input.target};
 }
 if(a==='costume')return saveCostume(s,input);
 if(a==='character'){if(!CHARACTERS.includes(input.character))fail('MINE_CHARACTER');s.character=input.character;s.chosen=true;return {};}
 if(a==='buy-pick'){
  const tool=PICKS.find(p=>p.id===input.tool);if(!tool)fail('MINE_TOOL');
  s.ownedPicks ||= ['rust'];if(s.ownedPicks.includes(tool.id)||(s.paidPicks||[]).includes(tool.id))return {owned:true};
  if(s.pick<tool.level)fail('MINE_PICK_LOCKED');if(s.gold<tool.price)fail('MINE_GOLD_REQUIRED');
  s.gold-=tool.price;s.ownedPicks.push(tool.id);s.tool=tool.id;s.cursor=now;s.plannedSwings=[];planSwings(s,rng);return {purchased:tool.id};
 }
 if(a==='tool'){
  if(input.tool!=='trial'&&!(s.ownedPicks||['rust']).includes(input.tool)&&!(s.paidPicks||[]).includes(input.tool))fail('MINE_TOOL');
  s.tool=input.tool;s.cursor=now;s.plannedSwings=[];planSwings(s,rng);return {};
 }
 fail('MINE_ACTION');
}
export function publicMine(s,now){
 const {gold,ore,pick,worker,storage,character,chosen,tool,cycle,claims,totalGold,cursor,lastStrike}=s;
 const online=s.presence&&s.presence.until>=now;
 return {gold,ore,pick,worker,storage,character,chosen,tool,cycle,claims,totalGold,cursor,lastStrike,ownedPicks:s.ownedPicks||['rust'],swings:(s.plannedSwings||[]).map(({at,hits,tool})=>({at,hits,tool})),costumes:s.costumes||{},campaignId:s.campaignId,paidPicks:s.paidPicks||[],mode:online?(s.presence.running?'player':'ready'):'offline',onlineToken:online?s.presence.token:null,onlineUntil:online?s.presence.until:0,serverNow:now,stats:mineStats(s)};
}
