# JCS 0.0.31.246 · POLIMARBLE MOBILE / FOLD LANDSCAPE FIT

## 목적
폴리마블의 승인된 1672×941 논리 캔버스와 모든 내부 좌표를 유지한 채, 스마트폰/폴드 가로 화면에서 게임판 전체를 기기 화면에 맞게 한 덩어리로 균일 확대·축소합니다.

## 핵심 원칙
- 내부 타일/HUD/캐릭터/주사위 좌표를 기기별로 다시 배치하지 않습니다.
- 1672×941 전체 게임 스테이지에 단일 `scale`만 적용합니다.
- 가로·세로를 서로 다른 배율로 늘리지 않습니다. 화면 왜곡 금지.
- 노치/Dynamic Island/홈 인디케이터 영역은 `safe-area-inset-*`을 제외하고 계산합니다.
- 남는 공간은 자연스러운 레터박스로 유지합니다. 보드를 crop하거나 늘리지 않습니다.

## 대응 방식
- 일반 iPhone / Galaxy: 대체로 높이 기준 fit
- iPhone Max / Galaxy Ultra: 동일 알고리즘, 더 큰 실제 표시
- Fold 접힘: 높이 기준 fit + 좌우 여백 허용
- Fold 펼침: 너비 기준 fit + 상하 여백 허용
- 모바일 세로 화면: 게임판 대신 `가로 화면으로 플레이` 안내 표시

## 구현
- `src/core/polimable-viewport.js`
  - 1672×941 기준 단일 fit 계산 함수 추가
- `src/ui/polimable-interactions.js`
  - 모바일/폴드 viewport 감지
  - visualViewport / resize / orientationchange에 맞춰 스테이지 재계산
  - HUD logical canvas도 `scale(x,y)`가 아닌 단일 `scale()` 사용
- `css/polimable-201.css`
  - 모바일 safe-area / 중앙정렬 / 레터박스
  - 기존 모바일 개별 재배치 규칙을 새 mobile-fit 내부에서 무효화
  - 세로모드 안내 UI
- `src/views/polimable-page.js`
  - 세로모드 안내 레이어 추가

## 변경하지 않은 영역
게임룰, 민심 경제, AI, 주사위 확률/동작, 캐릭터 이동, 타일 중심 좌표, 1P/2P HUD 좌표, TODAY RANKING, 전략카드 4칸, 소유마커, BGM/효과음은 변경하지 않습니다.
