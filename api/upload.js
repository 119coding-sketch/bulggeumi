// 이미지 업로드 API (Vercel Blob)
import { put } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN 없음' })
  }

  try {
    const filename = req.headers['x-filename'] ?? `report-${Date.now()}.jpg`
    const contentType = req.headers['x-content-type'] ?? 'image/jpeg'

    // req.body가 이미 Buffer로 파싱된 경우 (Vercel 자동 파싱)
    let buffer
    if (req.body instanceof Buffer && req.body.length > 0) {
      buffer = req.body
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      buffer = Buffer.from(req.body)
    } else {
      // 스트림에서 직접 수집
      buffer = await new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
      })
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: '파일 데이터가 없습니다.' })
    }

    const blob = await put(`reports/${filename}`, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return res.json({ url: blob.url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
