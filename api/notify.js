// Vercel 서버리스 함수 — 신고 접수 시 이메일 알림 발송 (Gmail SMTP)
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { extinguisherId, extName, extAddress, station, center, type, memo, email } = req.body

  if (!email) return res.status(400).json({ error: '수신 이메일 없음' })

  const GMAIL_USER = process.env.GMAIL_USER
  const GMAIL_PASS = process.env.GMAIL_PASS
  if (!GMAIL_USER || !GMAIL_PASS) return res.status(500).json({ error: 'Gmail 환경변수 미설정' })

  const reportedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background: #dc2626; color: white; border-radius: 12px 12px 0 0; padding: 20px 24px;">
        <h1 style="margin: 0; font-size: 18px;">🧯 보이는소화기 이상 신고 접수</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">불끄미 — 서울시 화재안전 현장관리</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">담당 소방서</td><td style="padding: 8px 0; font-weight: 600;">${station}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">담당 센터</td><td style="padding: 8px 0; font-weight: 600;">${center}</td></tr>
          <tr style="background: #fef2f2;"><td style="padding: 8px 4px; color: #6b7280;">이상 유형</td><td style="padding: 8px 4px; font-weight: 700; color: #dc2626;">${type}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">소화기함</td><td style="padding: 8px 0;">${extName || '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">코드번호</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${extinguisherId}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">위치</td><td style="padding: 8px 0;">${extAddress || '-'}</td></tr>
          ${memo ? `<tr><td style="padding: 8px 0; color: #6b7280;">추가 내용</td><td style="padding: 8px 0;">${memo}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #6b7280;">신고 시각</td><td style="padding: 8px 0;">${reportedAt}</td></tr>
        </table>
      </div>
    </div>
  `

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `불끄미 <${GMAIL_USER}>`,
      to: email,
      subject: `[불끄미] ${station} ${center} — ${type} 신고 접수`,
      html,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[notify] Gmail 발송 오류:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
