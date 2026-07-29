# Supabase 랭킹 백엔드 설정 (§6 / §9-6)

v1 파일럿은 localStorage 로만 동작합니다. 아래 절차로 Supabase를 연결하면
**코드 수정 없이** 환경변수만으로 원격 랭킹으로 전환됩니다.

## 1. 프로젝트 생성
- [supabase.com](https://supabase.com) 무료 프로젝트 생성 → **Settings → API** 에서 확보:
  - `Project URL` (`https://xxxx.supabase.co`)
  - **Publishable key** (`sb_publishable_...`) — 구 `anon` 대체, 프런트용 공개 키
  - **Secret key** (`sb_secret_...`) — 구 `service_role` 대체, 백엔드/함수 전용 (절대 공개 금지)
- 신·구 키 매핑: `VITE_SUPABASE_ANON_KEY` 에는 **publishable key** 를 넣으면 됩니다(공개 키 자리).

## 2. 스키마 적용
- SQL Editor 에서 [`schema.sql`](./schema.sql) 전체 실행 (scores 테이블 + RLS + 인덱스).
- RLS: 읽기(select)는 익명 허용, 쓰기는 Edge Function(service_role)만 — anon 직접 insert 차단.

## 3. Edge Function 배포
```bash
supabase link --project-ref <프로젝트-ref>
supabase functions deploy submit-score --no-verify-jwt
```
- `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 는 Supabase가 함수 런타임에 자동 주입.
- 함수는 서버측 검증 5종(형식·닉네임 금칙어·이론상 최대·시간대비 비율·제출 빈도)을 수행 후 insert.
- ⚠️ `functions/submit-score/index.ts` 상단 상수(MAX_SCORE 산출용 STAGES·SCORE·CAP)는
  `src/config/constants.js`·`src/config/stage*.json` 과 **동기화** 필수. 스테이지 추가 시 갱신.

## 4. 프런트 환경변수
프로젝트 루트 `.env` (또는 배포 시 GitHub Secrets):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```
- 둘 다 설정되면 `src/net/supabase.js` 가 자동으로 원격 모드로 동작(`isRemoteRanking()===true`).
- 미설정이면 localStorage 로컬 랭킹으로 폴백. 원격 호출 실패 시에도 로컬로 폴백.

## 5. 운영: 자동 일시정지 방지
- 무료 티어는 7일 무활동 시 자동 일시정지 → [`.github/workflows/keep-alive.yml`](../.github/workflows/keep-alive.yml) 이 3일마다 핑.
- GitHub 리포지토리 **Secrets** 에 `SUPABASE_URL`·`SUPABASE_ANON_KEY` 등록해야 keep-alive·배포 빌드가 값을 받음.

## 6. 보안 메모
- 클라이언트 점수는 원천적으로 조작 가능 — 서버 검증은 캐주얼 조작 차단이 목표(전제 사실, §6).
- anon key 는 공개 키(RLS로 보호). service_role key 는 절대 프런트/리포에 노출 금지 — 함수 런타임에만.
- 개인정보 미수집: 익명 닉네임만 저장.
