import { legacyRedisCommand, rebuildRedisCommand } from '../lib/redis-rest.js';
import { collectLegacySnapshot, writeRebuildSnapshot, writePoliticianSeed, validatePoliticianSeed, TARGET_KEYS } from '../lib/migration-service.js';
import { LEGACY_DOMAINS } from '../lib/migration-core.js';
import { issueSessionToken, readSessionToken } from '../lib/session.js';
import { readUsers, listUsers, getUser, registerUser, authenticateUser, updateProfile, publicUser, readDomain, readDomainWithViews, writeDomain, readActivity, writeActivity } from '../lib/rebuild-store.js';
import { POLITICIAN_COUNTS, POLITICIAN_TYPES, cleanPoliticianType, readPoliticianType, readPoliticianPhotos, getPolitician, searchPoliticianProfiles } from '../lib/politician-store.js';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { accessTierForUser, projectIntelligence } from '../lib/intelligence-access.js';
import { createBadgeService } from '../lib/badge-service.js';
import { createParticipationPost, featureParticipationPost } from '../lib/participation-admin.js';

const COOKIE='jcsr2_session';
const MAX_AGE=60*60*24*30;
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
const bodyOf=req=>{if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}}return {};};
const cookieMap=req=>Object.fromEntries(String(req.headers?.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return i<0?[v,'']:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]}));
const sessionSecret=()=>String(process.env.JCS_REBUILD_SESSION_SECRET||'');
const migrationSecret=()=>String(process.env.JCS_MIGRATION_SECRET||'');
const setSession=(res,userId)=>{const token=issueSessionToken(userId,sessionSecret());res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`);};
const clearSession=res=>res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);

async function currentUser(req,command){const token=cookieMap(req)[COOKIE];const s=readSessionToken(token,sessionSecret());if(!s?.userId)return null;return publicUser(await getUser(command,s.userId));}
function ageGroup(birthYear){const y=Number(birthYear||0),current=new Date().getFullYear();if(!Number.isInteger(y)||y<1900||y>current)return '';const age=current-y;if(age<20)return '10대';if(age<30)return '20대';if(age<40)return '30대';if(age<50)return '40대';if(age<60)return '50대';return '60대+';}
function contentItems(data){return Array.isArray(data?.items)?data.items:[];}
function cleanDomain(domain){return LEGACY_DOMAINS.includes(String(domain||''))?String(domain):'';}
export function sanitizeContentInput(input={}){const safe={};for(const [key,limit] of Object.entries({title:200,body:20000,summary:500,category:80,coverImage:1000})){const value=String(input?.[key]||'').trim().slice(0,limit);if(value)safe[key]=value;}return safe;}
export function isActiveAcademySlot(data={},slotId=''){const id=String(slotId||'');return !!id&&(Array.isArray(data?.slots)?data.slots:contentItems(data)).some(slot=>String(slot?.id||'')===id&&slot?.published!==false&&!slot?.closedAt);}
export async function findPublishedPost(command,domain,postId){if(!['columns','community','itsme'].includes(String(domain||''))||!postId)return null;const data=await readDomain(command,domain,{items:[]});return contentItems(data).find(post=>String(post.id)===String(postId)&&post.published!==false)||null;}
const RECORD_CONTENT_VIEW_LUA=`local current=tonumber(redis.call('GET',KEYS[2]) or '0');if ARGV[1]==ARGV[2] then return cjson.encode({ok=true,counted=false,increment=current}) end;local added=redis.call('SADD',KEYS[1],ARGV[1]);if added==0 then return cjson.encode({ok=true,counted=false,increment=current}) end;local next=redis.call('INCR',KEYS[2]);return cjson.encode({ok=true,counted=true,increment=next})`;
export async function recordContentView(command,user,domain,postId){
  if(!user)return {ok:false,error:'LOGIN_REQUIRED'};const cleanDomain=String(domain||''),cleanPostId=String(postId||'');if(!['columns','community','itsme'].includes(cleanDomain)||!cleanPostId)return {ok:false,error:'INVALID_POST'};
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

async function handlePoliticians(req,res,command,url,intelligence){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  const id=String(url.searchParams.get('id')||req.query?.id||'').trim(),query=String(url.searchParams.get('q')||req.query?.q||'').trim(),ranking=String(url.searchParams.get('ranking')||req.query?.ranking||'').trim(),photos=await readPoliticianPhotos(command);
  if(id){
    const [item,report,user]=await Promise.all([getPolitician(command,id),intelligence.getPublicIntelligence(id),currentUser(req,command)]);
    if(!item)return json(res,404,{ok:false,error:'POLITICIAN_NOT_FOUND'});
    const tier=accessTierForUser(user),scope=String(url.searchParams.get('view')||req.query?.view||'')==='compare'?'compare':'detail';
    let projected=projectIntelligence(report,tier,scope);
    if(Array.isArray(projected?.related)&&projected.related.length){
      const profiles=(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type)))).flat(),byId=new Map(profiles.map(person=>[person.id,person]));
      projected={...projected,related:projected.related.map(row=>{const related=byId.get(row.id)||{};return {...row,party:related.party||'',jurisdiction:related.jurisdiction||'',office:related.office||related.roleLabel||'',photo:photos[row.id]||null};})};
    }
    return json(res,200,{ok:true,accessTier:tier,item:{...item,photo:photos[id]||null},intelligence:projected});
  }
  if(ranking==='overall'){
    const published=await intelligence.getPublicRankings();if(!published)return json(res,200,{ok:true,published:false,items:[]});
    const profiles=(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(command,type)))).flat(),byId=new Map(profiles.map(person=>[person.id,person]));
    const items=(published.overall||[]).slice(0,30).map(row=>({...byId.get(row.id),...row,photo:photos[row.id]||null,rankMode:'published'}));
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
  const [all,published]=await Promise.all([readPoliticianType(command,type),intelligence.getPublicRankings()]),rankById=published?.byId||{},items=all.slice(offset,offset+limit).map(item=>({...item,photo:photos[item.id]||null,now:rankById[item.id]||null}));
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
    const result=await registerUser(command,bodyOf(req));if(!result.ok)return json(res,result.error==='DUPLICATE_ID'?409:400,result);setSession(res,result.user.id);return json(res,201,result);
  }
  if(route==='user/login'&&req.method==='POST'){
    const body=bodyOf(req);const user=await authenticateUser(command,body.id,body.password);if(!user)return json(res,401,{ok:false,error:'INVALID_LOGIN'});setSession(res,user.id);return json(res,200,{ok:true,user});
  }
  if(route==='user/logout'&&req.method==='POST'){clearSession(res);return json(res,200,{ok:true});}
  if(route==='user/session'&&req.method==='GET'){const user=await currentUser(req,command);return json(res,200,{authenticated:!!user,user:user||null});}
  if(route==='user/profile'&&req.method==='POST'){const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});return json(res,200,await updateProfile(command,user.id,bodyOf(req)));}
  if(route==='user/activity'&&req.method==='GET'){const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});return json(res,200,{ok:true,activity:await readActivity(command,user.id)});}
  if(route==='user/badges'){
    const result=await dispatchBadgeRequest(route,req.method,await currentUser(req,command),bodyOf(req),createBadgeService(command));
    return json(res,result.status,result.body);
  }
  return false;
}

async function handleContent(req,res,command,url){
  const domain=cleanDomain(url.searchParams.get('domain')||req.query?.domain);if(!domain)return json(res,400,{ok:false,error:'INVALID_DOMAIN'});
  if(req.method==='GET')return json(res,200,{ok:true,domain,data:(await readDomainWithViews(command,domain,null))||({items:[]})});
  if(req.method==='POST'){
    const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});
    if(!['columns','community','itsme'].includes(domain))return json(res,403,{ok:false,error:'WRITE_NOT_ALLOWED'});
    if(domain==='columns'&&!['admin','partner'].includes(user.role))return json(res,403,{ok:false,error:'COLUMN_WRITE_FORBIDDEN'});
    const input=sanitizeContentInput(bodyOf(req).input||bodyOf(req)),data=(await readDomain(command,domain,{items:[]}))||{items:[]};
    const item={...input,id:`${domain}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,ownerId:user.id,author:String(user.nickname||user.id).slice(0,40),published:true,likes:0,views:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    data.items=[item,...contentItems(data)].slice(0,500);await writeDomain(command,domain,data);return json(res,201,{ok:true,item});
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
    const domain=String(payload.domain||''),postId=String(payload.postId||'');if(!['columns','community','itsme'].includes(domain)||!postId)return json(res,400,{ok:false,error:'INVALID_POST'});
    const data=await readDomain(command,domain,{items:[]});const post=contentItems(data).find(x=>String(x.id)===postId);if(!post)return json(res,404,{ok:false,error:'POST_NOT_FOUND'});
    const key=`${domain}:${postId}`,liked=new Set(activity.likedPosts||[]),active=!liked.has(key);active?liked.add(key):liked.delete(key);post.likes=Math.max(0,Number(post.likes||0)+(active?1:-1));activity.likedPosts=[...liked];await writeDomain(command,domain,data);activity=await writeActivity(command,user.id,activity);return json(res,200,{ok:true,active,likes:post.likes,activity});
  }
  if(action==='comment-add'){
    const domain=String(payload.domain||''),postId=String(payload.postId||''),text=String(payload.text||'').trim().slice(0,1000);if(!['columns','community','itsme'].includes(domain)||!postId||!text)return json(res,400,{ok:false,error:'INVALID_COMMENT'});if(!await findPublishedPost(command,domain,postId))return json(res,404,{ok:false,error:'POST_NOT_FOUND'});
    const comments=await readDomain(command,'comments',{items:[]});const comment={id:`comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,domain,postId,ownerId:user.id,author:String(user.nickname||user.id).slice(0,40),text,createdAt:new Date().toISOString(),published:true};comments.items=[comment,...contentItems(comments)].slice(0,3000);await writeDomain(command,'comments',comments);return json(res,200,{ok:true,comment});
  }
  if(action==='post-view'){const result=await recordContentView(command,user,String(payload.domain||''),String(payload.postId||''));return json(res,result.ok?200:result.error==='POST_NOT_FOUND'?404:400,result);}
  if(action==='vote'){
    const scope=String(payload.scope||''),option=String(payload.option||'');
    if(scope.startsWith('poll:')){
      const pollId=scope.slice(5),polls=await readDomain(command,'polls',{items:[]});const poll=contentItems(polls).find(x=>String(x.id)===pollId&&x.published!==false);const opt=poll?.options?.find(x=>String(x.id)===option);if(!poll||!opt)return json(res,404,{ok:false,error:'POLL_NOT_FOUND'});activity.pollVotes=activity.pollVotes||{};if(activity.pollVotes[pollId])return json(res,409,{ok:false,error:'ALREADY_VOTED'});opt.votes=Number(opt.votes||0)+1;activity.pollVotes[pollId]=option;await writeDomain(command,'polls',polls);await writeActivity(command,user.id,activity);return json(res,200,{ok:true});
    }
    if(scope.startsWith('generation:')){
      const group=scope.slice('generation:'.length);if(group!==ageGroup(user.birthYear))return json(res,400,{ok:false,error:'AGE_GROUP_MISMATCH'});const data=await readDomain(command,'generation',{enabled:true,candidates:[],results:{}});if(data.enabled===false)return json(res,403,{ok:false,error:'GENERATION_VOTE_CLOSED'});if(Array.isArray(data.candidates)&&data.candidates.length&&!data.candidates.includes(option))return json(res,400,{ok:false,error:'CANDIDATE_NOT_ALLOWED'});activity.generationVotes=activity.generationVotes||{};if(activity.generationVotes[group])return json(res,409,{ok:false,error:'ALREADY_VOTED'});data.results=data.results||{};data.results[group]=data.results[group]||{};data.results[group][option]=Number(data.results[group][option]||0)+1;activity.generationVotes[group]=option;await writeDomain(command,'generation',data);await writeActivity(command,user.id,activity);return json(res,200,{ok:true});
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

export async function dispatchAdminIntelligence(route,method,service){
  const actions={
    'admin/intelligence/status':{method:'GET',run:()=>service.status()},
    'admin/intelligence/collect/start':{method:'POST',run:()=>service.startCollection()},
    'admin/intelligence/collect/step':{method:'POST',run:()=>service.runCollectionStep()},
    'admin/intelligence/preview':{method:'GET',run:()=>service.preview()},
    'admin/intelligence/publish/start':{method:'POST',run:()=>service.startPublish()},
    'admin/intelligence/publish/step':{method:'POST',run:()=>service.runPublishStep()},
  };
  const action=actions[route];
  if(!action)return {status:404,body:{ok:false,error:'NOT_FOUND'}};
  if(method!==action.method)return {status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}};
  try{return {status:200,body:{ok:true,...await action.run()}};}
  catch(error){
    const code=String(error?.code||error?.message||'INTELLIGENCE_OPERATION_FAILED');
    const status=['COLLECTION_NOT_READY','COLLECTION_VALIDATION_REQUIRED','NAVER_CREDENTIALS_MISSING'].includes(code)?409:500;
    if(status===500)console.error('[admin-intelligence]',{route,code,message:String(error?.message||''),cause:String(error?.cause?.code||error?.cause?.message||'')});
    return {status,body:{ok:false,error:code}};
  }
}

async function handleAdmin(req,res,route,command){
  const user=await currentUser(req,command);if(!user)return json(res,401,{ok:false,error:'LOGIN_REQUIRED'});if(user.role!=='admin')return json(res,403,{ok:false,error:'ADMIN_REQUIRED'});
  if(route==='admin/participation'&&req.method==='POST'){
    const body=bodyOf(req),domain=String(body.domain||'');if(!['polls','nationalEvaluation'].includes(domain))return json(res,400,{ok:false,error:'INVALID_PARTICIPATION_DOMAIN'});
    const current=(await readDomain(command,domain,domain==='polls'?{items:[]}:{slots:{},results:{},history:[],items:[]}))||{};
    try{
      const result=body.operation==='feature'?featureParticipationPost(domain,current,body.itemId):createParticipationPost(domain,current,body.input||{},user);
      await writeDomain(command,domain,result.data);return json(res,200,{ok:true,item:result.item,data:result.data});
    }catch(error){return json(res,400,{ok:false,error:error.message||'PARTICIPATION_SAVE_FAILED'});}
  }
  if(route.startsWith('admin/intelligence/')){const result=await dispatchAdminIntelligence(route,req.method,createIntelligenceService({command}));return json(res,result.status,result.body);}
  if(route==='admin/users'&&req.method==='GET'){
    const users=await listUsers(command),service=createBadgeService(command);
    const enriched=await Promise.all(users.map(async target=>{const activity=await readActivity(command,target.id),status=await service.statusForUser(target,activity);return {...target,grantedBadges:activity.grantedBadges||[],representativeBadge:status.representativeBadge,showcaseBadges:status.showcaseBadges,earnedBadges:status.earnedBadges,eligibleBadges:status.eligibleBadges};}));
    return json(res,200,{ok:true,users:enriched});
  }
  if(route==='admin/users'&&req.method==='PATCH'){
    const body=bodyOf(req),target=await getUser(command,body.id),result=await dispatchBadgeRequest(route,req.method,user,body,createBadgeService(command),target);
    return json(res,result.status,result.body);
  }
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
    if(route==='content')return handleContent(req,res,command,url);
    if(route==='politicians')return handlePoliticians(req,res,command,url,createIntelligenceService({command}));
    if(route==='action')return handleAction(req,res,command);
    if(route==='stats'){const users=await listUsers(command);return json(res,200,{ok:true,members:users.length});}
    if(route.startsWith('admin/')){const handled=await handleAdmin(req,res,route,command);if(handled!==false)return handled;}
    if(route==='health')return json(res,200,{ok:true,version:'JCS_0_0_27_2'});
    return json(res,404,{ok:false,error:'NOT_FOUND'});
  }catch(error){return json(res,error.code==='STORAGE_MISSING'?503:500,{ok:false,error:error.code||error.message||'SERVER_ERROR'});}
}
