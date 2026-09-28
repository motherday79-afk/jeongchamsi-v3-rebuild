import {createClient} from 'redis';
import {createStorageServer} from './gateway.mjs';
const client=createClient({url:'redis://127.0.0.1:6379/1',username:'jcsapp',password:process.env.JCS_REDIS_PASSWORD,socket:{connectTimeout:5000}});
client.on('error',()=>console.error('Redis connection unavailable'));
await client.connect();
const server=createStorageServer({token:process.env.JCS_STORAGE_TOKEN,command:args=>client.sendCommand(args)});
server.listen(8787,'127.0.0.1');
process.on('SIGTERM',()=>server.close(async()=>{await client.quit();process.exit(0);}));
