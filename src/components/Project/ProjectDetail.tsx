import { useState, useEffect } from 'react'
import { storage } from '../../utils/storage'
import type { Project } from '../../utils/storage'
import DocumentViewer from '../DocumentGeneration/DocumentViewer'
import SiteFlowVisualizer from '../SiteFlow/SiteFlowVisualizer'
import { exportToPDF, exportToDOCX, exportToMarkdown } from '../../utils/exportUtils'

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

  useEffect(() => {
    const loadedProject = storage.get(projectId)
    if (loadedProject) {
      setProject(loadedProject)
      setEditedTitle(loadedProject.title)
      setEditedDescription(loadedProject.description)
    }
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

  const handleSave = () => {
    if (!project) return
    
    const updated = storage.update(project.id, {
      title: editedTitle,
      description: editedDescription,
    })
    
    if (updated) {
      setProject(updated)
      setIsEditing(false)
    }
  }

  const handleDelete = () => {
    if (!project) return
    storage.delete(project.id)
    onDelete()
  }

  const handleExport = () => {
    if (!project) return
    
    // Export the currently active document, or the main content if single document
    const contentToExport = project.documents && project.documents.length > 1
      ? project.documents[activeDocumentIndex]?.content || project.content
      : project.content
    
    const format = 'PDF' // Default, could be made selectable
    switch (format) {
      case 'PDF':
        exportToPDF(contentToExport, project.title)
        break
      case 'DOCX':
        exportToDOCX(contentToExport, project.title)
        break
      case 'Markdown':
        exportToMarkdown(contentToExport, project.title)
        break
    }
  }

  if (!project) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-charcoal">Project not found</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-divider/50">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-divider/50 flex items-center justify-between bg-dark-surface/30">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-dark-surface border border-divider/50 rounded-md text-sm text-charcoal focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedTitle(project.title)
                    setEditedDescription(project.description)
                  }}
                  className="px-3 py-1.5 bg-dark-surface hover:bg-dark-card border border-divider/50 rounded-md text-sm text-charcoal transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-heading font-semibold text-charcoal truncate">{project.title}</h2>
                <span className="px-2 py-0.5 bg-amber-gold/10 text-amber-gold text-xs font-medium rounded flex-shrink-0">
                  {project.type}
                </span>
                <span className="text-xs text-mid-grey">
                  {storage.formatDate(project.updatedAt)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm text-charcoal hover:bg-dark-surface rounded-md transition-all border border-divider/50 hover:border-amber-gold/50"
                >
                  Edit
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 text-sm bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md font-medium transition-all shadow-sm"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 rounded-md transition-all border border-red-400/20 hover:border-red-400/40"
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-mid-grey hover:text-charcoal hover:bg-dark-surface rounded-md transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Description</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-surface border border-divider/50 rounded-md text-sm text-charcoal focus:outline-none focus:border-amber-gold/50 focus:ring-2 focus:ring-amber-gold/30 min-h-[100px] resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-mid-grey mb-4">{project.description}</p>
              </div>
              
              {/* Main tabs: Documents and Site Flow */}
              {(project.documents && project.documents.length > 1) || project.siteFlow ? (
                <div className="space-y-4">
                  {/* Main tabs */}
                  <div className="flex gap-2 border-b border-divider/30 pb-2">
                    <button
                      onClick={() => setActiveTab('documents')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                        activeTab === 'documents'
                          ? 'bg-dark-surface text-charcoal border-b-2 border-amber-gold'
                          : 'text-mid-grey hover:text-charcoal hover:bg-dark-surface/50'
                      }`}
                    >
                      Documents
                    </button>
                    {project.siteFlow && (
                      <button
                        onClick={() => setActiveTab('siteflow')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                          activeTab === 'siteflow'
                            ? 'bg-dark-surface text-charcoal border-b-2 border-amber-gold'
                            : 'text-mid-grey hover:text-charcoal hover:bg-dark-surface/50'
                        }`}
                      >
                        Site Flow
                      </button>
                    )}
                  </div>
                  
                  {/* Documents tab content */}
                  {activeTab === 'documents' && (
                    <>
                      {project.documents && project.documents.length > 1 ? (
                        <div className="space-y-4">
                          {/* Document type tabs */}
                          <div className="flex gap-2 border-b border-divider/20 pb-2 overflow-x-auto">
                            {project.documents.map((doc, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveDocumentIndex(index)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
                                  activeDocumentIndex === index
                                    ? 'bg-dark-surface text-charcoal border-b-2 border-blue-400'
                                    : 'text-mid-grey hover:text-charcoal hover:bg-dark-surface/50'
                                }`}
                              >
                                {doc.type}
                              </button>
                            ))}
                          </div>
                          
                          {/* Active document viewer */}
                          {project.documents[activeDocumentIndex] && (
                            <DocumentViewer
                              type={project.documents[activeDocumentIndex].type}
                              name={project.title}
                              content={project.documents[activeDocumentIndex].content}
                              onExport={() => {
                                handleExport()
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <DocumentViewer
                          type={project.type}
                          name={project.title}
                          content={project.content}
                          onExport={handleExport}
                        />
                      )}
                    </>
                  )}
                  
                  {/* Site Flow tab content */}
                  {activeTab === 'siteflow' && project.siteFlow && (
                    <div className="bg-dark-card/50 rounded-lg border border-divider/30 overflow-hidden">
                      <SiteFlowVisualizer 
                        appDescription={project.description}
                        prdContent={project.documents?.find(doc => doc.type === 'PRD')?.content || project.content}
                        initialSiteFlow={project.siteFlow}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <DocumentViewer
                  type={project.type}
                  name={project.title}
                  content={project.content}
                  onExport={handleExport}
                />
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-lg max-w-md w-full p-5 border border-divider/50 shadow-xl">
              <h3 className="text-lg font-heading font-semibold text-charcoal mb-2">Delete Project?</h3>
              <p className="text-sm text-mid-grey mb-5">
                Are you sure you want to delete "{project.title}"? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-charcoal hover:bg-dark-surface rounded-md transition-all border border-divider/50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDelete()
                    setShowDeleteConfirm(false)
                  }}
                  className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-all"
                >
                  Delete
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

