# JCS 0.0.31.247 · 모바일 가로모드 검정화면 HOTFIX

## 원인
31.246에서 모바일 가로모드 진입 시 `calculatePoliMarbleStage()`를 호출했지만 해당 함수를 인터랙션 모듈에서 import하지 않아 ReferenceError가 발생했습니다.
동시에 mobile-fit CSS가 스테이지의 aspect-ratio를 해제해 둔 상태라 JS가 width/height를 설정하기 전에 실행이 중단되면 스테이지 높이가 0으로 붕괴하고, 검정 배경만 남을 수 있었습니다.

## 수정
- `calculatePoliMarbleStage` 정식 import 추가
- 모바일 fit 계산에 try/catch fallback 추가
- JS 초기화 전에 스테이지가 0 높이가 되지 않도록 1672/941 aspect-ratio 유지
- 기존 게임룰 / HUD / AI / 주사위 / 캐릭터 / 오디오 / 백그라운드 변경 없음

## 확인
1. 스마트폰에서 세로 → 가로 회전
2. 보드 전체가 즉시 표시되는지 확인
3. 다시 세로 → 가로 반복
4. 주사위/AI/사운드가 그대로 동작하는지 확인
