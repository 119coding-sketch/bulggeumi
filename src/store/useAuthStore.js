import { create } from 'zustand'

const useAuthStore = create((set) => ({
  isLoggedIn: false,
  station: null,   // 선택한 소방서 이름
  center: null,    // 선택한 안전센터 이름 (null이면 소방서 전체)

  login: ({ station, center }) => set({ isLoggedIn: true, station, center }),
  logout: () => set({ isLoggedIn: false, station: null, center: null }),
}))

export default useAuthStore
