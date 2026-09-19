const PROFILE_PREFIX='jcs:fortune:profile:';
const DAILY_PREFIX='jcs:fortune:daily:';
const DAILY_TTL_SECONDS=60*60*48;

const clean=v=>String(v??'').trim();
const dateRe=/^(\d{4})-(\d{2})-(\d{2})$/;
const timeRe=/^(\d{2}):(\d{2})$/;

function todayInSeoul(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=type=>parts.find(part=>part.type===type)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function profileKey(userId){return `${PROFILE_PREFIX}${String(userId)}`;}
function dailyKey(userId,date){return `${DAILY_PREFIX}${date}:${String(userId)}`;}
function parseJson(raw,fallback=null){if(!raw)return fallback;try{return JSON.parse(raw);}catch{return fallback;}}
function validateDate(value){
  const m=dateRe.exec(clean(value));if(!m)throw new Error('FORTUNE_BIRTH_DATE_INVALID');
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  if(y<1900||y>2100||mo<1||mo>12||d<1||d>31)throw new Error('FORTUNE_BIRTH_DATE_INVALID');
  return `${m[1]}-${m[2]}-${m[3]}`;
}
function validateTime(value){
  const v=clean(value);if(!v)return null;const m=timeRe.exec(v);if(!m)throw new Error('FORTUNE_BIRTH_TIME_INVALID');
  const h=Number(m[1]),min=Number(m[2]);if(h<0||h>23||min<0||min>59)throw new Error('FORTUNE_BIRTH_TIME_INVALID');return v;
}
function sanitizeProfile(input={}){
  const calendarType=clean(input.calendarType||'solar');if(!['solar','lunar'].includes(calendarType))throw new Error('FORTUNE_CALENDAR_INVALID');
  return {
    birthDate:validateDate(input.birthDate),
    calendarType,
    birthTime:input.birthTimeUnknown===true||input.birthTimeKnown===false?null:validateTime(input.birthTime),
    isLeapMonth:calendarType==='lunar'&&input.isLeapMonth===true,
    updatedAt:new Date().toISOString()
  };
}
function publicResult(result){
  return {
    needsProfile:false,
    date:result.date,
    overall:result.overall,
    money:result.money,
    business:result.business,
    relationship:result.relationship,
    birthTimeKnown:!!result.meta?.birthTimeKnown,
    disclaimer:result.meta?.disclaimer||'운세는 전통 명리 요소를 바탕으로 한 JCS 엔터테인먼트 콘텐츠입니다. 중요한 의사결정의 근거로 사용하지 마세요.'
  };
}

export function createFortuneService({command,engineProvider=()=>import('./jcs-fortune-engine/index.js'),now=()=>new Date()}={}){
  if(typeof command!=='function')throw new Error('FORTUNE_STORAGE_REQUIRED');
  async function readProfile(userId){return parseJson(await command(['GET',profileKey(userId)]),null);}
  async function compute(user,profile,date){
    let engine;try{engine=await engineProvider();}catch(error){const e=new Error('FORTUNE_ENGINE_UNAVAILABLE');e.cause=error;throw e;}
    const result=engine.getDailyFortune({userKey:String(user.id),displayName:user.nickname||user.name||'',birthDate:profile.birthDate,calendarType:profile.calendarType,birthTime:profile.birthTime,isLeapMonth:profile.isLeapMonth,timezone:'Asia/Seoul',targetDate:date});
    return publicResult(result);
  }
  async function today(user){
    if(!user?.id)throw new Error('LOGIN_REQUIRED');
    const profile=await readProfile(user.id);
    if(!profile)return {ok:true,needsProfile:true,required:['birthDate','calendarType'],optional:['birthTime','isLeapMonth']};
    const date=todayInSeoul(now()),key=dailyKey(user.id,date),cached=parseJson(await command(['GET',key]),null);
    if(cached?.needsProfile===false)return {ok:true,...cached};
    const view=await compute(user,profile,date);
    await command(['SET',key,JSON.stringify(view),'EX',String(DAILY_TTL_SECONDS)]);
    return {ok:true,...view};
  }
  async function saveProfile(user,input={}){
    if(!user?.id)throw new Error('LOGIN_REQUIRED');
    const profile=sanitizeProfile(input);
    await command(['SET',profileKey(user.id),JSON.stringify(profile)]);
    const date=todayInSeoul(now());await command(['DEL',dailyKey(user.id,date)]);
    return today(user);
  }
  return {today,saveProfile,readProfile};
}

export {sanitizeProfile,todayInSeoul};
