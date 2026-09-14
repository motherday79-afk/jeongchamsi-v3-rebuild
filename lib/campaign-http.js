const statusFor=code=>code==='ADMIN_REQUIRED'?403:code==='CAMPAIGN_NOT_FOUND'?404:code==='CAMPAIGN_CONFLICT'?409:code==='PHOTO_STORAGE_NOT_CONFIGURED'?503:code?.includes('STORAGE')?503:code?.startsWith('CAMPAIGN_')?400:500;

export async function campaignRequest(req,{service,user=null,url}={}){
  const method=req.method||'GET',params=url.searchParams;
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return {status:400,data:{ok:false,error:'CAMPAIGN_INPUT_INVALID'}};}}
  try{
    if(method==='GET'){
      const data=params.has('id')?await service.get(params.get('id'),user,{edit:params.get('edit')==='1'}):await service.list(user,{view:params.get('view')||'current',page:params.get('page')||1,category:params.get('category')||'all'});
      return {status:200,data};
    }
    if(!['POST','PATCH','DELETE'].includes(method))return {status:405,data:{ok:false,error:'METHOD_NOT_ALLOWED'}};
    // Browser mutations must originate from this site; session authority is supplied by gateway.
    const origin=req.headers?.origin;
    if(origin){try{if(new URL(origin).host!==url.host)return {status:403,data:{ok:false,error:'CAMPAIGN_ORIGIN_INVALID'}};}catch{return {status:403,data:{ok:false,error:'CAMPAIGN_ORIGIN_INVALID'}};}}
    if(params.get('image')==='1'){
      if(method!=='POST')return {status:405,data:{ok:false,error:'METHOD_NOT_ALLOWED'}};
      return {status:201,data:await service.upload(user,body)};
    }
    const data=await service.save(user,{...body,...(method==='DELETE'?{operation:'delete'}:{})});
    return {status:method==='POST'?201:200,data};
  }catch(error){
    const raw=String(error?.message||''),known=/^CAMPAIGN_[A-Z_]+$/.test(raw)||['ADMIN_REQUIRED','PHOTO_STORAGE_NOT_CONFIGURED'].includes(raw);
    const code=known?raw:'CAMPAIGN_REQUEST_FAILED';
    return {status:known?statusFor(code):500,data:{ok:false,error:code}};
  }
}
