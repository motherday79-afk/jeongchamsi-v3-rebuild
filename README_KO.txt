정참시 Android GitHub Actions 테스트 핫픽스

수정 파일:
android/tests/test_back_layer.js

원인:
저장소 package.json의 type=module 환경에서 CommonJS require()를 사용해 ReferenceError 발생.

수정:
dynamic import() 방식으로 변경하여 ES Module 저장소와 독립 실행 환경 양쪽에서 동작하도록 수정.

적용 위치:
브랜치 android-minimal-webview
경로 android/tests/test_back_layer.js

적용 후:
GitHub Actions > Build Jeongchamsi APK > Re-run all jobs
