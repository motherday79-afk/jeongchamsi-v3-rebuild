#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

if [[ -z "$SDK" ]]; then
  echo 'Android SDK missing. Run the included GitHub Actions workflow.' >&2
  exit 2
fi

BT="$SDK/build-tools/35.0.0"
ANDROID_JAR="$SDK/platforms/android-35/android.jar"

if [[ ! -x "$BT/d8" || ! -f "$ANDROID_JAR" ]]; then
  MANAGER="$(command -v sdkmanager || true)"
  [[ -n "$MANAGER" ]] || MANAGER="$SDK/cmdline-tools/latest/bin/sdkmanager"

  "$MANAGER" \
    'platforms;android-35' \
    'build-tools;35.0.0'
fi

for TOOL in aapt2 d8 zipalign apksigner; do
  test -x "$BT/$TOOL"
done

# Build output only.
rm -rf "$ROOT/build"

mkdir -p \
  build/classes \
  build/dex \
  build/generated/com/jeongchamsi/preview \
  build/test-classes \
  dist \
  verification


# -------------------------------------------------------
# TESTS
# -------------------------------------------------------

python3 -m unittest discover \
  -s tests \
  -p 'test_*.py' \
  -v 2>&1 | tee verification/python-tests.txt

javac \
  -encoding UTF-8 \
  -d build/test-classes \
  src/com/jeongchamsi/preview/BackPolicy.java \
  tests/BackPolicyTest.java

java \
  -cp build/test-classes \
  com.jeongchamsi.preview.BackPolicyTest \
  | tee verification/back-policy.txt

node tests/test_back_layer.js \
  | tee verification/back-layer.txt


# -------------------------------------------------------
# ORIGINAL INTRO
# -------------------------------------------------------

python3 tools/dex_tools.py \
  select \
  reference/original-classes3.dex \
  build/original-intro.dex


# -------------------------------------------------------
# CONFIG / MANIFEST
# -------------------------------------------------------

python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import re
import xml.etree.ElementTree as ET

cfg = json.loads(Path('config.json').read_text())

u = urlparse(cfg['homeUrl'])

if (
    u.scheme != 'https'
    or not u.hostname
    or u.username
    or u.password
):
    raise SystemExit(
        'homeUrl must be an HTTPS URL without credentials'
    )

if not re.fullmatch(
    r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+',
    cfg['applicationId']
):
    raise SystemExit('Invalid applicationId')

version = 100000 + int(
    os.environ.get('GITHUB_RUN_NUMBER', '0')
)

if (
    cfg['minSdk'] != 26
    or cfg['targetSdk'] != 35
    or cfg['buildTools'] != '35.0.0'
):
    raise SystemExit(
        'SDK settings must match this pinned SDK 35 build script'
    )

ns = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ns)

manifest = ET.parse('AndroidManifest.xml')

manifest.getroot().set(
    'package',
    cfg['applicationId']
)

manifest.getroot().set(
    '{' + ns + '}versionCode',
    str(version)
)

manifest.getroot().set(
    '{' + ns + '}versionName',
    cfg['versionName']
)

manifest.write(
    'build/AndroidManifest.xml',
    encoding='utf-8',
    xml_declaration=True
)

Path(
    'build/generated/com/jeongchamsi/preview/BuildConfig.java'
).write_text(
    'package com.jeongchamsi.preview;\n'
    'public final class BuildConfig {\n'
    'public static final String HOME_URL = '
    + json.dumps(cfg['homeUrl'])
    + ';\n'
    '}\n'
)

Path(
    'verification/build-config.json'
).write_text(
    json.dumps(
        {
            **cfg,
            'versionCode': version
        },
        indent=2
    )
    + '\n'
)
PY


# -------------------------------------------------------
# ANDROID RESOURCES
# -------------------------------------------------------

"$BT/aapt2" compile \
  --dir res \
  -o build/resources.zip

"$BT/aapt2" link \
  -o build/resources.apk \
  -I "$ANDROID_JAR" \
  --manifest build/AndroidManifest.xml \
  --min-sdk-version 26 \
  --target-sdk-version 35 \
  -A assets \
  build/resources.zip


# -------------------------------------------------------
# JAVA BUILD
# -------------------------------------------------------

mapfile -t SOURCES < <(
  find src stubs build/generated \
    -name '*.java' \
    -type f \
    | sort
)

javac \
  -encoding UTF-8 \
  --release 8 \
  -classpath "$ANDROID_JAR" \
  -d build/classes \
  "${SOURCES[@]}"


# Compile-only IntroView stub must never be packaged.
rm \
  build/classes/com/jeongchamsi/preview/IntroView.class

jar cf \
  build/new-app-classes.jar \
  -C build/classes .


# -------------------------------------------------------
# DEX
# -------------------------------------------------------

"$BT/d8" \
  --release \
  --min-api 26 \
  --lib "$ANDROID_JAR" \
  --output build/dex \
  build/new-app-classes.jar \
  build/original-intro.dex

python3 tools/dex_tools.py \
  verify-final \
  build/dex/classes.dex \
  verification/runtime-classes.json


# -------------------------------------------------------
# CREATE UNSIGNED APK
# -------------------------------------------------------

python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil

shutil.copyfile(
    'build/resources.apk',
    'build/unsigned.apk'
)

with ZipFile(
    'build/unsigned.apk',
    'a'
) as z:

    for f in sorted(
        Path('build/dex').glob('classes*.dex')
    ):
        z.write(
            f,
            f.name,
            compress_type=ZIP_DEFLATED
        )
PY


# -------------------------------------------------------
# ZIPALIGN
# -------------------------------------------------------

"$BT/zipalign" \
  -f \
  4 \
  build/unsigned.apk \
  build/aligned.apk


# -------------------------------------------------------
# SIGN APK
# -------------------------------------------------------

KEYSTORE="$(mktemp)"

trap 'rm -f "$KEYSTORE"' EXIT


if [[ -n "${SIGNING_KEYSTORE_B64:-}" ]]; then

  : "${SIGNING_STORE_PASSWORD:?SIGNING_STORE_PASSWORD required}"
  : "${SIGNING_KEY_PASSWORD:?SIGNING_KEY_PASSWORD required}"
  : "${SIGNING_KEY_ALIAS:?SIGNING_KEY_ALIAS required}"

  printf '%s' \
    "$SIGNING_KEYSTORE_B64" \
    | base64 --decode \
    > "$KEYSTORE"

  SIGNING_MODE='stable-secret-key'

else

  rm -f "$KEYSTORE"

  export SIGNING_STORE_PASSWORD="$(
    python3 -c \
      'import secrets;print(secrets.token_hex(24))'
  )"

  export SIGNING_KEY_PASSWORD="$SIGNING_STORE_PASSWORD"

  export SIGNING_KEY_ALIAS='jcs-preview'

  keytool \
    -genkeypair \
    -noprompt \
    -keystore "$KEYSTORE" \
    -storetype JKS \
    -storepass:env SIGNING_STORE_PASSWORD \
    -keypass:env SIGNING_KEY_PASSWORD \
    -alias "$SIGNING_KEY_ALIAS" \
    -keyalg RSA \
    -keysize 3072 \
    -validity 10000 \
    -dname 'CN=JCS Private Installation Preview'

  SIGNING_MODE='one-build-preview-key'

  echo \
    '::notice::Preview signing: for a later independently rebuilt APK, uninstall this preview first. Use signing secrets for update continuity.'
fi


APK='dist/jeongchamsi-minimal.apk'


"$BT/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$SIGNING_KEY_ALIAS" \
  --ks-pass env:SIGNING_STORE_PASSWORD \
  --key-pass env:SIGNING_KEY_PASSWORD \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$APK" \
  build/aligned.apk


# -------------------------------------------------------
# VERIFY APK
# -------------------------------------------------------

"$BT/apksigner" verify \
  --verbose \
  --print-certs \
  "$APK" \
  > dist/SIGNATURE_VERIFICATION.txt

"$BT/zipalign" \
  -c \
  4 \
  "$APK"

"$BT/aapt2" dump badging \
  "$APK" \
  > dist/APK_INFO.txt


# -------------------------------------------------------
# VERIFY PERMISSIONS ONLY
# -------------------------------------------------------

python3 - <<'PY'
from pathlib import Path
import re

text = Path(
    'dist/APK_INFO.txt'
).read_text()

perms = set(
    re.findall(
        r"uses-permission[^:]*: name='([^']+)'",
        text
    )
)

if perms != {
    'android.permission.INTERNET'
}:
    raise SystemExit(
        'Unexpected APK permissions: '
        + repr(perms)
    )

print(
    'APK permission verification passed: INTERNET only'
)
PY


# -------------------------------------------------------
# FINAL OUTPUT
# -------------------------------------------------------

cp \
  verification/runtime-classes.json \
  dist/RUNTIME_VERIFICATION.json

(
  cd dist
  sha256sum \
    jeongchamsi-minimal.apk \
    > SHA256SUMS.txt
)

printf '%s\n' \
  "Signing: $SIGNING_MODE" \
  > dist/BUILD_STATUS.txt

printf '%s\n' \
  'Build/signature/static checks passed. Installation and live-site navigation still require a real Android phone test.' \
  >> dist/BUILD_STATUS.txt


# -------------------------------------------------------
# GITHUB SUMMARY
# -------------------------------------------------------

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then

  {
    echo '## 정참시 APK'
    echo
    echo 'Artifacts → jeongchamsi-minimal-apk'
    echo
    echo 'ZIP 해제 → jeongchamsi-minimal.apk 설치'
    echo
    echo '포함 기능:'
    echo '- 기존 정참시 인트로'
    echo '- 정참시 앱 아이콘'
    echo '- 이전 화면 뒤로가기'
    echo '- 첫 화면에서 뒤로가기 두 번 종료'
    echo '- 인터넷 권한만 사용'
    echo '- 푸시 없음'
    echo '- Firebase 없음'
    echo '- 백그라운드 서비스 없음'
    echo
    echo "Signing mode: $SIGNING_MODE"
    echo
    echo '스마트폰 실제 설치 검수는 별도로 필요합니다.'
  } >> "$GITHUB_STEP_SUMMARY"

fi


echo
echo '========================================'
echo 'JEONGCHAMSI APK BUILD COMPLETE'
echo
echo "APK: $APK"
echo '========================================'
