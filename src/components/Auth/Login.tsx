"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { cn } from "../../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

const Login = () => {
  const [isSignUp, setIsSignUp] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [focusedInput, setFocusedInput] = React.useState<string | null>(null)
  const [rememberMe, setRememberMe] = React.useState(false)
  const { signIn, signUp } = useAuth()

  // For 3D card effect - optimized with throttling (currently disabled)
  // const mouseX = useMotionValue(0);
  // const mouseY = useMotionValue(0);
  // const rotateX = useTransform(mouseY, [-300, 300], [5, -5]); // Reduced rotation
  // const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]); // Reduced rotation

  // const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
  //   const rect = e.currentTarget.getBoundingClientRect();
  //   mouseX.set(e.clientX - rect.left - rect.width / 2);
  //   mouseY.set(e.clientY - rect.top - rect.height / 2);
  // }, [mouseX, mouseY]);

  // const handleMouseLeave = React.useCallback(() => {
  //   mouseX.set(0);
  //   mouseY.set(0);
  // }, [mouseX, mouseY]);

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
        ? await signUp(email, password, name.trim())
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
    <div className="min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
      {/* Simplified background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-gold/10 via-dark-surface to-black" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10 px-4"
      >
        <div className="relative group">
            {/* Simplified card glow effect */}
            <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 bg-white/5" />

            {/* Main card content */}
            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              {/* Logo and title - simplified animation */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-dark-surface/10 border border-divider/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-8 h-8 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">DocFlow</h1>
                <p className="text-white/60 text-sm">
                  {isSignUp ? 'Create your account to get started' : 'Welcome back to your workspace'}
                </p>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field for sign up */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div 
                      className="relative"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="absolute -inset-[0.5px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      
                      <div className="relative flex items-center overflow-hidden rounded-lg">
                        <div className="absolute left-3 w-4 h-4 flex items-center justify-center">
                          <svg className={`w-4 h-4 transition-all duration-300 ${
                            focusedInput === "name" ? 'text-amber-gold' : 'text-white/40'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        
                        <Input
                          type="text"
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocusedInput("name")}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-white/5 border-transparent focus:border-amber-gold/50 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 focus:bg-white/10"
                        />
                        
                        {focusedInput === "name" && (
                          <motion.div 
                            layoutId="input-highlight"
                            className="absolute inset-0 bg-white/5 -z-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                      {name && (
                        <motion.p 
                          className="mt-1 text-xs text-amber-gold/60"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          ✓ Name looks good
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email input */}
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="absolute -inset-[0.5px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  
                  <div className="relative flex items-center overflow-hidden rounded-lg">
                    <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                      focusedInput === "email" ? 'text-amber-gold' : 'text-white/40'
                    }`} />
                    
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-white/5 border-transparent focus:border-amber-gold/50 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 focus:bg-white/10"
                    />
                    
                    {focusedInput === "email" && (
                      <motion.div 
                        layoutId="input-highlight"
                        className="absolute inset-0 bg-white/5 -z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </div>
                  {email && email.includes('@') && (
                    <motion.p 
                      className="mt-1 text-xs text-amber-gold/60"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      ✓ Valid email format
                    </motion.p>
                  )}
                </motion.div>

                {/* Password input */}
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="absolute -inset-[0.5px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  
                  <div className="relative flex items-center overflow-hidden rounded-lg">
                    <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                      focusedInput === "password" ? 'text-amber-gold' : 'text-white/40'
                    }`} />
                    
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedInput("password")}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-white/5 border-transparent focus:border-amber-gold/50 text-white placeholder:text-white/30 h-11 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                    />
                    
                    <div 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 cursor-pointer"
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                      )}
                    </div>
                    
                    {focusedInput === "password" && (
                      <motion.div 
                        layoutId="input-highlight"
                        className="absolute inset-0 bg-white/5 -z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </div>
                  {password && isSignUp && (
                    <motion.div 
                      className="mt-2 space-y-1"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full transition-all duration-300 ${
                              password.length >= 8 ? 'bg-green-500' : 
                              password.length >= 6 ? 'bg-amber-gold' : 'bg-red-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((password.length / 12) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs ${
                          password.length >= 8 ? 'text-green-500' : 
                          password.length >= 6 ? 'text-amber-gold' : 'text-red-500'
                        }`}>
                          {password.length >= 8 ? 'Strong' : 
                           password.length >= 6 ? 'Fair' : 'Weak'}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        {password.length < 6 ? 'At least 6 characters' : 
                         password.length < 8 ? 'Add 2 more characters for strong password' : 
                         'Excellent password strength'}
                      </p>
                    </motion.div>
                  )}
                </motion.div>

                {/* Confirm password for sign up */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div 
                      className="relative"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="absolute -inset-[0.5px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      
                      <div className="relative flex items-center overflow-hidden rounded-lg">
                        <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                          focusedInput === "confirmPassword" ? 'text-amber-gold' : 'text-white/40'
                        }`} />
                        
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedInput("confirmPassword")}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-white/5 border-transparent focus:border-amber-gold/50 text-white placeholder:text-white/30 h-11 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                        />
                        
                        <div 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-3 cursor-pointer"
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                          )}
                        </div>
                        
                        {focusedInput === "confirmPassword" && (
                          <motion.div 
                            layoutId="input-highlight"
                            className="absolute inset-0 bg-white/5 -z-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                      {confirmPassword && (
                        <motion.p 
                          className={`mt-1 text-xs ${
                            confirmPassword === password ? 'text-green-500' : 'text-red-500'
                          }`}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                        className="appearance-none h-4 w-4 rounded border border-white/20 bg-white/5 checked:bg-amber-gold checked:border-amber-gold focus:outline-none focus:ring-1 focus:ring-amber-gold/30 transition-all duration-200"
                      />
                      {rememberMe && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center text-black pointer-events-none"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </motion.div>
                      )}
                    </div>
                    <label htmlFor="remember-me" className="text-xs text-white/60 hover:text-white/80 transition-colors duration-200 cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  
                  <a href="#" className="text-xs text-white/60 hover:text-white transition-colors duration-200">
                    Forgot password?
                  </a>
                </div>

                {/* Sign in button - simplified animation */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group/button mt-6"
                >
                  <div className="absolute inset-0 bg-amber-gold/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />
                  
                  <div className="relative overflow-hidden bg-gradient-to-r from-amber-gold to-yellow-500 text-black font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center">
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2 text-sm font-semibold">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                        <ArrowRight className="w-4 h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                      </span>
                    )}
                  </div>
                </button>

                {/* Sign up link - simplified animation */}
                <p className="text-center text-xs text-white/60 mb-6">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setError(null)
                      setName('')
                      setEmail('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                    className="relative inline-block group/signup"
                  >
                    <span className="relative z-10 text-amber-gold group-hover/signup:text-amber-gold/70 transition-colors duration-300 font-medium">
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </span>
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-amber-gold group-hover/signup:w-full transition-all duration-300" />
                  </button>
                </p>

                {/* Terms and conditions for signup */}
                {isSignUp && (
                  <div className="text-center">
                    <p className="text-xs text-white/40 leading-relaxed">
                      By creating an account, you agree to our{' '}
                      <a href="#" className="text-amber-gold/60 hover:text-amber-gold transition-colors duration-200">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-amber-gold/60 hover:text-amber-gold transition-colors duration-200">
                        Privacy Policy
                      </a>
                    </p>
                  </div>
                )}
              </form>
            </div>
          </div>
      </motion.div>
    </div>
  )
}

export default Login
