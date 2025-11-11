// Supabase Database Setup Script
// Run this after adding your Supabase credentials to .env
// Usage: node setup-database.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env file
function getEnvVar(name) {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
    const match = envContent.match(new RegExp(`${name}=(.+)`))
    return match ? match[1].trim() : null
  } catch (error) {
    return null
  }
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Supabase credentials not found in .env file')
  console.log('\nPlease add to your .env file:')
  console.log('VITE_SUPABASE_URL=https://your-project-id.supabase.co')
  console.log('VITE_SUPABASE_ANON_KEY=your-anon-key-here\n')
  process.exit(1)
}

if (supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
  console.error('\n❌ Error: Please replace placeholder values with your actual Supabase credentials\n')
  process.exit(1)
}

console.log('\n🔧 Setting up Supabase database...\n')
console.log('Project URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

const sqlScript = `
-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PRD', 'Design Prompt', 'User Stories', 'Specs')),
  description TEXT,
  content TEXT NOT NULL,
  documents JSONB,
  site_flow JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Create policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

-- Create trigger
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`

async function setupDatabase() {
  try {
    console.log('📝 Running SQL script...\n')
    
    // Execute SQL using Supabase REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript })
    
    if (error) {
      // If RPC doesn't exist, provide manual instructions
      if (error.message.includes('function') || error.code === '42883') {
        console.log('⚠️  Cannot execute SQL automatically.')
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n')
        console.log(sqlScript)
        console.log('\n1. Go to your Supabase dashboard')
        console.log('2. Click "SQL Editor" in the sidebar')
        console.log('3. Click "New query"')
        console.log('4. Copy and paste the SQL above')
        console.log('5. Click "Run"\n')
        return
      }
      throw error
    }
    
    console.log('✅ Database setup complete!')
    console.log('\n🎉 Your Supabase database is ready to use!\n')
    
  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message)
    console.log('\n📋 Please run the SQL manually in Supabase SQL Editor:\n')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Click "SQL Editor"')
    console.log('3. Copy the SQL from SUPABASE_SETUP.md')
    console.log('4. Run it\n')
  }
}

setupDatabase()

