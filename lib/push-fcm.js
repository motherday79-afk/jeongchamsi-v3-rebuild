import {createSign} from 'node:crypto';
let cached=null;
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
export function firebaseConfigured(env=process.env){return !!env.JCS_FIREBASE_SERVICE_ACCOUNT;}
export async function sendFcm(token,payload,{fetch=globalThis.fetch,env=process.env,now=Date.now}={}){
 let account;try{account=JSON.parse(env.JCS_FIREBASE_SERVICE_ACCOUNT||'');}catch{throw Error('PUSH_NOT_CONFIGURED');}
 if(!/^[a-z][a-z0-9-]{4,62}$/.test(account.project_id||'')||!account.client_email||!account.private_key)throw Error('PUSH_NOT_CONFIGURED');
 if(!cached||cached.email!==account.client_email||cached.expires<now()+60000){
  const stamp=Math.floor(now()/1000),body=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:stamp,exp:stamp+3600});
  const signer=createSign('RSA-SHA256');signer.update(body);const assertion=body+'.'+signer.sign(account.private_key,'base64url');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});
  const auth=await response.json();if(!response.ok||!auth.access_token)throw Error('PUSH_AUTH_FAILED');
  cached={email:account.client_email,token:auth.access_token,expires:now()+Math.min(Number(auth.expires_in)||3600,3600)*1000};
 }
 const response=await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,{method:'POST',headers:{authorization:`Bearer ${cached.token}`,'content-type':'application/json'},body:JSON.stringify({message:{token,data:payload,android:{priority:'high',ttl:'86400s',collapse_key:payload.eventId}}}),signal:AbortSignal.timeout(10000)});
 if(!response.ok){let body;try{body=await response.json();}catch{}const error=Error('PUSH_SEND_FAILED');error.code=body?.error?.details?.some(d=>d.errorCode==='UNREGISTERED')?'UNREGISTERED':'SEND_FAILED';throw error;}
 return {ok:true};
}
