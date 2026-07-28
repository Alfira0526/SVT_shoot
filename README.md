# fan-shooter (가제) — 빛의 세계 · DIA

팬덤 세로 탄막 슈팅 게임 **v1 파일럿**. 오리지널 세계관(DIA)·오리지널 캐릭터 기반의 모바일 세로 웹게임.
기준 문서: `game_design_draft_v1.md` (기획 v1.7) / `handover_claude_code.md` (개발 인수인계).

> ⚠️ 제목 미정(T2) — 코드/화면상 가제 "빛의 세계". 확정 시 `src/config/constants.js`·타이틀 텍스트 일괄 치환.

## 실행 방법

```bash
npm install        # 의존성 설치 (Phaser 3, Vite)
npm run dev        # 개발 서버 → http://localhost:5173
npm run build      # 프로덕션 번들 → dist/
npm run preview    # 빌드 결과 로컬 확인
```

- 논리 해상도 **480×800 세로**, 기기별 스케일링(FIT).
- 조작: **터치 드래그 이동**(손가락 오프셋) + **자동 발사**. PC 폴백: 마우스 드래그·방향키.

## 플레이 흐름

타이틀(닉네임 입력) → **프롤로그 컷씬** → **W1 입덕**(연습 보스: 소형 노이즈) →
**W2 티켓팅 대전**(보스: 티켓팅 서버 3페이즈) → 클리어/게임오버 → **랭킹 보드**.

- 잔기 3, 컨티뉴 없음, 단일 난이도 (아케이드 표준, D16).
- 대사창: 좌우 초상화 + 탭 넘김, **스킵 / 빨리감기** 지원 (§3.8).
- 점수: 잡몹 100 / 보스 틱 10 / 격파 10,000 / 노미스 5,000 (§3.7).

## 프로젝트 구조 (인수인계 §3 / 기획서 §5.2)

```
/public/assets   sprites · portraits · ui · audio   (도트 에셋 교체 위치, §9-5)
/src
  /scenes        Boot · Title · Prologue · Game · Dialogue(오버레이) · Ranking
  /entities      Player · Enemy · Boss · Bullet · Item
  /systems       ScoreSystem · WaveSpawner · SaveSystem · Filter
  /config        stage01.json · stage_w1.json · dialogue_*.json · constants.js
  /net           supabase.js  (v1: localStorage / v1.5~: Supabase 어댑터)
.github/workflows  deploy.yml (GitHub Pages) · keep-alive.yml (Supabase 핑)
```

- 원칙: **스테이지·대사는 전부 JSON 데이터 분리** — 콘텐츠 업데이트 = 데이터 파일 추가.
- 임시 도형 에셋은 `BootScene`에서 런타임 생성 → 도트 에셋 완성 시 `load`로 교체.

## 구현 현황 (DoD, 인수인계 §4)

| 단계 | 작업 | 상태 |
|---|---|---|
| 1 | 스캐폴딩 (480×800 캔버스) | ✅ |
| 2 | 코어 루프 (드래그·자동발사·충돌·점수 HUD) | ✅ |
| 3 | 웨이브 시스템 (JSON·잡몹 3종·중간 패턴) | ✅ |
| 4 | 대사·보스 3페이즈·플로우·스킵/빨리감기 | ✅ |
| 5 | 도트 에셋 교체 | ⬜ 임시 도형으로 전 기능 완성 (교체 대기) |
| 6 | Supabase 랭킹 연동 + keep-alive | 🟡 인터페이스·로컬 보드·워크플로 준비 / 원격 배선 대기(v1.5) |
| 7 | 모바일 최적화 | 🟡 터치·반응형 스케일 적용 (실기기 검증 대기) |
| 8 | GitHub Pages 배포 | 🟡 워크플로 준비 (`main` 병합 시 활성화) |

## 랭킹·보안 (§6)

- v1은 **localStorage 로컬 보드**로 동작. 점수 제출 시 클라이언트 1차 검증(이론상 최대 상한 `theoreticalMaxScore()`,
  플레이 시간 대비 비율, 닉네임 길이·금칙어)을 서버 검증과 동일 로직으로 선반영.
- v1.5~ Supabase 전환: `.env`에 `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY` 설정 →
  `src/net/supabase.js`의 `submitRemote/fetchRemote` 구현부 활성화. 스키마·검증은 동일 인터페이스 유지.
- 개인정보 미수집 — 익명 닉네임만. 진행도는 기기 종속(게임 내 고지).

## IP·저작권 제약 (§7 / 하드 제약 — 위반 시 배포 불가)

게임 빌드·에셋·텍스트에 **실명·예명·그룹명·팬클럽명·공식 로고/사진/음원/가사, 공식 캐릭터(미니틴)의
디자인·이름·시그니처 모티브를 일절 사용하지 않는다.** 노출 가능 요소는 색 팔레트·숫자(13/17)·보석(DIA) 모티브·
일반 팬덤 용어뿐이며, 에피소드·상황 밈은 원문 없이 구조만 차용(오마주)한다. 수익화 요소 없음.
