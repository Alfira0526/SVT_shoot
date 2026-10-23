# 크레딧 / 오픈소스 출처

## 아이콘 — game-icons.net (CC BY 3.0)

캐릭터·적·아이템·초상화·카드 아이콘은 [game-icons.net](https://game-icons.net)의 오픈소스 아이콘을 사용했습니다.
라이선스: [Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/) — 저작자 표기 필수. 원본 라이선스 전문은 `public/assets/icons/LICENSE.txt`.
게임 내 색 입히기·배경 합성은 이 프로젝트에서 가공한 것입니다.

| 파일 | 원본 아이콘 | 저작자 | 용도 |
| --- | --- | --- | --- |
| icon_player.svg | hooded-figure | DarkZaitzev | 플레이어 기체·초상화 (후드 실루엣) |
| icon_bongi.svg | fairy | Delapouite | 봉이 초상화·타이틀 엠블럼 |
| icon_macro_bot.svg | robot-antennas | Delapouite | 잡몹A 매크로 봇 |
| icon_spinner.svg | cycle | Lorc | 잡몹B 로딩 스피너 |
| icon_error.svg | hazard-sign | Lorc | 잡몹C 오류 팝업 |
| icon_noise.svg | static | Lorc | W1 노이즈 |
| icon_boss_noise.svg | static-waves | Lorc | W1 보스 소형 노이즈 |
| icon_boss_server.svg | server-rack | Delapouite | W2 보스 티켓팅 서버 |
| icon_lightstick.svg | orb-wand | Willdabeast | 아이템 응원봉(오리지널 변형) |
| icon_seed.svg | dandelion-flower | Delapouite | 아이템 민들레 꽃씨 |
| icon_shield.svg | magic-shield | Lorc | 아이템 단결 실드 |
| icon_card.svg | card-random | Faithtoken | 프롤로그 카드 뒷면 |
| icon_sparkles.svg | sparkles | Delapouite | 프롤로그 카드 앞면 |
| icon_ticket.svg | ticket | Delapouite | (예비) 티켓 연출 |
| icon_chat.svg | chat-bubble | Delapouite | (예비) 메신저 연출 |

원본 저장소: https://github.com/game-icons/icons

## 사운드

효과음·BGM 전부 WebAudio로 코드 생성한 오리지널 칩튠 (`src/systems/Audio.js`). 외부 음원·기존 곡 미사용.

## 엔진·도구

- Phaser 3 (MIT) — https://phaser.io
- Vite (MIT) — https://vitejs.dev

## 에셋 교체 시

도트 에셋(Piskel/PixelLab 산출물)을 `public/assets/sprites/`·`portraits/`·`cutscenes/`에 같은 파일명으로 넣으면 아이콘 합성 텍스처보다 우선 적용됩니다. 그 경우 사용하지 않게 된 아이콘은 이 표에서 지우세요.
