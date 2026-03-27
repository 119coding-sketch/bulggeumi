import { Marker as LeafletMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import useMapStore from '../store/useMapStore'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_STYLE = {
  정상:    { bg: 'bg-green-100',  text: 'text-green-700'  },
  점검필요: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  교체필요: { bg: 'bg-red-100',   text: 'text-red-700'    },
}

export default function Marker({ item }) {
  const { selectItem } = useMapStore()
  const { lat, lng, name, address, type, capacity, installedAt, status } = item
  const style = STATUS_STYLE[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }

  return (
    <LeafletMarker
      position={[lat, lng]}
      eventHandlers={{ click: () => selectItem(item) }}
    >
      <Popup minWidth={210}>
        <p className="font-bold text-sm mb-2">{name}</p>
        <table className="text-xs w-full">
          <tbody>
            {[
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
