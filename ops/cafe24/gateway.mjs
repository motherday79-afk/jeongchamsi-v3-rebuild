import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
const allowed=new Set('PING GET MGET SET SETEX PSETEX SETNX DEL UNLINK EXISTS EXPIRE PEXPIRE EXPIREAT PEXPIREAT TTL PTTL INCR INCRBY DECR DECRBY HGET HGETALL HVALS HSET HDEL HMGET HMSET HINCRBY HEXISTS HLEN SADD SREM SMEMBERS SISMEMBER SCARD LPUSH RPUSH LRANGE LTRIM LPOP RPOP LLEN ZADD ZREM ZRANGE ZREVRANGE ZRANGEBYSCORE ZREVRANGEBYSCORE ZCARD ZSCORE ZINCRBY ZREMRANGEBYSCORE SCAN EVAL EVALSHA'.split(' '));
export function createStorageServer({token,command}){
 if(!token)throw new Error('STORAGE_TOKEN_REQUIRED');
 const expected=Buffer.from(`Bearer ${token}`);
 return http.createServer(async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if(req.url!=='/redis'||req.method!=='POST')return reply(404,{error:'NOT_FOUND'});
  const actual=Buffer.from(req.headers.authorization||'');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply(401,{error:'UNAUTHORIZED'});
  try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024)return reply(413,{error:'PAYLOAD_TOO_LARGE'});chunks.push(chunk);}
   let args;try{args=JSON.parse(Buffer.concat(chunks).toString());}catch{return reply(400,{error:'INVALID_JSON'});}
   if(!Array.isArray(args)||!args.length||args.some(v=>typeof v!=='string'&&typeof v!=='number'))return reply(400,{error:'INVALID_COMMAND'});
   if(!allowed.has(String(args[0]).toUpperCase()))return reply(403,{error:'COMMAND_FORBIDDEN'});
   try{return reply(200,{result:await command(args.map(String))});}catch(error){return reply(503,{error:/OOM/i.test(error.message)?'OOM storage capacity':'STORAGE_COMMAND_FAILED'});}
  }catch{return reply(400,{error:'INVALID_REQUEST'});}
 });
}
