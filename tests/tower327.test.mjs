import test from 'node:test';import assert from 'node:assert/strict';
import {towerMotion} from '../mine/tower-motion.js';
test('handle-pivot swing winds up and arcs into ore on every rapid strike',()=>{
 const events=[{at:1200},{at:1340},{at:1480},{at:2700}];
 assert.ok(towerMotion(900,events,160,1).angle<-40);
 assert.ok(towerMotion(1190,events,160,1).angle>10);
 for(const e of events)assert.equal(towerMotion(e.at,events,160,1).angle,20);
 assert.ok(towerMotion(1300,events,160,1).angle<20);
 assert.ok(towerMotion(1200,events,160,.125).drop>towerMotion(1200,events,160,1).drop);
});
