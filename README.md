# JCS V3 REBUILD — LAYOUT ONLY TRUE FOUNDATION

목적은 기존 정참시 기능을 복사하거나 끄는 것이 아닙니다.

- **보이는 UI:** 기존 정참시의 실제 CSS, 레이아웃 클래스, SVG 벡터 아이콘, 섹션 순서를 그대로 기준으로 사용
- **코드 구조:** 새 `app.js / layout / ui / fixtures`로 처음부터 분리
- **기존 기능 코드:** API, Redis, repository, refresh, history engine을 가져오지 않음
- **현재 동작:** drawer, NOW carousel, layout routing/search 같은 UI 동작만 새 코드로 구현
- **다음 단계:** 이 레이아웃 컴포넌트에 데이터/회원/비교/관리자 기능을 새 모듈로 연결

이 패키지는 기존 production URL을 참조하지 않습니다. CSS와 사용 가능한 정적 자산은 모두 로컬입니다.
