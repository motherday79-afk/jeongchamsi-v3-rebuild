import test from 'node:test';
import assert from 'node:assert/strict';
import {newMine,applyMineAction,publicMine} from '../lib/mining-engine.js';
import {migrateCampaign} from '../lib/mining-campaign.js';
test('costumes save separately per character without charging or altering mining upgrades',()=>{
 const s=newMine(0);s.gold=77;s.pick=7;
 const costume={top:'classic',bottom:'alternate',head:'none',gloves:'classic',boots:'none'};
 applyMineAction(s,{action:'costume',character:'strong',costume},0);
 assert.deepEqual(publicMine(s,0).costumes.strong,costume);assert.equal(s.gold,77);assert.equal(s.pick,7);
 applyMineAction(s,{action:'character',character:'elf'},0);assert.equal(s.costumes.elf,undefined);
 assert.throws(()=>applyMineAction(s,{action:'costume',character:'elf',costume:{...costume,base:'none'}},0),/MINE_COSTUME/);
 assert.throws(()=>applyMineAction(s,{action:'costume',character:'glamour',costume:{...costume,top:'<script>'}},0),/MINE_COSTUME/);
 assert.throws(()=>applyMineAction(s,{action:'costume',character:'glamour',costume:{...costume,top:'none'}},0),/MINE_COSTUME_BASE/);
 applyMineAction(s,{action:'costume',character:'elf',costume:{...costume,top:'none',bottom:'none'}},0);
 s.campaignId='old';migrateCampaign(s,{id:'next'},100);assert.deepEqual(s.costumes.strong,costume);
});
