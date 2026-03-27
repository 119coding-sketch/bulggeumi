import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 스마트서울맵 API 프록시 — Referer 헤더를 서울맵 도메인으로 고정
      '/api/seoul-proxy': {
        target: 'https://map.seoul.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/seoul-proxy/, ''),
        headers: {
          Referer: 'https://map.seoul.go.kr/smgis2/openApi',
        },
      },
    },
  },
})
