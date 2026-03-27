import { create } from 'zustand'
import fireStations from '../data/fireStations'

// 소방서/센터별 빈 연락처 초기 구조
function buildInitialContacts() {
  const contacts = {}
  Object.entries(fireStations).forEach(([station, centers]) => {
    contacts[station] = {}
    centers.forEach((center) => {
      contacts[station][center] = { truckPhone: '', managerPhone: '', email: '' }
    })
  })
  return contacts
}

const useContactStore = create((set, get) => ({
  contacts: buildInitialContacts(),
  isLoaded: false,

  /** 서버(Upstash Redis)에서 전체 연락처 불러오기 */
  fetchContacts: async () => {
    try {
      const res = await fetch('/api/contacts')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      // 서버 데이터를 초기 구조에 병합 (새 센터가 추가돼도 빈 값으로 포함됨)
      set((state) => {
        const merged = { ...state.contacts }
        Object.entries(data).forEach(([station, centers]) => {
          if (!merged[station]) return
          Object.entries(centers).forEach(([center, contact]) => {
            if (merged[station][center]) {
              merged[station][center] = { ...merged[station][center], ...contact }
            }
          })
        })
        return { contacts: merged, isLoaded: true }
      })
    } catch {
      // 로컬 개발 환경 등 API 미접속 시 빈 구조로 초기화
      set({ isLoaded: true })
    }
  },

  /** 특정 센터의 연락처 단일 필드 업데이트 (로컬 상태만) */
  updateContact: (station, center, field, value) =>
    set((state) => ({
      contacts: {
        ...state.contacts,
        [station]: {
          ...state.contacts[station],
          [center]: {
            ...state.contacts[station]?.[center],
            [field]: value,
          },
        },
      },
    })),

  /** 특정 센터 연락처를 서버에 저장 */
  saveContact: async (station, center) => {
    const data = get().contacts[station]?.[center] ?? {}
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station, center, data }),
    })
    if (!res.ok) throw new Error('저장 실패')
  },

  /** 특정 센터 연락처 반환 */
  getContact: (station, center) =>
    get().contacts[station]?.[center] ?? { truckPhone: '', managerPhone: '', email: '' },
}))

export default useContactStore
