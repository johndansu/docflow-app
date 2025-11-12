import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create a dummy client if credentials are missing to prevent errors
// The auth context will handle showing appropriate messages
let supabase: SupabaseClient<Database>

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
  // Create a client with dummy values - auth will be disabled
  supabase = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key')
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
}

export { supabase }

