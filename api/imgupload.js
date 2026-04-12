// 이미지 업로드 API — Upstash Redis에 base64 저장
import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { filename, contentType, data } = req.body
    if (!data) return res.status(400).json({ error: '이미지 데이터 없음' })

    const id = filename?.replace(/\.[^.]+$/, '') ?? `img-${Date.now()}`
    const redis = Redis.fromEnv()
    // 90일 보관
    await redis.set(`bulggeumi-img-${id}`, { contentType, data }, { ex: 60 * 60 * 24 * 90 })

    return res.json({ url: `/api/img/${id}` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
