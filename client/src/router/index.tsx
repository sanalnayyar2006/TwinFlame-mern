import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'

// Login is the entry screen, so it ships in the main bundle; every other page loads on demand
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const LinkPartnerPage = lazy(() => import('../pages/LinkPartnerPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const JournalPage = lazy(() => import('../pages/JournalPage'))
const TruthDarePage = lazy(() => import('../pages/TruthDarePage'))
const GalleryPage = lazy(() => import('../pages/GalleryPage'))

const PageLoading = () => (
  <p role="status" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
    Loading…
  </p>
)
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
      <Suspense fallback={<PageLoading />}>
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
        {/* The Daily Connection lives on the dashboard now; keep old links working */}
        <Route path="/task" element={<Navigate to="/dashboard" replace />} />
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
      </Suspense>
      
    </BrowserRouter>
  )
}

export default AppRouter