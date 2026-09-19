# JCS 0.0.31.200 — 오늘의 운세 사이드바 패치

기준: 31.199 위에 덮어쓰기.

## 적용 위치

메인 오른쪽 사이드바:

`케이지 → 오늘의 운세 → 최근 본 정치인`

모바일에서는 케이지 직후 카드로 배치됩니다.

## 기능

- JCS FORTUNE ENGINE v1 적용
- 외부 운세 API / AI 호출 없음
- 같은 회원 + 같은 생년정보 + 같은 날짜는 같은 결과
- 종합운 / 금전운 / 사업운 / 인간관계운 4개만 제공
- 로그인 전: 로그인 CTA
- 운세 프로필 없음: 생년월일 / 양력·음력 / 출생시간(선택) 입력
- 출생시간 모름 지원
- 음력 윤달 지원
- 일일 결과 Redis 캐시 48시간

## Redis 키

- `jcs:fortune:profile:{userId}`
- `jcs:fortune:daily:{YYYY-MM-DD}:{userId}`

## 의존성

`tyme4ts@1.5.2`

package.json / package-lock.json에 반영되어 있습니다.

## 변경 파일

- `api/gateway.js`
- `lib/fortune-service.js`
- `lib/jcs-fortune-engine/*`
- `src/core/auth.js`
- `src/layout/home-layout.js`
- `src/ui/fortune-interactions.js`
- `src/app.js`
- `css/fortune-sidebar-200.css`
- `index.html`
- `package.json`
- `package-lock.json`

## 확인사항

1. 배포 후 `Ctrl+F5`
2. 비로그인 메인에서 로그인 CTA 확인
3. 로그인 회원에서 `운세 시작하기` 입력 폼 확인
4. 같은 날 새로고침 후 동일 점수 확인
5. 케이지와 최근 본 정치인 사이 배치 확인
6. 모바일에서 케이지 직후 카드 확인

운세는 전통 명리 요소를 바탕으로 한 JCS 엔터테인먼트 콘텐츠입니다.
