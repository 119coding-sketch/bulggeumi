// 이미지 업로드 API (Vercel Blob)
import { put } from '@vercel/blob'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN 환경변수가 없습니다. Vercel Storage에서 프로젝트 연결을 확인하세요.' })
  }

  try {
    const filename = req.headers['x-filename'] ?? `report-${Date.now()}.jpg`
    const contentType = req.headers['x-content-type'] ?? 'image/jpeg'
    console.log('[upload] filename:', filename, 'contentType:', contentType)

    // req 스트림을 Buffer로 수집
    const buffer = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
    console.log('[upload] buffer size:', buffer.length)

    const blob = await put(`reports/${filename}`, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    console.log('[upload] success:', blob.url)

    return res.json({ url: blob.url })
  } catch (err) {
    console.error('[upload] error:', err.message, err.stack)
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
}
