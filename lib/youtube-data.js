const API_ROOT='https://www.googleapis.com/youtube/v3';
const DAY=86_400_000;
const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const normalize=value=>text(value).toLowerCase().replace(/[^0-9a-z가-힣]/g,'');

export function youtubeCredentialStatus(env={}){
  const configured=!!text(env?.YOUTUBE_DATA_API_KEY);
  return {configured,missing:configured?[]:['YOUTUBE_DATA_API_KEY']};
}

function youtubeError(code,status=0){
  const error=new Error(code);error.code=code;if(status)error.status=status;return error;
}

async function apiJson(resource,params,options={}){
  const key=text(options?.env?.YOUTUBE_DATA_API_KEY);
  if(!key)throw youtubeError('YOUTUBE_CREDENTIALS_MISSING');
  const url=new URL(`${API_ROOT}/${resource}`);
  for(const [name,value] of Object.entries({...params,key}))if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(name,String(value));
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timeoutMs=Math.max(500,Number(options.timeoutMs)||5000),timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
  try{
    const response=await (options.fetchImpl||fetch)(url.toString(),controller?{signal:controller.signal}:undefined);
    if(!response?.ok)throw youtubeError(`YOUTUBE_API_${Number(response?.status)||'ERROR'}`,Number(response?.status)||0);
    const value=await response.json();
    if(!value||typeof value!=='object')throw youtubeError('YOUTUBE_INVALID_RESPONSE');
    return value;
  }catch(error){
    if(error?.code)throw error;
    throw youtubeError(error?.name==='AbortError'?'YOUTUBE_TIMEOUT':'YOUTUBE_NETWORK');
  }finally{if(timer)clearTimeout(timer);}
}

function identityTokens(person={}){
  return [person.name,person.party,person.office||person.roleLabel,person.jurisdiction||person.region].map(value=>text(value,100)).filter(Boolean);
}

function candidateScore(person,candidate){
  const [name,...context]=identityTokens(person),title=normalize(candidate?.snippet?.title),description=normalize(candidate?.snippet?.description),nameKey=normalize(name);
  let score=0;
  if(nameKey&&title===nameKey)score+=100;
  else if(nameKey&&title.includes(nameKey))score+=70;
  if(nameKey&&description.includes(nameKey))score+=35;
  for(const token of context.map(normalize).filter(value=>value.length>=2)){
    if(title.includes(token))score+=14;
    if(description.includes(token))score+=10;
  }
  if(/공식|official/.test(`${title} ${description}`))score+=8;
  return score;
}

function channelResult(channelId,snippet={},extra={}){
  const id=text(channelId,100);
  return {channelId:id,channelUrl:`https://www.youtube.com/channel/${id}`,channelTitle:text(snippet?.title,160),...extra};
}

export async function searchYouTubeChannel(person={},options={}){
  const query=identityTokens(person).join(' '),data=await apiJson('search',{part:'snippet',type:'channel',maxResults:5,q:query},options);
  const candidates=(Array.isArray(data.items)?data.items:[]).map(item=>({item,channelId:text(item?.id?.channelId||item?.snippet?.channelId,100),score:candidateScore(person,item)})).filter(row=>row.channelId).sort((left,right)=>right.score-left.score||left.channelId.localeCompare(right.channelId));
  const selected=candidates[0];
  return selected?channelResult(selected.channelId,selected.item.snippet,{sourceMode:'AUTO',matchScore:selected.score,matchedQuery:query}):null;
}

export async function resolveYouTubeChannelReference(reference,options={}){
  const value=text(reference,500),direct=value.match(/(?:youtube\.com\/channel\/)?(UC[0-9A-Za-z_-]+)/);
  if(direct)return channelResult(direct[1],{}, {channelTitle:'',sourceMode:'MANUAL'});
  const handleMatch=value.match(/(?:youtube\.com\/)?(@[0-9A-Za-z._-]+)/),handle=handleMatch?.[1]||(/^@[0-9A-Za-z._-]+$/.test(value)?value:'');
  if(!handle)throw youtubeError('YOUTUBE_CHANNEL_REFERENCE_INVALID');
  const data=await apiJson('channels',{part:'snippet',forHandle:handle},options),item=Array.isArray(data.items)?data.items[0]:null;
  if(!item?.id)throw youtubeError('YOUTUBE_CHANNEL_NOT_FOUND');
  return channelResult(item.id,item.snippet,{sourceMode:'MANUAL'});
}

const publishedAt=item=>text(item?.contentDetails?.videoPublishedAt||item?.snippet?.publishedAt,40);
const videoId=item=>text(item?.contentDetails?.videoId||item?.snippet?.resourceId?.videoId,100);
const chunks=(items,size)=>Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,index*size+size));

function uploadWindows(videos,nowValue){
  const current=Number(nowValue),rowsWithin=days=>videos.filter(item=>{const stamp=Date.parse(item.publishedAt);const age=current-stamp;return Number.isFinite(stamp)&&age>=0&&age<=days*DAY;}),within=days=>rowsWithin(days).length,average=days=>{const rows=rowsWithin(days);return rows.length?Math.round(rows.reduce((sum,item)=>sum+(Math.max(0,Number(item.viewCount))||0),0)/rows.length):null;};
  const counts=new Map();
  for(const item of videos){const stamp=Date.parse(item.publishedAt);if(Number.isFinite(stamp))counts.set(new Date(stamp).toISOString().slice(0,10),(counts.get(new Date(stamp).toISOString().slice(0,10))||0)+1);}
  const today=new Date(current);today.setUTCHours(0,0,0,0);
  const daily=Array.from({length:30},(_,index)=>{const stamp=today.getTime()-(29-index)*DAY,date=new Date(stamp).toISOString().slice(0,10);return {date,count:counts.get(date)||0};});
  return {h24:within(1),d7:within(7),d30:within(30),averageViews:{h24:average(1),d7:average(7),d30:average(30)},daily};
}

export async function fetchYouTubeChannelData(mapping={},options={}){
  const channelId=text(mapping?.channelId,100);
  if(!channelId)throw youtubeError('YOUTUBE_CHANNEL_ID_REQUIRED');
  const channelData=await apiJson('channels',{part:'snippet,contentDetails',id:channelId},options),channel=Array.isArray(channelData.items)?channelData.items[0]:null;
  if(!channel?.id)throw youtubeError('YOUTUBE_CHANNEL_NOT_FOUND');
  const uploadsId=text(channel?.contentDetails?.relatedPlaylists?.uploads,100),nowValue=Number((options.now||Date.now)()),cutoff=nowValue-30*DAY,items=[];
  let pageToken='';
  for(let page=0;uploadsId&&page<4;page+=1){
    const pageData=await apiJson('playlistItems',{part:'snippet,contentDetails',playlistId:uploadsId,maxResults:50,pageToken},options),rows=Array.isArray(pageData.items)?pageData.items:[];
    items.push(...rows);
    const oldest=Math.min(...rows.map(item=>Date.parse(publishedAt(item))).filter(Number.isFinite));
    pageToken=text(pageData.nextPageToken,200);
    if(!pageToken||!rows.length||(Number.isFinite(oldest)&&oldest<cutoff))break;
  }
  const unique=new Map();
  for(const item of items){const id=videoId(item);if(id&&!unique.has(id))unique.set(id,{id,title:text(item?.snippet?.title,280),publishedAt:publishedAt(item),url:`https://www.youtube.com/watch?v=${id}`,viewCount:0});}
  for(const group of chunks([...unique.keys()],50)){
    const stats=await apiJson('videos',{part:'snippet,statistics',id:group.join(',')},options);
    for(const item of Array.isArray(stats.items)?stats.items:[]){const current=unique.get(text(item?.id,100));if(current)unique.set(current.id,{...current,title:text(item?.snippet?.title||current.title,280),publishedAt:text(item?.snippet?.publishedAt||current.publishedAt,40),viewCount:Math.max(0,Number(item?.statistics?.viewCount)||0)});}
  }
  const allVideos=[...unique.values()].sort((left,right)=>String(right.publishedAt).localeCompare(String(left.publishedAt))),uploads=uploadWindows(allVideos,nowValue);
  return {
    provider:'YOUTUBE_DATA_API',collectedAt:new Date(nowValue).toISOString(),
    channel:{id:text(channel.id,100),title:text(channel?.snippet?.title,160),url:`https://www.youtube.com/channel/${text(channel.id,100)}`},
    videos:allVideos.slice(0,10),uploads:{...uploads,scanned:allVideos.length,truncated:items.length>=200},
    source:{type:'YOUTUBE_DATA_API',label:'YouTube 공개 채널·영상'}
  };
}
