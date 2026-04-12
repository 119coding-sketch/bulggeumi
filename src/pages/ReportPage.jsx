import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

// GPS 좌표 수집 (최대 8초 대기)
function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 0 }
    )
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
async function uploadImage(file, prefix = 'report') {
  const filename = `${prefix}-${Date.now()}.jpg`
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
  const navigate = useNavigate()
  const { extinguishers } = useMapStore()
  const { reports, addReport } = useReportStore()
  const { getContact, fetchContacts, isLoaded } = useContactStore()

  useEffect(() => {
    if (!isLoaded) fetchContacts()
  }, [isLoaded, fetchContacts])

  const ext = extinguishers.find((e) => String(e.id) === String(id))
  const { station, center } = ext
    ? { station: ext.station, center: ext.center }
    : resolveStationCenter(id)
  const contact = getContact(station, center)

  // 미완료 신고 이력 확인 (이상없음 제외)
  const activeReport = reports.find(
    (r) => String(r.extinguisherId) === String(id) && r.status !== '완료' && r.type !== '이상없음'
  )

  // 탭: 'report' | 'activity'
  const [mode, setMode] = useState('report')

  // ── 이상 신고 상태 ──
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

  // ── 활동 기록 상태 (서포터즈) ──
  const [inspectorName, setInspectorName] = useState(() => localStorage.getItem('bulggeumi-inspector') ?? '')
  const [activityResult, setActivityResult] = useState('정상')
  const [activityMemo, setActivityMemo] = useState('')
  const [activityFile, setActivityFile] = useState(null)
  const [activityPreview, setActivityPreview] = useState(null)
  const activityImageRef = useRef(null)
  const [gps, setGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [activitySubmitted, setActivitySubmitted] = useState(false)
  const [activitySubmitting, setActivitySubmitting] = useState(false)
  const [activityError, setActivityError] = useState(null)

  // 마운트 시 GPS 미리 수집
  useEffect(() => {
    setGpsLoading(true)
    getGPS().then((pos) => {
      setGps(pos)
      setGpsLoading(false)
    })
  }, [])

  // ── 이상 신고 이미지 처리 ──
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

  // ── 활동 기록 이미지 처리 ──
  function handleActivityImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setActivityError('이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    setActivityFile(file)
    setActivityPreview(URL.createObjectURL(file))
    setActivityError(null)
  }

  function handleActivityImageRemove() {
    setActivityFile(null)
    if (activityPreview) URL.revokeObjectURL(activityPreview)
    setActivityPreview(null)
    if (activityImageRef.current) activityImageRef.current.value = ''
  }

  // ── 이상 신고 제출 ──
  async function handleSubmit() {
    if (!selectedType) return
    setSubmitting(true)
    setNotifyError(null)
    setSubmitError(null)

    let imageUrl = null
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile, 'report')
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

  // ── 활동 기록 제출 ──
  async function handleActivitySubmit() {
    if (!inspectorName.trim()) return
    setActivitySubmitting(true)
    setActivityError(null)

    localStorage.setItem('bulggeumi-inspector', inspectorName.trim())

    let imageUrl = null
    if (activityFile) {
      try {
        imageUrl = await uploadImage(activityFile, 'activity')
      } catch {
        setActivitySubmitting(false)
        setActivityError('이미지 업로드에 실패했습니다. 다시 시도해주세요.')
        return
      }
    }

    const activity = {
      id: Date.now(),
      inspectorName: inspectorName.trim(),
      extinguisherId: id,
      extName: ext?.name ?? '',
      extAddress: ext?.address ?? '',
      station,
      center,
      result: activityResult,
      memo: activityMemo.trim(),
      imageUrl,
      gps: gps ?? null,
      inspectedAt: new Date().toISOString(),
    }

    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      })
    } catch {
      // 저장 실패해도 완료 화면 표시
    }

    // 이상 있음 선택 시 신고도 함께 접수
    if (activityResult === '이상') {
      const report = {
        id: Date.now() + 1,
        extinguisherId: id,
        type: '기타',
        memo: `[활동기록 연계] ${activityMemo.trim() || '현장 점검 중 이상 확인'}`,
        imageUrl,
        reportedAt: new Date().toISOString(),
        status: '접수',
      }
      try { await addReport(report) } catch { /* ignore */ }
    }

    setActivitySubmitting(false)
    setActivitySubmitted(true)
  }

  // ── 이상 신고 완료 화면 ──
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
          <button onClick={() => navigate('/')}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            지도로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ── 활동 기록 완료 화면 ──
  if (activitySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">활동이 기록되었습니다</h2>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-semibold text-gray-700">{inspectorName}</span>님의 점검 기록이 저장되었습니다.
          </p>
          {gps && (
            <p className="text-xs text-gray-400 mt-1">
              위치: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          )}
          <div className="mt-5 p-3 bg-blue-50 rounded-xl text-xs text-blue-600 border border-blue-100">
            점검 결과: <span className="font-semibold">{activityResult}</span>
            {activityResult === '이상' && <span className="ml-2 text-orange-500">· 신고 접수됨</span>}
          </div>
          <button onClick={() => navigate('/activities')}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            활동 일지 보기
          </button>
          <button onClick={() => navigate('/')}
            className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">
            지도로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ── 이미 신고된 소화기 안내 (신고 모드에서만) ──
  if (activeReport && !submitting && mode === 'report') {
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
          <button onClick={() => setMode('activity')}
            className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            활동 기록하기 (서포터즈)
          </button>
          <button onClick={() => navigate('/')}
            className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            지도로 돌아가기
          </button>
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

        {/* 모드 탭 */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button onClick={() => setMode('report')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${mode === 'report' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>
            이상 신고
          </button>
          <button onClick={() => setMode('activity')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${mode === 'activity' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
            활동 기록
          </button>
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

        {/* ── 이상 신고 모드 ── */}
        {mode === 'report' && (
          <>
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
          </>
        )}

        {/* ── 활동 기록 모드 (서포터즈) ── */}
        {mode === 'activity' && (
          <>
            {/* 점검자 이름 */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                점검자 이름 <span className="text-red-500">*</span>
              </label>
              <input type="text" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)}
                placeholder="홍길동"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-blue-400 text-gray-700 placeholder:text-gray-300" />
            </div>

            {/* 점검 결과 */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">점검 결과</p>
              <div className="flex gap-2">
                {['정상', '이상'].map((r) => (
                  <button key={r} onClick={() => setActivityResult(r)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                      ${activityResult === r
                        ? r === '정상' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-orange-50 border-orange-400 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-500'}`}>
                    {r === '정상' ? '✅ 정상' : '⚠️ 이상'}
                  </button>
                ))}
              </div>
              {activityResult === '이상' && (
                <p className="text-xs text-orange-500 mt-1.5">이상 선택 시 신고도 함께 접수됩니다.</p>
              )}
            </div>

            {/* 현장 사진 */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                현장 사진 <span className="text-gray-400 font-normal">(활동 증빙용)</span>
              </label>
              {activityPreview ? (
                <div className="relative">
                  <img src={activityPreview} alt="현장 사진"
                    className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={handleActivityImageRemove}
                    className="absolute top-2 right-2 bg-black/50 text-white w-7 h-7 rounded-full text-sm flex items-center justify-center hover:bg-black/70">
                    ✕
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => activityImageRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-all">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs">사진 촬영 / 업로드 (최대 10MB)</span>
                </button>
              )}
              <input ref={activityImageRef} type="file" accept="image/*" capture="environment"
                onChange={handleActivityImageChange} className="hidden" />
            </div>

            {/* GPS 상태 */}
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
              {gpsLoading ? (
                <><span className="animate-pulse">📍</span> 위치 수집 중...</>
              ) : gps ? (
                <><span className="text-green-500">📍</span> 위치 자동 기록됨 ({gps.lat.toFixed(4)}, {gps.lng.toFixed(4)})</>
              ) : (
                <><span className="text-gray-300">📍</span> 위치 수집 실패 (활동 기록은 가능)</>
              )}
            </div>

            {/* 점검 메모 */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                점검 메모 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <textarea value={activityMemo} onChange={(e) => setActivityMemo(e.target.value.slice(0, MEMO_MAX))}
                placeholder="점검 내용을 간략히 기록해주세요."
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
                  focus:outline-none focus:border-blue-400 resize-none text-gray-700 placeholder:text-gray-300" />
            </div>

            <button onClick={handleActivitySubmit}
              disabled={!inspectorName.trim() || activitySubmitting}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all
                ${inspectorName.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {activitySubmitting ? (activityFile ? '업로드 중...' : '기록 저장 중...') : '활동 기록 저장'}
            </button>
            {activityError && <p className="mt-3 text-xs text-red-500 text-center">{activityError}</p>}

            <button onClick={() => navigate('/activities')}
              className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium text-blue-500 hover:text-blue-600">
              내 활동 일지 보기 →
            </button>
          </>
        )}

      </div>
    </div>
  )
}
