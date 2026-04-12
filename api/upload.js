// 이미지 업로드 API 디버그용 최소 버전
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).end()
  return res.status(200).json({ ok: true, method: req.method })
}
