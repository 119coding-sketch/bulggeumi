import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import fireStations from '../data/fireStations'

const ALL_STATIONS = Object.keys(fireStations)

function toKST(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// 오늘 날짜 (KST, YYYY-MM-DD)
function todayKST() {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '').replace(/ /g, '')
}

// 한 달 전 날짜
function monthAgoKST() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '').replace(/ /g, '')
}

export default function AdminActivitiesPage() {
  const navigate = useNavigate()

  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  // 필터 상태
  const [filterName, setFilterName] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState(monthAgoKST())
  const [filterDateTo, setFilterDateTo] = useState(todayKST())
  const [filterStation, setFilterStation] = useState('')
  const [filterCenter, setFilterCenter] = useState('')

  // 선택된 소방서의 센터 목록
  const centerList = filterStation ? (fireStations[filterStation] ?? []) : []

  useEffect(() => {
    fetchActivities()
  }, [filterDateFrom, filterDateTo, filterStation, filterCenter])

  async function fetchActivities() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterName.trim()) params.append('name', filterName.trim())
      if (filterDateFrom) params.append('dateFrom', filterDateFrom)
      if (filterDateTo)   params.append('dateTo', filterDateTo)
      if (filterStation)  params.append('station', filterStation)
      if (filterCenter)   params.append('center', filterCenter)

      const res = await fetch(`/api/activities?${params}`)
      const data = await res.json()
      setActivities(Array.isArray(data) ? data : [])
    } catch {
      setActivities([])
    }
    setLoading(false)
  }

  function handleNameSearch(e) {
    e.preventDefault()
    fetchActivities()
  }

  function handleStationChange(station) {
    setFilterStation(station)
    setFilterCenter('')
  }

  // 통계
  const uniqueInspectors = new Set(activities.map((a) => a.inspectorName)).size
  const normalCount = activities.filter((a) => a.result === '정상').length
  const issueCount  = activities.filter((a) => a.result === '이상').length

  // 엑셀 다운로드
  function handleExcelDownload() {
    const rows = activities.map((a) => {
      const date = a.inspectedAt ? new Date(a.inspectedAt) : null
      return {
        '점검자명':   a.inspectorName ?? '-',
        '점검일시':   toKST(a.inspectedAt),
        '연도':        date ? date.getFullYear() : '-',
        '월':          date ? date.getMonth() + 1 : '-',
        '일':          date ? date.getDate() : '-',
        '소방서':     a.station ?? '-',
        '안전센터':   a.center ?? '-',
        '소화기함명': a.extName ?? '-',
        '주소':        a.extAddress ?? '-',
        '점검결과':   a.result ?? '-',
        '메모':        a.memo ?? '',
        '위도':        a.gps?.lat ?? '',
        '경도':        a.gps?.lng ?? '',
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 10 }, { wch: 20 }, { wch: 6 }, { wch: 4 }, { wch: 4 },
      { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 35 },
      { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '서포터즈활동')
    const today = todayKST()
    XLSX.writeFile(wb, `불끄미_서포터즈활동_${today}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="bg-red-600 text-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-red-200 hover:text-white text-xl">←</button>
          <div>
            <span className="font-bold text-base md:text-lg">🧯 서포터즈 활동 현황</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={handleExcelDownload}
            disabled={activities.length === 0}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            📥 엑셀 다운로드
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors"
          >
            접수민원
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">

        {/* ── 필터 패널 ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-4 space-y-4">

          {/* 이름 검색 */}
          <form onSubmit={handleNameSearch} className="flex gap-2">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="점검자 이름 (전체 조회 시 비워두세요)"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5
                focus:outline-none focus:border-blue-400 text-gray-700 placeholder:text-gray-300"
            />
            <button type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 whitespace-nowrap">
              조회
            </button>
          </form>

          {/* 날짜 범위 */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">기간</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
            />
            <span className="text-gray-300 text-sm">~</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
              className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
            >
              전체
            </button>
          </div>

          {/* 소방서 필터 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">소방서</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleStationChange('')}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                  ${filterStation === ''
                    ? 'bg-red-600 text-white border-red-600 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                  }`}
              >
                전체
              </button>
              {ALL_STATIONS.map((name) => (
                <button
                  key={name}
                  onClick={() => handleStationChange(name)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                    ${filterStation === name
                      ? 'bg-red-600 text-white border-red-600 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                    }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 센터 필터 (소방서 선택 시) */}
          {filterStation && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                안전센터 — <span className="text-red-600">{filterStation}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterCenter('')}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                    ${filterCenter === ''
                      ? 'bg-orange-500 text-white border-orange-500 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                >
                  전체
                </button>
                {centerList.map((name) => (
                  <button
                    key={name}
                    onClick={() => setFilterCenter(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                      ${filterCenter === name
                        ? 'bg-orange-500 text-white border-orange-500 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 통계 카드 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: '총 점검 건수',   value: activities.length, color: 'text-gray-800' },
            { label: '참여 서포터즈',  value: uniqueInspectors,  color: 'text-blue-600' },
            { label: '정상',           value: normalCount,        color: 'text-green-600' },
            { label: '이상',           value: issueCount,         color: 'text-orange-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── 로딩 ── */}
        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
        )}

        {/* ── 결과 없음 ── */}
        {!loading && activities.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-12 text-center text-gray-400 text-sm">
            활동 기록이 없습니다.
          </div>
        )}

        {/* ── 모바일 카드 ── */}
        {!loading && activities.length > 0 && (
          <div className="md:hidden space-y-3">
            {activities.map((a, i) => (
              <div key={a.id ?? i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {a.inspectorName ?? '-'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {a.extName || a.extinguisherId}
                    </p>
                    <p className="text-xs text-gray-300 truncate">{a.extAddress}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg
                    ${a.result === '정상'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-orange-50 text-orange-600'}`}>
                    {a.result === '정상' ? '✅ 정상' : '⚠️ 이상'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1">
                  <span>{a.station} · {a.center}</span>
                  <span>🕐 {toKST(a.inspectedAt)}</span>
                  {a.gps && <span>📍 {a.gps.lat?.toFixed(4)}, {a.gps.lng?.toFixed(4)}</span>}
                </div>
                {a.memo && (
                  <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5">{a.memo}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 데스크톱 테이블 ── */}
        {!loading && activities.length > 0 && (
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">점검자</th>
                  <th className="px-4 py-3 text-left">점검일시</th>
                  <th className="px-4 py-3 text-left">소방서</th>
                  <th className="px-4 py-3 text-left">안전센터</th>
                  <th className="px-4 py-3 text-left">소화기함</th>
                  <th className="px-4 py-3 text-left">주소</th>
                  <th className="px-4 py-3 text-left">결과</th>
                  <th className="px-4 py-3 text-left">메모</th>
                  <th className="px-4 py-3 text-left">GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activities.map((a, i) => (
                  <tr key={a.id ?? i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{a.inspectorName ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{toKST(a.inspectedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{a.station ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 font-medium whitespace-nowrap">
                        {a.center ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px] truncate" title={a.extName}>
                      {a.extName || a.extinguisherId}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate text-xs" title={a.extAddress}>
                      {a.extAddress ?? '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                        ${a.result === '정상'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-orange-50 text-orange-600'}`}>
                        {a.result === '정상' ? '✅ 정상' : '⚠️ 이상'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate text-xs" title={a.memo}>
                      {a.memo || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                      {a.gps ? `${a.gps.lat?.toFixed(4)}, ${a.gps.lng?.toFixed(4)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  )
}
