const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-divider/50 z-50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-gold to-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-heading font-bold text-charcoal">DocFlow</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-mid-grey hover:text-charcoal transition-colors">Features</a>
            <a href="#examples" className="text-sm text-mid-grey hover:text-charcoal transition-colors">Examples</a>
            <a href="#pricing" className="text-sm text-mid-grey hover:text-charcoal transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-4">
            <button className="hidden md:block px-4 py-2 text-sm text-charcoal hover:text-amber-gold transition-colors font-medium">
              Sign In
            </button>
            <button className="px-5 py-2 bg-gradient-to-r from-amber-gold to-yellow-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
              Get Started Free
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
