// D31·D38 — 선택 에셋(컷씬·초상화·도트 스프라이트·아이콘) 로더. 파일이 없어도 에러가 아니어야 함.
// public/assets/manifest.json(빌드 시 자동 생성)을 먼저 읽어 존재하는 파일만 로드 → 404 요청 0.
// 매니페스트가 없을 때만 HEAD 요청으로 존재 여부를 확인한다.
const BASE = import.meta.env.BASE_URL || './';

export const OPTIONAL_IMAGES = {
  portrait_bongi_neutral: 'portraits/bongi_neutral.png',
  portrait_bongi_smile: 'portraits/bongi_smile.png',
  portrait_bongi_surprise: 'portraits/bongi_surprise.png',
  portrait_bongi_sorry: 'portraits/bongi_sorry.png',
  portrait_bongi_wink: 'portraits/bongi_wink.png',
  portrait_player: 'portraits/player.png',
  portrait_boss_server: 'portraits/boss_server.png',
  portrait_boss_noise: 'portraits/boss_noise.png',
  cutscene_prologue_01: 'cutscenes/prologue_01.png',
  cutscene_prologue_02: 'cutscenes/prologue_02.png',
  cutscene_prologue_03: 'cutscenes/prologue_03.png',
  cutscene_prologue_04: 'cutscenes/prologue_04.png',
  cutscene_prologue_05: 'cutscenes/prologue_05.png',
  cutscene_w2_boss: 'cutscenes/w2_boss.png',
  // 도트 스프라이트가 준비되면 같은 키로 교체 (Textures.js 합성 텍스처보다 우선)
  player: 'sprites/player.png',
  macro_bot: 'sprites/macro_bot.png',
  spinner: 'sprites/spinner.png',
  error_popup: 'sprites/error_popup.png',
  noise_mote: 'sprites/noise_mote.png',
  boss_server: 'sprites/boss_server.png',
  boss_noise: 'sprites/boss_noise.png',
  item_lightstick: 'sprites/item_lightstick.png',
  item_seed: 'sprites/item_seed.png',
  item_shield: 'sprites/item_shield.png',
};

// 오픈소스 아이콘(game-icons.net, CC BY 3.0) — public/assets/icons/*.svg. 출처는 CREDITS.md
export const ICONS = [
  'icon_player',
  'icon_bongi',
  'icon_macro_bot',
  'icon_spinner',
  'icon_error',
  'icon_noise',
  'icon_boss_noise',
  'icon_boss_server',
  'icon_lightstick',
  'icon_seed',
  'icon_shield',
  'icon_card',
  'icon_sparkles',
  'icon_ticket',
  'icon_chat',
];
const ICON_SIZE = 160;

async function readManifest() {
  try {
    const res = await fetch(`${BASE}assets/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.files) ? new Set(data.files) : null;
  } catch {
    return null;
  }
}

async function headExists(url, expectPrefix = 'image/') {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    return type.startsWith(expectPrefix);
  } catch {
    return false;
  }
}

export async function loadOptionalImages(scene) {
  const manifest = await readManifest();
  const exists = async (relPath) => (manifest ? manifest.has(relPath) : headExists(`${BASE}assets/${relPath}`));

  const imageChecks = await Promise.all(
    Object.entries(OPTIONAL_IMAGES).map(async ([key, rel]) => [key, `${BASE}assets/${rel}`, await exists(rel)])
  );
  const iconChecks = await Promise.all(
    ICONS.map(async (key) => {
      const rel = `icons/${key}.svg`;
      return [key, `${BASE}assets/${rel}`, await exists(rel)];
    })
  );
  const images = imageChecks.filter(([, , ok]) => ok);
  const icons = iconChecks.filter(([, , ok]) => ok);
  if (!images.length && !icons.length) return [];

  await new Promise((resolve) => {
    images.forEach(([key, url]) => scene.load.image(key, url));
    icons.forEach(([key, url]) => scene.load.svg(key, url, { width: ICON_SIZE, height: ICON_SIZE }));
    scene.load.once('complete', resolve);
    scene.load.on('loaderror', () => {
      /* 개별 실패는 무시 — 폴백 유지 */
    });
    scene.load.start();
  });
  return [...images, ...icons].map(([key]) => key);
}

// 컷씬 경로("cutscenes/prologue_01.png") → 텍스처 키, 없으면 null
export function cutsceneKey(scene, imagePath) {
  if (!imagePath) return null;
  const key = 'cutscene_' + imagePath.replace(/^cutscenes\//, '').replace(/\.png$/, '');
  return scene.textures.exists(key) ? key : null;
}

// 초상화 폴백 체인: 지정 표정 → bongi_neutral → 플레이스홀더
export function portraitKey(scene, name) {
  if (!name || name === 'none') return 'ph_portrait_none';
  const direct = 'portrait_' + name;
  if (scene.textures.exists(direct)) return direct;
  if (name.startsWith('bongi_') && name !== 'bongi_shadow') {
    if (scene.textures.exists('portrait_bongi_neutral')) return 'portrait_bongi_neutral';
    return 'ph_portrait_bongi';
  }
  const ph = 'ph_portrait_' + name;
  if (scene.textures.exists(ph)) return ph;
  return 'ph_portrait_none';
}
