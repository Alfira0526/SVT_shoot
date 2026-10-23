# 덕질할 결심 — v1 파일럿

모바일 세로 탄막 슈팅 (Phaser 3 + Vite). 노션 기획서 v2.9 기준 v1 범위: **프롤로그 + W1(입덕) + W2(티켓팅 대전) + 랭킹**.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속. 휴대폰 테스트는 같은 Wi‑Fi에서 터미널에 표시되는 Network 주소로.

```bash
npm run build     # dist/ 생성 (GitHub Pages용 상대 경로, PWA 서비스 워커 포함)
npm run preview   # 빌드 결과 미리보기
```

`dev`/`build` 전에 `scripts/build-manifest.mjs`가 `public/assets/manifest.json`을 자동 생성합니다. 에셋 파일을 추가·삭제했으면 서버를 다시 띄우거나 `npm run manifest`를 실행하세요.

공개 배포 절차는 [docs/release_checklist.md](docs/release_checklist.md)를 따르세요.

## 조작

- 모바일: 드래그로 이동 (기체는 손가락보다 위에 뜸), 발사는 자동
- PC: 마우스 드래그 또는 방향키/WASD, `ESC`/`P` 일시정지
- 대사창: 탭/스페이스 넘김, 스킵·빨리감기 버튼

## 폴더 구조 (인수인계 문서 §3)

```
/public/assets        sprites · portraits · cutscenes (선택 — 없으면 임시 도형/실루엣 폴백)
/src
  /scenes             Boot, Title, Prologue, Game, DialogueOverlay, PauseOverlay, Result, Ranking
  /entities           Player, Enemy, Boss, Bullet, Item
  /systems            WaveSpawner, Dialogue, Audio(자체 생성 SFX·칩튠), Storage, Textures, Assets, ui
  /config             stage_w1.json, stage01.json, dialogue_prologue.json, dialogue_w1.json, dialogue01.json, constants.js
  /net                supabase.js (REST 직접 호출, 미설정 시 로컬 랭킹)
/supabase/schema.sql  scores 테이블 + RLS + 검증 트리거
/.github/workflows    keep-alive.yml, deploy-pages.yml
/docs/story_gapfill.md  스토리·기획 공백 보완 노트 (발주자 검토용)
```

## 데이터로 콘텐츠 수정

- 적 웨이브·중간 패턴·보스 페이즈: `src/config/stage01.json` (W2), `stage_w1.json` (W1)
- 대사: `src/config/dialogue_*.json` — `{nickname}` 자동 치환, `effect: shake|flash|glitch`, `portrait`로 표정 지정
- 점수·잔기·속도·색 토큰: `src/config/constants.js`
- 보완 대사는 `"gap": "G#"` 필드로 표시 (docs/story_gapfill.md 참조)

## 에셋 교체 (D31·D38)

같은 파일명으로 넣으면 자동 교체, 없으면 폴백:

- 스프라이트: `public/assets/sprites/{player,macro_bot,spinner,error_popup,noise_mote,boss_server,boss_noise,item_lightstick,item_seed,item_shield}.png`
- 초상화(110×120): `public/assets/portraits/bongi_neutral.png` (+ `bongi_smile/surprise/sorry/wink`, `player`, `boss_server`, `boss_noise`)
- 컷씬(480×800): `public/assets/cutscenes/prologue_01~05.png`, `w2_boss.png`

## 랭킹 (Supabase)

1. Supabase 프로젝트 생성 → SQL Editor에 `supabase/schema.sql` 실행
2. `.env` 생성 (`.env.example` 복사) 후 URL·anon key 입력 — **커밋 금지**
3. GitHub 저장소 Secrets에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 등록 → keep-alive·배포 워크플로 동작

미설정 시에는 자동으로 이 기기(localStorage) 랭킹으로 동작합니다.

## IP 원칙

실명·그룹명·팬덤명·가사·공식 이미지·공식 캐릭터 디자인 일절 미사용. 사운드는 전부 코드로 생성한 오리지널. 수익화 없음.
