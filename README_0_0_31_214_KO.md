# JCS 0.0.31.214 · 폴리마블 실제 적용용 새 배경 교체 패치

## 적용 목적
- 새로 정리한 폴리마블 배경 이미지를 실제 게임 화면에 교체 적용
- 전략카드 영역의 기존 placeholder/잔상 노출 제거
- TODAY RANKING 영역의 기존 겹침용 가림 레이어 제거

## 포함 파일
- assets/polimable/polimable-background-1200x675-v31-205.png
- css/polimable-201.css
- src/views/polimable-page.js
- src/ui/polimable-interactions.js

## 적용 내용
1. 기존 배경 이미지 대신 새로 정리된 1200×675 배경 이미지로 교체
2. 전략카드 영역은 배경에 placeholder를 남기지 않고, 실제 카드를 획득했을 때만 흰 카드 객체가 보이도록 변경
3. TODAY RANKING 영역은 배경이 직접 흰 패널과 워터마크를 담당하고, UI는 랭킹 텍스트만 올리도록 단순화
4. 빈 카드/빈 랭킹의 임시 텍스트(EMPTY, —) 제거

## 적용 방법
- 정참시 현재 풀버전 기준으로 같은 경로에 그대로 덮어쓰기
- 배포 후 /polimable 화면에서 새 배경과 전략카드/랭킹 영역 표시 상태 확인
