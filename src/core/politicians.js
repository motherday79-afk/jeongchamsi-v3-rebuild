async function request(path){
  const response=await fetch(`/api/v3/politicians${path}`,{credentials:'same-origin',headers:{Accept:'application/json'}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)return {ok:false,status:response.status,error:body.error||'POLITICIAN_REQUEST_FAILED'};
  return body;
}

export function createPoliticianService(){
  return {
    profiles(ids=[]){return request(`?ids=${encodeURIComponent([...new Set(ids)].slice(0,100).join(','))}`);},
    list(type='assembly',offset=0,limit=30){return request(`?type=${encodeURIComponent(type)}&offset=${Math.max(0,Number(offset)||0)}&limit=${Math.max(1,Number(limit)||30)}`);},
    trending(offset=0,snapshot=''){return request(`?ranking=trending&offset=${Math.max(0,Number(offset)||0)}&snapshot=${encodeURIComponent(snapshot)}`);},
    keywords(){return request('?keywords=1');},
    rankings(){return request('?ranking=overall');},
    mediaSpread({query='',personId='',publisher='',period='latest'}={}){const params=new URLSearchParams({media:'1',q:query,person:personId,publisher,period});return request(`?${params}`);},
    searchAll(query=''){return request(`?q=${encodeURIComponent(String(query||'').trim())}&all=1`);},
    search(query='',limit=12,offset=0){return request(`?q=${encodeURIComponent(String(query||'').trim())}&limit=${Math.min(50,Math.max(1,Number(limit)||12))}&offset=${Math.max(0,Math.floor(Number(offset)||0))}`);},
    get(id=''){return request(`?id=${encodeURIComponent(id)}`);},
    getForCompare(id=''){return request(`?id=${encodeURIComponent(id)}&view=compare`);}
  };
}
