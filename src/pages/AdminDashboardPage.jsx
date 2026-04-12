import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import useMapStore from '../store/useMapStore'
import useReportStore from '../store/useReportStore'
import fireStations from '../data/fireStations'
import TopBar from '../components/TopBar'


function toKST(isoString) {
  return new Date(isoString).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_ORDER = ['접수', '완료']
const STATUS_STYLE = {
  접수:   { bg: 'bg-blue-100',  text: 'text-blue-700'  },
  완료:   { bg: 'bg-green-100', text: 'text-green-700' },
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
  const { extinguishers, getCenterList } = useMapStore()
  const { reports, fetchReports, updateStatus } = useReportStore()

  useEffect(() => { fetchReports() }, [fetchReports])

  const [filterStation, setFilterStation] = useState(ALL_STATIONS[0])
  const [filterCenter, setFilterCenter] = useState('전체')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')

  // QR 일괄 다운로드
  const [qrProgress, setQrProgress] = useState(null) // null | { done, total }

  async function handleQrDownload() {
    // 현재 필터 기준 소화기 목록
    const targets = extinguishers.filter((e) =>
      e.station === filterStation &&
      (filterCenter === '전체' || e.center === filterCenter)
    )
    if (targets.length === 0) return alert('소화기 데이터가 없습니다. 잠시 후 다시 시도해주세요.')

    const base = window.location.origin
    const zip = new JSZip()
    const BATCH = 100

    setQrProgress({ done: 0, total: targets.length })

    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH)
      await Promise.all(batch.map(async (ext) => {
        const url = `${base}/report/${ext.id}`
        // 소방서/센터 폴더 구조로 저장
        const folder = `${ext.station}/${ext.center ?? '공용'}`
        const filename = `${ext.id}.png`
        const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 })
        // base64 부분만 추출
        const base64 = dataUrl.split(',')[1]
        zip.folder(folder).file(filename, base64, { base64: true })
      }))
      setQrProgress({ done: Math.min(i + BATCH, targets.length), total: targets.length })
      // UI 업데이트 숨 고르기
      await new Promise((r) => setTimeout(r, 0))
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const label = filterCenter === '전체' ? filterStation : `${filterStation}_${filterCenter}`
    a.download = `불끄미_QR_${label}.zip`
    a.click()
    URL.revokeObjectURL(a.href)
    setQrProgress(null)
  }

  function handleComplete(report) {
    if (!confirm('조치완료로 처리하시겠습니까?')) return
    updateStatus(report.id, '완료')
  }

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

  // 신고 필터링 + 날짜 범위 + 최신순 정렬
  const filteredReports = reports
    .filter((r) => {
      if (!myExtinguisherIds.has(r.extinguisherId)) return false
      const dateStr = r.reportedAt.slice(0, 10)
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo   && dateStr > dateTo)   return false
      return true
    })
    .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt))

  // 소화기 id → 소화기 객체
  const extMap = Object.fromEntries(extinguishers.map((e) => [e.id, e]))

  // 통계
  const stats = {
    total: filteredReports.length,
    접수:  filteredReports.filter((r) => r.status === '접수').length,
    완료:  filteredReports.filter((r) => r.status === '완료').length,
  }

  async function handleVisitsExcelDownload() {
    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo)   params.set('dateTo', dateTo)
    let visits = []
    try {
      const res = await fetch(`/api/visits?${params}`)
      visits = await res.json()
    } catch {
      alert('방문기록을 불러오는 데 실패했습니다.')
      return
    }
    if (!visits.length) { alert('해당 기간 방문기록이 없습니다.'); return }

    const rows = visits.map((v) => {
      const d = new Date(v.visitedAt)
      return {
        '방문일시': d.toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
        '연도': d.getFullYear(),
        '월': d.getMonth() + 1,
        '일': d.getDate(),
        '소화기함 ID': v.extinguisherId ?? '',
        '소방서': v.station ?? '-',
        '안전센터': v.center ?? '-',
        '이메일': v.email ?? '-',
        '이름': v.name ?? '-',
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 22 }, { wch: 6 }, { wch: 4 }, { wch: 4 },
      { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 28 }, { wch: 12 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '방문기록')
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).replace(/\. /g, '-').replace('.', '')
    XLSX.writeFile(wb, `불끄미_방문기록_${today}.xlsx`)
  }

  function handleExcelDownload() {
    const base = window.location.origin
    const rows = filteredReports.map((report) => {
      const ext = extMap[report.extinguisherId]
      const date = new Date(report.reportedAt)
      // 상대 경로이면 절대 URL로 변환
      const toAbsolute = (url) => url ? (url.startsWith('http') ? url : base + url) : ''
      return {
        '신고일시': toKST(report.reportedAt),
        '연도': date.getFullYear(),
        '월': date.getMonth() + 1,
        '일': date.getDate(),
        '소방서': ext?.station ?? '-',
        '안전센터': ext?.center ?? '-',
        '소화기함명': ext?.name ?? '-',
        '주소': ext?.address ?? '-',
        '신고유형': report.type,
        '메모': report.memo ?? '',
        '상태': report.status,
        '신고사진URL': toAbsolute(report.imageUrl),
        '결과보고메모': report.result?.memo ?? '',
        '결과보고사진URL': toAbsolute(report.result?.imageUrl),
        '완료일시': report.result?.completedAt ? toKST(report.result.completedAt) : '',
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 20 }, { wch: 6 }, { wch: 4 }, { wch: 4 },
      { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 35 },
      { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 40 },
      { wch: 30 }, { wch: 40 }, { wch: 20 },
    ]
    // 이미지 URL 셀에 하이퍼링크 적용 (엑셀에서 클릭 시 브라우저로 열림)
    // L=신고사진URL, N=결과보고사진URL
    const wsRange = XLSX.utils.decode_range(ws['!ref'])
    for (let R = 1; R <= wsRange.e.r; R++) {
      for (const col of ['L', 'N']) {
        const addr = `${col}${R + 1}`
        if (ws[addr] && ws[addr].v) {
          ws[addr].l = { Target: ws[addr].v }
        }
      }
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '신고내역')
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).replace(/\. /g, '-').replace('.', '')
    XLSX.writeFile(wb, `불끄미_신고내역_${today}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10">
      <TopBar />

      {/* QR 다운로드 진행률 오버레이 */}
      {qrProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-72 text-center">
            <p className="font-bold text-gray-800 mb-2">QR 코드 생성 중...</p>
            <p className="text-sm text-gray-500 mb-4">
              {qrProgress.done} / {qrProgress.total}개
            </p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.round(qrProgress.done / qrProgress.total * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {Math.round(qrProgress.done / qrProgress.total * 100)}% — 완료 후 자동 다운로드됩니다
            </p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-red-600 text-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow">
        <span className="font-bold text-base md:text-lg">🧯 불끄미 접수민원</span>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={handleExcelDownload}
            disabled={filteredReports.length === 0}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors hidden sm:flex items-center gap-1 disabled:opacity-40"
          >
            📥 신고 엑셀
          </button>
          <button
            onClick={handleVisitsExcelDownload}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors hidden sm:flex items-center gap-1"
          >
            📋 방문기록 엑셀
          </button>
          <button
            onClick={handleQrDownload}
            disabled={!!qrProgress || extinguishers.length === 0}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors hidden sm:flex items-center gap-1 disabled:opacity-40"
          >
            📦 QR 일괄 다운로드
          </button>
          <button
            onClick={() => navigate('/admin/contacts')}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors hidden sm:block"
          >
            연락처 관리
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-xs md:text-sm text-red-200 hover:text-white transition-colors"
          >
            지도
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">

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

        {/* ── 날짜 범위 필터 ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            기간 필터 <span className="normal-case font-normal text-gray-300">(신고일 기준)</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 text-gray-700"
            />
            <span className="text-gray-300 text-sm">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 text-gray-700"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-red-300 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>

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
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '전체 신고', value: stats.total, color: 'text-gray-800' },
            { label: '접수',     value: stats.접수,   color: 'text-blue-600' },
            { label: '완료',     value: stats.완료,   color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── 신고 목록 (모바일 카드) ── */}
        <div className="md:hidden space-y-3">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-10 text-center text-gray-400 text-sm">
              신고 내역이 없습니다.
            </div>
          ) : (
            filteredReports.map((report) => {
              const ext = extMap[report.extinguisherId]
              return (
                <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{ext?.name ?? '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{ext?.address ?? '-'}</p>
                    </div>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                    <span>{REPORT_TYPE_ICON[report.type] ?? '📋'} {report.type}</span>
                    <span className="text-gray-200">·</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                      {ext?.center ?? '-'}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span className="text-gray-400">{toKST(report.reportedAt)}</span>
                  </div>
                  {report.imageUrl && (
                    <a href={report.imageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                      <img
                        src={report.imageUrl}
                        alt="신고 사진"
                        className="w-full h-32 object-cover rounded-lg border border-gray-100"
                      />
                    </a>
                  )}
                  {report.status !== '완료' ? (
                    <button
                      onClick={() => handleComplete(report)}
                      className="mt-3 w-full text-xs py-2 rounded-lg bg-blue-50 text-blue-600
                        hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      조치완료
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-gray-300 text-center">처리 완료</p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ── 신고 테이블 (데스크톱) ── */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">신고일시</th>
                <th className="px-4 py-3 text-left">소화기함</th>
                <th className="px-4 py-3 text-left">주소</th>
                <th className="px-4 py-3 text-left">담당센터</th>
                <th className="px-4 py-3 text-left">신고유형</th>
                <th className="px-4 py-3 text-left">사진</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    신고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const ext = extMap[report.extinguisherId]
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {toKST(report.reportedAt)}
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
                        {report.imageUrl ? (
                          <a href={report.imageUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={report.imageUrl}
                              alt="신고 사진"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-100 hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3">
                        {report.status !== '완료' ? (
                          <button
                            onClick={() => handleComplete(report)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600
                              hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap"
                          >
                            조치완료
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
