import type { ReactElement } from 'react'

type View = 'Projects' | 'Templates'

interface SidebarProps {
  activeView: View
  onViewChange: (view: View) => void
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const menuItems: { id: View; label: string; icon: ReactElement }[] = [
    { 
      id: 'Projects', 
      label: 'Projects', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    { 
      id: 'Templates', 
      label: 'New', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
  ]

  return (
    <aside 
      className="fixed left-0 top-14 bg-dark-card/50 backdrop-blur-sm border-r border-divider/50 h-[calc(100vh-3.5rem)] overflow-y-auto z-40"
      style={{ width: '200px' }}
    >
      <nav className="p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-gold/50 ${
                  activeView === item.id
                    ? 'bg-amber-gold/15 text-amber-gold'
                    : 'text-mid-grey hover:text-charcoal hover:bg-dark-surface/50'
                }`}
              >
                <span className={activeView === item.id ? 'opacity-100' : 'opacity-70'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar

