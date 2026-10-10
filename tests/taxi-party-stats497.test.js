import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPartyStats,loadPartyStats} from '../src/ui/taxi-party-stats.js';
import {renderTaxiResearchTabs,renderTaxiPersonStats} from '../src/views/taxi-person.js';

test('party comparison includes none in denominator and keeps first responses separate',()=>{
  const result=renderPartyStats({ok:true,version:'v1',responses:10,none:4,firstResponses:4,firstNone:1,parties:[{id:'a',name:'가정당',selected:6,firstSelected:3,shown:10,firstShown:4}],questions:[{id:'q1',domain:'경제',title:'정책 문항',responses:5,none:2,firstResponses:2,firstNone:1,parties:[{id:'a',name:'가정당',selected:3,firstSelected:1,shown:5,firstShown:2}]}]});
  assert.match(result,/60\.0%/);
  assert.match(result,/40\.0%/);
  assert.match(result,/75\.0%/);
  assert.match(result,/25\.0%/);
  assert.match(result,/50\.0%/);
  assert.match(result,/첫 응답 · 2건 기준/);
  assert.match(result,/응답 수는 참여 인원 수가 아닙니다/);
});

test('zero results are distinct from loading and failed requests; public text is escaped',()=>{
  const data={ok:true,version:'<v>',responses:0,parties:[{name:'<img onerror=x>',selected:0}],questions:[{id:'q',title:'<script>x</script>'}]};
  const result=renderPartyStats(data);
  assert.match(result,/아직 기록된 응답이 없습니다/);
  assert.doesNotMatch(result,/<script>|<img onerror/);
  assert.doesNotMatch(result,/NaN|Infinity|0\.0%/);
  assert.match(result,/&lt;script&gt;/);
  assert.match(renderPartyStats(),/aria-busy="true"/);
  assert.match(renderPartyStats(null),/불러오지 못했습니다/);
});

test('public loader uses aggregate endpoint without reading a personal session and fails closed',async t=>{
  let request;
  t.mock.method(globalThis,'fetch',async (...args)=>{request=args;return {ok:true,json:async()=>({ok:true,parties:[],questions:[]})};});
  assert.equal((await loadPartyStats()).ok,true);
  assert.equal(request[0],'/api/v3/taxi/party-stats');
  assert.equal(request[1].headers,undefined);
  globalThis.fetch=async()=>({ok:false,json:async()=>({ok:true,parties:[],questions:[]})});
  assert.equal(await loadPartyStats(),null);
  globalThis.fetch=async()=>{throw new Error('offline');};
  assert.equal(await loadPartyStats(),null);
});

test('research tabs preserve safe routing and the existing editable politician hero',()=>{
  const tabs=renderTaxiResearchTabs('person/a','party');
  assert.match(tabs,/person%2Fa\?tab=taxi&amp;research=party/);
  assert.match(tabs,/aria-current="page"><span>02/);
  const original=renderTaxiPersonStats({registered:false,canEdit:true},{id:'a',name:'정치인'});
  assert.match(original,/taxi-person-name-row/);
  assert.match(original,/택시정보가 없습니다/);
});
