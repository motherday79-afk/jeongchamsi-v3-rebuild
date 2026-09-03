const clean=v=>String(v??'').trim();
const clone=v=>JSON.parse(JSON.stringify(v));
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
async function request(path,options={}){const res=await fetch(`/api/v3/${path}`,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));return {status:res.status,...data};}
function itemsFrom(domain,data){if(Array.isArray(data?.items))return data.items;if(domain==='academy'&&Array.isArray(data?.slots))return data.slots;return [];}

function createRemoteContentService(){
  const readCache=new Map();
  const readDomain=async domain=>{const x=await request(`content?domain=${encodeURIComponent(domain)}`);const data=x.ok?x.data:null;if(data)readCache.set(domain,data);return data;};
  return {
    async readDomain(domain){return (await readDomain(domain))||{items:[]};},
    async list(domain){const data=await readDomain(domain);return itemsFrom(domain,data).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));},
    async get(domain,itemId){await request('action',{method:'POST',body:JSON.stringify({action:'post-view',payload:{domain,postId:itemId}})});const data=await readDomain(domain);return itemsFrom(domain,data).find(x=>String(x.id)===String(itemId))||null;},
    async create(domain,input={}){const x=await request(`content?domain=${encodeURIComponent(domain)}`,{method:'POST',body:JSON.stringify({input})});return x.ok?x.item:{error:x.error,status:x.status};},
    async vote(scope,option){return request('action',{method:'POST',body:JSON.stringify({action:'vote',payload:{scope,option}})});},
    async voteResult(scope){if(scope.startsWith('poll:')){const id=scope.slice(5),data=await readDomain('polls'),poll=itemsFrom('polls',data).find(x=>String(x.id)===id);return Object.fromEntries((poll?.options||[]).map(o=>[String(o.id),Number(o.votes||0)]));}return {};},
    async like(domain,postId){return request('action',{method:'POST',body:JSON.stringify({action:'post-like',payload:{domain,postId}})});},
    async comment(domain,postId,text){return request('action',{method:'POST',body:JSON.stringify({action:'comment-add',payload:{domain,postId,text}})});},
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
    async commentsFor(){return [];}
  };
}
export function createContentService(store=null){return store?createLocalContentService(store):createRemoteContentService();}
