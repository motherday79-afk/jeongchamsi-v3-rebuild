import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditPersonPage,normalizePersonEditGrant} from '../src/core/person-edit-permissions.js';
import {setPersonEditPermission} from '../lib/person-edit-permissions.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {USERS_CAS_LUA,updateProfile} from '../lib/rebuild-store.js';
import {canAccessAdminEndpoint} from '../src/core/membership.js';
const owner={id:'admin',role:'admin',status:'active'},member={id:'member1',role:'member',status:'active'};
function db(){const map=new Map([[TARGET_KEYS.users,JSON.stringify({admin:owner,member1:member})]]);return {map,command:async a=>{if(a[0]==='GET')return map.get(a[1])||null;if(a[0]==='EVAL'&&a[1]===USERS_CAS_LUA){if((map.get(a[3])||'')!==a[4])return 0;map.set(a[3],a[5]);return 1;}throw Error('UNEXPECTED_COMMAND');}};}
test('grants are scoped, revoked and suspended users cannot edit; no console privileges',()=>{
 const selected={...member,personPageEditing:{scope:'selected',personIds:['p1']}};
 assert.equal(canEditPersonPage(selected,'p1'),true);assert.equal(canEditPersonPage(selected,'p2'),false);
 assert.equal(canEditPersonPage({...selected,status:'suspended'},'p1'),false);
 assert.equal(canEditPersonPage({...member,personPageEditing:{scope:'all'}},'p2'),true);
 assert.equal(canEditPersonPage(member,'p1'),false);assert.equal(canEditPersonPage(owner,'p1'),true);
 assert.equal(canAccessAdminEndpoint(selected,'admin/users'),false);
 assert.throws(()=>normalizePersonEditGrant({scope:'selected',personIds:[]}),/INVALID/);
});
test('only owner can grant or revoke, users cannot self grant with profile update',async()=>{
 const d=db(),lookup=async id=>id==='p1'?{id,name:'정치인'}:null;
 await assert.rejects(setPersonEditPermission(d.command,{id:member.id,scope:'all'},member.id,lookup),/FORBIDDEN/);
 await assert.rejects(setPersonEditPermission(d.command,{id:member.id,scope:'selected',personIds:['missing']},owner.id,lookup),/INVALID_PERSON/);
 await setPersonEditPermission(d.command,{id:member.id,scope:'selected',personIds:['p1']},owner.id,lookup);
 let u=JSON.parse(d.map.get(TARGET_KEYS.users)).member1;assert.equal(canEditPersonPage(u,'p1'),true);assert.equal(u.role,'member');assert.equal(u.personPageEditing.updatedBy,'admin');
 await updateProfile(d.command,member.id,{personPageEditing:{scope:'all'}});
 u=JSON.parse(d.map.get(TARGET_KEYS.users)).member1;assert.equal(canEditPersonPage(u,'p2'),false);
 await setPersonEditPermission(d.command,{id:member.id,scope:'off'},owner.id,lookup);
 u=JSON.parse(d.map.get(TARGET_KEYS.users)).member1;assert.equal(canEditPersonPage(u,'p1'),false);assert.equal(u.personEditAudit.length,2);
});
