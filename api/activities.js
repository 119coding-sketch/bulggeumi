// 서포터즈 활동 기록 저장/조회 API (Upstash Redis)
import { Redis } from '@upstash/redis'

const KV_KEY = 'bulggeumi-activities'

export default async function handler(req, res) {
  const redis = Redis.fromEnv()

  // 활동 기록 조회 (이름 / 날짜범위 / 소방서 / 센터 필터 가능)
  if (req.method === 'GET') {
    const { name, date, dateFrom, dateTo, station, center } = req.query
    try {
      const data = await redis.get(KV_KEY)
      let activities = Array.isArray(data) ? data : []
      if (name) activities = activities.filter((a) => a.inspectorName === name)
      // 단일 날짜 (기존 호환)
      if (date) activities = activities.filter((a) => a.inspectedAt?.startsWith(date))
      // 날짜 범위
      if (dateFrom) activities = activities.filter((a) => a.inspectedAt >= dateFrom)
      if (dateTo)   activities = activities.filter((a) => a.inspectedAt <= dateTo + 'T23:59:59')
      if (station)  activities = activities.filter((a) => a.station === station)
      if (center)   activities = activities.filter((a) => a.center === center)
      // 최신순 정렬
      activities.sort((a, b) => (b.inspectedAt ?? '').localeCompare(a.inspectedAt ?? ''))
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
