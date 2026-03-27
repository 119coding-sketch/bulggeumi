import { useState } from 'react'
import { useParams } from 'react-router-dom'
import useReportStore from '../store/useReportStore'
import useMapStore from '../store/useMapStore'
import useContactStore from '../store/useContactStore'
import { resolveStationCenter } from '../utils/stationUtils'

const REPORT_TYPES = [
  { type: '소화기 없음', icon: '🚫', desc: '소화기가 없거나 수량이 부족합니다' },
  { type: '소화기 부족', icon: '⚠️', desc: '소화기 약제가 부족합니다' },
  { type: '함 파손',    icon: '🔨', desc: '소화기함이 파손되었습니다' },
  { type: '기타',       icon: '📝', desc: '기타 이상이 있습니다' },
]

export default function ReportPage() {
  const { id } = useParams()
  const { extinguishers } = useMapStore()
  const { addReport } = useReportStore()
  const { getContact } = useContactStore()

  // 스토어에 데이터 있으면 사용, 없으면 ID에서 직접 파싱
  const ext = extinguishers.find((e) => String(e.id) === String(id))
  const { station, center } = ext
    ? { station: ext.station, center: ext.center }
    : resolveStationCenter(id)

  // 해당 센터의 알림 이메일 조회
  const contact = getContact(station, center)

  const [selectedType, setSelectedType] = useState(null)
  const [memo, setMemo] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notifyError, setNotifyError] = useState(null)

  async function handleSubmit() {
    if (!selectedType) return
    setSubmitting(true)
    setNotifyError(null)

    const report = {
      id: Date.now(),
      extinguisherId: id,
      type: selectedType,
      memo: memo.trim(),
      reportedAt: new Date().toISOString(),
      status: '접수',
    }
    addReport(report)

    // 이메일 발송
    if (contact.email) {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            extinguisherId: id,
            extName: ext?.name ?? '',
            extAddress: ext?.address ?? '',
            station,
            center,
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

  // 신고 완료 화면
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">신고가 접수되었습니다</h2>
          <p className="text-sm text-gray-500 mb-1">담당 센터에 알림이 발송되었습니다.</p>
          <p className="text-sm text-gray-500">빠르게 확인 후 조치하겠습니다.</p>
          {notifyError && (
            <p className="mt-3 text-xs text-orange-500">{notifyError}</p>
          )}
          <div className="mt-6 p-3 bg-gray-50 rounded-xl text-xs text-gray-400">
            신고 유형: <span className="font-medium text-gray-600">{selectedType}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-sm mx-auto">

        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🧯</div>
          <h1 className="text-xl font-bold text-gray-800">보이는소화기 이상 신고</h1>
          <p className="text-sm text-gray-500 mt-1">불끄미 — 서울시 화재안전 현장관리</p>
        </div>

        {/* 소화기 정보 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5">
          {ext ? (
            <>
              <p className="font-semibold text-sm text-gray-800">{ext.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ext.address}</p>
              <p className="text-xs text-gray-300 mt-1">{station} · {center}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">담당 센터</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">
                {station || '확인 중'} {center ? `· ${center}` : ''}
              </p>
            </>
          )}
        </div>

        {/* 신고 유형 선택 */}
        <p className="text-sm font-semibold text-gray-700 mb-3">이상 유형을 선택해주세요</p>
        <div className="space-y-2 mb-5">
          {REPORT_TYPES.map(({ type, icon, desc }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                ${selectedType === type
                  ? 'bg-red-50 border-red-400 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className={`text-sm font-medium ${selectedType === type ? 'text-red-700' : 'text-gray-800'}`}>
                  {type}
                </p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              {selectedType === type && <span className="ml-auto text-red-500 text-lg">✓</span>}
            </button>
          ))}
        </div>

        {/* 메모 */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            추가 내용 <span className="text-gray-400 font-normal">(선택)</span>
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이상 내용을 자세히 적어주시면 빠른 대응에 도움이 됩니다."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5
              focus:outline-none focus:border-red-400 resize-none text-gray-700
              placeholder:text-gray-300"
          />
        </div>

        {/* 제출 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!selectedType || submitting}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all
            ${selectedType
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          {submitting ? '신고 접수 중...' : '신고 제출'}
        </button>

        <p className="text-center text-xs text-gray-300 mt-4">
          허위 신고 시 불이익이 발생할 수 있습니다
        </p>

      </div>
    </div>
  )
}
