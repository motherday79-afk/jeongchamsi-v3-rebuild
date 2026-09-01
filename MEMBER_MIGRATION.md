# MEMBER MIGRATION — JCS_0_0_2

이식 대상:
- id
- name / nickname
- email / phone
- 지역 / 출생연도 / 선호정당
- role (member / partner / admin)
- status
- createdAt / updatedAt
- 기존 scrypt passwordHash
- 회원별 활동 데이터

제외:
- 기존 로그인 쿠키
- 기존 세션 토큰
- NOW/분석 캐시
- HISTORY
- 기존 런타임 임시값

회원 ID를 변경하지 않으므로 게시물 ownerId, 댓글 ownerId, 투표/활동 연결이 유지됩니다.
