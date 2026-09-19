# JCS 0.0.31.207 — 폴리마블 객체형 UI 재구축

## 작업 목적
31.205/31.206에서 사용했던 '완성 스크린샷을 배경으로 깔고 실제 UI를 위에 덮는 방식'을 폐기했습니다.
31.207은 게임의 모든 조작 요소를 실제 객체로 구현합니다.

## 유지한 것
- 기존 서버 게임 엔진
- 서버 주사위 판정
- 24칸 이동 규칙
- 점수 획득/손실
- 전략카드/민심카드/운명의 선택
- 0점 GAME OVER
- 기록하고 종료
- TODAY/WEEK/ALL Redis 랭킹
- 로그인/세션 연동
- 한 칸씩 이동하는 총총 이동 시퀀스

## 완전히 재구축한 것
- 게임보드 24칸: 24개의 실제 DOM 객체
- 현재 위치: 움직이는 미니미 이미지 1개만 표시
- 주사위: 실제 동적 주사위 객체
- 민심 SCORE/최고기록
- 계속 도전/기록하고 종료 버튼
- 전략카드 3장
- 랭킹 5행
- PC 게임 레이아웃
- 모바일 가로모드 전용 레이아웃

## 현재 위치 표시 원칙
- 칸 반짝임 없음
- 칸 테두리 강조 없음
- active pulse 없음
- 현재 칸 번호 배지 추가 없음
- 현재 위치는 미니미 1개로만 표시
- 이동 중에는 미니미 자체만 짧게 총총 뛰는 애니메이션

## 그래픽 원칙
승인된 JCS 폴리마블 디자인은 분위기/세계관 기준으로 유지하되,
완성 화면 전체를 UI 이미지로 사용하지 않습니다.

정적인 풍경만 scenic asset으로 사용하고 아래 항목은 모두 실제 UI 객체입니다.
- 24칸
- 플레이어
- 주사위
- 점수
- 버튼
- 전략카드
- 랭킹

## 추가 자산
- assets/polimable/board-scene-31-207.webp
  - 승인 시안에서 풍경 영역만 사용하기 위한 scenic reference
- assets/polimable/player-male-31-207.png
  - 승인 시안 화풍에서 분리한 실제 이동용 미니미

## PC 검수
- 1440×900 viewport 렌더링
- 게임 stage: 1200×675.34
- 실제 24칸 확인
- 플레이어 객체 1개 확인
- 한 화면 내 보드/주사위/점수/카드/랭킹 확인

## 모바일 가로 검수
- 844×390 viewport 렌더링
- 게임 stage: 844×390 전체 화면
- 실제 24칸 확인
- 플레이어 객체 1개 확인
- document scrollWidth = 844 / innerWidth = 844
- 가로 오버플로 없음
- 세로모드는 가로모드 안내만 표시

## 테스트
PASS:
- node --check src/app.js
- node --check src/views/polimable-page.js
- node --check src/ui/polimable-interactions.js
- tests/polimable-201.test.js
- tests/polimable-no-highlight-206.test.js
- 폴리마블 관련 테스트 10/10 PASS

전체 npm test는 원본 FULL에 node_modules가 포함되어 있지 않아
@vercel/blob, @vercel/nft를 필요로 하는 일부 기존 테스트가 로드 단계에서 실패합니다.
폴리마블 변경과 직접 관련된 테스트는 모두 통과했습니다.

## 주요 수정 파일
- index.html
- src/app.js
- src/layout/home-layout.js
- src/ui/polimable-interactions.js
- src/views/polimable-page.js
- css/polimable-201.css
- tests/polimable-no-highlight-206.test.js
- assets/polimable/board-scene-31-207.webp
- assets/polimable/player-male-31-207.png
