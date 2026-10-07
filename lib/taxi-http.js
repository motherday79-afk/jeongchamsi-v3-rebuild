export async function taxiRequest(req,{service,user=null,url}={}){
  try{
    const method=req.method||'GET',header=name=>req.headers?.[name]||req.headers?.get?.(name),token=header('x-taxi-session');
    if(method==='GET')return {status:200,body:await service.get(user,token)};
    if(method!=='POST')return {status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}};
    if(!header('origin')||header('origin')!==url?.origin||header('sec-fetch-site')==='cross-site')return {status:403,body:{ok:false,error:'ORIGIN_INVALID'}};
    let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch{return {status:400,body:{ok:false,error:'INVALID_INPUT'}};}}
    return {status:200,body:await service.mutate(user,body,token)};
  }catch(error){const known=Number.isInteger(error?.status)&&error.status>=400&&error.status<600;return {status:known?error.status:503,body:{ok:false,error:known?error.message:'STORAGE_UNAVAILABLE'}};}
}
