정참시 JCS 0.0.31 Redis 용량 핫픽스입니다.

적용 파일:
  lib/intelligence-repository.js

추가 검증 파일:
  tests/intelligence-redis-capacity.test.js

핵심 동작:
- 현재 공개 중인 스냅샷은 보존합니다.
- 현재 수집 중인 스냅샷과 150/542 같은 진행 커서도 보존합니다.
- 이전 수집/배포 과정에서 Redis에 누적된 오래된 대용량 intelligence draft/published/raw/validation/rankings 키만 정리합니다.
- version/revision/history 메타데이터는 삭제하지 않습니다.
- UI/진단/처방/랭킹 산식은 건드리지 않습니다.

배포 후 관리자 수집 화면에서 기존 작업을 이어서 실행하면 됩니다.
