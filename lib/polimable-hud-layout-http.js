import {defaults,validate,BOARD} from '../src/core/polimable-hud-layout.js';
export const KEY='jcs:polimable:layout:diamond249:hud:v1';
export const CAS="if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2]);return 1";
const out=(status,body)=>({status,body}),admin=u=>u?.role==='admin'&&u.status!=='suspended';
const response=(d,u)=>({ok:true,board:BOARD,version:d.version,layout:d.layout,canEdit:admin(u),editorId:admin(u)?String(u.id||'admin'):null,hasPrevious:admin(u)&&!!d.previous});
export async function handleLayout(req,{command,user}){
 if(!['GET','POST'].includes(req.method))return out(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
 if(req.method==='POST'){
  if(!admin(user))return out(403,{ok:false,error:'ADMIN_REQUIRED'});
  let origin;try{origin=new URL(req.headers?.origin||'');}catch{return out(403,{ok:false,error:'ORIGIN_REQUIRED'});}
  if(!['https:','http:'].includes(origin.protocol)||origin.host.toLowerCase()!==String(req.headers?.host||'').toLowerCase())return out(403,{ok:false,error:'ORIGIN_REJECTED'});
  if(!String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))return out(415,{ok:false,error:'JSON_REQUIRED'});
 }
 try{const raw=await command(['GET',KEY])||'';const d=raw?JSON.parse(raw):{version:0,layout:defaults(),previous:null};if(!Number.isInteger(d.version)||d.version<0)throw Error();d.layout=validate(d.layout);if(d.previous)d.previous=validate(d.previous);
  if(req.method==='GET')return out(200,response(d,user));
  let b=req.body;if(typeof b==='string'){if(b.length>98304)return out(413,{ok:false,error:'TOO_LARGE'});try{b=JSON.parse(b);}catch{return out(400,{ok:false,error:'INVALID_JSON'});}}
  if(!b||JSON.stringify(b).length>98304||!['publish','rollback'].includes(b.action)||!Number.isInteger(b.version))return out(400,{ok:false,error:'INVALID_INPUT'});
  if(b.version!==d.version)return out(409,{ok:false,error:'LAYOUT_CHANGED'});
  let layout;if(b.action==='rollback'){if(!d.previous)return out(409,{ok:false,error:'NO_PREVIOUS'});layout=d.previous;}else{try{layout=validate(b.layout);}catch{return out(400,{ok:false,error:'INVALID_LAYOUT'});}}
  const next={version:d.version+1,layout,previous:d.layout,updatedAt:new Date().toISOString(),updatedBy:String(user.id||'').slice(0,24)};
  if(Number(await command(['EVAL',CAS,'1',KEY,raw,JSON.stringify(next)]))!==1)return out(409,{ok:false,error:'LAYOUT_CHANGED'});
  return out(200,response(next,user));
 }catch{return out(503,{ok:false,error:'STORAGE_UNAVAILABLE'});}
}
