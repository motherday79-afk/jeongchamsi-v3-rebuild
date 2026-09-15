import { renderGroupDirectory,renderGroupDetail,renderGroupCreate } from '../views/group-pages.js?v=0.0.31.172';
export async function loadGroupPage({parts=[],searchParams=new URLSearchParams(),session={},client}={}){
 const view=['browse','mine','manage'].includes(searchParams.get('view'))?searchParams.get('view'):'browse';
 const category=['politics','culture','social'].includes(searchParams.get('category'))?searchParams.get('category'):'all';
 const authenticated=session?.authenticated===true,admin=authenticated&&session.user?.role==='admin';
 if(parts[1]==='new')return renderGroupCreate(session);
 if(view==='mine'&&!authenticated)return renderGroupDirectory(null,session,view);
 if(view==='manage'&&!admin)return renderGroupDirectory({ok:true,items:[]},session,view);
 try{
  if(parts[1]){let result=await client.get(parts[1],{invite:searchParams.get('invite')||''});if(result.ok&&result.item?.status==='approved'&&result.item?.unread===true&&result.item?.viewer?.canWrite===true&&!result.item?.isExample){const read=await client.save({id:result.item.id,version:result.item.version,operation:'read',input:{},invite:searchParams.get('invite')||''});if(read.ok)result=read;}if(result.ok)return renderGroupDetail(result.item,session,searchParams.get('tab')||'posts',searchParams.get('galleryPage')||1,searchParams.get('invite')||'');if(result.error==='GROUP_NOT_FOUND'||result.status===404)return renderGroupDetail(null,session);return renderGroupDirectory({ok:false,error:'그룹을 불러오지 못했습니다.'},session);}
  const options={view,category,q:searchParams.get('q')||'',page:searchParams.get('page')||1};const result=await client.list(options);return renderGroupDirectory(result,session,view,category,options.q);
 }catch{return renderGroupDirectory({ok:false,error:'잠시 후 다시 시도해 주세요.'},session,view);}
}

// Only return to this feature after login; never accept an external redirect.
export function groupLoginReturn(route=''){
 try{
  const login=new URL(route,'https://jcs.invalid');if(login.pathname!=='/login')return '';
  const raw=login.searchParams.get('return');if(!raw||raw.length>1200||!raw.startsWith('/groups'))return '';
  const target=new URL(raw,'https://jcs.invalid');
  if(target.origin!=='https://jcs.invalid'||!/^\/groups(?:\/[a-zA-Z0-9_-]{1,100})?$/.test(target.pathname))return '';
  return target.pathname+target.search;
 }catch{return '';}
}
