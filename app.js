const app = document.querySelector('#app');
const samplePeople = [
  ['김민석','더불어민주당 · 서울','86','+4'],['정청래','더불어민주당 · 서울','82','+2'],['오세훈','국민의힘 · 서울','78','+6'],['한동훈','국민의힘','76','+1'],['이재명','더불어민주당','74','-1'],
  ['박주민','더불어민주당 · 서울','71','+3'],['김동연','더불어민주당 · 경기','69','+5'],['나경원','국민의힘 · 서울','67','+2'],['안철수','국민의힘 · 경기','64','-2'],['조국','조국혁신당','62','+7']
];
const metrics = [['종합 관심',82],['고관여 관심',76],['대중 확산',68],['활동성',89],['이슈 온도',72],['미디어 확산',84],['검색 관심',79],['지속성',65]];
const pulse = [['김민석','+12.4%'],['정청래','+9.8%'],['오세훈','+7.6%'],['한동훈','+6.1%'],['박주민','+4.7%']];
const featureCards = [
  ['◎','시티즌초이스','시민 참여 흐름을 가볍고 직관적으로 확인합니다.'],['▦','세대뽑','세대별 정치 선택의 차이를 한눈에 비교합니다.'],['✦','전국평가제','전국 단위 참여형 평가를 독립된 콘텐츠로 제공합니다.']
];
const itsme = [['정치인 A','국회의원 · 서울'],['정치인 B','광역단체장 · 경기'],['정치인 C','기초단체장 · 부산'],['정치인 D','국회의원 · 대전'],['정치인 E','국회의원 · 광주'],['정치인 F','기초단체장 · 충남']];

function sectionHead(kicker,title,copy=''){return `<div class="section-head"><div class="section-title"><small>${kicker}</small><h2>${title}</h2></div>${copy?`<div class="section-copy">${copy}</div>`:''}</div>`}
function rankCards(){return samplePeople.map((p,i)=>`<article class="rank-card"><span class="rank-num">${i+1}</span><div class="avatar">PHOTO</div><h3>${p[0]}</h3><div class="meta">${p[1]}</div><div class="score-row"><strong>${p[2]}</strong><span>${p[3]}</span></div></article>`).join('')}
function home(){return `
  <span class="demo-ribbon">● LAYOUT FOUNDATION · SAMPLE DATA</span>
  <section class="hero-grid">
    <article class="hero-card"><div class="eyebrow">JCS POLITICAL INTELLIGENCE</div><h1>지금 정치의 흐름을<br>한 화면에서 읽습니다.</h1><p>기존 정참시의 정보 구조는 유지하고, NOW RANK와 LIVE PULSE를 첫 화면의 중심으로 재설계했습니다. 이 단계는 오직 레이아웃 검증용입니다.</p><div class="hero-actions"><button class="btn primary" onclick="location.hash='#/politician'">정치인 상세 보기</button><button class="btn" onclick="location.hash='#/compare'">비교 레이아웃</button></div></article>
    <aside class="pulse-panel"><div class="eyebrow">LIVE PULSE</div><h2>지금 가장 빠르게<br>움직이는 이름</h2><div class="pulse-list">${pulse.map((x,i)=>`<div class="pulse-item"><span class="pulse-rank">0${i+1}</span><span class="pulse-name">${x[0]}</span><span class="pulse-delta">${x[1]}</span></div>`).join('')}</div></aside>
  </section>
  <section class="section">${sectionHead('NOW RANK','지금 가장 주목받는 정치인','공개 화면은 항상 마지막으로 검증·게시된 데이터셋만 보여주는 구조를 전제로 설계합니다.')}<div class="rank-grid">${rankCards()}</div></section>
  <section class="section">${sectionHead('ITS ME','정치인이 직접 만드는 연결','정치인 인증과 참여 콘텐츠가 들어갈 자리를 먼저 정돈했습니다.')}<div class="itsme-grid">${itsme.map((p,i)=>`<article class="person-card"><div class="mini-avatar">${i+1}</div><div><h3>${p[0]}</h3><p>${p[1]}</p></div></article>`).join('')}</div></section>
  <section class="section">${sectionHead('PARTICIPATION','정치를 보는 것에서 참여하는 것으로')}<div class="feature-grid">${featureCards.map(x=>`<article class="feature-card"><div class="feature-icon">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('')}</div></section>
  <section class="section"><div class="compare-strip"><div><div class="eyebrow">COMPARE INTELLIGENCE</div><h3>숫자보다 먼저 차이를 보여주는 비교</h3><p>일반 비교와 관리자 다중 비교가 나중에 같은 레이아웃 시스템 위에서 확장됩니다.</p></div><button class="btn primary" onclick="location.hash='#/compare'">비교 화면 보기</button></div></section>
  <section class="section">${sectionHead('COMMUNITY','주목받는 이야기와 시민의 대화')}<div class="community-grid"><div class="panel"><h3>오늘의 주목</h3><div class="community-list">${['지금 가장 많이 이야기되는 정책 이슈','이번 주 정치인 관심 변화','지역에서 빠르게 확산되는 의제','세대별 선택이 갈린 질문','정참시 칼럼 업데이트'].map((x,i)=>`<div class="community-row"><strong>${x}</strong><small>${120-i*17} 반응</small></div>`).join('')}</div></div><div class="panel"><div class="eyebrow">EDITORIAL</div><h3 style="margin-top:12px">데이터 뒤의 이유를 읽는 칼럼</h3><p style="color:var(--muted);line-height:1.7">정참시의 자체 분석 콘텐츠와 외부 이슈 해설이 들어가는 공간입니다. 기존처럼 메인 정보 흐름을 깨지 않도록 보조 위계로 배치합니다.</p><button class="btn">콘텐츠 전체보기</button></div></div></section>`}

function politician(){return `
  <span class="demo-ribbon">● POLITICIAN DETAIL · LAYOUT SAMPLE</span>
  <section class="page-hero"><div class="profile-photo">JCS ASSET</div><div class="profile-main"><div class="eyebrow">POLITICIAN INTELLIGENCE</div><h1>김민석</h1><div class="profile-meta">국회의원 · 더불어민주당 · 서울 영등포구을</div><div class="rank-pair"><div><small>OVERALL RANK</small><strong>01</strong></div><div><small>CATEGORY RANK</small><strong>01</strong></div></div></div></section>
  <section class="section">${sectionHead('INTELLIGENCE','정참시 핵심 분석 지표','숫자와 시각적 위계를 단순화해 상세 페이지에서 한 번에 읽히도록 구성합니다.')}<div class="metric-grid">${metrics.map(m=>`<article class="metric-card"><span>${m[0]}</span><strong>${m[1]}</strong><div class="metric-bar"><i style="width:${m[1]}%"></i></div></article>`).join('')}</div></section>
  <section class="section">${sectionHead('ANALYSIS TREND','관심과 흐름의 시간축')}<div class="panel"><div class="chart-shell">${[42,58,46,69,62,75,84,72,89,80,92,86].map(v=>`<div class="bar" style="height:${v}%"></div>`).join('')}</div></div></section>
  <section class="section">${sectionHead('AGE · GENDER','세대 · 성별 · AGE×GENDER COHORT ANALYSIS','향후 독립 엔진으로 연결할 영역이며, 이 레이아웃은 어떤 분석 단계가 실패해도 상세 전체가 무너지지 않도록 분리된 카드 구조입니다.')}<div class="panel"><div class="cohort-grid">${['20대 남성','20대 여성','30대 남성','30대 여성','40대 남성','40대 여성','50대 남성','50대 여성','60+ 남성','60+ 여성'].map((x,i)=>`<div class="cohort"><strong>${[61,54,72,68,81,76,74,79,66,71][i]}</strong><small>${x}</small></div>`).join('')}</div></div></section>
  <section class="section"><div class="compare-strip"><div><div class="eyebrow">NEXT ACTION</div><h3>이 정치인을 다른 정치인과 비교</h3><p>상세에서 비교로 자연스럽게 이어지는 기본 사용자 흐름입니다.</p></div><button class="btn primary" onclick="location.hash='#/compare'">비교하기</button></div></section>`}

function compare(){return `
  <div class="compare-header"><div><span class="demo-ribbon">● COMPARE · LAYOUT SAMPLE</span><h1 style="font-size:42px;letter-spacing:-.05em;margin:18px 0 8px">비교하면 차이가 보입니다.</h1><p style="color:var(--muted)">일반 사용자는 2인 비교, 관리자는 3~5인 비교로 확장할 수 있는 공통 레이아웃입니다.</p></div><button class="btn primary">+ 비교 대상 추가</button></div>
  <section class="section"><div class="compare-people">${samplePeople.slice(0,3).map((p,i)=>`<article class="compare-person"><div class="mini-avatar">0${i+1}</div><h3 style="margin:14px 0 5px">${p[0]}</h3><div class="meta">${p[1]}</div><div class="score-row"><strong>${p[2]}</strong><span>NOW</span></div></article>`).join('')}</div></section>
  <section class="section">${sectionHead('COMPARE MATRIX','COMPARE INTELLIGENCE')}<div class="table-wrap"><table class="compare-table"><thead><tr><th>지표</th><th>${samplePeople[0][0]}</th><th>${samplePeople[1][0]}</th><th>${samplePeople[2][0]}</th></tr></thead><tbody>${metrics.map((m,i)=>`<tr><td>${m[0]}</td><td class="${i%3===0?'winner':''}">${m[1]}</td><td class="${i%3===1?'winner':''}">${Math.max(35,m[1]-5+i)}</td><td class="${i%3===2?'winner':''}">${Math.max(30,m[1]-8+i*2)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="section"><div class="panel"><div class="eyebrow">ADMIN EXPANSION READY</div><h3 style="margin-top:12px">관리자 다중 비교를 위한 여유 구조</h3><p style="color:var(--muted);line-height:1.7">후속 기능 단계에서 전략 요약, 세대별 우위, 리스크, 메시지 제안 등을 별도 모듈로 연결할 수 있습니다.</p></div></section>`}

function admin(){const steps=['INIT','COLLECT','NORMALIZE','NOW SCORE','AGE · GENDER','COHORT ANALYSIS','INTELLIGENCE','HISTORY','VALIDATION','PUBLISH'];return `
  <div class="admin-shell"><aside class="admin-sidebar"><h2>JCS ADMIN</h2><div class="admin-menu"><a class="active">Control Center</a><a>NOW Data</a><a>Politicians</a><a>Intelligence</a><a>Compare</a><a>History</a><a>Content</a><a>System</a></div></aside><div class="admin-main">
  <div class="admin-top"><div><div class="eyebrow">ADMINISTRATOR ONLY</div><h1>JCS CONTROL CENTER</h1><p>운영 상태 · 데이터셋 · 리프레시 파이프라인을 한 화면에서 관리합니다.</p></div><button class="btn primary">전체 데이터 새로고침</button></div>
  <div class="admin-grid">${[['PUBLISHED DATASET','JCS-DEMO-001'],['POLITICIANS','543'],['NOW STATUS','READY'],['HISTORY','CONNECTED']].map(x=>`<article class="admin-card"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join('')}</div>
  <section class="section">${sectionHead('REFRESH PIPELINE','작업 단계를 분리해서 보여줍니다','이번 재빌드에서는 한 단계가 실패해도 다른 화면과 Published Dataset이 무너지지 않는 구조를 전제로 합니다.')}<div class="panel"><div class="pipeline">${steps.map((x,i)=>`<div class="pipe-step ${i<4?'done':i===4?'active':''}"><b>${String(i+1).padStart(2,'0')} · ${x}</b><span>${i<4?'DONE':i===4?'RUNNING':'WAITING'}</span></div>`).join('')}</div></div></section>
  <section class="section"><div class="two-col"><div class="panel"><h3>DATASET STATUS</h3>${[['현재 공개 데이터','정상'],['NOW DATA','정상'],['AGE ANALYSIS','대기'],['GENDER ANALYSIS','대기'],['COHORT ANALYSIS','대기'],['HISTORY','연결']].map(x=>`<div class="status-line"><span>${x[0]}</span><span class="status-ok">${x[1]}</span></div>`).join('')}</div><div class="panel"><h3>SYSTEM HEALTH</h3>${[['API ROUTES','READY'],['STORAGE','CHECK'],['ASSET','READY'],['RELEASE GATE','READY']].map(x=>`<div class="status-line"><span>${x[0]}</span><span class="status-ok">${x[1]}</span></div>`).join('')}</div></div></section>
  </div></div>`}

function render(){const route=(location.hash||'#/home').split('?')[0];document.querySelectorAll('.primary-nav a,.mobile-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===route));if(route==='#/politician')app.innerHTML=politician();else if(route==='#/compare')app.innerHTML=compare();else if(route==='#/admin')app.innerHTML=admin();else app.innerHTML=home();window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',render);render();
