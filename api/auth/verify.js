// 이메일 인증 코드 확인 API
import { Redis } from '@upstash/redis'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: '잘못된 요청입니다.' })

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()

  const storedCode = await redis.get(`bulggeumi-verify:${normalizedEmail}`)
  if (!storedCode || String(storedCode) !== String(code).trim()) {
    return res.status(400).json({ error: '인증 코드가 올바르지 않거나 만료되었습니다.' })
  }

  // 사용자 인증 완료 처리
  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user) return res.status(400).json({ error: '사용자를 찾을 수 없습니다.' })

  await redis.set(`bulggeumi-user:${normalizedEmail}`, { ...user, verified: true })
  await redis.del(`bulggeumi-verify:${normalizedEmail}`)

  // 자동 로그인용 세션 토큰 발급 (7일)
  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(`bulggeumi-session:${token}`, normalizedEmail, { ex: 60 * 60 * 24 * 7 })

  return res.json({ ok: true, token, email: normalizedEmail })
}
