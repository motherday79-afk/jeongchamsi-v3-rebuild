import { TARGET_KEYS } from './migration-service.js';
import { hashPassword, passwordHashKind, verifyPasswordHash } from './password.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const text=(v,max=500)=>String(v??'').trim().slice(0,max);
const now=()=>new Date().toISOString();

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
export async function registerUser(command,input={}){
  const id=text(input.id,24), password=String(input.password||'');
  if(!/^[a-zA-Z0-9._-]{4,24}$/.test(id))return {ok:false,error:'INVALID_ID'};
  if(password.length<8)return {ok:false,error:'WEAK_PASSWORD'};
  const users=await readUsers(command); if(users[id])return {ok:false,error:'DUPLICATE_ID'};
  const user={id,name:text(input.name,40),nickname:text(input.nickname||id,40)||id,email:text(input.email,120),phone:text(input.phone,40),birthYear:text(input.birthYear,4),regionProvince:text(input.regionProvince,40),regionCity:text(input.regionCity,40),regionDistrict:text(input.regionDistrict,40),region:text(input.region,80),preferredParty:text(input.preferredParty,80),role:'member',status:'active',passwordHash:hashPassword(password),createdAt:now(),updatedAt:now()};
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
export async function writeDomain(command,domain,data){await command(['SET',TARGET_KEYS.content(domain),JSON.stringify(data)]);return data;}
export async function readActivity(command,userId){const raw=await command(['GET',TARGET_KEYS.activity(userId)]);if(!raw)return {favorites:[],recentPeople:[],likedPosts:[],pollVotes:{},generationVotes:{},nationalEvaluationVotes:{},academyApplications:[],grantedBadges:[],representativeBadge:'',showcaseBadges:[],badgeEvents:{}};try{return JSON.parse(raw)||{};}catch{return {};}}
export async function writeActivity(command,userId,data){const next={...(data||{}),updatedAt:now()};await command(['SET',TARGET_KEYS.activity(userId),JSON.stringify(next)]);return next;}
