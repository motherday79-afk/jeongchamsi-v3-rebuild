# JCS 0.0.31.208 — 폴리마블 UI 전면 재구축

## 핵심 변경
- 완성 스크린샷을 게임 배경으로 사용하는 방식 폐기
- scenic-only 배경 자산 신규 생성
- 보드 24칸을 실제 DOM 객체 24개로 구현
- 보이는 칸과 엔진 위치를 1:1 연결
- 현재 위치 표시는 움직이는 미니미 1개만 사용
- 현재 칸 반짝임/테두리/펄스/위치 배지 없음
- 승인 화풍 미니미를 별도 PNG 객체로 분리
- 주사위를 실제 DOM 객체로 구현하고 3D roll animation 추가
- roll animation 종료 후 미니미가 한 칸씩 총총 이동
- SCORE 숫자 overflow 방지 및 자릿수별 크기 대응
- 전략카드 3장 / TODAY-WEEK-ALL 랭킹을 실제 동적 UI로 재구축
- PC 한 화면 플레이
- 모바일 가로모드 844×390 기준 전체 게임 UI 수용
- 모바일 세로모드는 가로 전환 안내

## 보존한 기존 기능
- 서버 주사위
- 24칸 게임 엔진
- 점수 획득/감점/퍼센트 손실
- 전략카드/민심카드/운명의 선택
- 게임오버/기록하고 종료
- Redis 세션 및 TODAY/WEEK/ALL 랭킹

## 검증
- `node --test tests/polimable-201.test.js tests/polimable-208-ui.test.js`
- 결과: 12/12 PASS
- 24개 DOM 타일 확인
- 플레이어 토큰 1개 확인
- 배경에 기존 DESIGN SOURCE / baked game UI 미사용 확인
- active-cell glow/pulse selector 없음 확인
- 주사위 전용 animation 존재 및 `_diceRolling` 실행 경로 확인
- PC 1600×1000 렌더링에서 score panel 내부 overflow 없음 확인
- 모바일 844×390에서 document horizontal overflow 없음 확인

## 주요 파일
- `src/views/polimable-page.js`
- `src/ui/polimable-interactions.js`
- `css/polimable-201.css`
- `assets/polimable/board-scene-only-31-208.webp`
- `assets/polimable/logo-31-208.webp`
- `assets/polimable/player-male-31-208.png`
- `assets/polimable/mascot-31-208.png`
- `tests/polimable-208-ui.test.js`
