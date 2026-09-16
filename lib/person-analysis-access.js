export const PERSON_ANALYSIS_DURATION_MS=24*60*60*1000;

// This grant belongs to a member's wallet, independently of published snapshots.
export function personAnalysisAccess(wallet,personId,now=Date.now()){
 const grants=wallet?.analysisAccess;
 const grant=grants&&Object.hasOwn(grants,personId)?grants[personId]:null;
 const valid=grant?.personId===personId&&Number.isSafeInteger(grant.grantedAt)&&Number.isSafeInteger(grant.expiresAt)&&grant.expiresAt-grant.grantedAt===PERSON_ANALYSIS_DURATION_MS;
 return {personId,active:!!(valid&&grant.grantedAt<=now&&now<grant.expiresAt),grantedAt:valid?grant.grantedAt:null,expiresAt:valid?grant.expiresAt:null,serverNow:now};
}

export function grantPersonAnalysisAccess(wallet,personId,requestId,now){
 wallet.analysisAccess||={};
 // Expired entries are unnecessary once a new purchase is committed.
 for(const [id,grant] of Object.entries(wallet.analysisAccess))if(!Number.isSafeInteger(grant?.expiresAt)||grant.expiresAt<=now)delete wallet.analysisAccess[id];
 wallet.analysisAccess[personId]={personId,requestId,grantedAt:now,expiresAt:now+PERSON_ANALYSIS_DURATION_MS};
 return personAnalysisAccess(wallet,personId,now);
}

export async function readPersonAnalysisAccess(command,user,personId,now){
 if(!user?.id||user.status==='suspended')return personAnalysisAccess(null,personId,now??Date.now());
 const raw=await command(['GET','jcs:points:v1:wallet:'+user.id]);
 const wallet=raw?JSON.parse(raw):{};
 return personAnalysisAccess(wallet,personId,now??Date.now());
}

export function paidResultWithAccess(result,wallet,now){
 return {...result,analysisAccess:personAnalysisAccess(wallet,result.personId,now)};
}
