// 서포터즈 방문 기록 저장/조회 API (Upstash Redis)
import { Redis } from '@upstash/redis'

const KV_KEY = 'bulggeumi-visits'

export default async function handler(req, res) {
  const redis = Redis.fromEnv()

  // 방문 기록 조회 (선택적 날짜 필터)
  if (req.method === 'GET') {
    try {
      const data = await redis.get(KV_KEY)
      let visits = Array.isArray(data) ? data : []

      const { dateFrom, dateTo } = req.query
      if (dateFrom) visits = visits.filter((v) => v.visitedAt >= dateFrom)
      if (dateTo)   visits = visits.filter((v) => v.visitedAt <= dateTo + 'T23:59:59.999Z')

      return res.json(visits)
    } catch {
      return res.json([])
    }
  }

  // 방문 기록 추가
  if (req.method === 'POST') {
    try {
      const visit = req.body

      // 로그인 토큰으로 이메일 조회 (선택적)
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        const email = await redis.get(`bulggeumi-session:${token}`)
        if (email) {
          const user = await redis.get(`bulggeumi-user:${email}`)
          visit.email = email
          visit.name = user?.name ?? ''
        }
      }

      const visits = (await redis.get(KV_KEY)) ?? []
      await redis.set(KV_KEY, [visit, ...visits])
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).end()
}
