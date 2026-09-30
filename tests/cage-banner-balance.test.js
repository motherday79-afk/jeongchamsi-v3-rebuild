import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCageBanner} from '../src/ui/home-cage-banner.js';

const widths=html=>[...html.matchAll(/data-cage-energy="(?:progressive|conservative)"[^>]*width="([\d.]+)"/g)].map(match=>Number(match[1]));
test('tied sidebar artwork has equal blue and red areas',()=>{
  const html=renderCageBanner({blue:5,red:5});
  assert.deepEqual(widths(html),[555,555]);
  assert.match(html,/data-cage-energy-share="50"/);
});
test('artwork follows the displayed percentage in either direction',()=>{
  assert.deepEqual(widths(renderCageBanner({blue:3,red:1})),[832.5,277.5]);
  assert.deepEqual(widths(renderCageBanner({blue:1,red:3})),[277.5,832.5]);
  assert.deepEqual(widths(renderCageBanner({blue:0,red:5})),[0,1110]);
  assert.deepEqual(widths(renderCageBanner({blue:5,red:0})),[1110,0]);
});
test('no participation uses neutral artwork and still displays zero percent',()=>{
  const html=renderCageBanner({blue:0,red:0});
  assert.deepEqual(widths(html),[555,555]);
  assert.equal((html.match(/>0%<\/text>/g)||[]).length,2);
});
