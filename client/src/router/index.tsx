import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import LinkPartnerPage from '../pages/LinkPartnerPage'
import DashboardPage from '../pages/DashboardPage'
import DailyTaskPage from '../pages/DailyTaskPage'
import JournalPage from '../pages/JournalPage'
import TruthDarePage from '../pages/TruthDarePage'
import GalleryPage from '../pages/GalleryPage'
const isAuthenticated = () => {
  return !!localStorage.getItem('token')
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/link-partner" element={<LinkPartnerPage />} />

        {/* Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/task" element={
          <ProtectedRoute>
            <DailyTaskPage />
          </ProtectedRoute>
        } />
        <Route path="/journal" element={
        <ProtectedRoute>
          <JournalPage />
        </ProtectedRoute>
    } />

      <Route path="/gallery" element={
      <ProtectedRoute>
        <GalleryPage />
      </ProtectedRoute>
    } />
        <Route path="/truth-dare" element={
          <ProtectedRoute>
            <TruthDarePage />
          </ProtectedRoute>
        } />
      </Routes>
      
    </BrowserRouter>
  )
}

export default AppRouter