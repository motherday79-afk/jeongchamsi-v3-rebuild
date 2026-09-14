import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {nodeFileTrace} from '@vercel/nft';

test('the traced deployment package starts the real gateway and reads stored homepage data',async t=>{
 const base=new URL('../',import.meta.url).pathname;
 const {fileList}=await nodeFileTrace([path.join(base,'api/gateway.js'),path.join(base,'api/share.js')],{base,processCwd:base,mixedModules:true});
 const bundle=await fs.mkdtemp(path.join(os.tmpdir(),'jcs-server-package-'));
 t.after(()=>fs.rm(bundle,{recursive:true,force:true}));
 for(const file of fileList){await fs.mkdir(path.dirname(path.join(bundle,file)),{recursive:true});await fs.copyFile(path.join(base,file),path.join(bundle,file));}
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('JCS_')));
 const probe=spawnSync(process.execPath,[new URL('./helpers/server-package-probe.mjs',import.meta.url).pathname,bundle],{cwd:bundle,env,encoding:'utf8',timeout:15000});
 assert.equal(probe.status,0,probe.stderr||probe.error?.message);
 assert.match(probe.stdout,/health,banner,community,rankings passed/);
});
