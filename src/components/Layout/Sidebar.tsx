import { NavLink, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'

interface MenuItem {
  path: string
  label: string
  icon: ReactElement
}

interface SidebarProps {
  onClose?: () => void
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation()

  const menuItems: MenuItem[] = [
    { 
      path: '/', 
      label: 'Projects', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    { 
      path: '/new', 
      label: 'New Project', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside 
      className="fixed left-0 top-14 bg-dark-card/80 backdrop-blur-xl border-r border-divider/50 h-[calc(100vh-3.5rem)] overflow-y-auto z-40"
      style={{ width: '220px' }}
    >
      <nav className="p-6">
        <ul className="space-y-3">
          {menuItems.map((item) => {
            const active = isActive(item.path)
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-lg text-left transition-all text-sm font-medium group ${
                    active
                      ? 'bg-gradient-to-r from-amber-gold/20 to-yellow-500/10 text-amber-gold border border-amber-gold/30 shadow-sm'
                      : 'text-mid-grey hover:text-charcoal hover:bg-dark-surface/50'
                  }`}
                >
                  <span className={active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100 transition-opacity'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar

