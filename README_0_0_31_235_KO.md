# JCS 0.0.31.235 · POLIMARBLE HUD ALIGN PATCH

## 목적
31.234까지 적용된 폴리마블 게임 플레이 테스트에서 다음 UI 정렬 문제를 보정합니다.

1. 전략카드 영역이 실제 배경의 4칸 슬롯과 맞지 않던 문제
2. 1P / 2P 패널의 이름 · 민심(보유 포인트) · 바퀴수/자산 표시 위치 불일치
3. TODAY RANKING 3개 행이 배경의 3개 랭킹 바와 정확히 맞지 않던 문제

## 이번 패치 핵심
- 전략카드 표시 슬롯을 `3칸 -> 4칸`으로 변경
- 보유 가능 전략카드 최대치도 `3장 -> 4장`으로 확장
- 1P / 2P HUD 텍스트를 패널 내부 실제 빈 영역 기준으로 재배치
- TODAY RANKING 3행을 배경 바 중심선에 맞게 재배치
- 기존 보드 배경 이미지는 교체하지 않음
- 기존 캐릭터 이동 / 주사위 / AI 턴 로직은 유지

## 수정 파일
- `css/polimable-201.css`
- `src/ui/polimable-interactions.js`
- `src/views/polimable-page.js`
- `src/app.js`
- `index.html`
- `tests/polimable-235-hud-align.test.mjs`

## 확인 포인트
1. 좌하단 전략카드 슬롯이 4칸으로 정확히 정렬되는지
2. 1P / 2P 패널 내 텍스트가 각 패널의 우측/좌측 정보 라인에 정확히 들어가는지
3. TODAY RANKING의 1/2/3행이 배경 랭킹 바 안쪽에 맞춰 보이는지
4. 기존 주사위 굴리기와 캐릭터 이동이 그대로 동작하는지
