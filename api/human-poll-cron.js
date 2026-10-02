import {createHumanPollService} from '../lib/human-poll-service.js';
import {humanPollCronRequest} from '../lib/human-poll-http.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
import {enqueueCompletionPush} from '../lib/push-runtime.js';
import {operationEvent} from '../lib/update-notifications.js';
import {createPartyPollService} from '../lib/party-poll-service.js';
export default async function handler(req,res){
 // Defer Redis setup until authentication has succeeded.
 const failures=[];
 const service={collectScheduled:async()=>{
  const command=rebuildRedisCommand();
  const [approval,party]=await Promise.allSettled([createHumanPollService({command}).collectScheduled(),createPartyPollService({command}).collectScheduled()]);
  if(approval.status==='rejected')failures.push(operationEvent('poll','run',Date.now()));
  if(party.status==='rejected')failures.push({...operationEvent('party-poll','run',Date.now()),target:'party-poll'});
  if(approval.status==='rejected'&&party.status==='rejected')throw approval.reason;
  return {ok:true,approval:approval.status==='fulfilled'?approval.value:{ok:false,error:'APPROVAL_COLLECTION_FAILED'},party:party.status==='fulfilled'?party.value:{ok:false,error:'PARTY_COLLECTION_FAILED'}};
 }};
 const result=await humanPollCronRequest(req,{service});
 if(result.status===200)await enqueueCompletionPush(failures);
 else if(result.status===503)await enqueueCompletionPush(failures.length?failures:[operationEvent('poll','run',Date.now())]);
 res.statusCode=result.status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(result.data));
}
