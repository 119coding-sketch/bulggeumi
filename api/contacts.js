// 연락처 저장/조회 API (Upstash Redis)
import { Redis } from '@upstash/redis'

const KV_KEY = 'bulggeumi-contacts'

export default async function handler(req, res) {
  const redis = Redis.fromEnv()

  if (req.method === 'GET') {
    try {
      const data = await redis.get(KV_KEY)
      return res.json(data ?? {})
    } catch {
      return res.json({})
    }
  }

  if (req.method === 'POST') {
    const { station, center, data } = req.body
    try {
      const contacts = (await redis.get(KV_KEY)) ?? {}
      if (!contacts[station]) contacts[station] = {}
      contacts[station][center] = data
      await redis.set(KV_KEY, contacts)
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    const { station, center } = req.body
    try {
      const contacts = (await redis.get(KV_KEY)) ?? {}
      if (contacts[station]) {
        delete contacts[station][center]
        await redis.set(KV_KEY, contacts)
      }
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).end()
}
