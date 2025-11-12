import { useState, useRef, useEffect } from 'react'
import DocumentViewer from '../DocumentGeneration/DocumentViewer'
import SiteFlowVisualizer, { type SiteFlowHandle } from '../SiteFlow/SiteFlowVisualizer'
import ExportModal from '../Export/ExportModal'
import { storage, type SiteFlowData } from '../../utils/storage'
import { extractInfo, generatePRD, generateDesignPrompt, generateUserStories, generateSpecs } from '../../utils/contentGenerator'

type View = 'input' | 'generating' | 'results'

const MainWorkspace = () => {
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
      const info = extractInfo(appDescription)
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
      
      await storage.save({
        title: projectName || 'Untitled Project',
        type: 'PRD', // Default type for backward compatibility
        description: appDescription.substring(0, 200) || `Complete project documentation`,
        content: prdDoc?.content || generatedDocs[0]?.content || '', // Primary content for backward compatibility
        documents: documents, // All documents stored together
        siteFlow: siteFlowData || latestSiteFlow || undefined, // Site flow data
      })
      
      setIsSaving(false)
      
      // Show success message and redirect to Projects view
      window.dispatchEvent(new CustomEvent('projectsUpdated'))
      
      // Reset to input view
      setView('input')
      setAppDescription('')
      setGeneratedDocs([])
      setProjectName('')
      setSiteFlowData(null)
    } catch (error) {
      console.error('Error saving project:', error)
      setIsSaving(false)
    }
  }

  if (view === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center px-8 py-32">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-12">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-2 border-amber-gold/10 rounded-full"></div>
              <div 
                className="absolute inset-0 border-2 border-amber-gold rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-gold/20 to-yellow-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-xl font-heading font-semibold text-charcoal mb-3">
              Creating your documentation
            </h2>
            <p className="text-sm text-mid-grey mb-1 font-medium">
              {generatingStep || 'Starting...'}
            </p>
            <div className="text-xs text-mid-grey mb-6">
              This usually takes a few seconds
            </div>
          </div>
          <div className="w-full max-w-md mx-auto">
            <div className="relative h-1.5 bg-divider rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-gold to-yellow-500 transition-all duration-300 ease-out"
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
            <div className="mt-3 text-xs text-mid-grey text-center">
              {Math.round(generationProgress)}% complete
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'results') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-gold/10 text-amber-gold rounded-md text-xs font-medium mb-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Generated Successfully
              </div>
              <h1 className="text-2xl font-heading font-semibold text-charcoal mb-1">
                Your Documentation is Ready
              </h1>
              <p className="text-sm text-mid-grey">
                Everything you need to start building
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAllProjects}
                disabled={isSaving}
                className="px-3 py-1.5 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
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
                onClick={() => {
                  setView('input')
                  setAppDescription('')
                  setGeneratedDocs([])
                  setSiteFlowData(null)
                }}
                className="px-3 py-1.5 bg-dark-card border border-divider rounded-md text-sm text-charcoal font-medium hover:border-amber-gold hover:bg-amber-gold/5 transition-all"
              >
                New Document
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

        <div className="bg-dark-card/50 rounded-lg border border-divider/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-divider/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-amber-gold/20 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-heading font-semibold text-charcoal">Site Flow</h2>
                <p className="text-xs text-mid-grey">Visual representation of your app structure</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <SiteFlowVisualizer 
              ref={siteFlowRef}
              appDescription={appDescription}
              prdContent={generatedDocs.find(doc => doc.type === 'PRD')?.content}
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
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-charcoal mb-1">New Document</h1>
        <p className="text-sm text-mid-grey">Describe your project and generate documentation</p>
        </div>

      <div className="bg-dark-card rounded-lg border border-divider/50 overflow-hidden">
        <div className="p-5">
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
            className="w-full min-h-[200px] px-0 py-0 border-0 focus:outline-none resize-none text-sm text-charcoal placeholder:text-mid-grey/50 font-body leading-relaxed bg-transparent focus:ring-0"
            placeholder="Describe your project idea, features, target users, and goals... (Press Enter to generate)"
                autoFocus
              />
            </div>
            
        <div className="px-5 py-3 border-t border-divider/50 flex items-center justify-between bg-dark-surface/30">
          <div className="text-xs text-mid-grey">
            {appDescription.length > 0 && `${appDescription.length} characters`}
                      </div>
          <div className="flex items-center gap-2">
                {appDescription.length > 0 && (
                  <button
                    onClick={() => setAppDescription('')}
                className="px-3 py-1.5 text-xs text-mid-grey hover:text-charcoal transition-colors rounded-md hover:bg-dark-surface/50"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={!appDescription.trim()}
              className="px-4 py-2 bg-amber-gold hover:bg-amber-gold/90 text-white rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-gold/50"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-mid-grey">
          Press <kbd className="px-1.5 py-0.5 bg-dark-card border border-divider/50 rounded text-xs">Enter</kbd> to generate • <kbd className="px-1.5 py-0.5 bg-dark-card border border-divider/50 rounded text-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-dark-card border border-divider/50 rounded text-xs">Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

export default MainWorkspace
