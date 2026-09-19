# JCS 0.0.31.217 · 폴리마블 백그라운드 적용 오류 수정

## 수정 원인
31.216에서 `.pm-background-stage`에 `background-image`를 지정한 뒤 같은 선언 블록 후반의 `background:transparent` shorthand가 배경 이미지를 다시 초기화하는 문제가 있었습니다.

## 이번 수정
- 승인된 `폴리마블 백그라운드.png`를 정확히 **1200×675px**로 변환
- 새 파일명 `polimable-background-1200x675-v31-217.png` 사용으로 이미지 캐시 충돌 방지
- `background:transparent` shorthand 제거
- CSS 로드 쿼리를 `v=0.0.31.217`로 변경해 브라우저/Vercel 캐시 우회
- 24칸, 게임말, 주사위, 점수, 전략카드, 랭킹 등 기존 기능은 그대로 유지
