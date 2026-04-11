// 서포터즈 활동 기록 저장/조회 API (Upstash Redis)
import { Redis } from '@upstash/redis'

const KV_KEY = 'bulggeumi-activities'

export default async function handler(req, res) {
  const redis = Redis.fromEnv()

  // 활동 기록 조회 (이름 / 날짜 필터 가능)
  if (req.method === 'GET') {
    const { name, date } = req.query
    try {
      const data = await redis.get(KV_KEY)
      let activities = Array.isArray(data) ? data : []
      if (name) activities = activities.filter((a) => a.inspectorName === name)
      if (date) activities = activities.filter((a) => a.inspectedAt?.startsWith(date))
      return res.json(activities)
    } catch {
      return res.json([])
    }
  }

  // 활동 기록 저장
  if (req.method === 'POST') {
    const activity = req.body
    try {
      const activities = (await redis.get(KV_KEY)) ?? []
      await redis.set(KV_KEY, [activity, ...activities])
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).end()
}
