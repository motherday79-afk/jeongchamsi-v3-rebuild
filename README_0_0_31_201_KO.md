# JCS 0.0.31.201 — 폴리마블 통합 패치

기준: **31.200 위에 그대로 덮어쓰기**.

## 메인 오른쪽 사이드바 순서

`케이지 → 오늘의 운세 → JCS 폴리마블 → 최근 본 정치인`

폴리마블 카드는 게임 전체를 좁은 사이드바에 넣지 않고, TODAY KING / 내 오늘 기록 / GAME START만 보여주는 **게임 입구 카드**로 구현했습니다.

## 게임 페이지

- 경로: `/polimable`
- 24칸 보드
- 민심 점수 1,000점 시작
- 서버 주사위
- 플러스/마이너스/퍼센트 감점/민심카드/운명의 선택/안전지대
- 전략카드 7종, 최대 3장
- STAGE 1~4
- 기록하고 종료
- 기록 보험
- TODAY / WEEK / ALL 랭킹
- TODAY KING
- 새로고침 시 2시간 Redis 세션을 브라우저 sessionStorage의 sessionId로 재연결

## 디자인

사용자가 제공한 플레이 예상 이미지는 **디자인 참고용**으로만 사용했습니다. 이미지를 통째로 배경으로 사용하지 않았고, 실제 클릭 가능한 DOM/CSS 게임 UI로 구현했습니다.

- 치비형 JCS 미니미
- 밝은 하늘/공원/공공청사 분위기
- 파스텔 보드칸
- 퍼플 게임 콘솔
- 말랑한 주사위/전략카드/랭킹 UI
- 모바일 360px 대응

## 서버 권위 / 조작 방지

- `userId`, `nickname`, `score`를 요청 body에서 받지 않음
- 현재 JCS 로그인 세션에서 회원을 판별
- 주사위/점수/카드/선택/기록을 서버에서 처리
- 세션: `polimable:session:{sessionId}` TTL 2시간
- 요청별 requestId를 세션에 최근 12개 보관하여 **동일 요청 재전송 시 중복 점수 반영 방지**
- 랭킹에는 각 기간별 개인 최고점만 반영

## Redis 키

- `polimable:session:{sessionId}`
- `polimable:profile:{userId}`
- `polimable:rank:today:{YYYY-MM-DD}`
- `polimable:rank:week:{YYYY-Www}`
- `polimable:rank:all`

TODAY는 48시간, WEEK는 14일 TTL을 적용합니다.

## 새 파일

- `lib/polimable-engine.js`
- `lib/polimable-service.js`
- `src/core/polimable-data.js`
- `src/core/polimable-client.js`
- `src/views/polimable-page.js`
- `src/ui/polimable-interactions.js`
- `css/polimable-201.css`
- `tests/polimable-201.test.js`

## 수정 파일

- `api/gateway.js`
- `src/app.js`
- `src/layout/home-layout.js`
- `index.html`

## 배포 후 첫 플레이 확인

1. 31.200 위에 이 ZIP을 덮어쓰기
2. Vercel 배포 완료
3. `Ctrl+F5`
4. 오른쪽 사이드바에서 `오늘의 운세` 바로 아래 `JCS 폴리마블` 확인
5. `GAME START` → `/polimable`
6. 로그인 회원으로 게임 시작
7. 주사위 3~5회 플레이
8. `기록하고 종료` → TODAY 랭킹 반영 확인
9. 다시 게임 시작 후 페이지 새로고침 → 이어서 플레이 확인

실제 정당·정치인·정책의 우열을 게임 점수화하지 않으며, 보드 이벤트는 가상 게임 서사입니다.

## 31.201 작업환경 검증 결과

- 수정/신규 JavaScript `node --check`: 통과
- 폴리마블 자동 테스트: **8/8 통과**
- 실제 엔진 플레이 시뮬레이션: **PASS**
  - GAME START → 주사위 이동 → 전략카드 사용 → 운명의 선택(안전/승부수) → STAGE 2 진입 → 기록하고 종료 → TODAY 랭킹 반영
  - 동일 `requestId` 재전송 시 턴/점수 중복 반영 없음 확인
  - 플레이테스트 최종 기록: **4,520점 / TODAY #1** (격리된 테스트 Redis 기준)
- 상세 턴 로그: `PLAYTEST_0_0_31_201.txt`

이 검증은 로컬 격리 저장소와 실제 게임 엔진/서비스 코드 기준입니다. Vercel의 실제 로그인 세션·Upstash Redis·브라우저 UI까지 포함한 마지막 확인은 배포 후 1회 플레이로 완료합니다.
