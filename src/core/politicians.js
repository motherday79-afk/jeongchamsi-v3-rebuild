async function request(path){
  const response=await fetch(`/api/v3/politicians${path}`,{credentials:'same-origin',headers:{Accept:'application/json'}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)return {ok:false,status:response.status,error:body.error||'POLITICIAN_REQUEST_FAILED'};
  return body;
}

export function createPoliticianService(){
  return {
    list(type='assembly',offset=0,limit=30){return request(`?type=${encodeURIComponent(type)}&offset=${Math.max(0,Number(offset)||0)}&limit=${Math.max(1,Number(limit)||30)}`);},
    rankings(){return request('?ranking=overall');},
    search(query='',limit=12){return request(`?q=${encodeURIComponent(String(query||'').trim())}&limit=${Math.min(50,Math.max(1,Number(limit)||12))}`);},
    get(id=''){return request(`?id=${encodeURIComponent(id)}`);},
    getForCompare(id=''){return request(`?id=${encodeURIComponent(id)}&view=compare`);}
  };
}
