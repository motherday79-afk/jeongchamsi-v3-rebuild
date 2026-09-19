# 정참시 Android 1.1.167 — 신규 앱 아이콘·인트로 빌드 패키지

신규 **퍼플 + 골드 앱 아이콘**과 **약 2.3초 인트로**를 적용했습니다.
기존 최종 앱 소스(2026-09-06)와 뒤로가기 패치(2026-09-13)를 이어 작업했습니다.
앱이 여는 주소는 **https://jeongchamsi.com/** 입니다.

## 포함 내용

- 승인된 골드 8광선 PNG를 그대로 사용하는 런처 아이콘. 휴대폰의 원형·둥근 사각형 마스크에 대응하는 Adaptive icon입니다.
- 딥 퍼플 배경에서 광선이 결합하고 **참여하는 정치의 시작 → 정참시** 순서로 등장합니다. 이름이 멈춘 뒤 골드 빛이 로고 주변을 돌고 글자를 훑습니다.
- 로고 자체를 회전·왜곡하거나 새 형태로 그리지 않습니다. 원본 비율과 픽셀을 유지합니다.
- 기존보다 짧고 절도 있는 움직임: 광선 약 0.1–0.7초, 작은 문구 0.74–0.98초, 이름 1.04–1.34초, 빛 1.45–2.25초. 2.3초 이후 준비된 웹 화면으로 전환합니다.
- 웹은 인트로와 동시에 로딩합니다. 실제 콘텐츠와 첫 프레임 준비를 확인한 뒤 전환하며, 15초 안에 준비되지 않으면 재시도 화면을 제공합니다.
- 시스템에서 애니메이션을 끈 경우에는 완성 로고·문구를 정적으로 보여줍니다.
- 기존 메뉴 먼저 닫기, 이전 페이지 이동, 첫 화면에서 2초 안에 두 번 뒤로가기 종료, 로그인 쿠키·외부 링크 처리 유지.

## 확인용 APK

`preview-apk/jeongchamsi-minimal.apk`를 함께 넣었습니다. **이 APK는 실제로 컴파일·서명·검증한 확인용 파일**입니다. 압축을 푼 뒤 휴대폰에서 열 수 있습니다.

다만 이 확인용 APK는 이번 빌드에서 생성한 테스트 서명입니다. 기존에 설치된 `com.jeongchamsi.minimal` 앱과 서명이 다르면 덮어쓰기 설치가 되지 않습니다. **기존 앱을 유지하며 업데이트하려면 아래 방식으로 기존 서명키를 사용해 빌드하세요.** 실기 설치·모양·동작 검수는 아직 수행하지 않았습니다.

이 패키지는 Android APK용입니다. iOS 빌드나 Play Store 등록용 AAB는 포함하지 않습니다.

## 기존 방식대로 GitHub Actions에서 빌드

1. ZIP을 압축 해제합니다.
2. 기존 앱 빌드 저장소의 `android-minimal-webview` 브랜치에서 **최상위 `.github`와 `android` 폴더**를 반영합니다. ZIP 자체를 올리거나 상위 폴더를 한 겹 더 넣지 않습니다.
3. **Actions → Build Jeongchamsi Minimal APK** 실행을 확인합니다. 해당 브랜치의 `android/**` 변경 커밋으로 자동 실행됩니다.
4. 성공한 실행의 **Artifacts → jeongchamsi-minimal-apk**를 다운로드합니다.
5. 압축을 풀면 `jeongchamsi-minimal.apk`가 있습니다.

`preview-apk` 폴더는 확인용 결과물이므로 저장소에 올릴 필요가 없습니다. 기존 웹사이트의 `src`, `assets`, `package.json`을 이 Android 소스로 덮어쓰지 마세요. 웹 수정은 별도 167 웹 패키지를 사용합니다.

워크플로가 앱 브랜치에만 있으면 Run workflow 버튼이 안 보일 수 있습니다. 이 경우 위 변경 커밋으로 실행하거나 기존 실행의 Re-run jobs를 사용하면 됩니다. 기본 브랜치를 변경할 필요는 없습니다.

## 같은 앱으로 계속 업데이트하기

앱 ID는 기존 최소 앱과 같은 `com.jeongchamsi.minimal`을 유지했습니다.
동일 앱의 업데이트에는 **기존 서명키**와 **설치된 앱보다 큰 versionCode**가 필요합니다.
GitHub Actions secrets에 기존 값을 연결합니다.

- `SIGNING_KEYSTORE_B64`
- `SIGNING_STORE_PASSWORD`
- `SIGNING_KEY_PASSWORD`
- `SIGNING_KEY_ALIAS`

키와 비밀번호는 이 ZIP에 포함하지 않았습니다. 소스나 대화에 공개하지 마세요.
기존 키 없이 실행하면 워크플로는 확인용 키를 생성하며, 그 APK가 기존 설치본을 업데이트한다고 보장하지 않습니다.
`versionCode`는 기본적으로 `167000 + GITHUB_RUN_NUMBER`입니다. 기존 설치본이 그보다 높으면 빌드 환경변수 `JCS_VERSION_CODE`에 더 큰 정수를 지정합니다.

## 로컬 빌드

Java 17, Python 3, Node.js, Android SDK 35 / Build Tools 35.0.0 환경에서:

```bash
bash android/tools/check_local.sh
ANDROID_HOME=/설치된/Android/SDK/경로 bash android/tools/build.sh
```

결과는 `android/dist/jeongchamsi-minimal.apk`입니다.
원래 사용하던 AAPT2 → javac → D8 → zipalign → apksigner 빌드 방식을 유지했습니다. 별도 Gradle/Firebase/푸시 서비스는 추가하지 않았습니다. 테스트 JS는 `.cjs`로 묶어 웹 저장소의 `type: module` 설정에도 영향을 받지 않도록 했습니다.

## 검증 결과와 범위

- Android SDK 35 실제 컴파일, DEX 생성, APK 정렬 및 v2/v3 서명 검증 성공.
- 인터넷 권한만 포함하는지, 실행 클래스에 예전 인트로 stub·Firebase 등이 섞이지 않았는지 확인.
- 원본 골드 PNG 해시 및 아이콘 비율 유지 확인.
- 기존 뒤로가기 및 스와이프 종료 회귀 검사, 웹 준비 상태·시간초과·중간 페이지 이동 검사 통과.
- `android/verification`과 `preview-apk`에 검증 기록을 넣었습니다.
- 실제 Android 기기에서의 아이콘 마스크·인트로 프레임·운영 사이트 로그인/뒤로가기, GitHub Actions 원격 실행은 별도 확인이 필요합니다. 웹/앱을 운영 환경에 배포하지 않았습니다.

## 원본 자산 보존

`android/reference`의 이전 인트로 DEX와 민트 아이콘은 과거 작업의 참고 기록입니다. 새 APK는 `android/src/.../IntroView.java`의 퍼플·골드 인트로를 컴파일하며 과거 인트로를 병합하지 않습니다.
현재 아이콘의 원본은 `android/res/drawable-nodpi/jcs_gold.png`, 크기·배경 정의는 `android/res/drawable/ic_launcher_foreground.xml` 및 `android/res/mipmap-anydpi-v26/ic_launcher.xml`입니다.
기존 골드 PNG와 폰트는 웹 166의 확정 자산을 그대로 사용했습니다.

공식 구현 문서: [Adaptive icon](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [앱 시작 화면](https://developer.android.com/develop/ui/views/launch/splash-screen), [비율 기반 이미지 여백](https://developer.android.com/reference/android/graphics/drawable/InsetDrawable), [AAPT2](https://developer.android.com/tools/aapt2), [APK 서명](https://developer.android.com/tools/apksigner).
