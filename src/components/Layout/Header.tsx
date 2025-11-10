const Header = () => {
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
        <div className="w-6 h-6 rounded-full bg-dark-card border border-divider/50 flex items-center justify-center cursor-pointer hover:border-divider transition-colors">
          <div className="w-4 h-4 rounded-full bg-amber-gold/20"></div>
        </div>
      </div>
    </header>
  )
}

export default Header
