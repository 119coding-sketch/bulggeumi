import React from 'react'
import { Link } from 'react-router-dom'
import useMapStore from '../store/useMapStore'
import useReportStore from '../store/useReportStore'

const STATUS_STYLE = {
  정상:    { bg: 'bg-green-100',  text: 'text-green-700'  },
  점검필요: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  교체필요: { bg: 'bg-red-100',   text: 'text-red-700'    },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  )
}

export default function Sidebar() {
  const {
    selectedItem, selectItem, clearSelection, flyTo,
    isLoading, loadedCount, error,
    getFiltered,
    pinnedItems, unpinItem, clearSearch,
    updateExtinguisherStatus,
  } = useMapStore()
  const { reports, updateStatus } = useReportStore()

  const filtered = getFiltered()
  const inSearchMode = pinnedItems.length > 0

  return (
    <aside className="w-72 h-full bg-white shadow-lg flex flex-col overflow-hidden border-l border-gray-100">

      {/* 헤더 */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {isLoading && loadedCount === 0
            ? '불러오는 중...'
            : inSearchMode
              ? `선택됨 ${pinnedItems.length}개`
              : `${filtered.length.toLocaleString()}개`}
        </p>
        <div className="flex items-center gap-2">
          {inSearchMode && (
            <button
              onClick={() => { clearSearch(); clearSelection() }}
              className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded transition-colors"
            >
              검색 초기화
            </button>
          )}
          <Link
            to="/admin/contacts"
            className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-1 rounded transition-colors"
          >
            연락처
          </Link>
          <Link
            to="/admin/login"
            className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-1 rounded transition-colors"
          >
            담당자
          </Link>
        </div>
      </div>

      {/* 오류 */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-500 border-b bg-red-50">오류: {error}</div>
      )}

      <div className="flex-1 overflow-y-auto relative">

        {/* 초기 로딩 오버레이 */}
        {isLoading && loadedCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3">
            <svg className="animate-spin h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm text-gray-500 font-medium">보이는소화기 불러오는 중</p>
            <p className="text-xs text-gray-400">잠시만 기다려 주세요</p>
          </div>
        )}

        {/* 상세 뷰 */}
        {selectedItem ? (
          <div className="p-4">
            <button
              onClick={clearSelection}
              className="mb-3 text-xs text-red-500 hover:underline flex items-center gap-1"
            >
              ← 목록으로
            </button>

            <h2 className="font-semibold text-sm mb-1">{selectedItem.name}</h2>
            <p className="text-xs text-gray-500 mb-3">{selectedItem.address}</p>

            <table className="text-xs w-full mb-4">
              <tbody>
                {[
                  ['코드',   selectedItem.id],
                  ['소방서', selectedItem.station],
                  ['센터',   selectedItem.center],
                  ['종류',   selectedItem.type],
                  ['용량',   selectedItem.capacity],
                  ['설치일', selectedItem.installedAt],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <tr key={label} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 text-gray-400 w-16">{label}</td>
                    <td className="py-1.5 font-mono text-xs break-all">{value}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 pr-2 text-gray-400">상태</td>
                  <td className="py-1.5"><StatusBadge status={selectedItem.status} /></td>
                </tr>
              </tbody>
            </table>

            {selectedItem.status === '이상' ? (
              <button
                onClick={() => {
                  updateExtinguisherStatus(selectedItem.id, '정상')
                  // 해당 소화기의 미완료 신고도 완료 처리
                  const active = reports.find(
                    (r) => String(r.extinguisherId) === String(selectedItem.id) && r.status !== '완료'
                  )
                  if (active) updateStatus(active.id, '완료')
                }}
                className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl
                  bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                ✓ 조치완료 — 정상으로 변경
              </button>
            ) : (
              <Link
                to={`/report/${selectedItem.id}`}
                className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl
                  bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                이상 신고하기
              </Link>
            )}
          </div>

        ) : (

          /* 목록 뷰 */
          <>
            {inSearchMode && (
              <div className="px-4 py-2 bg-red-50 border-b text-xs text-red-500 font-medium">
                선택된 소화기 — 검색으로 추가, X로 개별 제거
              </div>
            )}
            <ul className="divide-y">
              {(inSearchMode ? pinnedItems : filtered).map((item) => (
                <li
                  key={item.id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { selectItem(item); flyTo(item) }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{item.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={item.status} />
                      {inSearchMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); unpinItem(item.id) }}
                          className="text-gray-300 hover:text-red-400 text-base leading-none ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{item.address}</p>
                  <p className="text-xs font-mono text-gray-300 mt-0.5">{item.id}</p>
                </li>
              ))}
              {!isLoading && !inSearchMode && filtered.length === 0 && (
                <li className="px-4 py-6 text-sm text-gray-400 text-center">
                  소화기함 데이터가 없습니다.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
