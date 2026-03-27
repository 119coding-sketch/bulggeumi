import Map from '../components/Map'
import Sidebar from '../components/Sidebar'
import SearchCard from '../components/SearchCard'

export default function MapPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 relative">
        <Map />
        <SearchCard />
      </div>
      <Sidebar />
    </div>
  )
}
