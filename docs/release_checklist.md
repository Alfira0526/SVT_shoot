# 공개 배포 체크리스트 (v1 파일럿 → 전체 공개)

인수인계 문서 §4의 6~8단계(랭킹 → 모바일 최적화 → 배포)를 실제로 끝내기 위한 순서입니다. ☐는 발주자가 직접 해야 하는 일, ✅는 코드에 이미 반영된 일입니다.

## 0. 이 PC에 필요한 도구

- ☐ **Git 설치** — 현재 PC에 Git이 없습니다. https://git-scm.com/download/win 에서 설치(기본 옵션). GitHub Desktop을 써도 됩니다.
- ☐ GitHub 계정 + 새 저장소(공개, 예: `fan-shooter`)

## 1. 랭킹 백엔드 (Supabase 무료 티어) — D3 "v1부터 온라인 랭킹 필수"

1. ☐ https://supabase.com 에서 프로젝트 생성 (리전: Northeast Asia(Seoul) 권장)
2. ☐ SQL Editor → `supabase/schema.sql` 전체 붙여넣기 → Run
3. ☐ Project Settings → API에서 **Project URL**과 **anon public key** 복사
4. ☐ 로컬: `.env.example`을 `.env`로 복사해 두 값 입력 (`.env`는 커밋 금지 — .gitignore에 이미 포함)
5. ☐ GitHub 저장소 Settings → Secrets and variables → Actions에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 등록
6. ✅ 7일 무활동 자동 일시정지 방지 핑: `.github/workflows/keep-alive.yml` (주 2회 자동). 여러 2026년 자료가 "무료 프로젝트는 1주 무활동 시 일시정지"로 설명하므로 유지 필요. 한 자료는 2026-10-30부터 기존 무료 프로젝트의 REST API 접근에 명시적 grant가 필요해진다고 적었는데 교차 확인이 안 됐습니다 — 배포 전 Supabase 공식 공지에서 확인하고, 필요하면 `schema.sql` 하단 정책을 보강하세요.
7. ✅ 서버 검증(이론상 최대점·시간 대비 점수·제출 간격·금칙어)은 트리거로 들어가 있음. 밸런스 변경으로 이론상 최대점이 바뀌면 `schema.sql`의 `score <= 60000` 상한도 같이 조정.

## 2. 배포 (GitHub Pages)

1. ☐ Git 설치 후 프로젝트 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "v1 pilot"
   git branch -M main
   git remote add origin https://github.com/<계정>/<저장소>.git
   git push -u origin main
   ```
2. ☐ 저장소 Settings → Pages → Build and deployment → Source: **GitHub Actions**
3. ✅ `main`에 푸시하면 `.github/workflows/deploy-pages.yml`이 빌드·배포. 주소는 `https://<계정>.github.io/<저장소>/`
4. ✅ 상대 경로 빌드(`base: './'`)라 하위 경로 배포에서도 동작. PWA 매니페스트·서비스 워커 자동 생성.
5. ☐ 배포 후 확인: 타이틀 로드, 닉네임 입력, 프롤로그 스킵, W1 클리어, 랭킹 제출이 "온라인 랭킹에 등록됐어요!"로 끝나는지.

## 3. 공유·아이콘

- ✅ OG/트위터 카드 메타, `og.png`(1200×630), 홈 화면 아이콘 192/512, favicon.svg
- ✅ 결과 화면 "결과 공유" 버튼 (Web Share → 클립보드 폴백), 해시태그 `#덕질할결심`
- ☐ 공유 문구·해시태그는 팬덤 통용 표현으로 손봐도 됨 (`src/scenes/Result.js` share())

## 4. 실기기 테스트 (T17) — 공개 전 필수

| 항목 | 확인 방법 |
| --- | --- |
| 크롬·삼성인터넷·iOS 사파리에서 60fps 근접 | W2 보스 P3(전방위 탄막)에서 끊김 여부 |
| 첫 터치에 소리가 나는가 | iOS는 첫 탭 뒤에 BGM 시작 — 안 나면 설정에서 BGM 끄고 켜기 |
| 드래그 중 기체가 손가락에 안 가리는가 | 오프셋 80px (`PLAYER.fingerOffsetY`) |
| 가로로 돌리면 안내가 뜨는가 | "세로로 돌려 주세요" 오버레이 |
| 홈 화면 추가 후 전체화면으로 뜨는가 | PWA (standalone). 서비스 워커는 HTTPS(GitHub Pages)에서만 등록됨 — 개발 앱 내장 브라우저에서는 등록이 막혀 확인 불가, 실기기 크롬에서 확인 |
| 탭 전환·전화 수신 시 자동 일시정지 | 복귀하면 일시정지 화면 |
| 랭킹 제출 실패 시 보관 → 다음 접속 때 재시도 | 비행기 모드로 제출 후 해제 |
| 닉네임 금칙어 → "신입 수호자" 대체 | 금칙어 입력 |

## 5. 운영 전 결정 사항 (발주자)

1. ☐ **문의·제보 채널** — `src/config/constants.js`의 `CONTACT_URL`에 구글폼/이메일 링크 입력. 비어 있으면 정보 화면에 "준비 중"으로 표시됨. §14 리스크 대응(권리자 요청 시 즉시 교체)의 접수 창구라 공개 전 필수.
2. ☐ **W2 신규 대사 승인** — intro 4줄·bossMid 2줄·outro 3줄 (`docs/story_gapfill.md` G5·G7·G8·G9·G10)
3. ☐ 프롤로그 "읽쥋" → "읽씹" 교정 유지 여부
4. ☐ 아이콘 라이선스 선택 유지(CC BY 3.0, 출처 표기 완료) 또는 CC0 도트 팩으로 교체
5. ☐ 도트 에셋(T22) 교체 시점 — 교체 전 공개(아이콘 합성판)도 가능

## 6. 공개 후 첫 주

- 랭킹 이상치 수동 삭제 (Supabase Table Editor)
- Supabase 사용량(송신 5GB/월) 확인
- 제보 채널에서 모인 버그를 `docs/playtest_review.md`에 누적
