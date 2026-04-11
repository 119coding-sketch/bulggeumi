import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MapPage from './pages/MapPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminContactsPage from './pages/AdminContactsPage'
import ReportPage from './pages/ReportPage'
import QRPage from './pages/QRPage'
import ActivitiesPage from './pages/ActivitiesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/contacts" element={<AdminContactsPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
        <Route path="/qr/:id" element={<QRPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
