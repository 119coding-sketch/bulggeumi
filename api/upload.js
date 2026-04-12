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

    // req 스트림을 Buffer로 수집 후 업로드 (스트림 직접 전달 시 오류 발생 가능)
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    const blob = await put(`reports/${filename}`, buffer, {
      access: 'public',
      contentType,
    })

    return res.json({ url: blob.url })
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
}
