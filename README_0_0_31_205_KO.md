# JCS 0.0.31.205 · 폴리마블 백그라운드 전용 적용

## 적용 기준
- 31.204 위에 덮어쓰기
- `/polimable` PC 기준 화면: 정확히 **1200 × 675px**

## 이번 변경
- 기존 게임 보드/주사위/점수/전략카드/랭킹/캐릭터 DOM 렌더링 제거
- 참고이미지를 잘라 붙인 것이 아니라 새로 만든 디자인 이미지를 **1200 × 675px**로 제작해 배경으로 적용
- `/polimable`에는 현재 **백그라운드 디자인만** 노출
- 기존 게임 로직 파일/API/Redis 데이터는 삭제하지 않고 그대로 보존 (화면에서만 비노출)
- 홈 우측 사이드바는 기존 승인된 폴리마블 바로가기 이미지를 유지

## 변경 파일
- `index.html`
- `src/app.js`
- `src/layout/home-layout.js`
- `src/views/polimable-page.js`
- `css/polimable-201.css`
- `assets/polimable/polimable-background-1200x675-v31-205.png`
