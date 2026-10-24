# 크레딧 / 오픈소스 출처

## 캐릭터·보스 초상화 — Twemoji (CC BY 4.0)

14정령(루멘·폴린·픽·새록·빗장·울림·셈이·영수·찰나·디원·네시·여백·습작·잔불)과 적·보스(노이즈·티켓팅 서버·암표 총책·독점자·무결)의 초상화는
[Twemoji](https://github.com/jdecked/twemoji)의 동물 얼굴·소품 이모지 그래픽을 색·구도·조합만 바꿔 합성한 것입니다.

- 저작권: Copyright 2020 Twitter, Inc and other contributors — Graphics licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 원본 SVG와 라이선스 전문: `public/assets/emoji/` (`LICENSE-GRAPHICS.txt`)
- 합성 스크립트: `scripts/build-portraits.mjs` (`npm run portraits`) — 정령별 동물·소품 매핑은 스크립트 상단 `SPIRITS` 표에서 변경

| 정령 | 얼굴 (T1 동물) | 소품 |
| --- | --- | --- |
| 루멘(봉이) | 🐥 병아리 | 🪄 응원봉(마법봉) + ⭐ |
| 폴린(입덕) | 🐰 토끼 (T1-02) | 💗 |
| 픽(뽑기) | 🦊 여우 → 보라색 회전 (T1-06 보라 여우) | 🎴 카드 + ✨ |
| 새록(새로고침) | 🦦 수달 (T1-13) | 🔄 |
| 빗장(캡차) | 🐶 개 (T1-09 셰퍼드) | 🔑 |
| 울림(떼창) | 🐸 개구리 (T1-08) | 🎧 + 🎵 |
| 셈이(총공) | 🐱 고양이 → 밝게 (T1-07 흰 고양이) | 📋 + 👓 |
| 영수(굿즈) | 🦝 너구리 (T1-01) | 🛍 |
| 찰나(직캠) | 🐿 다람쥐 (T1-11 렛서판다 근사) | 📷 |
| 디원(컴백) | 🐯 호랑이 (T1-05) | 📅 |
| 네시(새벽) | 🐻‍❄️ 북극곰 (T1-12) | 🌙 + ⭐ |
| 여백(졸업) | 🦌 사슴 (T1-03) | 🎀 |
| 습작(팬창작) | 🐕 개 (T1-10 리트리버) | 🖌 |
| 잔불(버티기) | 🐱 고양이 → 주황 회전 (T1-04 노란 고양이) | 🏮 |

동물은 발주자 노션 「발주자 과제 작업장」 T1 매핑표의 13종을 정령 컨셉에 맞춰 배정했습니다(2026-10-24, [docs/design_direction.md](docs/design_direction.md) §3). 실존 인물·그룹·공식 캐릭터(미니틴)를 참조하지 않았습니다(§7, D27).

## 배경 사진 — Wikimedia Commons (CC0 / Public Domain)

세계 13 + 피날레 배경(`public/assets/backdrops/`)과 프롤로그 컷씬 c1~c5(`public/assets/cutscenes/`)는 아래 CC0 사진을 480×800 세로 크롭·듀오톤·비네트 가공한 것입니다(`scripts/fetch-backgrounds.mjs` → `scripts/build-backdrops.mjs`). CC0은 출처 표기 의무가 없지만 감사의 뜻으로 기록합니다. 원본·메타데이터: `raw/bg/credits.json`.

| 용도 | 파일(Commons) | 작가 | 라이선스 |
| --- | --- | --- | --- |
| C1 콘서트장 / 타이틀 | Suspended stage in red light (Unsplash) | Karina Carvalho | CC0 |
| C2 부스 | Rainy window and table book (Unsplash) | Rosalind Chang | CC0 |
| C3 럭키카드 공개 | Sparkler at night (Unsplash) | Karina Carvalho | CC0 |
| C4 발밑이 사라짐 | New York skyline with light trails (Unsplash) | Davide Cantelli | CC0 |
| C5 응원봉 | Hands (Unsplash) | Daiga Ellaby | CC0 |
| 쿵(폴린) | Building Western University (Unsplash) | Scott Webb | CC0 |
| 뽑기장(픽) | Anonymously left playing cards (Unsplash) | Farhan Siddicq | CC0 |
| 무한로비(새록) | Woman in yellow with a yellow shadow in a queue | Paul Dufour | CC0 |
| 뒤틀린 관문(빗장) | Subway This Way (Unsplash) | Jake Ingle | CC0 |
| 떼창홀(울림) / 엔들리스 | Put your hands in the air (Unsplash) | Arkady Lifshits | CC0 |
| 마감이 안 오는 방(셈이) | Laptop in close-up (Unsplash) | seth schwiet | CC0 |
| 텅장상점가(영수) | Browsing record store shelves (Unsplash) | Edu Grande | CC0 |
| 리플레이 협곡(찰나) / 지도 | At the back of a concert venue (Unsplash) | Rob Bye | CC0 |
| 영원한 전날(디원) | Roman numerals on alarm clock (Unsplash) | Ales Krivec | CC0 |
| 네 시에서 멈춘 밤(네시) | Café Girl (Unsplash) | Sean Witzke | CC0 |
| 앙코르 뒤 셋째 열(여백) | Olympic stadium munich | Markus Spiske | CC0 |
| 덜 마른 화첩(습작) | A notebook with paint brushes | Tim Arterbury | CC0 |
| 식은 재의 공터(잔불) | Strike fire (Unsplash) | Luke Porter | CC0 |
| 완결의 문(무결) | Silhouettes against pale stage smoke (Unsplash) | Daniel Ebersole | CC0 |

선정 기준: 얼굴이 식별되는 인물 배제(뒷모습·실루엣·사물·빛), 실존 공연장·아티스트·공식 상품이 특정되지 않는 사진. 카드 뒷면(`card_back.png`)은 자체 벡터. 이전 벡터 컷씬은 `docs/legacy/`에 보관.

## 그 외

- 인게임 소형 스프라이트(플레이어·잡몹·보스·아이템)·절차 배경 오버레이(`WorldBackdrop.js`): 자체 제작
- 효과음·BGM: WebAudio로 코드 생성한 오리지널 칩튠 (`src/systems/Audio.js`). 외부 음원·기존 곡 미사용
- 엔진: Phaser 3 (MIT) · 빌드: Vite (MIT) · 이미지 처리: sharp (Apache-2.0, 빌드 도구)
