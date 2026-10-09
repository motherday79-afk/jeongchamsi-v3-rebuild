import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyStage,JOURNEY_STAGES,updateTaxiJourney} from '../taxi/journey.js';
import {CHOICE_LINES,FINAL_CHOICE_LINE,GREETING_LINES} from '../lib/taxi-audio.js';
test('five stories follow their own time and weather, pauses and likes never advance it',()=>{
 assert.equal(journeyStage(null),0);assert.equal(journeyStage({phase:'intro',beatIndex:4}),0);
 for(let i=0;i<5;i++){assert.equal(journeyStage({beatIndex:i}),i);assert.equal(journeyStage({beatIndex:i,paused:true,likedBeatIndexes:[i]}),i);assert.equal(journeyStage({beatIndex:i,status:'completed'}),i);}
 assert.deepEqual(JOURNEY_STAGES,['dawn','noon','shower','sunset','night']);
});
test('heartbeat on same story does not restart scenery or duplicate layers',()=>{
 let inserts=0;const label={},scene={dataset:{},querySelector:q=>q==='.journey-sky'?inserts>0:q==='.sky'?{insertAdjacentHTML:()=>inserts++}:label,insertAdjacentHTML:()=>inserts++};
 updateTaxiJourney(scene,{beatIndex:2});assert.equal(scene.dataset.journey,'shower');assert.equal(inserts,2);
 updateTaxiJourney(scene,{beatIndex:2});assert.equal(inserts,2);
 updateTaxiJourney(scene,{phase:'intro',beatIndex:0});assert.equal(scene.dataset.journey,'dawn');assert.equal(inserts,2);
});
test('all choices explain empathy and close respectfully; greetings suit the dawn departure',()=>{
 for(const line of [...CHOICE_LINES,FINAL_CHOICE_LINE]){assert.match(line,/공감으로/);assert.match(line,/내려|내릴/);assert.doesNotMatch(line,/버튼|눌러|누르/);assert.ok(line.endsWith('저는 기사님의 선택을 존중하니까요.'));}
 assert.match(FINAL_CHOICE_LINE,/운행을 마치/);assert.doesNotMatch(FINAL_CHOICE_LINE,/계속 듣기/);
 for(const line of GREETING_LINES)assert.doesNotMatch(line,/비 오는|빗소리|늦게까지|밤이라/);
});
