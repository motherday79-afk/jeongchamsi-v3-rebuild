export function mineErrorStatus(code){if(code==='LOGIN_REQUIRED')return 401;if(['FORBIDDEN','MINE_FORBIDDEN','MINE_ORIGIN'].includes(code))return 403;if(code==='MINE_BUSY')return 409;if(code==='MINE_COOLDOWN')return 429;if(code==='MINE_VISIT_EXPIRED')return 410;return /^MINE_(?:STORAGE_INVALID|NETWORK)/.test(code)||!/^MINE_/.test(code)?503:400;}
export async function miningRequest(req,{service,user,url}){
 try{
  if(!user?.id)return {status:401,data:{ok:false,error:'LOGIN_REQUIRED'}};
  const admin=url.pathname.endsWith('/admin')||url.searchParams.get('path')==='mine/admin'||req.query?.path==='mine/admin';
  const visit=url.pathname.endsWith('/visit')||url.searchParams.get('path')==='mine/visit'||req.query?.path==='mine/visit';
  if(!['GET','POST'].includes(req.method)||visit&&req.method!=='GET')return {status:405,data:{ok:false,error:'METHOD_NOT_ALLOWED'}};
  if(req.method==='POST'){
   const origin=req.headers?.origin;
   if(req.headers?.['sec-fetch-site']==='cross-site')return {status:403,data:{ok:false,error:'MINE_ORIGIN'}};
   if(origin&&new URL(origin).host!==url.host)return {status:403,data:{ok:false,error:'MINE_ORIGIN'}};
   if(!String(req.headers?.['content-type']||'').includes('application/json'))return {status:415,data:{ok:false,error:'MINE_JSON_REQUIRED'}};
  }
  let body=req.body||{};if(typeof body==='string'){if(body.length>6000)throw new Error('MINE_INPUT');try{body=JSON.parse(body);}catch{throw new Error('MINE_INPUT');}}
  if(!body||Array.isArray(body)||typeof body!=='object')throw new Error('MINE_INPUT');
  if(visit)return {status:303,redirect:await service.visit(user,url.searchParams.get('token')||req.query?.token)};
  const data=admin?await service.admin(user,req.method==='POST'?body:undefined):await service.run(user,req.method==='POST'?body:{action:'sync'});
  return {status:data.ok?200:mineErrorStatus(data.error),data};
 }catch(e){const code=/^MINE_[A-Z_]+$/.test(e.message)||['LOGIN_REQUIRED','FORBIDDEN','STORAGE_CAPACITY'].includes(e.message)?e.message:'MINE_NETWORK';return {status:mineErrorStatus(code),data:{ok:false,error:code}};}
}
