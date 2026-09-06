import { TARGET_KEYS } from './migration-service.js';
import { resolveYouTubeChannelReference, searchYouTubeChannel, youtubeCredentialStatus } from './youtube-data.js';

const REGISTRY_KEY=TARGET_KEYS.content('youtubeChannels');
const JOB_KEY=TARGET_KEYS.content('youtubeChannelDiscovery');
const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const clone=value=>JSON.parse(JSON.stringify(value));
const emptyRegistry=()=>({version:'JCS_YOUTUBE_CHANNELS_V1',channels:{},quota:{day:'',used:0},updatedAt:''});

function quotaDay(stamp){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Number(stamp))).replaceAll('/','-');
}

async function readJson(command,key,fallback){const raw=await command(['GET',key]);if(!raw)return clone(fallback);try{return {...clone(fallback),...(JSON.parse(raw)||{})};}catch{return clone(fallback);}}
const writeJson=(command,key,value)=>command(['SET',key,JSON.stringify(value)]);
const stableError=(personId,error)=>({personId:text(personId,100),code:text(error?.code||error?.message||'YOUTUBE_DISCOVERY_FAILED',100)});

export function createYouTubeChannelService(options={}){
  if(typeof options.command!=='function')throw new Error('STORAGE_COMMAND_REQUIRED');
  const command=options.command,env=options.env||process.env,now=options.now||Date.now;
  const searchChannel=options.searchChannel||((person)=>searchYouTubeChannel(person,{fetchImpl:options.fetchImpl,env,now,timeoutMs:options.timeoutMs}));
  const resolveReference=options.resolveReference||((reference)=>resolveYouTubeChannelReference(reference,{fetchImpl:options.fetchImpl,env,now,timeoutMs:options.timeoutMs}));
  const loadProfiles=async()=>Array.isArray(options.profiles)?options.profiles:(typeof options.profilesProvider==='function'?await options.profilesProvider():[]);

  async function readRegistry(){const value=await readJson(command,REGISTRY_KEY,emptyRegistry());value.channels=value.channels&&typeof value.channels==='object'?value.channels:{};value.quota=value.quota&&typeof value.quota==='object'?value.quota:{day:'',used:0};return value;}
  async function writeRegistry(registry){registry.updatedAt=new Date(Number(now())).toISOString();await writeJson(command,REGISTRY_KEY,registry);return registry;}
  function resetQuota(registry){const day=quotaDay(now());if(registry.quota?.day!==day)registry.quota={day,used:0};return registry.quota;}
  function consumeQuota(registry,count=1){const quota=resetQuota(registry);if(quota.used+count>100)throw Object.assign(new Error('YOUTUBE_SEARCH_QUOTA_REACHED'),{code:'YOUTUBE_SEARCH_QUOTA_REACHED'});quota.used+=count;return quota;}
  async function profileFor(personId){const id=text(personId,100),rows=await loadProfiles(),person=rows.find(row=>String(row?.id)===id);if(!person)throw Object.assign(new Error('POLITICIAN_PROFILE_MISSING'),{code:'POLITICIAN_PROFILE_MISSING'});return person;}
  const mappingFor=(person,result,sourceMode=result?.sourceMode||'AUTO')=>({personId:String(person.id),personName:text(person.name,80),channelId:text(result?.channelId,100),channelTitle:text(result?.channelTitle,160),channelUrl:text(result?.channelUrl,500),sourceMode,matchScore:Number.isFinite(Number(result?.matchScore))?Number(result.matchScore):null,matchedQuery:text(result?.matchedQuery,300),updatedAt:new Date(Number(now())).toISOString()});

  async function status(){
    const [registry,job,profiles]=await Promise.all([readRegistry(),readJson(command,JOB_KEY,null),loadProfiles()]);resetQuota(registry);
    const byId=new Map(profiles.map(person=>[String(person.id),person])),channels=Object.values(registry.channels).map(mapping=>({...mapping,personName:mapping.personName||byId.get(String(mapping.personId))?.name||mapping.personId})).sort((left,right)=>left.personName.localeCompare(right.personName,'ko'));
    const profilesStatus=profiles.filter(person=>person?.id&&person.isVacant!==true).map(person=>{const mapping=registry.channels[String(person.id)]||null;return {personId:String(person.id),personName:text(person.name,80),party:text(person.party,80),type:text(person.type,40),registered:!!mapping?.channelId,mapping};}).sort((left,right)=>left.personName.localeCompare(right.personName,'ko'));
    return {credentials:youtubeCredentialStatus(env),registered:channels.length,total:profilesStatus.length,quota:{day:registry.quota.day,used:Number(registry.quota.used)||0,limit:100},job,channels,profiles:profilesStatus};
  }

  async function startDiscovery(){
    if(!youtubeCredentialStatus(env).configured)throw Object.assign(new Error('YOUTUBE_CREDENTIALS_MISSING'),{code:'YOUTUBE_CREDENTIALS_MISSING'});
    const [registry,profiles]=await Promise.all([readRegistry(),loadProfiles()]);resetQuota(registry);
    const ids=profiles.filter(person=>person?.id&&person.isVacant!==true&&!registry.channels[String(person.id)]).map(person=>String(person.id));
    const job={id:`youtube-${Date.now()}`,status:ids.length?'RUNNING':'COMPLETED',ids,cursor:0,total:ids.length,completed:0,registered:0,notFound:0,failures:[],quotaDay:registry.quota.day,quotaUsed:Number(registry.quota.used)||0,updatedAt:new Date(Number(now())).toISOString()};
    await Promise.all([writeRegistry(registry),writeJson(command,JOB_KEY,job)]);return {job};
  }

  async function runDiscoveryStep(){
    if(!youtubeCredentialStatus(env).configured)throw Object.assign(new Error('YOUTUBE_CREDENTIALS_MISSING'),{code:'YOUTUBE_CREDENTIALS_MISSING'});
    const [registry,job,profiles]=await Promise.all([readRegistry(),readJson(command,JOB_KEY,null),loadProfiles()]);
    if(!job)throw Object.assign(new Error('YOUTUBE_DISCOVERY_NOT_STARTED'),{code:'YOUTUBE_DISCOVERY_NOT_STARTED'});
    resetQuota(registry);job.quotaDay=registry.quota.day;job.quotaUsed=Number(registry.quota.used)||0;
    if(job.status==='PAUSED_QUOTA'&&job.quotaUsed<100)job.status='RUNNING';
    if(job.status==='COMPLETED')return {job,batch:{size:0,ids:[]}};
    if(job.quotaUsed>=100){job.status='PAUSED_QUOTA';await writeJson(command,JOB_KEY,job);return {job,batch:{size:0,ids:[]}};}
    const byId=new Map(profiles.map(person=>[String(person.id),person])),remaining=Math.min(5,100-job.quotaUsed),ids=job.ids.slice(job.cursor,job.cursor+remaining),failures=[];let registered=0,notFound=0;
    for(const personId of ids){
      const person=byId.get(personId);if(!person){failures.push(stableError(personId,{code:'POLITICIAN_PROFILE_MISSING'}));continue;}
      if(registry.channels[personId]?.sourceMode==='MANUAL')continue;
      try{consumeQuota(registry);const result=await searchChannel(person);if(result?.channelId){registry.channels[personId]=mappingFor(person,result,'AUTO');registered+=1;}else notFound+=1;}catch(error){failures.push(stableError(personId,error));}
    }
    job.cursor+=ids.length;job.completed=Math.min(job.total,job.cursor);job.registered=Number(job.registered||0)+registered;job.notFound=Number(job.notFound||0)+notFound;job.failures=[...(job.failures||[]),...failures].slice(-100);job.quotaDay=registry.quota.day;job.quotaUsed=Number(registry.quota.used)||0;job.updatedAt=new Date(Number(now())).toISOString();
    job.status=job.cursor>=job.total?'COMPLETED':job.quotaUsed>=100?'PAUSED_QUOTA':'RUNNING';
    await Promise.all([writeRegistry(registry),writeJson(command,JOB_KEY,job)]);return {job,batch:{size:ids.length,ids},registered,notFound,failures};
  }

  async function saveMapping(input={}){
    const person=await profileFor(input.personId),resolved=await resolveReference(input.reference||input.channelUrl||input.channelId),registry=await readRegistry();
    registry.channels[String(person.id)]=mappingFor(person,resolved,'MANUAL');await writeRegistry(registry);return {mapping:registry.channels[String(person.id)]};
  }

  async function rediscover(personId){
    const person=await profileFor(personId),registry=await readRegistry();consumeQuota(registry);const result=await searchChannel(person);
    if(!result?.channelId)throw Object.assign(new Error('YOUTUBE_CHANNEL_NOT_FOUND'),{code:'YOUTUBE_CHANNEL_NOT_FOUND'});
    registry.channels[String(person.id)]=mappingFor(person,result,'AUTO');await writeRegistry(registry);return {mapping:registry.channels[String(person.id)]};
  }

  async function deleteMapping(personId){
    const id=text(personId,100),registry=await readRegistry(),removed=!!registry.channels[id];delete registry.channels[id];await writeRegistry(registry);return {removed,personId:id};
  }

  async function registryForCollection(){return (await readRegistry()).channels;}
  return {status,startDiscovery,runDiscoveryStep,saveMapping,rediscover,deleteMapping,registryForCollection};
}
