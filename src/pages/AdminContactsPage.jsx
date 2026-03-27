import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useContactStore from '../store/useContactStore'
import fireStations from '../data/fireStations'

const ALL_STATIONS = Object.keys(fireStations)

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function AdminContactsPage() {
  const navigate = useNavigate()
  const { contacts, updateContact } = useContactStore()

  const [selectedStation, setSelectedStation] = useState(ALL_STATIONS[0])
  const [savedCenter, setSavedCenter] = useState(null)
  const [emailError, setEmailError] = useState(null)

  const centers = fireStations[selectedStation] ?? []

  function handleSave(center) {
    const contact = contacts[selectedStation]?.[center] ?? {}
    if (contact.email && !isValidEmail(contact.email)) {
      setEmailError(center)
      return
    }
    setEmailError(null)
    setSavedCenter(center)
    setTimeout(() => setSavedCenter(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-red-600 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <span className="font-bold text-lg">🧯 불끄미 담당자</span>
          <span className="ml-3 text-sm text-red-200">알림 수신 설정</span>
        </div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="text-sm text-red-200 hover:text-white transition-colors"
        >
          ← 대시보드
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">

        <p className="text-sm text-gray-500 mb-4">
          신고 접수 시 알림을 받을 이메일을 센터별로 등록하세요.
          담당자가 바뀌면 여기서 수정하세요.
        </p>

        {/* 소방서 선택 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">소방서 선택</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATIONS.map((name) => (
              <button
                key={name}
                onClick={() => { setSelectedStation(name); setEmailError(null) }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                  ${selectedStation === name
                    ? 'bg-red-600 text-white border-red-600 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                  }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 센터별 이메일 입력 */}
        <div className="space-y-3">
          {centers.map((center) => {
            const contact = contacts[selectedStation]?.[center] ?? {}
            const isSaved = savedCenter === center
            const hasError = emailError === center

            return (
              <div key={center} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm text-gray-800">{center}</p>
                  {isSaved && <span className="text-xs text-green-600 font-medium">✓ 저장됨</span>}
                </div>

                <div className="flex gap-3 items-start">
                  {/* 이메일 */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      이메일 <span className="text-gray-300">(신고 알림 수신)</span>
                    </label>
                    <input
                      type="email"
                      value={contact.email ?? ''}
                      onChange={(e) => {
                        updateContact(selectedStation, center, 'email', e.target.value)
                        if (hasError) setEmailError(null)
                      }}
                      placeholder="center@fire.go.kr"
                      className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none text-gray-700
                        ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-red-400'}`}
                    />
                    {hasError && (
                      <p className="text-xs text-red-500 mt-1">올바른 이메일 형식으로 입력해주세요</p>
                    )}
                  </div>

                  {/* 네이버웍스 (추후) */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      네이버웍스 채널 ID <span className="text-gray-300">(추후 연동)</span>
                    </label>
                    <input
                      type="text"
                      value={contact.worksChannelId ?? ''}
                      onChange={(e) => updateContact(selectedStation, center, 'worksChannelId', e.target.value)}
                      placeholder="추후 지원 예정"
                      disabled
                      className="w-full text-sm border border-gray-100 rounded-lg px-3 py-2
                        text-gray-300 bg-gray-50 cursor-not-allowed"
                    />
                  </div>

                  <div className="pt-5">
                    <button
                      onClick={() => handleSave(center)}
                      className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
