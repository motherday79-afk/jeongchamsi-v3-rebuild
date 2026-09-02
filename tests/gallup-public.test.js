import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGallupReport, findLatestGallupReportUrl } from '../lib/gallup-public.js';

test('Gallup public report parser preserves party and centrist figures',()=>{
  const text='<h1>데일리 오피니언 제664호(2026년 5월 3주)</h1><p>정당 지지도: 더불어민주당 45%, 국민의힘 22%, 개혁신당 3%, 조국혁신당 2%, 무당(無黨)층 26%</p><p>중도층에서는 더불어민주당 43%, 국민의힘 15%, 특정 정당을 지지하지 않는 유권자가 34%다.</p>';
  const result=parseGallupReport(text,'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1643');
  assert.equal(result.partySupport['더불어민주당'],45);
  assert.equal(result.partySupport['국민의힘'],22);
  assert.equal(result.centrist['더불어민주당'],43);
  assert.equal(result.undecided,26);
});

test('latest Gallup report is discovered from its own report list',()=>{
  assert.equal(findLatestGallupReportUrl('<a href="reportContent.asp?seqNo=1643">최신</a>'),'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1643');
});
