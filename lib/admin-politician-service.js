import { TARGET_KEYS } from './migration-service.js';

const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const clone=value=>JSON.parse(JSON.stringify(value));
const emptyRecords=()=>({version:'JCS_ADMIN_POLITICIAN_V1',records:{},updatedAt:''});
const emptyAudit=()=>({version:'JCS_ADMIN_AUDIT_V1',entries:[]});
async function readJson(command,key,fallback){const raw=await command(['GET',key]);if(!raw)return clone(fallback);try{return {...clone(fallback),...(JSON.parse(raw)||{})};}catch{return clone(fallback);}}
const writeJson=(command,key,value)=>command(['SET',key,JSON.stringify(value)]);

function cleanRisk(row={}){
  const tag=text(row.tag,40).replace(/^#+/,'').replace(/\s+/g,'_'),title=text(row.title,240),url=text(row.url,1000),date=text(row.date,10);
  if(!tag||!title||!date)throw new Error('PAST_RISK_FIELDS_REQUIRED');
  if(!/^https:\/\//i.test(url))throw new Error('PAST_RISK_HTTPS_REQUIRED');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('PAST_RISK_DATE_INVALID');
  return {tag:`#${tag}`,title,url,date};
}

export function createAdminPoliticianService(options={}){
  if(typeof options.command!=='function')throw new Error('STORAGE_COMMAND_REQUIRED');
  const command=options.command,now=options.now||Date.now;
  const loadProfiles=async()=>Array.isArray(options.profiles)?options.profiles:(typeof options.profilesProvider==='function'?await options.profilesProvider():[]);
  async function records(){const value=await readJson(command,TARGET_KEYS.adminPoliticianRecords,emptyRecords());value.records=value.records&&typeof value.records==='object'?value.records:{};return value;}
  async function requireProfile(personId){const id=text(personId,100),profile=(await loadProfiles()).find(row=>String(row?.id)===id);if(!profile)throw new Error('POLITICIAN_PROFILE_MISSING');return profile;}
  async function log(actor,action,personId,details={}){const value=await readJson(command,TARGET_KEYS.adminAudit,emptyAudit()),stamp=new Date(Number(now())).toISOString();value.entries=[{id:`audit-${Number(now())}-${Math.random().toString(36).slice(2,7)}`,actor:text(actor,24),action:text(action,80),personId:text(personId,100),details,at:stamp},...(Array.isArray(value.entries)?value.entries:[])].slice(0,300);await writeJson(command,TARGET_KEYS.adminAudit,value);}
  async function save(personId,patch,actor,action){const profile=await requireProfile(personId),value=await records(),previous=value.records[profile.id]||{personId:profile.id};const record={...previous,...patch,personId:profile.id,updatedAt:new Date(Number(now())).toISOString(),updatedBy:text(actor,24)};value.records[profile.id]=record;value.updatedAt=record.updatedAt;await writeJson(command,TARGET_KEYS.adminPoliticianRecords,value);await log(actor,action,profile.id,{count:Array.isArray(Object.values(patch)[0])?Object.values(patch)[0].length:undefined});return record;}
  async function get(personId){const profile=await requireProfile(personId),value=await records();return {profile,record:value.records[profile.id]||{personId:profile.id,pastRisks:[],newsExclusions:[]}};}
  async function savePastRisks(personId,rows,actor){if(!Array.isArray(rows))throw new Error('PAST_RISK_INVALID');if(rows.length>5)throw new Error('PAST_RISK_LIMIT');const pastRisks=rows.map(cleanRisk);return {record:await save(personId,{pastRisks},actor,'PAST_RISKS_UPDATE')};}
  async function saveNewsExclusions(personId,rows,actor){if(!Array.isArray(rows)||rows.length>100)throw new Error('NEWS_EXCLUSION_LIMIT');const newsExclusions=[...new Set(rows.map(row=>text(row,500)).filter(Boolean))];return {record:await save(personId,{newsExclusions},actor,'NEWS_EXCLUSIONS_UPDATE')};}
  async function editorialInputs(personId){const {record}=await get(personId);return {pastRisks:Array.isArray(record.pastRisks)?record.pastRisks:[],newsExclusions:Array.isArray(record.newsExclusions)?record.newsExclusions:[]};}
  async function applyToDraft(personId,draft){const input=await editorialInputs(personId);if(!input.pastRisks.length)return draft;return {...draft,diagnoses:(draft.diagnoses||[]).map(row=>row.id==='01'?{...row,display:{...(row.display||{}),pastRisks:input.pastRisks}}:row)};}
  async function completeness(){
    const [profiles,value,photoDoc,photoOverrides,youtubeDoc]=await Promise.all([loadProfiles(),records(),readJson(command,TARGET_KEYS.politicianPhotos,{items:{}}),readJson(command,TARGET_KEYS.politicianPhotoOverrides,{items:{}}),readJson(command,TARGET_KEYS.content('youtubeChannels'),{channels:{}})]),photos={...(photoDoc.items||{}),...(photoOverrides.items||{})},channels=youtubeDoc.channels||{};
    const items=profiles.filter(row=>row?.id&&row.isVacant!==true).map(profile=>({id:profile.id,name:profile.name,type:profile.type,photo:!!(photos[profile.id]?.url||photos[profile.id]?.localPath||typeof photos[profile.id]==='string'),pastRisks:(value.records[profile.id]?.pastRisks||[]).length>0,youtube:!!channels[profile.id]?.channelId}));
    return {total:items.length,complete:items.filter(row=>row.photo&&row.pastRisks&&row.youtube).length,missing:{photo:items.filter(row=>!row.photo).length,pastRisks:items.filter(row=>!row.pastRisks).length,youtube:items.filter(row=>!row.youtube).length},items};
  }
  async function list(query=''){
    const key=text(query,100).toLowerCase(),[value,photoDoc,photoOverrides,youtubeDoc]=await Promise.all([records(),readJson(command,TARGET_KEYS.politicianPhotos,{items:{}}),readJson(command,TARGET_KEYS.politicianPhotoOverrides,{items:{}}),readJson(command,TARGET_KEYS.content('youtubeChannels'),{channels:{}})]),photos={...(photoDoc.items||{}),...(photoOverrides.items||{})},channels=youtubeDoc.channels||{};
    const profiles=(await loadProfiles()).filter(row=>!key||[row.name,row.party,row.jurisdiction,row.id].some(v=>String(v||'').toLowerCase().includes(key))).slice(0,key?50:30);
    return {query:key,items:profiles.map(profile=>({profile,record:value.records[profile.id]||{personId:profile.id,pastRisks:[],newsExclusions:[]},photo:photos[profile.id]||null,youtube:channels[profile.id]||null}))};
  }
  async function audit(){return readJson(command,TARGET_KEYS.adminAudit,emptyAudit());}
  return {list,get,savePastRisks,saveNewsExclusions,editorialInputs,applyToDraft,completeness,audit,log};
}
