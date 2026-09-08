import { validRegion } from '../src/data/korean-regions.js';
import { TARGET_KEYS } from './migration-service.js';
import { hashPassword, passwordHashKind, verifyPasswordHash } from './password.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const text=(v,max=500)=>String(v??'').trim().slice(0,max);
const now=()=>new Date().toISOString();
const validUserId=value=>/^[a-zA-Z0-9._-]{4,24}$/.test(String(value||''));
const nextSessionVersion=user=>(Number(user?.sessionVersion)||0)+1;
const ADMIN_USER_FIELDS=[['name',40],['nickname',40],['email',120],['phone',40],['birthYear',4],['regionProvince',40],['regionCity',40],['regionDistrict',40],['preferredParty',80]];
export function normalizeRegistrationPhone(value){const digits=String(value??'').replace(/\D/g,'');const tail=digits.startsWith('010')?digits.slice(3):digits;return /^\d{8}$/.test(tail)?`010-${tail.slice(0,4)}-${tail.slice(4)}`:'';}

export function publicUser(user){
  if(!user)return null;
  const {passwordHash:_pw,hash:_hash,passwordDigest:_digest,password:_password,...safe}=user;
  return safe;
}
function normalizeUser(user={},fallbackId=''){
  const source=user&&typeof user==='object'?user:{};
  const id=text(source.id||source.userId||source.username||source.loginId||fallbackId,24);
  if(!id)return null;
  return {
    ...source,
    id,
    nickname:text(source.nickname||source.displayName||source.name||id,40)||id,
    email:text(source.email,120),
    role:source.role||'member',
    status:source.status||'active',
    passwordHash:String(source.passwordHash||source.hash||source.passwordDigest||'').trim()
  };
}
function normalizeUsers(value){
  const entries=Array.isArray(value)?value.map((user,index)=>[String(index),user]):Object.entries(value&&typeof value==='object'?value:{});
  const users={};
  for(const [key,value] of entries){const user=normalizeUser(value,key);if(user&&!users[user.id])users[user.id]=user;}
  return users;
}
const userSnapshots=new WeakMap();
export const USERS_CAS_LUA="if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2]);return 1";
export async function readUsers(command){
  const raw=await command(['GET',TARGET_KEYS.users]);
  const users=raw?normalizeUsers(JSON.parse(raw)||{}):{};userSnapshots.set(users,raw||'');return users;
}
export async function writeUsers(command,users){const expected=userSnapshots.get(users);if(expected===undefined)throw new Error('USERS_SNAPSHOT_REQUIRED');const result=await command(['EVAL',USERS_CAS_LUA,'1',TARGET_KEYS.users,expected,JSON.stringify(users||{})]);if(Number(result)!==1)throw new Error('MEMBERS_CHANGED_RETRY');}
export async function getUser(command,id){const users=await readUsers(command);return users[text(id,24)]||null;}
export async function listUsers(command){return Object.values(await readUsers(command)).map(publicUser).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));}
export async function updateUserRole(command,targetId,nextRole,actorId){
  const users=await readUsers(command),id=text(targetId,24),actor=text(actorId,24),user=users[id],role=nextRole==='admin'?'admin':nextRole==='member'?'member':'';
  if(!user)return {ok:false,error:'USER_NOT_FOUND'};
  if(!role)return {ok:false,error:'INVALID_ROLE'};
  if(id===actor&&user.role==='admin'&&role!=='admin')return {ok:false,error:'SELF_ADMIN_DEMOTION_FORBIDDEN'};
  if(user.role==='admin'&&role!=='admin'&&Object.values(users).filter(row=>row.role==='admin').length<=1)return {ok:false,error:'LAST_ADMIN_DEMOTION_FORBIDDEN'};
  const previousRole=user.role||'member';user.role=role;user.sessionVersion=nextSessionVersion(user);user.updatedAt=now();user.roleAudit={previousRole,changedBy:actor,changedAt:user.updatedAt};users[id]=user;await writeUsers(command,users);return {ok:true,user:publicUser(user)};
}
export async function updateUserByAdmin(command,input={},actorId=''){
  const originalRaw=await command(['GET',TARGET_KEYS.users])||'',users=originalRaw?normalizeUsers(JSON.parse(originalRaw)):{},id=text(input.id,24),actor=text(actorId,24),user=users[id];
  userSnapshots.set(users,originalRaw);
  if(!user)return {ok:false,error:'USER_NOT_FOUND'};
  const nextId=text(input.nextId||id,24);
  if(!validUserId(nextId))return {ok:false,error:'INVALID_ID'};
  if(nextId!==id&&users[nextId])return {ok:false,error:'DUPLICATE_ID'};
  const nextRole=input.role===undefined?(user.role||'member'):input.role;
  const nextStatus=input.status===undefined?(user.status||'active'):input.status;
  if(!['admin','member'].includes(nextRole))return {ok:false,error:'INVALID_ROLE'};
  if(!['active','suspended'].includes(nextStatus))return {ok:false,error:'INVALID_STATUS'};
  const removesAdmin=user.role==='admin'&&(nextRole!=='admin'||nextStatus!=='active');
  if(id===actor&&removesAdmin)return {ok:false,error:'SELF_ADMIN_CHANGE_FORBIDDEN'};
  if(removesAdmin&&Object.values(users).filter(row=>row.role==='admin'&&row.status!=='suspended').length<=1)return {ok:false,error:'LAST_ADMIN_CHANGE_FORBIDDEN'};
  for(const [key,max] of ADMIN_USER_FIELDS)if(input[key]!==undefined)user[key]=text(input[key],max);
  const identityChanged=nextId!==id||nextRole!==(user.role||'member')||nextStatus!==(user.status||'active');
  user.id=nextId;user.role=nextRole;user.status=nextStatus;
  user.region=[user.regionProvince,user.regionCity,user.regionDistrict].filter(Boolean).join(' ');
  user.updatedAt=now();
  if(identityChanged)user.sessionVersion=nextSessionVersion(user);
  user.adminAudit={action:'PROFILE_UPDATE',changedBy:actor,changedAt:user.updatedAt,previousId:id};
  delete users[id];users[nextId]=user;
  if(nextId!==id){
    const renamed=await commitReferral(command,null,'',{originalRaw,users,id,nextId});if(!renamed.ok)return renamed;
    Object.assign(user,renamed.user);
    const previousActivity=await command(['GET',TARGET_KEYS.activity(id)]);
    if(previousActivity!==null&&previousActivity!==undefined){
      await command(['SET',TARGET_KEYS.activity(nextId),previousActivity]);
      await command(['DEL',TARGET_KEYS.activity(id)]);
    }
    for(const domain of ['columns','news','community','itsme','comments','polls','generation','nationalEvaluation']){
      const current=await readDomain(command,domain,null);
      if(!current)continue;
      let changed=false;
      const replaceOwner=row=>{
        if(!row||typeof row!=='object')return row;
        const copy={...row};
        for(const key of ['ownerId','userId','authorId'])if(copy[key]===id){copy[key]=nextId;changed=true;}
        return copy;
      };
      const updated=Array.isArray(current)?current.map(replaceOwner):Array.isArray(current.items)?{...current,items:current.items.map(replaceOwner)}:current;
      if(changed)await writeDomain(command,domain,updated);
    }
  }
  if(nextId===id)await writeUsers(command,users);
  return {ok:true,user:publicUser(user)};
}
export async function resetUserPassword(command,input={},actorId=''){
  const users=await readUsers(command),id=text(input.id,24),user=users[id],temporaryPassword=String(input.temporaryPassword||'');
  if(!user)return {ok:false,error:'USER_NOT_FOUND'};
  if(temporaryPassword.length<8)return {ok:false,error:'WEAK_PASSWORD'};
  user.passwordHash=hashPassword(temporaryPassword);delete user.hash;delete user.passwordDigest;delete user.password;
  user.mustChangePassword=true;user.sessionVersion=nextSessionVersion(user);user.updatedAt=now();
  user.passwordAudit={action:'ADMIN_RESET',changedBy:text(actorId,24),changedAt:user.updatedAt};
  users[id]=user;await writeUsers(command,users);return {ok:true,user:publicUser(user)};
}
export async function completeRequiredPasswordChange(command,id,nextPassword){
  const users=await readUsers(command),key=text(id,24),user=users[key],password=String(nextPassword||'');
  if(!user)return {ok:false,error:'USER_NOT_FOUND'};
  if(password.length<8)return {ok:false,error:'WEAK_PASSWORD'};
  user.passwordHash=hashPassword(password);delete user.hash;delete user.passwordDigest;delete user.password;
  user.mustChangePassword=false;user.sessionVersion=nextSessionVersion(user);user.updatedAt=now();
  users[key]=user;await writeUsers(command,users);return {ok:true,user:publicUser(user)};
}
export async function registerUser(command,input={}){
  const id=text(input.id,24), password=String(input.password||''),name=text(input.name,40),nickname=text(input.nickname,40),email=text(input.email,120),birthYear=text(input.birthYear,4),regionProvince=text(input.regionProvince,40),regionCity=text(input.regionCity||input.regionDistrict,40),regionDistrict=text(input.regionDistrict&&input.regionCity?input.regionDistrict:'',40),phone=normalizeRegistrationPhone(input.phoneDigits||input.phone),currentYear=new Date().getFullYear();
  if(!/^[a-zA-Z0-9._-]{4,24}$/.test(id))return {ok:false,error:'INVALID_ID'};
  if(password.length<8)return {ok:false,error:'WEAK_PASSWORD'};
  if(!name||!nickname||!email||!birthYear||!regionProvince||!regionCity)return {ok:false,error:'REQUIRED_PROFILE_FIELDS'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,error:'INVALID_EMAIL'};
  if(!phone)return {ok:false,error:'INVALID_PHONE'};
  if(!/^\d{4}$/.test(birthYear)||Number(birthYear)<1900||Number(birthYear)>currentYear)return {ok:false,error:'INVALID_BIRTH_YEAR'};
  if(!validRegion(regionProvince,regionCity,regionDistrict))return {ok:false,error:'INVALID_REGION'};
  const referrerCode=text(input.referrerCode,16);if(referrerCode&&!/^[1-9][0-9]*$/.test(referrerCode))return {ok:false,error:'INVALID_REFERRER'};
  const users=await readUsers(command); if(users[id])return {ok:false,error:'DUPLICATE_ID'};
  const user={id,name,nickname,email,phone,birthYear,regionProvince,regionCity,regionDistrict,region:[regionProvince,regionCity,regionDistrict].filter(Boolean).join(' '),preferredParty:text(input.preferredParty,80),role:'member',status:'active',passwordHash:hashPassword(password),sessionVersion:0,mustChangePassword:false,createdAt:now(),updatedAt:now()};
  const result=await commitReferral(command,user,referrerCode);return result.ok?{ok:true,user:publicUser(result.user)}:result;
}
export async function authenticateUser(command,id,password){
  const login=text(id,120),users=await readUsers(command),loginLower=login.toLowerCase();
  const matches=Object.entries(users).filter(([key,user])=>[key,user.id,user.userId,user.username,user.loginId,user.email].some(value=>String(value||'').trim().toLowerCase()===loginLower));
  if(matches.length!==1)return null;
  const [key,user]=matches[0],stored=String(user.passwordHash||user.hash||user.passwordDigest||'').trim();
  if(user.status==='suspended'||!verifyPasswordHash(password,stored))return null;
  if(passwordHashKind(stored)!=='scrypt'){
    user.passwordHash=hashPassword(password);delete user.hash;delete user.passwordDigest;delete user.password;user.updatedAt=now();users[key]=user;await writeUsers(command,users);
  }
  return publicUser(user);
}
export async function updateProfile(command,id,patch={}){const users=await readUsers(command);const key=text(id,24),user=users[key];if(!user)return {ok:false,error:'USER_NOT_FOUND'};if(['regionProvince','regionCity','regionDistrict'].some(key=>patch[key]!==undefined)&&!validRegion(text(patch.regionProvince??user.regionProvince,40),text(patch.regionCity??user.regionCity,40),text(patch.regionDistrict??user.regionDistrict,40)))return {ok:false,error:'INVALID_REGION'};for(const [k,max] of [['name',40],['nickname',40],['email',120],['phone',40],['birthYear',4],['regionProvince',40],['regionCity',40],['regionDistrict',40],['preferredParty',80]])if(patch[k]!==undefined)user[k]=text(patch[k],max);user.region=[user.regionProvince,user.regionCity,user.regionDistrict].filter(Boolean).join(' ');user.updatedAt=now();users[key]=user;await writeUsers(command,users);return {ok:true,user:publicUser(user)};}

export async function readDomain(command,domain,fallback=null){const raw=await command(['GET',TARGET_KEYS.content(domain)]);if(!raw)return clone(fallback);try{return JSON.parse(raw);}catch{return clone(fallback);}}
export async function readDomainWithViews(command,domain,fallback=null){const data=await readDomain(command,domain,fallback),items=Array.isArray(data?.items)?data.items:[];if(!items.length||!['columns','community','itsme','news'].includes(String(domain||'')))return data;const counts=await command(['MGET',...items.map(item=>TARGET_KEYS.viewCount(domain,item.id))]);return {...data,items:items.map((item,index)=>({...item,views:Number(item.views||0)+Number(counts?.[index]||0)}))};}
export async function writeDomain(command,domain,data){await command(['SET',TARGET_KEYS.content(domain),JSON.stringify(data)]);return data;}
const emptyActivity=()=>({favorites:[],recentPeople:[],viewedPosts:[],likedPosts:[],pollVotes:{},generationVotes:{},nationalEvaluationVotes:{},academyApplications:[],grantedBadges:[],automaticBadges:[],representativeBadge:'',showcaseBadges:[],badgeEvents:{},badgeSignals:{events:[]}});
export async function readActivity(command,userId){const raw=await command(['GET',TARGET_KEYS.activity(userId)]);if(!raw)return emptyActivity();try{return {...emptyActivity(),...(JSON.parse(raw)||{})};}catch{return emptyActivity();}}
export async function writeActivity(command,userId,data){const next={...(data||{}),updatedAt:now()};await command(['SET',TARGET_KEYS.activity(userId),JSON.stringify(next)]);return next;}

export const REFERRAL_KEY='jcsr2:referrals:v1';
export const REFERRAL_COMMIT_LUA=`-- JCS_REFERRAL_COMMIT_V1
local raw=redis.call('GET',KEYS[1]) or ''
if raw~=ARGV[1] then return cjson.encode({ok=false,error='RETRY'}) end
local stored=redis.call('GET',KEYS[2])
local registry=stored and cjson.decode(stored) or {next=0,byUser={},byCode={},referrers={}}
local legacy=cjson.decode(ARGV[2])
for _,row in ipairs(legacy) do
 if not registry.byUser[row.id] then registry.next=registry.next+1;local code=tostring(registry.next);registry.byUser[row.id]=code;registry.byCode[code]=row.id end
end
local operation=ARGV[3]
if operation=='rename' then
 local users=cjson.decode(ARGV[5]);local oldId=ARGV[7];local newId=ARGV[8]
 if registry.byUser[newId] then return cjson.encode({ok=false,error='DUPLICATE_ID'}) end
 local code=registry.byUser[oldId];registry.byUser[newId]=code;registry.byCode[code]=newId
 if registry.referrers[oldId] then registry.referrers[newId]=registry.referrers[oldId];registry.referrers[oldId]=nil end
 for key,value in pairs(registry.referrers) do if value==oldId then registry.referrers[key]=newId end end
 for _,row in pairs(users) do if row.referredBy==oldId then row.referredBy=newId end end
 users[newId].referralCode=code
 redis.call('SET',KEYS[1],cjson.encode(users));redis.call('SET',KEYS[2],cjson.encode(registry))
 return cjson.encode({ok=true,user=users[newId]})
end
if operation=='register' then
 local user=cjson.decode(ARGV[4]);local users=cjson.decode(ARGV[5]);local ref=ARGV[6]
 if users[user.id] or registry.byUser[user.id] then return cjson.encode({ok=false,error='DUPLICATE_ID'}) end
 local referrer=registry.byCode[ref]
 if ref~='' and (not referrer or not users[referrer] or users[referrer].status=='deleted' or users[referrer].status=='blocked' or users[referrer].status=='suspended') then return cjson.encode({ok=false,error='INVALID_REFERRER'}) end
 if referrer==user.id then return cjson.encode({ok=false,error='SELF_REFERRAL'}) end
 registry.next=registry.next+1;local code=tostring(registry.next);registry.byUser[user.id]=code;registry.byCode[code]=user.id
 if referrer then registry.referrers[user.id]=referrer end
 user.referralCode=code;user.referredBy=referrer;users[user.id]=user
 redis.call('SET',KEYS[1],cjson.encode(users));redis.call('SET',KEYS[2],cjson.encode(registry))
 return cjson.encode({ok=true,user=user})
end
redis.call('SET',KEYS[2],cjson.encode(registry));return cjson.encode({ok=true,registry=registry})`;
export function referralOrder(users){return Object.values(users).sort((a,b)=>{const da=Date.parse(a.createdAt),db=Date.parse(b.createdAt);return (Number.isFinite(da)?da:Number.MAX_SAFE_INTEGER)-(Number.isFinite(db)?db:Number.MAX_SAFE_INTEGER)||String(a.id).localeCompare(String(b.id));}).map(user=>({id:String(user.id)}));}
export async function commitReferral(command,user=null,referrerCode='',rename=null){
 for(let attempt=0;attempt<8;attempt++){
  const raw=rename?rename.originalRaw:(await command(['GET',TARGET_KEYS.users])||''),users=raw?normalizeUsers(JSON.parse(raw)):{};
  const value=await command(['EVAL',REFERRAL_COMMIT_LUA,'2',TARGET_KEYS.users,REFERRAL_KEY,raw,JSON.stringify(referralOrder(users)),rename?'rename':user?'register':'ensure',JSON.stringify(user||{}),JSON.stringify(rename?.users||users),String(referrerCode||''),rename?.id||'',rename?.nextId||'']);
  const result=typeof value==='string'?JSON.parse(value):value;if(result.error==='RETRY'){if(rename)return {ok:false,error:'MEMBERS_CHANGED_RETRY'};continue;}return result;
 }
 return {ok:false,error:'REGISTRATION_BUSY'};
}
export async function referralProfile(command,user){
 if(!user)return null;
 let raw=await command(['GET',REFERRAL_KEY]),registry=raw?JSON.parse(raw):null;
 if(!registry?.byUser?.[user.id]){const result=await commitReferral(command);if(!result.ok)throw new Error(result.error);registry=result.registry;}
 return {...user,referralCode:registry.byUser[user.id],referralCount:Object.values(registry.referrers||{}).filter(id=>id===user.id).length};
}
