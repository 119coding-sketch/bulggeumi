// 로그아웃 API — 세션 토큰 삭제
import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const redis = Redis.fromEnv()
    await redis.del(`bulggeumi-session:${token}`)
  }

  return res.json({ ok: true })
}
