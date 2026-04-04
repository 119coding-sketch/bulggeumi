// 이미지 업로드 API (Vercel Blob)
import { put } from '@vercel/blob'

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const filename = req.headers['x-filename'] ?? `report-${Date.now()}.jpg`
    const contentType = req.headers['x-content-type'] ?? 'image/jpeg'

    const blob = await put(`reports/${filename}`, req, {
      access: 'public',
      contentType,
    })

    return res.json({ url: blob.url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
