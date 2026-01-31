import { useState, useEffect } from 'react'
import { storage } from '../../utils/storage'
import type { Project } from '../../utils/storage'
import DocumentViewer from '../DocumentGeneration/DocumentViewer'
import SiteFlowVisualizer from '../SiteFlow/SiteFlowVisualizer'
import { exportToPDF } from '../../utils/exportUtils'

interface ProjectDetailProps {
  projectId: string
  onClose: () => void
  onDelete: () => void
}

const ProjectDetail = ({ projectId, onClose, onDelete }: ProjectDetailProps) => {
  const [project, setProject] = useState<Project | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'documents' | 'siteflow'>('documents')
  const [isLoading, setIsLoading] = useState(true)

  // Get project color based on type
  const getProjectColor = (type: string) => {
    const normalizedType = type?.toLowerCase().trim()
    console.log('Project type:', type, 'Normalized:', normalizedType) // Debug log
    
    switch (normalizedType) {
      case 'prd':
        return { bg: 'from-blue-500 to-blue-400', text: 'text-blue-400', border: 'border-blue-400' }
      case 'design':
        return { bg: 'from-purple-500 to-purple-400', text: 'text-purple-400', border: 'border-purple-400' }
      case 'api':
        return { bg: 'from-green-500 to-green-400', text: 'text-green-400', border: 'border-green-400' }
      case 'mobile':
        return { bg: 'from-pink-500 to-pink-400', text: 'text-pink-400', border: 'border-pink-400' }
      case 'web':
        return { bg: 'from-cyan-500 to-cyan-400', text: 'text-cyan-400', border: 'border-cyan-400' }
      default:
        return { bg: 'from-amber-gold to-yellow-500', text: 'text-amber-gold', border: 'border-amber-gold' }
    }
  }

  const projectColor = project ? getProjectColor(project.type) : getProjectColor('')
  console.log('Project color selected:', projectColor) // Debug log

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true)
      const loadedProject = await storage.get(projectId)
      if (loadedProject) {
        setProject(loadedProject)
        setEditedTitle(loadedProject.title)
        setEditedDescription(loadedProject.description)
      } else {
        setProject(null)
      }
      setIsLoading(false)
    }
    loadProject()
  }, [projectId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showDeleteConfirm) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showDeleteConfirm])

  const handleSave = async () => {
    if (!project) return
    
    const updated = await storage.update(project.id, {
      title: editedTitle,
      description: editedDescription,
    })
    
    if (updated) {
      setProject(updated)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    await storage.delete(project.id)
    onDelete()
  }

  const handleExport = () => {
    if (!project) return
    
    // Export the currently active document, or the main content if single document
    const contentToExport = project.documents && project.documents.length > 1
      ? project.documents[activeDocumentIndex]?.content || project.content
      : project.content
    
    exportToPDF(contentToExport, project.title)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-white">Loading project…</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-white">Project not found</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="bg-dark-card/95 backdrop-blur-sm rounded-xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-divider/20">
        {/* Header */}
        <div className="px-4 py-3 border-b border-divider/20 flex items-center justify-between bg-gradient-to-r from-dark-surface/30 to-dark-card/30">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 px-2 py-1 bg-dark-surface/50 border border-divider/30 rounded-lg text-xs text-white focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/20 transition-all"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="px-2 py-1 bg-amber-gold hover:bg-amber-gold/90 text-black rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg hover:shadow-amber-gold/25"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedTitle(project.title)
                    setEditedDescription(project.description)
                  }}
                  className="px-2 py-1 bg-dark-surface/50 hover:bg-dark-surface/70 border border-divider/30 rounded-lg text-xs text-white transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 bg-gradient-to-br ${projectColor.bg} rounded-lg flex items-center justify-center shadow-lg`}>
                    <svg className={`w-3 h-3 ${projectColor.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2 2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-light text-white truncate">{project.title}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 ${projectColor.text} ${projectColor.text.replace('text-', 'bg-')}/10 text-xs font-semibold rounded-full border ${projectColor.text.replace('text-', 'border-')}/20`}>
                        {project.type}
                      </span>
                      <span className="text-xs text-mid-grey">
                        {storage.formatDate(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-6">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2 py-1 text-xs text-white hover:bg-dark-surface/50 rounded-lg transition-all duration-200 border border-divider/30 hover:border-amber-gold/50"
                >
                  Edit
                </button>
                <button
                  onClick={handleExport}
                  className="px-2 py-1 text-xs bg-amber-gold hover:bg-amber-gold/90 text-black rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-amber-gold/25"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 border border-red-400/20 hover:border-red-400/40"
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs text-mid-grey hover:text-white hover:bg-dark-surface/50 rounded-lg transition-all duration-200 border border-divider/30"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-white mb-2">Description</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full px-2 py-2 bg-dark-surface/50 border border-divider/30 rounded-lg text-xs text-white placeholder-mid-grey/50 focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/20 resize-none transition-all"
                  rows={4}
                  placeholder="Enter project description..."
                />
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 border-b border-divider/20 pb-0">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all duration-200 ${
                    activeTab === 'documents'
                      ? 'bg-amber-gold text-black border-b-2 border-amber-gold shadow-lg'
                      : 'text-mid-grey hover:text-white hover:bg-dark-surface/50 border-b-2 border-transparent'
                  }`}
                >
                  Documents
                </button>
                <button
                  onClick={() => setActiveTab('siteflow')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all duration-200 ${
                    activeTab === 'siteflow'
                      ? 'bg-amber-gold text-black border-b-2 border-amber-gold shadow-lg'
                      : 'text-mid-grey hover:text-white hover:bg-dark-surface/50 border-b-2 border-transparent'
                  }`}
                >
                  Site Flow
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'documents' && project.documents && project.documents.length > 0 && (
                <>
                  {/* Document Type Tabs */}
                  <div className="flex gap-1 border-b border-divider/20 pb-0 overflow-x-auto">
                    {project.documents.map((doc, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveDocumentIndex(index)}
                        className={`px-2 py-1 text-xs font-medium rounded-t-lg transition-all duration-200 whitespace-nowrap ${
                          activeDocumentIndex === index
                            ? 'bg-amber-gold text-black border-b-2 border-amber-gold shadow-lg'
                            : 'text-mid-grey hover:text-white hover:bg-dark-surface/50 border-b-2 border-transparent'
                        }`}
                      >
                        {doc.type}
                      </button>
                    ))}
                  </div>

                  {/* Document Content */}
                  <div className="mt-2">
                    <DocumentViewer
                      type={project.documents[activeDocumentIndex].type}
                      name={project.title}
                      content={project.documents[activeDocumentIndex].content}
                      onExport={handleExport}
                    />
                  </div>
                </>
              )}

              {activeTab === 'siteflow' && project.siteFlow && (
                <div className="mt-4">
                  <div className="h-[500px]">
                    <SiteFlowVisualizer
                      appDescription={project.description}
                      prdContent={project.documents?.find(doc => doc.type === 'PRD')?.content}
                      projectName={project.title}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (!project.documents || project.documents.length === 0) && (
                <div className="mt-4">
                  <DocumentViewer
                    type={project.type}
                    name={project.title}
                    content={project.content}
                    onExport={handleExport}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-dark-card/95 backdrop-blur-sm rounded-2xl max-w-md w-full p-8 border border-divider/20 shadow-2xl">
              {/* Warning Icon */}
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 3.71-3.197z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5c.007 0 0 .003 0 .003-.002a2 2 0 01.002-.005V5.002a2 2 0 01.002-.005L12 5zm0 14a2 2 0 002.002 0 2.002-.002V17a2 2 0 01-.002-.002L12 19z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-light text-white mb-3 text-center">Delete Project</h3>
              <p className="text-sm text-mid-grey mb-6 text-center leading-relaxed">
                Are you sure you want to delete "{project.title}"? This action cannot be undone and all associated data will be permanently removed.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 text-sm text-white hover:bg-dark-surface/50 rounded-xl transition-all duration-200 border border-divider/30"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDelete()
                    setShowDeleteConfirm(false)
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectDetail

