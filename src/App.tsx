import { useState } from 'react'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import MainWorkspace from './components/Workspace/MainWorkspace'
import Dashboard from './components/Dashboard/Dashboard'

type View = 'Projects' | 'Templates'

function App() {
  const [activeView, setActiveView] = useState<View>('Projects')

  const renderContent = () => {
    switch (activeView) {
      case 'Projects':
        return <Dashboard />
      case 'Templates':
        return <MainWorkspace />
      default:
        return <Dashboard />
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

export default App
