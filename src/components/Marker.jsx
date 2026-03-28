import { Marker as LeafletMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import useMapStore from '../store/useMapStore'

// 상태별 핀 모양 마커 아이콘 생성 (Leaflet 기본 핀과 동일한 형태)
function createIcon(status) {
  const color = status === '이상' ? '#dc2626' : '#2563eb'
  const shadow = status === '이상' ? '#991b1b' : '#1e40af'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="${color}" stroke="${shadow}" stroke-width="1"
        d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.125 12.5 28.5 12.5 28.5S25 20.625 25 12.5C25 5.596 19.404 0 12.5 0z"/>
      <circle fill="white" cx="12.5" cy="12.5" r="5"/>
    </svg>
  `
  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

const STATUS_STYLE = {
  정상:    { bg: 'bg-green-100',  text: 'text-green-700'  },
  이상:    { bg: 'bg-red-100',    text: 'text-red-700'    },
  점검필요: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  교체필요: { bg: 'bg-red-100',   text: 'text-red-700'    },
}

export default function Marker({ item }) {
  const { selectItem } = useMapStore()
  const { lat, lng, id, name, address, type, capacity, installedAt, status } = item
  const style = STATUS_STYLE[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }

  return (
    <LeafletMarker
      position={[lat, lng]}
      icon={createIcon(status)}
      eventHandlers={{ click: () => selectItem(item) }}
    >
      <Popup minWidth={210}>
        <p className="font-bold text-sm mb-2">{name}</p>
        <table className="text-xs w-full">
          <tbody>
            {[
              ['코드', id],
              ['주소', address],
              ['종류', type],
              ['용량', capacity],
              ['설치일', installedAt],
            ].filter(([, value]) => value).map(([label, value]) => (
              <tr key={label}>
                <td className="pr-2 text-gray-400 whitespace-nowrap pb-0.5">{label}</td>
                <td className="pb-0.5">{value}</td>
              </tr>
            ))}
            <tr>
              <td className="pr-2 text-gray-400">상태</td>
              <td>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                  {status}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Popup>
    </LeafletMarker>
  )
}
