JCS V3 REBUILD — EXACT VISUAL BASELINE

이 버전은 새 디자인이 아닙니다.

기존 정참시 production의 실제:
- app.css
- pages.css
- product-system.css
- spectrum-palette.css
- mobile-foundation.css
- src/app.js
- app.js가 import하는 layout.js / home.js / service-catalog.js
- service-catalog.js의 기존 SVG vector icon

을 그대로 실행합니다.

목적:
1. 새 Vercel URL에서 기존 정참시가 '보이는 그대로'인지 먼저 확정
2. 이 화면을 새 프로젝트의 고정 UI 기준선으로 사용
3. 이후 내부 기능만 새 구조로 교체

즉, 이번 파일에는 임의 재디자인/재배치가 없습니다.
