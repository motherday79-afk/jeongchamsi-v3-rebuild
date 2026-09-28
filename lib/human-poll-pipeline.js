import {publicHumanPoll} from './human-poll-service.js';
import {collectDocumentPolls} from './human-poll-document-collector.js';
import {collectOfficialPolls} from './human-poll-sources.js';
const ids=['gallup','realmeter','nbs'];
export const POLL_SNAPSHOT_URL='https://raw.githubusercontent.com/motherday79-afk/jeongchamsi-v3-rebuild/refs/heads/codex/poll-data/poll-output.json';
export function validateCollectedSnapshot(data,{now=Date.now}={}){
 const instant=now(),stamp=Date.parse(data?.collectedAt),bad=()=>{throw Error('POLL_SNAPSHOT_INVALID');};
 if(data?.schema!=='JCS_OFFICIAL_POLL_SNAPSHOT_V2'||!Number.isFinite(stamp)||stamp>instant+300000||instant-stamp>26*3600000||!Array.isArray(data.items)||data.items.length>3||!Array.isArray(data.providers))bad();
 const items=data.items.map(publicHumanPoll);if(items.some(p=>!p||p.publishedDate>new Date(instant).toISOString().slice(0,10)))bad();
 const seen=new Set();for(const p of items){const id=p.provenance.provider;if(!ids.includes(id)||seen.has(id)||!data.providers.some(s=>s.id===id&&s.state==='success')||!Number.isFinite(Date.parse(p.fetchedAt))||Math.abs(Date.parse(p.fetchedAt)-stamp)>30*60000)bad();seen.add(id);}
 return {items,providers:ids.map(id=>({id,state:seen.has(id)?'success':'error',checkedAt:data.collectedAt,fetchedCount:seen.has(id)?1:0}))};
}
export async function collectReliablePolls({fetch=globalThis.fetch,now=Date.now,documents=collectDocumentPolls,summaries=collectOfficialPolls}={}){
 const checkedAt=new Date(now()).toISOString();let remote={items:[],providers:[]};
 try{
  const r=await fetch(POLL_SNAPSHOT_URL,{redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
  if(!r.ok||Number(r.headers.get('content-length'))>262144)throw Error('SNAPSHOT_HTTP');
  const text=await r.text();if(Buffer.byteLength(text)>262144)throw Error('SNAPSHOT_SIZE');remote=validateCollectedSnapshot(JSON.parse(text),{now});
 }catch(error){console.warn('HUMAN_POLL_SNAPSHOT',{code:String(error.message).slice(0,80)});}
 const missing=ids.filter(id=>!remote.items.some(p=>p.provenance.provider===id));
 // Independent calls keep the Vercel request within its 60-second limit.
 const attempts=await Promise.allSettled([
  missing.length?documents({fetch,now,providerIds:missing}):{items:[],providers:[]},
  missing.includes('realmeter')?summaries({fetch,now,limit:1,providerIds:['realmeter']}):{items:[],providers:[]}
 ]);
 const [direct,fallback]=attempts.map(r=>r.status==='fulfilled'?r.value:{items:[],providers:[]});
 const items=[...remote.items,...direct.items];
 for(const item of fallback.items)if(!items.some(p=>p.provenance.provider===item.provenance.provider))items.push(item);
 return {items,providers:ids.map(id=>({id,state:items.some(p=>p.provenance.provider===id)?'success':'error',checkedAt,fetchedCount:items.filter(p=>p.provenance.provider===id).length}))};
}
