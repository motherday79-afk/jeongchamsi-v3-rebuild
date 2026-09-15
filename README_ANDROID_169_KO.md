# 정참시 Android 1.1.169 — 접속 주소 수정 · 흰색 앱 아이콘

## 원인

앱 1.1.168에 저장된 접속 주소는 `https://jeongchamsi.com/`였습니다.
이 주소에는 현재 A/AAAA 서버 주소 기록이 없습니다. Android의 NETWORK_-2는 호스트 주소 조회 실패를 뜻합니다.

실제로 운영 중인 주소는 **https://www.jeongchamsi.com/**입니다. 이 주소의 DNS 연결 및 HTTP200 응답, 정참시 페이지 제목을 확인했습니다. 웹 소스의 canonical 주소도 www 주소입니다.

앱의 homeUrl을 위 정상 주소로 수정했습니다. 홈 화면의 앱 아이콘 배경도 요청하신 흰색으로 바꿨습니다. 골드 로고의 원본 픽셀·형태·크기·비율은 유지합니다. 1.1.168의 로딩 복구, 인트로·뒤로가기·쿠키 처리와 SDK 설정은 유지합니다. DNS 설정이나 웹사이트를 변경하지 않았습니다.

## 기존 저장소에 적용

1. `JCS_ANDROID_1_1_169_PATCH.zip`을 압축 해제합니다.
2. GitHub 저장소의 **android-minimal-webview 브랜치**에 `android` 폴더 안 파일들을 같은 경로로 덮어씁니다. 상위 폴더를 한 겹 더 만들거나 ZIP 자체를 올리지 않습니다.
3. Actions의 기존 Android 빌드에서 **Run workflow → Branch: main**으로 새 실행을 시작합니다. main의 기존 워크플로우는 앱 브랜치 소스를 읽으므로 그대로 유지합니다.
4. 성공한 실행의 `jeongchamsi-minimal-apk` Artifact를 내려받습니다. 버전은 `1.1.169-purple-gold`입니다.

실행 화면: https://github.com/motherday79-afk/jeongchamsi-v3-rebuild/actions/workflows/build-android-apk.yml

현재 168 소스가 반영된 저장소에는 PATCH만 적용하면 됩니다. 전체 BUILD ZIP은 복구·보관용입니다. 전체 ZIP의 `.github`는 앱 소스를 같은 브랜치에서 직접 빌드하는 별도 설정이며, 이를 main의 성공한 실행 설정에 덮어쓰지 마세요.

## 휴대폰 확인

- 인트로 후 정참시 메인 화면이 열리는지 확인합니다.
- 로그인과 메뉴 이동, 뒤로가기를 확인합니다.
- 앱을 설치하기 전에도 휴대폰 브라우저에서 https://www.jeongchamsi.com/ 을 직접 열 수 있습니다. 오류 화면의 '브라우저에서 확인' 버튼은 168에 저장된 www 없는 주소를 열기 때문에 새 주소를 직접 입력해야 합니다.

현재 설치본에서 사용한 서명키와 새 APK의 서명키가 같아야 덮어쓰기 업데이트가 됩니다. 고정 서명키 없이 빌드하면 매번 테스트 키가 생성되며 기존 앱을 덮어쓸 수 없습니다. 삭제 시 앱의 로그인·로컬 정보가 지워질 수 있습니다. 이번 패치는 서명 방식을 변경하지 않았습니다.

전체 BUILD ZIP의 preview-apk는 실제 컴파일·서명 검증한 별도 테스트 서명 APK입니다. 현재 설치본의 업데이트용 서명과 같다고 보장하지 않습니다.

## 검증 범위

- www 없는 주소: A와 AAAA 조회 결과에 서버 주소 없음.
- www 주소: DNS 연결 정상, HTTP200, 제목 '정참시 — 정치에 참여할 시간' 확인.
- SDK35 실제 APK 컴파일, APK 정렬 및 v2/v3 서명 검증.
- APK에 포함된 HOME_URL이 www 주소인지 확인.
- 아이콘 배경만 흰색 적용. 골드 PNG·인트로·폰트 원본 유지.
- 휴대폰 실기에서의 접속·로그인은 별도 확인이 필요합니다. 수정본을 원격 저장소에 적용하거나 새 GitHub 빌드를 실행한 상태는 아닙니다.

검증 기록은 android/verification에 있습니다.

## 로컬 빌드

Java17, Python3, Node.js, Android SDK35 / Build Tools35.0.0:

```bash
bash android/tools/check_local.sh
ANDROID_HOME=/설치된/Android/SDK/경로 bash android/tools/build.sh
```

결과: android/dist/jeongchamsi-minimal.apk

앱ID com.jeongchamsi.minimal 유지. 기본 versionCode는 169000 + GITHUB_RUN_NUMBER이며, 별도로 설정한 JCS_VERSION_CODE가 있으면 그 값이 우선합니다.
