const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
const clone=value=>JSON.parse(JSON.stringify(value||{}));
const stampId=(prefix,now)=>`${prefix}-${new Date(now).getTime().toString(36)}`;

function pollPost(data,input,user,now){
  const labels=String(input.options||'').split(/\r?\n|,/).map(value=>clean(value,80)).filter(Boolean).slice(0,10);
  if(!clean(input.title||input.question)||labels.length<2)throw new Error('POLL_TITLE_AND_OPTIONS_REQUIRED');
  return {id:stampId('poll',now),question:clean(input.title||input.question),title:clean(input.title||input.question),description:clean(input.body||input.description,2000),options:labels.map((label,index)=>({id:`option-${index+1}`,label,votes:0})),ownerId:user.id,author:clean(user.nickname||user.id,40),published:true,featured:input.applyToMain===true||String(input.applyToMain)==='true',createdAt:now,updatedAt:now};
}

function evaluationPost(data,input,user,now){
  const subjectId=clean(input.subjectId,80),slot=input.slot==='local'?'local':'assembly',title=clean(input.title,200);
  if(!subjectId||!title)throw new Error('EVALUATION_TITLE_AND_POLITICIAN_REQUIRED');
  return {id:stampId('evaluation',now),title,body:clean(input.body,5000),subjectId,slot,ownerId:user.id,author:clean(user.nickname||user.id,40),published:true,featured:false,createdAt:now,updatedAt:now};
}

export function featureParticipationPost(domain,source,itemId,now=new Date().toISOString()){
  const data=clone(source),items=Array.isArray(data.items)?data.items:[],item=items.find(row=>String(row.id)===String(itemId));
  if(!item)throw new Error('PARTICIPATION_POST_NOT_FOUND');
  for(const row of items)if(domain==='polls'||row.slot===item.slot)row.featured=row.id===item.id;
  item.updatedAt=now;
  if(domain==='nationalEvaluation'){
    const previous=data.slots?.[item.slot];
    if(previous?.evaluationId&&previous.subjectId!==item.subjectId){
      const votes=data.results?.[previous.evaluationId]||{};
      data.history=[{...previous,...votes,closedAt:now},...(Array.isArray(data.history)?data.history:[])];
    }
    const evaluationId=`evaluation-${item.id}`;
    data.slots={...(data.slots||{}),[item.slot]:{slot:item.slot,evaluationId,subjectId:item.subjectId,itemId:item.id,enabled:true,closedAt:''}};
    data.results={...(data.results||{}),[evaluationId]:data.results?.[evaluationId]||{positive:0,neutral:0,negative:0}};
  }
  return {data,item};
}

export function createParticipationPost(domain,source,input,user,now=new Date().toISOString()){
  if(!['polls','nationalEvaluation'].includes(domain))throw new Error('INVALID_PARTICIPATION_DOMAIN');
  const data=clone(source),item=domain==='polls'?pollPost(data,input,user,now):evaluationPost(data,input,user,now);
  data.items=[item,...(Array.isArray(data.items)?data.items:[])].slice(0,500);
  if(item.featured||input.applyToMain===true||String(input.applyToMain)==='true')return featureParticipationPost(domain,data,item.id,now);
  return {data,item};
}
