const statusFor=code=>code==='LOGIN_REQUIRED'?401:code==='GROUP_NOT_FOUND'?404:code==='GROUP_CONFLICT'?409:['GROUP_FORBIDDEN','GROUP_MEMBERS_ONLY','GROUP_EXAMPLE_READ_ONLY','GROUP_ORIGIN_INVALID'].includes(code)?403:code.includes('STORAGE')||code==='GROUP_MEDIA_NOT_CONFIGURED'?503:400;
const failure=(status,error)=>({status,data:{ok:false,error}});
export async function groupRequest(req,{service,user=null,url}={}){
 const method=req.method||'GET',params=url.searchParams;
 try{
  if(method==='GET'){
   if(params.has('imageId'))return {status:200,media:await service.image(params.get('id'),params.get('imageId'),user)};
   const data=params.has('id')?await service.get(params.get('id'),user,{invite:params.get('invite')||''}):await service.list(user,{view:params.get('view')||'browse',category:params.get('category')||'all',q:params.get('q')||'',page:params.get('page')||1,visibility:params.get('visibility')==='public'?'public':'all'});
   return {status:200,data};
  }
  if(method!=='POST')return failure(405,'METHOD_NOT_ALLOWED');
  const origin=req.headers?.origin;
  if(req.headers?.['sec-fetch-site']==='cross-site')return failure(403,'GROUP_ORIGIN_INVALID');
  if(origin){try{if(new URL(origin).origin!==url.origin)return failure(403,'GROUP_ORIGIN_INVALID');}catch{return failure(403,'GROUP_ORIGIN_INVALID');}}
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return failure(400,'GROUP_INPUT_INVALID');}}
  if(!body||typeof body!=='object'||Array.isArray(body))return failure(400,'GROUP_INPUT_INVALID');
  const data=params.get('image')==='1'?await service.upload(user,body):await service.save(user,body);
  return {status:201,data};
 }catch(error){
  const raw=String(error?.message||''),known=/^GROUP_[A-Z_]+$/.test(raw)||raw==='LOGIN_REQUIRED';
  return failure(known?statusFor(raw):500,known?raw:'GROUP_REQUEST_FAILED');
 }
}
