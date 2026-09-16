import {COMMUNITY_CAS_LUA} from './community-service.js';
import {INTELLIGENCE_KEYS as K} from './intelligence-keys.js';
import {decodeStored,encodeStored} from './intelligence-repository.js';
import {buildOperationalRankings} from './operational-ranking.js';
import {collectionProfileFor} from './collection-profile.js';
import {TARGET_KEYS} from './migration-service.js';

const parse=raw=>raw?decodeStored(raw):null;
export async function atomicValues(command,keys,before,after){
 return Number(await command(['EVAL',COMMUNITY_CAS_LUA,String(keys.length),...keys,...before,...after]))===1;
}

// One transaction switches the target input, every affected rank and (when used) the point debit.
// Other politicians' collected inputs are never rewritten or recollected.
export async function publishOnePerson({command,repository,profiles,personId,refreshId,now,billing}){
 for(let attempt=0;attempt<8;attempt++){
  const base=await repository.getPublicPointer();if(!base)throw Error('PUBLIC_SNAPSHOT_REQUIRED');
  const keys=[K.publicPointer,K.rankings(base),K.personRefresh(personId),K.job('publish'),TARGET_KEYS.adminPoliticianRecords,K.draft(base,personId),K.publicPersonOverride(personId),K.mediaRevision];
  if(billing)keys.push('jcs:points:v1:wallet:'+billing.userId);
  const before=await Promise.all(keys.map(k=>command(['GET',k]).then(x=>x||'')));
  if(before[0]!==base)continue;
  const previous=parse(before[1]),record=parse(before[2]),job=parse(before[3]),person=profiles.find(x=>x.id===personId);
  if(billing){const wallet=parse(before[8])||{},paid=(wallet.ledger||[]).find(x=>x.type==='person-refresh'&&x.requestId===billing.requestId);if(paid)return paid.result;}
  if(job?.status==='RUNNING'||job?.publicationPending===true)throw Error('PUBLICATION_BUSY');
  if(!record||!['DRAFT','APPROVED','PUBLISHED'].includes(record.status)||!record.validation?.ok)throw Error('PERSON_REFRESH_NOT_READY');
  if(refreshId&&refreshId!==record.refreshId)throw Error('PERSON_REFRESH_CHANGED');
  if(record.billingUserId&&(!billing||billing.userId!==record.billingUserId||billing.requestId!==record.billingRequestId))throw Error('PERSON_REFRESH_MEMBER_OWNED');
  if(record.status==='PUBLISHED')return {refresh:record,rank:previous?.byId?.[personId]||null};
  if(record.basePublicSnapshot!==base)throw Error('PERSON_REFRESH_BASE_CHANGED');
  const editorial=parse(before[4])?.records?.[personId]||{},profile=collectionProfileFor(person,editorial);
  if(JSON.stringify(profile)!==JSON.stringify(record.collectionProfile))throw Error('PERSON_PROFILE_CHANGED');
  if(JSON.stringify(editorial.newsExclusions||[])!==JSON.stringify(record.newsExclusions||[]))throw Error('PERSON_PROFILE_CHANGED');
  const draft=(await repository.getDrafts(record.snapshotId,[personId]))[0]?.value;
  if(!draft||draft.refreshId!==record.refreshId)throw Error('PERSON_REFRESH_CHANGED');
  if(!previous?.byId)throw Error('PUBLIC_SNAPSHOT_REQUIRED');
  const ids=[...new Set([...Object.keys(previous.byId),personId])],rows=await repository.getDrafts(base,ids);
  if(rows.some(x=>x.personId!==personId&&!x.value))throw Error('PUBLIC_INPUT_MISSING');
  const drafts=rows.map(x=>x.personId===personId?draft:x.value),ranks=buildOperationalRankings(drafts,new Map(profiles.map(x=>[x.id,x])),base,now(),previous.weights);
  // A selective refresh is not a synchronized trend measurement.
  ranks.rising={ready:false,items:[],reason:'SELECTIVE_REFRESH'};
  ranks.lastPersonRefresh={personId,at:now()};
  const next={...record,status:'PUBLISHED',publishedAt:now(),lastPublishedAt:now(),validationMode:'AUTOMATIC'},result={refresh:next,rank:ranks.byId[personId],previousRank:previous.byId[personId]||null};
  const after=[...before];after[1]=encodeStored(ranks);after[2]=JSON.stringify(next);after[5]=encodeStored({...draft,personPublishedAt:now()});after[6]='{}';after[7]=String(now())+'-'+record.refreshId;
  if(billing){
   const wallet=parse(before[8])||{},request=wallet.refreshRequests?.[billing.requestId];
   if(!request||request.personId!==personId||request.status!=='RUNNING'||request.fee!==billing.fee||request.expiresAt<now())throw Error('REFRESH_REQUEST_EXPIRED');
   if(Number(wallet.balance||0)<billing.fee)throw Error('INSUFFICIENT_POINTS');
   wallet.balance-=billing.fee;
   const paidResult={ok:true,personId,name:person.name,points:billing.fee,publishedAt:next.publishedAt,rank:ranks.byId[personId]?.rank,requestId:billing.requestId};
   wallet.ledger||=[];wallet.ledger.push({id:record.refreshId,type:'person-refresh',points:-billing.fee,at:now(),personId,personName:person.name,requestId:billing.requestId,result:paidResult});
   delete wallet.refreshRequests[billing.requestId];after[8]=JSON.stringify(wallet);
   if(await atomicValues(command,keys,before,after))return paidResult;
  }else if(await atomicValues(command,keys,before,after))return result;
 }
 throw Error('PERSON_PUBLICATION_CHANGED_RETRY');
}
