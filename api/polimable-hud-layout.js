import {rebuildRedisCommand} from '../lib/redis-rest.js';
import {readSessionToken} from '../lib/session.js';
import {getUser} from '../lib/rebuild-store.js';
import {handleLayout} from '../lib/polimable-hud-layout-http.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{const command=rebuildRedisCommand();let user=null;
  const c=String(req.headers?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('jcsr2_session='));
  if(c){let token='';try{token=decodeURIComponent(c.slice(14));}catch{}const s=readSessionToken(token,String(process.env.JCS_REBUILD_SESSION_SECRET||''));if(s){const u=await getUser(command,s.userId);if(u&&u.status!=='suspended'&&Number(s.sessionVersion)===(Number(u.sessionVersion)||0))user=u;}}
  const r=await handleLayout(req,{command,user});res.statusCode=r.status;res.end(JSON.stringify(r.body));
 }catch{res.statusCode=503;res.end(JSON.stringify({ok:false,error:'STORAGE_UNAVAILABLE'}));}
}
