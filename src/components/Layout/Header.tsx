import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const Header = () => {
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  // Debug: Log user metadata to see what's stored
  if (user) {
    console.log('User object:', user)
    console.log('User metadata:', user.user_metadata)
    console.log('User email:', user.email)
  }

  // Get user's display name (from metadata - the name they registered with)
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const displayInitial = displayName.charAt(0).toUpperCase()

  return (
    <header className="fixed top-0 left-0 right-0 bg-dark-surface/80 backdrop-blur-xl border-b border-divider/50 z-50">
      <div className="h-14 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-amber-gold to-yellow-500 rounded-md flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-heading font-semibold text-charcoal tracking-tight">DocFlow</h1>
        </div>
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-dark-card transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-gold to-yellow-500 flex items-center justify-center text-white text-sm font-semibold">
                {displayInitial}
              </div>
              <span className="text-sm text-charcoal hidden sm:block">{displayName}</span>
              <svg className="w-4 h-4 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-dark-card border border-divider/50 rounded-lg shadow-xl z-20 py-1">
                  <div className="px-4 py-2 border-b border-divider/30">
                    <p className="text-xs text-mid-grey">Signed in as</p>
                    <p className="text-sm text-charcoal font-medium truncate">{displayName}</p>
                    <p className="text-xs text-mid-grey truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut()
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
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
