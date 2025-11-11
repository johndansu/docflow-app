import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false) // Default to signin
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validation for sign up
    if (isSignUp) {
      if (!name.trim()) {
        setError('Please enter your name')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }
    }

    try {
      const { error } = isSignUp
        ? await signUp(email, password, name.trim()) // Trim whitespace from name
        : await signIn(email, password)

      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-neutral px-4 py-8">
      <div className={`w-full bg-dark-card rounded-xl border border-divider/50 shadow-xl ${isSignUp ? 'max-w-lg p-10' : 'max-w-md p-8'}`}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-gold to-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">DocFlow</h1>
          <p className="text-sm text-mid-grey">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                className="w-full px-4 py-3 bg-dark-surface border border-divider/50 rounded-lg text-charcoal placeholder:text-mid-grey/50 focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30 transition-all"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-surface border border-divider/50 rounded-lg text-charcoal placeholder:text-mid-grey/50 focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-dark-surface border border-divider/50 rounded-lg text-charcoal placeholder:text-mid-grey/50 focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30 transition-all"
              placeholder="••••••••"
            />
            {isSignUp && (
              <p className="mt-1.5 text-xs text-mid-grey">Must be at least 6 characters</p>
            )}
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={isSignUp}
                minLength={6}
                className="w-full px-4 py-3 bg-dark-surface border border-divider/50 rounded-lg text-charcoal placeholder:text-mid-grey/50 focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30 transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3.5 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-lg font-semibold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setName('')
              setEmail('')
              setPassword('')
              setConfirmPassword('')
            }}
            className="text-sm text-mid-grey hover:text-charcoal transition-colors"
          >
            {isSignUp ? (
              <>Already have an account? <span className="text-amber-gold font-medium">Sign in</span></>
            ) : (
              <>Don't have an account? <span className="text-amber-gold font-medium">Sign up</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login

