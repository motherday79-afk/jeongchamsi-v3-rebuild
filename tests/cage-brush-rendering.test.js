import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCageBanner} from '../src/ui/home-cage-banner.js';
import {cageTitleGeometry,validateCageTitleLayout} from '../src/core/cage-title-layout.js';

test('approved and changed cage titles both stay editable live lettering',()=>{
 for(const title of ["'인사청문회' 게임을 시작해 볼까?","'케이지메뉴오픈' 이게진짜 싸움이다.",'지역의 내일 시민이 결정한다']){
  const markup=renderCageBanner({title,blue:2,red:1});
  assert.doesNotMatch(markup,/cage-approved-156\.webp/);
  assert.match(markup,/cage-promo-title/);
  assert.match(markup,/cage-template-156\.webp/);
  const letters=[...markup.matchAll(/<text\b[^>]*data-cage-title-line="[^"]+"[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]);
  assert.equal(letters.join(' ').replace(/&#39;/g,"'"),title);
 }
});

test('tilted thick title ink fits the original board for every manual emphasis',()=>{
 for(const title of ["'인사청문회' 게임을 시작해 볼까?","'케이지메뉴오픈' 이게진짜 싸움이다.",'지역의 내일 시민이 결정한다','정책🙂 토론'])for(const emphasis of ['first','second','equal']){
  const layout=validateCageTitleLayout(title,{title,breakAt:Array.from(title).indexOf(' '),emphasis});
  for(const line of cageTitleGeometry(title,layout).lines){
   assert.ok(Number.isFinite(line.projectedWidth));
   assert.ok(line.projectedWidth+8<=1015);
   assert.ok(line.top-4>=84&&line.bottom+6<=366);
  }
 }
});

test('brush uses exact Rock metrics with exact bundled fallback metrics',async()=>{
 const {CAGE_TITLE_WIDTHS,CAGE_TITLE_BOUNDS,CAGE_TITLE_X_BOUNDS}=await import('../src/data/cage-brush-metrics.js');
 // Independently read from original font hmtx and BoundsPen, in em.
 assert.equal(CAGE_TITLE_WIDTHS[47928],.774);
 assert.deepEqual(CAGE_TITLE_BOUNDS[47928],[-.011,.811]);
 assert.deepEqual(CAGE_TITLE_X_BOUNDS[47928],[.016,.774]);
 // Rare Hangul outside Rock's cmap uses the existing East Sea font.
 assert.equal(CAGE_TITLE_WIDTHS[45098],.532);
 assert.deepEqual(CAGE_TITLE_BOUNDS[45098],[-.157,.516]);
 assert.deepEqual(CAGE_TITLE_X_BOUNDS[45098],[.015,.537]);
 assert.match(renderCageBanner({title:'문 뀪'}),/font-family="JCS Cage Rock,JCS Cage Brush,cursive"/);
});

test('saved one-line layout stays one line when the replacement face needs a smaller font size',()=>{
 const title='국민의 내일을 위한 새로운 정치의 시작',layout={title,breakAt:0,emphasis:'equal'};
 const rendered=renderCageBanner({title,titleLayout:layout});
 assert.equal((rendered.match(/data-cage-title-line=/g)||[]).length,1);
 assert.ok(rendered.includes(title));
 const geometry=cageTitleGeometry(title,layout);
 assert.ok(geometry);
 assert.equal(geometry.lines[0].text,title);
 assert.ok(geometry.lines[0].projectedWidth<=995.01);
});
