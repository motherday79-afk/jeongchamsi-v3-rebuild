import test from 'node:test';
import assert from 'node:assert/strict';
import {cageTitleFontGeometry} from '../src/core/cage-title-layout.js';

test('one and two lines are centered as a visible ink block inside the top screen',()=>{
 for(const texts of [["'인사청문회'",'게임을 시작해 볼까?'],['지역의 내일','시민이 결정한다'],['정책'],['정책🙂','뀪 토론'],['국민의 내일을 위한 새로운 정치의 시작'],['gyp','대한민국']])for(const emphasis of ['first','second','equal']){
  const lines=cageTitleFontGeometry(texts,emphasis).lines;
  const top=Math.min(...lines.map(l=>l.top)),bottom=Math.max(...lines.map(l=>l.bottom));
  assert.ok(Math.abs((top+bottom)/2-206.5)<.001,`${texts}: actual ink centered on board`);
  assert.ok(top>=64 && bottom<=349);
  for(const line of lines){assert.equal(line.widthScale,1);assert.ok(line.projectedWidth<=995.001);}
  if(lines.length===2)assert.ok(lines[1].top>lines[0].bottom,'visible interline spacing');
 }
});
