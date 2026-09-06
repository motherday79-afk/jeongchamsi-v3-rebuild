'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const script = fs.readFileSync(__dirname + '/../assets/back-layer.js', 'utf8');
let count = 0;
function run(drawer, launcher, close) {
  const doc = {querySelector: s => s === '[data-drawer]' ? drawer : s === '[data-launcher-toggle]' ? launcher : close,
    dispatchEvent: () => {if (drawer) drawer.hidden = true;}};
  return vm.runInNewContext(script, {document: doc, KeyboardEvent: function(){}});
}
assert.equal(run(null, null, null), false); count++;
let drawer = {hidden: false, classList: {contains: () => true}, querySelector: () => ({click: () => drawer.hidden = true})};
assert.equal(run(drawer, null, null), true); assert.equal(drawer.hidden, true); count += 2;
assert.equal(run(drawer, null, null), false); count++;
let expanded = true;
const launcher = {getAttribute: () => String(expanded), click: () => expanded = false};
assert.equal(run(null, launcher, null), true); assert.equal(expanded, false); count += 2;
assert.equal(run(null, launcher, null), false); count++;
drawer = {hidden:false, classList:{contains:()=>true}, querySelector:()=>null};
assert.equal(run(drawer,null,null),true); count++;
console.log('Back-layer: ' + count + ' assertions passed');
