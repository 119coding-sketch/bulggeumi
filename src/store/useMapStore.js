import { create } from 'zustand'
import { fetchExtinguishers } from '../api/seoulMap'

const LS_KEY = 'bulggeumi-status-overrides'

// localStorage에서 이상 상태 오버라이드 로드
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} }
}

// localStorage에 이상 상태 오버라이드 저장
function saveOverrides(overrides) {
  localStorage.setItem(LS_KEY, JSON.stringify(overrides))
}

// API 데이터에 오버라이드 적용
function applyOverrides(items) {
  const overrides = loadOverrides()
  if (Object.keys(overrides).length === 0) return items
  return items.map((e) => overrides[String(e.id)] ? { ...e, status: overrides[String(e.id)] } : e)
}

const useMapStore = create((set, get) => ({
  extinguishers: [],
  selectedItem: null,
  isLoading: false,
  loadedCount: 0,
  totalCount: 0,
  error: null,

  filterStation: '종로소방서',
  filterCenter: '전체',

  /** API에서 소화기 전체 목록을 불러옵니다. 페이지마다 화면에 반영합니다. */
  fetchExtinguishers: async () => {
    if (get().extinguishers.length > 0) return  // 이미 로드된 경우 재호출 안 함
    set({ isLoading: true, error: null, loadedCount: 0, totalCount: 0 })
    try {
      const data = await fetchExtinguishers((items, total) => {
        set({ extinguishers: applyOverrides(items), loadedCount: items.length, totalCount: total })
      })
      const applied = applyOverrides(Array.isArray(data) ? data : [])
      set({ extinguishers: applied, loadedCount: applied.length })
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

  /** 특정 소화기 상태 변경 + localStorage에 오버라이드 저장 */
  updateExtinguisherStatus: (id, status) => {
    // localStorage 오버라이드 업데이트
    const overrides = loadOverrides()
    if (status === '정상') {
      delete overrides[String(id)]
    } else {
      overrides[String(id)] = status
    }
    saveOverrides(overrides)

    set((state) => ({
      extinguishers: state.extinguishers.map((e) =>
        String(e.id) === String(id) ? { ...e, status } : e
      ),
      selectedItem: state.selectedItem && String(state.selectedItem.id) === String(id)
        ? { ...state.selectedItem, status }
        : state.selectedItem,
      pinnedItems: state.pinnedItems.map((e) =>
        String(e.id) === String(id) ? { ...e, status } : e
      ),
    }))
  },

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
