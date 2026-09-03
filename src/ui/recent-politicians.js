const STORAGE_KEY='jcs:recent-politicians:v1';

const text=value=>String(value??'').trim();

function compact(item){
  const id=text(item?.id),name=text(item?.name);
  if(!id||!name)return null;
  const record={id,name,party:text(item?.party),office:text(item?.office)};
  const localPath=text(item?.photo?.localPath),focus=text(item?.photo?.focus);
  if(localPath)record.photo={localPath,focus:focus||'50% 28%'};
  return record;
}

export function updateRecentPoliticians(current,item,limit=4){
  const next=compact(item);if(!next)return (Array.isArray(current)?current:[]).map(compact).filter(Boolean).slice(0,limit);
  return [next,...(Array.isArray(current)?current:[]).map(compact).filter(entry=>entry&&entry.id!==next.id)].slice(0,limit);
}

export function loadRecentPoliticians(storage=globalThis.localStorage){
  try{
    const parsed=JSON.parse(storage?.getItem(STORAGE_KEY)||'[]');
    return (Array.isArray(parsed)?parsed:[]).map(compact).filter(Boolean).slice(0,4);
  }catch{return [];}
}

export function saveRecentPoliticians(storage=globalThis.localStorage,items=[]){
  const safe=(Array.isArray(items)?items:[]).map(compact).filter(Boolean).slice(0,4);
  try{storage?.setItem(STORAGE_KEY,JSON.stringify(safe));}catch{}
  return safe;
}

export function recordRecentPolitician(root=globalThis.document,storage=globalThis.localStorage){
  const element=root?.querySelector?.('[data-recent-politician]');
  if(!element)return loadRecentPoliticians(storage);
  const data=element.dataset||{};
  const item={id:data.recentId,name:data.recentName,party:data.recentParty,office:data.recentOffice};
  if(data.recentPhoto)item.photo={localPath:data.recentPhoto,focus:data.recentFocus};
  return saveRecentPoliticians(storage,updateRecentPoliticians(loadRecentPoliticians(storage),item));
}
