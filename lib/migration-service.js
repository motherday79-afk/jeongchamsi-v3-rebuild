import {
  LEGACY_DOMAINS,
  decodeLegacyJson,
  legacyUserKey,
  legacyActivityKey,
  legacyContentKey,
  legacyContentChunkKey,
  validateMigrationSnapshot,
} from './migration-core.js';

export const TARGET_KEYS = {
  users: 'jcsr2:users:v1',
  activity: userId => `jcsr2:useractivity:v1:${String(userId || '').slice(0,24)}`,
  content: domain => `jcsr2:content:v1:${String(domain || '')}`,
  migration: 'jcsr2:migration:v1'
};

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
