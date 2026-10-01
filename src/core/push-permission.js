export function waitPushStep(promise,code,timeoutMs=25000){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(code)),timeoutMs);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
export function pushPermission(notification,{timeoutMs=45000}={}){
 if(notification.permission==='granted'||notification.permission==='denied')return Promise.resolve(notification.permission);
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(value,error)=>{if(settled)return;settled=true;clearTimeout(timer);clearInterval(poll);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>finish(null,Error('PUSH_PERMISSION_TIMEOUT')),timeoutMs);
  const poll=setInterval(()=>{if(['granted','denied'].includes(notification.permission))finish(notification.permission);},250);
  try{
   // Invoke synchronously: Safari requires the original click's user activation.
   // Older Samsung Internet builds may return the result through the callback.
   const result=notification.requestPermission(value=>finish(value));
   if(result?.then)result.then(value=>finish(value),error=>finish(null,error));
   else if(typeof result==='string')finish(result);
  }catch(error){finish(null,error);}
 });
}
