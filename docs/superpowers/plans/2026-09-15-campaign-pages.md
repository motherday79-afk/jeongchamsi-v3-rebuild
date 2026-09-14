# CAMPAIGN 게시판·상세·더보기 적용 계획

> For agentic workers: use superpowers:subagent-driven-development for the independent view task and review; continue in the preserved source directory.

**Goal:** 승인한 CAMPAIGN 전체보기와 상세페이지를 실제 저장 데이터에 연결하고 더보기 아이콘으로 진입한다.

**Architecture:** 기존 SPA 및 gateway를 유지한다. 캠페인은 별도 Redis 키에 저장하고, 목록에는 가벼운 카드 정보만 전달한다. 공개 스냅샷과 편집 중 초안을 구분하며 게시 이력을 남긴다. 사진은 기존 Vercel Blob에 업로드하고 Redis에는 URL만 저장한다.

**Tech Stack:** 기존 ES modules, Node test runner, Redis 명령/EVAL, Vercel Blob, 현재 SVG 서비스 아이콘.

**Spec:** 사용자 최종 승인 범위: 게시판 생성 / 상세페이지 생성 / 더보기 아이콘 생성 후 연동. DESIGN SOURCE: `/workspace/jcs-campaign-directory.html`, `/workspace/jcs-campaign-preview-readable.html`.

## Global Constraints

- 현재 작업 경로 `/workspace/scratch/b627f5328562/qa161/source-155` 유지. 재체크아웃·이전 작업 초기화 금지.
- 베이스 버전 JCS_0_0_31_156; 결과 157 PATCH/전체 ZIP 제공.
- 기존 메인·오른쪽 배너의 구조, 이미지, 저장 정보 및 동작을 변경하지 않는다.
- 배지 56종, 케이지·응원/후원 이미지, 회원·정치인 기록을 보존한다.
- 가상 시안 인물·정책·사진·후원정보를 실제 데이터로 등록하지 않는다.
- 정치후원 디렉터리, 후원정보 관리자, 결제·정산·수수료, 배너 예약/노출 자동화는 이번 범위에 포함하지 않는다.
- 상세 SUPPORT는 현재 확인된 공식 후원정보가 있을 때만 렌더한다. 이번에는 후원계좌를 새로 수집하거나 등록하는 기능을 만들지 않는다.
- 색상·타이포·배치·간격을 승인 소스에서 유지한다. 어두운 배경의 제목/이름에 흰색을 직접 지정한 수정본 사용.
- 공개 자료가 없으면 준비 중 안내만 표시한다. 미등록 인물 필드·영상·후원정보는 미노출.

## 데이터 계약

`CampaignContent`: headline, accentLine, intro, personId, name, party, office, region, photoUrl, topic, startDate, endDate, whyTitle, whyBody, selectionReason, quote, storyBody, needsBody, policyTitle, policies:[{title,body}], sources:[{label,url}], videoUrl, productionRelation(editorial/commissioned/ad), productionDisclosure, featured(boolean).

`CampaignRecord`: id, version, number(nullable), createdAt, updatedAt, updatedBy, draft:CampaignContent, published:CampaignContent|null, publishedAt, visibility(public/private), endedAt.

공개 상세: 공개 스냅샷 필드 + id, number, state(current/archive), publishedAt, updatedAt. 비공개·공개 전 예약·초안은 일반 조회에 반환하지 않는다. 관리자 `edit=1` 조회만 record를 반환한다.

목록: `{ok,items,featured,counts:{current,archive},total,page,pageSize,hasMore}`. `view=current/archive/manage`; manage는 관리자만. items/featured는 id,number,headline,accentLine,intro,name,party,office,region,photoUrl,topic,startDate,endDate,state만 포함. featured는 current 중 한 건이며 items와 중복하지 않는다. 관리 목록에는 version, 상태, 초안 제목 포함.

서버 API `/api/v3/campaigns`: GET list; GET `?id=&edit=1` record; GET `?id=` 공개 상세; POST/PATCH `{id?,version?,operation:save/publish/hide/end/delete,input?}`. 성공 `{ok,item:record}`. DELETE는 미게시 초안만 허용. 사진 POST `?image=1` `{contentType,base64}` → `{ok,url}`.

클라이언트 `createCampaignClient()`: list({view,page}), get(id,{edit}), save({id,version,operation,input}), upload(file). 쓰기 성공 후 전용 캐시와 navigation snapshot을 무효화한다.

경로: `/campaigns`, `/campaigns?view=archive`, `/campaigns?view=manage`, `/campaigns/write`, `/campaigns/:id`, `/campaigns/:id/edit`.

## Task 1: 실제 캠페인 저장 및 게시 수명 주기

Files: `src/core/campaign-model.js`, `lib/campaign-service.js`, `api/gateway.js`, `tests/campaign-service.test.js`.

- [ ] 먼저 공개/초안 분리, 관리자 권한, KST 종료 경계, 갱신 충돌, 게시번호 고정, 과거 스냅샷 보존 검사 작성.
- [ ] `node --test tests/campaign-service.test.js`로 미구현 실패 확인.
- [ ] 허용 필드 및 URL 검증, 게시 필수 조건, 날짜 판정 모델 구현.
- [ ] Redis 문서 및 카드 인덱스, CAS EVAL 갱신, 게시 시 번호 자동 할당과 이력 저장 구현.
- [ ] 사진은 JPG/PNG/WEBP 최대 2MB, 실제 파일 시그니처 확인 후 Blob 저장. 이전 게시 사진 삭제 금지.
- [ ] gateway 경로와 서버 세션/관리자 검증 연결. 다른 도메인 및 배너 API 변경 금지.
- [ ] 위 검사 재실행 및 API 권한 검사.

## Task 2: 승인 전체보기·상세 디자인을 데이터 렌더러로 전환

Files: `src/views/campaign-pages.js`, `css/campaigns-157.css`, `tests/campaign-pages.test.js`.

Exports: `renderCampaignBoard(result,session={},view='current')`, `renderCampaignDetail(item,session={})`.

- [ ] 필드 미노출, HTML 이스케이프, 아카이브, 더보기 카드 경로 검사 먼저 작성.
- [ ] 승인 HTML CSS를 추출하고 전체보기·상세 DOM의 구조/색/간격 유지. 시안용 탭 JS, 가상 자료, 생성 사진을 제외.
- [ ] 현재 목록과 ARCHIVE는 실제 URL로 전환. 모든 카드 `href` + `data-layout-route`로 상세 진입.
- [ ] 대표 캠페인, 카드 목록, 종료 기록, 관리자 등록/관리 링크, 빈 목록/오류 상태 구현.
- [ ] 등록된 영상/출처만 표시. 지원 안내는 검증된 공식 정보가 있을 때만 표시하고 과거 계좌는 미노출.
- [ ] 고정 폭 736px 이내에서 승인한 2열/모바일 1열 유지. 제목의 흰색 직접 지정 보존.

## Task 3: 등록 편집기·더보기 연결

Files: `src/core/campaign-client.js`, `src/ui/campaign-interactions.js`, `src/views/campaign-editor.js`, `src/app.js`, `src/ui/service-icons.js`, `src/layout/site-shell.js`, `src/layout/home-layout.js`, `index.html`, `src/core/release.js`.

- [ ] 등록 폼은 관리자만. 기존 정치인 자동완성 컴포넌트를 재사용하고 미등록 인물은 최소 프로필 직접 입력 가능.
- [ ] 사진 업로드, 본문/정책/영상/기간, 초안 저장, 게시, 수정, 비공개, 종료, 초안 삭제 연결.
- [ ] 입력 오류 및 저장 충돌 때 작성 내용을 유지한다. 중복 제출 방지.
- [ ] 더보기에 `campaign` / CAMPAIGN 항목 추가. 기존 materialPaint 퍼플·골드로 정책 문서+빛 아이콘 생성. 첫 화면 주요 메뉴 배열은 유지.
- [ ] SPA 직접 URL, 새로고침, 뒤로가기 시 갱신/재연결 검사. 157 CSS와 변경 모듈 캐시 버전 반영.

## Task 4: 검증 및 전달

- [ ] `npm test`; 변경 JS 문법/참조 파일 검사.
- [ ] 승인 CSS와 변경 사항 대조, 색상/누락 필드/배너 불변 검증.
- [ ] 독립 코드 리뷰 후 중요한 문제 수정.
- [ ] 실제 브라우저 검증이 허용되지 않는 환경이면 그 제한을 명시하고 우회하지 않는다.
- [ ] 156+PATCH의 결과와 157 전체 ZIP 바이트 동등성 확인.
- [ ] README에 경로, 관리자 등록 방법, 이번 범위, 미포함 기능, 검사 결과를 기록하고 두 ZIP 저장·제공.
