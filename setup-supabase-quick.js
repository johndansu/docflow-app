// Quick Supabase Setup Helper
// This script helps you set up your Supabase database

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('\n🚀 Supabase Setup Helper\n')
console.log('=' .repeat(50))

// Check .env file
const envPath = join(__dirname, '.env')
if (!existsSync(envPath)) {
  console.log('\n❌ .env file not found!')
  console.log('\n📝 Create a .env file with:')
  console.log('VITE_SUPABASE_URL=https://your-project-id.supabase.co')
  console.log('VITE_SUPABASE_ANON_KEY=your-anon-key-here\n')
  process.exit(1)
}

const envContent = readFileSync(envPath, 'utf-8')
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/)
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null
const supabaseKey = keyMatch ? keyMatch[1].trim() : null

console.log('\n📋 Configuration Check:\n')

if (!supabaseUrl || supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
  console.log('❌ VITE_SUPABASE_URL: Not configured')
  console.log('   Add: VITE_SUPABASE_URL=https://your-project-id.supabase.co')
} else {
  console.log('✅ VITE_SUPABASE_URL:', supabaseUrl)
}

if (!supabaseKey || supabaseKey.includes('your-anon') || supabaseKey.includes('placeholder')) {
  console.log('❌ VITE_SUPABASE_ANON_KEY: Not configured')
  console.log('   Add: VITE_SUPABASE_ANON_KEY=your-anon-key-here')
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY:', supabaseKey.substring(0, 20) + '...')
}

if (!supabaseUrl || !supabaseKey || 
    supabaseUrl.includes('your-project') || 
    supabaseKey.includes('your-anon')) {
  console.log('\n⚠️  Please configure your Supabase credentials first!')
  console.log('\n📖 Steps:')
  console.log('1. Go to https://supabase.com')
  console.log('2. Open your project')
  console.log('3. Go to Settings → API')
  console.log('4. Copy Project URL and anon key')
  console.log('5. Add them to your .env file\n')
  process.exit(1)
}

console.log('\n✅ Credentials configured!')
console.log('\n📝 Next Step: Create Database Table\n')
console.log('1. Go to your Supabase dashboard:')
console.log('   ' + supabaseUrl.replace('/rest/v1', ''))
console.log('\n2. Click "SQL Editor" in the left sidebar')
console.log('\n3. Click "New query"')
console.log('\n4. Copy and paste the SQL from SUPABASE_SETUP.md')
console.log('\n5. Click "Run" (or press Ctrl+Enter)')
console.log('\n6. You should see "Success. No rows returned"')
console.log('\n✅ After running the SQL, your database will be ready!\n')

