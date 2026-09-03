import { readActivity, writeActivity, readDomainWithViews } from './rebuild-store.js';
import { computeBadgeMetrics, evaluateBadgeRules, VALID_BADGE_KEYS } from './badge-engine.js';

const emptyDomain=()=>({items:[]});
const uniqueValid=keys=>[...new Set((Array.isArray(keys)?keys:[]).map(String).filter(key=>VALID_BADGE_KEYS.has(key)))];
const koreanDateKey=value=>{const time=new Date(value).getTime();return Number.isFinite(time)?new Date(time+9*3600000).toISOString().slice(0,10):'';};

export function createBadgeService(command,{now=()=>new Date()}={}){
  let domainSnapshotPromise=null;
  async function domains(){
    if(!domainSnapshotPromise)domainSnapshotPromise=Promise.all(['community','itsme','columns','comments'].map(name=>readDomainWithViews(command,name,emptyDomain()))).then(([community,itsme,columns,comments])=>({community,itsme,columns,comments}));
    return domainSnapshotPromise;
  }

  async function statusForUser(user,activityOverride=null){
    const activity=activityOverride||await readActivity(command,user.id);
    const metrics=computeBadgeMetrics(user.id,activity,await domains(),{referralsRecruited:Number(user.recruitedCount||0)});
    const evaluated=evaluateBadgeRules(user,activity,metrics);
    const earned=new Set(evaluated.earnedBadges);
    const representativeBadge=earned.has(String(activity.representativeBadge||''))?String(activity.representativeBadge):'';
    const showcaseBadges=uniqueValid(activity.showcaseBadges).filter(key=>earned.has(key)&&key!==representativeBadge).slice(0,3);
    return {...evaluated,metrics,representativeBadge,showcaseBadges};
  }

  async function setRepresentative(user,badgeKey=''){
    const key=String(badgeKey||'');
    if(key&&!VALID_BADGE_KEYS.has(key))return {ok:false,error:'INVALID_BADGE'};
    const activity=await readActivity(command,user.id),status=await statusForUser(user,activity);
    if(key&&!status.earnedBadges.includes(key))return {ok:false,error:'BADGE_LOCKED'};
    activity.representativeBadge=key;
    activity.showcaseBadges=uniqueValid(activity.showcaseBadges).filter(item=>item!==key).slice(0,3);
    return {ok:true,activity:await writeActivity(command,user.id,activity)};
  }

  async function toggleShowcase(user,badgeKey=''){
    const key=String(badgeKey||'');
    if(!VALID_BADGE_KEYS.has(key))return {ok:false,error:'INVALID_BADGE'};
    const activity=await readActivity(command,user.id),status=await statusForUser(user,activity);
    if(key===String(activity.representativeBadge||''))return {ok:false,error:'BADGE_IS_REPRESENTATIVE'};
    if(!status.earnedBadges.includes(key))return {ok:false,error:'BADGE_LOCKED'};
    const current=uniqueValid(activity.showcaseBadges).filter(item=>item!==activity.representativeBadge).slice(0,3);
    if(current.includes(key))activity.showcaseBadges=current.filter(item=>item!==key);
    else if(current.length>=3)return {ok:false,error:'BADGE_SHOWCASE_FULL'};
    else activity.showcaseBadges=[...current,key];
    return {ok:true,activity:await writeActivity(command,user.id,activity)};
  }

  async function replaceGrants(user,badgeKeys=[]){
    const activity=await readActivity(command,user.id);
    activity.grantedBadges=uniqueValid(badgeKeys);
    const status=await statusForUser(user,activity),earned=new Set(status.earnedBadges);
    if(activity.representativeBadge&&!earned.has(activity.representativeBadge))activity.representativeBadge='';
    activity.showcaseBadges=uniqueValid(activity.showcaseBadges).filter(key=>earned.has(key)&&key!==activity.representativeBadge).slice(0,3);
    return {ok:true,activity:await writeActivity(command,user.id,activity),status};
  }

  async function recordVisit(user){
    const activity=await readActivity(command,user.id),signals=activity.badgeSignals&&typeof activity.badgeSignals==='object'?activity.badgeSignals:{},events=Array.isArray(signals.events)?signals.events:[];
    const stamp=new Date(now());if(!Number.isFinite(stamp.getTime()))return {ok:false,error:'INVALID_VISIT_TIME'};
    const iso=stamp.toISOString(),date=koreanDateKey(iso);
    activity.badgeSignals={...signals,events:[...events.filter(event=>{const oldDate=koreanDateKey(event?.at);return oldDate&&!(event?.type==='visit'&&oldDate===date);}),{type:'visit',at:iso}].slice(-400)};
    const status=await statusForUser(user,activity);activity.automaticBadges=status.automaticBadges;
    return {ok:true,activity:await writeActivity(command,user.id,activity),status};
  }

  return {statusForUser,setRepresentative,toggleShowcase,replaceGrants,recordVisit};
}
