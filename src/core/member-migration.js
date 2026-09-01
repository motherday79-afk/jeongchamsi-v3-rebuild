const text=v=>String(v??'').trim();
export function normalizeLegacyMembers(input=[]){
  return (Array.isArray(input)?input:[]).map(row=>({
    id:text(row?.id||row?.userId||row?.username||row?.loginId),
    nickname:text(row?.nickname||row?.displayName||row?.name||row?.id||row?.userId),
    email:text(row?.email),
    role:row?.role==='admin'?'admin':'member',
    createdAt:text(row?.createdAt||row?.joinedAt),
    profile:row?.profile&&typeof row.profile==='object'?row.profile:{},
    passwordHash:text(row?.passwordHash||row?.hash||row?.passwordDigest)
  })).filter(x=>x.id);
}
export async function importLegacyMembers(auth,input=[]){return auth.importMembers(normalizeLegacyMembers(input));}
