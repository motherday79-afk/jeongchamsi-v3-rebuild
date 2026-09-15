import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGE_ART } from '../src/data/badge-art-map.js';
import { BADGE_CATALOG, renderBadge } from '../src/data/badge-catalog.js';
import { renderBadgeShowcase } from '../src/layout/home-layout.js';
import { authorIdentity } from '../src/views/community-ui.js';
import { renderBadgeCollection, renderMemberBadgeManager } from '../src/views/stage1.js';

test('all catalog badges render one accessible artwork crop at distinct sprite locations',()=>{
  assert.equal(BADGE_CATALOG.length,56);
  assert.equal(Object.keys(BADGE_ART).length,56);
  const locations=new Set();
  for(const badge of BADGE_CATALOG){
    const art=BADGE_ART[badge.key];
    assert.ok(art,`${badge.key} has mapped artwork`);
    const location=`${art.sheet}:${art.column}:${art.row}`;
    assert.equal(locations.has(location),false,`${badge.key} has a distinct sprite location`);
    locations.add(location);

    const html=renderBadge(badge.key);
    assert.match(html,new RegExp(`^<span class="jcs-badge jcs-badge--${badge.tier.toLowerCase()}"`));
    assert.ok(html.includes(`data-badge-key="${badge.key}"`));
    assert.ok(html.includes(`role="img" aria-label="${badge.name}"`));
    assert.ok(html.includes(`--jcs-badge-sheet:url(&#39;${art.sheet}&#39;)`));
    assert.ok(html.includes(`--jcs-badge-x:${art.column*100/3}%`));
    assert.ok(html.includes(`--jcs-badge-y:${art.row*100}%`));
    assert.match(html,/<span class="jcs-badge-art" aria-hidden="true"><\/span><\/span>$/);
    assert.doesNotMatch(html,/<svg|<text|badge-crest|badge-gem/i);
  }
  assert.equal(locations.size,56);
});

test('unknown keys are empty and an extra class cannot create markup or attributes',()=>{
  assert.equal(renderBadge('missing-badge'), '');
  const html=renderBadge('citizen-choice','featured" onclick="bad<&');
  assert.match(html,/class="jcs-badge jcs-badge--bronze featured&quot;/);
  assert.doesNotMatch(html,/ onclick="bad/);
  assert.doesNotMatch(html,/<script|<svg/i);
});

test('optional mapped silhouettes clip generated artwork without affecting alpha artwork',()=>{
  const art=BADGE_ART['citizen-choice'];
  const previousClip=art.clip;
  try{
    delete art.clip;
    assert.doesNotMatch(renderBadge('citizen-choice'),/--jcs-badge-clip:/);
    art.clip='polygon(50% 0%, 100% 24%, 88% 100%, 12% 100%, 0 24%)';
    const html=renderBadge('citizen-choice');
    assert.ok(html.includes('--jcs-badge-clip:polygon(50% 0%, 100% 24%, 88% 100%, 12% 100%, 0 24%)'));
  }finally{
    if(previousClip===undefined)delete art.clip;
    else art.clip=previousClip;
  }
});

test('community and layout renderers retain identity, names, and selection state around the new badge',()=>{
  const identity=authorIdentity({author:'민지',representativeBadge:'citizen-choice'});
  assert.match(identity,/author-nickname">민지<\/span>/);
  assert.match(identity,/author-representative-badge/);
  assert.match(identity,/class="jcs-badge jcs-badge--bronze"/);
  assert.match(identity,/aria-label="시민 선택"/);

  const showcase=renderBadgeShowcase({representativeBadge:'citizen-choice'},true,'민지');
  assert.match(showcase,/badge-showcase-filled is-representative/);
  assert.match(showcase,/data-badge-slot="representative"/);
  assert.match(showcase,/class="jcs-badge jcs-badge--bronze"/);
  assert.match(showcase,/>시민 선택<\/small>/);
  assert.match(showcase,/>민지님<\/b>/);

  const status={earnedBadges:['citizen-choice'],eligibleBadges:[],showcaseBadges:[],representativeBadge:'citizen-choice'};
  const collection=renderBadgeCollection(status);
  assert.match(collection,/data-badge-card="citizen-choice"[\s\S]*class="jcs-badge jcs-badge--bronze"/);
  assert.match(collection,/data-badge-representative="citizen-choice">대표 배지<\/button>/);
  assert.match(collection,/<h3>시민 선택<\/h3>/);

  const manager=renderMemberBadgeManager({id:'member-1',earnedBadges:['citizen-choice'],grantedBadges:['citizen-choice'],eligibleBadges:[]});
  assert.match(manager,/value="citizen-choice" checked/);
  assert.match(manager,/class="jcs-badge jcs-badge--bronze"/);
  assert.match(manager,/<b>시민 선택<\/b><small>사용 가능<\/small>/);
});

test('badge styles use only the artwork renderer and its required square sizes',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const badgeCss=fs.readFileSync(path.join(root,'css/badges.css'),'utf8');
  const allCss=fs.readdirSync(path.join(root,'css')).filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join(root,'css',name),'utf8')).join('\n');
  assert.doesNotMatch(allCss,/\.badge-(?:crest|gem)(?:\b|-)/);
  assert.match(badgeCss,/\.jcs-badge\s*\{[^}]*width:88px[^}]*height:88px[^}]*aspect-ratio:1/s);
  assert.match(badgeCss,/\.jcs-badge-art\s*\{[^}]*background-image:var\(--jcs-badge-sheet\)[^}]*background-size:400% 200%[^}]*background-position:var\(--jcs-badge-x\) var\(--jcs-badge-y\)[^}]*pointer-events:none/s);
  assert.match(badgeCss,/\.jcs-badge-art\s*\{[^}]*-webkit-clip-path:var\(--jcs-badge-clip,none\)[^}]*clip-path:var\(--jcs-badge-clip,none\)/s);
  assert.match(badgeCss,/\.badge-collection-card>\.jcs-badge\s*\{[^}]*width:88px[^}]*height:88px/s);
  assert.match(badgeCss,/\.author-representative-badge\s*\{[^}]*width:24px[^}]*height:24px/s);
  assert.match(badgeCss,/\.jc-comment \.author-representative-badge\s*\{[^}]*width:22px[^}]*height:22px/s);
  assert.match(badgeCss,/\.admin-badge-check \.jcs-badge\s*\{[^}]*width:36px[^}]*height:36px/s);
  assert.match(badgeCss,/\.side-badge-showcase \.jcs-badge\s*\{[^}]*width:48px[^}]*height:48px/s);
  assert.match(badgeCss,/\.mypage-badge-row \.jcs-badge\s*\{[^}]*width:44px[^}]*height:44px/s);
  assert.match(badgeCss,/\.mypage-badge-summary \.jcs-badge\s*\{[^}]*width:56px[^}]*height:56px/s);
  assert.match(badgeCss,/@media\s*\(max-width:560px\)[\s\S]*?\.badge-collection-card>\.jcs-badge\s*\{[^}]*width:72px[^}]*height:72px/);

  const shellCss=fs.readFileSync(path.join(root,'css/hotfix-31-36-main-shell-footer.css'),'utf8');
  assert.ok(shellCss.includes('body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}\n/* 31.154: R2 on-device reversal isolated body selection suppression as the\n   mobile tap trigger. Cover touch input at every width, including an unfolded\n   Fold or a device with a mouse. Keep the existing mouse-only desktop policy. */\n@media (any-pointer:coarse),(hover:none){\n body{-webkit-user-select:text;user-select:text}\n}\nbody :is(input,textarea,[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"],[data-allow-copy],.point-bank,.donation-bank,a[href^="mailto:"],a[href^="tel:"]),body :is([contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"],[data-allow-copy],.point-bank,.donation-bank) *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}'));
});
