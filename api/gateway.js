import { politicalKeywords } from '../lib/operational-ranking.js';
import { put } from '@vercel/blob';
import { legacyRedisCommand, rebuildRedisCommand } from '../lib/redis-rest.js';
import { collectLegacySnapshot, writeRebuildSnapshot, writePoliticianSeed, validatePoliticianSeed, TARGET_KEYS } from '../lib/migration-service.js';
import { LEGACY_DOMAINS } from '../lib/migration-core.js';
import { issueSessionToken, readSessionToken } from '../lib/session.js';
import { readUsers, listUsers, getUser, registerUser, authenticateUser, updateProfile, updateUserRole, updateUserByAdmin, resetUserPassword, completeRequiredPasswordChange, publicUser, referralProfile, readDomain, readDomainWithViews, writeDomain, readActivity, writeActivity } from '../lib/rebuild-store.js';
import { POLITICIAN_COUNTS, POLITICIAN_TYPES, cleanPoliticianType, readPoliticianType, readPoliticianPhotos, getPolitician, searchPoliticianProfiles } from '../lib/politician-store.js';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { accessTierForUser, projectIntelligence } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { createBadgeService } from '../lib/badge-service.js';
import { VALID_BADGE_KEYS } from '../lib/badge-engine.js';
import { createParticipationPost, featureParticipationPost, editParticipationPost } from '../lib/participation-admin.js';
import { createAdminPoliticianService } from '../lib/admin-politician-service.js';
import { createPoliticianPhotoService, politicianPhotoStorageStatus, validatePoliticianPhoto } from '../lib/politician-photo-service.js';
import { createHomeBannerService, homeBannerStorageStatus } from '../lib/home-banner-service.js';
import { createFavoriteService } from '../lib/favorite-service.js';
import { createInquiryService } from '../lib/inquiry-service.js';
import { createApplicationService } from '../lib/application-service.js';
import { createSiteSettingsService, KEYWORD_RULES_KEY, sanitizeKeywordRules } from '../lib/site-settings-service.js';

const COOKIE='jcsr2_session';
const MAX_AGE=60*60*24*30;
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
const bodyOf=req=>{if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}}return {};};
const cookieMap=req=>Object.fromEntries(String(req.headers?.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return i<0?[v,'']:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]}));
const sessionSecret=()=>String(process.env.JCS_REBUILD_SESSION_SECRET||'');
const migrationSecret=()=>String(process.env.JCS_MIGRATION_SECRET||'');
const setSession=(res,user)=>{const token=issueSessionToken(user?.id,sessionSecret(),Date.now(),user?.sessionVersion);res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`);};
const clearSession=res=>res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);

async function currentUser(req,command){const token=cookieMap(req)[COOKIE],s=readSessionToken(token,sessionSecret());if(!s?.userId)return null;const user=await getUser(command,s.userId);if(!user||Number(s.sessionVersion)!==(Number(user.sessionVersion)||0))return null;return publicUser(user);}
function ageGroup(birthYear){const y=Number(birthYear||0),current=new Date().getFullYear();if(!Number.isInteger(y)||y<1900||y>current)return '';const age=current-y;if(age<20)return '10대';if(age<30)return '20대';if(age<40)return '30대';if(age<50)return '40대';if(age<60)return '50대';return '60대+';}
function contentItems(data){return Array.isArray(data?.items)?data.items:[];}
export async function attachRepresentativeBadges(command,data={items:[]}){
  const source=data&&typeof data==='object'?data:{items:[]},items=contentItems(source),owners=[...new Set(items.map(item=>String(item?.ownerId||'')).filter(Boolean))];
  const badges=new Map(await Promise.all(owners.map(async ownerId=>{const activity=await readActivity(command,ownerId),key=String(activity?.representativeBadge||'');return [ownerId,VALID_BADGE_KEYS.has(key)?key:''];})));
  return {...source,items:items.map(item=>({...item,representativeBadge:badges.get(String(item?.ownerId||''))||''}))};
}
export function politicianPhotoErrorCode(error){
  const code=String(error?.message||error||'PHOTO_UPLOAD_FAILED');
  return /No blob credentials|BLOB_READ_WRITE_TOKEN|VERCEL_OIDC_TOKEN|BLOB_STORE_ID/i.test(code)?'PHOTO_STORAGE_NOT_CONFIGURED':code;
}
const CONTENT_DOMAINS=new Set([...LEGACY_DOMAINS,'news']);
function cleanDomain(domain){return CONTENT_DOMAINS.has(String(domain||''))?String(domain):'';}
const allPoliticianProfiles=command=>Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type))).then(groups=>groups.flat().filter(person=>person?.id&&person.isVacant!==true));
const favoriteService=command=>createFavoriteService({
  command,
  getPerson:async id=>{const [person,photos]=await Promise.all([getPolitician(command,id),readPoliticianPhotos(command)]);return person?{...person,photo:photos[id]||null}:null;},
  getPost:(domain,id)=>findPublishedPost(command,domain,id),
  listDomain:async domain=>contentItems(await readDomainWithViews(command,domain,{items:[]}))
});
export function sanitizeContentInput(input={}){const safe={};for(const [key,limit] of Object.entries({title:200,body:20000,summary:500,category:80,coverImage:1000})){const value=String(input?.[key]||'').trim().slice(0,limit);if(value)safe[key]=value;}return safe;}
export function isActiveAcademySlot(data={},slotId=''){const id=String(slotId||'');return !!id&&(Array.isArray(data?.slots)?data.slots:contentItems(data)).some(slot=>String(slot?.id||'')===id&&slot?.published!==false&&!slot?.closedAt);}
export async function findPublishedPost(command,domain,postId){if(!['columns','community','itsme','news'].includes(String(domain||''))||!postId)return null;const data=await readDomain(command,domain,{items:[]});return contentItems(data).find(post=>String(post.id)===String(postId)&&post.published!==false)||null;}
const RECORD_CONTENT_VIEW_LUA=`local current=tonumber(redis.call('GET',KEYS[2]) or '0');if ARGV[1]==ARGV[2] then return cjson.encode({ok=true,counted=false,increment=current}) end;local added=redis.call('SADD',KEYS[1],ARGV[1]);if added==0 then return cjson.encode({ok=true,counted=false,increment=current}) end;local next=redis.call('INCR',KEYS[2]);return cjson.encode({ok=true,counted=true,increment=next})`;
export async function recordContentView(command,user,domain,postId){
  if(!user)return {ok:false,error:'LOGIN_REQUIRED'};const cleanDomain=String(domain||''),cleanPostId=String(postId||'');if(!['columns','community','itsme','news'].includes(cleanDomain)||!cleanPostId)return {ok:false,error:'INVALID_POST'};
  const post=await findPublishedPost(command,cleanDomain,cleanPostId);if(!post)return {ok:false,error:'POST_NOT_FOUND'};const raw=await command(['EVAL',RECORD_CONTENT_VIEW_LUA,'2',TARGET_KEYS.viewers(cleanDomain,cleanPostId),TARGET_KEYS.viewCount(cleanDomain,cleanPostId),String(user.id),String(post.ownerId||'')]);try{const result=JSON.parse(raw);return {...result,views:Number(post.views||0)+Number(result.increment||0)};}catch{return {ok:false,error:'VIEW_STORAGE_INVALID'};}
}

async function handleMigration(req,res,route){
  const supplied=String(req.headers['x-jcs-migration-secret']||bodyOf(req).secret||'');
  if(!migrationSecret()||supplied!==migrationSecret())return json(res,401,{ok:false,error:'MIGRATION_SECRET_REQUIRED'});
  if(route==='migration/status'){
    let report=null,politicianReport=null;try{const cmd=rebuildRedisCommand(),[raw,politicianRaw]=await Promise.all([cmd(['GET',TARGET_KEYS.migration]),cmd(['GET',TARGET_KEYS.politicianMigration])]);report=raw?JSON.parse(raw):null;politicianReport=politicianRaw?JSON.parse(politicianRaw):null;}catch(error){return json(res,503,{ok:false,error:error.code||'TARGET_STORAGE_MISSING'});}
    return json(res,200,{ok:true,legacyConfigured:!!(process.env.JCS_LEGACY_REDIS_REST_URL&&process.env.JCS_LEGACY_REDIS_REST_TOKEN),targetConfigured:!!(process.env.JCS_REBUILD_REDIS_REDIS_URL||process.env.JCS_REBUILD_REDIS_URL||(process.env.JCS_REBUILD_REDIS_REST_URL&&process.env.JCS_REBUILD_REDIS_REST_TOKEN)),report,politicianReport});
  }
  if(route==='migration/politicians/preview'&&req.method==='GET'){
    try{return json(res,200,{ok:true,report:validatePoliticianSeed()});}
    catch(error){return json(res,500,{ok:false,error:error.code||error.message||'POLITICIAN_SEED_INVALID'});}
  }
  if(route==='migration/politicians/run'&&req.method==='POST'){
    try{return json(res,200,{ok:true,report:await writePoliticianSeed(rebuildRedisCommand())});}
    catch(error){return json(res,500,{ok:false,error:error.code||error.message||'POLITICIAN_MIGRATION_FAILED'});}
  }
  if(route==='migration/run'&&req.method==='POST'){
    try{const snapshot=await collectLegacySnapshot(legacyRedisCommand());const report=await writeRebuildSnapshot(rebuildRedisCommand(),snapshot);return json(res,200,{ok:true,report});}
    catch(error){return json(res,500,{ok:false,error:error.code||error.message||'MIGRATION_FAILED',report:error.report||null});}
  }
  return json(res,404,{ok:false,error:'NOT_FOUND'});
}

export async function handlePoliticians(req,res,command,url,intelligence){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  const id=String(url.searchParams.get('id')||req.query?.id||'').trim(),query=String(url.searchParams.get('q')||req.query?.q||'').trim(),ranking=String(url.searchParams.get('ranking')||req.query?.ranking||'').trim(),photos=await readPoliticianPhotos(command);
  if(id){
    const [item,report,user]=await Promise.all([getPolitician(command,id),intelligence.getPublicIntelligence(id),currentUser(req,command)]);
    if(!item)return json(res,404,{ok:false,error:'POLITICIAN_NOT_FOUND'});
    const tier=accessTierForUser(user),scope=String(url.searchParams.get('view')||req.query?.view||'')==='compare'?'compare':'detail';
    const legacyNews=Array.isArray(report?.news)?report.news.map(row=>({title:row.title,source:row.source,url:row.url,publishedAt:row.publishedAt||row.date})):[];
    const fullReport=Array.isArray(report?.diagnoses)&&report.diagnoses.length===10?report:{...buildIntelligenceDraft(item,{personId:id,snapshotId:report?.snapshot||item.verifiedAt||'2026-09-03',collectedAt:`${report?.snapshot||item.verifiedAt||'2026-09-03'}T00:00:00.000Z`,searchAds:report?.raw?.searchAds||null,news:{items:legacyNews},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2'),rank:report?.rank||{overall:null,category:null,temporary:false},...(Array.isArray(report?.activities)&&report.activities.length?{activities:report.activities}:{}),...(Array.isArray(report?.achievements)&&report.achievements.length?{achievements:report.achievements}:{}),...(Array.isArray(report?.policies)&&report.policies.length?{policies:report.policies}:{})};
    let projected=projectIntelligence(fullReport,tier,scope);
    if(Array.isArray(projected?.related)&&projected.related.length){
      const profiles=(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type)))).flat(),byId=new Map(profiles.map(person=>[person.id,person]));
      projected={...projected,related:projected.related.map(row=>{const related=byId.get(row.id)||{};return {...row,party:related.party||'',jurisdiction:related.jurisdiction||'',office:related.office||related.roleLabel||'',photo:photos[row.id]||null};})};
    }
    return json(res,200,{ok:true,accessTier:tier,item:{...item,photo:photos[id]||null},intelligence:projected});
  }
  if(ranking==='trending'||url.searchParams.has('keywords')){
    const published=await intelligence.getPublicRankings({keywords:url.searchParams.has('keywords')});if(!published)return json(res,200,{ok:true,items:[],total:0,ready:false});
    const snapshot=url.searchParams.get('snapshot');if(snapshot&&snapshot!==published.snapshot)return json(res,409,{ok:false,error:'RANKING_UPDATED'});
    const profiles=(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type)))).flat(),byId=new Map(profiles.map(person=>[person.id,person]));
    if(url.searchParams.has('keywords')){let rules={};try{rules=JSON.parse(await command(['GET',KEYWORD_RULES_KEY])||'{}');}catch{}const items=politicalKeywords(published.keywordArticles||[],rules,published.generatedAt,profiles.map(row=>row.name));return json(res,200,{ok:true,snapshot:published.snapshot,updatedAt:published.generatedAt,items:items.map(row=>({...row,people:row.people.map(id=>({id,name:byId.get(id)?.name||id}))}))});}
    const rows=published.rising?.items||[],offset=Math.min(100,Math.max(0,Number(url.searchParams.get('offset'))||0)),items=rows.slice(offset,Math.min(100,offset+30)).map(row=>({...byId.get(row.id),...row,photo:photos[row.id]||null}));
    return json(res,200,{ok:true,items,total:Math.min(100,rows.length),offset,nextOffset:offset+items.length,ready:published.rising?.ready===true,snapshot:published.snapshot,previousAt:published.rising?.previousAt||'',updatedAt:published.generatedAt});
  }
  if(ranking==='overall'){
    const published=await intelligence.getPublicRankings();if(!published)return json(res,200,{ok:true,published:false,items:[]});
    const profiles=(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type)))).flat(),byId=new Map(profiles.map(person=>[person.id,person]));
    const rebuilt=Object.entries(published.byId||{}).map(([id,row])=>({id,...row,rank:Number(row.rank)||0})).filter(row=>row.rank>0).sort((a,b)=>a.rank-b.rank),source=rebuilt.length>(published.overall||[]).length?rebuilt:published.overall||[];
    const items=source.slice(0,100).map(row=>({...byId.get(row.id),...row,photo:photos[row.id]||null,rankMode:'published'}));
    return json(res,200,{ok:true,published:true,snapshot:published.snapshot,items});
  }
  if(query){
    const limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit')||req.query?.limit||12)||12));
    const entries=await Promise.all(POLITICIAN_TYPES.map(async type=>[type,await readPoliticianType(command,type)]));
    const matches=searchPoliticianProfiles(Object.fromEntries(entries),query,limit).map(item=>({...item,photo:photos[item.id]||null}));
    return json(res,200,{ok:true,query,limit,total:matches.length,items:matches});
  }
  const type=cleanPoliticianType(url.searchParams.get('type')||req.query?.type)||'assembly';
  const offset=Math.max(0,Number(url.searchParams.get('offset')||req.query?.offset||0)||0),limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||req.query?.limit||30)||30));
  const [all,published]=await Promise.all([readPoliticianType(command,type),intelligence.getPublicRankings()]),rankById=published?.byId||{},sorted=[...all].sort((left,right)=>{
    const leftRank=Number(rankById[left.id]?.categoryRank),rightRank=Number(rankById[right.id]?.categoryRank),leftRanked=Number.isFinite(leftRank)&&leftRank>0,rightRanked=Number.isFinite(rightRank)&&rightRank>0;
    if(leftRanked!==rightRanked)return leftRanked?-1:1;
    if(leftRanked&&rightRanked&&leftRank!==rightRank)return leftRank-rightRank;
    return Number(left.slot||0)-Number(right.slot||0)||String(left.id).localeCompare(String(right.id));
  }),items=sorted.slice(offset,offset+limit).map(item=>({...item,photo:photos[item.id]||null,now:rankById[item.id]||null}));
  return json(res,200,{ok:true,type,counts:POLITICIAN_COUNTS,total:all.length,offset,limit,hasMore:offset+items.length<all.length,items});
}

const badgeErrorStatus=error=>error==='BADGE_SHOWCASE_FULL'||error==='BADGE_IS_REPRESENTATIVE'?409:error==='BADGE_LOCKED'?403:400;

export async function dispatchBadgeRequest(route,method,user,body,service,targetUser=null){
  if(!user)return {status:401,body:{ok:false,error:'LOGIN_REQUIRED'}};
  if(route==='user/badges'){
    if(method!=='GET')return {status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}};
    return {status:200,body:{ok:true,status:await service.statusForUser(user)}};
  }
  if(route==='action'&&method==='POST'){
    const action=String(body?.action||''),payload=body?.payload||body||{};let result=null;
    if(action==='badge-representative-set')result=await service.setRepresentative(user,payload.badgeKey);
    if(action==='badge-showcase-toggle')result=await service.toggleShowcase(user,payload.badgeKey);
    if(action==='badge-visit')result=await service.recordVisit(user);
    if(!result)return null;
    return {status:result.ok?200:badgeErrorStatus(result.error),body:result};
  }
  if(route==='admin/users'&&method==='PATCH'){
    if(user.role!=='admin')return {status:403,body:{ok:false,error:'ADMIN_REQUIRED'}};
    if(!targetUser)return {status:404,body:{ok:false,error:'USER_NOT_FOUND'}};
    const result=await service.replaceGrants(targetUser,body?.grantedBadges||[]);
    return {status:result.ok?200:badgeErrorStatus(result.error),body:result};
  }
  return null;
}

async function handleUser(req,res,route,command){
  if(route==='user/register'&&req.method==='POST'){
    const result=await registerUser(command,bodyOf(req));if(!result.ok)return json(res,result.error==='DUPLICATE_ID'?409:400,result);setSession(res,result.user);return json(res,201,result);
  }
  if(route==='user/login'&&req.method==='POST'){
    const body=bodyOf(req);const user=await authenticateUser(command,body.id,body.password);if(!user)return json(res,401,{ok:false,error:'INVALID_LOGIN'});setSession(res,user);return json(res,200,{ok:true,user});
  }
  if(route==='user/logout'&&req.method==='POST'){clearSession(res);return json(res,200,{ok:true});}
  if(route==='user/session'&&req.method==='GET'){const user=await referralProfile(command,await currentUser(req,command));return json(res,200,{authenticated:!!user,user:user||null});}
  if(route==='user/profile'&&req.method==='POST'){const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});return json(res,200,await updateProfile(command,user.id,bodyOf(req)));}
  if(route==='user/password'&&req.method==='POST'){
    const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});
    const result=await completeRequiredPasswordChange(command,user.id,bodyOf(req).password);
    if(!result.ok)return json(res,result.error==='USER_NOT_FOUND'?404:400,result);
    setSession(res,result.user);return json(res,200,result);
  }
  if(route==='user/activity'&&req.method==='GET'){const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});return json(res,200,{ok:true,activity:await readActivity(command,user.id)});}
  if(route==='user/dashboard'&&req.method==='GET'){const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});return json(res,200,await favoriteService(command).dashboard(user));}
  if(route==='user/badges'){
    const result=await dispatchBadgeRequest(route,req.method,await currentUser(req,command),bodyOf(req),createBadgeService(command));
    return json(res,result.status,result.body);
  }
  return false;
}

export const canManagePost=(user,post)=>!!user&&!!post&&(user.role==='admin'||(!!post.ownerId&&String(user.id)===String(post.ownerId)));
export function applyPostEdit(post,input={}){
  const patch=sanitizeContentInput(input);
  for(const key of ['body','summary','category','coverImage'])if(Object.hasOwn(input,key)&&!String(input[key]||'').trim())patch[key]='';
  return {...post,...patch,updatedAt:new Date().toISOString()};
}

export async function handleContent(req,res,command,url){
  const domain=cleanDomain(url.searchParams.get('domain')||req.query?.domain);if(!domain)return json(res,400,{ok:false,error:'INVALID_DOMAIN'});
  if(req.method==='GET'){const data=(await readDomainWithViews(command,domain,null))||({items:[]});return json(res,200,{ok:true,domain,data:await attachRepresentativeBadges(command,data)});}

  if(['PATCH','DELETE'].includes(req.method)){
    const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});
    if(!['columns','community','itsme','news'].includes(domain))return json(res,403,{ok:false,error:'WRITE_NOT_ALLOWED'});
    const body=bodyOf(req),data=await readDomain(command,domain,{items:[]}),items=contentItems(data),index=items.findIndex(row=>String(row.id)===String(body.id||''));
    if(index<0)return json(res,404,{ok:false,error:'POST_NOT_FOUND'});
    if(!canManagePost(user,items[index]))return json(res,403,{ok:false,error:'POST_EDIT_FORBIDDEN'});
    if(req.method==='DELETE')items.splice(index,1);
    else {if(!String(body.input?.title||'').trim())return json(res,400,{ok:false,error:'TITLE_REQUIRED'});items[index]=applyPostEdit(items[index],body.input);}
    data.items=items;await writeDomain(command,domain,data);return json(res,200,{ok:true,item:req.method==='PATCH'?items[index]:null});
  }
  if(req.method==='POST'){
    const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});
    if(!['columns','community','itsme','news'].includes(domain))return json(res,403,{ok:false,error:'WRITE_NOT_ALLOWED'});
    if(['columns','news'].includes(domain)&&!['admin','partner'].includes(user.role)&&!(bodyOf(req).operation==='upload-image'&&bodyOf(req).id))return json(res,403,{ok:false,error:'EDITOR_WRITE_FORBIDDEN'});
    if(bodyOf(req).operation==='upload-image'){
      try{const body=bodyOf(req);if(!['columns','news'].includes(domain))return json(res,403,{ok:false,error:'IMAGE_NOT_ALLOWED'});
      if(body.id){const data=await readDomain(command,domain,{items:[]}),post=contentItems(data).find(row=>String(row.id)===String(body.id));if(!canManagePost(user,post))return json(res,403,{ok:false,error:'POST_EDIT_FORBIDDEN'});}
      const valid=validatePoliticianPhoto({contentType:body.contentType,bytes:Buffer.from(String(body.base64||''),'base64')});
      if(!politicianPhotoStorageStatus().configured)return json(res,503,{ok:false,error:'PHOTO_STORAGE_NOT_CONFIGURED'});
      const blob=await put(`boards/${domain}/${Date.now()}.${valid.extension}`,valid.bytes,{access:'public',contentType:valid.contentType,addRandomSuffix:true});return json(res,201,{ok:true,url:blob.url});
      }catch(error){return json(res,400,{ok:false,error:String(error.message||'IMAGE_UPLOAD_FAILED')});}
    }
    const input=sanitizeContentInput(bodyOf(req).input||bodyOf(req)),data=(await readDomain(command,domain,{items:[]}))||{items:[]};
    const item={...input,id:`${domain}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,ownerId:user.id,author:String(user.nickname||user.id).slice(0,40),published:true,likes:0,views:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    data.items=[item,...contentItems(data)].slice(0,500);await writeDomain(command,domain,data);const decorated=await attachRepresentativeBadges(command,{items:[item]});return json(res,201,{ok:true,item:decorated.items[0]});
  }
  return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
}

async function handleAction(req,res,command){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});
  const body=bodyOf(req),action=String(body.action||''),payload=body.payload||body;let activity=await readActivity(command,user.id);

  if(action.startsWith('badge-')){
    const result=await dispatchBadgeRequest('action',req.method,user,body,createBadgeService(command));
    if(result)return json(res,result.status,result.body);
  }

  if(action==='post-like'){
    const domain=String(payload.domain||''),postId=String(payload.postId||'');if(!['columns','community','itsme','news'].includes(domain)||!postId)return json(res,400,{ok:false,error:'INVALID_POST'});
    const data=await readDomain(command,domain,{items:[]});const post=contentItems(data).find(x=>String(x.id)===postId);if(!post)return json(res,404,{ok:false,error:'POST_NOT_FOUND'});
    const key=`${domain}:${postId}`,liked=new Set(activity.likedPosts||[]),active=!liked.has(key);active?liked.add(key):liked.delete(key);post.likes=Math.max(0,Number(post.likes||0)+(active?1:-1));activity.likedPosts=[...liked];await writeDomain(command,domain,data);activity=await writeActivity(command,user.id,activity);return json(res,200,{ok:true,active,likes:post.likes,activity});
  }
  if(action==='favorite-toggle'){
    const result=await favoriteService(command).toggle(user,payload);
    return json(res,result.ok?200:result.error==='FAVORITE_TARGET_NOT_FOUND'?404:400,result);
  }
  if(action==='comment-add'){
    const domain=String(payload.domain||''),postId=String(payload.postId||''),text=String(payload.text||'').trim().slice(0,1000);if(!['columns','community','itsme','news'].includes(domain)||!postId||!text)return json(res,400,{ok:false,error:'INVALID_COMMENT'});if(!await findPublishedPost(command,domain,postId))return json(res,404,{ok:false,error:'POST_NOT_FOUND'});
    const comments=await readDomain(command,'comments',{items:[]});const comment={id:`comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,domain,postId,ownerId:user.id,author:String(user.nickname||user.id).slice(0,40),text,createdAt:new Date().toISOString(),published:true};comments.items=[comment,...contentItems(comments)].slice(0,3000);await writeDomain(command,'comments',comments);const decorated=await attachRepresentativeBadges(command,{items:[comment]});return json(res,200,{ok:true,comment:decorated.items[0]});
  }
  if(action==='post-view'){const result=await recordContentView(command,user,String(payload.domain||''),String(payload.postId||''));return json(res,result.ok?200:result.error==='POST_NOT_FOUND'?404:400,result);}
  if(action==='vote'){
    const scope=String(payload.scope||''),option=String(payload.option||'');
    if(scope.startsWith('poll:')){
      const pollId=scope.slice(5),polls=await readDomain(command,'polls',{items:[]});const poll=contentItems(polls).find(x=>String(x.id)===pollId&&x.published!==false);const opt=poll?.options?.find(x=>String(x.id)===option);if(!poll||!opt)return json(res,404,{ok:false,error:'POLL_NOT_FOUND'});activity.pollVotes=activity.pollVotes||{};if(activity.pollVotes[pollId])return json(res,409,{ok:false,error:'ALREADY_VOTED'});opt.votes=Number(opt.votes||0)+1;activity.pollVotes[pollId]=option;await writeDomain(command,'polls',polls);await writeActivity(command,user.id,activity);return json(res,200,{ok:true});
    }
    if(scope.startsWith('generation:')){
      const parts=scope.slice('generation:'.length).split(':'),roundId=parts.length>1?parts.shift():'',group=parts.join(':')||scope.slice('generation:'.length);
      if(group!==ageGroup(user.birthYear))return json(res,400,{ok:false,error:'AGE_GROUP_MISMATCH'});
      const data=await readDomain(command,'generation',{enabled:true,candidates:[],results:{},items:[]}),round=roundId?contentItems(data).find(item=>String(item.id)===roundId&&item.published!==false):null,candidates=round?.candidateIds||data.candidates||[];
      if(data.enabled===false)return json(res,403,{ok:false,error:'GENERATION_VOTE_CLOSED'});if(candidates.length&&!candidates.includes(option))return json(res,400,{ok:false,error:'CANDIDATE_NOT_ALLOWED'});
      const voteKey=roundId?`${roundId}:${group}`:group;activity.generationVotes=activity.generationVotes||{};if(activity.generationVotes[voteKey])return json(res,409,{ok:false,error:'ALREADY_VOTED'});
      const results=round?(round.results=round.results||{}):(data.results=data.results||{});results[group]=results[group]||{};results[group][option]=Number(results[group][option]||0)+1;
      if(round?.featured){data.results=round.results;data.candidates=round.candidateIds;}activity.generationVotes[voteKey]=option;await writeDomain(command,'generation',data);await writeActivity(command,user.id,activity);return json(res,200,{ok:true});
    }
    if(scope.startsWith('national:')){
      const pair=scope.slice('national:'.length).split('::'),evaluationId=pair[0]||'',personId=pair[1]||'';const rating=option;if(!evaluationId||!personId||!['positive','neutral','negative'].includes(rating))return json(res,400,{ok:false,error:'INVALID_NATIONAL_EVALUATION'});const data=await readDomain(command,'nationalEvaluation',{results:{},slots:{}});const active=Object.values(data.slots||{}).find(s=>String(s?.evaluationId||'')===evaluationId&&String(s?.subjectId||'')===personId&&s?.enabled===true&&!String(s?.closedAt||''));if(!active)return json(res,403,{ok:false,error:'EVALUATION_CLOSED'});activity.nationalEvaluationVotes=activity.nationalEvaluationVotes||{};if(activity.nationalEvaluationVotes[evaluationId])return json(res,409,{ok:false,error:'ALREADY_VOTED'});data.results=data.results||{};data.results[evaluationId]={positive:0,neutral:0,negative:0,...(data.results[evaluationId]||{})};data.results[evaluationId][rating]=Number(data.results[evaluationId][rating]||0)+1;activity.nationalEvaluationVotes[evaluationId]=rating;await writeDomain(command,'nationalEvaluation',data);await writeActivity(command,user.id,activity);return json(res,200,{ok:true});
    }
    return json(res,400,{ok:false,error:'INVALID_VOTE'});
  }
  if(action==='academy-apply'){
    const slotId=String(payload.slotId||''),academy=await readDomain(command,'academy',{slots:[]});if(!isActiveAcademySlot(academy,slotId))return json(res,404,{ok:false,error:'ACADEMY_SLOT_NOT_FOUND'});activity.academyApplications=[...new Set([slotId,...(activity.academyApplications||[])])].slice(0,100);await writeActivity(command,user.id,activity);return json(res,200,{ok:true,activity});
  }
  return json(res,400,{ok:false,error:'UNKNOWN_ACTION'});
}

export async function dispatchAdminIntelligence(route,method,service,input={}){
  const actions={
    'admin/intelligence/status':{method:'GET',run:()=>service.status()},
    'admin/intelligence/collect/start':{method:'POST',run:()=>service.startCollection()},
    'admin/intelligence/collect/step':{method:'POST',run:()=>service.runCollectionStep()},
    'admin/intelligence/collect/retry-failures':{method:'POST',run:()=>service.retryCollectionFailures()},
    'admin/intelligence/preview':{method:'GET',run:()=>service.preview()},
    'admin/intelligence/draft':{method:'PATCH',run:()=>service.updateDraft(input)},
    'admin/intelligence/approve':{method:'POST',run:()=>service.approveDraft(input)},
    'admin/intelligence/publish/start':{method:'POST',run:()=>service.startPublish()},
    'admin/intelligence/publish/step':{method:'POST',run:()=>service.runPublishStep()},
    'admin/intelligence/youtube/discovery/start':{method:'POST',run:()=>service.startYouTubeDiscovery()},
    'admin/intelligence/youtube/discovery/step':{method:'POST',run:()=>service.runYouTubeDiscoveryStep()},
    'admin/intelligence/youtube/channel':{method:'PATCH',run:()=>service.saveYouTubeChannel(input)},
    'admin/intelligence/youtube/channel/rediscover':{method:'POST',run:()=>service.rediscoverYouTubeChannel(input)},
    'admin/intelligence/person/refresh':{method:'POST',run:()=>service.refreshPerson(input)},
    'admin/intelligence/person/approve':{method:'POST',run:()=>service.approvePersonRefresh(input)},
    'admin/intelligence/person/publish':{method:'POST',run:()=>service.publishPersonRefresh(input)},
  };
  if(route==='admin/intelligence/youtube/channel'&&method==='DELETE'){
    try{return {status:200,body:{ok:true,...await service.deleteYouTubeChannel(input)}};}
    catch(error){const code=String(error?.code||error?.message||'INTELLIGENCE_OPERATION_FAILED');return {status:['POLITICIAN_PROFILE_MISSING','YOUTUBE_CHANNEL_NOT_FOUND'].includes(code)?404:500,body:{ok:false,error:code}};}
  }
  const action=actions[route];
  if(!action)return {status:404,body:{ok:false,error:'NOT_FOUND'}};
  if(method!==action.method)return {status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}};
  try{return {status:200,body:{ok:true,...await action.run()}};}
  catch(error){
    const code=String(error?.code||error?.message||'INTELLIGENCE_OPERATION_FAILED');
    const status=['COLLECTION_NOT_READY','COLLECTION_VALIDATION_REQUIRED','DRAFT_APPROVAL_REQUIRED','NAVER_CREDENTIALS_MISSING','YOUTUBE_CREDENTIALS_MISSING','YOUTUBE_SEARCH_QUOTA_REACHED','PERSON_REFRESH_APPROVAL_REQUIRED','PERSON_REFRESH_BASE_CHANGED'].includes(code)?409:['DRAFT_NOT_FOUND','DRAFT_NOT_EDITABLE','DRAFT_VALIDATION_FAILED','YOUTUBE_CHANNEL_REFERENCE_INVALID','YOUTUBE_DISCOVERY_NOT_STARTED','PERSON_REFRESH_NOT_READY'].includes(code)?400:['POLITICIAN_PROFILE_MISSING','YOUTUBE_CHANNEL_NOT_FOUND'].includes(code)?404:500;
    if(status===500)console.error('[admin-intelligence]',{route,code,message:String(error?.message||''),cause:String(error?.cause?.code||error?.cause?.message||'')});
    return {status,body:{ok:false,error:code,...(status===500?{stage:error.stage|| (route.includes('/publish/')?'게시 처리':''),diagnostic:error.diagnostic||''}:{})}};
  }
}

async function handleAdmin(req,res,route,command){
  const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});if(user.role!=='admin')return json(res,403,{ok:false,error:'ADMIN_REQUIRED'});
  const adminPoliticians=createAdminPoliticianService({command,profilesProvider:()=>allPoliticianProfiles(command)});
  if(route==='admin/keyword-rules'){
    if(req.method==='GET'){let rules={};try{rules=JSON.parse(await command(['GET',KEYWORD_RULES_KEY])||'{}');}catch{}return json(res,200,{ok:true,rules:sanitizeKeywordRules(rules)});}
    if(req.method==='PATCH'){const rules=sanitizeKeywordRules(bodyOf(req));await command(['SET',KEYWORD_RULES_KEY,JSON.stringify(rules)]);return json(res,200,{ok:true,rules});}
    return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  }
  if(route==='admin/participation'&&req.method==='POST'){
    const body=bodyOf(req),domain=String(body.domain||'');if(!['polls','generation','nationalEvaluation'].includes(domain))return json(res,400,{ok:false,error:'INVALID_PARTICIPATION_DOMAIN'});
    const current=(await readDomain(command,domain,domain==='polls'?{items:[]}:{slots:{},results:{},history:[],items:[]}))||{};
    try{
      const result=['edit','delete'].includes(body.operation)?editParticipationPost(domain,current,body.itemId,body.input||{},body.operation==='delete'):body.operation==='feature'?featureParticipationPost(domain,current,body.itemId):createParticipationPost(domain,current,body.input||{},user);
      await writeDomain(command,domain,result.data);return json(res,200,{ok:true,item:result.item,data:result.data});
    }catch(error){return json(res,400,{ok:false,error:error.message||'PARTICIPATION_SAVE_FAILED'});}
  }
  if(route.startsWith('admin/intelligence/')){
    const input={...bodyOf(req),reviewedBy:user.id,editorId:user.id},result=await dispatchAdminIntelligence(route,req.method,createIntelligenceService({command}),input),auditedActions={'admin/intelligence/collect/start':'COLLECTION_START','admin/intelligence/collect/retry-failures':'COLLECTION_RETRY','admin/intelligence/approve':'COLLECTION_APPROVE','admin/intelligence/publish/start':'PUBLICATION_START','admin/intelligence/youtube/discovery/start':'YOUTUBE_DISCOVERY_START','admin/intelligence/youtube/channel':'YOUTUBE_CHANNEL_UPDATE','admin/intelligence/youtube/channel/rediscover':'YOUTUBE_CHANNEL_REDISCOVER','admin/intelligence/person/refresh':'PERSON_REFRESH','admin/intelligence/person/approve':'PERSON_REFRESH_APPROVE','admin/intelligence/person/publish':'PERSON_REFRESH_PUBLISH'},action=auditedActions[route];
    if(result.status<300&&action)try{await adminPoliticians.log(user.id,action,input.personId||'',{method:req.method});}catch(error){console.error('[admin-audit]',{action,code:String(error?.code||error?.message||'AUDIT_WRITE_FAILED')});}
    return json(res,result.status,result.body);
  }
  if(route==='admin/users'&&req.method==='GET'){
    const users=await listUsers(command),service=createBadgeService(command);
    const enriched=await Promise.all(users.map(async target=>{const activity=await readActivity(command,target.id),status=await service.statusForUser(target,activity);return {...target,grantedBadges:activity.grantedBadges||[],representativeBadge:status.representativeBadge,showcaseBadges:status.showcaseBadges,earnedBadges:status.earnedBadges,eligibleBadges:status.eligibleBadges};}));
    return json(res,200,{ok:true,users:enriched});
  }
  if(route==='admin/users'&&req.method==='PATCH'){
    const body=bodyOf(req);
    if(body.operation==='profile'){
      const result=await updateUserByAdmin(command,body,user.id);
      if(result.ok)await adminPoliticians.log(user.id,'MEMBER_PROFILE_UPDATE',result.user.id,{changedFields:['nextId','name','nickname','email','phone','birthYear','regionProvince','regionCity','regionDistrict','preferredParty','status','role'].filter(key=>body[key]!==undefined),status:result.user.status,role:result.user.role});
      return json(res,result.ok?200:result.error==='USER_NOT_FOUND'?404:['DUPLICATE_ID','SELF_ADMIN_CHANGE_FORBIDDEN','LAST_ADMIN_CHANGE_FORBIDDEN'].includes(result.error)?409:400,result);
    }
    if(body.operation==='password-reset'){
      const result=await resetUserPassword(command,body,user.id);
      if(result.ok)await adminPoliticians.log(user.id,'MEMBER_PASSWORD_RESET',result.user.id,{sessionsInvalidated:true,forcedPasswordChange:true});
      return json(res,result.ok?200:result.error==='USER_NOT_FOUND'?404:400,result);
    }
    if(body.role!==undefined){const result=await updateUserRole(command,body.id,body.role,user.id);return json(res,result.ok?200:result.error==='USER_NOT_FOUND'?404:409,result);}
    const target=await getUser(command,body.id),result=await dispatchBadgeRequest(route,req.method,user,body,createBadgeService(command),target);
    return json(res,result.status,result.body);
  }
  if(route==='admin/politicians'&&req.method==='GET'){
    const query=String(new URL(req.url||'/',`https://${req.headers.host||'localhost'}`).searchParams.get('q')||req.query?.q||'');
    const [list,completeness]=await Promise.all([adminPoliticians.list(query),adminPoliticians.completeness()]);return json(res,200,{ok:true,...list,completeness});
  }
  if(route==='admin/politicians'&&req.method==='PATCH'){
    const body=bodyOf(req);
    try{const result=body.operation==='past-risks'?await adminPoliticians.savePastRisks(body.personId,body.pastRisks,user.id):body.operation==='news-exclusions'?await adminPoliticians.saveNewsExclusions(body.personId,body.newsExclusions,user.id):null;return result?json(res,200,{ok:true,...result}):json(res,400,{ok:false,error:'INVALID_OPERATION'});}
    catch(error){return json(res,String(error.message)==='POLITICIAN_PROFILE_MISSING'?404:400,{ok:false,error:String(error.message||'POLITICIAN_SAVE_FAILED')});}
  }
  if(route==='admin/politicians/photo'&&req.method==='GET')return json(res,200,{ok:true,storage:politicianPhotoStorageStatus(process.env)});
  if(route==='admin/politicians/photo'&&req.method==='POST'){
    const body=bodyOf(req),encoded=String(body.dataBase64||'');if(encoded.length>1_500_000)return json(res,413,{ok:false,error:'PHOTO_TOO_LARGE'});
    try{const service=createPoliticianPhotoService({command,profilesProvider:()=>allPoliticianProfiles(command)}),result=await service.save({personId:body.personId,contentType:body.contentType,bytes:Buffer.from(encoded,'base64'),focus:body.focus},user.id);await adminPoliticians.log(user.id,'POLITICIAN_PHOTO_UPDATE',body.personId,{size:result.photo.size,contentType:result.photo.contentType,previousUrl:result.previous?.url||'',previousPathname:result.previous?.pathname||'',currentUrl:result.photo.url,currentPathname:result.photo.pathname});return json(res,200,{ok:true,...result});}
    catch(error){const code=politicianPhotoErrorCode(error);return json(res,code==='POLITICIAN_PROFILE_MISSING'?404:code==='PHOTO_TOO_LARGE'?413:code==='PHOTO_STORAGE_NOT_CONFIGURED'?503:400,{ok:false,error:code});}
  }
  if(route==='admin/home-banner'&&req.method==='GET')return json(res,200,{ok:true,storage:homeBannerStorageStatus(process.env),limits:{maxBytes:2_097_152,maxMegabytes:2,formats:['JPG','PNG','WEBP'],recommended:{width:640,height:450}}});
  if(route==='admin/home-banner'&&req.method==='POST'){
    const body=bodyOf(req),encoded=String(body.dataBase64||'');if(encoded.length>2_900_000)return json(res,413,{ok:false,error:'BANNER_TOO_LARGE'});
    try{const banner=await createHomeBannerService({command}).save({contentType:body.contentType,bytes:Buffer.from(encoded,'base64'),targetUrl:body.targetUrl,alt:body.alt},user.id);return json(res,200,{ok:true,banner});}
    catch(error){const code=String(error?.message||'BANNER_UPLOAD_FAILED'),storage=code==='BANNER_STORAGE_NOT_CONFIGURED'||/No blob credentials|BLOB_READ_WRITE_TOKEN|VERCEL_OIDC_TOKEN|BLOB_STORE_ID/i.test(code);return json(res,code==='BANNER_TOO_LARGE'?413:storage?503:400,{ok:false,error:storage?'BANNER_STORAGE_NOT_CONFIGURED':code});}
  }
  if(route==='admin/footer-info'&&req.method==='GET')return json(res,200,{ok:true,info:await createSiteSettingsService({command}).get()});
  if(route==='admin/footer-info'&&req.method==='PATCH'){
    const info=await createSiteSettingsService({command}).save(bodyOf(req),user.id);
    try{await adminPoliticians.log(user.id,'FOOTER_INFO_UPDATE','',{changedFields:Object.keys(info).filter(key=>!['updatedAt','updatedBy'].includes(key))});}catch(error){console.error('[admin-audit]',{action:'FOOTER_INFO_UPDATE',code:String(error?.code||error?.message||'AUDIT_WRITE_FAILED')});}
    return json(res,200,{ok:true,info});
  }
  if(route==='admin/audit'&&req.method==='GET')return json(res,200,{ok:true,...await adminPoliticians.audit()});
  if(route==='admin/badges'&&req.method==='GET'){
    const users=await listUsers(command),service=createBadgeService(command),records=await Promise.all(users.map(async target=>({user:target,status:await service.statusForUser(target)})));
    return json(res,200,{ok:true,records});
  }
  if(route==='admin/summary'&&req.method==='GET'){
    const users=await listUsers(command),contents={};for(const domain of LEGACY_DOMAINS){const data=await readDomain(command,domain,null);contents[domain]=Array.isArray(data?.items)?data.items.length:Array.isArray(data?.slots)?data.slots.length:(data?1:0);}return json(res,200,{ok:true,users:{total:users.length,admins:users.filter(x=>x.role==='admin').length},contents});
  }
  return false;
}

export default async function handler(req,res){
  const url=new URL(req.url||'/',`https://${req.headers.host||'localhost'}`);const route=String(req.query?.path||url.searchParams.get('path')||url.pathname.replace(/^\/api\/v3\/?/,'')).replace(/^\/+|\/+$/g,'');
  try{
    if(route.startsWith('migration/'))return handleMigration(req,res,route);
    const command=rebuildRedisCommand();
    if(route.startsWith('user/')){const handled=await handleUser(req,res,route,command);if(handled!==false)return handled;}
    if(route==='inquiries'){
      const service=createInquiryService({command}),user=await currentUser(req,command);
      if(req.method==='GET')return json(res,200,await service.list(user,{offset:url.searchParams.get('offset'),limit:url.searchParams.get('limit')}));
      if(['PATCH','DELETE'].includes(req.method)){const body=bodyOf(req),result=await service.edit(body.id,user,body.input||{},req.method==='DELETE');return json(res,result.ok?200:result.error==='LOGIN_REQUIRED'?401:result.error==='INQUIRY_FORBIDDEN'?403:400,result);}
      if(req.method==='POST'){const result=await service.create(user,bodyOf(req));return json(res,result.ok?201:result.error==='LOGIN_REQUIRED'?401:400,result);}
      return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    }
    if(route==='inquiries/detail'&&req.method==='GET'){
      const result=await createInquiryService({command}).get(url.searchParams.get('id')||req.query?.id,await currentUser(req,command));
      return json(res,result.ok?200:result.error==='INQUIRY_FORBIDDEN'?403:404,result);
    }
    if(route==='inquiries/reply'&&req.method==='POST'){
      const input=bodyOf(req),result=await createInquiryService({command}).reply(input.id,await currentUser(req,command),input.body);
      return json(res,result.ok?200:result.error==='ADMIN_REQUIRED'?403:result.error==='INQUIRY_NOT_FOUND'?404:400,result);
    }
    if(route==='politician-requests'){
      const service=createApplicationService({command}),user=await currentUser(req,command);
      if(req.method==='GET'){const result=await service.listPoliticianRequests(user);return json(res,result.ok?200:result.error==='LOGIN_REQUIRED'?401:400,result);}
      if(req.method==='POST'){const result=await service.createPoliticianRequest(user,bodyOf(req));return json(res,result.ok?201:result.error==='LOGIN_REQUIRED'?401:400,result);}
      if(req.method==='PATCH'){const body=bodyOf(req),result=await service.updatePoliticianRequest(user,body.id,body.status);return json(res,result.ok?200:result.error==='ADMIN_REQUIRED'?403:result.error==='REQUEST_NOT_FOUND'?404:400,result);}
      return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    }
    if(route==='partner-applications'){
      const service=createApplicationService({command}),user=await currentUser(req,command);
      if(req.method==='POST'){const result=await service.createPartnerApplication(user,bodyOf(req));return json(res,result.ok?201:400,result);}
      if(req.method==='GET'){const result=await service.listPartnerApplications(user);return json(res,result.ok?200:403,result);}
      return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    }
    if(route==='content')return handleContent(req,res,command,url);
    if(route==='home/banner'&&req.method==='GET')return json(res,200,{ok:true,banner:await createHomeBannerService({command}).get()});
    if(route==='site/footer-info'&&req.method==='GET')return json(res,200,{ok:true,info:await createSiteSettingsService({command}).get()});
    if(route==='politicians')return handlePoliticians(req,res,command,url,createIntelligenceService({command}));
    if(route==='action')return handleAction(req,res,command);
    if(route==='stats'){const users=await listUsers(command);return json(res,200,{ok:true,members:users.length});}
    if(route.startsWith('admin/')){const handled=await handleAdmin(req,res,route,command);if(handled!==false)return handled;}
    if(route==='health')return json(res,200,{ok:true,version:'JCS_0_0_31_45'});
    return json(res,404,{ok:false,error:'NOT_FOUND'});
  }catch(error){return json(res,error.message==='MEMBERS_CHANGED_RETRY'?409:error.code==='STORAGE_MISSING'?503:500,{ok:false,error:error.code||error.message||'SERVER_ERROR'});}
}
