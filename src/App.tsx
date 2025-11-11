import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import MainWorkspace from './components/Workspace/MainWorkspace'
import Dashboard from './components/Dashboard/Dashboard'
import Login from './components/Auth/Login'

type View = 'Projects' | 'Templates'

const AppContent = () => {
  const [activeView, setActiveView] = useState<View>('Projects')
  const { user, loading } = useAuth()

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-neutral">
        <div className="text-charcoal">Loading...</div>
      </div>
    )
  }

  // Only require auth if Supabase is configured
  if (isSupabaseConfigured && !user) {
    return <Login />
  }

  const renderContent = () => {
    switch (activeView) {
      case 'Projects':
        return <Dashboard onNavigateToNew={() => setActiveView('Templates')} />
      case 'Templates':
        return <MainWorkspace />
      default:
        return <Dashboard onNavigateToNew={() => setActiveView('Templates')} />
    }
  }

  return (
    <div className="min-h-screen bg-light-neutral flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 pl-[200px] min-h-[calc(100vh-3.5rem)] overflow-y-auto bg-light-neutral">
          <div className="min-h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
