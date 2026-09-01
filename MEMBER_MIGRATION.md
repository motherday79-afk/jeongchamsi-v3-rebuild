# 기존 회원 데이터 이식 규칙

유지: 회원 ID, 닉네임, 이메일, 권한, 가입일, 프로필, 호환 가능한 passwordHash.
제외: 세션 쿠키, 로그인 토큰, Redis 캐시, 임시 인증값.

입력 예시:
[
  {"userId":"legacy-user-1","displayName":"기존회원","email":"member@example.com","role":"member","createdAt":"2026-01-01T00:00:00.000Z","passwordHash":"..."}
]

실제 운영 회원 export를 확보한 뒤 `normalizeLegacyMembers()` -> `auth.importMembers()` 순서로 넣습니다.
