import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import MapPage from './pages/MapPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminContactsPage from './pages/AdminContactsPage'
import ReportPage from './pages/ReportPage'
import QRPage from './pages/QRPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import useAuthStore from './store/useAuthStore'

// 로그인 필요 라우트 — 미로그인 시 /login으로 이동
function RequireAuth({ children }) {
  const { user, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) navigate('/login', { replace: true })
  }, [user, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    )
  }
  return user ? children : null
}

// 앱 초기화 — 저장된 토큰으로 세션 복원
function AppInitializer({ children }) {
  const { checkAuth } = useAuthStore()
  useEffect(() => { checkAuth() }, [checkAuth])
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/qr/:id" element={<QRPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboardPage /></RequireAuth>} />
          <Route path="/admin/contacts" element={<RequireAuth><AdminContactsPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  )
}
