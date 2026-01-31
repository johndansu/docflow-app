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

// Fallback localStorage storage
const localStorageStorage = {
  async getAll(): Promise<Project[]> {
    const data = localStorage.getItem('docflow-projects')
    return data ? JSON.parse(data) : []
  },

  async get(id: string): Promise<Project | null> {
    const projects = await this.getAll()
    return projects.find(p => p.id === id) || null
  },

  async save(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const projects = await this.getAll()
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    projects.push(newProject)
    localStorage.setItem('docflow-projects', JSON.stringify(projects))
    return newProject
  },

  async update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const projects = await this.getAll()
    const index = projects.findIndex(p => p.id === id)
    if (index === -1) return null
    
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem('docflow-projects', JSON.stringify(projects))
    return projects[index]
  },

  async delete(id: string): Promise<boolean> {
    const projects = await this.getAll()
    const filteredProjects = projects.filter(p => p.id !== id)
    if (filteredProjects.length === projects.length) return false
    
    localStorage.setItem('docflow-projects', JSON.stringify(filteredProjects))
    return true
  },

  async clear(): Promise<void> {
    try {
      localStorage.removeItem('docflow-projects')
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString()
  }
}

export const storage = {
  async getAll(): Promise<Project[]> {
    try {
      return await supabaseStorage.getAll()
    } catch (error) {
      console.warn('⚠️ Supabase failed, falling back to localStorage:', error)
      return await localStorageStorage.getAll()
    }
  },

  async get(id: string): Promise<Project | null> {
    try {
      return await supabaseStorage.get(id)
    } catch (error) {
      console.warn('⚠️ Supabase failed, falling back to localStorage:', error)
      return await localStorageStorage.get(id)
    }
  },

  async save(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      return await supabaseStorage.save(project)
    } catch (error) {
      console.warn('⚠️ Supabase failed, falling back to localStorage:', error)
      return await localStorageStorage.save(project)
    }
  },

  async update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    try {
      return await supabaseStorage.update(id, updates)
    } catch (error) {
      console.warn('⚠️ Supabase failed, falling back to localStorage:', error)
      return await localStorageStorage.update(id, updates)
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      return await supabaseStorage.delete(id)
    } catch (error) {
      console.warn('⚠️ Supabase failed, falling back to localStorage:', error)
      return await localStorageStorage.delete(id)
    }
  },

  async clear(): Promise<void> {
    try {
      await supabaseStorage.clear()
    } catch (error) {
      console.warn('⚠️ Supabase failed, falling back to localStorage:', error)
      await localStorageStorage.clear()
    }
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

