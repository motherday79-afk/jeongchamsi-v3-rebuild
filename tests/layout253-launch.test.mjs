import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const css=fs.readFileSync(new URL('../css/polimable-hud-editor.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../src/ui/polimable-hud-editor.js',import.meta.url),'utf8');
test('launch button is viewport-fixed and high z-index',()=>{assert.match(css,/\.pmle-launch\{position:fixed;/);assert.match(css,/z-index:2147483\d+/);});
test('launch position is derived from board rect',()=>{assert.match(js,/function positionLaunch\(\)/);assert.match(js,/root\.getBoundingClientRect\(\)/);});
test('admin render exposes launch before layout API resolves',()=>{assert.match(js,/root\.dataset\.pmCanEdit==='true'/);assert.match(js,/배치 편집 확인 중/);});
test('launch is repositioned on scroll and viewport changes',()=>{assert.match(js,/addEventListener\('scroll',positionLaunch/);assert.match(js,/visualViewport\?\.addEventListener\('resize',positionLaunch/);});
