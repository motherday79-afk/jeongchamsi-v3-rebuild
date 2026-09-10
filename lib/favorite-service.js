import { readActivity, writeActivity } from './rebuild-store.js';

const POST_DOMAINS=Object.freeze(['columns','news','community','itsme']);
const publicPost=({likeStates,likedBy,...post})=>post;
const clean=value=>String(value??'').trim();
const postRoute=domain=>domain==='columns'?'column':domain;

export function favoriteTargetKey(input={}){
  const kind=clean(input.kind),id=clean(input.id);
  if(kind==='person'&&id)return `person:${id}`;
  const domain=clean(input.domain);
  if(kind==='post'&&POST_DOMAINS.includes(domain)&&id)return `post:${domain}:${id}`;
  return '';
}

export function parseFavoriteTarget(key=''){
  const value=clean(key);
  if(value.startsWith('person:'))return {kind:'person',id:value.slice(7)};
  const match=value.match(/^post:(columns|news|community|itsme):(.+)$/);
  return match?{kind:'post',domain:match[1],id:match[2]}:null;
}

export function createFavoriteService({command,getPerson,getPost,listDomain}){
  if(typeof command!=='function')throw new Error('FAVORITE_STORAGE_REQUIRED');
  const validate=async target=>{
    if(target?.kind==='person'){
      const person=await getPerson?.(target.id);
      return person&&person.isVacant!==true?person:null;
    }
    if(target?.kind==='post'){
      const post=await getPost?.(target.domain,target.id);
      return post&&post.published!==false?post:null;
    }
    return null;
  };
  return {
    async toggle(user,input={}){
      if(!user?.id)return {ok:false,error:'LOGIN_REQUIRED'};
      const key=favoriteTargetKey(input),target=parseFavoriteTarget(key);
      if(!key||!await validate(target))return {ok:false,error:'FAVORITE_TARGET_NOT_FOUND'};
      const activity=await readActivity(command,user.id),favorites=new Set(Array.isArray(activity.favorites)?activity.favorites:[]),active=!favorites.has(key);
      active?favorites.add(key):favorites.delete(key);
      activity.favorites=[...favorites].slice(0,1000);
      await writeActivity(command,user.id,activity);
      return {ok:true,active,key};
    },
    async dashboard(user,{keysOnly=false,summaryOnly=false}={}){
      if(!user?.id)return {ok:false,error:'LOGIN_REQUIRED'};
      const activity=await readActivity(command,user.id),keys=[...new Set(Array.isArray(activity.favorites)?activity.favorites:[])],targets=keys.map(parseFavoriteTarget).filter(Boolean).reverse();
      if(keysOnly)return {ok:true,favoriteKeys:keys};
      const domainRows=await Promise.all(POST_DOMAINS.map(async domain=>[domain,await listDomain?.(domain)||[]]));
      const visible=new Map(domainRows.flatMap(([domain,rows])=>(Array.isArray(rows)?rows:[]).filter(p=>p?.published!==false&&!p.deleted).map(p=>[`${domain}:${p.id}`,{...publicPost(p),domain,route:postRoute(domain)}])));
      const favoritePeople=(await Promise.all(targets.filter(item=>item.kind==='person').map(item=>getPerson?.(item.id,{summaryOnly})))).filter(item=>item&&item.isVacant!==true);
      const favoritePosts=targets.filter(item=>item.kind==='post').map(item=>visible.get(`${item.domain}:${item.id}`)).filter(Boolean);
      const newest=(a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''));
      const authoredPosts=[...visible.values()].filter(p=>String(p.ownerId||'')===String(user.id)).sort(newest);
      const comments=await listDomain?.('comments')||[];
      const authoredComments=(Array.isArray(comments)?comments:[]).filter(c=>c.published!==false&&!c.deleted&&String(c.ownerId||'')===String(user.id)&&visible.has(`${c.domain}:${c.postId}`)).map(c=>({id:c.id,postId:c.postId,domain:c.domain,route:postRoute(c.domain),text:c.text,createdAt:c.createdAt,postTitle:visible.get(`${c.domain}:${c.postId}`).title})).sort(newest);
      if(summaryOnly)return {ok:true,counts:{favoritePeople:favoritePeople.length,favoritePosts:favoritePosts.length,authoredPosts:authoredPosts.length,authoredComments:authoredComments.length}};
      return {ok:true,favoriteKeys:keys,authoredPosts,authoredComments,favoritePosts,favoritePeople};
    }
  };
}
