import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import useMapStore from '../store/useMapStore'
import useReportStore from '../store/useReportStore'
import fireStations from '../data/fireStations'

const STATUS_ORDER = ['접수', '출동중', '완료']
const STATUS_STYLE = {
  접수:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  출동중: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  완료:   { bg: 'bg-green-100',  text: 'text-green-700'  },
}
const REPORT_TYPE_ICON = {
  '소화기 없음': '🚫',
  '소화기 부족': '⚠️',
  '함 파손':    '🔨',
  '기타':       '📝',
}

const ALL_STATIONS = Object.keys(fireStations)

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {status}
    </span>
  )
}

export default function AdminDashboardPage() {
  const navigate  = useNavigate()
  const { station: myStation, center: myCenter, logout } = useAuthStore()
  const { extinguishers, getCenterList } = useMapStore()
  const { reports, updateStatus } = useReportStore()

  // 소방서 필터 — 기본값: 로그인한 소방서
  const [filterStation, setFilterStation] = useState(myStation ?? ALL_STATIONS[0])
  // 센터 필터 — 기본값: 로그인한 센터
  const [filterCenter, setFilterCenter] = useState(myCenter ?? '전체')

  // 실제 로드된 데이터 기반 센터 목록
  const centerList = getCenterList(filterStation)

  // 소방서 바뀌면 센터 전체로 초기화
  function handleStationChange(name) {
    setFilterStation(name)
    setFilterCenter('전체')
  }

  // 소화기함 필터링 (station/center 필드 기반)
  const myExtinguisherIds = new Set(
    extinguishers
      .filter((e) =>
        e.station === filterStation &&
        (filterCenter === '전체' || e.center === filterCenter)
      )
      .map((e) => e.id)
  )

  // 신고 필터링
  const filteredReports = reports.filter((r) => myExtinguisherIds.has(r.extinguisherId))

  // 소화기 id → 소화기 객체
  const extMap = Object.fromEntries(extinguishers.map((e) => [e.id, e]))

  // 통계
  const stats = {
    total:  filteredReports.length,
    접수:   filteredReports.filter((r) => r.status === '접수').length,
    출동중: filteredReports.filter((r) => r.status === '출동중').length,
    완료:   filteredReports.filter((r) => r.status === '완료').length,
  }

  function handleNextStatus(report) {
    const idx = STATUS_ORDER.indexOf(report.status)
    if (idx < STATUS_ORDER.length - 1) updateStatus(report.id, STATUS_ORDER[idx + 1])
  }

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="bg-red-600 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <span className="font-bold text-lg">🧯 불끄미 담당자</span>
          <span className="ml-3 text-sm text-red-200">{myStation} · {myCenter}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/contacts')}
            className="text-sm text-red-200 hover:text-white transition-colors"
          >
            연락처 관리
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-red-200 hover:text-white transition-colors"
          >
            지도 보기
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-700 hover:bg-red-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">

        {/* ── 소방서 필터 ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            소방서 선택
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATIONS.map((name) => (
              <button
                key={name}
                onClick={() => handleStationChange(name)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
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

        {/* ── 센터 필터 (소방서 선택 시에만 표시) ── */}
        {filterStation !== '전체' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              안전센터 선택 — <span className="text-red-600">{filterStation}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {/* 전체 버튼 */}
              <button
                onClick={() => setFilterCenter('전체')}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors font-medium
                  ${filterCenter === '전체'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                  }`}
              >
                전체
              </button>
              {centerList.map((name) => (
                <button
                  key={name}
                  onClick={() => setFilterCenter(name)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
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

        {/* ── 현재 필터 표시 + 통계 ── */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">
            현재 보기:
            <span className="ml-1 font-semibold text-gray-800">{filterStation}</span>
            <span className="mx-1 text-gray-300">›</span>
            <span className="font-semibold text-gray-800">
              {filterCenter === '전체' ? '전체 센터' : filterCenter}
            </span>
          </span>
        </div>

        {/* ── 통계 카드 ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 신고', value: stats.total,  color: 'text-gray-800' },
            { label: '접수',     value: stats.접수,    color: 'text-blue-600' },
            { label: '출동중',   value: stats.출동중,  color: 'text-yellow-600' },
            { label: '완료',     value: stats.완료,    color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── 신고 테이블 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">신고일시</th>
                <th className="px-4 py-3 text-left">소화기함</th>
                <th className="px-4 py-3 text-left">주소</th>
                <th className="px-4 py-3 text-left">담당센터</th>
                <th className="px-4 py-3 text-left">신고유형</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    신고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const ext = extMap[report.extinguisherId]
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {report.reportedAt.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="px-4 py-3 font-medium">{ext?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{ext?.address ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 font-medium whitespace-nowrap">
                          {ext?.center ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {REPORT_TYPE_ICON[report.type] ?? '📋'} {report.type}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3">
                        {report.status !== '완료' ? (
                          <button
                            onClick={() => handleNextStatus(report)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600
                              hover:bg-red-100 border border-red-200 transition-colors whitespace-nowrap"
                          >
                            {report.status === '접수' ? '출동 처리' : '완료 처리'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">처리 완료</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
