const clean=v=>String(v??'').trim();
const clone=v=>JSON.parse(JSON.stringify(v));
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
async function request(path,options={}){const res=await fetch(`/api/v3/${path}`,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));return {status:res.status,...data};}
function itemsFrom(domain,data){if(Array.isArray(data?.items))return data.items;if(domain==='academy'&&Array.isArray(data?.slots))return data.slots;return [];}

function createRemoteContentService(){
  const readCache=new Map();
  const readDomain=async domain=>{const x=await request(`content?domain=${encodeURIComponent(domain)}`);const data=x.ok?x.data:null;if(data)readCache.set(domain,data);return data;};
  return {
    async points(){return request('points');},
    async myWallet(){return request('points?wallet=1');},
    async memberSummary(){return request('user/dashboard?summary=1');},
    async pointAction(input){return request('points',{method:'POST',body:JSON.stringify(input)});},
    async readDomain(domain){return (await readDomain(domain))||{items:[]};},
    peekDomain(domain){return readCache.get(domain);},
    async list(domain){const data=await readDomain(domain);return itemsFrom(domain,data).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));},
    async get(domain,itemId){await request('action',{method:'POST',body:JSON.stringify({action:'post-view',payload:{domain,postId:itemId}})});const data=await readDomain(domain);return itemsFrom(domain,data).find(x=>String(x.id)===String(itemId))||null;},
    async create(domain,input={}){const x=await request(`content?domain=${encodeURIComponent(domain)}`,{method:'POST',body:JSON.stringify({input})});return x.ok?x.item:{error:x.error,status:x.status};},
    async uploadImage(domain,file,id=''){const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});return request(`content?domain=${encodeURIComponent(domain)}`,{method:'POST',body:JSON.stringify({operation:'upload-image',id,contentType:file.type,base64})});},
    async update(domain,id,input={}){const x=await request(domain==='inquiry'?'inquiries':`content?domain=${encodeURIComponent(domain)}`,{method:'PATCH',body:JSON.stringify({id,input})});return x.ok?x.item:{error:x.error,status:x.status};},
    async remove(domain,id){return request(domain==='inquiry'?'inquiries':`content?domain=${encodeURIComponent(domain)}`,{method:'DELETE',body:JSON.stringify({id})});},
    async createParticipation(domain,input={}){return request('admin/participation',{method:'POST',body:JSON.stringify({operation:'create',domain,input})});},
    async editParticipation(domain,itemId,input,operation='edit'){return request('admin/participation',{method:'POST',body:JSON.stringify({operation,domain,itemId,input})});},
    async featureParticipation(domain,itemId){return request('admin/participation',{method:'POST',body:JSON.stringify({operation:'feature',domain,itemId})});},
    async homeBanner(){const result=await request('home/banner');return result?.ok?result.banner:null;},
    async footerInfo(){const result=await request('site/footer-info');return result?.ok?result.info:{};},
    async saveHomeBanner(input={}){return request('admin/home-banner',{method:'POST',body:JSON.stringify(input)});},
    async vote(scope,option){return request('action',{method:'POST',body:JSON.stringify({action:'vote',payload:{scope,option}})});},
    async voteResult(scope){if(scope.startsWith('poll:')){const id=scope.slice(5),data=await readDomain('polls'),poll=itemsFrom('polls',data).find(x=>String(x.id)===id);return Object.fromEntries((poll?.options||[]).map(o=>[String(o.id),Number(o.votes||0)]));}return {};},
    async like(domain,postId){return request('action',{method:'POST',body:JSON.stringify({action:'post-like',payload:{domain,postId}})});},
    async toggleFavorite(input={}){return request('action',{method:'POST',body:JSON.stringify({action:'favorite-toggle',payload:input})});},
    async favoriteKeys(){return request('user/favorites');},
    async generationVotes(){return request('user/generation-votes');},
    async memberDashboard(){return request('user/dashboard');},
    async listInquiries(){return request('inquiries');},
    async getInquiry(itemId){return request(`inquiries/detail?id=${encodeURIComponent(itemId)}`);},
    async createInquiry(input={}){return request('inquiries',{method:'POST',body:JSON.stringify(input)});},
    async replyInquiry(itemId,body){return request('inquiries/reply',{method:'POST',body:JSON.stringify({id:itemId,body})});},
    async listPoliticianRequests(){return request('politician-requests');},
    async createPoliticianRequest(input={}){return request('politician-requests',{method:'POST',body:JSON.stringify(input)});},
    async updatePoliticianRequest(id,status){return request('politician-requests',{method:'PATCH',body:JSON.stringify({id,status})});},
    async createPartnerApplication(input={}){return request('partner-applications',{method:'POST',body:JSON.stringify(input)});},
    async listPartnerApplications(){return request('partner-applications');},
    async comment(domain,postId,text,options={}){return request('action',{method:'POST',body:JSON.stringify({action:'comment-add',payload:{domain,postId,text,...options}})});},
    async editComment(domain,postId,commentId,text){return request('action',{method:'POST',body:JSON.stringify({action:'comment-edit',payload:{domain,postId,commentId,text}})});},
    async deleteComment(domain,postId,commentId){return request('action',{method:'POST',body:JSON.stringify({action:'comment-delete',payload:{domain,postId,commentId}})});},
    async likeComment(domain,postId,commentId){return request('action',{method:'POST',body:JSON.stringify({action:'comment-like',payload:{domain,postId,commentId}})});},
    async commentsFor(domain,postId){const data=await readDomain('comments');return itemsFrom('comments',data).filter(x=>x.published!==false&&String(x.domain)===String(domain)&&String(x.postId)===String(postId));},
    async academyApply(slotId=''){return request('action',{method:'POST',body:JSON.stringify({action:'academy-apply',payload:{slotId}})});}
  };
}

function createLocalContentService(store){
  const key=d=>`domain:${d}`;
  return {
    async readDomain(domain){const items=await store.get(key(domain),[]);return {items};},
    async list(domain){return (await store.get(key(domain),[])).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));},
    async get(domain,itemId){return (await store.get(key(domain),[])).find(x=>x.id===itemId)||null;},
    async create(domain,input={}){const items=await store.get(key(domain),[]);const item={...clone(input),id:input.id||id(),createdAt:input.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};items.push(item);await store.set(key(domain),items);return item;},
    async update(domain,itemId,patch={}){const items=await store.get(key(domain),[]);const idx=items.findIndex(x=>x.id===itemId);if(idx<0)return null;items[idx]={...items[idx],...clone(patch),id:itemId,updatedAt:new Date().toISOString()};await store.set(key(domain),items);return items[idx];},
    async remove(domain,itemId){const items=await store.get(key(domain),[]);const next=items.filter(x=>x.id!==itemId);await store.set(key(domain),next);return next.length!==items.length;},
    async vote(scope,option,voter){const voterKey=clean(voter)||'guest';const votes=await store.get(`votes:${scope}`,{});votes[voterKey]=clean(option);await store.set(`votes:${scope}`,votes);return {ok:true,result:await this.voteResult(scope)};},
    async voteResult(scope){const votes=await store.get(`votes:${scope}`,{});return Object.values(votes).reduce((acc,opt)=>{acc[opt]=(acc[opt]||0)+1;return acc;},{});},
    async commentsFor(){return [];},
    async toggleFavorite(){return {ok:false,error:'REMOTE_ONLY'};},
    async favoriteKeys(){return {ok:true,favoriteKeys:[]};},
    async memberDashboard(){return {ok:true,favoriteKeys:[],authoredPosts:[],favoritePosts:[],favoritePeople:[]};},
    async listInquiries(){return {ok:true,items:[]};},
    async getInquiry(){return {ok:false,error:'INQUIRY_NOT_FOUND'};},
    async createInquiry(){return {ok:false,error:'REMOTE_ONLY'};},
    async replyInquiry(){return {ok:false,error:'REMOTE_ONLY'};},
    async listPoliticianRequests(){return {ok:true,items:[]};},
    async createPoliticianRequest(){return {ok:false,error:'REMOTE_ONLY'};},
    async updatePoliticianRequest(){return {ok:false,error:'REMOTE_ONLY'};},
    async createPartnerApplication(){return {ok:false,error:'REMOTE_ONLY'};},
    async listPartnerApplications(){return {ok:false,error:'REMOTE_ONLY',items:[]};},
    async footerInfo(){return await store.get('site:footer-info',{});}
  };
}
export function createContentService(store=null){return store?createLocalContentService(store):createRemoteContentService();}

// Navigation loads only the member data consumed by its destination.
export async function loadNavigationDashboard(parts,session,content){
 const empty={favoriteKeys:[],authoredPosts:[],favoritePosts:[],favoritePeople:[]};
 if(!session.authenticated)return empty;
 const [section,item]=parts;
 const full=section==='mypage'&&!['activity','badges','points'].includes(item);
 const detail=section==='person'||(['column','community','news','itsme'].includes(section)&&item&&item!=='write');
 if(!full&&!detail)return empty;
 try{return {...empty,...await (full?content.memberDashboard():content.favoriteKeys())};}catch{return empty;}
}
