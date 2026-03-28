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
      fetchReports()
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
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToController />
      {filtered.map((item) => (
        <Marker key={item.id} item={item} />
      ))}
    </MapContainer>
  )
}
