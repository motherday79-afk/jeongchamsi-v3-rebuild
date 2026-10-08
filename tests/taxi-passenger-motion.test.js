import test from 'node:test';
import assert from 'node:assert/strict';
import {passengerPose} from '../taxi/passenger-motion.js';
test('passenger gestures follow speech and settle for decisions, silence and pauses',()=>{
 const state={active:true,playing:true,speaking:true,seconds:1,cues:[{start:0,duration:3},{start:3.2,duration:4}]};
 assert.equal(passengerPose({...state,intro:true}),'greet');
 assert.equal(passengerPose(state),'nod');
 assert.equal(passengerPose({...state,seconds:4}),'explain');
 assert.equal(passengerPose({...state,seconds:3.1}),'rest');
 assert.equal(passengerPose({...state,speaking:false}),'rest');
 assert.equal(passengerPose({...state,playing:false}),'still');
 assert.equal(passengerPose({...state,active:false}),'still');
});
