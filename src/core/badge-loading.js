const valid=status=>!!status&&typeof status==='object'&&Array.isArray(status.earnedBadges);
export async function loadBadgeStatus(auth){
 try{const result=await auth.recordBadgeVisit();if(result?.ok&&valid(result.status))return result.status;}catch{}
 // A failed attendance write must not hide an existing selection or administrator access.
 try{const status=await auth.badgeStatus();if(valid(status))return status;}catch{}
 return {loadError:true};
}
