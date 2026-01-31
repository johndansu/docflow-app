import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DocumentViewer from '../DocumentGeneration/DocumentViewer'
import SiteFlowVisualizer, { type SiteFlowHandle } from '../SiteFlow/SiteFlowVisualizer'
import ExportModal from '../Export/ExportModal'
import { storage, type SiteFlowData } from '../../utils/storage'
import { extractInfo, generatePRD, generateDesignPrompt, generateUserStories, generateSpecs } from '../../utils/contentGenerator'

type View = 'input' | 'generating' | 'results'

const MainWorkspace = () => {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('input')
  const [appDescription, setAppDescription] = useState('')
  const [generatedDocs, setGeneratedDocs] = useState<{ type: string; content: string; name: string }[]>([])
  const [showExport, setShowExport] = useState(false)
  const [exportContent, setExportContent] = useState<{ content: string; filename: string } | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatingStep, setGeneratingStep] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [siteFlowData, setSiteFlowData] = useState<SiteFlowData | null>(null)
  const siteFlowRef = useRef<SiteFlowHandle>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current && view === 'input') {
      textareaRef.current.focus()
    }
  }, [view])

  const handleGenerate = async () => {
    if (!appDescription.trim()) return

    setView('generating')
    setGenerationProgress(0)
    
    const steps = [
      'Analyzing your description...',
      'Generating PRD...',
      'Creating design brief...',
      'Writing user stories...',
      'Generating specs...',
      'Mapping site flow...',
      'Finalizing documentation...'
    ]
    
    let stepIndex = 0
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setGeneratingStep(steps[stepIndex])
        stepIndex++
      }
    }, 800)
    
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          return 90
        }
        return prev + Math.random() * 5 + 2
      })
    }, 200)
    
    try {
      const info = await extractInfo(appDescription)
      setProjectName(info.projectName)
      
      // Generate documents sequentially with progress updates
      setGeneratingStep('Generating PRD...')
      setGenerationProgress(20)
      const prdContent = await generatePRD(info, appDescription)
      
      setGeneratingStep('Creating design brief...')
      setGenerationProgress(50)
      const designContent = await generateDesignPrompt(info, appDescription)
      
      setGeneratingStep('Writing user stories...')
      setGenerationProgress(70)
      const storiesContent = await generateUserStories(info, appDescription)
      
      setGeneratingStep('Generating specs...')
      setGenerationProgress(85)
      const specsContent = await generateSpecs(info, appDescription)
      
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      
      const docs = [
        {
          type: 'PRD',
          name: info.projectName,
          content: prdContent
        },
        {
          type: 'Design Prompt',
          name: info.projectName,
          content: designContent
        },
        {
          type: 'User Stories',
          name: info.projectName,
          content: storiesContent
        },
        {
          type: 'Specs',
          name: info.projectName,
          content: specsContent
        }
      ]
      
      setGenerationProgress(100)
      setGeneratingStep('Complete!')
      
      setTimeout(() => {
        setGeneratedDocs(docs)
        setView('results')
        setGenerationProgress(0)
        setGeneratingStep('')
      }, 500)
    } catch (error) {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      console.error('Generation error:', error)
      alert('Failed to generate content. Please check your API key configuration or try again.')
      setView('input')
      setGenerationProgress(0)
      setGeneratingStep('')
    }
  }

  const handleExport = (content: string, filename: string) => {
    setExportContent({ content, filename })
    setShowExport(true)
  }

  const handleSaveAllProjects = async () => {
    if (generatedDocs.length === 0) return
    
    setIsSaving(true)
    try {
      // Save all documents as a single project
      const prdDoc = generatedDocs.find(doc => doc.type === 'PRD')
      const documents = generatedDocs.map(doc => ({
          type: doc.type as 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs',
          content: doc.content,
      }))
      
      const latestSiteFlow = siteFlowRef.current?.getCurrentSiteFlow()
      
      const savedProject = await storage.save({
        title: projectName || 'Untitled Project',
        type: 'PRD', // Default type for backward compatibility
        description: appDescription.substring(0, 200) || `Complete project documentation`,
        content: prdDoc?.content || generatedDocs[0]?.content || '', // Primary content for backward compatibility
        documents: documents, // All documents stored together
        siteFlow: siteFlowData || latestSiteFlow || undefined, // Site flow data
      })
      
      setIsSaving(false)
      
      // Show success message and redirect to project detail page
      window.dispatchEvent(new CustomEvent('projectsUpdated'))
      
      // Navigate to the saved project
      if (savedProject?.id) {
        navigate(`/project/${savedProject.id}`)
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Error saving project:', error)
      setIsSaving(false)
    }
  }

  if (view === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center px-8 py-32">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="w-full h-full border-2 border-amber-gold/20 rounded-full animate-spin border-t-amber-gold"></div>
            </div>
            <h2 className="text-xl font-light text-white mb-2">
              Creating documentation
            </h2>
            <p className="text-sm text-mid-grey">
              {generatingStep || 'Starting...'}
            </p>
          </div>
          <div className="w-full">
            <div className="h-1 bg-divider rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-gold transition-all duration-300 ease-out"
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-mid-grey">
              {Math.round(generationProgress)}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'results') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-light text-white mb-2">
                Documentation Ready
              </h1>
              <p className="text-sm text-mid-grey">
                Your project documentation has been created
              </p>
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 text-amber-gold/60">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Documentation generated successfully</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAllProjects}
                disabled={isSaving}
                className="px-4 py-2 bg-amber-gold hover:bg-amber-gold/90 text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Project
                  </>
                )}
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="px-4 py-2 bg-dark-card border border-divider rounded-lg text-sm text-white font-medium hover:border-amber-gold transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {generatedDocs.map((doc, idx) => (
            <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
              <DocumentViewer
                type={doc.type}
                name={doc.name}
                content={doc.content}
                onExport={() => handleExport(doc.content, `${doc.name}_${doc.type}`)}
              />
            </div>
          ))}
        </div>

        <div className="bg-dark-card/40 rounded-lg border border-divider/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-divider/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-dark-surface/10 rounded-md flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-mid-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-heading font-semibold text-white">Site Flow</h2>
                <p className="text-[10px] text-mid-grey">Visual workflow structure</p>
              </div>
            </div>
          </div>
          <div className="p-4 h-[500px] overflow-hidden">
            <SiteFlowVisualizer 
              ref={siteFlowRef}
              appDescription={appDescription}
              prdContent={generatedDocs.find(doc => doc.type === 'PRD')?.content}
              projectName={projectName}
              onSiteFlowChange={setSiteFlowData}
            />
          </div>
        </div>

        {showExport && exportContent && (
          <ExportModal
            content={exportContent.content}
            filename={exportContent.filename}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-6">
      <div className="mb-4">
      </div>

      <div className="bg-dark-card rounded-xl border border-divider/30 overflow-hidden">
        <div className="p-6">
          <textarea
            ref={textareaRef}
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && appDescription.trim()) {
                e.preventDefault()
                handleGenerate()
              }
            }}
            className="w-full min-h-[200px] px-0 py-0 border-0 focus:outline-none resize-none text-sm text-white placeholder:text-mid-grey/50 leading-relaxed bg-transparent focus:ring-0"
            placeholder="Describe your project idea, features, target users, and goals..."
            autoFocus
          />
        </div>
        
        <div className="px-6 pb-6">
          <button
            onClick={handleGenerate}
            disabled={!appDescription.trim()}
            className="w-full px-4 py-3 bg-amber-gold hover:bg-amber-gold/90 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Documentation
          </button>
        </div>
      </div>
    </div>
  )
}

export default MainWorkspace
