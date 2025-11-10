export type Project = {
  id: string
  title: string
  type: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'
  description: string
  content: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'docflow-projects'

export const storage = {
  getAll(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading from storage:', error)
      return []
    }
  },

  get(id: string): Project | null {
    const projects = this.getAll()
    return projects.find(p => p.id === id) || null
  },

  save(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const projects = this.getAll()
    const now = new Date().toISOString()
    
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    
    projects.push(newProject)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    return newProject
  },

  update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const projects = this.getAll()
    const index = projects.findIndex(p => p.id === id)
    
    if (index === -1) return null
    
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    return projects[index]
  },

  delete(id: string): boolean {
    const projects = this.getAll()
    const filtered = projects.filter(p => p.id !== id)
    
    if (filtered.length === projects.length) return false
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
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

