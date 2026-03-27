// Vercel 서버리스 함수 — 스마트서울맵 API 프록시
// Referer 헤더를 서버에서 붙여서 브라우저 CORS/인증 문제 우회
export default async function handler(req, res) {
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const { path: _, ...queryParams } = req.query

  const url = new URL(`https://map.seoul.go.kr/${pathSegments.join('/')}`)
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString(), {
    headers: {
      Referer: 'https://map.seoul.go.kr/smgis2/openApi',
    },
  })

  const data = await response.json()
  res.status(response.status).json(data)
}
