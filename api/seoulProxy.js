// Vercel 서버리스 함수 — 스마트서울맵 API 프록시
// 브라우저에서 직접 설정 불가한 Referer 헤더를 서버에서 붙여 전달
import axios from 'axios'

export default async function handler(req, res) {
  const { apiPath, ...queryParams } = req.query
  const targetUrl = `https://map.seoul.go.kr/${apiPath}`

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
    console.error('[seoulProxy] 오류:', err.response?.status, err.message)
    res.status(err.response?.status ?? 500).json({
      error: err.message,
      detail: err.response?.data,
    })
  }
}
