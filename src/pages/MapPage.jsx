import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Map from '../components/Map'
import Sidebar from '../components/Sidebar'
import SearchCard from '../components/SearchCard'
import TopBar from '../components/TopBar'
import useMapStore from '../store/useMapStore'

export default function MapPage() {
  const navigate = useNavigate()
  const { selectedItem, extinguishers, selectItem, flyTo, setFilterStation, setFilterCenter } = useMapStore()
  const [showSidebar, setShowSidebar] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')

  // /?focus=코드 로 들어오면 (신고 완료 → 지도에서 확인) 그 소화기함을 골라 그 자리로 이동.
  // 소화기함 목록은 나눠서 불러오므로 해당 항목이 들어올 때까지 기다린다.
  useEffect(() => {
    if (!focusId) return
    const item = extinguishers.find((e) => String(e.id) === String(focusId))
    if (!item) return
    // 지도는 고른 소방서·센터의 마커만 그리므로 필터를 그 소화기함 쪽으로 맞춘다
    if (item.station) {
      setFilterStation(item.station)
      if (item.center) setFilterCenter(item.center)
    }
    selectItem(item)
    flyTo(item)
    setSearchParams({}, { replace: true })
  }, [focusId, extinguishers, selectItem, flyTo, setFilterStation, setFilterCenter, setSearchParams])

  // 신고는 누구나 — 로그인 없이 바로 신고 화면으로 (접수되면 센터 연락처 이메일로 알림)
  function handleReport() {
    if (!selectedItem) return
    navigate(`/report/${selectedItem.id}`)
  }

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden">
      <TopBar />
      {/* TopBar 높이(40px) 만큼 밀어내기 */}
      <div className="flex flex-1 overflow-hidden pt-10">
      {/* 지도 영역 */}
      <div className="flex-1 relative">
        <Map />
        <SearchCard onOpenSidebar={() => setShowSidebar(true)} />

        {/* 신고하기 플로팅 버튼 */}
        {selectedItem ? (
          <button
            onClick={handleReport}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999]
              bg-red-600 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg
              hover:bg-red-700 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            🧯 이상 신고하기
          </button>
        ) : (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999]
            bg-white text-gray-400 text-xs md:text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-full shadow border border-gray-100 whitespace-nowrap"
          >
            소화기함을 선택하면 신고할 수 있어요
          </div>
        )}
      </div>

      {/* 데스크톱 사이드바 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-[2000] flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setShowSidebar(false)}
          />
          <div className="w-80 max-w-[90vw] h-full flex flex-col shadow-xl">
            <Sidebar onClose={() => setShowSidebar(false)} />
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
