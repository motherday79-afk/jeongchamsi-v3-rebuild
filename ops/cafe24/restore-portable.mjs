import fs from 'node:fs';import {createHash} from 'node:crypto';import {createClient,RESP_TYPES} from 'redis';
const client=createClient({url:'redis://127.0.0.1:6379/1'}).withTypeMapping({[RESP_TYPES.BLOB_STRING]:Buffer});client.on('error',()=>{});
const {records}=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const dec=v=>v?.b!==undefined?Buffer.from(v.b,'base64'):Array.isArray(v)?v.map(dec):v;
const hash=v=>createHash('sha256').update(JSON.stringify(v,(_,x)=>Buffer.isBuffer(x)?x.toString('base64'):x)).digest('hex');
let restored=0,expired=0,verified=0;
await client.connect();try{
 for(const r of records){const key=Buffer.from(r.key,'base64'),value=dec(r.value);if(r.expires>=0&&r.expires<=Date.now()){expired++;continue;}
  const tx=client.multi().del(key);
  if(r.type==='string')tx.addCommand(['SET',key,value]);
  else if(r.type==='hash')tx.addCommand(['HSET',key,...value]);
  else if(r.type==='list')tx.addCommand(['RPUSH',key,...value]);
  else if(r.type==='set')tx.addCommand(['SADD',key,...value]);
  else if(r.type==='zset'){const args=[];for(let i=0;i<value.length;i+=2)args.push(value[i+1],value[i]);tx.addCommand(['ZADD',key,...args]);}
  else throw new Error('Unsupported type '+r.type);
  if(r.expires>=0)tx.addCommand(['PEXPIREAT',key,String(r.expires)]);await tx.exec();restored++;
  const cmd={string:['GET'],hash:['HGETALL'],list:['LRANGE',0,-1],set:['SMEMBERS'],zset:['ZRANGE',0,-1,'WITHSCORES']}[r.type];
  const actual=await client.sendCommand([cmd[0],key,...cmd.slice(1).map(String)],{typeMapping:{[RESP_TYPES.BLOB_STRING]:Buffer}});
  const normalize=(v,t)=>t==='set'?v.map(x=>x.toString('base64')).sort():t==='hash'?Array.from({length:v.length/2},(_,i)=>[v[i*2].toString('base64'),v[i*2+1].toString('base64')]).sort((a,b)=>a[0].localeCompare(b[0])):v;
  if(hash(normalize(actual,r.type))!==hash(normalize(value,r.type)))throw new Error('Verification mismatch '+JSON.stringify({type:r.type,expectedBuffer:Buffer.isBuffer(value),actualBuffer:Buffer.isBuffer(actual),expectedLength:value?.length,actualLength:actual?.length}));verified++;
 }
 await client.sendCommand(['SAVE']);console.log(JSON.stringify({restored,verified,expired,targetKeys:await client.dbSize()}));
}finally{await client.quit();}
