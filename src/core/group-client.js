const endpoint='/api/v3/groups';
const imageTypes=new Set(['image/jpeg','image/png','image/webp']);

async function responseData(response){
  const data=await response.json().catch(()=>({ok:false,error:'GROUP_INVALID_RESPONSE'}));
  if(!response.ok&&data.ok!==false)data.ok=false;
  return {status:response.status,...data};
}
function base64(buffer){
  const bytes=new Uint8Array(buffer); let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return globalThis.btoa?globalThis.btoa(binary):Buffer.from(bytes).toString('base64');
}
export function createGroupClient({fetch:provided}={}){
  const request=provided||globalThis.fetch?.bind(globalThis);
  if(typeof request!=='function')throw new TypeError('fetch is required');
  const get=async params=>responseData(await request(`${endpoint}?${params}`,{credentials:'same-origin',cache:'no-store'}));
  return {
    list({view='browse',category='all',q='',page=1,visibility='all'}={}){const params=new URLSearchParams({view,category,q,page:String(page)});if(visibility==='public')params.set('visibility','public');return get(params);},
    get(id,{invite=''}={}){const p=new URLSearchParams({id:String(id??'')});if(invite)p.set('invite',invite);return get(p);},
    async save({id='',version=0,operation,input={},invite=''}={}){return responseData(await request(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version:Number(version)||0,operation,input,invite})}));},
    async upload(id,file,{purpose='gallery'}={}){
      if(!imageTypes.has(String(file?.type||''))||typeof file?.arrayBuffer!=='function')return {ok:false,error:'GROUP_IMAGE_INVALID'};
      if(Number(file.size)>2*1024*1024)return {ok:false,error:'GROUP_IMAGE_TOO_LARGE'};
      const content=base64(await file.arrayBuffer());
      return responseData(await request(`${endpoint}?image=1`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:String(id??''),purpose,contentType:file.type,base64:content})}));
    }
  };
}
