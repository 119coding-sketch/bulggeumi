// 비밀번호 변경 API
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' })
  }

  const redis = Redis.fromEnv()
  const email = await redis.get(`bulggeumi-session:${token}`)
  if (!email) return res.status(401).json({ error: '세션이 만료되었습니다.' })

  const user = await redis.get(`bulggeumi-user:${email}`)
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' })

  const newHash = await bcrypt.hash(newPassword, 10)
  await redis.set(`bulggeumi-user:${email}`, { ...user, passwordHash: newHash })

  return res.json({ ok: true })
}
