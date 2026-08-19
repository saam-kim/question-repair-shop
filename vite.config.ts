import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/question-repair-shop/',
  plugins: [react(), tailwindcss()],
  // 프로젝트가 OneDrive로 동기화되는 Desktop 폴더 안에 있어, 기본 node_modules/.vite
  // 캐시 위치에서 파일 rename 도중 OneDrive가 잠깐 잠궈 EPERM이 발생할 수 있다.
  // 캐시를 동기화 대상이 아닌 로컬 임시 경로로 옮겨 회피한다.
  cacheDir: 'C:/Users/USER/AppData/Local/Temp/vite-cache-question-repair-shop',
})
