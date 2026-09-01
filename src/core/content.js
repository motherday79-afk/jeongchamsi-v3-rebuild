const clean=v=>String(v??'').trim();
const clone=v=>JSON.parse(JSON.stringify(v));
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
export function createContentService(store){
  const key=d=>`domain:${d}`;
  return {
    async list(domain){return (await store.get(key(domain),[])).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));},
    async get(domain,itemId){return (await store.get(key(domain),[])).find(x=>x.id===itemId)||null;},
    async create(domain,input={}){const items=await store.get(key(domain),[]);const item={...clone(input),id:input.id||id(),createdAt:input.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};items.push(item);await store.set(key(domain),items);return item;},
    async update(domain,itemId,patch={}){const items=await store.get(key(domain),[]);const idx=items.findIndex(x=>x.id===itemId);if(idx<0)return null;items[idx]={...items[idx],...clone(patch),id:itemId,updatedAt:new Date().toISOString()};await store.set(key(domain),items);return items[idx];},
    async remove(domain,itemId){const items=await store.get(key(domain),[]);const next=items.filter(x=>x.id!==itemId);await store.set(key(domain),next);return next.length!==items.length;},
    async vote(scope,option,voter){const voterKey=clean(voter)||'guest';const votes=await store.get(`votes:${scope}`,{});votes[voterKey]=clean(option);await store.set(`votes:${scope}`,votes);return this.voteResult(scope);},
    async voteResult(scope){const votes=await store.get(`votes:${scope}`,{});return Object.values(votes).reduce((acc,opt)=>{acc[opt]=(acc[opt]||0)+1;return acc;},{});}
  };
}
