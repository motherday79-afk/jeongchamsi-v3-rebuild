const PUBLIC_COMPARE=['id','snapshot','mode','rank','signal','core','activity','media','sources'];
const MEMBER_COMPARE=[...PUBLIC_COMPARE,'audience','cohorts','transition','diagnosis','issues','risks','opportunities','conclusion'];
const PUBLIC_DETAIL=['id','snapshot','algorithmVersion','interpretationLabel','mode','rank','currentRole','signal','core','audience','activity','media','transition','diagnosis','activities','achievements','policies','news','sources','related'];
const MEMBER_DETAIL=[...PUBLIC_DETAIL,'cohorts','issues','risks','opportunities','conclusion'];

function select(report,keys){
  const result={};
  for(const key of keys)if(Object.prototype.hasOwnProperty.call(report,key))result[key]=report[key];
  return result;
}

export function accessTierForUser(user){
  if(user?.role==='admin')return 'admin';
  return user?'member':'public';
}

export function projectIntelligence(report,tier='public',scope='detail'){
  if(!report||typeof report!=='object')return null;
  const access=['public','member','admin'].includes(tier)?tier:'public';
  if(access==='admin')return report;
  if(scope==='compare')return select(report,access==='member'?MEMBER_COMPARE:PUBLIC_COMPARE);
  return select(report,access==='member'?MEMBER_DETAIL:PUBLIC_DETAIL);
}

