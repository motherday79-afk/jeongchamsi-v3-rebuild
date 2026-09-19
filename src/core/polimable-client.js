const requestId=()=>globalThis.crypto?.randomUUID?.()||`pm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
async function request(path,options={}){const res=await fetch(`/api/v3/polimable/${path}`,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));return {status:res.status,...data};}
const post=(path,input={})=>request(path,{method:'POST',body:JSON.stringify({...input,requestId:input.requestId||requestId()})});
export function createPoliMarbleClient(){return {
 leaderboard:(scope='today')=>request(`leaderboard?scope=${encodeURIComponent(scope)}`),
 start:()=>post('start'),
 resume:sessionId=>request(`session?sessionId=${encodeURIComponent(sessionId)}`),
 roll:sessionId=>post('roll',{sessionId}),
 choice:(sessionId,option)=>post('choice',{sessionId,option}),
 card:(sessionId,cardId)=>post('card',{sessionId,cardId}),
 cashout:(sessionId,initials)=>post('cashout',{sessionId,initials})
};}
