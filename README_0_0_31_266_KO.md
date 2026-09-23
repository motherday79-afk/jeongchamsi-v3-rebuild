# JCS 0.0.31.266 — 입체 실버 전략카드 칸

전략카드 4칸(내부 인덱스 4/12/20/28)의 윗면과 양쪽 측면을 실버로 교체했습니다. 윗면의 `전략 / 카드` 두 줄은 카드 이미지에 포함되어 있으며 이전 별도 글자는 숨깁니다. 측면은 은색 금속 음영으로 표현합니다. 기존 위치·두께·눌림 깊이·카드 획득 기능은 유지합니다. 배치 편집에 저장된 지역 칸 설정은 수정하지 않습니다. 전략카드의 글자와 바탕색은 이번 전용 디자인으로 고정됩니다.

264 이하에서 직접 적용하지 말고 265에 PATCH를 덮어쓰세요. FULL은 전체 소스입니다. Ctrl+F5로 새 파일을 불러옵니다. 실제 플레이 확인은 사용자에게 맡깁니다.

## 이미지
내장 image_gen으로 생성한 실버 카드 윗면: assets/polimable/editor/strategy-silver-266.png. 기존 SVG 칸 구조에서 원근을 적용하고 은색 측면과 연결합니다.
프롬프트: square orthographic polished luminous silver game tile face, engraved silver filigree and small gold corner accents, large deep-purple embossed Korean lettering exactly two lines 전략 / 카드, no other text, no perspective. 생성 원본: exec-e0993e90-7c6b-4e0d-b0b5-7d0873593c73.png.
