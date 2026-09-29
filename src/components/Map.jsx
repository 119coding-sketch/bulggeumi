import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Marker from './Marker'
import useMapStore from '../store/useMapStore'
import useReportStore from '../store/useReportStore'

const SEOUL_CENTER = [37.5666, 126.9784]
const DEFAULT_ZOOM = 13

// 지도 flyTo 컨트롤러 (MapContainer 내부에서만 useMap 사용 가능)
function FlyToController() {
  const map = useMap()
  const { flyTarget, clearFlyTarget } = useMapStore()

  useEffect(() => {
    if (flyTarget && flyTarget.lat && flyTarget.lng) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 17, { duration: 0.8 })
      clearFlyTarget()
    }
  }, [flyTarget, map, clearFlyTarget])

  return null
}

export default function Map() {
  const { fetchExtinguishers, getFiltered, pinnedItems, extinguishers } = useMapStore()
  const { fetchReports } = useReportStore()

  const filtered = pinnedItems.length > 0 ? pinnedItems : getFiltered()

  useEffect(() => {
    // 소화기 로드 완료 후 신고 내역을 불러와 마커 색상에 반영
    async function init() {
      await fetchExtinguishers()
      await fetchReports()
    }
    init()
  }, [fetchExtinguishers, fetchReports])

  return (
    <MapContainer
      center={SEOUL_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={false}
    >
      {/* CartoDB 타일은 API 키 없이는 "API KEY REQUIRED" 이미지만 내려줘서 OSM 기본 타일로 교체 */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FlyToController />
      {filtered.map((item) => (
        <Marker key={`${item.id}-${item.status}`} item={item} />
      ))}
    </MapContainer>
  )
}
