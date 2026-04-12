// 비밀번호 재설정 — 코드 확인 후 새 비밀번호 저장
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, code, newPassword } = req.body
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' })
  }

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()

  const storedCode = await redis.get(`bulggeumi-reset:${normalizedEmail}`)
  if (!storedCode || String(storedCode) !== String(code).trim()) {
    return res.status(400).json({ error: '코드가 올바르지 않거나 만료되었습니다.' })
  }

  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await redis.set(`bulggeumi-user:${normalizedEmail}`, { ...user, passwordHash })
  await redis.del(`bulggeumi-reset:${normalizedEmail}`)

  return res.json({ ok: true })
}
