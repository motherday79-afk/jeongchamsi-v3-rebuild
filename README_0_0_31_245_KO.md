# JCS 0.0.31.245 · POLIMARBLE AUDIO PATCH

## 목적
폴리마블 실제 플레이 중 BGM과 핵심 효과음을 함께 확인하기 위한 1차 오디오 패치입니다.

## 적용 BGM
- `Purple Gold` 확정안
- 파일: `assets/polimable/audio/polimable-bgm-purple-gold.mp3`
- 반복 재생
- 기본 볼륨 약 34%
- 브라우저 자동재생 정책 때문에 폴리마블 화면에서 첫 클릭/터치 후 재생 시작

## 1차 효과음
- 주사위 굴리기: `sfx-dice-roll.wav`
- 주사위 착지: `sfx-dice-land.wav`
- 캐릭터 한 칸 이동: `sfx-step.wav`
- 최종 착지: `sfx-land.wav`
- 거점 구매/강화/인수: `sfx-purchase.wav`
- 민심 획득/매각: `sfx-gain.wav`
- 민심 손실/상대 거점 비용: `sfx-loss.wav`
- DOUBLE: `sfx-double.wav`
- START 통과 보상: `sfx-start.wav`

## 사운드 ON/OFF
- TURN 표시 우측에 작은 `🔊 / 🔇` 버튼 추가
- 버튼 클릭으로 BGM + 효과음 전체 ON/OFF
- 설정은 `localStorage`의 `jcs:polimable:audio-enabled`에 저장
- 다시 폴리마블에 들어와도 이전 음소거 상태 유지

## 이번 패치에서 변경하지 않은 것
- 배경 이미지
- 1P / 2P HUD 좌표
- TODAY RANKING 좌표
- 전략카드 4슬롯 좌표
- 거점 소유 좌표
- 주사위 확률/게임 결과 로직
- 캐릭터 이동 좌표
- AI 턴 로직
- 민심 경제/거점 규칙

## 테스트 포인트
1. 폴리마블 첫 클릭 후 BGM이 시작되는지
2. 사운드 버튼으로 전체 음소거/복원이 되는지
3. 설정이 재입장 후에도 유지되는지
4. 주사위/이동/구매/민심/DOUBLE/START 효과음이 상황에 맞게 들리는지
5. BGM이 효과음을 덮지 않고 적당히 작게 깔리는지
