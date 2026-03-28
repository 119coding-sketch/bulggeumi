import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Marker from './Marker'
import useMapStore from '../store/useMapStore'

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

  // extinguishers를 구독해서 상태 변경 시 마커가 즉시 업데이트되도록 함
  // 핀된 항목이 있으면 그것들만, 없으면 필터 전체
  const filtered = pinnedItems.length > 0 ? pinnedItems : getFiltered()

  useEffect(() => {
    fetchExtinguishers()
  }, [fetchExtinguishers])

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
