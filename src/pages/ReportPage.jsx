import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import useReportStore from '../store/useReportStore'
import useMapStore from '../store/useMapStore'
import useContactStore from '../store/useContactStore'
import { resolveStationCenter } from '../utils/stationUtils'

function toKST(isoString) {
  return new Date(isoString).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// 이미지를 Canvas로 압축 후 base64 반환 (최대 1024px, JPEG 0.75)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.75)
    }
    img.onerror = reject
    img.src = url
  })
}

// 이미지 압축 → base64 JSON으로 업로드 후 URL 반환
async function uploadImage(file) {
  const filename = `report-${Date.now()}.jpg`
  const base64 = await compressImage(file)
  const uploadRes = await fetch('/api/imgupload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: 'image/jpeg', data: base64 }),
  })
  if (!uploadRes.ok) throw new Error('upload failed')
  const data = await uploadRes.json()
  return data.url
}

const REPORT_TYPES = [
  { type: '이상없음',   icon: '✅', desc: '소화기와 함이 모두 정상입니다', normal: true },
  { type: '소화기 없음', icon: '🚫', desc: '소화기가 없거나 수량이 부족합니다' },
  { type: '소화기 부족', icon: '⚠️', desc: '소화기 약제가 부족합니다' },
  { type: '함 파손',    icon: '🔨', desc: '소화기함이 파손되었습니다' },
  { type: '기타',       icon: '📝', desc: '기타 이상이 있습니다' },
]

const MEMO_MAX = 200

export default function ReportPage() {
  const { id } = useParams()
  const { extinguishers } = useMapStore()
  const { reports, addReport } = useReportStore()
  const { getContact, fetchContacts, isLoaded } = useContactStore()

  useEffect(() => {
    if (!isLoaded) fetchContacts()
  }, [isLoaded, fetchContacts])

  // 방문 기록 (마운트 시 1회, fire-and-forget)
  useEffect(() => {
    const { station: s, center: c } = resolveStationCenter(id)
    const token = localStorage.getItem('bulggeumi-token')
    fetch('/api/visits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        visitedAt: new Date().toISOString(),
        extinguisherId: id,
        station: s,
        center: c,
      }),
    }).catch(() => {})
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const ext = extinguishers.find((e) => String(e.id) === String(id))
  const { station, center } = ext
    ? { station: ext.station, center: ext.center }
    : resolveStationCenter(id)
  const contact = getContact(station, center)

  // 미완료 신고 이력 확인 (이상없음 제외)
  const activeReport = reports.find(
    (r) => String(r.extinguisherId) === String(id) && r.status !== '완료' && r.type !== '이상없음'
  )

  const [selectedType, setSelectedType] = useState(null)
  const [memo, setMemo] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notifyError, setNotifyError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const imageInputRef = useRef(null)
  const isNormalType = selectedType === '이상없음'

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setSubmitError(null)
  }

  function handleImageRemove() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (!selectedType) return
    setSubmitting(true)
    setNotifyError(null)
    setSubmitError(null)

    let imageUrl = null
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile)
      } catch {
        setSubmitting(false)
        setSubmitError('이미지 업로드에 실패했습니다. 다시 시도해주세요.')
        return
      }
    }

    const report = {
      id: Date.now(),
      extinguisherId: id,
      type: selectedType,
      memo: memo.trim(),
      imageUrl,
      reportedAt: new Date().toISOString(),
      status: '접수',
    }
    try {
      await addReport(report)
    } catch {
      setSubmitting(false)
      setSubmitError('신고 접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    if (contact.email && !isNormalType) {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            extinguisherId: id,
            extName: ext?.name ?? '',
            extAddress: ext?.address ?? '',
            station, center,
            type: selectedType,
            memo: memo.trim(),
            email: contact.email,
          }),
        })
      } catch {
        setNotifyError('알림 발송에 실패했습니다. 신고는 정상 접수되었습니다.')
      }
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  // 제출 완료 화면
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isNormalType ? '정상 확인이 기록되었습니다' : '신고가 접수되었습니다'}
          </h2>
          <p className="text-sm text-gray-500 mb-1">
            {isNormalType ? '소화기 정상 상태가 저장되었습니다.' : '담당 센터에 알림이 발송되었습니다.'}
          </p>
          {!isNormalType && <p className="text-sm text-gray-500">빠르게 확인 후 조치하겠습니다.</p>}
          {notifyError && <p className="mt-3 text-xs text-orange-500">{notifyError}</p>}
          <div className="mt-6 p-3 bg-gray-50 rounded-xl text-xs text-gray-400">
            확인 유형: <span className="font-medium text-gray-600">{selectedType}</span>
          </div>
          <p className="mt-5 text-xs text-gray-300">다른 소화기함 점검은 현장 QR 코드를 스캔해주세요</p>
        </div>
      </div>
    )
  }

  // 이미 신고된 소화기 안내
  if (activeReport && !submitting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🔧</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">이미 신고된 소화기함입니다</h2>
          <p className="text-sm text-gray-500 mb-1">담당 센터에서 현재 처리 중입니다.</p>
          <p className="text-sm text-gray-500">조치가 완료되면 정상 상태로 변경됩니다.</p>
          <div className="mt-5 p-3 bg-orange-50 rounded-xl text-xs text-orange-600 border border-orange-100">
            신고 유형: <span className="font-semibold">{activeReport.type}</span>
            <span className="mx-2 text-orange-300">·</span>
            신고 시각: <span className="font-semibold">{toKST(activeReport.reportedAt)}</span>
          </div>
          <p className="mt-5 text-xs text-gray-300">다른 소화기함 점검은 현장 QR 코드를 스캔해주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-sm mx-auto">

        {/* 헤더 */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🧯</div>
          <h1 className="text-xl font-bold text-gray-800">보이는소화기 점검</h1>
          <p className="text-sm text-gray-500 mt-1">불끄미 — 서울시 화재안전 현장관리</p>
        </div>

        {/* 소화기 정보 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5">
          {ext ? (
            <>
              <p className="font-semibold text-sm text-gray-800">{ext.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ext.address}</p>
              <p className="text-xs text-gray-300 mt-1">{station} · {center}</p>
              <p className="text-xs text-gray-300 mt-1 font-mono">코드번호 : {id}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">담당 센터</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">
                {station || '확인 중'} {center ? `· ${center}` : ''}
              </p>
              <p className="text-xs text-gray-300 mt-1 font-mono">코드번호 : {id}</p>
            </>
          )}
        </div>

        {/* 상태 선택 */}
        <p className="text-sm font-semibold text-gray-700 mb-3">소화기 상태를 선택해주세요</p>
        <div className="space-y-2 mb-5">
          {REPORT_TYPES.map(({ type, icon, desc, normal }) => (
            <button key={type} onClick={() => setSelectedType(type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                ${selectedType === type
                  ? normal ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-red-50 border-red-400 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'}`}>
              <span className="text-2xl">{icon}</span>
              <div>
                <p className={`text-sm font-medium ${
                  selectedType === type ? (normal ? 'text-green-700' : 'text-red-700') : 'text-gray-800'}`}>
                  {type}
                </p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              {selectedType === type && (
                <span className={`ml-auto text-lg ${normal ? 'text-green-500' : 'text-red-500'}`}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* 추가 내용 */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            추가 내용 <span className="text-gray-400 font-normal">(선택)</span>
          </label>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
            placeholder="내용을 자세히 적어주시면 빠른 대응에 도움이 됩니다."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
              focus:outline-none focus:border-red-400 resize-none text-gray-700 placeholder:text-gray-300" />
          <p className={`text-xs text-right mt-1 ${memo.length >= MEMO_MAX ? 'text-red-400' : 'text-gray-300'}`}>
            {memo.length}/{MEMO_MAX}
          </p>
        </div>

        {/* 사진 첨부 */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            사진 첨부 <span className="text-gray-400 font-normal">(선택)</span>
          </label>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="첨부 이미지"
                className="w-full h-48 object-cover rounded-xl border border-gray-200" />
              <button type="button" onClick={handleImageRemove}
                className="absolute top-2 right-2 bg-black/50 text-white w-7 h-7 rounded-full text-sm flex items-center justify-center hover:bg-black/70">
                ✕
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => imageInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-300 hover:bg-gray-50 transition-all">
              <span className="text-2xl">📷</span>
              <span className="text-xs">사진 선택 (최대 10MB)</span>
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        {/* 제출 버튼 */}
        <button onClick={handleSubmit} disabled={!selectedType || submitting}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all
            ${selectedType
              ? isNormalType ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          {submitting
            ? (imageFile ? '업로드 중...' : '접수 중...')
            : isNormalType ? '정상 확인 제출' : '이상 신고 제출'}
        </button>
        {submitError && <p className="mt-3 text-xs text-red-500 text-center">{submitError}</p>}
        <p className="text-center text-xs text-gray-300 mt-4">허위 신고 시 불이익이 발생할 수 있습니다</p>

      </div>
    </div>
  )
}
