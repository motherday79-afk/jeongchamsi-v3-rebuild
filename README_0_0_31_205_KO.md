# JCS 0.0.31.205 · POLIMARBLE DESIGN SOURCE OF TRUTH DIRECT APPLY

## 목적
31.204의 폴리마블 게임 엔진/Redis/랭킹/카드/순차 이동은 그대로 유지하고,
사용자가 승인한 폴리마블 게임 화면을 **DESIGN SOURCE OF TRUTH 자체로 직접 사용**합니다.

## 핵심 변경
- `assets/polimable/DESIGN_SOURCE_OF_TRUTH_31_205.webp`를 게임 화면의 실제 비주얼 베이스로 사용
- CSS로 승인안을 다시 그리거나 재해석하지 않음
- 24개 실제 이동 좌표를 승인 보드 위에 직접 배치
- 플레이 미니미만 실제 현재 위치를 따라 이동
- 점수/주사위/전략카드/랭킹/버튼은 승인 화면의 정확한 영역에 실제 UI로 오버레이
- PC에서는 승인안의 16:9 가로 구성을 한 화면에 유지
- 모바일은 **가로모드 전용 게임 화면**으로 사용하며 PC 화면을 세로로 쌓지 않음
- 모바일 세로모드에서는 가로회전 안내만 표시

## 보존
- 서버 주사위
- 24칸 게임 엔진
- 총총총 순차 이동
- 점수/감점/퍼센트 손실
- 전략카드
- 운명의 선택
- 게임오버
- 기록하고 종료
- TODAY/WEEK/ALL Redis 랭킹

## 주요 파일
- `assets/polimable/DESIGN_SOURCE_OF_TRUTH_31_205.png`
- `assets/polimable/DESIGN_SOURCE_OF_TRUTH_31_205.webp`
- `src/views/polimable-page.js`
- `css/polimable-201.css`
- `src/ui/polimable-interactions.js`
- `src/app.js`
- `index.html`

## 금지
이후 폴리마블 UI 수정 시 승인 이미지를 참고용으로 재해석하지 않습니다.
게임 로직이 필요한 위치에 동적 요소만 오버레이합니다.
