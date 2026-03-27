import { create } from 'zustand'
import { fetchExtinguishers } from '../api/seoulMap'

const useMapStore = create((set, get) => ({
  extinguishers: [],
  selectedItem: null,
  isLoading: false,
  loadedCount: 0,   // 현재까지 불러온 개수
  totalCount: 0,    // 전체 개수
  error: null,

  // 지도 필터 상태 (소방서는 첫 번째로 기본 선택)
  filterStation: '종로소방서',
  filterCenter: '전체',

  /** API에서 소화기 전체 목록을 불러옵니다. 페이지마다 화면에 반영합니다. */
  fetchExtinguishers: async () => {
    set({ isLoading: true, error: null, loadedCount: 0, totalCount: 0 })
    try {
      const data = await fetchExtinguishers((items, total) => {
        set({ extinguishers: items, loadedCount: items.length, totalCount: total })
      })
      set({ extinguishers: Array.isArray(data) ? data : [], loadedCount: data.length })
    } catch (err) {
      set({ error: err.message, extinguishers: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  /** 소방서 필터 변경 (센터는 전체로 초기화) */
  setFilterStation: (name) => set({ filterStation: name, filterCenter: '전체' }),

  /** 센터 필터 변경 */
  setFilterCenter: (name) => set({ filterCenter: name }),

  /** 선택된 소방서의 실제 데이터 기반 센터 목록 */
  getCenterList: (station) => {
    const { extinguishers } = get()
    const set_ = new Set(
      extinguishers
        .filter((e) => e.station === station)
        .map((e) => e.center)
        .filter(Boolean)
    )
    return Array.from(set_)
  },

  /** 현재 필터가 적용된 소화기 목록 */
  getFiltered: () => {
    const { extinguishers, filterStation, filterCenter } = get()
    return extinguishers.filter((e) =>
      (filterStation === '전체' || e.station === filterStation) &&
      (filterCenter  === '전체' || e.center  === filterCenter)
    )
  },

  selectItem: (item) => set({ selectedItem: item }),
  clearSelection: () => set({ selectedItem: null }),
}))

export default useMapStore
