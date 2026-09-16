#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if ! command -v javac >/dev/null; then javac(){ java -m jdk.compiler/com.sun.tools.javac.Main "$@"; }; fi
mkdir -p verification/test-classes
python3 -m unittest discover -s tests -p 'test_*.py' -v
javac -encoding UTF-8 -d verification/test-classes src/com/jeongchamsi/preview/BackPolicy.java tests/BackPolicyTest.java
java -cp verification/test-classes com.jeongchamsi.preview.BackPolicyTest
node tests/test_back_layer.cjs
node tests/test_startup_ready.cjs
javac -encoding UTF-8 -d verification/test-classes src/com/jeongchamsi/preview/StartupGate.java src/com/jeongchamsi/preview/DocumentFailure.java src/com/jeongchamsi/preview/DocumentNavigation.java src/com/jeongchamsi/preview/IntroTimeline.java tests/StartupTest.java
java -cp verification/test-classes com.jeongchamsi.preview.StartupTest

bash -n tools/build.sh
printf '%s\n' 'Local checks passed. This is NOT an Android SDK compilation or a device test.'
