import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../utils/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // If Supabase is not configured, skip auth and allow access
      console.warn('⚠️ Supabase not configured - running in development mode without authentication')
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [isSupabaseConfigured])

  const signUp = async (email: string, password: string, name?: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase is not configured. Please add credentials to .env file.' } }
    }
    
    const nameToSave = name?.trim() || email.split('@')[0]
    console.log('Signing up with name:', nameToSave)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: nameToSave,
        },
      },
    })
    
    console.log('Signup response:', { user: data.user, error })
    if (data.user) {
      console.log('User metadata after signup:', data.user.user_metadata)
      setUser(data.user)
      // Also refresh session to ensure we have the latest user data
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session) {
        setSession(sessionData.session)
        setUser(sessionData.session.user)
      }
    }
    
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase is not configured. Please add credentials to .env file.' } }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Refresh user data after sign in
    if (data.user) {
      console.log('User metadata after sign in:', data.user.user_metadata)
      setUser(data.user)
      if (data.session) {
        setSession(data.session)
      }
    }
    
    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

