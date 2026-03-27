import { useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Marker from './Marker'
import useMapStore from '../store/useMapStore'

// 서울 시청 기준 중심 좌표 (실제 API 데이터 커버리지에 맞춤)
const SEOUL_CENTER = [37.5666, 126.9784]
const DEFAULT_ZOOM = 13

export default function Map() {
  const { fetchExtinguishers, getFiltered } = useMapStore()
  const filtered = getFiltered()

  useEffect(() => {
    fetchExtinguishers()
  }, [fetchExtinguishers])

  return (
    <MapContainer
      center={SEOUL_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {filtered.map((item) => (
        <Marker key={item.id} item={item} />
      ))}
    </MapContainer>
  )
}
