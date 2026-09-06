import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGET_KEYS } from '../lib/migration-service.js';
import { authenticateUser, completeRequiredPasswordChange, getUser, resetUserPassword, updateUserByAdmin } from '../lib/rebuild-store.js';

function memoryCommand(seed={}){
  const map=new Map(Object.entries(seed));
  return {map,command:async args=>{
    const op=String(args[0]).toUpperCase();
    if(op==='GET')return map.get(args[1])??null;
    if(op==='SET'){map.set(args[1],args[2]);return 'OK';}
    if(op==='DEL'){let count=0;for(const key of args.slice(1))count+=map.delete(key)?1:0;return count;}
    throw new Error(`UNSUPPORTED_${op}`);
  }};
}

const users={
  admin:{id:'admin',nickname:'관리자',role:'admin',status:'active',passwordHash:'hidden',sessionVersion:0},
  member1:{id:'member1',name:'기존 이름',nickname:'기존닉',email:'old@example.com',role:'member',status:'active',passwordHash:'hidden',sessionVersion:2}
};

test('administrator edits all member profile fields without exposing password material',async()=>{
  const redis=memoryCommand({[TARGET_KEYS.users]:JSON.stringify(users)});
  const result=await updateUserByAdmin(redis.command,{id:'member1',name:'새 이름',nickname:'새닉',email:'new@example.com',phone:'01012345678',birthYear:'1980',regionProvince:'서울',regionCity:'광진구',preferredParty:'없음',status:'suspended',role:'member'},'admin');
  assert.equal(result.ok,true);
  assert.equal(result.user.name,'새 이름');
  assert.equal(result.user.region,'서울 광진구');
  assert.equal(result.user.status,'suspended');
  assert.equal('passwordHash' in result.user,false);
  assert.equal('password' in result.user,false);
});

test('administrator password reset stores only a hash and invalidates existing sessions',async()=>{
  const redis=memoryCommand({[TARGET_KEYS.users]:JSON.stringify(users)});
  const result=await resetUserPassword(redis.command,{id:'member1',temporaryPassword:'Temp-Pass-2026'},'admin');
  assert.equal(result.ok,true);
  assert.equal(result.user.mustChangePassword,true);
  assert.equal(result.user.sessionVersion,3);
  assert.equal('temporaryPassword' in result.user,false);
  const stored=await getUser(redis.command,'member1');
  assert.match(stored.passwordHash,/^scrypt\$/);
  assert.notEqual(stored.passwordHash,'Temp-Pass-2026');
  assert.equal((await authenticateUser(redis.command,'member1','Temp-Pass-2026'))?.mustChangePassword,true);
});

test('member replaces temporary password and clears forced-change state',async()=>{
  const redis=memoryCommand({[TARGET_KEYS.users]:JSON.stringify(users)});
  await resetUserPassword(redis.command,{id:'member1',temporaryPassword:'Temp-Pass-2026'},'admin');
  const changed=await completeRequiredPasswordChange(redis.command,'member1','Permanent-Pass-2026');
  assert.equal(changed.ok,true);
  assert.equal(changed.user.mustChangePassword,false);
  assert.equal(await authenticateUser(redis.command,'member1','Temp-Pass-2026'),null);
  assert.equal((await authenticateUser(redis.command,'member1','Permanent-Pass-2026'))?.id,'member1');
});

test('administrator ID change migrates the activity key and rejects duplicates',async()=>{
  const redis=memoryCommand({
    [TARGET_KEYS.users]:JSON.stringify(users),
    [TARGET_KEYS.activity('member1')]:JSON.stringify({favorites:['assembly-001']})
  });
  const changed=await updateUserByAdmin(redis.command,{id:'member1',nextId:'member2'},'admin');
  assert.equal(changed.ok,true);
  assert.equal(changed.user.id,'member2');
  assert.equal(redis.map.has(TARGET_KEYS.activity('member1')),false);
  assert.deepEqual(JSON.parse(redis.map.get(TARGET_KEYS.activity('member2'))).favorites,['assembly-001']);
  const duplicate=await updateUserByAdmin(redis.command,{id:'member2',nextId:'admin'},'admin');
  assert.equal(duplicate.error,'DUPLICATE_ID');
});
