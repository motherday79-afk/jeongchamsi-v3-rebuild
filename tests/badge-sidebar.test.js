import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBadgeShowcase } from '../src/layout/home-layout.js';

test('sidebar badge showcase always renders one representative and three display slots',()=>{
  const html=renderBadgeShowcase({representativeBadge:'first-step',showcaseBadges:['weekman','first-penguin']});
  assert.equal((html.match(/data-badge-slot=/g)||[]).length,4);
  assert.equal((html.match(/data-badge-slot="representative"/g)||[]).length,1);
  assert.equal((html.match(/data-badge-slot="showcase"/g)||[]).length,3);
  assert.equal((html.match(/data-badge-key="first-step"/g)||[]).length,1);
  assert.equal((html.match(/badge-showcase-empty/g)||[]).length,1);
});

test('representative badge is removed from showcase duplicates',()=>{
  const html=renderBadgeShowcase({representativeBadge:'weekman',showcaseBadges:['weekman','first-step','first-penguin','michael']});
  assert.equal((html.match(/data-badge-key="weekman"/g)||[]).length,1);
  assert.equal((html.match(/data-badge-slot="showcase"/g)||[]).length,3);
});
