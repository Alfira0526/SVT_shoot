import { defineConfig } from 'vite';

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
});
