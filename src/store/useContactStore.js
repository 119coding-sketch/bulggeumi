import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

const useContactStore = create(
  persist(
    (set, get) => ({
      contacts: buildInitialContacts(),

      /** 특정 센터의 연락처 단일 필드 업데이트 */
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

      /** 특정 센터 연락처 반환 */
      getContact: (station, center) =>
        get().contacts[station]?.[center] ?? { truckPhone: '', managerPhone: '', email: '' },
    }),
    { name: 'bulggeumi-contacts' } // localStorage에 자동 저장
  )
)

export default useContactStore
