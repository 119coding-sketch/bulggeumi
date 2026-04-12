import { create } from 'zustand'

const TOKEN_KEY = 'bulggeumi-token'

const useAuthStore = create((set, get) => ({
  user: null,      // { email }
  token: null,
  isLoading: true, // 앱 초기화 시 세션 확인 중

  /** 앱 시작 시 저장된 토큰으로 세션 복원 */
  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return set({ user: null, token: null, isLoading: false })

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const user = await res.json()
        set({ user, token, isLoading: false })
      } else {
        localStorage.removeItem(TOKEN_KEY)
        set({ user: null, token: null, isLoading: false })
      }
    } catch {
      set({ user: null, token: null, isLoading: false })
    }
  },

  /** 로그인/인증 완료 후 세션 저장 */
  setAuth: (token, email) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ user: { email }, token })
  },

  /** 로그아웃 */
  logout: async () => {
    const { token } = get()
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch { /* ignore */ }
      localStorage.removeItem(TOKEN_KEY)
    }
    set({ user: null, token: null })
  },
}))

export default useAuthStore
