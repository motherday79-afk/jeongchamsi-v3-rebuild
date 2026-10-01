import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderWebBroadcast} from '../src/ui/web-broadcast.js';
function worker(){const handlers={},shown=[],opened=[];const self={location:{origin:'https://www.jeongchamsi.com'},addEventListener:(e,f)=>handlers[e]=f,registration:{showNotification:async(...p)=>shown.push(p)},clients:{matchAll:async()=>[],openWindow:async u=>opened.push(u)}};vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{self,URL});return {handlers,shown,opened};}
test('push worker always displays a notification and confines clicks to same-origin',async()=>{
 const f=worker();let done;
 f.handlers.push({data:{json:()=>({title:'정참시',body:'공지',path:'https://evil.com',eventId:'one'})},waitUntil:p=>done=p});await done;
 assert.equal(f.shown[0][1].data.path,'/notifications');
 f.handlers.push({data:{json:()=>{throw Error();}},waitUntil:p=>done=p});await done;assert.equal(f.shown.length,2);
 f.handlers.notificationclick({notification:{close(){},data:{path:'/groups/g1?tab=notifications'}},waitUntil:p=>done=p});await done;assert.equal(f.opened[0],'https://www.jeongchamsi.com/groups/g1?tab=notifications');
});
test('broadcast history escapes untrusted copy and distinguishes acceptance from receipt',()=>{
 const html=renderWebBroadcast({ok:true,eligible:4,history:[{at:Date.now(),title:'<script>',body:'<img>',path:'/x?a=<b>',status:'complete',eligible:4,accepted:3,failed:1,skipped:0}]});
 assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/실제 수신·열람과 다릅니다/);assert.match(html,/data-broadcast-confirm hidden/);
});
