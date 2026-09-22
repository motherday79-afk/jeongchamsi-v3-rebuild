import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const U=new URL('../src/core/polimable-hud-layout.js',import.meta.url);
test('layout module exists',()=>assert.ok(fs.existsSync(U)));
if(fs.existsSync(U)){
const m=await import(U);
test('14 independent valid HUD elements',()=>{let d=m.defaults();assert.equal(Object.keys(d.items).filter(k=>/^p[12]\./.test(k)).length,14);assert.deepEqual(m.validate(d),d);});
test('reject invalid schema / foreign board / extra keys / invalid sizes',()=>{for(const f of [d=>d.board='old',d=>d.items.extra={},d=>d.items['p1.cash'].x=NaN,d=>d.items['p1.profile'].h=20,d=>d.items['p1.name'].color='url(evil)']){let d=m.defaults();f(d);assert.throws(()=>m.validate(d));}});
test('inverse screen coordinate mapping',()=>assert.deepEqual(m.point(150,100,{left:50,top:50,width:836,height:470.5}),{x:200,y:100}));
test('clamp and square profile',()=>{let d=m.adjust('p1.profile',m.defaults().items['p1.profile'],{x:-1,y:9000,w:90});assert.equal(d.x,0);assert.equal(d.y,851);assert.equal(d.h,d.w);});
}
const server=await import('../lib/polimable-hud-layout-http.js');const model=await import('../src/core/polimable-hud-layout.js');
function store(){let data='';return async a=>{if(a[0]==='GET')return data||null;if(a[0]==='EVAL'){if(data!==a[4])return 0;data=a[5];return 1;}throw Error();};}
const user={id:'test-admin',role:'admin',status:'active'};
const req=(method,body={},origin='https://jeongchamsi.com')=>({method,body,headers:{host:'jeongchamsi.com',origin,'content-type':'application/json'}});
test('non-admin / suspended / foreign origin cannot publish',async()=>{const command=store();for(const u of [null,{role:'member'},{role:'admin',status:'suspended'}])assert.equal((await server.handleLayout(req('POST'),{command,user:u})).status,403);assert.equal((await server.handleLayout(req('POST',{},'https://evil.test'),{command,user})).status,403);});
test('publish, public read, conflict protection, rollback',async()=>{const command=store(),a=model.defaults();a.items['p1.name'].x=220;let r=await server.handleLayout(req('POST',{action:'publish',version:0,layout:a}),{command,user});assert.equal(r.status,200);assert.equal(r.body.version,1);r=await server.handleLayout(req('GET'),{command,user:null});assert.equal(r.body.canEdit,false);assert.equal(r.body.layout.items['p1.name'].x,220);assert.equal((await server.handleLayout(req('POST',{action:'publish',version:0,layout:a}),{command,user})).status,409);r=await server.handleLayout(req('POST',{action:'rollback',version:1}),{command,user});assert.equal(r.body.layout.items['p1.name'].x,190);});
test('storage errors never return success',async()=>assert.equal((await server.handleLayout(req('GET'),{command:async()=>{throw Error()},user:null})).status,503));
