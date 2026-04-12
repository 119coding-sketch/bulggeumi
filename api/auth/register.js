// 회원가입 API — @seoul.go.kr 이메일만 허용, 6자리 인증코드 발송
import { Redis } from '@upstash/redis'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, name } = req.body

  // @seoul.go.kr 이메일만 허용
  if (!email || !email.toLowerCase().endsWith('@seoul.go.kr')) {
    return res.status(400).json({ error: '@seoul.go.kr 이메일만 가입 가능합니다.' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' })
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' })
  }

  const redis = Redis.fromEnv()
  const normalizedEmail = email.toLowerCase()

  // 이미 가입된 이메일 확인
  const existing = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (existing?.verified) {
    return res.status(409).json({ error: '이미 가입된 이메일입니다.' })
  }

  // 비밀번호 해시
  const passwordHash = await bcrypt.hash(password, 10)

  // 미인증 사용자 저장
  await redis.set(`bulggeumi-user:${normalizedEmail}`, {
    email: normalizedEmail,
    name: name.trim(),
    passwordHash,
    verified: false,
    createdAt: new Date().toISOString(),
  })

  // 6자리 인증 코드 생성 (30분 TTL)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await redis.set(`bulggeumi-verify:${normalizedEmail}`, code, { ex: 60 * 30 })

  // 인증 이메일 발송
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    })
    await transporter.sendMail({
      from: `"불끄미" <${process.env.GMAIL_USER}>`,
      to: normalizedEmail,
      subject: '[불끄미] 이메일 인증 코드',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#dc2626;margin-bottom:8px;">🧯 불끄미 이메일 인증</h2>
          <p style="color:#374151;">아래 인증 코드를 입력해주세요. <strong>30분 이내</strong>에 사용해야 합니다.</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:12px;text-align:center;
            background:#f3f4f6;padding:28px;border-radius:12px;color:#111827;margin:20px 0;">
            ${code}
          </div>
          <p style="color:#9ca3af;font-size:12px;">본인이 요청하지 않은 경우 이 이메일을 무시해주세요.</p>
        </div>
      `,
    })
  } catch (err) {
    return res.status(500).json({ error: '인증 이메일 발송에 실패했습니다.' })
  }

  return res.json({ ok: true })
}
