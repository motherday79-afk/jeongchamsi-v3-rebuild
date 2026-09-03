const clean=v=>String(v??'').trim();
const publicUser=u=>u?({id:u.id,nickname:u.nickname||u.id,role:u.role||'member',email:u.email||'',createdAt:u.createdAt||'',profile:u.profile||{},name:u.name||'',phone:u.phone||'',birthYear:u.birthYear||'',regionProvince:u.regionProvince||'',regionCity:u.regionCity||'',regionDistrict:u.regionDistrict||'',region:u.region||'',preferredParty:u.preferredParty||''}):null;
async function digest(value){const bytes=new TextEncoder().encode(String(value));const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function request(path,options={}){const res=await fetch(`/api/v3/${path}`,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));if(!res.ok&&data?.ok!==false)data.ok=false;return {status:res.status,...data};}

function createRemoteAuthService(){
  return {
    async register(input={}){return request('user/register',{method:'POST',body:JSON.stringify(input)});},
    async login(input={}){return request('user/login',{method:'POST',body:JSON.stringify(input)});},
    async logout(){return request('user/logout',{method:'POST',body:'{}'});},
    async session(){const x=await request('user/session');return x.status===200?{authenticated:!!x.authenticated,user:x.user||null}:{authenticated:false,user:null,error:x.error};},
    async updateProfile(patch={}){return request('user/profile',{method:'POST',body:JSON.stringify(patch)});},
    async badgeStatus(){const x=await request('user/badges');return x.ok?x.status:null;},
    async setRepresentativeBadge(badgeKey){return request('action',{method:'POST',body:JSON.stringify({action:'badge-representative-set',payload:{badgeKey}})});},
    async toggleShowcaseBadge(badgeKey){return request('action',{method:'POST',body:JSON.stringify({action:'badge-showcase-toggle',payload:{badgeKey}})});},
    async recordBadgeVisit(){return request('action',{method:'POST',body:JSON.stringify({action:'badge-visit',payload:{}})});},
    async updateMemberBadges(id,grantedBadges){return request('admin/users',{method:'PATCH',body:JSON.stringify({id,grantedBadges})});},
    async exportMembers(){const x=await request('admin/users');return x.ok?x.users:[];},
    async adminSummary(){return request('admin/summary');},
    async intelligenceStatus(){return request('admin/intelligence/status');},
    async intelligenceCollectStart(){return request('admin/intelligence/collect/start',{method:'POST',body:'{}'});},
    async intelligenceCollectStep(){return request('admin/intelligence/collect/step',{method:'POST',body:'{}'});},
    async intelligencePreview(){return request('admin/intelligence/preview');},
    async intelligencePublishStart(){return request('admin/intelligence/publish/start',{method:'POST',body:'{}'});},
    async intelligencePublishStep(){return request('admin/intelligence/publish/step',{method:'POST',body:'{}'});},
    async migrationRun(secret){return request('migration/run',{method:'POST',headers:{'x-jcs-migration-secret':secret},body:JSON.stringify({})});},
    async politicianMigrationRun(secret){return request('migration/politicians/run',{method:'POST',headers:{'x-jcs-migration-secret':secret},body:JSON.stringify({})});},
    async politicianMigrationPreview(secret){return request('migration/politicians/preview',{headers:{'x-jcs-migration-secret':secret}});},
    async migrationStatus(secret){return request('migration/status',{headers:{'x-jcs-migration-secret':secret}});},
    async memberCount(){const x=await request('stats');return x.ok?Number(x.members||0):0;}
  };
}

function createLocalAuthService(store){
  const membersKey='members'; const sessionKey='session';
  return {
    async register(input={}){const id=clean(input.id);const password=String(input.password||'');const nickname=clean(input.nickname)||id;if(id.length<3)return {ok:false,error:'ID_TOO_SHORT'};if(password.length<6)return {ok:false,error:'PASSWORD_TOO_SHORT'};const members=await store.get(membersKey,{});if(members[id])return {ok:false,error:'ID_EXISTS'};const user={id,nickname,email:clean(input.email),role:'member',passwordHash:await digest(password),createdAt:new Date().toISOString(),profile:{}};members[id]=user;await store.set(membersKey,members);await store.set(sessionKey,{userId:id});return {ok:true,user:publicUser(user)};},
    async login(input={}){const id=clean(input.id);const members=await store.get(membersKey,{});const user=members[id];if(!user||!user.passwordHash||user.passwordHash!==await digest(String(input.password||'')))return {ok:false,error:'INVALID_LOGIN'};await store.set(sessionKey,{userId:id});return {ok:true,user:publicUser(user)};},
    async logout(){await store.remove(sessionKey);return {ok:true};},
    async session(){const s=await store.get(sessionKey,null);if(!s?.userId)return {authenticated:false,user:null};const u=await this.getMember(s.userId);return {authenticated:!!u,user:u};},
    async getMember(id){const members=await store.get(membersKey,{});return publicUser(members[clean(id)]||null);},
    async updateProfile(patch={}){const s=await store.get(sessionKey,null);if(!s?.userId)return {ok:false,error:'LOGIN_REQUIRED'};const members=await store.get(membersKey,{});const u=members[s.userId];if(!u)return {ok:false,error:'USER_NOT_FOUND'};u.nickname=clean(patch.nickname)||u.nickname;u.email=clean(patch.email)||u.email;u.profile={...(u.profile||{}),...(patch.profile||{})};await store.set(membersKey,members);return {ok:true,user:publicUser(u)};},
    async badgeStatus(){return {earnedBadges:[],eligibleBadges:[],grantedBadges:[],representativeBadge:'',showcaseBadges:[],progress:{}};},
    async setRepresentativeBadge(){return {ok:false,error:'REMOTE_ONLY'};},
    async toggleShowcaseBadge(){return {ok:false,error:'REMOTE_ONLY'};},
    async recordBadgeVisit(){return {ok:true};},
    async updateMemberBadges(){return {ok:false,error:'REMOTE_ONLY'};},
    async importMembers(rows=[]){const members=await store.get(membersKey,{});let imported=0,skipped=0;for(const row of Array.isArray(rows)?rows:[]){const id=clean(row?.id);if(!id||members[id]){skipped++;continue;}members[id]={id,nickname:clean(row.nickname)||id,email:clean(row.email),role:row.role==='admin'?'admin':'member',createdAt:row.createdAt||new Date().toISOString(),profile:row.profile||{},passwordHash:row.passwordHash||''};imported++;}await store.set(membersKey,members);return {ok:true,imported,skipped};},
    async exportMembers(){const members=await store.get(membersKey,{});return Object.values(members).map(publicUser);}
  };
}
export function createAuthService(store=null){return store?createLocalAuthService(store):createRemoteAuthService();}
