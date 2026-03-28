// 신고 내역 저장/조회/수정 API (Upstash Redis)
import { Redis } from '@upstash/redis'

const KV_KEY = 'bulggeumi-reports'

export default async function handler(req, res) {
  const redis = Redis.fromEnv()

  // 전체 신고 조회
  if (req.method === 'GET') {
    try {
      const data = await redis.get(KV_KEY)
      return res.json(Array.isArray(data) ? data : [])
    } catch {
      return res.json([])
    }
  }

  // 신고 추가
  if (req.method === 'POST') {
    const report = req.body
    try {
      const reports = (await redis.get(KV_KEY)) ?? []
      await redis.set(KV_KEY, [report, ...reports])
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // 신고 상태 변경 (조치완료 등)
  if (req.method === 'PATCH') {
    const { id, status } = req.body
    try {
      const reports = (await redis.get(KV_KEY)) ?? []
      const updated = reports.map((r) => r.id === id ? { ...r, status } : r)
      await redis.set(KV_KEY, updated)
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).end()
}
