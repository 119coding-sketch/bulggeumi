// 현재 로그인 사용자 확인 API
import { Redis } from '@upstash/redis'

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const redis = Redis.fromEnv()
  const email = await redis.get(`bulggeumi-session:${token}`)
  if (!email) return res.status(401).json({ error: 'Unauthorized' })

  const user = await redis.get(`bulggeumi-user:${email}`)
  return res.json({ email, name: user?.name ?? '' })
}
