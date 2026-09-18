# JCS 0.0.31.186 AI PANEL 긴급 수정 패치

적용 기준: 31.185(3CLICK) 또는 그 이전 31.182 이상.
기존 프로젝트를 삭제하지 말고 이 패치의 파일만 동일 경로에 덮어쓰세요.

## 수정사항
1. AI 응답 choice 호환
- very_positive / very_negative 자동 허용
- very-positive / very-negative 기존 형식도 유지
- 관리자 업로드에서 1,000개 수, ID 순서, 중복, 응답값을 각각 별도로 검사
- 오류 시 실제 문제 유형과 개수를 표시

2. 리얼미터 최신조사 수집 보강
- 1차: 리얼미터 RSS
- 2차: 리얼미터 공식 홈페이지
- 3차: 공식 사이트 장애 시 에너지경제신문의 '에너지경제·리얼미터 정기 여론조사' 공개자료로 자동 우회
- 가장 최근 1건만 사용

3. 게시 흐름
- 리얼미터 수집 실패만으로 게시를 막지 않음
- 비교 가능한 HUMAN 자료 1건 이상 + 정상 AI 1,000개 응답이면 게시 가능

## 변경파일
- src/ui/ai-panel-interactions.js
- src/core/ai-panel-model.js
- lib/human-poll-sources.js
- lib/human-poll-service.js
