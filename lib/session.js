import crypto from 'node:crypto';

const b64=v=>Buffer.from(v).toString('base64url');
const unb64=v=>Buffer.from(v,'base64url').toString('utf8');
const sig=(payload,secret)=>crypto.createHmac('sha256',secret).update(payload).digest('base64url');

export function issueSessionToken(userId,secret,now=Date.now()){
  if(!secret || String(secret).length<16) throw new Error('SESSION_SECRET_MISSING');
  const payload=b64(JSON.stringify({userId:String(userId||'').slice(0,24),iat:now}));
  return `${payload}.${sig(payload,secret)}`;
}

export function readSessionToken(token,secret,now=Date.now(),maxAgeMs=1000*60*60*24*30){
  try{
    if(!secret || !token) return null;
    const [payload,signature,extra]=String(token).split('.');
    if(!payload || !signature || extra) return null;
    const expected=sig(payload,secret);
    const a=Buffer.from(signature),b=Buffer.from(expected);
    if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return null;
    const data=JSON.parse(unb64(payload));
    if(!data?.userId || !Number.isFinite(Number(data.iat))) return null;
    if(now-Number(data.iat)>maxAgeMs || Number(data.iat)>now+60_000) return null;
    return {userId:String(data.userId)};
  }catch{return null;}
}
