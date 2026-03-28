import { create } from 'zustand'
import { fetchExtinguishers } from '../api/seoulMap'

const useMapStore = create((set, get) => ({
  extinguishers: [],
  selectedItem: null,
  isLoading: false,
  loadedCount: 0,
  totalCount: 0,
  error: null,

  filterStation: '종로소방서',
  filterCenter: '전체',

  /** API에서 소화기 전체 목록을 불러옵니다. */
  fetchExtinguishers: async () => {
    if (get().extinguishers.length > 0) return
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

  setFilterStation: (name) => set({ filterStation: name, filterCenter: '전체' }),
  setFilterCenter: (name) => set({ filterCenter: name }),

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

  getFiltered: () => {
    const { extinguishers, filterStation, filterCenter } = get()
    return extinguishers.filter((e) =>
      (filterStation === '전체' || e.station === filterStation) &&
      (filterCenter  === '전체' || e.center  === filterCenter)
    )
  },

  selectItem: (item) => set({ selectedItem: item }),
  clearSelection: () => set({ selectedItem: null }),

  /** 특정 소화기 상태 변경 (useReportStore에서 호출) */
  updateExtinguisherStatus: (id, status) => set((state) => ({
    extinguishers: state.extinguishers.map((e) =>
      String(e.id) === String(id) ? { ...e, status } : e
    ),
    selectedItem: state.selectedItem && String(state.selectedItem.id) === String(id)
      ? { ...state.selectedItem, status }
      : state.selectedItem,
    pinnedItems: state.pinnedItems.map((e) =>
      String(e.id) === String(id) ? { ...e, status } : e
    ),
  })),

  searchResults: [],
  pinnedItems: [],
  setSearchResults: (items) => set({ searchResults: items }),
  pinItem: (item) => set((state) => {
    const already = state.pinnedItems.some((p) => p.id === item.id)
    return already ? {} : { pinnedItems: [...state.pinnedItems, item] }
  }),
  unpinItem: (id) => set((state) => ({
    pinnedItems: state.pinnedItems.filter((p) => p.id !== id),
  })),
  clearSearch: () => set({ searchResults: [], pinnedItems: [] }),

  flyTarget: null,
  flyTo: (item) => set({ flyTarget: item }),
  clearFlyTarget: () => set({ flyTarget: null }),
}))

export default useMapStore
