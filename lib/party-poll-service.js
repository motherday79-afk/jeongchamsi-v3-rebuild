import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
export const PARTY_POLL_KEYS={snapshot:'jcsr2:party-polls:v1:snapshot',lock:'jcsr2:party-polls:v1:lock'};
export const PARTY_SNAPSHOT_URL='https://raw.githubusercontent.com/motherday79-afk/jeongchamsi-v3-rebuild/refs/heads/codex/poll-data/party-poll-output.json';
const providerNames={gallup:'한국갤럽',realmeter:'리얼미터',nbs:'NBS'};
const hosts=['gallup.co.kr','www.gallup.co.kr','realmeter.net','www.realmeter.net','nbsurvey.kr','www.nbsurvey.kr','ekn.kr','www.ekn.kr'];
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const text=(v,n=500)=>typeof v==='string'?v.slice(0,n):'';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const release="-- PARTY_RELEASE\nif redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0";
const commit="-- PARTY_COMMIT\nif redis.call('GET',KEYS[1])~=ARGV[1] or (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end redis.call('SET',KEYS[2],ARGV[3]) return 1";
export function publicPartyPoll(p){
 if(!p||p.topic!=='party-support'||!providerNames[p.provenance?.provider]||!date(p.startDate)||!date(p.endDate)||!date(p.publishedDate)||p.startDate>p.endDate||p.endDate>p.publishedDate||!Number.isInteger(p.sampleSize)||p.sampleSize<1)return null;
 let source;try{source=new URL(p.sourceUrl);}catch{return null;}if(!hosts.includes(source.hostname)||!['https:','http:'].includes(source.protocol)||source.username||source.password)return null;
 const parties=p.results?.parties;if(!Array.isArray(parties)||parties.length<2||parties.length>30)return null;
 const seen=new Set();for(const row of parties){if(!/^[-a-z0-9]{1,50}$/.test(row?.id||'')||seen.has(row.id)||!text(row.name,70)||typeof row.value!=='number'||!Number.isFinite(row.value)||row.value<0||row.value>100)return null;seen.add(row.id);}
 if(Math.abs(parties.reduce((sum,row)=>sum+row.value,0)-100)>2)return null;
 const provider=p.provenance.provider;
 return {id:text(p.id,160)||`${provider}-${p.publishedDate}`,topic:'party-support',institution:providerNames[provider],sourceUrl:source.href,publishedDate:p.publishedDate,startDate:p.startDate,endDate:p.endDate,sampleSize:p.sampleSize,question:text(p.question)||'현재 지지하는 정당',method:text(p.method),commissioner:text(p.commissioner),marginOfError:typeof p.marginOfError==='number'?p.marginOfError:null,responseRate:typeof p.responseRate==='number'?p.responseRate:null,results:{parties:parties.map(({id,name,value})=>({id,name:text(name,70),value}))},provenance:{provider,parserVersion:text(p.provenance.parserVersion,80)},fetchedAt:text(p.fetchedAt,40)};
}
const latest=items=>Object.keys(providerNames).flatMap(id=>items.filter(p=>p.provenance.provider===id).sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||b.endDate.localeCompare(a.endDate)).slice(0,1));
const fingerprint=p=>hash({...p,fetchedAt:undefined,id:undefined,provenance:{provider:p.provenance.provider},results:{parties:[...p.results.parties].sort((a,b)=>a.id.localeCompare(b.id))}});
function seedItems(){try{const data=JSON.parse(readFileSync(new URL('../data/party-polls-latest.json',import.meta.url),'utf8'));return Array.isArray(data)?data:data.items||[];}catch{return [];}}
function seedAi(){try{return JSON.parse(readFileSync(new URL('../data/party-ai-latest.json',import.meta.url),'utf8'));}catch{return {state:'pending'};}}
export async function collectPartySnapshot({fetch=globalThis.fetch,now=Date.now}={}){
 try{
 const response=await fetch(PARTY_SNAPSHOT_URL,{redirect:'error',signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('PARTY_SNAPSHOT_UNAVAILABLE');const body=await response.text();if(Buffer.byteLength(body)>262144)throw Error('PARTY_SNAPSHOT_SIZE');const data=JSON.parse(body),at=Date.parse(data.collectedAt);
 if(data.schema!=='JCS_PARTY_POLL_SNAPSHOT_V1'||!Number.isFinite(at)||now()-at>26*3600000||at>now()+300000||!Array.isArray(data.items)||data.items.length>3)throw Error('PARTY_SNAPSHOT_INVALID');
 const items=data.items.map(publicPartyPoll);if(items.some(p=>!p||p.publishedDate>new Date(now()+9*3600000).toISOString().slice(0,10)))throw Error('PARTY_SNAPSHOT_INVALID');
 return {items,providers:data.providers||[]};
 }catch{
  return (await import('./party-poll-sources.js')).collectPartyPolls({fetch,now});
 }
}
export function createPartyPollService({command,fetch=globalThis.fetch,now=Date.now,seed=seedItems(),collect=collectPartySnapshot,generate=async options=>(await import('./party-poll-ai.js')).generatePartyEstimate(options)}={}){
 const valid=rows=>(rows||[]).map(publicPartyPoll).filter(Boolean);
 const read=async()=>{const raw=await command(['GET',PARTY_POLL_KEYS.snapshot]);return {raw,data:raw?JSON.parse(raw):{items:valid(seed),providers:[],notifications:[],ai:seed.length?seedAi():{state:'pending'}}};};
 const view=data=>{const ai={...(data.ai||{state:'pending'})};delete ai.audit;return {ok:true,items:latest(valid(data.items)),history:valid(data.items).slice(0,156),providers:data.providers||[],ai,lastCheckedAt:data.lastCheckedAt||null,lastSuccessAt:data.lastSuccessAt||null};};
 async function run(){
  const token=randomUUID();if(await command(['SET',PARTY_POLL_KEYS.lock,token,'NX','EX',120])!=='OK')throw Error('PARTY_POLL_BUSY');
  try{
   const {raw,data:previous}=await read(),checkedAt=new Date(now()).toISOString();let result;try{result=await collect({fetch,now});}catch{result={items:[],providers:[]};}
   const incoming=valid(result.items).filter(p=>p.publishedDate<=new Date(now()+9*3600000).toISOString().slice(0,10)),records=valid(previous.items);
   for(const item of incoming){const index=records.findIndex(p=>p.provenance.provider===item.provenance.provider&&p.startDate===item.startDate&&p.endDate===item.endDate);if(index>=0)records[index]=item;else records.push(item);}
   records.sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate));const items=records.slice(0,156),current=latest(items),before=latest(valid(previous.items));
   const changed=current.filter(p=>!before.some(old=>old.provenance.provider===p.provenance.provider&&fingerprint(old)===fingerprint(p))).map(p=>p.provenance.provider);
   const providers=Object.entries(providerNames).map(([id,institution])=>{const success=incoming.some(p=>p.provenance.provider===id)&&result.providers?.some(p=>p.id===id&&p.state==='success');return {id,institution,state:success?'success':'error',checkedAt,lastSuccessAt:success?checkedAt:previous.providers?.find(p=>p.id===id)?.lastSuccessAt||null};});
   let ai;try{ai=incoming.length?await generate({items:current,previous:previous.ai,fetch,now}):{...previous.ai,stale:previous.ai?.state==='ready',refreshState:'source_error'};}catch{ai=previous.ai?.state==='ready'?{...previous.ai,stale:true,refreshState:'error'}:{state:'error'};}
   const events=[];
   if(changed.length)events.push({id:`party-poll:${hash(current.map(fingerprint))}`,kind:'party-poll',target:'party-poll',providers:changed,at:now()});
   const failed=providers.filter(p=>p.state==='error').map(p=>p.id),day=checkedAt.slice(0,10);
   if(failed.length)events.push({id:`party-failure:${day}:${failed.join(',')}`,kind:'failure',target:'party-poll',providers:failed,reason:'source',at:now()});
   if(ai?.state==='ready'&&!ai.stale&&hash(ai.results)!==hash(previous.ai?.results))events.push({id:`party-ai:${hash([ai.publishedDate,ai.results])}`,kind:'party-ai',target:'party-poll',at:now()});
   const notifications=[...(previous.notifications||[]),...events].filter(e=>now()-e.at<86400000).filter((e,i,a)=>a.findIndex(v=>v.id===e.id)===i).slice(-60);
   const next={items,providers,ai,notifications,lastCheckedAt:checkedAt,lastSuccessAt:incoming.length?checkedAt:previous.lastSuccessAt||null};
   if(Number(await command(['EVAL',commit,'2',PARTY_POLL_KEYS.lock,PARTY_POLL_KEYS.snapshot,token,raw||'',JSON.stringify(next)]))!==1)throw Error('PARTY_POLL_BUSY');
   return view(next);
  }finally{await command(['EVAL',release,'1',PARTY_POLL_KEYS.lock,token]);}
 }
 return {list:async()=>view((await read()).data),collectScheduled:run};
}
