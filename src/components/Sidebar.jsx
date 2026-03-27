import { Link } from 'react-router-dom'
import useMapStore from '../store/useMapStore'
import fireStations from '../data/fireStations'

const ALL_STATIONS = Object.keys(fireStations)

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
    selectedItem, selectItem, clearSelection,
    isLoading, error,
    filterStation, filterCenter, setFilterStation, setFilterCenter,
    getFiltered, getCenterList,
  } = useMapStore()

  const filtered = getFiltered()

  // 실제 로드된 데이터 기반 센터 목록
  const centerList = getCenterList(filterStation)

  return (
    <aside className="w-72 h-full bg-white shadow-lg flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="px-4 py-4 bg-red-600 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">🧯 불끄미</h1>
          <Link
            to="/admin/login"
            className="text-xs text-red-200 hover:text-white border border-red-400 px-2 py-1 rounded transition-colors"
          >
            담당자
          </Link>
        </div>
        <p className="text-xs text-red-200 mt-0.5">보이는소화기 관리 시스템</p>
      </div>

      {/* 필터 패널 */}
      <div className="border-b bg-gray-50 px-3 py-3 space-y-2">
        {/* 소방서 선택 */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">소방서</label>
          <select
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white
              focus:outline-none focus:border-red-400 text-gray-700"
          >
            {ALL_STATIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* 안전센터 선택 (소방서 선택 시만 표시) */}
        {filterStation !== '전체' && (
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">안전센터</label>
            <select
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white
                focus:outline-none focus:border-orange-400 text-gray-700"
            >
              <option value="전체">전체 센터</option>
              {centerList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 결과 수 */}
        <p className="text-xs text-gray-400">
          {isLoading ? '불러오는 중...' : `${filtered.length.toLocaleString()}개 표시`}
        </p>
      </div>

      {/* 오류 */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-500 border-b bg-red-50">오류: {error}</div>
      )}

      <div className="flex-1 overflow-y-auto">

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
                  ['종류',  selectedItem.type],
                  ['용량',  selectedItem.capacity],
                  ['설치일', selectedItem.installedAt],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <tr key={label} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 text-gray-400 w-16">{label}</td>
                    <td className="py-1.5">{value}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 pr-2 text-gray-400">상태</td>
                  <td className="py-1.5"><StatusBadge status={selectedItem.status} /></td>
                </tr>
              </tbody>
            </table>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 mb-1">신고하기</p>
              {['소화기 없음', '소화기 부족', '함 파손', '기타'].map((type) => (
                <button
                  key={type}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200
                    hover:bg-red-50 hover:border-red-300 transition-colors"
                  onClick={() => console.log('신고 유형:', type, selectedItem.id)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

        ) : (

          /* 목록 뷰 */
          <ul className="divide-y">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => selectItem(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{item.name}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.address}</p>
              </li>
            ))}
            {!isLoading && filtered.length === 0 && (
              <li className="px-4 py-6 text-sm text-gray-400 text-center">
                소화기함 데이터가 없습니다.
              </li>
            )}
          </ul>
        )}
      </div>
    </aside>
  )
}
