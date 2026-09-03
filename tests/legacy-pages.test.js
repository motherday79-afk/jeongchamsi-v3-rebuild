import test from 'node:test';
import assert from 'node:assert/strict';

test('president page restores the legacy profile and all decision sections',async()=>{
  const {renderPresidentPage}=await import('../src/views/president.js');
  const html=renderPresidentPage();
  for(const marker of ['이재명','제21대 대통령','주요 경력','선거 기록','국정 비전','핵심 정책','공약','국정과제','리더십','정부 구성'])assert.match(html,new RegExp(marker));
});

test('integrated search groups politician, president and migrated content matches',async()=>{
  const {renderSearchPage}=await import('../src/views/search-page.js');
  const politicians={async search(){return {ok:true,total:1,items:[{id:'assembly-001',name:'이재명',party:'더불어민주당',jurisdiction:'대한민국'}]};}};
  const content={
    async list(domain){return domain==='columns'?[{id:'c1',title:'이재명 리더십',summary:'정치 분석',published:true}]:domain==='community'?[{id:'m1',title:'시민 의견',body:'이재명 관련',published:true}]:[];},
    async readDomain(domain){return domain==='polls'?{items:[{id:'p1',question:'이재명 평가',published:true}]}:domain==='generation'?{candidates:['assembly-001']}:{items:[]};}
  };
  const html=await renderSearchPage({query:'이재명',politicians,content});
  assert.match(html,/검색어: <b>이재명/);assert.match(html,/정치인/);assert.match(html,/대통령 · 정부/);
  assert.match(html,/COLUMN/);assert.match(html,/정뮤니티/);assert.match(html,/시민 설문/);assert.match(html,/세대의 선택/);
  assert.match(html,/data-layout-route="\/person\/assembly-001"/);
});

test('support story uses the approved copy with an emphasized opening and closing',async()=>{
  const {renderAbout}=await import('../src/views/stage1.js');
  const html=renderAbout(),text=html.replace(/<br>/g,'').replace(/<[^>]+>/g,'');
  assert.match(html,/<h2>세계적으로 유명한 배우들도 끊임없이 훈련합니다\.<\/h2>/);
  for(const sentence of [
    '작품을 쉬는 기간에도 호흡과 발성, 효율적인 감정 전달 기법등을 트레이닝 합니다.',
    '정치도 다르지 않다고 생각합니다.',
    '정참시는 정치를 하려는 곳도, 정치인이 되려는 곳도 아닙니다.',
    '정참시는 정참시가 가장 잘하는 일을 하겠습니다.',
    '막대한 양의 데이터를 빠짐없이 수집하고, JCS만의 독자적인 시스템을 통해 분석하고, 시장이 요구하는 신호를 읽어 가장 필요한 순간에 전달하겠습니다.'
  ])assert.match(text,new RegExp(sentence.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,/<strong>대한민국 No\.1 정치 네비게이션 정\.참\.시<\/strong>/);
});
