import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 스마트서울맵 API 프록시 — Referer 헤더를 서울맵 도메인으로 고정
      '/api/seoulProxy': {
        target: 'https://map.seoul.go.kr',
        changeOrigin: true,
        rewrite: (path) => {
          // apiPath 쿼리 파라미터를 URL 경로로 변환
          const url = new URL(path, 'http://localhost')
          const apiPath = url.searchParams.get('apiPath') ?? ''
          url.searchParams.delete('apiPath')
          return `/${apiPath}${url.search}`
        },
        headers: {
          Referer: 'https://map.seoul.go.kr/smgis2/openApi',
        },
      },
    },
  },
})
