import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {SERVICE_CATALOG,serviceNavIconSvg} from '../src/ui/service-icons.js';
for(const route of ['/groups','/groups/example-group-politics?tab=posts','/groups/example-group-culture?tab=gallery','/groups/example-group-social?tab=events'])test(`real app renders ${route} with read-only fictional groups`,()=>{
 const child=spawnSync(process.execPath,[new URL('./helpers/groups-startup.mjs',import.meta.url).pathname,new URL('../src/app.js',import.meta.url).href,route],{encoding:'utf8',timeout:10000});
 assert.equal(child.status,0,child.stderr||child.error?.message);assert.match(child.stdout,/integration passed/);
});
test('group menu uses its own material people icon and a stable groups route',()=>{const item=SERVICE_CATALOG.find(x=>x.key==='groups');assert.equal(item.href,'/groups');assert.equal(item.shortLabel,'모임');const svg=serviceNavIconSvg('groups');assert.match(svg,/linearGradient/);assert.match(svg,/circle/);assert.doesNotMatch(svg,/jcs-gold-159/);});

test('login returns to an invited group and rejects outside-feature redirects',async()=>{
 const {groupLoginReturn}=await import('../src/core/group-routing.js');
 const route='/groups/group-one?invite=token-secret&tab=posts';
 assert.equal(groupLoginReturn('/login?return='+encodeURIComponent(route)),route);
 assert.equal(groupLoginReturn('/login?return='+encodeURIComponent('https://evil.example/groups')),'');
 assert.equal(groupLoginReturn('/login?return='+encodeURIComponent('/groups/../admin')),'');
 assert.equal(groupLoginReturn('/login?return='+encodeURIComponent('//evil.example/groups')),'');
 assert.equal(groupLoginReturn('/login?return='+encodeURIComponent('/groups?view=mine')),'/groups?view=mine');
});
