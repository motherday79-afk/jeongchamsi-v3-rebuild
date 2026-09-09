import { randomUUID } from 'node:crypto';
import { TARGET_KEYS } from './migration-service.js';

const DOMAINS=new Set(['community','itsme','columns','news']);
const camps=new Set(['progressive','conservative']);
const items=data=>Array.isArray(data?.items)?data.items:[];
const text=(v,n=200)=>String(v??'').trim().slice(0,n);
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const login=user=>{if(!user?.id)fail('LOGIN_REQUIRED',401);if(user.status==='suspended')fail('ACCOUNT_SUSPENDED',403);};
const manage=(user,post)=>user?.role==='admin'||(post.ownerId&&String(post.ownerId)===String(user?.id));
const validDomain=domain=>{if(!DOMAINS.has(domain))fail('WRITE_NOT_ALLOWED',403);};
const published=post=>post&&post.published!==false&&!post.deleted;
const pick=(data,id)=>items(data).find(x=>String(x.id)===String(id)&&published(x));
export const COMMUNITY_CAS_LUA=`-- JCS_COMMUNITY_CAS_V1
local n=#KEYS
for i=1,n do if (redis.call('GET',KEYS[i]) or '')~=ARGV[i] then return 0 end end
local writes={}
for i=1,n do if ARGV[i]~=ARGV[n+i] then table.insert(writes,KEYS[i]);table.insert(writes,ARGV[n+i]) end end
if #writes>0 then redis.call('MSET',unpack(writes)) end
return 1`;
export function communityStats(posts=[],comments=[]){
  const roots=new Map(posts.filter(p=>published(p)&&p.cageEnabled&&!p.cageParentId).map(p=>[String(p.id),{posts:{progressive:0,conservative:0},comments:{progressive:0,conservative:0}}]));
  const postRoots=new Map();
  for(const p of posts){if(!published(p))continue;const root=p.cageParentId?String(p.cageParentId):p.cageEnabled?String(p.id):'';if(!roots.has(root))continue;postRoots.set(String(p.id),root);if(p.cageParentId&&camps.has(p.camp))roots.get(root).posts[p.camp]++;}
  for(const c of comments){if(!published(c)||c.domain!=='community'||!camps.has(c.camp))continue;const root=postRoots.get(String(c.postId));if(root)roots.get(root).comments[c.camp]++;}
  return Object.fromEntries(roots);
}
export function createCommunityService({command,now=()=>new Date().toISOString(),makeId=()=>randomUUID()}={}){
  async function mutate(keys,change){
    for(let attempt=0;attempt<8;attempt++){
      const raw=await Promise.all(keys.map(key=>command(['GET',key]).then(v=>v||'')));
      const data=raw.map(value=>{if(!value)return {items:[]};try{const parsed=JSON.parse(value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail('CONTENT_STORAGE_INVALID',503);if(Object.hasOwn(parsed,'items')&&!Array.isArray(parsed.items))fail('CONTENT_STORAGE_INVALID',503);return parsed;}catch{fail('CONTENT_STORAGE_INVALID',503);}});
      const result=change(data),next=data.map(JSON.stringify);
      const committed=await command(['EVAL',COMMUNITY_CAS_LUA,String(keys.length),...keys,...raw,...next]);
      if(Number(committed)===1)return result;
    }
    fail('CONTENT_CHANGED_RETRY',409);
  }
  function fields(input){const safe={};for(const [key,max] of Object.entries({title:200,body:20000,summary:500,category:80,coverImage:1000}))if(Object.hasOwn(input,key))safe[key]=text(input[key],max);return safe;}
  function pin(post,domain,input,user){
    if(!Object.hasOwn(input,'pinKind'))return;
    if(user.role!=='admin'||domain!=='community'||post.cageParentId)fail('PIN_FORBIDDEN',403);
    if(!['','notice','cage'].includes(input.pinKind))fail('PIN_INVALID');
    // Discussion identity survives unpinning; comments and contribution history remain attached.
    post.pinKind=input.pinKind;if(input.pinKind==='cage')post.cageEnabled=true;
  }
  function parentCheck(data,post){if(post.cageParentId){const root=pick(data,post.cageParentId);if(!root?.cageEnabled||root.cageParentId)fail('CAGE_NOT_FOUND',404);}}
  function commentFor(data,postId,domain,id){const c=items(data).find(x=>String(x.id)===String(id)&&String(x.postId)===String(postId)&&x.domain===domain&&published(x));if(!c)fail('COMMENT_NOT_FOUND',404);return c;}
  const key=d=>TARGET_KEYS.content(d);
  return {
    async createPost(domain,input={},user){login(user);validDomain(domain);if(['columns','news'].includes(domain)&&!['admin','partner'].includes(user.role))fail('EDITOR_WRITE_FORBIDDEN',403);
      if(!text(input.title))fail('TITLE_REQUIRED');
      return mutate([key(domain)],([data])=>{const post=fields(input);if(input.cageParentId){if(domain!=='community')fail('CAGE_NOT_FOUND',404);post.cageParentId=text(input.cageParentId,160);parentCheck(data,post);if(!camps.has(input.camp))fail('CAMP_REQUIRED');post.camp=input.camp;}pin(post,domain,input,user);Object.assign(post,{id:`${domain}-${makeId()}`,ownerId:user.id,author:text(user.nickname||user.id,40),published:true,likes:0,views:0,createdAt:now(),updatedAt:now()});data.items=[post,...items(data)];return post;});
    },
    async editPost(domain,id,input={},user){login(user);validDomain(domain);return mutate([key(domain)],([data])=>{const post=pick(data,id);if(!post)fail('POST_NOT_FOUND',404);if(!manage(user,post))fail('POST_EDIT_FORBIDDEN',403);if(Object.hasOwn(input,'title')&&!text(input.title))fail('TITLE_REQUIRED');for(const k of ['camp','cageParentId'])if(Object.hasOwn(input,k)&&input[k]!==post[k])fail('CAMP_IMMUTABLE');pin(post,domain,input,user);Object.assign(post,fields(input),{updatedAt:now()});return post;});},
    async deletePost(domain,id,user){login(user);validDomain(domain);return mutate([key(domain),key('comments')],([data,comments])=>{const post=pick(data,id);if(!post)fail('POST_NOT_FOUND',404);if(!manage(user,post))fail('POST_EDIT_FORBIDDEN',403);const removed=new Set([String(id),...items(data).filter(x=>String(x.cageParentId||'')===String(id)).map(x=>String(x.id))]);data.items=items(data).filter(x=>!removed.has(String(x.id)));comments.items=items(comments).filter(x=>x.domain!==domain||!removed.has(String(x.postId)));return {ok:true,parentId:post.cageParentId||''};});},
    async addComment(domain,postId,input={},user){login(user);validDomain(domain);if(!text(input.text,1000))fail('INVALID_COMMENT');return mutate([key(domain),key('comments')],([posts,data])=>{const post=pick(posts,postId);if(!post)fail('POST_NOT_FOUND',404);parentCheck(posts,post);if((post.cageEnabled||post.cageParentId)&&!camps.has(input.camp))fail('CAMP_REQUIRED');let parentId='';if(input.parentId){const parent=items(data).find(x=>String(x.id)===String(input.parentId)&&x.domain===domain&&String(x.postId)===String(postId)&&published(x));if(!parent)fail('COMMENT_PARENT_INVALID');parentId=parent.parentId||parent.id;}const c={id:`comment-${makeId()}`,domain,postId:String(postId),ownerId:user.id,author:text(user.nickname||user.id,40),text:text(input.text,1000),createdAt:now(),published:true,...(parentId?{parentId}:{}),...((post.cageEnabled||post.cageParentId)?{camp:input.camp}:{})};data.items=[...items(data),c];return c;});},
    async editComment(domain,postId,id,value,user){login(user);validDomain(domain);if(!text(value,1000))fail('INVALID_COMMENT');return mutate([key(domain),key('comments')],([posts,data])=>{if(!pick(posts,postId))fail('POST_NOT_FOUND',404);const c=commentFor(data,postId,domain,id);if(!manage(user,c))fail('COMMENT_EDIT_FORBIDDEN',403);c.text=text(value,1000);c.updatedAt=now();return c;});},
    async deleteComment(domain,postId,id,user){login(user);validDomain(domain);return mutate([key(domain),key('comments')],([posts,data])=>{if(!pick(posts,postId))fail('POST_NOT_FOUND',404);const c=commentFor(data,postId,domain,id);if(!manage(user,c))fail('COMMENT_EDIT_FORBIDDEN',403);if(items(data).some(x=>String(x.parentId)===String(id)&&published(x))){c.text='';c.deleted=true;c.likes=0;delete c.likedBy;}else data.items=items(data).filter(x=>String(x.id)!==String(id));return {ok:true};});},
    async likeComment(domain,postId,id,user){login(user);validDomain(domain);return mutate([key(domain),key('comments')],([posts,data])=>{if(!pick(posts,postId))fail('POST_NOT_FOUND',404);const c=commentFor(data,postId,domain,id),liked=new Set(c.likedBy||[]),active=!liked.has(user.id);active?liked.add(user.id):liked.delete(user.id);c.likedBy=[...liked];c.likes=liked.size;return {ok:true,active,likes:c.likes};});},
    async likePost(domain,postId,user){login(user);validDomain(domain);return mutate([key(domain),TARGET_KEYS.activity(user.id)],([data,activity])=>{const post=pick(data,postId);if(!post)fail('POST_NOT_FOUND',404);parentCheck(data,post);const k=`${domain}:${postId}`,states=Object.assign(Object.create(null),post.likeStates&&typeof post.likeStates==='object'?post.likeStates:{}),was=Object.hasOwn(states,user.id)?states[user.id]===true:(activity.likedPosts||[]).includes(k),active=!was;states[user.id]=active;post.likeStates=states;post.likes=Math.max(0,Number(post.likes||0)+(active?1:-1));return {ok:true,active,likes:post.likes};});}
  };
}
