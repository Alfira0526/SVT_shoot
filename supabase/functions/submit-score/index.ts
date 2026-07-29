// Supabase Edge Function — 점수 제출 서버측 검증 (§6)
// 배포:  supabase functions deploy submit-score --no-verify-jwt
// 필요 시크릿(자동 주입): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// 검증 순서:
//   ① 입력 형식/범위  ② 닉네임 길이·금칙어  ③ 이론상 최대 점수 상한
//   ④ 플레이시간 대비 점수 비율  ⑤ 제출 빈도 제한  → 통과 시 insert + 순위 계산
//
// ⚠️ 아래 상수는 게임 클라이언트(src/config/constants.js)와 반드시 동기화할 것.
//    (파일럿: W1+W2 누적 기준. 스테이지 추가 시 MAX_SCORE 재산출)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── 게임 상수 (constants.js 와 동기화) ───────────────────
const SCORE = { mobKill: 100, bossTick: 10, bossKill: 10000, noMiss: 5000 };
const SCORE_PER_SEC_CAP = 4000; // 점수/초 상한
const SUBMIT_COOLDOWN_MS = 3000; // 동일 닉네임 제출 최소 간격
const NICK = { min: 2, max: 8 };

// 파일럿 스테이지 정의 (총 잡몹 수 / 보스 HP). constants.js·stageXX.json 과 동기화.
const STAGES = [
  { mobs: 7, bossHp: 900 }, // W1  (stage_w1.json 웨이브 잡몹 합)
  { mobs: 13, bossHp: 4200 }, // W2 (stage01.json 웨이브 잡몹 합)
];
const TICK_DAMAGE = 20;

function theoreticalMax(): number {
  let total = 0;
  for (const s of STAGES) {
    const mobs = s.mobs * SCORE.mobKill;
    const ticks = Math.ceil(s.bossHp / TICK_DAMAGE) * SCORE.bossTick;
    total += mobs + ticks + SCORE.bossKill + SCORE.noMiss;
  }
  return Math.floor(total * 1.5); // 중간패턴·소환분 여유 버퍼 (클라와 동일)
}
const MAX_SCORE = theoreticalMax();

const BANNED = [
  'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot',
  '씨발', '시발', '씨빨', '개새', '병신', '지랄', '좆', '보지', '자지', '섹스', '창녀', '한남', '한녀',
];
function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, '').replace(/[._\-*]/g, '');
}
function containsBanned(s: string) {
  const n = norm(s);
  return BANNED.some((w) => n.includes(norm(w)));
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reject(reason: string, status = 422) {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reject('method-not-allowed', 405);

  let body: { nickname?: unknown; score?: unknown; mode?: unknown; play_ms?: unknown };
  try {
    body = await req.json();
  } catch {
    return reject('bad-json', 400);
  }

  const nickname = String(body.nickname ?? '').trim();
  const score = Number(body.score);
  const mode = body.mode === 'endless' ? 'endless' : 'stage';
  const playMs = Number(body.play_ms) || 0;

  // ② 닉네임
  if (nickname.length < NICK.min || nickname.length > NICK.max || containsBanned(nickname)) {
    return reject('nickname-rejected');
  }
  // ① 점수 형식/범위 · ③ 이론상 최대
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return reject('score-out-of-range');
  }
  // ④ 시간 대비 비율
  if (playMs > 0 && score / (playMs / 1000) > SCORE_PER_SEC_CAP) {
    return reject('rate-too-high');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ⑤ 제출 빈도 제한 (동일 닉네임 쿨다운)
  const since = new Date(Date.now() - SUBMIT_COOLDOWN_MS).toISOString();
  const { count: recent } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('nickname', nickname)
    .gte('created_at', since);
  if ((recent ?? 0) > 0) return reject('too-frequent', 429);

  // insert
  const { error } = await supabase
    .from('scores')
    .insert({ nickname, score: Math.floor(score), mode, play_ms: Math.floor(playMs) });
  if (error) return reject('insert-failed', 500);

  // 순위 = 더 높은 점수 개수 + 1
  const { count: higher } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('mode', mode)
    .gt('score', Math.floor(score));

  return new Response(JSON.stringify({ ok: true, rank: (higher ?? 0) + 1 }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
