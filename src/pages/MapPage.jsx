import Map from '../components/Map'
import Sidebar from '../components/Sidebar'

export default function MapPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1">
        <Map />
      </div>
    </div>
  )
}
