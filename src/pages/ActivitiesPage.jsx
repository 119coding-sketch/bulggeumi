import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

function toKST(isoString) {
  return new Date(isoString).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function todayStr() {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '').trim()
}

// 'YYYY-MM-DD' 형식으로 반환
function toDateKey(isoString) {
  return new Date(isoString).toISOString().slice(0, 10)
}

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const printRef = useRef()

  const [name, setName] = useState(() => localStorage.getItem('bulggeumi-inspector') ?? '')
  const [inputName, setInputName] = useState(() => localStorage.getItem('bulggeumi-inspector') ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function fetchActivities() {
    if (!name.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ name: name.trim() })
      if (date) params.append('date', date)
      const res = await fetch(`/api/activities?${params}`)
      const data = await res.json()
      setActivities(Array.isArray(data) ? data : [])
    } catch {
      setActivities([])
    }
    setLoading(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    localStorage.setItem('bulggeumi-inspector', inputName.trim())
    setName(inputName.trim())
  }

  // 이름 변경 시 자동 조회
  useEffect(() => {
    if (name) fetchActivities()
  }, [name, date])

  function handlePrint() {
    window.print()
  }

  const totalCount = activities.length
  const normalCount = activities.filter((a) => a.result === '정상').length
  const issueCount = activities.filter((a) => a.result === '이상').length

  return (
    <>
      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 12px; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">

        {/* 헤더 */}
        <div className="no-print bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <div>
            <h1 className="text-base font-bold text-gray-800">활동 일지</h1>
            <p className="text-xs text-gray-400">서포터즈 현장 점검 기록</p>
          </div>
          {activities.length > 0 && (
            <button
              onClick={handlePrint}
              className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">
              🖨️ 인쇄
            </button>
          )}
        </div>

        <div className="max-w-lg mx-auto px-4 py-5">

          {/* 인쇄 헤더 (인쇄 시만 표시) */}
          <div className="print-only mb-6">
            <h1 className="text-xl font-bold text-center">서포터즈 활동 일지</h1>
            <p className="text-center text-sm text-gray-500 mt-1">서울시 보이는소화기 현장 점검 기록</p>
            <hr className="mt-3" />
          </div>

          {/* 검색 폼 */}
          <form onSubmit={handleSearch} className="no-print mb-5 flex gap-2">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="점검자 이름"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5
                focus:outline-none focus:border-blue-400 text-gray-700 placeholder:text-gray-300"
            />
            <button type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
              조회
            </button>
          </form>

          {/* 날짜 필터 */}
          {name && (
            <div className="no-print mb-5 flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
              />
              <button onClick={() => setDate('')}
                className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap">
                전체
              </button>
            </div>
          )}

          {/* 요약 정보 */}
          {searched && !loading && (
            <div className="mb-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-gray-800">
                    {name} <span className="font-normal text-gray-400">님</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {date ? date : '전체 기간'}
                  </p>
                </div>
                <div className="flex gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{totalCount}</p>
                    <p className="text-xs text-gray-400">총 점검</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">{normalCount}</p>
                    <p className="text-xs text-gray-400">정상</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">{issueCount}</p>
                    <p className="text-xs text-gray-400">이상</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
          )}

          {/* 결과 없음 */}
          {searched && !loading && activities.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">기록된 활동이 없습니다.</p>
            </div>
          )}

          {/* 활동 목록 */}
          {!loading && activities.length > 0 && (
            <div className="space-y-3" ref={printRef}>
              {activities.map((a, i) => (
                <div key={a.id ?? i}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* 사진 */}
                  {a.photo && (
                    <img src={a.photo} alt="현장 사진" className="w-full max-h-48 object-cover" />
                  )}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {a.extName || a.extinguisherId}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{a.extAddress}</p>
                        <p className="text-xs text-gray-300 mt-0.5">{a.station} · {a.center}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg
                        ${a.result === '정상'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-orange-50 text-orange-600'}`}>
                        {a.result === '정상' ? '✅ 정상' : '⚠️ 이상'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span>🕐 {toKST(a.inspectedAt)}</span>
                      {a.gps && (
                        <span>📍 {a.gps.lat.toFixed(4)}, {a.gps.lng.toFixed(4)}</span>
                      )}
                    </div>

                    {a.memo && (
                      <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5">
                        {a.memo}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 인쇄용 서명란 */}
          {activities.length > 0 && (
            <div className="print-only mt-8 border-t pt-6">
              <div className="flex justify-between text-sm">
                <div>
                  <p>점검자: <span className="font-semibold">{name}</span></p>
                  <p className="mt-1">출력일: {new Date().toLocaleDateString('ko-KR')}</p>
                </div>
                <div className="text-right">
                  <p>총 점검 건수: <span className="font-semibold">{totalCount}건</span></p>
                  <p className="mt-1 text-gray-400">불끄미 — 서울시 화재안전 현장관리</p>
                </div>
              </div>
              <div className="mt-6 flex gap-16 text-sm">
                <div>
                  <p className="text-gray-400 mb-8">점검자 서명</p>
                  <div className="border-b border-gray-400 w-32" />
                </div>
                <div>
                  <p className="text-gray-400 mb-8">확인자 서명</p>
                  <div className="border-b border-gray-400 w-32" />
                </div>
              </div>
            </div>
          )}

          {/* 미검색 상태 안내 */}
          {!searched && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">이름을 입력해 활동 기록을 조회하세요.</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
