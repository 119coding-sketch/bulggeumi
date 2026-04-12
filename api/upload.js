// 이미지 업로드 API (Vercel Blob REST API 직접 호출)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN 없음' })
  }

  try {
    const filename = req.headers['x-filename'] ?? `report-${Date.now()}.jpg`
    const contentType = req.headers['x-content-type'] ?? 'image/jpeg'

    // 스트림에서 body 수집
    const buffer = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: '파일 데이터가 없습니다.' })
    }

    // Vercel Blob REST API 직접 호출
    const blobRes = await fetch(`https://blob.vercel-storage.com/reports/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'x-content-type': contentType,
      },
      body: buffer,
    })

    if (!blobRes.ok) {
      const errText = await blobRes.text()
      return res.status(500).json({ error: `Blob API 오류: ${blobRes.status} ${errText}` })
    }

    const data = await blobRes.json()
    return res.json({ url: data.url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
