// Vercel 서버리스 함수 — 스마트서울맵 API 프록시
import axios from 'axios'

export default async function handler(req, res) {
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const { path: _, ...queryParams } = req.query

  const targetPath = pathSegments.join('/')
  const targetUrl = `https://map.seoul.go.kr/${targetPath}`

  console.log('[seoul-proxy] 요청 URL:', targetUrl)
  console.log('[seoul-proxy] 쿼리 파라미터:', queryParams)

  try {
    const response = await axios.get(targetUrl, {
      params: queryParams,
      headers: {
        Referer: 'https://map.seoul.go.kr/smgis2/openApi',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 15000,
    })
    res.status(200).json(response.data)
  } catch (err) {
    console.error('[seoul-proxy] 오류:', err.response?.status, err.response?.data ?? err.message)
    res.status(err.response?.status ?? 500).json({
      error: err.message,
      detail: err.response?.data,
    })
  }
}
