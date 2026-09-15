export const GROUP_CATEGORIES=Object.freeze({politics:'정치',culture:'문화',social:'친목'});
export const GROUP_VISIBILITIES=Object.freeze({public:'공개 모임',members:'회원 전용',invite:'초대 전용'});
const fail=code=>{throw new Error(code);};
const admin=user=>!!user?.id&&user.role==='admin';
const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('GROUP_INPUT_INVALID');return v.trim();};
const signed=user=>{if(!user?.id)fail('LOGIN_REQUIRED');};
const nameOf=user=>String(user?.nickname||user?.name||'회원').slice(0,60);
const date=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))fail('GROUP_INPUT_INVALID');return d.toISOString();};
const active=member=>member?.status==='active';
export const groupMember=(group,user)=>user?.id?(group.members||[]).find(m=>m.userId===user.id)||null:null;
export function groupViewer(group,user){
 const member=groupMember(group,user),isOwner=!!user?.id&&group.ownerId===user.id,isAdmin=admin(user),enabled=['approved','closed'].includes(group.status);
 const manager=isAdmin||(active(member)&&['owner','moderator'].includes(member.role)),role=isAdmin?'admin':isOwner&&group.status!=='approved'&&group.status!=='closed'?'applicant':active(member)?member.role:'guest';
 const canRead=enabled&&(group.visibility==='public'||active(member))||isOwner||isAdmin;
 return {userId:user?.id||'',role,membershipStatus:member?.status||'none',canLeave:!group.isExample&&!isOwner&&['pending','active'].includes(member?.status),canRead:!!canRead,canWrite:!group.isExample&&group.status==='approved'&&(active(member)||isAdmin),canManage:!group.isExample&&manager&&enabled,canEditSettings:!group.isExample&&(isOwner||isAdmin),canReview:!group.isExample&&isAdmin&&group.status==='pending',notify:active(member)&&member.notify!==false,lastSeenAt:member?.lastSeenAt||''};
}
function settings(input,previous={}){
 const value={...previous};
 for(const [key,max,required] of [['name',60,true],['description',1500,true],['region',80,false],['rules',4000,false]])if(input[key]!==undefined)value[key]=text(input[key],max,required);
 if(!value.name||value.name.length<2||!value.description)fail('GROUP_INPUT_INVALID');
 for(const [key,allowed] of [['category',GROUP_CATEGORIES],['visibility',GROUP_VISIBILITIES]]){if(input[key]!==undefined)value[key]=input[key];if(!Object.hasOwn(allowed,value[key]))fail('GROUP_INPUT_INVALID');}
 return value;
}
export function createGroup(input,{id,user,now,inviteToken}){
 signed(user);if(input.privacyAccepted!==true)fail('GROUP_INPUT_INVALID');const fields=settings({...input,visibility:input.visibility||'members'});
 return {...fields,id,version:1,status:'pending',ownerId:user.id,ownerName:nameOf(user),createdAt:now,updatedAt:now,lastActivityAt:now,inviteToken,coverImageId:'',reviewReason:'',isExample:false,members:[{userId:user.id,nickname:nameOf(user),status:'pending',role:'owner',requestedAt:now,joinedAt:'',notify:true,lastSeenAt:now,consentAt:now,consentVersion:'groups-171'}],posts:[],events:[],assets:[],reports:[],audit:[{action:'create',actorName:nameOf(user),actorId:user.id,createdAt:now}]};
}
const mediaUrl=(g,id)=>`/api/v3/groups?id=${encodeURIComponent(g.id)}&imageId=${encodeURIComponent(id)}`;
export function groupSummary(g,user){
 const viewer=groupViewer(g,user),members=g.members||[],posts=(g.posts||[]).filter(p=>!p.deleted&&!p.hidden);
 return {id:g.id,version:g.version,name:g.name,category:g.category,description:g.description,region:g.region||'',visibility:g.visibility,status:g.status,coverUrl:g.isExample?g.coverUrl||'':g.coverImageId?mediaUrl(g,g.coverImageId):'',...(g.coverCrop?{coverCrop:g.coverCrop}:{}),memberCount:members.filter(active).length,postCount:posts.length,eventCount:(g.events||[]).filter(e=>!e.deleted).length,isExample:g.isExample===true,ownerName:g.ownerName,updatedAt:g.updatedAt,unread:g.status==='approved'&&viewer.notify&&String(g.lastActivityAt)>viewer.lastSeenAt,membershipStatus:viewer.membershipStatus,viewerRole:viewer.role,canLeave:viewer.canLeave};
}
export function groupDetail(g,user,{invite=''}={}){
 const viewer=groupViewer(g,user),related=g.ownerId===user?.id||admin(user)||['pending','active'].includes(viewer.membershipStatus);
 if(!['approved','closed'].includes(g.status)&&g.ownerId!==user?.id&&!admin(user))fail('GROUP_NOT_FOUND');
 if(g.visibility==='invite'&&!related&&(!invite||invite!==g.inviteToken))fail('GROUP_NOT_FOUND');
 const summary=groupSummary(g,user),result={...summary,version:g.version,rules:g.rules||'',viewer,posts:[],events:[]};
 if(g.ownerId===user?.id||admin(user))result.reviewReason=g.reviewReason||'';
 if(viewer.canRead){
  result.posts=(g.posts||[]).filter(p=>!p.deleted&&(!p.hidden||viewer.canManage)).map(p=>({id:p.id,title:p.title,body:p.body,kind:p.kind,authorId:p.authorId,authorName:p.authorName,createdAt:p.createdAt,updatedAt:p.updatedAt,hidden:!!p.hidden,images:(p.images||[]).map(a=>g.isExample?a:{id:a.id,url:mediaUrl(g,a.id)}),comments:(p.comments||[]).filter(c=>!c.deleted).map(c=>({id:c.id,body:c.body,authorId:c.authorId,authorName:c.authorName,createdAt:c.createdAt})),canEdit:viewer.canWrite&&(p.authorId===user?.id||viewer.canManage&&p.kind==='notice'),canDelete:viewer.canWrite&&(p.authorId===user?.id||viewer.canManage),canModerate:viewer.canManage&&viewer.canWrite}));
  const activeIds=new Set((g.members||[]).filter(active).map(m=>m.userId));
  result.events=(g.events||[]).filter(e=>!e.deleted).map(e=>{const rsvps=(e.rsvps||[]).filter(r=>activeIds.has(r.userId));return {id:e.id,title:e.title,body:e.body,startsAt:e.startsAt,place:e.place,authorId:e.authorId,authorName:e.authorName,createdAt:e.createdAt,yesCount:rsvps.filter(r=>r.response==='yes').length,noCount:rsvps.filter(r=>r.response==='no').length,myResponse:rsvps.find(r=>r.userId===user?.id)?.response||'',canEdit:viewer.canManage&&viewer.canWrite,canDelete:viewer.canManage&&viewer.canWrite};});
 }
 if(viewer.canManage){
  result.members=(g.members||[]).map(({userId,nickname,status,role,requestedAt,joinedAt})=>({userId,nickname,status,role,requestedAt,joinedAt}));
  result.audit=(g.audit||[]).map(({action,actorName,createdAt,reason})=>({action,actorName,createdAt,reason}));
  result.reports=(g.reports||[]).map(({id,postId,body,authorName,createdAt})=>({id,postId,body,authorName,createdAt}));
  result.inviteUrl=`/groups/${encodeURIComponent(g.id)}?invite=${encodeURIComponent(g.inviteToken)}`;
 }
 return result;
}
export function mutateGroup(previous,user,{operation,input={},now,idFor,inviteToken,invite=''}){
 signed(user);if(previous.isExample)fail('GROUP_EXAMPLE_READ_ONLY');
 const g=structuredClone(previous),viewer=groupViewer(g,user),own=g.ownerId===user.id||admin(user),manager=viewer.canManage;
 const member=groupMember(g,user),requireOwn=()=>{if(!own)fail('GROUP_FORBIDDEN');},requireManager=()=>{if(!manager)fail('GROUP_FORBIDDEN');},requireActive=()=>{if(g.status!=='approved')fail('GROUP_REVIEW_REQUIRED');if(!viewer.canWrite)fail('GROUP_MEMBERS_ONLY');};
 const reason=(required=false)=>text(input.reason??'',500,required),audit=(action,why='')=>{g.audit.push({action,actorId:user.id,actorName:nameOf(user),createdAt:now,...(why?{reason:why}:{})});};
 const findPost=()=>{const p=g.posts.find(p=>p.id===input.postId&&!p.deleted);if(!p||p.hidden&&!manager)fail('GROUP_NOT_FOUND');return p;};
 let activity=false;
 switch(operation){
  case 'review':{
   if(!admin(user))fail('GROUP_FORBIDDEN');if(g.status!=='pending')fail('GROUP_REVIEW_REQUIRED');
   if(!['approve','reject'].includes(input.decision))fail('GROUP_INPUT_INVALID');g.reviewReason=reason(input.decision==='reject');g.status=input.decision==='approve'?'approved':'rejected';
   if(g.status==='approved'){const owner=g.members.find(m=>m.userId===g.ownerId);owner.status='active';owner.role='owner';owner.joinedAt=owner.joinedAt||now;g.approvedAt=now;}
   audit('review-'+input.decision,g.reviewReason);break;
  }
  case 'settings':{
   requireOwn();const next=settings(input,g);if(g.status==='closed')fail('GROUP_REVIEW_REQUIRED');
   if(g.status==='approved'&&(next.name!==g.name||next.category!==g.category)){next.status='pending';next.reviewReason='모임 이름·분류 변경으로 재승인 대기 중입니다.';}
   if(input.coverImageId!==undefined){if(input.coverImageId&&!g.assets.some(a=>a.id===input.coverImageId&&a.purpose==='cover'))fail('GROUP_IMAGE_INVALID');next.coverImageId=input.coverImageId;}
   Object.assign(g,next);audit('settings');break;
  }
  case 'resubmit':requireOwn();if(g.status!=='rejected')fail('GROUP_REVIEW_REQUIRED');g.status='pending';g.reviewReason='';audit('resubmit');break;
  case 'close':requireOwn();if(g.status!=='approved')fail('GROUP_REVIEW_REQUIRED');g.status='closed';audit('close',reason(true));break;
  case 'join':{
   if(g.status!=='approved')fail('GROUP_REVIEW_REQUIRED');if(input.privacyAccepted!==true)fail('GROUP_INPUT_INVALID');
   if(g.visibility==='invite'&&invite!==g.inviteToken&&!['pending','active'].includes(member?.status))fail('GROUP_INVITE_INVALID');
   if(member?.status==='removed')fail('GROUP_FORBIDDEN');if(active(member)||member?.status==='pending')break;
   const entry={userId:user.id,nickname:nameOf(user),status:'pending',role:'member',requestedAt:now,joinedAt:'',notify:true,lastSeenAt:now,consentAt:now,consentVersion:'groups-171'};
   if(member)Object.assign(member,entry);else g.members.push(entry);audit('join-request');break;
  }
  case 'leave':{
   if(g.ownerId===user.id)fail('GROUP_OWNER_TRANSFER_REQUIRED');if(!member||!['pending','active'].includes(member.status))fail('GROUP_FORBIDDEN');member.status='left';member.role='member';member.notify=false;member.leftAt=now;audit('leave');break;
  }
  case 'member':{
   requireManager();requireActive();const target=g.members.find(m=>m.userId===input.userId),decision=input.decision;
   if(!target||target.userId===g.ownerId||!['approve','reject','remove','promote','demote'].includes(decision))fail('GROUP_FORBIDDEN');
   if(!own&&(target.role!=='member'||['promote','demote'].includes(decision)))fail('GROUP_FORBIDDEN');
   if(['approve','reject'].includes(decision)){if(target.status!=='pending')fail('GROUP_INPUT_INVALID');target.status=decision==='approve'?'active':'rejected';if(target.status==='active')target.joinedAt=now;}
   if(decision==='remove'){if(!['active','pending'].includes(target.status))fail('GROUP_INPUT_INVALID');target.status='removed';target.role='member';target.notify=false;}
   if(['promote','demote'].includes(decision)){if(!active(target))fail('GROUP_INPUT_INVALID');target.role=decision==='promote'?'moderator':'member';}
   audit('member-'+decision,reason(decision==='remove'));break;
  }
  case 'transfer':{
   requireActive();requireOwn();const target=g.members.find(m=>m.userId===input.userId&&active(m));if(!target||target.userId===g.ownerId)fail('GROUP_INPUT_INVALID');g.members.find(m=>m.userId===g.ownerId).role='member';target.role='owner';g.ownerId=target.userId;g.ownerName=target.nickname;audit('transfer');break;
  }
  case 'post':{
   requireActive();const old=input.postId?findPost():null,kind=input.kind||old?.kind||'post';
   if(!['post','gallery','notice'].includes(kind))fail('GROUP_INPUT_INVALID');if(kind==='notice'&&!manager)fail('GROUP_FORBIDDEN');
   if(old&&old.authorId!==user.id&&!(manager&&old.kind==='notice'&&kind==='notice'))fail('GROUP_FORBIDDEN');
   const ids=input.imageIds??old?.images.map(a=>a.id)??[];if(!Array.isArray(ids)||ids.length>6||new Set(ids).size!==ids.length)fail('GROUP_IMAGE_INVALID');
   const images=ids.map(id=>{const asset=g.assets.find(a=>a.id===id&&a.purpose==='gallery');if(!asset||(asset.createdBy!==user.id&&!old?.images.some(a=>a.id===id)))fail('GROUP_IMAGE_INVALID');return {id};});
   if(kind==='gallery'&&!images.length)fail('GROUP_IMAGE_INVALID');
   const changes={title:text(input.title,120,true),body:text(input.body??'',10000,kind!=='gallery'),kind,images,updatedAt:now};
   for(const image of images)g.assets.find(a=>a.id===image.id).attached=true;
   if(old)Object.assign(old,changes);else g.posts.unshift({...changes,id:idFor(),authorId:user.id,authorName:nameOf(user),createdAt:now,hidden:false,deleted:false,comments:[]});
   audit(old?'post-edit':'post-create');activity=true;break;
  }
  case 'post-delete':{
   requireActive();const post=findPost();if(post.authorId!==user.id&&!manager)fail('GROUP_FORBIDDEN');const why=reason(post.authorId!==user.id);post.deleted=true;post.title='삭제된 게시글';post.body='';post.images=[];post.comments=[];audit('post-delete',why);break;
  }
  case 'post-hide':{requireActive();requireManager();const post=g.posts.find(p=>p.id===input.postId&&!p.deleted);if(!post)fail('GROUP_NOT_FOUND');if(typeof input.hidden!=='boolean')fail('GROUP_INPUT_INVALID');const why=reason(true);post.hidden=input.hidden;audit('post-hide',why);break;}
  case 'comment':{requireActive();const post=findPost();post.comments.push({id:idFor(),authorId:user.id,authorName:nameOf(user),body:text(input.body,2000,true),createdAt:now});activity=true;break;}
  case 'comment-delete':{requireActive();const post=findPost(),comment=post.comments.find(c=>c.id===input.commentId&&!c.deleted);if(!comment)fail('GROUP_NOT_FOUND');if(comment.authorId!==user.id&&!manager)fail('GROUP_FORBIDDEN');const why=reason(comment.authorId!==user.id);comment.body='';comment.deleted=true;audit('comment-delete',why);break;}
  case 'event':{
   requireActive();requireManager();const old=input.eventId?g.events.find(e=>e.id===input.eventId&&!e.deleted):null;if(input.eventId&&!old)fail('GROUP_NOT_FOUND');
   const changes={title:text(input.title,120,true),body:text(input.body??'',4000),startsAt:date(input.startsAt),place:text(input.place??'',160),updatedAt:now};
   if(old)Object.assign(old,changes);else g.events.push({...changes,id:idFor(),authorId:user.id,authorName:nameOf(user),createdAt:now,rsvps:[]});audit(old?'event-edit':'event-create');activity=true;break;
  }
  case 'event-delete':{requireActive();requireManager();const event=g.events.find(e=>e.id===input.eventId&&!e.deleted);if(!event)fail('GROUP_NOT_FOUND');event.deleted=true;audit('event-delete',reason(true));break;}
  case 'rsvp':{requireActive();const event=g.events.find(e=>e.id===input.eventId&&!e.deleted);if(!event)fail('GROUP_NOT_FOUND');if(!['yes','no'].includes(input.response))fail('GROUP_INPUT_INVALID');const old=event.rsvps.find(r=>r.userId===user.id);if(old)old.response=input.response;else event.rsvps.push({userId:user.id,response:input.response});break;}
  case 'report':{requireActive();const post=findPost();g.reports.push({id:idFor(),postId:post.id,body:text(input.body,1000,true),authorId:user.id,authorName:nameOf(user),createdAt:now});break;}
  case 'notify':{requireActive();if(!member||typeof input.enabled!=='boolean')fail('GROUP_INPUT_INVALID');member.notify=input.enabled;break;}
  case 'read':{requireActive();if(!member)break;member.lastSeenAt=now;break;}
  case 'invite-reset':requireActive();requireOwn();g.inviteToken=inviteToken;audit('invite-reset');break;
  default:fail('GROUP_INPUT_INVALID');
 }
 if(activity){g.lastActivityAt=now;if(member)member.lastSeenAt=now;}
 g.audit=g.audit.slice(-200);g.updatedAt=now;g.version=previous.version+1;
 return g;
}
export function canReadGroupImage(g,user,asset){
 const viewer=groupViewer(g,user),related=g.ownerId===user?.id||admin(user),member=groupMember(g,user);
 if(!asset)return false;
 if(!['approved','closed'].includes(g.status))return related&&asset.purpose==='cover';
 if(g.visibility==='invite'&&!active(member)&&!related)return false;
 if(asset.purpose==='cover'&&asset.id===g.coverImageId)return true;
 if(!viewer.canRead)return false;
 const references=g.posts.filter(p=>!p.deleted&&p.images.some(a=>a.id===asset.id));
 if(references.length)return references.some(p=>!p.hidden||viewer.canManage);
 if(asset.attached)return false;
 // Newly uploaded assets are previewable before being attached; removed assets are not.
 return viewer.canManage||viewer.canWrite&&asset.createdBy===user?.id;
}
