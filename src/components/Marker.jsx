import { Marker as LeafletMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import useMapStore from '../store/useMapStore'

// 상태별 마커 아이콘 생성
function createIcon(status) {
  const color = status === '이상' ? '#dc2626' : '#2563eb'  // 빨강 or 파랑
  const border = status === '이상' ? '#991b1b' : '#1d4ed8'
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid ${border};border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
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
