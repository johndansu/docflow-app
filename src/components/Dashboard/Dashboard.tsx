import { useState, useEffect } from 'react'
import DocumentGenerator from '../DocumentGeneration/DocumentGenerator'
import ProjectDetail from '../Project/ProjectDetail'
import { storage } from '../../utils/storage'
import { supabaseStorage } from '../../utils/supabaseStorage'
import type { Project } from '../../utils/storage'

interface DashboardProps {
  onNavigateToNew?: () => void
}

const Dashboard = ({ onNavigateToNew }: DashboardProps = {}) => {
  const [showGenerator, setShowGenerator] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadProjects()
    
    // Migrate localStorage data to Supabase on first load (if user is authenticated)
    const migrateData = async () => {
      try {
        const migrated = await supabaseStorage.migrateFromLocalStorage()
        if (migrated > 0) {
          await loadProjects() // Reload after migration
        }
      } catch (error) {
        // Migration failed or not needed, continue normally
        console.log('Migration check:', error)
      }
    }
    migrateData()
    
    // Listen for storage changes (when projects are added/updated from other components)
    const handleStorageChange = () => {
      loadProjects()
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Listen for custom events from MainWorkspace
    const handleProjectsUpdated = () => {
      loadProjects()
    }
    window.addEventListener('projectsUpdated', handleProjectsUpdated)
    
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder="Search projects..."]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
      
      // Cmd/Ctrl + N: New project
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        if (onNavigateToNew) {
          onNavigateToNew()
        } else {
          setShowGenerator(true)
        }
      }
      
      // Escape: Close modals
      if (e.key === 'Escape') {
        if (selectedProjectId) {
          setSelectedProjectId(null)
        }
        if (showGenerator) {
          setShowGenerator(false)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    // Also check periodically for changes (since same-tab updates don't trigger storage event)
    const interval = setInterval(loadProjects, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('projectsUpdated', handleProjectsUpdated)
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(interval)
    }
  }, [selectedProjectId, showGenerator])

  const loadProjects = async () => {
    const allProjects = await storage.getAll()
    setProjects(allProjects)
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all projects? This action cannot be undone.')) {
      await storage.clear()
      await loadProjects()
      window.dispatchEvent(new CustomEvent('projectsUpdated'))
    }
  }

  const handleProjectCreated = () => {
    loadProjects()
    setShowGenerator(false)
  }

  const handleProjectDeleted = () => {
    loadProjects()
    setSelectedProjectId(null)
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation() // Prevent opening the project detail
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await storage.delete(projectId)
      await loadProjects()
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null)
      }
      window.dispatchEvent(new CustomEvent('projectsUpdated'))
    }
  }

  const filteredProjects = projects
    .filter(project => {
      // Search filter
      const matchesSearch = 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.type.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Type filter
      const matchesType = filterType === 'all' || project.type === filterType
      
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'type':
          return a.type.localeCompare(b.type)
        case 'date':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

  return (
    <div className="max-w-5xl mx-auto w-full py-8 px-6">
      {projects.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-dark-card border border-divider flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-semibold text-charcoal mb-2">Start creating</h1>
          <p className="text-sm text-mid-grey mb-6 max-w-sm mx-auto leading-relaxed">
            Generate structured documentation and visualize your project flow in one place
          </p>
          <button 
            onClick={() => {
              if (onNavigateToNew) {
                onNavigateToNew()
              } else {
                setShowGenerator(true)
              }
            }}
            className="px-5 py-2.5 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all shadow-md hover:shadow-lg"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-heading font-semibold text-charcoal mb-1">Projects</h1>
              <p className="text-xs text-mid-grey">
                {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {projects.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-md text-sm font-medium transition-all border border-red-500/20 hover:border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 flex items-center gap-2"
                  title="Clear all projects"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </button>
              )}
            <button 
              onClick={() => {
                if (onNavigateToNew) {
                  onNavigateToNew()
                } else {
                  setShowGenerator(true)
                }
              }} 
              className="px-3.5 py-2 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-gold/50 flex items-center gap-2"
              title="New project (⌘N)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New project
            </button>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="mb-4 space-y-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects... (⌘K)"
                  className="w-full pl-10 pr-20 py-2 bg-dark-card border border-divider/50 rounded-md text-sm text-charcoal placeholder:text-mid-grey/50 focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-mid-grey/50">
                  <kbd className="px-1.5 py-0.5 bg-dark-surface border border-divider/50 rounded text-xs">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-dark-surface border border-divider/50 rounded text-xs">K</kbd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-mid-grey">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'type')}
                    className="px-2 py-1 bg-dark-card border border-divider/50 rounded-md text-xs text-charcoal focus:outline-none focus:border-amber-gold/50"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-mid-grey">Filter:</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-2 py-1 bg-dark-card border border-divider/50 rounded-md text-xs text-charcoal focus:outline-none focus:border-amber-gold/50"
                  >
                    <option value="all">All Types</option>
                    <option value="PRD">PRD</option>
                    <option value="Design Prompt">Design Prompt</option>
                    <option value="User Stories">User Stories</option>
                    <option value="Specs">Specs</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-mid-grey">
                  {searchQuery ? 'No projects found matching your search.' : 'No projects yet.'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="group p-4 rounded-lg bg-dark-card/50 hover:bg-dark-card border border-divider/50 hover:border-divider transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <h3 className="text-sm font-heading font-semibold text-charcoal group-hover:text-amber-gold transition-colors truncate">
                          {project.title}
                        </h3>
                        {project.documents && project.documents.length > 1 ? (
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded flex-shrink-0 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {project.documents.length} documents
                          </span>
                        ) : (
                        <span className="px-2 py-0.5 bg-amber-gold/10 text-amber-gold text-xs font-medium rounded flex-shrink-0">
                          {project.type}
                        </span>
                        )}
                      </div>
                      <p className="text-sm text-mid-grey mb-2.5 line-clamp-2 leading-relaxed">{project.description}</p>
                      <div className="flex items-center gap-3 text-xs text-mid-grey">
                        <span>Updated {storage.formatDate(project.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedProjectId(project.id)
                      }}
                        className="text-amber-gold p-1.5 hover:bg-amber-gold/10 rounded-md transition-colors"
                        title="Open project"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showGenerator && (
        <DocumentGenerator 
          onClose={() => setShowGenerator(false)} 
          onProjectCreated={handleProjectCreated}
        />
      )}
      
      {selectedProjectId && (
        <ProjectDetail
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onDelete={handleProjectDeleted}
        />
      )}
    </div>
  )
}

export default Dashboard
