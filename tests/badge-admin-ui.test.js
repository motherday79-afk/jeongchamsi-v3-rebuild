import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMemberBadgeManager, renderAdminStable } from '../src/views/stage1.js';

test('admin member manager exposes every badge grouped by tier and explicit save',()=>{
  const user={id:'member',nickname:'회원',role:'member',grantedBadges:['first-penguin'],earnedBadges:['first-step','first-penguin'],eligibleBadges:['content-driver'],representativeBadge:'first-step'};
  const html=renderMemberBadgeManager(user);
  assert.equal((html.match(/data-member-badge=/g)||[]).length,56);
  for(const tier of ['BRONZE','SILVER','GOLD','PLATINUM','BLACK'])assert.match(html,new RegExp(`data-admin-badge-tier="${tier}"`));
  assert.match(html,/data-member-badge-save="member"/);
  assert.match(html,/승인 후보/);
  assert.match(html,/미카엘/);
});

test('admin page lists every member but lazy-renders each 56 badge manager',async()=>{
  const users=Array.from({length:205},(_,index)=>({id:`member-${index}`,nickname:`회원${index}`,role:'member',earnedBadges:[],eligibleBadges:[],grantedBadges:[]}));
  const auth={
    async adminSummary(){return {ok:true,users:{total:users.length,admins:1},contents:{}};},
    async exportMembers(){return users;},
    async intelligenceStatus(){return {sources:{naverSearchAds:{configured:false}}};}
  };
  const html=await renderAdminStable({authenticated:true,user:{id:'admin',role:'admin'}},auth);
  assert.equal((html.match(/data-member-badge-row=/g)||[]).length,205);
  assert.equal((html.match(/data-member-badge-mount/g)||[]).length,205);
  assert.equal((html.match(/data-member-badge=/g)||[]).length,0);
});
