JCS 0.0.31 수집 오류 / 전체 게시 비활성화 핫픽스

원인
- 25명 단위 수집 중 일부 정치인 처리 실패가 발생하면 실패 ID가 영구 실패로 기록됩니다.
- 전체 처리 후 job 상태가 COMPLETED_WITH_ERRORS가 되고, 현재 게시 로직은 COMPLETED만 허용하므로 전체 게시 버튼이 활성화되지 않습니다.
- 실패 정치인의 draft가 비어 있어 전체 542명 검수도 실패합니다.

수정
1. 수집 중 실패한 정치인만 직전 published 스냅샷의 정상 데이터를 안전하게 복구합니다.
2. 복구본에는 PREVIOUS_PUBLISHED_FALLBACK 기록을 남겨 다음 수집에서 다시 최신화할 수 있습니다.
3. 복구 성공한 정치인은 실패 건수에서 제거하고 정상 완료로 계산합니다.
4. 직전 published 데이터가 draft 포인터 방식이든 legacy published 키 방식이든 둘 다 복구합니다.
5. 현재 150/542처럼 진행 중인 compact 수집은 커서를 0으로 되돌리지 않고 INPUT_ONLY_V4로 정상화합니다.
6. 기존 Redis 용량 정리 로직은 그대로 유지합니다.

적용 파일
- lib/intelligence-repository.js

검증 테스트
- tests/intelligence-partial-recovery.test.js
- tests/intelligence-redis-capacity.test.js

배포 후
- 관리자에서 기존 수집을 이어서 진행합니다.
- 일시적 오류 정치인은 직전 게시 정상값으로 자동 복구되어 전체 542명 데이터 계약을 유지합니다.
- 복구 가능한 오류만 있었던 경우 최종 상태는 COMPLETED가 되어 검수/승인 후 전체 게시가 가능해집니다.
