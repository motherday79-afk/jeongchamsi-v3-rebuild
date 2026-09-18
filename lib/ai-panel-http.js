import {AI_PANEL_MAX_BYTES} from './ai-panel-service.js';
import {isAdmin} from '../src/core/ai-panel-model.js';
const failure=(status,error)=>({status,data:{ok:false,error}});
const statusFor=code=>code==='AI_PANEL_FORBIDDEN'||code==='AI_PANEL_ORIGIN_INVALID'?403:code==='AI_PANEL_NOT_FOUND'?404:code==='AI_PANEL_CONFLICT'?409:code==='AI_PANEL_LIMIT_REACHED'?413:code==='AI_PANEL_STORAGE_FAILED'?503:400;
export async function aiPanelRequest(req,{service,user=null,url}={}){
 try{
  const method=req.method||'GET',params=url.searchParams;
  if(method==='GET'){
   if(params.get('view')==='history')return {status:200,data:await service.history(params.get('panel'),{page:params.get('page')||1})};
   const editing=params.get('edit')==='1'||params.get('view')==='manage';if(editing&&!isAdmin(user))return failure(403,'AI_PANEL_FORBIDDEN');
   const reader=editing?user:null;
   const data=params.get('view')==='panels'?await service.panels(params.get('panelId'),reader):params.has('id')?await service.get(params.get('id'),reader):await service.list(reader,{view:params.get('view')});return {status:200,data};
  }
  if(method!=='POST')return failure(405,'METHOD_NOT_ALLOWED');
  if(req.headers?.['sec-fetch-site']==='cross-site')return failure(403,'AI_PANEL_ORIGIN_INVALID');
  if(req.headers?.origin){try{if(new URL(req.headers.origin).origin!==url.origin)return failure(403,'AI_PANEL_ORIGIN_INVALID');}catch{return failure(403,'AI_PANEL_ORIGIN_INVALID');}}
  let body=req.body;const serialized=typeof body==='string'?body:JSON.stringify(body||null);if(Buffer.byteLength(serialized)>AI_PANEL_MAX_BYTES)return failure(413,'AI_PANEL_LIMIT_REACHED');
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return failure(400,'AI_PANEL_INPUT_INVALID');}}
  if(!body||typeof body!=='object'||Array.isArray(body))return failure(400,'AI_PANEL_INPUT_INVALID');return {status:201,data:await service.save(user,body)};
 }catch(error){const code=String(error?.message||'');return /^AI_PANEL_[A-Z_]+$/.test(code)?failure(statusFor(code),code):failure(500,'AI_PANEL_REQUEST_FAILED');}
}
