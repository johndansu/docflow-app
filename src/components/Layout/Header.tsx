import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  onMenuToggle?: () => void
  showMenuButton?: boolean
}

const Header = ({ onMenuToggle, showMenuButton = false }: HeaderProps) => {
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  // Get user's display name (from metadata - the name they registered with)
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const displayInitial = displayName.charAt(0).toUpperCase()

  return (
    <header className="fixed top-0 left-0 right-0 bg-dark-surface/95 backdrop-blur-xl border-b border-divider/30 z-50 shadow-lg">
      <div className="h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <button
              onClick={onMenuToggle}
              className="p-2.5 rounded-lg hover:bg-dark-card/50 transition-colors md:hidden"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-dark-surface/10 border border-divider/30 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-light text-white tracking-tight">DocFlow</h1>
              <p className="text-xs text-mid-grey">Documentation Platform</p>
            </div>
          </Link>
        </div>
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-dark-card/50 transition-all duration-200 border border-transparent hover:border-divider/30"
            >
              <div className="w-8 h-8 rounded-full bg-dark-surface/10 border border-divider/30 flex items-center justify-center text-mid-grey text-sm font-semibold shadow-md">
                {displayInitial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs text-mid-grey">Active</p>
              </div>
              <svg className="w-4 h-4 text-mid-grey transition-transform duration-200" style={{ transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-3 w-72 bg-dark-card/98 backdrop-blur-xl border border-divider/30 rounded-2xl shadow-2xl z-20 py-3">
                  <div className="px-5 py-4 border-b border-divider/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-surface/10 border border-divider/30 flex items-center justify-center text-mid-grey text-sm font-semibold shadow-md">
                        {displayInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                        <p className="text-xs text-mid-grey truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-5 py-3 border-b border-divider/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-mid-grey">Account Status</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">Active</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      await signOut()
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 rounded-xl mx-2 my-1 group"
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
        </div>
        )}
      </div>
    </header>
  )
}

export default Header
