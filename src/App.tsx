import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import Login from './components/Auth/Login'
import HomePage from './pages/HomePage'
import NewProjectPage from './pages/NewProjectPage'
import ProjectDetailPage from './pages/ProjectDetailPage'

const AppContent = () => {
  const { user, loading } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-surface via-dark-card to-dark-surface">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-charcoal">Loading...</p>
        </div>
      </div>
    )
  }

  if (isSupabaseConfigured && !user) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-surface via-dark-card to-dark-surface flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenuButton={isMobile} />
      <div className="flex flex-1 pt-14">
        {isMobile && (
          <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}>
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className={`absolute left-0 top-14 h-[calc(100vh-3.5rem)] w-72 bg-dark-card/95 backdrop-blur-xl border-r border-divider transform transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}
        {!isMobile && <Sidebar />}
        <main className={`flex-1 min-h-[calc(100vh-3.5rem)] overflow-y-auto transition-all duration-300 ${
          isMobile ? 'ml-0' : 'pl-[220px]'
        }`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<NewProjectPage />} />
            <Route path="/project/:id" element={<ProjectDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
