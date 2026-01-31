import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { storage } from '../utils/storage'
import type { Project } from '../utils/storage'
import ProjectDetail from '../components/Project/ProjectDetail'

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadProject()
    }
  }, [id])

  const loadProject = async () => {
    if (!id) return
    try {
      setLoading(true)
      const loaded = await storage.get(id)
      if (loaded) {
        setProject(loaded)
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    navigate('/')
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await storage.delete(id)
      navigate('/')
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-surface via-dark-card to-dark-surface flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-charcoal">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project || !id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-surface via-dark-card to-dark-surface flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-charcoal mb-2">Project not found</h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-amber-gold text-white font-semibold rounded-xl hover:bg-yellow-500 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-surface via-dark-card to-dark-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ProjectDetail projectId={id} onClose={handleClose} onDelete={handleDelete} />
      </div>
    </div>
  )
}

export default ProjectDetailPage

