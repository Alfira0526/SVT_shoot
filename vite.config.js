import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages(정적) 배포 대비: base는 배포 리포지토리 경로에 맞춰 조정.
// 로컬/루트 배포 시 './' 상대경로가 안전(정적 호스팅 공통).
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  plugins: [
    // 홈 화면 추가(PWA) + 오프라인 캐시. main 배포마다 서비스 워커가 자동 갱신된다.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['og.png', 'icons/*.png', 'assets/**/*'],
      manifest: {
        name: '덕질할 결심',
        short_name: '덕질할 결심',
        description: '13정령과 함께 빛의 세계를 지키는 세로 탄막 슈팅. 비영리 팬 창작.',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1e1b3a',
        theme_color: '#1e1b3a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: null,
      },
    }),
  ],
});
