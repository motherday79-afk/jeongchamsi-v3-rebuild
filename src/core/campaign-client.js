const endpoint='/api/v3/campaigns';
const imageTypes=new Set(['image/jpeg','image/png','image/webp']);

async function responseData(response){
  const data=await response.json().catch(()=>({ok:false,error:'CAMPAIGN_INVALID_RESPONSE'}));
  if(!response.ok&&data?.ok!==false)data.ok=false;
  return {status:response.status,...data};
}

function bytesToBase64(buffer){
  const bytes=new Uint8Array(buffer);let binary='';
  for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return globalThis.btoa?globalThis.btoa(binary):Buffer.from(bytes).toString('base64');
}

export function createCampaignClient(options={}){
  const request=options.fetch||globalThis.fetch?.bind(globalThis);
  if(typeof request!=='function')throw new TypeError('fetch is required');
  const read=async query=>responseData(await request(`${endpoint}?${query}`,{credentials:'same-origin',cache:'no-store'}));
  return {
    list({view='current',page=1}={}){const query=new URLSearchParams({view:String(view),page:String(page)});return read(query.toString());},
    get(id,{edit=false}={}){const query=new URLSearchParams({id:String(id??'')});if(edit)query.set('edit','1');return read(query.toString());},
    async save({id='',version=0,operation,input}={}){
      return responseData(await request(endpoint,{method:id?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:String(id??''),version:Number(version)||0,operation,input})}));
    },
    async upload(file){
      if(!imageTypes.has(String(file?.type||'')))return {ok:false,error:'CAMPAIGN_IMAGE_TYPE_INVALID'};
      if(Number(file?.size)>2*1024*1024)return {ok:false,error:'CAMPAIGN_IMAGE_TOO_LARGE'};
      if(typeof file?.arrayBuffer!=='function')return {ok:false,error:'CAMPAIGN_IMAGE_INVALID'};
      const base64=bytesToBase64(await file.arrayBuffer());
      return responseData(await request(`${endpoint}?image=1`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({contentType:file.type,base64})}));
    }
  };
}
