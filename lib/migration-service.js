import {
  LEGACY_DOMAINS,
  decodeLegacyJson,
  legacyUserKey,
  legacyActivityKey,
  legacyContentKey,
  legacyContentChunkKey,
  validateMigrationSnapshot,
} from './migration-core.js';
import { POLITICIAN_SEED } from './politician-seed.generated.js';
import { applyPoliticianRoleUpdates } from './politician-role-updates.js';

export const TARGET_KEYS = {
  users: 'jcsr2:users:v1',
  activity: userId => `jcsr2:useractivity:v1:${String(userId || '').slice(0,24)}`,
  content: domain => `jcsr2:content:v1:${String(domain || '')}`,
  viewCount: (domain,postId) => `jcsr2:view-count:v1:${String(domain||'')}:${String(postId||'')}`,
  viewers: (domain,postId) => `jcsr2:viewers:v1:${String(domain||'')}:${String(postId||'')}`,
  migration: 'jcsr2:migration:v1',
  politicians: type => `jcsr2:politicians:v1:${String(type || '')}`,
  politicianPhotos: 'jcsr2:politician-photos:v1',
  politicianMigration: 'jcsr2:politician-migration:v1'
};

const POLITICIAN_TYPES=Object.freeze(['assembly','metropolitan','basic']);
const PROFILE_KEYS=new Set(['id','slot','type','roleLabel','groupLabel','jurisdictionLabel','connected','name','party','region','jurisdiction','terms','committee','termStart','termEnd','office','electionLabel','source','isVacant','primaryRole','secondaryRole','currentRoles','roleHistory','effectiveFrom','effectiveTo','roleStatus','sourceId','sourceUrl','verifiedAt']);
const FORBIDDEN_POLITICIAN_KEY=/score|rank|analysis|intelligence|support|sentiment|trend|mention|metric|signal/i;

export function validatePoliticianSeed(seed=POLITICIAN_SEED){
  const profiles=seed?.profiles||{},ids=new Set(),counts={};let total=0,vacancies=0;
  for(const type of POLITICIAN_TYPES){
    const rows=Array.isArray(profiles[type])?profiles[type]:[];counts[type]=rows.length;total+=rows.length;
    for(const item of rows){
      if(item.type!==type||!item.id||ids.has(item.id))throw new Error(`POLITICIAN_ID_INVALID:${item.id||type}`);ids.add(item.id);
      for(const key of Object.keys(item))if(!PROFILE_KEYS.has(key)||FORBIDDEN_POLITICIAN_KEY.test(key))throw new Error(`POLITICIAN_FIELD_FORBIDDEN:${item.id}:${key}`);
      if(item.isVacant===true)vacancies+=1;
    }
  }
  const expected={assembly:300,metropolitan:16,basic:227};
  for(const type of POLITICIAN_TYPES)if(counts[type]!==expected[type])throw new Error(`POLITICIAN_COUNT_MISMATCH:${type}:${counts[type]}`);
  if(total!==543||vacancies!==1)throw new Error(`POLITICIAN_TOTAL_MISMATCH:${total}:${vacancies}`);
  const photos=seed?.photos&&typeof seed.photos==='object'?seed.photos:{};
  for(const [id,photo] of Object.entries(photos))if(!ids.has(id)||!String(photo?.localPath||'').startsWith('/assets/politicians/'))throw new Error(`POLITICIAN_PHOTO_INVALID:${id}`);
  return {ok:true,version:seed.version,counts:{...counts,total,people:total-vacancies,vacancies,photos:Object.keys(photos).length,missingPhotos:(total-vacancies)-Object.keys(photos).length},forbiddenFieldsStored:[]};
}

export async function writePoliticianSeed(command,seed=POLITICIAN_SEED){
  const validation=validatePoliticianSeed(seed);
  for(const type of POLITICIAN_TYPES)await command(['SET',TARGET_KEYS.politicians(type),JSON.stringify({version:seed.version,type,items:seed.profiles[type].map(applyPoliticianRoleUpdates)})]);
  await command(['SET',TARGET_KEYS.politicianPhotos,JSON.stringify({version:seed.version,items:seed.photos})]);
  const report={...validation,migratedAt:new Date().toISOString()};
  await command(['SET',TARGET_KEYS.politicianMigration,JSON.stringify(report)]);
  return report;
}

function parseJson(raw,fallback){
  if(!raw) return fallback;
  try{return JSON.parse(raw);}catch{return fallback;}
}

async function scanAll(command,pattern){
  const out=[]; let cursor='0'; let guard=0;
  do{
    const result=await command(['SCAN',cursor,'MATCH',pattern,'COUNT','500']);
    cursor=String(result?.[0]??'0');
    for(const key of Array.isArray(result?.[1])?result[1]:[]) out.push(String(key));
    guard+=1;
    if(guard>10000) throw new Error('LEGACY_SCAN_GUARD');
  }while(cursor!=='0');
  return [...new Set(out)];
}

export async function collectLegacySnapshot(command){
  const users=parseJson(await command(['GET',legacyUserKey()]),{});
  const activities={};
  for(const key of await scanAll(command,'jcv3:useractivity:v1:*')){
    const userId=key.slice('jcv3:useractivity:v1:'.length);
    if(!userId) continue;
    activities[userId]=parseJson(await command(['GET',legacyActivityKey(userId)]),{});
  }

  const contents={};
  for(const domain of LEGACY_DOMAINS){
    const raw=await command(['GET',legacyContentKey(domain)]);
    const value=await decodeLegacyJson(raw,async index=>command(['GET',legacyContentChunkKey(domain,index)]));
    if(value!==null) contents[domain]=value;
  }
  return {users,activities,contents,collectedAt:new Date().toISOString()};
}

export async function writeRebuildSnapshot(command,snapshot){
  const validation=validateMigrationSnapshot(snapshot);
  if(!validation.ok){
    const error=new Error('MIGRATION_RELATIONSHIP_VALIDATION_FAILED');
    error.code='MIGRATION_RELATIONSHIP_VALIDATION_FAILED';
    error.report=validation;
    throw error;
  }
  await command(['SET',TARGET_KEYS.users,JSON.stringify(snapshot.users||{})]);
  for(const [userId,activity] of Object.entries(snapshot.activities||{})){
    await command(['SET',TARGET_KEYS.activity(userId),JSON.stringify(activity||{})]);
  }
  for(const domain of LEGACY_DOMAINS){
    if(!(domain in (snapshot.contents||{}))) continue;
    await command(['SET',TARGET_KEYS.content(domain),JSON.stringify(snapshot.contents[domain])]);
  }
  const report={...validation,ok:true,migratedAt:new Date().toISOString()};
  await command(['SET',TARGET_KEYS.migration,JSON.stringify(report)]);
  return report;
}
