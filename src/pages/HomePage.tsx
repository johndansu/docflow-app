import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { storage } from '../utils/storage'
import { supabaseStorage } from '../utils/supabaseStorage'
import type { Project } from '../utils/storage'
import SkeletonLoader from '../components/UI/SkeletonLoader'

const HomePage = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date')
  const [filterType, setFilterType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProjects()
    
    const migrateData = async () => {
      try {
        const migrated = await supabaseStorage.migrateFromLocalStorage()
        if (migrated > 0) {
          await loadProjects()
        }
      } catch (error) {
        console.log('Migration check:', error)
      }
    }
    migrateData()
    
    const handleStorageChange = () => {
      loadProjects()
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('projectsUpdated', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('projectsUpdated', handleStorageChange)
    }
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const loaded = await storage.getAll()
      setProjects(loaded)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterType === 'all' || project.type === filterType
      return matchesSearch && matchesFilter
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

  const projectTypes = ['all', ...Array.from(new Set(projects.map(p => p.type)))]

  return (
    <div className="min-h-screen bg-dark-surface">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Minimal Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h1 className="text-lg sm:text-xl font-light text-white mb-1">Your Projects</h1>
              <p className="text-mid-grey text-xs">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
            </div>
            <Link
              to="/new"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-gold text-black font-medium rounded-lg hover:bg-amber-gold/90 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Link>
          </div>

          {/* Minimal Search */}
          <div className="max-w-sm">
            <div className="relative">
              <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-dark-card border border-divider rounded-lg text-white placeholder-mid-grey focus:outline-none focus:border-amber-gold transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <SkeletonLoader type="card" count={6} />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-2 bg-dark-card rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white mb-1">No projects found</h3>
            <p className="text-mid-grey text-xs mb-3">
              {searchQuery ? 'Try adjusting your search' : 'Create your first project to get started'}
            </p>
            {!searchQuery && (
              <Link
                to="/new"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-gold text-black font-medium rounded-lg hover:bg-amber-gold/90 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="group bg-dark-card border border-divider rounded-lg p-3 hover:border-amber-gold transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-white mb-1 truncate">
                      {project.title}
                    </h3>
                    <span className="text-xs text-mid-grey">
                      {project.type}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-mid-grey group-hover:text-amber-gold transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                {project.description && (
                  <p className="text-sm text-mid-grey mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="text-xs text-mid-grey">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage

