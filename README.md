# JCS V3 REBUILD — STAGE 1 SAFE FEATURE IMPORT

이번 패키지의 기준은 **기존 정참시 레이아웃 유지 + 문제 이력이 없던 기능부터 이식**입니다.

## 1차 이식 완료 범위
- 정참시 소개 / 후원 / 이용안내 / 개인정보처리방침 / 운영정책
- 전체메뉴 / 서비스 런처 / 기존 SVG 아이콘
- COLUMN 목록 / 상세 / 작성
- 커뮤니티 목록 / 상세 / 작성
- IT'S ME 목록 / 상세 / 작성
- Citizen Choice 투표
- 세대의 선택·대통령 모의투표
- 전국평가제 투표
- 아카데미 목록 / 로그인 회원 신청
- 정치인 등록 요청
- 파트너스 신청
- 회원 가입 / 로그인 / 로그아웃 / 마이페이지
- 기존 회원 ID를 유지하는 import 모듈

## 의도적으로 연결하지 않은 영역
NOW RANK 실제 데이터, 정치인 DB/상세 분석, 비교 인텔리전스, AGE/GENDER/COHORT, Refresh, HISTORY, 관리자 인텔리전스.

## 회원 데이터 이식
`src/core/member-migration.js`가 기존 회원 export의 id/userId/username, nickname/displayName, passwordHash/hash/passwordDigest 형식을 정규화합니다.
실제 운영 회원 데이터 자체는 이 ZIP에 포함되어 있지 않습니다. 운영 DB export를 넣으면 기존 ID를 유지해 import하도록 준비되어 있습니다.

## 저장 구조
현재 검수 단계에서는 `src/core/store.js`의 격리된 브라우저 저장소를 사용합니다. UI/기능 모듈은 이 저장소 인터페이스에만 의존하므로 다음 단계에서 서버 MEMBER/CONTENT 저장소로 교체할 때 화면 코드는 건드리지 않습니다.


## Packaging
- JCS_0_0_1 기준: GitHub 웹 업로드 100개 제한을 피하기 위해 미사용 정치인 이미지 자산은 제외했습니다.
- 실제 정치인 데이터/이미지는 이후 정치인 DB 이식 단계에서 별도로 연결합니다.
