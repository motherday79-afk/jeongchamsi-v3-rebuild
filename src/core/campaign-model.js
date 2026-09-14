const text=value=>String(value??'').trim();
const clone=value=>JSON.parse(JSON.stringify(value));
const fail=code=>{throw new Error(code);};
const FIELDS={headline:120,accentLine:120,intro:600,personId:120,name:80,party:100,office:100,organization:120,region:120,photoUrl:1000,photoCrop:20,topic:80,startDate:10,endDate:10,whyTitle:180,whyBody:5000,selectionReason:1600,quote:1000,storyBody:7000,needsBody:3000,policyTitle:180,videoUrl:1000,productionDisclosure:1600};
const SUPPORT_FIELDS={recipientName:120,associationName:120,bankName:80,accountNumber:80,accountHolder:120,officialUrl:1000,sourceUrl:1000,qrImageUrl:1000,instructions:1000};
export const campaignCategory=value=>['politics','culture','business'].includes(value)?value:'politics';
export function campaignUrl(value,{local=false}={}){
  const input=text(value);if(!input)return '';
  if(/[\s\\\u0000-\u001f\u007f]/.test(input))return '';
  if(local&&/^\/(?!\/)/.test(input))return input;
  try{const url=new URL(input);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function campaignVideoId(value){
  if(!campaignUrl(value))return '';
  try{const url=new URL(value),host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);let id='';
    if(host==='youtu.be')id=parts[0];
    else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))id=['embed','shorts','live'].includes(parts[0])?parts[1]:url.pathname==='/watch'?url.searchParams.get('v'):'';
    return url.protocol==='https:'&&/^[a-zA-Z0-9_-]{11}$/.test(id||'')?id:'';
  }catch{return '';}
}
export function campaignDay(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return NaN;
  const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return NaN;
  return Date.parse(value+'T00:00:00+09:00');
}
export function normalizeCampaignContent(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('CAMPAIGN_INPUT_INVALID');
  const safe={};for(const [key,limit] of Object.entries(FIELDS)){const value=text(input[key]);if(value.length>limit)fail('CAMPAIGN_FIELD_TOO_LONG');safe[key]=value;}
  if(safe.photoUrl&&!campaignUrl(safe.photoUrl,{local:true}))fail('CAMPAIGN_URL_INVALID');
  if(!['','atlas-tl','atlas-tr','atlas-bl','atlas-br'].includes(safe.photoCrop))safe.photoCrop='';
  if(safe.videoUrl&&!campaignVideoId(safe.videoUrl))fail('CAMPAIGN_VIDEO_INVALID');
  safe.featured=input.featured===true;
  safe.category=campaignCategory(input.category);
  if(safe.category!=='politics'){safe.personId='';safe.party='';}
  safe.productionRelation=['editorial','commissioned','ad'].includes(input.productionRelation)?input.productionRelation:'editorial';
  if(input.policies!==undefined&&!Array.isArray(input.policies))fail('CAMPAIGN_POLICY_INVALID');
  if((input.policies||[]).length>8)fail('CAMPAIGN_POLICY_INVALID');
  safe.policies=(input.policies||[]).map(row=>{const title=text(row?.title),body=text(row?.body);if(title.length>180||body.length>3000)fail('CAMPAIGN_FIELD_TOO_LONG');return {title,body};}).filter(row=>row.title||row.body);
  if(input.sources!==undefined&&!Array.isArray(input.sources))fail('CAMPAIGN_SOURCE_INVALID');
  if((input.sources||[]).length>10)fail('CAMPAIGN_SOURCE_INVALID');
  safe.sources=(input.sources||[]).map(row=>{const label=text(row?.label),url=text(row?.url);if(label.length>180||url.length>1000)fail('CAMPAIGN_FIELD_TOO_LONG');if(url&&!campaignUrl(url))fail('CAMPAIGN_URL_INVALID');return {label,url};}).filter(row=>row.label||row.url);
  if(input.support!==undefined){if(!input.support||typeof input.support!=='object'||Array.isArray(input.support))fail('CAMPAIGN_SUPPORT_INVALID');const value={};for(const [key,limit] of Object.entries(SUPPORT_FIELDS)){value[key]=text(input.support[key]);if(value[key].length>limit)fail('CAMPAIGN_FIELD_TOO_LONG');}for(const key of ['officialUrl','sourceUrl','qrImageUrl'])if(value[key]&&!campaignUrl(value[key]))fail('CAMPAIGN_SUPPORT_INVALID');value.public=input.support.public===true;value.verified=input.support.verified===true;if(Object.values(value).some(Boolean))safe.support=value;}
  if(input.funding!==undefined){if(!input.funding||typeof input.funding!=='object'||Array.isArray(input.funding))fail('CAMPAIGN_FUNDING_INVALID');const whole=(value,{positive=false}={})=>{if(value===null||value===undefined||value==='')return null;const number=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;if(!Number.isSafeInteger(number)||number<0||(positive&&number===0))fail('CAMPAIGN_FUNDING_INVALID');return number;};const value={goalKrw:whole(input.funding.goalKrw,{positive:true}),raisedKrw:whole(input.funding.raisedKrw),supporterCount:whole(input.funding.supporterCount),asOf:text(input.funding.asOf),sourceUrl:text(input.funding.sourceUrl),public:input.funding.public===true};if(value.sourceUrl&&!campaignUrl(value.sourceUrl))fail('CAMPAIGN_FUNDING_INVALID');if(value.asOf&&!Number.isFinite(campaignDay(value.asOf)))fail('CAMPAIGN_FUNDING_INVALID');if(Object.values(value).some(item=>item!==null&&item!==''&&item!==false))safe.funding=value;}
  if(JSON.stringify(safe).length>32000)fail('CAMPAIGN_TOO_LARGE');
  return safe;
}
export function validateCampaignPublication(data,now=Date.now()){
  if(!Number.isFinite(campaignDay(data.startDate))||!Number.isFinite(campaignDay(data.endDate))||data.endDate<data.startDate)fail('CAMPAIGN_DATE_INVALID');
  if(!['headline','intro','name','photoUrl','topic','whyBody','storyBody','policyTitle'].every(key=>text(data[key])))fail('CAMPAIGN_REQUIRED');
  if(!data.policies.length||data.policies.some(row=>!row.title||!row.body))fail('CAMPAIGN_POLICY_REQUIRED');
  if(data.sources.some(row=>!row.label||!row.url))fail('CAMPAIGN_SOURCE_INVALID');
  if(data.productionRelation!=='editorial'&&!data.productionDisclosure)fail('CAMPAIGN_DISCLOSURE_REQUIRED');
  if(data.support?.demo!==true&&data.support?.public===true){const accountParts=['bankName','accountNumber','accountHolder'].filter(key=>text(data.support[key])).length;if(!data.support.verified||!data.support.sourceUrl||(!data.support.officialUrl&&!data.support.accountNumber)||!data.support.recipientName&&!data.support.associationName||(accountParts>0&&accountParts<3))fail('CAMPAIGN_SUPPORT_INVALID');}
  if(data.funding?.demo!==true&&data.funding?.public===true&&(!data.funding.sourceUrl||!Number.isFinite(campaignDay(data.funding.asOf))||campaignDay(data.funding.asOf)>now))fail('CAMPAIGN_FUNDING_INVALID');
}
export function campaignState(record,now=Date.now()){
  if(!record?.published)return 'draft';
  if(record.visibility!=='public')return 'private';
  if(record.isExample===true)return record.endedAt?'archive':'current';
  const start=campaignDay(record.published.startDate),end=campaignDay(record.published.endDate);
  if(!Number.isFinite(start)||!Number.isFinite(end))return 'invalid';
  if(record.endedAt||now>=end+86400000)return 'archive';
  return now<start?'scheduled':'current';
}
export function prepareCampaignMutation(previous,input={},options={}){
  const {operation='save',version=0,actor='',now=Date.now(),id}=options;
  if(!['save','publish','hide','end','delete'].includes(operation))fail('CAMPAIGN_OPERATION_INVALID');
  if(!Number.isInteger(Number(version))||Number(version)!==Number(previous?.version||0))fail('CAMPAIGN_CONFLICT');
  if(['hide','end','delete'].includes(operation)&&!previous)fail('CAMPAIGN_NOT_FOUND');
  if(operation==='delete'){if(previous.published||previous.number)fail('CAMPAIGN_DELETE_PUBLISHED');return null;}
  const stamp=new Date(now).toISOString();
  const next=previous?clone(previous):{id,version:0,number:null,createdAt:stamp,published:null,publishedAt:'',visibility:'private',endedAt:''};
  if(['save','publish'].includes(operation)){next.draft=normalizeCampaignContent(input);for(const key of ['support','funding'])if(input[key]===undefined&&previous?.draft?.[key])next.draft[key]=clone(previous.draft[key]);}
  if(operation==='publish'){validateCampaignPublication(next.draft,now);next.published=clone(next.draft);next.publishedAt=stamp;next.visibility='public';}
  if(operation==='hide')next.visibility='private';
  if(operation==='end'){if(!next.published)fail('CAMPAIGN_NOT_PUBLISHED');next.endedAt=next.endedAt||stamp;}
  next.version=Number(next.version||0)+1;next.updatedAt=stamp;next.updatedBy=text(actor).slice(0,120);
  if(previous?.isExample===true){next.isExample=true;next.exampleNumber=previous.exampleNumber;next.number=null;}
  return next;
}
export function publicCampaign(record,now=Date.now()){
  const state=campaignState(record,now);if(!['current','archive'].includes(state))return null;
  const content=clone(record.published);if(content.support?.demo!==true&&!(content.support?.public===true&&content.support?.verified===true&&campaignUrl(content.support.sourceUrl)&&(campaignUrl(content.support.officialUrl)||content.support.accountNumber)))delete content.support;if(content.funding?.demo!==true&&!(content.funding?.public===true&&campaignUrl(content.funding.sourceUrl)&&Number.isFinite(campaignDay(content.funding.asOf))))delete content.funding;return {...content,id:record.id,number:record.number,state,publishedAt:record.publishedAt,updatedAt:record.publishedAt,isExample:record.isExample===true,exampleNumber:record.isExample===true?record.exampleNumber:undefined};
}
const CARD_FIELDS=['headline','accentLine','intro','name','party','office','organization','region','photoUrl','photoCrop','topic','startDate','endDate','featured','category'];
const card=data=>{const result=Object.fromEntries(CARD_FIELDS.map(key=>[key,data?.[key]??(key==='featured'?false:'')]));const funding=data?.funding;if(funding?.demo===true)result.funding={goalKrw:funding.goalKrw,raisedKrw:funding.raisedKrw,supporterCount:funding.supporterCount,asOf:funding.asOf,demo:true};else if(funding?.public===true&&campaignUrl(funding.sourceUrl)&&Number.isFinite(campaignDay(funding.asOf)))result.funding={goalKrw:funding.goalKrw,raisedKrw:funding.raisedKrw,supporterCount:funding.supporterCount,asOf:funding.asOf};return result;};
const indexCard=data=>{const result=card(data),funding=data?.funding;if(funding&&funding.demo!==true)result.funding={goalKrw:funding.goalKrw??null,raisedKrw:funding.raisedKrw??null,supporterCount:funding.supporterCount??null,asOf:funding.asOf||'',public:funding.public===true,sourceUrl:funding.sourceUrl||''};return result;};
export function campaignSummary(record,now=Date.now(),internal=false){
  if(internal)return {id:record.id,number:record.number,version:record.version,visibility:record.visibility,endedAt:record.endedAt,createdAt:record.createdAt,updatedAt:record.updatedAt,publishedAt:record.publishedAt,isExample:record.isExample===true,exampleNumber:record.exampleNumber,published:record.published?indexCard(record.published):null,draft:indexCard(record.draft)};
  const visible=publicCampaign(record,now);return visible?{...card(visible),id:record.id,number:record.number,state:visible.state,publishedAt:record.publishedAt,isExample:record.isExample===true,exampleNumber:record.isExample===true?record.exampleNumber:undefined}:null;
}
