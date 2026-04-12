// 이미지 업로드 API (base64 JSON → Vercel Blob REST API)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN 없음' })

  try {
    const { filename, contentType, data } = req.body
    if (!data) return res.status(400).json({ error: '이미지 데이터 없음' })

    const buffer = Buffer.from(data, 'base64')

    const blobRes = await fetch(`https://blob.vercel-storage.com/reports/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType ?? 'image/jpeg',
        'x-content-type': contentType ?? 'image/jpeg',
      },
      body: buffer,
    })

    if (!blobRes.ok) {
      const errText = await blobRes.text()
      return res.status(500).json({ error: `Blob 오류: ${blobRes.status} ${errText}` })
    }

    const blobData = await blobRes.json()
    return res.json({ url: blobData.url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
