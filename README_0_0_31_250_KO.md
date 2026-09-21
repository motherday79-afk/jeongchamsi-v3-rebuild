# JCS 0.0.31.250 · POLIMARBLE OBJECT SYSTEM PATCH

## 목적
신규 32칸 다이아몬드 보드(31.249)를 기준으로 캐릭터/소유/강화/고정자산 효과를 모두 독립 객체로 연결합니다.

## 이번 패치 핵심
- 신규 보드 이미지는 `polimable-board-base-31-249.png` 한 장만 사용
- 정확히 32개 이동 포인트: 작은칸 28 + 큰칸 4
- 전략카드 위치: 4 / 12 / 20 / 28
- 24개 기업칸에만 소유/강화 객체 허용
- 캐릭터 이동 포인트와 소유/오브젝트 포인트를 분리
- 동일 칸에 1P/2P가 함께 도착하면 좌우 오프셋으로 겹침 방지

## 독립 객체 자산
### 소유
- `assets/polimable/objects/flag-p1.png`
- `assets/polimable/objects/flag-p2.png`

### 강화
- `assets/polimable/objects/building-1.png`
- `assets/polimable/objects/building-2.png`
- `assets/polimable/objects/building-3.png`

규칙:
- 최초 소유: 깃발
- 강화 1단계: building-1 하나만 표시
- 강화 2단계: building-2 하나만 표시
- 강화 3단계: building-3 하나만 표시
- 이전 단계 객체는 누적하지 않음

### 고정자산 효과
- `assets/polimable/objects/fixed-asset-effect.png`
- 강화 3단계 완성 시 화면 중앙에 일시 표시

### 캐릭터
1P/2P 각각:
- profile.png
- token.png
- happy.png
- win.png
- surprise.png
- angry.png
- sad.png

## 프로필
프로필 프레임 내부 숫자는 이미지에 포함하지 않고 실제 게임 상태에서 텍스트로 갱신합니다.
- 민심
- 바퀴
- 자산

## 디버그
`/polimable?pmdebug=1` 로 접속하면 1~32 칸 객체 경계를 개발 확인용으로 표시합니다.
일반 접속에서는 표시되지 않습니다.

## 변경하지 않은 것
- 주사위 확률/기본 턴 로직
- BGM/SFX 자산
- 모바일 전체화면 로직
- 신규 보드 배경 디자인
