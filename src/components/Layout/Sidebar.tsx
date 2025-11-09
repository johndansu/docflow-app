type View = 'Projects' | 'Templates' | 'Site Flow' | 'Export'

interface SidebarProps {
  activeView: View
  onViewChange: (view: View) => void
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const menuItems: { id: View; label: string; icon: string }[] = [
    { id: 'Projects', label: 'Projects', icon: '📁' },
    { id: 'Templates', label: 'Templates', icon: '📄' },
    { id: 'Site Flow', label: 'Site Flow', icon: '🗺️' },
    { id: 'Export', label: 'Export', icon: '📤' },
  ]

  return (
    <aside 
      className="fixed left-0 top-header bg-white border-r border-divider h-screen overflow-y-auto"
      style={{ width: '180px' }}
    >
      <nav className="p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all text-sm ${
                  activeView === item.id
                    ? 'bg-amber-gold text-white'
                    : 'text-charcoal hover:bg-light-neutral'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar

