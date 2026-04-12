// auth 통합 라우터 — /api/auth/:action 으로 모든 인증 요청 처리
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  })
}

// ── register ──────────────────────────────────────────────
async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password, name } = req.body
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
  const existing = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (existing?.verified) {
    return res.status(409).json({ error: '이미 가입된 이메일입니다.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await redis.set(`bulggeumi-user:${normalizedEmail}`, {
    email: normalizedEmail, name: name.trim(), passwordHash,
    verified: false, createdAt: new Date().toISOString(),
  })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  await redis.set(`bulggeumi-verify:${normalizedEmail}`, code, { ex: 60 * 30 })

  try {
    await makeTransporter().sendMail({
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
  } catch {
    return res.status(500).json({ error: '인증 이메일 발송에 실패했습니다.' })
  }
  return res.json({ ok: true })
}

// ── verify ────────────────────────────────────────────────
async function verify(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: '잘못된 요청입니다.' })

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()
  const storedCode = await redis.get(`bulggeumi-verify:${normalizedEmail}`)
  if (!storedCode || String(storedCode) !== String(code).trim()) {
    return res.status(400).json({ error: '인증 코드가 올바르지 않거나 만료되었습니다.' })
  }

  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user) return res.status(400).json({ error: '사용자를 찾을 수 없습니다.' })

  await redis.set(`bulggeumi-user:${normalizedEmail}`, { ...user, verified: true })
  await redis.del(`bulggeumi-verify:${normalizedEmail}`)

  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(`bulggeumi-session:${token}`, normalizedEmail, { ex: 60 * 60 * 24 * 7 })
  return res.json({ ok: true, token, email: normalizedEmail })
}

// ── login ─────────────────────────────────────────────────
async function login(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' })

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()
  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  if (!user.verified) return res.status(401).json({ error: '이메일 인증이 완료되지 않았습니다.' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })

  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(`bulggeumi-session:${token}`, normalizedEmail, { ex: 60 * 60 * 24 * 7 })
  return res.json({ ok: true, token, email: normalizedEmail })
}

// ── logout ────────────────────────────────────────────────
async function logout(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const redis = Redis.fromEnv()
    await redis.del(`bulggeumi-session:${token}`)
  }
  return res.json({ ok: true })
}

// ── me ────────────────────────────────────────────────────
async function me(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const redis = Redis.fromEnv()
  const email = await redis.get(`bulggeumi-session:${token}`)
  if (!email) return res.status(401).json({ error: 'Unauthorized' })

  const user = await redis.get(`bulggeumi-user:${email}`)
  return res.json({ email, name: user?.name ?? '' })
}

// ── change-password ───────────────────────────────────────
async function changePassword(req, res) {
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

// ── forgot-password ───────────────────────────────────────
async function forgotPassword(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email } = req.body
  if (!email || !email.toLowerCase().endsWith('@seoul.go.kr')) {
    return res.status(400).json({ error: '@seoul.go.kr 이메일을 입력해주세요.' })
  }

  const normalizedEmail = email.toLowerCase()
  const redis = Redis.fromEnv()
  const user = await redis.get(`bulggeumi-user:${normalizedEmail}`)
  if (!user || !user.verified) return res.json({ ok: true }) // 보안상 존재 여부 노출 안 함

  const code = String(Math.floor(100000 + Math.random() * 900000))
  await redis.set(`bulggeumi-reset:${normalizedEmail}`, code, { ex: 60 * 30 })

  try {
    await makeTransporter().sendMail({
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

// ── reset-password ────────────────────────────────────────
async function resetPassword(req, res) {
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

// ── 라우터 ────────────────────────────────────────────────
const ACTIONS = {
  register,
  verify,
  login,
  logout,
  me,
  'change-password': changePassword,
  'forgot-password': forgotPassword,
  'reset-password': resetPassword,
}

export default async function handler(req, res) {
  const action = req.query.action
  const fn = ACTIONS[action]
  if (!fn) return res.status(404).json({ error: 'Not found' })
  return fn(req, res)
}
