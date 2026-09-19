# JCS 0.0.31.216 · 폴리마블 새 백그라운드 적용 패치

적용 대상: 31.215(백그라운드 제거 상태) 이후

## 목적
- 승인된 새 폴리마블 백그라운드 이미지를 실제 게임 화면 배경으로 등록
- 기존 기능(24칸, 게임말, 주사위, 민심 SCORE, 전략카드, TODAY RANKING 등)은 그대로 유지
- 기능 레이어가 백그라운드 앞에 오도록 유지

## 포함 파일
- `css/polimable-201.css`
- `assets/polimable/polimable-background-1200x675-v31-205.png`

## 반영 내용
1. `.pm-background-stage`에 새 배경 이미지 등록
2. 배경 파일 경로는 기존 구조 유지:
   - `/assets/polimable/polimable-background-1200x675-v31-205.png`
3. 게임 기능 레이어는 기존 z-index 구조를 유지하여 배경 앞에 표시

## 적용 방법
- 현재 정참시 폴리마블 버전에 그대로 덮어쓰기
- 배포 후 `/polimable`에서 새 배경 + 기존 기능 노출 상태 확인
