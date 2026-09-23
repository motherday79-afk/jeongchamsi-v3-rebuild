export const MINING_VERSION=275;
export const CHARACTERS=['strong','glamour','elf'];
const fail=code=>{throw new Error(code);};
export function newMine(now){return {version:1,gold:0,ore:0,pick:1,worker:1,storage:1,character:'strong',chosen:false,tool:'basic',cursor:now,lastStrike:null,cycle:1,claims:0,totalGold:0,receipts:[],ledger:[],testCycle:false};}
export function mineStats(s){
 return {capacity:s.storage*10,chance:Math.min(.8,.03+(s.pick-1)*.02+(s.tool==='trial'?.12:0)),doubleChance:s.tool==='trial'?.25:0,autoMs:Math.max(1100,3000-(s.worker-1)*100),manualMs:1500,
 costs:{pick:Math.ceil(5*s.pick**1.35),worker:Math.ceil(7*s.worker**1.35),storage:20*s.storage},storageRequirement:s.storage*5,maxLevel:20,maxLevels:{pick:20,worker:20,storage:5}};
}
export function advanceMine(s,now,rng=Math.random){
 const st=mineStats(s);if(now<=s.cursor||s.ore>=st.capacity)return 0;
 let swings=Math.floor((now-s.cursor)/st.autoMs),gained=0;
 // Sample waiting time between productive swings rather than looping over days of misses.
 const p=st.chance,d=st.doubleChance,q=p+d*p-d*p*p,two=d*p*p/q;
 while(swings>0&&s.ore<st.capacity){
  const u=Math.max(0,Math.min(1-Number.EPSILON,rng()));
  const wait=Math.floor(Math.log1p(-u)/Math.log1p(-q))+1;
  if(wait>swings){s.cursor+=swings*st.autoMs;break;}
  swings-=wait;s.cursor+=wait*st.autoMs;
  const amount=Math.min(st.capacity-s.ore,two>0&&rng()<two?2:1);s.ore+=amount;gained+=amount;
 }
 return gained;
}
export function applyMineAction(s,input,now,rng=Math.random){
 const st=mineStats(s),a=input.action;
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
  const gained=s.ore;s.gold+=gained;s.totalGold+=gained;s.ore=0;s.claims++;s.cycle++;s.cursor=now;return {gained};
 }
 if(a==='upgrade'){
  if(!['pick','worker','storage'].includes(input.target))fail('MINE_TARGET');
  if(s[input.target]>=st.maxLevels[input.target])fail('MINE_MAX_LEVEL');
  if(input.target==='storage'&&Math.max(s.pick,s.worker)<st.storageRequirement)fail('MINE_STORAGE_LOCKED');
  const cost=st.costs[input.target];if(s.gold<cost)fail('MINE_GOLD_REQUIRED');
  s.gold-=cost;s[input.target]++;s.cursor=now;return {upgraded:input.target};
 }
 if(a==='character'){if(!CHARACTERS.includes(input.character))fail('MINE_CHARACTER');s.character=input.character;s.chosen=true;return {};}
 if(a==='tool'){if(!['basic','trial'].includes(input.tool))fail('MINE_TOOL');s.tool=input.tool;s.cursor=now;return {};}
 fail('MINE_ACTION');
}
export function publicMine(s,now){
 const {gold,ore,pick,worker,storage,character,chosen,tool,cycle,claims,totalGold,cursor,lastStrike}=s;
 return {gold,ore,pick,worker,storage,character,chosen,tool,cycle,claims,totalGold,cursor,lastStrike,serverNow:now,stats:mineStats(s)};
}
