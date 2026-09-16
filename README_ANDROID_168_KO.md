# 정참시 Android 1.1.168 — 인트로 이후 로딩 복구

이번 파일은 기존 1.1.167 앱 소스를 이어 수정한 패키지입니다.
승인한 앱 아이콘, 골드 로고 원본, 퍼플·골드 인트로, 글자와 빛의 움직임은 유지했습니다.
웹사이트 디자인·데이터·주소도 변경하지 않았습니다.

## 확인한 문제와 수정

기존 앱은 웹 화면 준비가 15초를 넘으면 실패 상태를 고정하고, 인트로를 제거하면서 화면 준비 확인도 중단했습니다. 그래서 16초에 정상 콘텐츠가 준비돼도 흰 오류 화면에 남았습니다. 이 조건을 기존 코드에서 재현했습니다.

- 15초 초과는 '준비 지연'으로 구분하고 계속 확인합니다. 정상 콘텐츠의 첫 프레임이 준비되면 안내 화면을 자동으로 없앱니다.
- 다시 시도할 때 준비 상태, 타이머, 이전 확인 작업을 새로 설정합니다. 인트로를 반복 재생하지 않습니다.
- 실제 본문 접속 실패에는 NETWORK, HTTP, SSL 코드를 구분해서 표시합니다.
- 이미지 등 부가 리소스의 SSL 오류로 앱 전체를 덮지 않습니다. 인증서 오류 요청은 계속 차단합니다.
- 오류/지연 화면에서 같은 주소를 브라우저로 열어 확인할 수 있습니다.
- 뒤로가기, 쿠키, 앱 ID, 인터넷 권한만 사용하는 구성을 유지합니다.

휴대폰 화면의 기존 안내에는 오류 코드가 없으므로 **그 설치본에서 15초 지연·네트워크·HTTP·SSL 중 무엇이 실제로 발생했는지는 아직 확정하지 못했습니다.** 이 패치는 확인된 로딩 복구 결함을 수정하고, 다른 원인이 있을 때 이를 구분할 수 있도록 합니다.

## 지금 저장소에 적용하는 순서

현재 성공한 빌드는 main의 워크플로우가 android-minimal-webview 브랜치를 읽는 방식입니다.

1. `JCS_ANDROID_1_1_168_PATCH.zip` 압축을 풉니다.
2. 저장소의 **android-minimal-webview 브랜치**에 패치의 `android` 폴더 내용을 같은 경로로 덮어쓰고 새 `DocumentFailure.java`도 포함합니다. 압축 파일 자체를 올리지 않습니다.
3. **main의 기존 워크플로우는 유지**합니다. SDK 설정은 이미 성공했습니다.
4. Actions → 기존 Android 빌드 → **Run workflow → Branch: main**에서 새 실행을 시작합니다.
5. 성공한 실행의 `jeongchamsi-minimal-apk` Artifact를 내려받습니다. 앱 정보에서 `1.1.168-purple-gold`를 확인합니다.

현재 워크플로우: https://github.com/motherday79-afk/jeongchamsi-v3-rebuild/actions/workflows/build-android-apk.yml
앱 소스 브랜치: https://github.com/motherday79-afk/jeongchamsi-v3-rebuild/tree/android-minimal-webview

새 전체 BUILD ZIP은 Android 소스 보관·복구용이며, 같은 현재 저장소에는 PATCH만 적용하면 됩니다. 전체 ZIP의 `.github`는 앱 소스를 같은 브랜치에서 직접 빌드하는 별도 구성입니다. 이를 main의 기존 실행 설정에 덮어쓰지 마세요. 웹의 src/assets/package.json은 Android 패치 대상이 아닙니다.

## 설치와 서명

앱 ID는 `com.jeongchamsi.minimal` 그대로입니다. 기존 설치를 유지하는 덮어쓰기 업데이트에는 **기존과 같은 서명키**가 필요합니다.

확인한 GitHub 실행 #11은 고정 키 없이 일회성 테스트 서명으로 빌드됐습니다. 따라서 다시 빌드한 APK가 기존 앱에 바로 덮어쓰기 설치된다고 보장할 수 없습니다. 이전 테스트 키는 이 패키지에 없습니다. 앱을 삭제하면 앱 안의 로그인과 로컬 저장 정보가 사라질 수 있으므로 삭제를 먼저 진행하지 마세요.

안정적인 업데이트에는 GitHub의 기존 SIGNING_KEYSTORE_B64, SIGNING_STORE_PASSWORD, SIGNING_KEY_PASSWORD, SIGNING_KEY_ALIAS 설정과 해당 설치본의 같은 키를 사용해야 합니다. 키와 비밀번호는 ZIP에 포함하지 않았습니다.

전체 BUILD ZIP의 preview-apk도 별도 테스트 서명으로 검증한 APK입니다. 기존 설치 앱과의 서명 호환성을 보장하는 배포 파일은 아닙니다.

버전 코드는 기본 `168000 + GITHUB_RUN_NUMBER`이며, 별도 `JCS_VERSION_CODE` 설정이 있으면 그 값이 우선합니다.

## 검증

- 기존 코드: 16초에 정상 화면이 준비돼도 ERROR 상태가 유지되는 재현 테스트 실패.
- 수정 코드: 위 재현 테스트 통과. 1분 뒤 준비되는 화면도 자동 복구 가능.
- 지연·실제 오류·재시도·이전 요청·본문/리소스 구분 검사 통과.
- Android SDK 35 실제 컴파일, DEX 생성, APK 정렬, v2/v3 서명 검사 완료.
- 승인 로고·아이콘·인트로 코드·폰트 원본 바이트 동일성 확인.
- 휴대폰 실기에서 운영 사이트 접속, 로그인, 뒤로가기는 아직 검증하지 못했습니다. 원격 저장소에 이 수정본을 적용하거나 새 GitHub 빌드를 실행하지 않았습니다.

상세 기록은 android/verification에 있습니다. 수정본에서도 연결되지 않으면 하단의 `앱 1.1.168 · NETWORK_... / HTTP_... / SSL_... / SCREEN_WAIT` 코드가 보이도록 화면을 보내주세요. 단순 지연인지 실제 접속 실패인지 구분할 수 있습니다.

## 로컬 빌드

Java 17, Python 3, Node.js, Android SDK 35 / Build Tools 35.0.0 환경:

```bash
bash android/tools/check_local.sh
ANDROID_HOME=/설치된/Android/SDK/경로 bash android/tools/build.sh
```

결과: `android/dist/jeongchamsi-minimal.apk`
AAPT2 → javac → D8 → zipalign → apksigner 방식을 유지하며, 별도 Gradle·Firebase·푸시 서비스를 추가하지 않았습니다.
