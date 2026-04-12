// 로그인 API
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' })

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()

  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  }
  if (!user.verified) {
    return res.status(401).json({ error: '이메일 인증이 완료되지 않았습니다.' })
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  }

  // 세션 토큰 발급 (7일)
  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(`bulggeumi-session:${token}`, normalizedEmail, { ex: 60 * 60 * 24 * 7 })

  return res.json({ ok: true, token, email: normalizedEmail })
}
