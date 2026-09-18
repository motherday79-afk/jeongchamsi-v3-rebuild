import {createHumanPollService} from '../lib/human-poll-service.js';
import {humanPollCronRequest} from '../lib/human-poll-http.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
export default async function handler(req,res){
 // Defer Redis setup until authentication has succeeded.
 const service={collectScheduled:()=>createHumanPollService({command:rebuildRedisCommand()}).collectScheduled()};
 const result=await humanPollCronRequest(req,{service});
 res.statusCode=result.status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(result.data));
}
