-- §6 랭킹·보안 — scores 테이블 + RLS + 서버 검증 (Supabase SQL Editor에 붙여넣기)
-- 이론상 최대 점수(상한)는 src/config/constants.js theoreticalMaxScore()와 동일하게 유지할 것.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  nickname    text not null check (char_length(nickname) between 2 and 8),
  score       integer not null check (score >= 0 and score <= 60000),
  mode        text not null default 'stage' check (mode in ('stage', 'endless')),
  play_ms     integer not null check (play_ms >= 15000),
  created_at  timestamptz not null default now()
);

create index if not exists scores_mode_score_idx on public.scores (mode, score desc, created_at asc);

alter table public.scores enable row level security;

-- 누구나 읽기 (랭킹 보드)
drop policy if exists "scores_read" on public.scores;
create policy "scores_read" on public.scores for select to anon using (true);

-- 익명 삽입 허용 — 단 검증 트리거 통과분만
drop policy if exists "scores_insert" on public.scores;
create policy "scores_insert" on public.scores for insert to anon with check (true);

-- 서버 검증: ② 시간 대비 점수 비율 상한, ③ 제출 빈도 제한(같은 닉네임 8초), ④ 닉네임 금칙어
create or replace function public.validate_score()
returns trigger
language plpgsql
security definer
as $$
declare
  banned text[] := array['시발','씨발','병신','개새','좆','니미','느금','지랄','염병','fuck','shit','bitch','asshole','admin','운영자','관리자'];
  w text;
begin
  if new.score::numeric / greatest(new.play_ms, 1) * 1000 > 600 then
    raise exception 'score/time ratio exceeded';
  end if;

  if exists (
    select 1 from public.scores s
    where s.nickname = new.nickname and s.created_at > now() - interval '8 seconds'
  ) then
    raise exception 'too many submissions';
  end if;

  foreach w in array banned loop
    if position(lower(w) in lower(new.nickname)) > 0 then
      new.nickname := '신입 수호자';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists scores_validate on public.scores;
create trigger scores_validate before insert on public.scores
for each row execute function public.validate_score();

-- keep-alive 핑 대상 (GitHub Actions에서 select 1회)
comment on table public.scores is 'fan-shooter v1 ranking (anonymous nickname only, no PII)';
