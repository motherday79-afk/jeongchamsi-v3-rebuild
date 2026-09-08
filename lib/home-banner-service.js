import { put } from '@vercel/blob';
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

export function createHomeBannerService({command,putImpl=put,now=Date.now}={}){
  if(typeof command!=='function')throw new Error('STORAGE_COMMAND_REQUIRED');
  async function get(){const raw=await command(['GET',TARGET_KEYS.homeBanner]);if(!raw)return null;try{return JSON.parse(raw);}catch{return null;}}
  async function save(input={},actor=''){
    const valid=validateHomeBanner(input),stamp=Number(now()),path=`home-banners/${stamp}.${valid.extension}`;
    const blob=await putImpl(path,valid.bytes,{access:'public',contentType:valid.contentType,addRandomSuffix:true}),url=text(blob?.url,1000);
    if(!url.startsWith('https://'))throw new Error('BANNER_UPLOAD_URL_INVALID');
    const banner={url,pathname:text(blob?.pathname||path,500),targetUrl:valid.targetUrl,alt:valid.alt,updatedAt:new Date(stamp).toISOString(),updatedBy:text(actor,24)};
    await command(['SET',TARGET_KEYS.homeBanner,JSON.stringify(banner)]);return banner;
  }
  return {get,save};
}
