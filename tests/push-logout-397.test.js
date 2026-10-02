import test from 'node:test';
import assert from 'node:assert/strict';
import {revokeLogoutPush} from '../lib/push-logout.js';
test('browser logout preserves native update and group registrations',async()=>{
 const calls=[];
 await revokeLogoutPush({headers:{'user-agent':'SamsungBrowser Android'}},'admin',{revoke:async(...a)=>calls.push(['native',...a])},{revoke:async(...a)=>calls.push(['group',...a])});
 assert.deepEqual(calls,[['group','admin',{kind:'web'}]]);
});
test('native logout revokes native registrations and leaves browser subscriptions alone',async()=>{
 const calls=[];
 await revokeLogoutPush({headers:{'user-agent':'Android JCSAndroid/1.1.345'}},'admin',{revoke:async(...a)=>calls.push(['native',...a])},{revoke:async(...a)=>calls.push(['group',...a])});
 assert.deepEqual(calls,[['native','admin'],['group','admin',{kind:'native'}]]);
});
