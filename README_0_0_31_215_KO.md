# JCS 0.0.31.215 · 폴리마블 백그라운드 제거 패치

적용 대상: 현재 폴리마블 화면

## 목적
- **현재 백그라운드 이미지를 완전히 제거**
- **게임 기능(24칸, 게임말, 주사위, 점수, 전략카드, 랭킹 등)은 그대로 유지**

## 반영 내용
1. `css/polimable-201.css`
   - `.pm-background-stage`의 `background-image`를 `none`으로 변경
   - 기능 레이어는 그대로 유지

2. `assets/polimable/polimable-background-1200x675-v31-205.png`
   - 같은 경로/같은 파일명으로 **완전 투명한 1200×675 PNG**로 교체
   - 혹시 남아 있는 참조나 캐시가 있어도 실제 배경이 보이지 않도록 처리

## 포함 파일
- `css/polimable-201.css`
- `assets/polimable/polimable-background-1200x675-v31-205.png`

## 결과
- 백그라운드만 제거됨
- 기능 레이어는 유지됨
