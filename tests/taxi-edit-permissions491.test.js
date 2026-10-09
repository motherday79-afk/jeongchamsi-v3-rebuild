import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditTaxiPage,normalizeTaxiEditGrant} from '../src/core/taxi-edit-permissions.js';
import {setTaxiEditPermission} from '../lib/taxi-edit-permissions.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {USERS_CAS_LUA,updateProfile} from '../lib/rebuild-store.js';
import {canAccessAdminEndpoint} from '../src/core/membership.js';
const owner={id:'admin',role:'admin',status:'active'},member={id:'member1',role:'member',status:'active'};
function db(){const map=new Map([[TARGET_KEYS.users,JSON.stringify({admin:owner,member1:member})]]);return {map,command:async a=>{if(a[0]==='GET')return map.get(a[1])||null;if(a[0]==='EVAL'&&a[1]===USERS_CAS_LUA){if((map.get(a[3])||'')!==a[4])return 0;map.set(a[3],a[5]);return 1;}throw Error('UNEXPECTED_COMMAND');}};}
test('grants are scoped, revoked and suspended users cannot edit; no console privileges',()=>{
 const selected={...member,taxiPageEditing:{scope:'selected',personIds:['p1']}};
 assert.equal(canEditTaxiPage(selected,'p1'),true);assert.equal(canEditTaxiPage(selected,'p2'),false);
 assert.equal(canEditTaxiPage({...selected,status:'suspended'},'p1'),false);
 assert.equal(canEditTaxiPage({...member,taxiPageEditing:{scope:'all'}},'p2'),true);
 assert.equal(canEditTaxiPage(member,'p1'),false);assert.equal(canEditTaxiPage(owner,'p1'),true);
 assert.equal(canAccessAdminEndpoint(selected,'admin/users'),false);
 assert.throws(()=>normalizeTaxiEditGrant({scope:'selected',personIds:[]}),/INVALID/);
});
test('only owner can grant or revoke, users cannot self grant with profile update',async()=>{
 const d=db(),lookup=async id=>id==='p1'?{id,name:'정치인'}:null;
 await assert.rejects(setTaxiEditPermission(d.command,{id:member.id,scope:'all'},member.id,lookup),/FORBIDDEN/);
 await assert.rejects(setTaxiEditPermission(d.command,{id:member.id,scope:'selected',personIds:['missing']},owner.id,lookup),/INVALID_PERSON/);
 await setTaxiEditPermission(d.command,{id:member.id,scope:'selected',personIds:['p1']},owner.id,lookup);
 let u=JSON.parse(d.map.get(TARGET_KEYS.users)).member1;assert.equal(canEditTaxiPage(u,'p1'),true);assert.equal(u.role,'member');assert.equal(u.taxiPageEditing.updatedBy,'admin');
 await updateProfile(d.command,member.id,{taxiPageEditing:{scope:'all'}});
 u=JSON.parse(d.map.get(TARGET_KEYS.users)).member1;assert.equal(canEditTaxiPage(u,'p2'),false);
 await setTaxiEditPermission(d.command,{id:member.id,scope:'off'},owner.id,lookup);
 u=JSON.parse(d.map.get(TARGET_KEYS.users)).member1;assert.equal(canEditTaxiPage(u,'p1'),false);assert.equal(u.taxiEditAudit.length,2);
});
