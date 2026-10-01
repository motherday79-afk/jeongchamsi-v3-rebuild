export async function webPushRequest(req,{service,user,url}){
 if(!user?.id||user.status!=='active')return {status:401,body:{ok:false,error:'LOGIN_REQUIRED'}};
 try{
  if(req.method==='GET')return {status:200,body:await service.settings(user)};
  if(req.method!=='POST')return {status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}};
  if(req.headers.origin!==url.origin||req.headers['sec-fetch-site']==='cross-site')return {status:403,body:{ok:false,error:'ORIGIN_FORBIDDEN'}};
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(raw.length>8192)return {status:413,body:{ok:false,error:'PUSH_INPUT_INVALID'}};
  const input=JSON.parse(raw);
  if(!['register','status','disable','test'].includes(input.operation))return {status:400,body:{ok:false,error:'PUSH_INPUT_INVALID'}};
  return {status:200,body:await service[input.operation](user,input)};
 }catch(e){const known=['LOGIN_REQUIRED','PUSH_TEST_LIMIT','PUSH_INPUT_INVALID','PUSH_NOT_REGISTERED','PUSH_SUBSCRIPTION_EXPIRED','PUSH_SEND_FAILED'];const error=known.includes(e.message)?e.message:'PUSH_SERVER_ERROR';return {status:error==='PUSH_TEST_LIMIT'?429:error==='LOGIN_REQUIRED'?401:error==='PUSH_SERVER_ERROR'||error==='PUSH_SEND_FAILED'?503:400,body:{ok:false,error}};}
}
