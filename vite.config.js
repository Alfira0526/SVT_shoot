import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 배포를 위해 상대 경로 기반 빌드 (D4 전체 공개, §5 호스팅)
export default defineConfig({
  base: './',
  // 작업 폴더가 정션/심볼릭 링크인 환경에서 realpath로 바뀌어 파일을 못 찾는 문제 방지
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
  },
  plugins: [
    // 홈 화면 추가(PWA) + 오프라인 캐시. 새 버전 배포 시 자동 갱신.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'og.png', 'icons/*.png', 'assets/**/*'],
      manifest: {
        name: '덕질할 결심',
        short_name: '덕질할 결심',
        description: '2~3분 안에 덕질 스트레스를 탄막으로 해소하는 세로 슈팅. 비영리 팬 창작.',
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
        navigateFallback: null,
      },
    }),
  ],
});
