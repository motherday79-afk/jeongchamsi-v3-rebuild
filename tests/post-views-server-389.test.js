import test from 'node:test';import assert from 'node:assert/strict';import {findPublishedPost,recordContentView,handleAction} from '../api/gateway.js';
function memoryCommand(seed={}){
  const values=new Map(Object.entries(seed));
  const calls=[];
  const command=async args=>{
    calls.push(args);
    const [op,...rest]=args;
    if(op==='GET')return values.get(rest[0])??null;
    if(op==='SET'){values.set(rest[0],rest[1]);return 'OK';}
    if(op==='MGET')return rest.map(key=>values.get(key)??null);
    if(op==='EVAL'){
      const [script,keyCount,visitKey,countKey]=rest;assert.match(script,/JCS_POST_VISIT_V2/);assert.match(script,/'NX','EX',600/);if(keyCount!=='2')throw new Error('INVALID_EVAL_KEYS');const current=Number(values.get(countKey)||0);if(values.has(visitKey))return JSON.stringify({ok:true,counted:false,increment:current});values.set(visitKey,'1');const next=current+1;values.set(countKey,String(next));return JSON.stringify({ok:true,counted:true,increment:next});
    }
    throw new Error(`UNSUPPORTED_${op}`);
  };
  return {command,values,calls};
}

test('published post re-entry counts for members, authors and guests; same visit retry does not',async()=>{
  const seed={'jcsr2:content:v1:community':JSON.stringify({items:[{id:'post-1',ownerId:'author',published:true,views:0},{id:'hidden',ownerId:'author',published:false,views:0}]})};
  const {command,values,calls}=memoryCommand(seed),viewer={id:'viewer',role:'member'},author={id:'author',role:'member'};
  assert.ok(await findPublishedPost(command,'community','post-1'));
  assert.equal(await findPublishedPost(command,'community','hidden'),null);
  assert.equal((await recordContentView(command,viewer,'community','post-1')).counted,true);
  assert.equal((await recordContentView(command,viewer,'community','post-1')).counted,true);
  assert.equal((await recordContentView(command,author,'community','post-1')).counted,true);
  assert.equal((await recordContentView(command,null,'community','post-1','guest-visit-1')).counted,true);
  assert.equal((await recordContentView(command,null,'community','post-1','guest-visit-1')).counted,false);
  assert.equal((await recordContentView(command,null,'community','hidden','guest-visit-2')).error,'POST_NOT_FOUND');
  assert.equal((await recordContentView(command,null,'community','post-1','bad')).error,'INVALID_VISIT');
  assert.equal(JSON.parse(values.get('jcsr2:content:v1:community')).items[0].views,0);
  assert.equal([...values.entries()].find(([key])=>key.includes('view-count'))?.[1],'4');
  assert.ok(calls.some(args=>args[0]==='EVAL'));
});

test('legacy viewer sets no longer suppress repeat views and historical totals remain intact',async()=>{
  const viewedPosts=['community:target',...Array.from({length:1001},(_,index)=>`community:filler-${index}`)];
  const {command,values}=memoryCommand({
    'jcsr2:content:v1:community':JSON.stringify({items:[{id:'target',ownerId:'author',published:true,views:7}]}),
    'jcsr2:useractivity:v1:viewer':JSON.stringify({viewedPosts}),
    'jcsr2:viewers:v1:community:target':JSON.stringify(['viewer']),
    'jcsr2:view-count:v1:community:target':'1'
  });
  const result=await recordContentView(command,{id:'viewer',role:'member'},'community','target');
  assert.equal(result.counted,true);assert.equal(result.views,9);
  assert.equal(JSON.parse(values.get('jcsr2:content:v1:community')).items[0].views,7);
});

test('public post-view endpoint accepts guests but other actions require login',async()=>{
 const {command}=memoryCommand({'jcsr2:content:v1:news':JSON.stringify({items:[{id:'n',views:6}]})});
 const response=()=>({setHeader(){},end(s){this.body=JSON.parse(s);}});
 const res=response();await handleAction({method:'POST',headers:{},body:{action:'post-view',payload:{domain:'news',postId:'n',visitId:'public-visit-1'}}},res,command);assert.equal(res.statusCode,200);assert.equal(res.body.views,7);
 const denied=response();await handleAction({method:'POST',headers:{},body:{action:'post-like',payload:{domain:'news',postId:'n'}}},denied,command);assert.equal(denied.statusCode,401);
 const cross=response();await handleAction({method:'POST',headers:{'sec-fetch-site':'cross-site'},body:{action:'post-view',payload:{domain:'news',postId:'n',visitId:'public-visit-2'}}},cross,command);assert.equal(cross.statusCode,403);
});
