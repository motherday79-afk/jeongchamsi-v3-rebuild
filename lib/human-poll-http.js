import {timingSafeEqual} from 'node:crypto';
import {isAdmin} from '../src/core/ai-panel-model.js';
const failure=(status,error)=>({status,data:{ok:false,error}});
export async function humanPollRequest(req,{service,user=null,url}={}){
 try{
  if(req.method==='GET')return {status:200,data:await service.list()};
  if(req.method!=='POST')return failure(405,'METHOD_NOT_ALLOWED');
  if(!isAdmin(user))return failure(403,'HUMAN_POLL_FORBIDDEN');
  // Browser mutations must include an exact same-origin Origin header.
  let origin;try{origin=new URL(req.headers?.origin).origin;}catch{return failure(403,'HUMAN_POLL_ORIGIN_INVALID');}
  if(origin!==url.origin||req.headers?.['sec-fetch-site']==='cross-site')return failure(403,'HUMAN_POLL_ORIGIN_INVALID');
  let body=req.body;if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body||{}))>16384)return failure(413,'HUMAN_POLL_INPUT_INVALID');
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return failure(400,'HUMAN_POLL_INPUT_INVALID');}}
  if(body?.operation==='collect')return {status:200,data:await service.collect(user)};
  if(body?.operation==='manual'&&typeof body?.text==='string')return {status:200,data:await service.manual(user,{text:body.text})};
  return failure(400,'HUMAN_POLL_INPUT_INVALID');
 }catch(error){
  if(error?.message==='HUMAN_POLL_BUSY')return failure(409,'HUMAN_POLL_BUSY');
  if(error?.message==='HUMAN_POLL_INPUT_INVALID')return failure(400,'HUMAN_POLL_INPUT_INVALID');
  return failure(503,'HUMAN_POLL_UNAVAILABLE');
 }
}
export async function humanPollCronRequest(req,{service,secret=process.env.CRON_SECRET}={}){
 if(req.method!=='GET'&&req.method!=='POST')return failure(405,'METHOD_NOT_ALLOWED');
 const expected=Buffer.from(`Bearer ${secret||''}`),actual=Buffer.from(String(req.headers?.authorization||''));
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return failure(401,'UNAUTHORIZED');
 try{return {status:200,data:await service.collectScheduled()};}catch(error){return failure(error?.message==='HUMAN_POLL_BUSY'?409:503,'HUMAN_POLL_UNAVAILABLE');}
}
