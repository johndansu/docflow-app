// Quick script to check if Supabase is configured
// Run with: node check-supabase.js

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  const envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
  
  const hasUrl = envContent.includes('VITE_SUPABASE_URL=')
  const hasKey = envContent.includes('VITE_SUPABASE_ANON_KEY=')
  
  console.log('\n📋 Supabase Configuration Check:\n')
  
  if (hasUrl && hasKey) {
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/)
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)
    
    const url = urlMatch ? urlMatch[1].trim() : 'not set'
    const key = keyMatch ? keyMatch[1].trim().substring(0, 20) + '...' : 'not set'
    
    console.log('✅ VITE_SUPABASE_URL:', url)
    console.log('✅ VITE_SUPABASE_ANON_KEY:', key)
    
    if (url.includes('placeholder') || url === 'your_supabase_project_url') {
      console.log('\n⚠️  Please replace placeholder values with your actual Supabase credentials!')
    } else {
      console.log('\n✅ Supabase appears to be configured!')
    }
  } else {
    console.log('❌ Supabase credentials not found in .env file')
    console.log('\nPlease add:')
    console.log('VITE_SUPABASE_URL=your_project_url')
    console.log('VITE_SUPABASE_ANON_KEY=your_anon_key')
  }
} catch (error) {
  console.log('❌ .env file not found')
  console.log('\nPlease create a .env file with:')
  console.log('VITE_SUPABASE_URL=your_project_url')
  console.log('VITE_SUPABASE_ANON_KEY=your_anon_key')
}

