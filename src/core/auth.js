const clean=v=>String(v??'').trim();
const publicUser=u=>u?({id:u.id,nickname:u.nickname||u.id,role:u.role||'member',email:u.email||'',createdAt:u.createdAt||'',profile:u.profile||{}}):null;
async function digest(value){
  const bytes=new TextEncoder().encode(String(value));
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createAuthService(store){
  const membersKey='members'; const sessionKey='session';
  return {
    async register(input={}){
      const id=clean(input.id); const password=String(input.password||''); const nickname=clean(input.nickname)||id;
      if(id.length<3)return {ok:false,error:'ID_TOO_SHORT'}; if(password.length<6)return {ok:false,error:'PASSWORD_TOO_SHORT'};
      const members=await store.get(membersKey,{}); if(members[id])return {ok:false,error:'ID_EXISTS'};
      const user={id,nickname,email:clean(input.email),role:'member',passwordHash:await digest(password),createdAt:new Date().toISOString(),profile:{}};
      members[id]=user; await store.set(membersKey,members); await store.set(sessionKey,{userId:id}); return {ok:true,user:publicUser(user)};
    },
    async login(input={}){
      const id=clean(input.id); const members=await store.get(membersKey,{}); const user=members[id];
      if(!user||!user.passwordHash||user.passwordHash!==await digest(String(input.password||'')))return {ok:false,error:'INVALID_LOGIN'};
      await store.set(sessionKey,{userId:id}); return {ok:true,user:publicUser(user)};
    },
    async logout(){await store.remove(sessionKey);return {ok:true};},
    async session(){const s=await store.get(sessionKey,null);if(!s?.userId)return {authenticated:false,user:null};const u=await this.getMember(s.userId);return {authenticated:!!u,user:u};},
    async getMember(id){const members=await store.get(membersKey,{});return publicUser(members[clean(id)]||null);},
    async updateProfile(patch={}){const s=await store.get(sessionKey,null);if(!s?.userId)return {ok:false,error:'LOGIN_REQUIRED'};const members=await store.get(membersKey,{});const u=members[s.userId];if(!u)return {ok:false,error:'USER_NOT_FOUND'};u.nickname=clean(patch.nickname)||u.nickname;u.email=clean(patch.email)||u.email;u.profile={...(u.profile||{}),...(patch.profile||{})};await store.set(membersKey,members);return {ok:true,user:publicUser(u)};},
    async importMembers(rows=[]){const members=await store.get(membersKey,{});let imported=0,skipped=0;for(const row of Array.isArray(rows)?rows:[]){const id=clean(row?.id);if(!id||members[id]){skipped++;continue;}members[id]={id,nickname:clean(row.nickname)||id,email:clean(row.email),role:row.role==='admin'?'admin':'member',createdAt:row.createdAt||new Date().toISOString(),profile:row.profile||{},passwordHash:row.passwordHash||''};imported++;}await store.set(membersKey,members);return {ok:true,imported,skipped};},
    async exportMembers(){const members=await store.get(membersKey,{});return Object.values(members).map(publicUser);}
  };
}
