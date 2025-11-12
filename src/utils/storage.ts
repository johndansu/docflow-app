export type ProjectDocument = {
  type: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'
  content: string
}

export type SiteFlowData = {
  nodes: Array<{
    id: string
    name: string
    description: string
    x: number
    y: number
    isParent?: boolean
    level?: number
  }>
  connections: Array<{
    from: string
    to: string
  }>
}

export type Project = {
  id: string
  title: string
  type: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs' // Keep for backward compatibility
  description: string
  content: string // Keep for backward compatibility - will contain PRD if multiple docs exist
  documents?: ProjectDocument[] // New: array of all documents
  siteFlow?: SiteFlowData // New: site flow data
  createdAt: string
  updatedAt: string
}

// Import Supabase storage (will use Supabase if configured, otherwise localStorage)
import { supabaseStorage } from './supabaseStorage'

export const storage = {
  async getAll(): Promise<Project[]> {
    return await supabaseStorage.getAll()
  },

  async get(id: string): Promise<Project | null> {
    return await supabaseStorage.get(id)
  },

  async save(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return await supabaseStorage.save(project)
  },

  async update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    return await supabaseStorage.update(id, updates)
  },

  async delete(id: string): Promise<boolean> {
    return await supabaseStorage.delete(id)
  },

  async clear(): Promise<void> {
    return await supabaseStorage.clear()
  },

  formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  },
}

