# 정참시 Android 스와이프 뒤로가기 수정 — 2026-09-13

적용 기준: 마지막 전달한 `JCS_ANDROID_MINIMAL_ACTIONS_20260906_FIXED.zip`의 소스입니다. 현재 사용 중인 APK가 이 소스로 빌드됐는지는 확인되지 않았습니다.

## 원인과 수정

앱에는 Android 13 이상 OnBackInvokedCallback과 기존 onBackPressed가 모두 연결돼 있었습니다. 문제는 WebView의 ACTION_DOWN에서 종료 대기 상태를 초기화하는 코드였습니다.

시스템 가장자리 뒤로가기에서 WebView가 DOWN을 받은 뒤 OS가 제스처를 가져가 CANCEL을 보내는 경우, 두 번째 제스처의 DOWN이 첫 번째 뒤로가기 기록을 지웠습니다. 이 순서를 실제 터치 콜백 코드와 BackPolicy로 실행해 수정 전 실패를 확인했습니다.

초기화 시점을 완료된 화면 터치 ACTION_UP으로 옮겼습니다. 시스템이 가져간 제스처의 CANCEL에는 초기화하지 않으며, 일반 화면 터치를 완료하면 기존처럼 종료 대기를 취소합니다. 메뉴에서 이전 페이지 복귀, 2초 이내 두 번 뒤로가기로 종료, 원본 인트로는 유지합니다.

## 검증 범위

- Python 테스트 16개 통과(실제 터치 콜백/BackPolicy 실행 회귀 테스트 포함).
- BackPolicy 12개, 뒤로가기 레이어 8개 검증 통과.
- Android SDK로 APK 빌드 및 Galaxy/Samsung Internet 실기 테스트는 실행하지 않았습니다.
- Gmail·PayPal 연결 프로그램 선택창의 원인을 확정하거나 해결했다고 표시하는 패치가 아닙니다.

## 적용

1. `JCS_ANDROID_SWIPE_BACK_PATCH_20260913.zip`을 풉니다.
2. 기존 Android 빌드 저장소의 같은 경로에 파일을 덮어씁니다. 기존 인트로·아이콘·접속 도메인 설정 파일은 유지합니다.
3. 기존 GitHub Actions로 APK를 다시 빌드합니다. 이 ZIP 자체는 설치용 APK가 아닙니다.
4. 새 APK에서 홈 첫 번째 뒤로가기는 종료 안내, 2초 이내 두 번째 시스템 스와이프는 종료되는지 확인합니다. 상세에서 뒤로가기는 직전 화면·위치로 복귀해야 합니다.

웹사이트 파일만 배포해도 이미 설치된 APK의 Java 코드는 바뀌지 않습니다.
