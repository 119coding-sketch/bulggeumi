import { create } from 'zustand'
import { fetchExtinguishers } from '../api/seoulMap'

const useMapStore = create((set, get) => ({
  extinguishers: [],
  selectedItem: null,
  isLoading: false,
  error: null,

  // 지도 필터 상태
  filterGu: '전체',
  filterStation: '전체',
  filterCenter: '전체',

  /** API에서 소화기 목록을 불러옵니다. */
  fetchExtinguishers: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await fetchExtinguishers()
      set({ extinguishers: Array.isArray(data) ? data : [] })
    } catch (err) {
      set({ error: err.message, extinguishers: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  /** 자치구 필터 변경 */
  setFilterGu: (name) => set({ filterGu: name }),

  /** 소방서 필터 변경 (센터는 전체로 초기화) */
  setFilterStation: (name) => set({ filterStation: name, filterCenter: '전체' }),

  /** 센터 필터 변경 */
  setFilterCenter: (name) => set({ filterCenter: name }),

  /** 로드된 데이터에서 자치구 목록을 반환합니다 (가나다순) */
  getGuList: () => {
    const { extinguishers } = get()
    const set_ = new Set(extinguishers.map((e) => e.gu).filter(Boolean))
    return Array.from(set_).sort((a, b) => a.localeCompare(b, 'ko'))
  },

  /** 현재 필터가 적용된 소화기 목록 */
  getFiltered: () => {
    const { extinguishers, filterGu, filterStation, filterCenter } = get()
    return extinguishers.filter((e) =>
      (filterGu      === '전체' || e.gu      === filterGu) &&
      (filterStation === '전체' || e.station === filterStation) &&
      (filterCenter  === '전체' || e.center  === filterCenter)
    )
  },

  selectItem: (item) => set({ selectedItem: item }),
  clearSelection: () => set({ selectedItem: null }),
}))

export default useMapStore
