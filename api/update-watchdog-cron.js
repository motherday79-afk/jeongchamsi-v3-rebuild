import {timingSafeEqual} from 'node:crypto';
import {groupPushService} from '../lib/group-push-runtime.js';
import {webBroadcastService} from '../lib/web-broadcast-runtime.js';
import {monitorUpdatePush} from '../lib/push-runtime.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
export default async function handler(req,res){
 const expected=Buffer.from(`Bearer ${process.env.CRON_SECRET||''}`),actual=Buffer.from(String(req.headers?.authorization||''));
 let status=200,data;
 if(req.method!=='GET')status=405;
 else if(!process.env.CRON_SECRET||expected.length!==actual.length||!timingSafeEqual(expected,actual))status=401;
 else if(process.env.VERCEL_ENV!=='production')status=409;
 else try{const command=rebuildRedisCommand();const results=await Promise.allSettled([monitorUpdatePush(command),groupPushService(command).recover(),webBroadcastService(command).recover()]);data={groupPending:results[1].status==='fulfilled'?results[1].value:null,webPending:results[2].status==='fulfilled'?results[2].value:null};if(results.some(r=>r.status==='rejected'))status=503;}catch{status=503;}
 res.statusCode=status;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:status===200,...data}));
}
