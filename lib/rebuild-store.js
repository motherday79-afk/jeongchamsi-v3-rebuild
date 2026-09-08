import { TARGET_KEYS } from './migration-service.js';
import { hashPassword, passwordHashKind, verifyPasswordHash } from './password.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const text=(v,max=500)=>String(v??'').trim().slice(0,max);
const now=()=>new Date().toISOString();
const validUserId=value=>/^[a-zA-Z0-9._-]{4,24}$/.test(String(value||''));
const nextSessionVersion=user=>(Number(user?.sessionVersion)||0)+1;
const ADMIN_USER_FIELDS=[['name',40],['nickname',40],['email',120],['phone',40],['birthYear',4],['regionProvince',40],['regionCity',40],['regionDistrict',40],['preferredParty',80]];

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
export async function readUsers(command){
  const raw=await command(['GET',TARGET_KEYS.users]);
  if(!raw)return {};
  try{return normalizeUsers(JSON.parse(raw)||{});}catch{return {};}
}
export async function writeUsers(command,users){await command(['SET',TARGET_KEYS.users,JSON.stringify(users||{})]);}
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
  const users=await readUsers(command),id=text(input.id,24),actor=text(actorId,24),user=users[id];
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
  await writeUsers(command,users);
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
  const id=text(input.id,24), password=String(input.password||'');
  if(!/^[a-zA-Z0-9._-]{4,24}$/.test(id))return {ok:false,error:'INVALID_ID'};
  if(password.length<8)return {ok:false,error:'WEAK_PASSWORD'};
  const users=await readUsers(command); if(users[id])return {ok:false,error:'DUPLICATE_ID'};
  const user={id,name:text(input.name,40),nickname:text(input.nickname||id,40)||id,email:text(input.email,120),phone:text(input.phone,40),birthYear:text(input.birthYear,4),regionProvince:text(input.regionProvince,40),regionCity:text(input.regionCity,40),regionDistrict:text(input.regionDistrict,40),region:text(input.region,80),preferredParty:text(input.preferredParty,80),role:'member',status:'active',passwordHash:hashPassword(password),sessionVersion:0,mustChangePassword:false,createdAt:now(),updatedAt:now()};
  users[id]=user;await writeUsers(command,users);return {ok:true,user:publicUser(user)};
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
export async function updateProfile(command,id,patch={}){const users=await readUsers(command);const key=text(id,24),user=users[key];if(!user)return {ok:false,error:'USER_NOT_FOUND'};for(const [k,max] of [['name',40],['nickname',40],['email',120],['phone',40],['birthYear',4],['regionProvince',40],['regionCity',40],['regionDistrict',40],['preferredParty',80]])if(patch[k]!==undefined)user[k]=text(patch[k],max);user.region=[user.regionProvince,user.regionCity,user.regionDistrict].filter(Boolean).join(' ');user.updatedAt=now();users[key]=user;await writeUsers(command,users);return {ok:true,user:publicUser(user)};}

export async function readDomain(command,domain,fallback=null){const raw=await command(['GET',TARGET_KEYS.content(domain)]);if(!raw)return clone(fallback);try{return JSON.parse(raw);}catch{return clone(fallback);}}
export async function readDomainWithViews(command,domain,fallback=null){const data=await readDomain(command,domain,fallback),items=Array.isArray(data?.items)?data.items:[];if(!items.length||!['columns','community','itsme','news'].includes(String(domain||'')))return data;const counts=await command(['MGET',...items.map(item=>TARGET_KEYS.viewCount(domain,item.id))]);return {...data,items:items.map((item,index)=>({...item,views:Number(item.views||0)+Number(counts?.[index]||0)}))};}
export async function writeDomain(command,domain,data){await command(['SET',TARGET_KEYS.content(domain),JSON.stringify(data)]);return data;}
const emptyActivity=()=>({favorites:[],recentPeople:[],viewedPosts:[],likedPosts:[],pollVotes:{},generationVotes:{},nationalEvaluationVotes:{},academyApplications:[],grantedBadges:[],automaticBadges:[],representativeBadge:'',showcaseBadges:[],badgeEvents:{},badgeSignals:{events:[]}});
export async function readActivity(command,userId){const raw=await command(['GET',TARGET_KEYS.activity(userId)]);if(!raw)return emptyActivity();try{return {...emptyActivity(),...(JSON.parse(raw)||{})};}catch{return emptyActivity();}}
export async function writeActivity(command,userId,data){const next={...(data||{}),updatedAt:now()};await command(['SET',TARGET_KEYS.activity(userId),JSON.stringify(next)]);return next;}
