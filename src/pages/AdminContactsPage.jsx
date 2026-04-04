import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useContactStore from '../store/useContactStore'
import fireStations from '../data/fireStations'

const ALL_STATIONS = Object.keys(fireStations)

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function AdminContactsPage() {
  const navigate = useNavigate()
  const { contacts, isLoaded, fetchContacts, updateContact, saveContact, deleteContact } = useContactStore()

  const [selectedStation, setSelectedStation] = useState(ALL_STATIONS[0])
  const [savedCenter, setSavedCenter] = useState(null)
  const [savingCenter, setSavingCenter] = useState(null)
  const [deletingCenter, setDeletingCenter] = useState(null)
  const [emailError, setEmailError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [dirtySet, setDirtySet] = useState(new Set())

  // 페이지 진입 시 서버에서 연락처 불러오기
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // 미저장 변경사항 있을 때 브라우저 탭 닫기/새로고침 경고
  useEffect(() => {
    if (dirtySet.size === 0) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirtySet])

  function handleSelectStation(name) {
    if (dirtySet.size > 0 && !confirm('저장하지 않은 변경사항이 있습니다. 다른 소방서로 이동할까요?')) return
    setSelectedStation(name)
    setDirtySet(new Set())
    setEmailError(null)
    setSaveError(null)
  }

  const centers = fireStations[selectedStation] ?? []

  async function handleDelete(center) {
    if (!confirm(`${center} 연락처를 삭제할까요?`)) return
    setDeletingCenter(center)
    try {
      await deleteContact(selectedStation, center)
      setDirtySet((prev) => { const next = new Set(prev); next.delete(center); return next })
    } catch {
      setSaveError(center)
    } finally {
      setDeletingCenter(null)
    }
  }

  async function handleSave(center) {
    const contact = contacts[selectedStation]?.[center] ?? {}
    if (contact.email && !isValidEmail(contact.email)) {
      setEmailError(center)
      return
    }
    setEmailError(null)
    setSaveError(null)
    setSavingCenter(center)
    try {
      await saveContact(selectedStation, center)
      setSavedCenter(center)
      setDirtySet((prev) => { const next = new Set(prev); next.delete(center); return next })
      setTimeout(() => setSavedCenter(null), 2000)
    } catch {
      setSaveError(center)
    } finally {
      setSavingCenter(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-red-600 text-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow">
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

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">

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
                onClick={() => handleSelectStation(name)}
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

        {/* 로딩 중 */}
        {!isLoaded && (
          <div className="text-center py-10 text-sm text-gray-400">연락처 불러오는 중...</div>
        )}

        {/* 센터별 이메일 입력 */}
        {isLoaded && (
          <div className="space-y-3">
            {centers.map((center) => {
              const contact = contacts[selectedStation]?.[center] ?? {}
              const isSaved = savedCenter === center
              const isSaving = savingCenter === center
              const isDeleting = deletingCenter === center
              const hasError = emailError === center
              const hasNetworkError = saveError === center
              const hasData = !!(contact.email || contact.truckPhone || contact.managerPhone)
              const isDirty = dirtySet.has(center)

              return (
                <div key={center} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm text-gray-800">{center}</p>
                    <div className="flex items-center gap-2">
                      {isDirty && !isSaved && <span className="text-xs text-orange-500 font-medium">미저장</span>}
                      {isSaved && <span className="text-xs text-green-600 font-medium">✓ 저장됨</span>}
                      {hasNetworkError && <span className="text-xs text-red-500">저장 실패 — 다시 시도해주세요</span>}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-start">
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
                          setDirtySet((prev) => new Set([...prev, center]))
                          if (hasError) setEmailError(null)
                          if (hasNetworkError) setSaveError(null)
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
                    <div className="flex-1 hidden md:block">
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

                    <div className="md:pt-5 flex gap-2">
                      {hasData && (
                        <button
                          onClick={() => handleDelete(center)}
                          disabled={isDeleting}
                          className="flex-1 md:flex-none text-sm px-3 py-2 border border-gray-200 text-gray-400 rounded-lg
                            hover:border-red-300 hover:text-red-400 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          {isDeleting ? '삭제 중...' : '삭제'}
                        </button>
                      )}
                      <button
                        onClick={() => handleSave(center)}
                        disabled={isSaving}
                        className="flex-1 md:flex-none text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
                          transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        {isSaving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
