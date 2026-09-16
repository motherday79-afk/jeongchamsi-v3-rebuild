const camps=new Set(['progressive','conservative']);

export function cageComposeRoute(id,camp){
 return id!=null&&String(id)&&camps.has(camp)?`/community/${encodeURIComponent(String(id))}?camp=${camp}&compose=1`:'';
}

// Only an explicit, valid entry opens the writer. Ordinary detail links stay unchanged.
export function cageEntry(url,itemId){
 const match=String(url||'').match(/^\/community\/([^/?#]+)\?([^#]*)$/);
 if(!match)return null;
 const params=new URLSearchParams(match[2]),camp=params.get('camp');
 if(params.get('compose')!=='1'||!camps.has(camp))return null;
 let id;try{id=decodeURIComponent(match[1]);}catch{return null;}
 if(!id||itemId!=null&&id!==String(itemId))return null;
 return {id,camp,route:cageComposeRoute(id,camp)};
}

export function cageLoginReturn(url){
 const match=String(url||'').match(/^\/login\?([^#]*)$/);
 return match?cageEntry(new URLSearchParams(match[1]).get('next'))?.route||'':'';
}

export function isCageClosed(item,now=Date.now()){
 const end=Number(item?.cageEndsAt);
 return Number.isFinite(end)&&end>0&&now>=end;
}

export async function cageOpinionCompletion({result,data,onCageFeedback,onRouteState,onActivityFeedback,onRender}={}){
 if(!result?.ok||!data?.cageParentId)return null;
 const feedback={rootId:data.cageParentId,camp:data.camp};
 onCageFeedback?.(feedback);
 onRouteState?.({page:1,mode:'posts',camp:null,compose:null});
 onActivityFeedback?.(result);
 await onRender?.();
 return feedback;
}
