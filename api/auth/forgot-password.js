// 비밀번호 찾기 — @seoul.go.kr 이메일로 재설정 코드 발송
import { Redis } from '@upstash/redis'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email || !email.toLowerCase().endsWith('@seoul.go.kr')) {
    return res.status(400).json({ error: '@seoul.go.kr 이메일을 입력해주세요.' })
  }

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()

  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user || !user.verified) {
    // 보안상 존재 여부 노출 안 함
    return res.json({ ok: true })
  }

  // 6자리 재설정 코드 (30분 TTL)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await redis.set(`bulggeumi-reset:${normalizedEmail}`, code, { ex: 60 * 30 })

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    })
    await transporter.sendMail({
      from: `"불끄미" <${process.env.GMAIL_USER}>`,
      to: normalizedEmail,
      subject: '[불끄미] 비밀번호 재설정 코드',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#dc2626;margin-bottom:8px;">🧯 불끄미 비밀번호 재설정</h2>
          <p style="color:#374151;">아래 코드를 입력해 비밀번호를 재설정하세요. <strong>30분 이내</strong>에 사용해야 합니다.</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:12px;text-align:center;
            background:#f3f4f6;padding:28px;border-radius:12px;color:#111827;margin:20px 0;">
            ${code}
          </div>
          <p style="color:#9ca3af;font-size:12px;">본인이 요청하지 않은 경우 이 이메일을 무시해주세요.</p>
        </div>
      `,
    })
  } catch {
    return res.status(500).json({ error: '이메일 발송에 실패했습니다.' })
  }

  return res.json({ ok: true })
}
