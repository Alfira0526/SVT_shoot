# 공개 배포 체크리스트 (v1.1 — 전체 공개 전)

☐ = 발주자가 직접 해야 하는 일 · ✅ = 코드에 반영됨.

## 1. 랭킹 백엔드 (Supabase) — D3 "v1부터 온라인 랭킹 필수"

1. ✅ Supabase 프로젝트 — 라이브 번들에 URL·publishable key가 주입돼 있어 온라인 랭킹 모드로 동작 중 (2026-10-24 확인)
2. ☐ `supabase/README.md`의 스키마·Edge Function(submit-score)이 실제 프로젝트에 적용됐는지 대시보드에서 확인 (랭킹 제출이 "내 순위 N위"로 끝나면 정상)
3. ✅ GitHub Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` 등록됨. 로컬 개발용 `.env`는 필요 시 `.env.example` 복사 — 커밋 금지
4. ✅ 7일 무활동 자동 일시정지 방지 핑: `.github/workflows/keep-alive.yml`. 2026년 자료 다수가 "무료 프로젝트는 1주 무활동 시 일시정지"로 설명. 한 자료는 2026-10-30부터 기존 무료 프로젝트의 REST 접근에 명시적 grant가 필요하다고 적었으나 교차 확인이 안 됨 — 배포 전 Supabase 공식 공지 확인.

## 2. 배포 (GitHub Pages)

- ✅ `main` 푸시 → `.github/workflows/deploy.yml` 자동 빌드·배포 → https://alfira0526.github.io/SVT_shoot/
- ☐ 저장소 Settings → Pages → Source가 **GitHub Actions**인지 확인
- ☐ 배포 후: 타이틀 로드 → 닉네임 → 프롤로그 스킵 → W1 클리어 → 랭킹 제출이 "내 순위 N위"로 끝나는지

## 3. 이번(v1.1) 보강분 — 실기기 확인 항목

| 항목 | 확인 방법 |
| --- | --- |
| 홈 화면 추가 → 전체화면(세로 고정)으로 실행 | PWA. 서비스 워커는 HTTPS에서만 등록됨 (개발 앱 내장 브라우저에서는 확인 불가) |
| 카톡·트위터에 링크 공유 시 카드 이미지·제목 | `og.png` 1200×630, 메타 태그 |
| 결과 화면 "결과 공유" | 모바일은 공유 시트, PC는 클립보드 복사 |
| 가로로 돌리면 "세로로 돌려 주세요" | 터치 기기 가로 모드에서만 표시 |
| 탭 전환·전화 수신 시 자동 일시정지 | 스토리·엔들리스 모두. 복귀하면 일시정지 메뉴 |
| 백그라운드에서 BGM 정지, 복귀 시 재개 | — |
| 보스 페이즈 전환 시 화면 탄이 빛 입자로 사라짐 + 0.5초 휴지 | 전환 직후 즉사 없어야 함 |
| "새로고침" 패턴 탄이 0.3초 반투명 정지 후 낙하 | 텔레그래프 |
| 설정 → 정보·크레딧 | 비영리·IP 원칙·개인정보 고지, 문의 채널 |
| 치명적 오류 시 안내 화면 + 새로고침 | — |

## 4. 운영 전 결정 사항 (발주자)

1. ✅ **문의·제보 채널** — 구글폼 생성·게시 완료(2026-10-24), `CONTACT_URL` 반영. 새 응답은 소유자 지메일로 알림, 응답은 드라이브 '덕질할 결심 운영' 폴더의 시트에 누적. 구성은 `docs/contact_form_spec.md`.
2. ☐ 공유 문구·해시태그(`#덕질할결심`) 확정 — `src/scenes/RankingScene.js`
3. ✅ QA 개발자 모드 패스워드(`DEV_PASSWORD`) 교체(2026-10-24) — 값은 `src/config/constants.js`. 번들에 노출되는 값이므로 팀 외부 공유 금지
4. ✅ 14정령 동물·소품 매핑 — 발주자 확정(2026-10-24). 변경 시 `scripts/build-portraits.mjs`의 `SPIRITS` 표 수정 후 `npm run portraits`
5. ☐ BGM 트랙 취향 확인 — `src/systems/Audio.js`의 `TRACKS` (title/prologue/world/boss/final/endless). 템포·음색·멜로디는 숫자만 바꾸면 됨

## 5. 참고

- 노션 v2.9 기획서만으로 다시 만든 파일럿(프롤로그·W1·W2, 오픈소스 아이콘, 스토리 공백 보완 노트)은 `rebuild/v1-notion` 브랜치에 보관. 그 브랜치의 `docs/story_gapfill.md`·`docs/playtest_review.md`는 스토리·장르 리뷰 참고용.
