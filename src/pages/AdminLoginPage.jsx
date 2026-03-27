import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import fireStations from '../data/fireStations'
import useAuthStore from '../store/useAuthStore'

const ALL_STATIONS = Object.keys(fireStations)

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [selectedStation, setSelectedStation] = useState(null)
  const [selectedCenter, setSelectedCenter] = useState(null)

  const centers = selectedStation ? fireStations[selectedStation] : []

  function handleStationClick(name) {
    setSelectedStation(name)
    setSelectedCenter(null)
  }

  function handleLogin() {
    if (!selectedStation || !selectedCenter) return
    login({ station: selectedStation, center: selectedCenter })
    navigate('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">

        {/* 헤더 */}
        <div className="text-center mb-8">
          <span className="text-4xl">🧯</span>
          <h1 className="text-2xl font-bold mt-2">불끄미</h1>
          <p className="text-sm text-gray-500 mt-1">담당자 로그인</p>
        </div>

        {/* 소방서 선택 */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            소방서 선택
          </p>
          {/* 최대 높이 고정 + 스크롤 */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 border border-gray-100 rounded-xl p-2">
            {ALL_STATIONS.map((name) => (
              <button
                key={name}
                onClick={() => handleStationClick(name)}
                className={`px-3 py-2.5 rounded-lg text-sm border text-left transition-colors
                  ${selectedStation === name
                    ? 'bg-red-600 text-white border-red-600 font-medium'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                  }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 안전센터 선택 */}
        {selectedStation && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              안전센터 선택 — <span className="text-red-600 normal-case font-semibold">{selectedStation}</span>
            </p>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {centers.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedCenter(name)}
                  className={`px-4 py-2.5 rounded-lg text-sm border text-left transition-colors
                    ${selectedCenter === name
                      ? 'bg-orange-500 text-white border-orange-500 font-medium'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={!selectedStation || !selectedCenter}
          className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm
            disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
            hover:bg-red-700 transition-colors"
        >
          {selectedStation && selectedCenter
            ? `${selectedCenter} 로그인`
            : '소방서와 안전센터를 선택해주세요'}
        </button>
      </div>
    </div>
  )
}
