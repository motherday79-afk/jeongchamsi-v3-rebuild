import test from 'node:test';import assert from 'node:assert/strict';
import {configureNativePushSettings} from '../src/ui/native-push-settings.js';
test('native notification page exposes the app settings without web push support',()=>{
 for(const version of [345,348,383]){
 const nodes=new Map(),root={querySelector(s){if(!nodes.has(s))nodes.set(s,{});return nodes.get(s);}};
 assert.equal(configureNativePushSettings(root,`Android JCSAndroid/1.1.${version}`),true);
 assert.match(nodes.get('.push-actions').innerHTML,/href="jcs-push:\/\/settings"/);
 assert.equal(nodes.get('.push-guide').hidden,true);
 }
});
test('ordinary browsers retain web push controls',()=>{
 assert.equal(configureNativePushSettings({querySelector(){throw Error('must not mutate');}},'Android SamsungBrowser Chrome'),false);
});
