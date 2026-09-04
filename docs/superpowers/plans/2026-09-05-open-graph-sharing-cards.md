# 정참시 페이지별 Open Graph 공유카드 구현 계획

## 목표

- 공개 URL별 서버 HTML에 최종 Open Graph, Twitter Card, canonical 메타데이터를 넣는다.
- 기존 해시 SPA를 유지하면서 `/person/:id`, `/column/:id`, `/compare?...` 같은 일반 공유 URL을 지원한다.
- 공개 프로필과 공개 게시물 데이터만 사용하고 관리자 인텔리전스는 읽거나 노출하지 않는다.
- 자체 이미지, 섹션 기본 이미지, 메인 기본 이미지 순으로 안전하게 fallback한다.

## 구현 순서

1. `lib/share-metadata.js`에 경로 분류, 공개 데이터 요약, URL·이미지 검증, fallback 정책을 중앙화한다.
2. `api/share.js`가 Redis의 공개 정치인·게시물 데이터만 조회해 완성된 HTML 메타태그를 반환한다.
3. `vercel.json`에서 공개 일반 경로를 `api/share.js`로 rewrite하고 API·정적 자산·기존 SPA 순서를 보존한다.
4. 브라우저가 공유 URL로 들어오면 기존 해시 라우트로 안전하게 연결한다.
5. 1200×630 메인 및 섹션별 기본 PNG를 추가한다.
6. 메인, 정치인, 게시물, 참여 페이지, 비교 및 fallback·보안 테스트를 수행한다.

## 완료 기준

- 크롤러가 JavaScript 없이 페이지별 `og:title`, `og:description`, `og:image`, `og:url`, `og:type`과 Twitter Card를 읽는다.
- canonical과 모든 내부 생성 URL이 `https://www.jeongchamsi.com`을 사용한다.
- 비공개·관리자 필드가 메타데이터에 포함되지 않는다.
- 기존 해시 URL과 신규 일반 URL 모두 같은 SPA 화면으로 진입한다.
