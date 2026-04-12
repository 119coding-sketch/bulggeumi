// 이미지 조회 API — Redis에서 base64 읽어서 이미지로 반환
import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).end()

  try {
    const redis = Redis.fromEnv()
    const record = await redis.get(`bulggeumi-img-${id}`)
    if (!record) return res.status(404).end()

    const { contentType, data } = record
    const buffer = Buffer.from(data, 'base64')

    res.setHeader('Content-Type', contentType ?? 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=2592000') // 30일 캐시
    return res.send(buffer)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
