import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../src/core/store.js';
import { createAuthService } from '../src/core/auth.js';
import { createContentService } from '../src/core/content.js';
import { renderBoard, renderBoardDetail } from '../src/views/stage1.js';

test('member register/login preserves stable member id', async()=>{
  const store=createMemoryStore(); const auth=createAuthService(store);
  const created=await auth.register({id:'user1',password:'pass1234',nickname:'사용자'});
  assert.equal(created.ok,true); assert.equal(created.user.id,'user1');
  await auth.logout(); const login=await auth.login({id:'user1',password:'pass1234'});
  assert.equal(login.ok,true); assert.equal(login.user.id,'user1');
});

test('member import keeps legacy ids', async()=>{
  const store=createMemoryStore(); const auth=createAuthService(store);
  const result=await auth.importMembers([{id:'legacy-7',nickname:'기존회원',role:'member',createdAt:'2026-01-01T00:00:00.000Z'}]);
  assert.equal(result.imported,1); assert.equal((await auth.getMember('legacy-7')).id,'legacy-7');
});

test('board content create/read works for column and community', async()=>{
  const store=createMemoryStore(); const content=createContentService(store);
  const a=await content.create('columns',{title:'칼럼',body:'내용',author:'A'});
  const b=await content.create('community',{title:'글',body:'내용',author:'B'});
  assert.equal((await content.get('columns',a.id)).title,'칼럼');
  assert.equal((await content.list('community'))[0].title,'글');
});

test('poll and generation votes are counted once per voter key', async()=>{
  const store=createMemoryStore(); const content=createContentService(store);
  await content.vote('poll:main','o1','u1'); await content.vote('poll:main','o1','u1');
  await content.vote('generation:20','c1','u1');
  assert.equal((await content.voteResult('poll:main')).o1,1);
  assert.equal((await content.voteResult('generation:20')).c1,1);
});

test('request and partner applications persist', async()=>{
  const store=createMemoryStore(); const content=createContentService(store);
  await content.create('politicianRequests',{name:'홍길동'});
  await content.create('partnerApplications',{name:'파트너',contact:'010'});
  assert.equal((await content.list('politicianRequests')).length,1);
  assert.equal((await content.list('partnerApplications')).length,1);
});

test('board lists details and comments render the authors representative badge beside the nickname',async()=>{
  const item={id:'post-badge',title:'대표배지 글',body:'본문',author:'정참시민',ownerId:'member',representativeBadge:'first-penguin',published:true};
  const comment={id:'comment-badge',author:'댓글회원',ownerId:'member-2',representativeBadge:'opinion-leader',text:'댓글',published:true};
  const content={async list(){return [item]},async get(){return item},async commentsFor(){return [comment]}};
  const list=await renderBoard('community',content,{authenticated:true});
  const detail=await renderBoardDetail('community','post-badge',content,{authenticated:true});
  assert.match(list,/정참시민<\/span><span class="author-representative-badge"[^>]*>[^]*data-badge-key="first-penguin"/);
  assert.match(detail,/댓글회원<\/span><span class="author-representative-badge"[^>]*>[^]*data-badge-key="opinion-leader"/);
});
import { normalizeLegacyMembers } from '../src/core/member-migration.js';
import { updateUserRole } from '../lib/rebuild-store.js';
test('legacy member normalizer keeps id and compatible password hash fields',()=>{
  const rows=normalizeLegacyMembers([{userId:'u-9',displayName:'기존',passwordHash:'abc',role:'admin'}]);
  assert.deepEqual(rows[0],{id:'u-9',nickname:'기존',email:'',role:'admin',createdAt:'',profile:{},passwordHash:'abc'});
});

test('administrator role grants are server persisted and protected from self or last-admin demotion',async()=>{
  let users={admin:{id:'admin',nickname:'관리자',role:'admin'},member:{id:'member',nickname:'회원',role:'member'}};
  const command=async args=>{if(args[0]==='GET')return JSON.stringify(users);if(args[0]==='SET'){users=JSON.parse(args[2]);return 'OK';}throw new Error('UNSUPPORTED');};
  const granted=await updateUserRole(command,'member','admin','admin');
  assert.equal(granted.user.role,'admin');
  assert.equal(granted.user.roleAudit.changedBy,'admin');
  const blocked=await updateUserRole(command,'admin','member','admin');
  assert.equal(blocked.error,'SELF_ADMIN_DEMOTION_FORBIDDEN');
});
