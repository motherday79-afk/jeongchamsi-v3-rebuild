import { put, del } from '@vercel/blob';
import { TARGET_KEYS } from './migration-service.js';

const MAX_BYTES=2_097_152;
const text=(value,max=1000)=>String(value??'').trim().slice(0,max);
const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const signatures={jpg:bytes=>bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,png:bytes=>bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),webp:bytes=>bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'};

export function validateHomeBanner(input={}){
  const contentType=text(input.contentType,80).toLowerCase(),extension=types[contentType],bytes=Buffer.isBuffer(input.bytes)?input.bytes:Buffer.from(input.bytes||[]);
  if(!extension)throw new Error('BANNER_TYPE_INVALID');
  if(!bytes.length)throw new Error('BANNER_EMPTY');
  if(bytes.length>MAX_BYTES)throw new Error('BANNER_TOO_LARGE');
  if(!signatures[extension](bytes))throw new Error('BANNER_SIGNATURE_INVALID');
  const targetUrl=text(input.targetUrl,1000);if(targetUrl&&!/^https:\/\//i.test(targetUrl))throw new Error('BANNER_TARGET_URL_INVALID');
  return {bytes,contentType,extension,targetUrl,alt:text(input.alt||'정참시 배너',120)};
}

export function homeBannerStorageStatus(env=process.env){
  if(String(env?.BLOB_READ_WRITE_TOKEN||'').trim())return {configured:true,mode:'token'};
  if(String(env?.VERCEL_OIDC_TOKEN||'').trim()&&String(env?.BLOB_STORE_ID||'').trim())return {configured:true,mode:'oidc'};
  return {configured:false,mode:'missing'};
}

export function createHomeBannerService(options={}){
  const {command,now=Date.now}=options,putImpl=options.putImpl||put,env=options.env||process.env,storage=homeBannerStorageStatus(env),token=String(options.token||env?.BLOB_READ_WRITE_TOKEN||'').trim(),usesDefaultPut=!options.putImpl;
  if(typeof command!=='function')throw new Error('STORAGE_COMMAND_REQUIRED');

  const keyFor=placement=>{if(!['sidebar','hero'].includes(placement))throw new Error('BANNER_PLACEMENT_INVALID');return TARGET_KEYS.homeBanner+(placement==='hero'?':hero':'');};
  const remove=options.delImpl||(usesDefaultPut?del:async()=>{});
  async function get(placement='sidebar'){const raw=await command(['GET',keyFor(placement)]);if(!raw)return null;try{return JSON.parse(raw);}catch{return null;}}
  async function save(input={},actor=''){
    const placement=input.placement||'sidebar',key=keyFor(placement);
    if(!input.pc||!input.mobile)throw new Error('BANNER_BOTH_REQUIRED');
    const pc=validateHomeBanner({...input.pc,targetUrl:input.targetUrl,alt:input.alt}),mobile=validateHomeBanner({...input.mobile,targetUrl:input.targetUrl,alt:input.alt});
    const tablet=input.tablet?validateHomeBanner({...input.tablet,targetUrl:input.targetUrl,alt:input.alt}):null;
    if(pc.bytes.length+mobile.bytes.length+(tablet?.bytes.length||0)>3_145_728)throw new Error('BANNER_PAIR_TOO_LARGE');
    if(usesDefaultPut&&!storage.configured)throw new Error('BANNER_STORAGE_NOT_CONFIGURED');
    const stamp=Number(now()),previous=await get(placement),created=[];
    const upload=async(valid,device)=>{const path=`home-banners/${placement}-${device}-${stamp}.${valid.extension}`,uploadOptions={access:'public',contentType:valid.contentType,addRandomSuffix:true};if(token)uploadOptions.token=token;const blob=await putImpl(path,valid.bytes,uploadOptions),url=text(blob?.url,1000);if(!url.startsWith('https://'))throw new Error('BANNER_UPLOAD_URL_INVALID');const value={url,pathname:text(blob?.pathname||path,500)};created.push(value);return value;};
    let banner;
    try{const desktop=await upload(pc,'pc'),phone=await upload(mobile,'mobile'),wide=tablet?await upload(tablet,'tablet'):null;banner={...desktop,mobileUrl:phone.url,mobilePathname:phone.pathname,tabletUrl:wide?.url||previous?.tabletUrl||'',tabletPathname:wide?.pathname||previous?.tabletPathname||'',placement,targetUrl:pc.targetUrl,alt:pc.alt,updatedAt:new Date(stamp).toISOString(),updatedBy:text(actor,24)};await command(['SET',key,JSON.stringify(banner)]);}
    catch(error){await Promise.allSettled(created.map(row=>remove(row.url,token?{token}:{})));throw error;}
    // Only owned old paths are eligible, and only after committing all new artwork.
    const old=[{url:previous?.url,path:previous?.pathname},{url:previous?.mobileUrl,path:previous?.mobilePathname},...(tablet?[{url:previous?.tabletUrl,path:previous?.tabletPathname}]:[])].filter(row=>row.url&&row.path?.startsWith('home-banners/')&&!created.some(item=>item.url===row.url));
    await Promise.allSettled(old.map(row=>remove(row.url,token?{token}:{})));
    return banner;
  }
  return {get,save};
}
