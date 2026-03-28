import { Link } from 'react-router-dom'
import Map from '../components/Map'
import Sidebar from '../components/Sidebar'
import SearchCard from '../components/SearchCard'
import useMapStore from '../store/useMapStore'

export default function MapPage() {
  const { selectedItem } = useMapStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <Map />
        <SearchCard />

        {/* 신고하기 플로팅 버튼 */}
        {selectedItem ? (
          <Link
            to={`/report/${selectedItem.id}`}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999]
              bg-red-600 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg
              hover:bg-red-700 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            🧯 이상 신고하기
          </Link>
        ) : (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999]
            bg-white text-gray-400 text-sm px-5 py-2.5 rounded-full shadow border border-gray-100 whitespace-nowrap"
          >
            소화기함을 선택하면 신고할 수 있어요
          </div>
        )}
      </div>
      <Sidebar />
    </div>
  )
}
