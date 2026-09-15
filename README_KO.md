# Android SDK 설치 오류 핫픽스 — 1.1.167

원인: android-actions/setup-android@v3의 기본값이 `tools platform-tools`입니다. 실제 실행 로그에서 구형 `tools` 패키지를 찾지 못해 SDK 설정 단계가 중단되었습니다. APK 빌드와 서명 단계는 아직 실행되지 않은 상태였습니다.

## 지금 적용할 곳

현재 GitHub의 `main/.github/workflows/build-android-apk.yml`은 `android-minimal-webview` 브랜치의 Android 소스를 가져와 빌드합니다. 앱 브랜치에는 이미 신규 1.1.167 퍼플·골드 설정이 올라가 있는 것을 읽기 전용으로 확인했습니다.

1. 이 ZIP을 압축 해제합니다.
2. GitHub 저장소 `motherday79-afk/jeongchamsi-v3-rebuild`에서 **main** 브랜치를 선택합니다.
3. `.github/workflows/build-android-apk.yml`을 이 ZIP 안의 같은 경로 파일로 교체하고 Commit changes를 누릅니다.
4. **Actions → Build Jeongchamsi Minimal APK → Run workflow → main → Run workflow**를 실행합니다.
5. 초록색으로 성공하면 **Artifacts → jeongchamsi-minimal-apk**를 다운로드합니다.

이 핫픽스는 **main에 있는 실행 설정용**입니다. 앱 소스를 main에 다시 올리지 마세요. `android-minimal-webview`의 앱 코드는 그대로 가져옵니다.
**실패했던 실행에서 Re-run jobs만 누르면 예전 설정으로 다시 실행될 수 있습니다. 수정 커밋 이후 새 Run workflow를 실행하세요.**

## 수정 범위

SDK 설치 패키지를 `platform-tools platforms;android-35 build-tools;35.0.0`으로 명시했습니다.
실행 설정이 기존 SIGNING_* secrets를 앱 빌드에 전달하도록 167 패키지와 동일하게 연결했습니다. 서명키 자체는 변경하거나 포함하지 않았습니다.
아이콘, 인트로, 앱 ID, 앱 버전, 웹사이트 소스와 데이터는 변경하지 않았습니다.

기존 앱의 덮어쓰기 업데이트에는 기존 서명키가 필요합니다. 해당 secrets가 없으면 빌드 스크립트의 기존 동작대로 확인용 서명을 생성합니다.

## 검증

동일한 `sdkmanager tools` 호출이 종료 코드 1과 `Failed to find package 'tools'`로 실패하는 것을 재현했습니다.
명시한 SDK35 패키지 설치와 설치된 AAPT2/D8/apksigner 확인 결과는 포함한 검증 기록을 참고하세요. APK 코드 자체는 앞서 실제 컴파일·서명 검증한 167과 동일합니다.
GitHub Actions 원격 재실행은 아직 수행하지 않았습니다. 이 오류 이후의 단계에서 다른 문제가 나오면 해당 로그를 추가로 확인해야 합니다.

공식 액션의 기본값: https://github.com/android-actions/setup-android/blob/v3/action.yml
현재 main 설정: https://github.com/motherday79-afk/jeongchamsi-v3-rebuild/blob/main/.github/workflows/build-android-apk.yml
