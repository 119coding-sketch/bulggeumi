import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useContactStore from '../store/useContactStore'
import fireStations from '../data/fireStations'

const ALL_STATIONS = Object.keys(fireStations)

// 숫자만 입력받아 010-1234-5678 형식으로 변환
function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function AdminContactsPage() {
  const navigate = useNavigate()
  const { contacts, updateContact } = useContactStore()

  const [selectedStation, setSelectedStation] = useState(ALL_STATIONS[0])
  const [savedCenter, setSavedCenter] = useState(null) // 저장 완료 표시용

  const centers = fireStations[selectedStation] ?? []

  function handleChange(center, field, value) {
    updateContact(selectedStation, center, field, value)
  }

  function handleSave(center) {
    setSavedCenter(center)
    setTimeout(() => setSavedCenter(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="bg-red-600 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <span className="font-bold text-lg">🧯 불끄미 담당자</span>
          <span className="ml-3 text-sm text-red-200">연락처 관리</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-sm text-red-200 hover:text-white transition-colors"
          >
            ← 대시보드
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">

        <p className="text-sm text-gray-500 mb-4">
          신고 발생 시 문자·이메일을 받을 연락처를 등록하세요. 담당자가 바뀌면 여기서 수정하세요.
        </p>

        {/* 소방서 선택 탭 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">소방서 선택</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATIONS.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedStation(name)}
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

        {/* 센터별 연락처 입력 */}
        <div className="space-y-3">
          {centers.map((center) => {
            const contact = contacts[selectedStation]?.[center] ?? {}
            const isSaved = savedCenter === center

            return (
              <div
                key={center}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm text-gray-800">{center}</p>
                  {isSaved && (
                    <span className="text-xs text-green-600 font-medium">✓ 저장됨</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 소방차 번호 */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">소방차 번호</label>
                    <input
                      type="tel"
                      value={contact.truckPhone ?? ''}
                      onChange={(e) => handleChange(center, 'truckPhone', formatPhone(e.target.value))}
                      placeholder="숫자만 입력 (01012345678)"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2
                        focus:outline-none focus:border-red-400 text-gray-700"
                    />
                  </div>

                  {/* 본서 담당자 번호 */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">본서 담당자 번호</label>
                    <input
                      type="tel"
                      value={contact.managerPhone ?? ''}
                      onChange={(e) => handleChange(center, 'managerPhone', formatPhone(e.target.value))}
                      placeholder="숫자만 입력 (01012345678)"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2
                        focus:outline-none focus:border-red-400 text-gray-700"
                    />
                  </div>

                  {/* 이메일 */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">이메일</label>
                    <input
                      type="email"
                      value={contact.email ?? ''}
                      onChange={(e) => handleChange(center, 'email', e.target.value)}
                      placeholder="center@fire.go.kr"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2
                        focus:outline-none focus:border-red-400 text-gray-700"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleSave(center)}
                    className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg
                      hover:bg-red-700 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
