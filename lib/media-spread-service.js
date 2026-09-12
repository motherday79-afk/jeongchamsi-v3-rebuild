import {buildMediaIndex,analyzeMediaIndex,MEDIA_INDEX_VERSION} from './media-spread.js';
import {INTELLIGENCE_KEYS as K} from './intelligence-keys.js';
import {createIntelligenceRepository,decodeStored,encodeStored,chunkKeys} from './intelligence-repository.js';
import {POLITICIAN_TYPES,readPoliticianType,readPoliticianPhotos} from './politician-store.js';

const cache=new Map();
const decode=raw=>{if(!raw)return null;return decodeStored(raw);};
// Keep concurrent cold loads together; the cache contains public source facts only.
async function mapBatches(ids,worker){const chunks=chunkKeys(ids),rows=[];for(let i=0;i<chunks.length;i+=4)rows.push(...(await Promise.all(chunks.slice(i,i+4).map(worker))).flat());return rows;}
export function createMediaSpreadService({command,profiles,now=Date.now,scope,env=process.env}={}){
 const repo=createIntelligenceRepository(command),scopeKey=scope||env.JCS_REBUILD_REDIS_REDIS_URL||env.JCS_REBUILD_REDIS_URL||env.JCS_REBUILD_REDIS_REST_URL||command;
 let profilesPromise;
 const loadProfiles=()=>profilesPromise||(profilesPromise=profiles?Promise.resolve(profiles):Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type))).then(rows=>rows.flat()));
 async function invalidate(){await command(['SET',K.mediaRevision,`${Number(now())}-${Math.random().toString(36).slice(2)}`]);cache.delete(scopeKey);}
 async function save(snapshot,index,revision=''){
  const packed=encodeStored({revision,index});
  // Bounded additional storage; very large installations can still use the process cache.
  if(Buffer.byteLength(packed)>4*1024*1024)return false;
  await command(['SET',K.mediaIndex(snapshot),packed,'EX','86400']);return true;
 }
 async function preload(snapshot,drafts,people){const revision=String(await command(['GET',K.mediaRevision])||'');const index=buildMediaIndex(drafts,people);await save(snapshot,index,revision);cache.delete(scopeKey);}
 async function load(){
  const [pointer,revision]=await Promise.all([repo.getPublicPointer(),command(['GET',K.mediaRevision]).then(value=>String(value||''))]);
  if(!pointer)return buildMediaIndex([],await loadProfiles());
  const token=MEDIA_INDEX_VERSION+'|'+pointer+'|'+revision,old=cache.get(scopeKey);if(old?.token===token&&old.until>Date.now())return old.promise;
  const promise=(async()=>{
   const people=await loadProfiles();
   const stored=decode(await command(['GET',K.mediaIndex(pointer)]));
   if(stored?.revision===revision&&stored.index?.version===MEDIA_INDEX_VERSION){return {...stored.index,people:buildMediaIndex([],people).people};}
   const ids=people.filter(p=>p?.id&&p.isVacant!==true).map(p=>p.id);
   const [base,overrides]=await Promise.all([mapBatches(ids,chunk=>repo.getDrafts(pointer,chunk)),mapBatches(ids,async chunk=>{const values=await command(['MGET',...chunk.map(K.publicPersonOverride)]);return chunk.map((id,i)=>({id,value:decode(values?.[i])}));})]);
   const rows=new Map(base.map(row=>[row.personId,row.value]));
   const missing=ids.filter(id=>!rows.get(id));
   if(missing.length)for(const row of await mapBatches(missing,chunk=>repo.getPublishedBatch(pointer,chunk)))if(row.value)rows.set(row.personId,row.value);
   const valid=overrides.filter(row=>row.value?.basePublicSnapshot===pointer&&row.value?.snapshotId),grouped=new Map();
   for(const row of valid){const snapshot=row.value.snapshotId;if(!grouped.has(snapshot))grouped.set(snapshot,[]);grouped.get(snapshot).push(row.id);}
   // Refresh groups are usually single-person; cap concurrent reads as with base snapshots.
   const entries=[...grouped];for(let i=0;i<entries.length;i+=4){for(const result of await Promise.all(entries.slice(i,i+4).map(([snapshot,ids])=>repo.getDrafts(snapshot,ids))))for(const row of result)if(row.value)rows.set(row.personId,row.value);}
   const index=buildMediaIndex([...rows.values()].filter(Boolean),people);
   await save(pointer,index,revision).catch(()=>false);return index;
  })();
  cache.set(scopeKey,{token,until:Date.now()+60000,promise});while(cache.size>3)cache.delete(cache.keys().next().value);
  promise.catch(()=>{if(cache.get(scopeKey)?.promise===promise)cache.delete(scopeKey);});return promise;
 }
 async function search(input={}){
  const empty=buildMediaIndex([],await loadProfiles()),preview=analyzeMediaIndex(empty,{...input,now:Number(now())});
  const result=preview.matches.length||preview.target.kind!=='none'?analyzeMediaIndex(await load(),{...input,now:Number(now())}):preview;
  const photos=profiles?{}:await readPoliticianPhotos(command);
  result.matches=result.matches.map(person=>({...person,photo:photos[person.id]||null}));
  if(result.target.person)result.target.person={...result.target.person,photo:photos[result.target.person.id]||null};
  return result;
 }
 return {search,preload,invalidate};
}
