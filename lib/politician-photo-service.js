import { put } from '@vercel/blob';
import { TARGET_KEYS } from './migration-service.js';

const MAX_BYTES=1_048_576;
const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const signatures={jpg:bytes=>bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,png:bytes=>bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),webp:bytes=>bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'};
async function readJson(command,key,fallback){const raw=await command(['GET',key]);if(!raw)return structuredClone(fallback);try{return {...structuredClone(fallback),...(JSON.parse(raw)||{})};}catch{return structuredClone(fallback);}}

export function validatePoliticianPhoto(input={}){
  const contentType=text(input.contentType,80).toLowerCase(),extension=types[contentType],bytes=Buffer.isBuffer(input.bytes)?input.bytes:Buffer.from(input.bytes||[]);
  if(!extension)throw new Error('PHOTO_TYPE_INVALID');
  if(!bytes.length)throw new Error('PHOTO_EMPTY');
  if(bytes.length>MAX_BYTES)throw new Error('PHOTO_TOO_LARGE');
  if(!signatures[extension](bytes))throw new Error('PHOTO_SIGNATURE_INVALID');
  return {contentType,extension,bytes,size:bytes.length};
}

export function politicianPhotoStorageStatus(env=process.env){
  if(String(env?.BLOB_READ_WRITE_TOKEN||'').trim())return {configured:true,mode:'TOKEN'};
  if(String(env?.VERCEL_OIDC_TOKEN||'').trim()&&String(env?.BLOB_STORE_ID||'').trim())return {configured:true,mode:'OIDC'};
  return {configured:false,mode:'MISSING'};
}

export function createPoliticianPhotoService(options={}){
  if(typeof options.command!=='function')throw new Error('STORAGE_COMMAND_REQUIRED');
  const command=options.command,putImpl=options.putImpl||put,now=options.now||Date.now,env=options.env||process.env,storage=politicianPhotoStorageStatus(env),token=String(options.token||env?.BLOB_READ_WRITE_TOKEN||'').trim(),usesDefaultPut=!options.putImpl;
  const loadProfiles=async()=>Array.isArray(options.profiles)?options.profiles:(typeof options.profilesProvider==='function'?await options.profilesProvider():[]);
  async function save(input={},actor=''){
    const personId=text(input.personId,100),person=(await loadProfiles()).find(row=>String(row?.id)===personId);if(!person)throw new Error('POLITICIAN_PROFILE_MISSING');
    const valid=validatePoliticianPhoto(input),stamp=Number(now()),path=`politicians/${personId}/${stamp}.${valid.extension}`;
    if(usesDefaultPut&&!storage.configured)throw new Error('PHOTO_STORAGE_NOT_CONFIGURED');
    const uploadOptions={access:'public',contentType:valid.contentType,addRandomSuffix:true};if(token)uploadOptions.token=token;
    const blob=await putImpl(path,valid.bytes,uploadOptions);
    const doc=await readJson(command,TARGET_KEYS.politicianPhotoOverrides,{version:'JCS_POLITICIAN_PHOTO_OVERRIDES_V1',items:{}});doc.items=doc.items&&typeof doc.items==='object'?doc.items:{};const previous=doc.items[personId]||null;
    const publicUrl=text(blob?.url,1000),photo={url:publicUrl,localPath:publicUrl,pathname:text(blob?.pathname||path,500),contentType:valid.contentType,size:valid.size,focus:text(input.focus||'50% 22%',30),updatedAt:new Date(stamp).toISOString(),updatedBy:text(actor,24)};
    if(!photo.url.startsWith('https://'))throw new Error('PHOTO_UPLOAD_URL_INVALID');
    doc.items[personId]=photo;doc.updatedAt=photo.updatedAt;await command(['SET',TARGET_KEYS.politicianPhotoOverrides,JSON.stringify(doc)]);return {photo,previous};
  }
  return {save};
}
