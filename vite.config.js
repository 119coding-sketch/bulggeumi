import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 스마트서울맵 API 프록시 — Referer 헤더를 서울맵 도메인으로 고정
      '/seoul-api': {
        target: 'https://map.seoul.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/seoul-api/, ''),
        headers: {
          Referer: 'https://map.seoul.go.kr/smgis2/openApi',
        },
      },
    },
  },
})
