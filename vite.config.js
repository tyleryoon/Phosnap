import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// 지금 보고 있는 화면이 **어느 커밋인지** 알 수 있게 심는다.
//
// 왜 필요한가
//   푸시하고 확인했는데 고친 게 안 보이면, 원인이 셋이다.
//     1. 빌드가 아직 안 끝났다
//     2. 브라우저·서비스워커가 옛 화면을 주고 있다
//     3. 코드가 틀렸다
//
//   이걸 구분할 방법이 없으면 3번부터 의심하게 된다. 실제로 그러다
//   멀쩡한 코드를 한참 들여다봤다. 화면이 자기 버전을 말하게 하면
//   1·2번을 5초 만에 배제할 수 있다.
//
//   브라우저 콘솔에서:  window.__BUILD__
//
// Vercel 은 VERCEL_GIT_COMMIT_SHA 를 준다. 로컬에서는 git 에게 묻는다.
// 둘 다 없으면 'unknown' — 거짓 값을 넣지 않는다.
const commit = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'unknown'; }
})();

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
