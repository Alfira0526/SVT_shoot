-- 랭킹 백엔드 스키마 (§6 / 인수인계 §6)
-- Supabase SQL Editor 에 붙여넣어 실행. 또는 supabase db push 로 마이그레이션.

-- ── scores: 랭킹 기록 ────────────────────────────────────
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  nickname    text        not null check (char_length(nickname) between 2 and 8),
  score       integer     not null check (score >= 0),
  mode        text        not null default 'stage' check (mode in ('stage', 'endless')),
  play_ms     integer     not null default 0 check (play_ms >= 0),
  created_at  timestamptz not null default now()
);

-- 상위 N 조회 최적화 (mode별 score 내림차순)
create index if not exists scores_mode_score_idx on public.scores (mode, score desc);
-- 제출 빈도 제한 조회용 (닉네임+시간)
create index if not exists scores_nick_time_idx on public.scores (nickname, created_at desc);

-- ── RLS: 읽기는 익명 허용, 쓰기는 Edge Function(service_role)만 ──
alter table public.scores enable row level security;

drop policy if exists scores_select_all on public.scores;
create policy scores_select_all
  on public.scores for select
  using (true);

-- insert/update/delete 정책을 만들지 않음 → anon/authenticated 직접 쓰기 차단.
-- Edge Function 은 service_role 키로 RLS 를 우회해 검증 후 insert.

-- ── (선택) 시즌제 대비 — v1.x 랭킹 시즌 리셋용 골격 ────────
create table if not exists public.seasons (
  id          bigint generated always as identity primary key,
  name        text        not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
alter table public.seasons enable row level security;
drop policy if exists seasons_select_all on public.seasons;
create policy seasons_select_all on public.seasons for select using (true);
