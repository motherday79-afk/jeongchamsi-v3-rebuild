# 정참시 최소 Android 앱 — GitHub Actions 빌드 패키지

## 현재 전달 상태

이 ZIP은 **설치 완료된 APK가 아니라 APK를 생성하는 소스·원본 인트로·Actions 설정**입니다.
현재 대화에서 GitHub 워크플로 파일 쓰기를 실제 시도했으나 `403 Resource not accessible by integration`이 반환되었습니다.
따라서 원격 저장소 업로드, GitHub Actions 실행, Android SDK 컴파일, APK 서명·실기 설치 검증은 아직 하지 못했습니다.
로컬에서 수행한 검사는 `android/verification/LOCAL_VERIFICATION.txt`에 기록되어 있습니다.
이 검사가 통과했다는 사실은 Android에서 설치·실행되었다는 의미가 아닙니다.

## 포함 범위

- 사진을 기준으로 한 초록색 배경 + 흰색 8방향 방사형 런처 아이콘. 앱 이름은 **정참시**입니다.
- 사용자가 이번에 다시 첨부한 `app-debug.zip` 속 APK의 **승인 IntroView 애니메이션**.
- 이전 화면이 있으면 시스템 뒤로가기 버튼/제스처로 이전 화면으로 복귀합니다.
- 이전 화면이 없을 때 첫 번째 뒤로가기는 안내, **2초 안의 두 번째 뒤로가기는 앱 종료**입니다.
- 펼쳐진 사이드 메뉴/전체 서비스 메뉴는 먼저 닫습니다.
- 사이트 기본 로그인 쿠키·세션을 유지합니다. 강제 로그인이나 로그인 기능 변경은 없습니다.
- 앱의 새 기능은 없습니다. 푸시, Firebase, 알림 권한, 백그라운드 서비스, 위치·카메라·저장소 권한은 추가하지 않았습니다.
- 인터넷 연결 실패 시 재시도 안내만 표시합니다. HTTPS 오류를 무시하지 않습니다.

현재 앱이 여는 주소는 `https://jeongchamsi-v3-rebuild.vercel.app/`입니다.
옛 APK의 `jeongchamsi-v3-preview-clean.vercel.app`을 열지 않습니다.
웹사이트를 앱 안에서 여는 형태이므로 사이트 화면·데이터는 운영 중인 사이트에서 불러옵니다. 오프라인 앱이 아닙니다.

## 가장 간단한 업로드 순서

1. 이 ZIP을 **압축 해제**합니다. ZIP 파일 자체를 GitHub에 올리는 방식이 아닙니다.
2. GitHub 저장소 `motherday79-afk/jeongchamsi-v3-rebuild`에서 **android-minimal-webview** 브랜치를 선택합니다.
3. **Code → Add file → Upload files**로 들어가 압축 해제한 내용의 **`.github` 폴더와 `android` 폴더**를 함께 올리고 **Commit changes**를 누릅니다.
4. **Actions → Build Jeongchamsi Minimal APK**에서 방금 자동 시작된 실행을 엽니다.
5. 초록색 성공 표시가 나온 실행의 **Artifacts → jeongchamsi-minimal-apk**를 받습니다.
6. 받은 결과 ZIP을 풀면 **jeongchamsi-minimal.apk**가 있습니다. 이것이 휴대폰에 설치하는 파일입니다.

### 업로드 위치 주의

저장소 최상위가 아래 구조여야 합니다. `JCS_ANDROID_MINIMAL_ACTIONS_.../` 같은 상위 폴더를 한 겹 더 넣으면 안 됩니다.

```text
.github/
  workflows/
    build-android-apk.yml
android/
  AndroidManifest.xml
  config.json
  tools/
  src/
  stubs/
  res/
  reference/
  assets/
  tests/
```

기존 웹사이트의 `main` 브랜치, `package.json`, `src/` 폴더를 바꾸는 작업이 아닙니다.
이 패키지의 코드 파일은 모두 `android/` 안에 있습니다.

워크플로가 기본 브랜치(main)가 아닌 APK 전용 브랜치에만 있으면 **Run workflow 버튼이 보이지 않을 수 있습니다**.
이 패키지는 해당 버튼을 누르지 않아도 위 업로드 커밋으로 자동 실행되도록 구성했습니다.
같은 커밋을 다시 실행할 때는 실행 상세의 **Re-run jobs**를 사용합니다.
웹사이트 기본 브랜치를 APK 브랜치로 바꿀 필요가 없습니다.

## 휴대폰 설치와 서명

앱 ID는 `com.jeongchamsi.minimal`입니다. 첨부된 옛 APK(`com.jeongchamsi.preview`)와 다릅니다.
따라서 처음 설치할 때 옛 앱과의 서명 충돌을 피하도록 구분했습니다. 옛 앱을 자동 삭제하지 않습니다.
폰에서 설치 허용을 요청하면 APK를 연 브라우저/파일 앱에 필요한 설치 허용만 설정합니다.
APK 생성이 끝나도 휴대폰에 자동 설치되는 것은 아닙니다. 마지막 설치 확인은 휴대폰에서 합니다.

**추가 설정 없이 첫 빌드가 가능하도록, 서명 비밀키가 없으면 그 빌드 전용 테스트 키를 생성합니다.**
개인 설치 검수용이며 Play Store 배포용 패키지가 아닙니다.
비밀키를 따로 설정하지 않은 채 나중에 다시 빌드하면 서명이 달라집니다. 그 경우 새 APK 설치 전에
기존 **이 최소 앱**을 삭제해야 할 수 있으며 앱 안의 로그인 상태는 지워집니다.
다른 기존 앱이나 휴대폰 데이터를 삭제할 필요는 없습니다.

같은 앱을 계속 덮어써 업데이트하려면 아래 GitHub **Actions secrets**를 관리자가 설정합니다.
첫 설치를 위한 필수 단계는 아닙니다. 키를 공개 저장소에 올리거나 대화에 비밀번호를 붙여 넣지 마세요.

```text
SIGNING_KEYSTORE_B64
SIGNING_STORE_PASSWORD
SIGNING_KEY_PASSWORD
SIGNING_KEY_ALIAS
```

비밀키는 소스, 캐시, 결과 APK ZIP에 넣지 않습니다. 실행 중 임시 파일은 종료 시 삭제합니다.

## 인트로를 그대로 보존한 방식

원본 APK에는 인트로 동영상 파일 대신 Android Canvas로 그리는 `com.jeongchamsi.preview.IntroView` 클래스가 들어 있습니다.
이 애니메이션을 임의로 다시 디자인하거나 다른 애니메이션으로 대체하지 않았습니다.

`reference/original-classes3.dex`는 첨부 APK에서 읽은 원본 코드입니다.
빌드 도구는 여기서 **IntroView 클래스 정의 하나만** 선택하며, 20개 메서드의 명령어 바이트와 정적 데이터가 변하지 않았는지 검사합니다.
그다음 Android SDK의 **D8**으로 새 앱의 코드와 정상 병합합니다.

`stubs/.../IntroView.java`는 Java 컴파일 시 원본 클래스의 메서드 서명을 알려 주는 용도뿐입니다.
빌드 스크립트가 이 임시 stub 클래스를 삭제한 후 D8에 **실제 원본 인트로 구현**을 넣습니다.
stub가 최종 APK에 섞였거나 옛 MainActivity/푸시/Firebase 문자열·클래스가 남으면 빌드를 실패 처리합니다.
원본 DEX 파일을 앱 자산에 넣어 런타임에 동적으로 읽는 방식이 아닙니다.

원본 인트로에 들어 있는 기존 그림과 문구도 유지됩니다. 새 런처 아이콘으로 인트로 내부 그림까지 바꾸지 않았습니다.
Android 시스템의 시작 화면이나 런처 마스크는 기기/런처에 따라 달라질 수 있습니다.
사진의 촬영 노이즈·배경·아이콘 아래 글자를 이미지에 복사한 것이 아니라 아이콘 도형과 색상을 벡터로 적용했습니다.

## 뒤로가기 연결

확인한 웹사이트 `src/core/navigation.js`에는 이전 화면 HTML과 스크롤 x/y를 저장·복원하는 구조가 있습니다.
이 앱은 뒤로갈 때 홈 URL을 다시 불러오지 않고 WebView의 실제 방문 기록을 뒤로 이동합니다.
그 결과 사이트의 기존 popstate/화면 복원 코드가 실행되는 구조입니다.

실제 사이트의 비동기 로딩과 휴대폰 WebView 버전까지 포함한 결과는 실기 검수가 필요합니다.
앱이 운영체제에 의해 종료된 뒤 재시작하는 상황까지 기존 JavaScript 메모리가 유지된다고 보장하지 않습니다.

## 빌드 구성

Java 17 + Android SDK 35 / Build Tools 35.0.0, 최소 Android API 26.
별도 Firebase/유료 API/Gradle 플러그인/AndroidX 라이브러리 없이 Android SDK의 AAPT2, javac, D8, zipalign, apksigner를 사용합니다.
GitHub Actions가 SDK 설치, 검사, APK 생성, 서명, 서명 검증, 권한 검사, 결과물 업로드를 수행합니다.
`android/dist`는 **성공한 빌드에서만** 생성됩니다. 전달 소스 ZIP에는 완성 APK가 없습니다.

로컬 구조/기능 단위 검사:

```bash
bash android/tools/check_local.sh
```

Android SDK와 Java 17이 설치된 개발 환경에서 실제 APK 빌드:

```bash
bash android/tools/build.sh
```

결과물에 서명 검사, APK 메타데이터, 런타임 클래스 검사, SHA-256 결과를 함께 넣습니다.
성공 후에도 휴대폰에서 아이콘 → 인트로 → 메뉴 이동/스크롤 복원 → 루트 두 번 종료를 실제 확인해야 합니다.

## 확인에 사용한 문서

- https://developer.android.com/tools/d8
- https://developer.android.com/tools/aapt2
- https://developer.android.com/tools/apksigner
- https://source.android.com/docs/core/runtime/dex-format
- https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow
- https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts
