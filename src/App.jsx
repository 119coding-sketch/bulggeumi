import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MapPage from './pages/MapPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminContactsPage from './pages/AdminContactsPage'
import ReportPage from './pages/ReportPage'
import useAuthStore from './store/useAuthStore'

function RequireAuth({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return isLoggedIn ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />
        <Route path="/report/:id" element={<ReportPage />} />
        <Route
          path="/admin/contacts"
          element={
            <RequireAuth>
              <AdminContactsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
