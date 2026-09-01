# JCS_0_0_2 — 1회 데이터 이식 실행

Vercel 새 프로젝트에 아래 환경변수를 설정합니다.

## 기존 정참시 저장소(읽기 원본)
- `JCS_LEGACY_REDIS_REST_URL`
- `JCS_LEGACY_REDIS_REST_TOKEN`

## 새 정참시 저장소(쓰기 대상)
- Vercel Redis: `JCS_REBUILD_REDIS_REDIS_URL`
- 또는 Upstash REST:
- `JCS_REBUILD_REDIS_REST_URL`
- `JCS_REBUILD_REDIS_REST_TOKEN`

## 인증/이식 보호키
- `JCS_REBUILD_SESSION_SECRET` : 충분히 긴 랜덤 문자열
- `JCS_MIGRATION_SECRET` : 1회 이식 화면에서 입력할 별도 랜덤 문자열

배포 후:
1. `#/migration` 이동
2. `JCS_MIGRATION_SECRET` 입력
3. **이식 실행**
4. 성공 후 기존 관리자 ID/비밀번호로 로그인
5. `#/admin`에서 회원/콘텐츠 개수 확인

## 이식되는 콘텐츠 도메인
- columns
- community
- itsme
- polls
- generation
- nationalEvaluation
- academy
- comments

## 이식되지 않는 데이터
NOW, keywords, trending, politicianPhotos, 정치인 분석, Refresh, HISTORY.

## 안전장치
게시물 ownerId / 댓글 ownerId / 댓글 postId 관계가 끊어진 상태라면 이식은 실패하고 원본과 새 저장소를 덮어쓰지 않습니다.
