import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LEGACY_ORIGIN='https://jeongchamsi-v3-preview-clean.vercel.app';
const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const ASSET_DIR=path.join(ROOT,'assets','politicians');
const GENERATED_FILE=path.join(ROOT,'lib','politician-seed.generated.js');
const REPORT_FILE=path.join(ROOT,'docs','politician-import-report.json');
const EXPECTED=Object.freeze({assembly:300,metropolitan:16,basic:227,total:543});
const PROFILE_KEYS=Object.freeze(['id','slot','type','roleLabel','groupLabel','jurisdictionLabel','connected','name','party','region','jurisdiction','terms','committee','termStart','termEnd','office','electionLabel','source','isVacant']);
const FORBIDDEN_KEY=/score|rank|analysis|intelligence|support|sentiment|trend|mention|metric|signal/i;

async function response(url){
  const res=await fetch(url,{headers:{'User-Agent':'JCS-Rebuild-ReadOnly-Importer/1.0'}});
  if(!res.ok)throw new Error(`FETCH_FAILED:${res.status}:${url}`);
  return res;
}
async function text(url){return (await response(url)).text();}
const pad=value=>String(value).padStart(3,'0');
const unquote=value=>JSON.parse(`"${String(value).replace(/"/g,'\\"')}"`);

function parseHomePreview(source){
  const rows=[];
  for(const match of source.matchAll(/Object\.freeze\(\{([\s\S]*?)\}\)/g)){
    const body=match[1],row={};
    for(const field of body.matchAll(/(\w+):"((?:\\.|[^"\\])*)"/g))row[field[1]]=unquote(field[2]);
    const slot=body.match(/\bslot:(\d+)/);if(slot)row.slot=Number(slot[1]);
    if(row.id&&row.name)rows.push(row);
  }
  return rows;
}
function parseStaticRows(source){
  const match=source.match(/const S=(\{[\s\S]*?\});\n\nconst TYPES/);
  if(!match)throw new Error('LEGACY_STATIC_ROWS_NOT_FOUND');
  return JSON.parse(match[1]);
}
function profile(type,slot,row){
  const meta={
    assembly:{roleLabel:'국회의원',groupLabel:'국회',jurisdictionLabel:'선거구'},
    metropolitan:{roleLabel:'광역단체장',groupLabel:'광역자치단체',jurisdictionLabel:'관할 광역자치단체'},
    basic:{roleLabel:'기초단체장',groupLabel:'기초자치단체',jurisdictionLabel:'관할 기초자치단체'}
  }[type];
  const id=`${type}-${pad(slot)}`;
  return {
    id,slot,type,...meta,connected:true,name:row[0]||'',party:row[1]||'',region:row[2]||'',jurisdiction:row[3]||'',
    terms:row[4]||'',committee:row[5]||'',termStart:row[6]||'',termEnd:row[7]||'',office:row[8]||meta.roleLabel,
    electionLabel:row[9]||'',source:type==='assembly'?'국회 공개정보 기반 정참시 현역 스냅샷':'2026 제9회 전국동시지방선거 당선인 결과',
    isVacant:id==='assembly-300'
  };
}
function assertProfiles(byType){
  const all=Object.values(byType).flat();
  for(const [type,count] of Object.entries(EXPECTED))if(type!=='total'&&byType[type].length!==count)throw new Error(`COUNT_MISMATCH:${type}:${byType[type].length}:${count}`);
  if(all.length!==EXPECTED.total)throw new Error(`TOTAL_MISMATCH:${all.length}`);
  const ids=new Set();
  for(const item of all){
    if(ids.has(item.id))throw new Error(`DUPLICATE_ID:${item.id}`);ids.add(item.id);
    for(const key of Object.keys(item))if(!PROFILE_KEYS.includes(key)||FORBIDDEN_KEY.test(key))throw new Error(`FORBIDDEN_PROFILE_KEY:${item.id}:${key}`);
  }
  const vacancy=all.filter(item=>item.isVacant);
  if(vacancy.length!==1||vacancy[0].id!=='assembly-300')throw new Error('VACANCY_MISMATCH');
  return all;
}
async function pool(items,limit,worker){
  let cursor=0;const results=new Array(items.length);
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const index=cursor++;if(index>=items.length)return;results[index]=await worker(items[index],index);}}));
  return results;
}
async function downloadPhoto(item){
  const raw=String(item?.variants?.profile||'');
  if(!raw)return {...item,localPath:'',downloadError:'PROFILE_VARIANT_MISSING'};
  const url=new URL(raw,LEGACY_ORIGIN).href;
  try{
    const res=await response(url),contentType=String(res.headers.get('content-type')||'').toLowerCase();
    const extension=contentType.includes('webp')?'webp':contentType.includes('png')?'png':'jpg';
    const filename=`${item.id}.${extension}`,buffer=Buffer.from(await res.arrayBuffer());
    if(buffer.length<256)throw new Error('PHOTO_TOO_SMALL');
    await writeFile(path.join(ASSET_DIR,filename),buffer);
    return {id:item.id,localPath:`/assets/politicians/${filename}`,focus:item.focus||'50% 28%',sourceType:item.sourceType||'',verified:item.verified===true,sourcePage:item.sourcePage||'',sourceUrl:item.sourceUrl||'',attribution:item.attribution||'정참시 기존 등록 사진',license:item.license||'',licenseUrl:item.licenseUrl||'',bytes:buffer.length};
  }catch(error){return {id:item.id,localPath:'',focus:item.focus||'50% 28%',sourceType:item.sourceType||'',verified:item.verified===true,sourcePage:item.sourcePage||'',sourceUrl:item.sourceUrl||'',downloadError:String(error?.message||error)};}
}

await mkdir(ASSET_DIR,{recursive:true});
const [providerSource,previewSource,photoPayload]=await Promise.all([
  text(`${LEGACY_ORIGIN}/src/data/person-provider.js`),
  text(`${LEGACY_ORIGIN}/src/data/home-person-preview.js`),
  response(`${LEGACY_ORIGIN}/api/v3/content?domain=politicianPhotos`).then(res=>res.json())
]);
const staticRows=parseStaticRows(providerSource),home=parseHomePreview(previewSource);
if(home.length!==15)throw new Error(`HOME_PREVIEW_COUNT_MISMATCH:${home.length}`);
const byType={
  assembly:[...home.map(item=>({...item,groupLabel:'국회',jurisdictionLabel:'선거구',connected:true,source:'국회 공개정보 기반 정참시 현역 스냅샷',isVacant:false})),...staticRows.assembly.map((row,index)=>profile('assembly',index+16,row))],
  metropolitan:staticRows.metropolitan.map((row,index)=>profile('metropolitan',index+1,row)),
  basic:staticRows.basic.map((row,index)=>profile('basic',index+1,row))
};
const all=assertProfiles(byType),photoItems=Array.isArray(photoPayload?.data?.items)?photoPayload.data.items:[];
const photos=(await pool(photoItems,8,downloadPhoto)).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const photoMap=new Map(photos.filter(item=>item.localPath).map(item=>[item.id,item]));
const missingPhotoIds=all.filter(item=>!item.isVacant&&!photoMap.has(item.id)).map(item=>item.id);
const failedDownloads=photos.filter(item=>!item.localPath).map(item=>({id:item.id,error:item.downloadError||'DOWNLOAD_FAILED'}));
const seed={version:'JCS_POLITICIANS_V1',counts:EXPECTED,profiles:byType,photos:Object.fromEntries([...photoMap].map(([id,item])=>[id,item]))};
const report={version:seed.version,generatedAt:new Date().toISOString(),sourceOrigin:LEGACY_ORIGIN,readOnly:true,counts:{assembly:byType.assembly.length,assemblyPeople:byType.assembly.filter(x=>!x.isVacant).length,assemblyVacancies:byType.assembly.filter(x=>x.isVacant).length,metropolitan:byType.metropolitan.length,basic:byType.basic.length,total:all.length,people:all.filter(x=>!x.isVacant).length,registeredPhotoRecords:photoItems.length,downloadedPhotos:photoMap.size,missingPhotos:missingPhotoIds.length,failedDownloads:failedDownloads.length},missingPhotoIds,failedDownloads,forbiddenFieldsStored:[]};
await writeFile(GENERATED_FILE,`// Generated from the approved legacy read-only sources. Do not hand-edit.\nexport const POLITICIAN_SEED=Object.freeze(${JSON.stringify(seed)});\n`,'utf8');
await writeFile(REPORT_FILE,`${JSON.stringify(report,null,2)}\n`,'utf8');
process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
