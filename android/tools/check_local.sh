#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p verification/test-classes
python3 -m unittest discover -s tests -p 'test_*.py' -v
javac -encoding UTF-8 -d verification/test-classes src/com/jeongchamsi/preview/BackPolicy.java tests/BackPolicyTest.java
java -cp verification/test-classes com.jeongchamsi.preview.BackPolicyTest
node tests/test_back_layer.js
bash -n tools/build.sh
printf '%s\n' 'Local checks passed. This is NOT an Android SDK compilation or a device test.'
